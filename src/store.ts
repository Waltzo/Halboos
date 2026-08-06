import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, Asset, Category, FixedExpense, Installment } from './types'
import { uid } from './lib/format'

type State = AppData & {
  addAsset: (a: Omit<Asset, 'id'>) => void
  updateAsset: (id: string, patch: Partial<Omit<Asset, 'id'>>) => void
  removeAsset: (id: string) => void
  reorderAssets: (from: number, to: number) => void

  addCategory: (c: Omit<Category, 'id'>) => string
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void
  removeCategory: (id: string) => void

  addInstallment: (i: Omit<Installment, 'id'>) => void
  updateInstallment: (id: string, patch: Partial<Omit<Installment, 'id'>>) => void
  removeInstallment: (id: string) => void

  addFixedExpense: (f: Omit<FixedExpense, 'id'>) => void
  updateFixedExpense: (id: string, patch: Partial<Omit<FixedExpense, 'id'>>) => void
  removeFixedExpense: (id: string) => void

  replaceAll: (data: AppData) => void
}

export const DEFAULT_COLORS = [
  '#4f7cff',
  '#ff7a59',
  '#22b573',
  '#a259ff',
  '#ff5c8a',
  '#f2a900',
  '#00b8d4',
  '#8d6e63',
]

export const useStore = create<State>()(
  persist(
    (set) => ({
      assets: [],
      categories: [],
      installments: [],
      fixedExpenses: [],

      addAsset: (a) =>
        set((s) => ({
          assets: [
            ...s.assets,
            { ...a, id: uid(), color: a.color || DEFAULT_COLORS[s.assets.length % DEFAULT_COLORS.length] },
          ],
        })),
      updateAsset: (id, patch) =>
        set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      removeAsset: (id) =>
        set((s) => ({
          assets: s.assets.filter((a) => a.id !== id),
          installments: s.installments.filter((i) => i.assetId !== id),
          fixedExpenses: s.fixedExpenses.filter((f) => f.assetId !== id),
        })),
      // 드래그로 자산 순서 변경 (from 위치의 항목을 to 위치로 이동)
      reorderAssets: (from, to) =>
        set((s) => {
          if (from === to || from < 0 || to < 0 || from >= s.assets.length || to >= s.assets.length)
            return {}
          const assets = [...s.assets]
          const [moved] = assets.splice(from, 1)
          assets.splice(to, 0, moved)
          return { assets }
        }),

      addCategory: (c) => {
        const id = uid()
        set((s) => ({
          categories: [
            ...s.categories,
            {
              ...c,
              id,
              color: c.color || DEFAULT_COLORS[s.categories.length % DEFAULT_COLORS.length],
            },
          ],
        }))
        return id
      },
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      // 카테고리 삭제 시 고정지출은 유지하고 미분류로 되돌림
      removeCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          fixedExpenses: s.fixedExpenses.map((f) =>
            f.categoryId === id ? { ...f, categoryId: undefined } : f,
          ),
        })),

      addInstallment: (i) => set((s) => ({ installments: [...s.installments, { ...i, id: uid() }] })),
      updateInstallment: (id, patch) =>
        set((s) => ({
          installments: s.installments.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      removeInstallment: (id) => set((s) => ({ installments: s.installments.filter((i) => i.id !== id) })),

      addFixedExpense: (f) => set((s) => ({ fixedExpenses: [...s.fixedExpenses, { ...f, id: uid() }] })),
      updateFixedExpense: (id, patch) =>
        set((s) => ({
          fixedExpenses: s.fixedExpenses.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      removeFixedExpense: (id) => set((s) => ({ fixedExpenses: s.fixedExpenses.filter((f) => f.id !== id) })),

      replaceAll: (data) =>
        set(() => ({
          assets: data.assets ?? [],
          categories: data.categories ?? [],
          installments: data.installments ?? [],
          fixedExpenses: data.fixedExpenses ?? [],
        })),
    }),
    {
      name: 'halboos-data',
      version: 3,
      // v1(cards + cardId) → v2(assets + assetId) → v3(categories) 마이그레이션
      migrate: (persisted: unknown, version: number) => {
        const s = (persisted ?? {}) as Record<string, unknown>
        if (version < 3 && !Array.isArray(s.categories)) s.categories = []
        if (version < 2) {
          const cards = Array.isArray(s.cards) ? (s.cards as Record<string, unknown>[]) : []
          s.assets = cards.map((c) => ({ ...c, kind: 'card' }))
          delete s.cards
          const remap = (arr: unknown) =>
            Array.isArray(arr)
              ? (arr as Record<string, unknown>[]).map((x) => {
                  if ('cardId' in x) {
                    x.assetId = x.cardId
                    delete x.cardId
                  }
                  return x
                })
              : []
          s.installments = remap(s.installments)
          s.fixedExpenses = remap(s.fixedExpenses)
        }
        return s as unknown as AppData
      },
    },
  ),
)

export function countAssetRefs(assetId: string): { installments: number; fixed: number } {
  const s = useStore.getState()
  return {
    installments: s.installments.filter((i) => i.assetId === assetId).length,
    fixed: s.fixedExpenses.filter((f) => f.assetId === assetId).length,
  }
}

export function countCategoryRefs(categoryId: string): number {
  return useStore.getState().fixedExpenses.filter((f) => f.categoryId === categoryId).length
}

// 연결된 항목을 안내하고 확인을 받은 뒤 삭제. 삭제했으면 true
export function confirmRemoveAsset(id: string, name: string): boolean {
  const refs = countAssetRefs(id)
  if (refs.installments + refs.fixed > 0) {
    const ok = confirm(
      `'${name}'에 연결된 할부 ${refs.installments}건, 고정지출 ${refs.fixed}건도 함께 삭제됩니다. 계속?`,
    )
    if (!ok) return false
  } else if (!confirm(`'${name}' 자산을 삭제할까요?`)) {
    return false
  }
  useStore.getState().removeAsset(id)
  return true
}

export function confirmRemoveCategory(id: string, name: string): boolean {
  const refs = countCategoryRefs(id)
  if (refs > 0) {
    const ok = confirm(`'${name}'에 속한 고정지출 ${refs}건은 미분류로 바뀝니다. 계속?`)
    if (!ok) return false
  } else if (!confirm(`'${name}' 카테고리를 삭제할까요?`)) {
    return false
  }
  useStore.getState().removeCategory(id)
  return true
}
