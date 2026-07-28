import type { AppData } from '../types'

export function exportJson(data: AppData): void {
  const payload: AppData = {
    assets: data.assets,
    categories: data.categories,
    installments: data.installments,
    fixedExpenses: data.fixedExpenses,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `halboos-backup-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImport(text: string): AppData {
  const raw = JSON.parse(text)
  if (typeof raw !== 'object' || raw === null) throw new Error('잘못된 파일 형식')
  // v1 백업(cards) 하위호환: cards → assets(kind:'card'), cardId → assetId
  const assetsRaw = Array.isArray(raw.assets)
    ? raw.assets
    : Array.isArray(raw.cards)
      ? raw.cards.map((c: Record<string, unknown>) => ({ ...c, kind: 'card' }))
      : []
  const remap = (arr: unknown) =>
    Array.isArray(arr)
      ? arr.map((x: Record<string, unknown>) => {
          if ('cardId' in x && !('assetId' in x)) {
            x.assetId = x.cardId
            delete x.cardId
          }
          return x
        })
      : []
  const data = {
    assets: assetsRaw,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    installments: remap(raw.installments),
    fixedExpenses: remap(raw.fixedExpenses),
  } as unknown as AppData
  return data
}
