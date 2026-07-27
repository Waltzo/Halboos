import type { AppData, Asset } from '../types'
import { buildSchedule, lastBillingMonth } from './installment'
import { computeHorizon } from './aggregate'
import { monthLte } from './format'

// 무기한(종료 없음) 정렬용 sentinel — 가장 위로
const NO_END = '9999-99'

export type MatrixRow = {
  id: string
  label: string
  asset?: Asset
  kind: 'inst' | 'fixed'
  end: string // 종료월 'YYYY-MM' (무기한이면 NO_END)
  cells: number[] // months.length 길이, 없는 달은 0
  rowTotal: number
}

export type Matrix = {
  months: string[]
  rows: MatrixRow[]
  colTotals: number[]
  max: number // 최대 셀 값 (히트맵 스케일용)
}

export function buildMatrix(data: AppData): Matrix {
  const months = computeHorizon(data)
  const idx = new Map(months.map((m, i) => [m, i]))
  const assetById = new Map(data.assets.map((a) => [a.id, a]))
  const rows: MatrixRow[] = []

  for (const inst of data.installments) {
    const cells = new Array(months.length).fill(0)
    for (const r of buildSchedule(inst)) {
      const i = idx.get(r.month)
      if (i != null) cells[i] += r.amount
    }
    rows.push({
      id: inst.id,
      label: inst.label,
      asset: assetById.get(inst.assetId),
      kind: 'inst',
      end: lastBillingMonth(inst),
      cells,
      rowTotal: cells.reduce((s, v) => s + v, 0),
    })
  }

  for (const fx of data.fixedExpenses) {
    const cells = new Array(months.length).fill(0)
    months.forEach((m, i) => {
      const active = monthLte(fx.startMonth, m) && (!fx.endMonth || monthLte(m, fx.endMonth))
      if (active) cells[i] += fx.amount
    })
    rows.push({
      id: fx.id,
      label: fx.label,
      asset: assetById.get(fx.assetId),
      kind: 'fixed',
      end: fx.endMonth ?? NO_END,
      cells,
      rowTotal: cells.reduce((s, v) => s + v, 0),
    })
  }

  // 1차: 종류(할부 먼저, 고정 아래) / 2차: 종료월 내림차순(늦게 끝날수록 위)
  const kindRank = (k: MatrixRow['kind']) => (k === 'inst' ? 0 : 1)
  rows.sort(
    (a, b) =>
      kindRank(a.kind) - kindRank(b.kind) ||
      (a.end < b.end ? 1 : a.end > b.end ? -1 : a.label.localeCompare(b.label)),
  )

  const colTotals = months.map((_, i) => rows.reduce((s, r) => s + r.cells[i], 0))
  const max = rows.reduce((m, r) => Math.max(m, ...r.cells), 0)

  return { months, rows, colTotals, max }
}
