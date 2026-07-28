import type { AppData, Asset } from '../types'
import { buildSchedule, lastBillingMonth } from './installment'
import { addMonths, currentMonth, monthDiff, monthLte } from './format'

export type AssetLine = {
  label: string
  category?: string // 고정지출 카테고리 이름
  installmentNo?: number // 할부면 회차, 고정지출이면 undefined
  months?: number
  principal: number
  fee: number
  amount: number
}

export type AssetGroup = {
  asset: Asset
  lines: AssetLine[]
  subtotal: number
}

export type MonthBucket = {
  month: string
  byAsset: AssetGroup[]
  total: number
}

// 표시 월 범위: 현재월 ~ 마지막 청구/지출월 (최대 60개월 안전상한)
export function computeHorizon(data: AppData): string[] {
  const start = currentMonth()
  let end = start
  for (const inst of data.installments) {
    const last = lastBillingMonth(inst)
    if (monthLte(end, last)) end = last
  }
  for (const fx of data.fixedExpenses) {
    if (fx.endMonth && monthLte(end, fx.endMonth)) end = fx.endMonth
  }
  const hasOpenFixed = data.fixedExpenses.some((f) => !f.endMonth)
  if (hasOpenFixed) {
    const min = addMonths(start, 11)
    if (monthLte(end, min)) end = min
  }
  const span = Math.min(monthDiff(start, end), 60)
  const months: string[] = []
  for (let i = 0; i <= span; i++) months.push(addMonths(start, i))
  return months
}

// 카드(결제일 오름차순) 먼저, 계좌는 이름순으로 뒤에
function sortKey(a: Asset): [number, number, string] {
  if (a.kind === 'card') return [0, a.billingDay ?? 99, a.name]
  return [1, 0, a.name]
}

export function aggregate(data: AppData): MonthBucket[] {
  const months = computeHorizon(data)
  const assetById = new Map(data.assets.map((a) => [a.id, a]))
  const categoryById = new Map(data.categories.map((c) => [c.id, c]))

  const table = new Map<string, Map<string, AssetLine[]>>()
  for (const m of months) table.set(m, new Map())

  const push = (month: string, assetId: string, line: AssetLine) => {
    const byAsset = table.get(month)
    if (!byAsset) return
    if (!byAsset.has(assetId)) byAsset.set(assetId, [])
    byAsset.get(assetId)!.push(line)
  }

  for (const inst of data.installments) {
    for (const r of buildSchedule(inst)) {
      push(r.month, inst.assetId, {
        label: inst.label,
        installmentNo: r.installmentNo,
        months: inst.months,
        principal: r.principal,
        fee: r.fee,
        amount: r.amount,
      })
    }
  }

  for (const fx of data.fixedExpenses) {
    for (const m of months) {
      const afterStart = monthLte(fx.startMonth, m)
      const beforeEnd = !fx.endMonth || monthLte(m, fx.endMonth)
      if (afterStart && beforeEnd) {
        push(m, fx.assetId, {
          label: fx.label,
          category: fx.categoryId ? categoryById.get(fx.categoryId)?.name : undefined,
          principal: fx.amount,
          fee: 0,
          amount: fx.amount,
        })
      }
    }
  }

  return months.map((month) => {
    const byAssetMap = table.get(month)!
    const byAsset: AssetGroup[] = []
    for (const [assetId, lines] of byAssetMap) {
      const asset = assetById.get(assetId)
      if (!asset) continue
      const subtotal = lines.reduce((s, l) => s + l.amount, 0)
      byAsset.push({ asset, lines, subtotal })
    }
    byAsset.sort((a, b) => {
      const ka = sortKey(a.asset)
      const kb = sortKey(b.asset)
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2])
    })
    const total = byAsset.reduce((s, g) => s + g.subtotal, 0)
    return { month, byAsset, total }
  })
}
