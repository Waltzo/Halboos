import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, Asset, FixedExpense, Installment } from './types'
import { uid } from './lib/format'

type State = AppData & {
  addAsset: (a: Omit<Asset, 'id'>) => void
  updateAsset: (id: string, patch: Partial<Omit<Asset, 'id'>>) => void
  removeAsset: (id: string) => void

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
          installments: data.installments ?? [],
          fixedExpenses: data.fixedExpenses ?? [],
        })),
    }),
    {
      name: 'halboos-data',
      version: 2,
      // v1(cards + cardId) → v2(assets + assetId) 마이그레이션
      migrate: (persisted: unknown, version: number) => {
        const s = (persisted ?? {}) as Record<string, unknown>
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
