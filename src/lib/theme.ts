import { create } from 'zustand'

export type ThemeMode = 'system' | 'light' | 'dark'

// 앱 데이터(halboos-data)와 분리된 키 — 기기별 표시 설정이라 백업 JSON 에 섞이면 안 되고,
// index.html 인라인 스크립트가 동기적으로 읽어야 해서 zustand persist 봉투를 쓸 수 없다.
const KEY = 'halboos-theme'
const ORDER: ThemeMode[] = ['system', 'light', 'dark']

const mql = () => window.matchMedia('(prefers-color-scheme: dark)')

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* private mode 등에서 접근 실패 → 기본값 */
  }
  return 'system'
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (mql().matches ? 'dark' : 'light') : mode
}

// 'system' 이면 data-theme 를 지운다 → :root 기본(라이트) + prefers-color-scheme 가 담당.
function apply(mode: ThemeMode) {
  const el = document.documentElement
  if (mode === 'system') delete el.dataset.theme
  else el.dataset.theme = mode
}

type ThemeState = {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (m: ThemeMode) => void
  cycle: () => void
}

const initial = read()

export const useTheme = create<ThemeState>((set, get) => ({
  mode: initial,
  resolved: resolve(initial),
  setMode: (m) => {
    try {
      localStorage.setItem(KEY, m)
    } catch {
      /* 저장 실패해도 이번 세션 동안은 적용 */
    }
    apply(m)
    set({ mode: m, resolved: resolve(m) })
  },
  cycle: () => get().setMode(ORDER[(ORDER.indexOf(get().mode) + 1) % ORDER.length]),
}))

// OS 설정 변경: CSS 는 미디어쿼리가 알아서 따라가고, JS 쪽 resolved 만 맞춰준다.
mql().addEventListener('change', () => {
  if (useTheme.getState().mode === 'system')
    useTheme.setState({ resolved: resolve('system') })
})

// 인라인 스크립트가 처리하지 않는 'system' 복귀 케이스 보정
apply(initial)
