import type { AppData, Asset, Category } from '../types'
import { buildSchedule, lastBillingMonth, isPrepaidEffective } from './installment'
import { computeHorizon } from './aggregate'
import { monthLte } from './format'

// 무기한(종료 없음) 정렬용 sentinel — 가장 위로
const NO_END = '9999-99'

export type MatrixRow = {
  id: string
  label: string
  asset?: Asset
  category?: Category // 고정지출만, 없으면 미분류
  kind: 'inst' | 'fixed'
  end: string // 종료월 'YYYY-MM' (무기한이면 NO_END)
  prepaidIdx?: number // 선결제 잔액 일시상환이 찍히는 열 index (없으면 undefined)
  cells: number[] // months.length 길이, 없는 달은 0
  rowTotal: number
}

export type CategoryTotal = {
  key: string // 카테고리 id, 미분류는 ''
  name: string
  color?: string
  cells: number[]
  rows: MatrixRow[] // 이 카테고리의 고정지출 행 (정렬 순서 유지)
}

export type Matrix = {
  months: string[]
  rows: MatrixRow[]
  colTotals: number[]
  instTotals: number[] // 월별 할부 합계
  fixedTotals: number[] // 월별 고정지출 합계
  categoryTotals: CategoryTotal[] // 고정지출 카테고리별 월 합계
  max: number // 최대 셀 값 (히트맵 스케일용)
}

export function buildMatrix(data: AppData): Matrix {
  const months = computeHorizon(data)
  const idx = new Map(months.map((m, i) => [m, i]))
  const assetById = new Map(data.assets.map((a) => [a.id, a]))
  const categoryById = new Map(data.categories.map((c) => [c.id, c]))
  const rows: MatrixRow[] = []

  for (const inst of data.installments) {
    const cells = new Array(months.length).fill(0)
    const sched = buildSchedule(inst)
    for (const r of sched) {
      const i = idx.get(r.month)
      if (i != null) cells[i] += r.amount
    }
    const lastRow = sched[sched.length - 1]
    rows.push({
      id: inst.id,
      label: inst.label,
      asset: assetById.get(inst.assetId),
      kind: 'inst',
      end: lastBillingMonth(inst),
      prepaidIdx: isPrepaidEffective(inst) && lastRow ? idx.get(lastRow.month) : undefined,
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
      category: fx.categoryId ? categoryById.get(fx.categoryId) : undefined,
      kind: 'fixed',
      end: fx.endMonth ?? NO_END,
      cells,
      rowTotal: cells.reduce((s, v) => s + v, 0),
    })
  }

  // 1차: 종류(할부 먼저, 고정 아래) / 2차: 카테고리(등록순, 미분류 마지막)
  // 3차: 종료월 내림차순(늦게 끝날수록 위)
  const kindRank = (k: MatrixRow['kind']) => (k === 'inst' ? 0 : 1)
  const catOrder = new Map(data.categories.map((c, i) => [c.id, i]))
  const catRank = (r: MatrixRow) =>
    r.category ? (catOrder.get(r.category.id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
  rows.sort(
    (a, b) =>
      kindRank(a.kind) - kindRank(b.kind) ||
      catRank(a) - catRank(b) ||
      (a.end < b.end ? 1 : a.end > b.end ? -1 : a.label.localeCompare(b.label)),
  )

  const sumOf = (pick: (r: MatrixRow) => boolean) =>
    months.map((_, i) => rows.reduce((s, r) => (pick(r) ? s + r.cells[i] : s), 0))

  // 카테고리별 합계 — 실제 고정지출이 있는 카테고리만 (정렬된 행 순서 유지)
  const categoryTotals: CategoryTotal[] = []
  for (const r of rows) {
    if (r.kind !== 'fixed') continue
    const key = r.category?.id ?? ''
    if (categoryTotals.some((c) => c.key === key)) continue
    const inCat = (x: MatrixRow) => x.kind === 'fixed' && (x.category?.id ?? '') === key
    categoryTotals.push({
      key,
      name: r.category?.name ?? '미분류',
      color: r.category?.color,
      cells: sumOf(inCat),
      rows: rows.filter(inCat),
    })
  }

  const colTotals = months.map((_, i) => rows.reduce((s, r) => s + r.cells[i], 0))
  const max = rows.reduce((m, r) => Math.max(m, ...r.cells), 0)

  return {
    months,
    rows,
    colTotals,
    instTotals: sumOf((r) => r.kind === 'inst'),
    fixedTotals: sumOf((r) => r.kind === 'fixed'),
    categoryTotals,
    max,
  }
}
