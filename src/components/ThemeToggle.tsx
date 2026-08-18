import { useTheme, type ThemeMode } from '../lib/theme'

const LABEL: Record<ThemeMode, { icon: string; text: string; next: string }> = {
  system: { icon: '🖥', text: '시스템', next: '라이트' },
  light: { icon: '☀️', text: '라이트', next: '다크' },
  dark: { icon: '🌙', text: '다크', next: '시스템' },
}

export default function ThemeToggle() {
  const mode = useTheme((s) => s.mode)
  const cycle = useTheme((s) => s.cycle)
  const l = LABEL[mode]
  return (
    <button
      className="ghost theme-toggle"
      onClick={cycle}
      title={`테마: ${l.text} · 클릭하면 ${l.next}`}
      aria-label={`테마 ${l.text}. 클릭하면 ${l.next}로 전환`}
    >
      <span aria-hidden="true">{l.icon}</span> {l.text}
    </button>
  )
}
