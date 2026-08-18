import { Fragment, useMemo, useState } from 'react'
import { useStore } from '../store'
import { buildMatrix } from '../lib/matrix'
import type { CategoryTotal, MatrixRow } from '../lib/matrix'
import { formatKRW, parseMonth, currentMonth } from '../lib/format'
import { isAssetSettled } from '../lib/settled'
import AssetBadge from './AssetBadge'
import type { ModalState } from '../App'

// 스크롤 없이 기본으로 보이는 월 수
const VISIBLE_MONTHS = 12
// 좌측 내역 열 + 우측 합계 열 고정 폭 합 (index.css의 col 폭과 일치)
const FIXED_COLS_W = '225px'
// 월 열 최소 폭 — 12개월이 항상 들어가도록 좁게 잡음 (모바일에서만 스크롤)
const MIN_MONTH_W = 43

// 그래프용 축약 표기 (만 단위) — 좁은 열에 들어가도록 100만 이상은 소수점 생략
function short(n: number): string {
  if (!n) return ''
  if (n >= 100000) return Math.round(n / 10000).toLocaleString('ko-KR') + '만'
  if (n >= 10000) return (n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '만'
  return n.toLocaleString('ko-KR')
}

// 연도는 첫 열과 1월에만 붙임 ('26.1', '2', '3' …)
function colHeader(ym: string, i: number): string {
  const { year, month } = parseMonth(ym)
  return i === 0 || month === 1 ? `${String(year).slice(2)}.${month}` : String(month)
}

// 합계 행 (할부 합계 / 고정지출 합계 / 월 합계)
function TotalRow({
  label,
  cells,
  kind,
}: {
  label: string
  cells: number[]
  kind: 'sub' | 'total'
}) {
  const sum = cells.reduce((s, v) => s + v, 0)
  return (
    <tr className={kind === 'total' ? '' : 'subtotal-row'}>
      <th className="rowlabel">{label}</th>
      {cells.map((v, i) => (
        <td key={i} className="cell num total" title={v ? formatKRW(v) : ''}>
          {short(v)}
        </td>
      ))}
      <td className="rowtot num total" title={sum ? formatKRW(sum) : ''}>
        {short(sum)}
      </td>
    </tr>
  )
}

// 고정지출 카테고리 그룹 헤더 — 클릭하면 하위 내역 행이 펼쳐짐.
// 집계 행이라 히트맵 틴트를 넣지 않는다 (한 카테고리가 여러 자산에 걸칠 수 있음)
function CategoryGroupRow({
  g,
  expanded,
  onToggle,
  sep,
}: {
  g: CategoryTotal
  expanded: boolean
  onToggle: () => void
  sep?: string
}) {
  const sum = g.cells.reduce((s, v) => s + v, 0)
  return (
    <tr className={['catgroup-row', sep ?? ''].filter(Boolean).join(' ')}>
      <th className="rowlabel">
        <button
          type="button"
          className="cat-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          title={`${g.name} ${expanded ? '접기' : '펼치기'} (고정지출 ${g.rows.length}건)`}
        >
          <span className="caret" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
          <span className="dot" style={{ background: g.color ?? 'var(--border)' }} />
          <span className="cat-name">{g.name}</span>
          <span className="cat-count">{g.rows.length}</span>
        </button>
      </th>
      {g.cells.map((v, i) => (
        <td key={i} className="cell num" title={v ? formatKRW(v) : ''}>
          {short(v)}
        </td>
      ))}
      <td className="rowtot num" title={sum ? formatKRW(sum) : ''}>
        {short(sum)}
      </td>
    </tr>
  )
}

// 내역 한 줄 (할부 또는 고정지출)
function RowView({
  row,
  max,
  months,
  nowIdx,
  child,
  sep,
  onEdit,
}: {
  row: MatrixRow
  max: number
  months: string[]
  nowIdx: number
  child?: boolean
  sep?: string
  onEdit: (m: ModalState) => void
}) {
  // 이 행의 자산이 카드이고 이번 달 결제일이 지났으면 이번 달 칸은 결제 완료
  const rowSettled = nowIdx >= 0 && isAssetSettled(row.asset, months[nowIdx])
  const settledAt = (i: number, v: number) => rowSettled && i === nowIdx && v > 0

  // 히트맵 배경은 CSS 가 계산한다 — 알파 램프가 라이트/다크에서 달라야 하기 때문
  // (index.css 의 --hm-lo / --hm-hi). 여기서는 색과 비율만 넘긴다.
  const tintFor = (v: number): React.CSSProperties | undefined => {
    if (!(v > 0) || !row.asset) return undefined
    const ratio = max > 0 ? v / max : 0
    return { '--hm-c': row.asset.color, '--hm-a': ratio } as React.CSSProperties
  }

  // 값이 있는 구간
  let first = -1
  let last = -1
  row.cells.forEach((v, i) => {
    if (v > 0) {
      if (first < 0) first = i
      last = i
    }
  })

  // 고정지출: 연속된 같은 금액 구간을 한 셀로 병합.
  // 단 결제 완료된 이번 달이 구간 안에 있으면 그 달만 떼어내 따로 회색 처리
  type Seg = { start: number; end: number; settled: boolean }
  const segs: Seg[] = []
  if (row.kind === 'fixed' && first >= 0) {
    if (rowSettled && first <= nowIdx && nowIdx <= last) {
      if (first < nowIdx) segs.push({ start: first, end: nowIdx - 1, settled: false })
      segs.push({ start: nowIdx, end: nowIdx, settled: true })
      if (nowIdx < last) segs.push({ start: nowIdx + 1, end: last, settled: false })
    } else {
      segs.push({ start: first, end: last, settled: false })
    }
  }
  const segStart = new Map(segs.map((s) => [s.start, s]))

  const kindLabel = row.kind === 'inst' ? '할부' : (row.category?.name ?? '미분류')
  const edit = () =>
    onEdit({ type: row.kind === 'inst' ? 'installment' : 'fixed', editingId: row.id })

  return (
    <tr className={[child ? 'child-row' : '', sep ?? ''].filter(Boolean).join(' ')}>
      <th className="rowlabel">
        <span className="rl-inner">
          <AssetBadge asset={row.asset} />
          {/* 그룹 안에서는 카테고리 태그가 중복이므로 생략 → 내역 이름 폭 확보 */}
          {!child && (
            <span
              className="rl-kind"
              title={kindLabel}
              style={
                row.category
                  ? { color: row.category.color, borderColor: row.category.color }
                  : undefined
              }
            >
              {kindLabel}
            </span>
          )}
          <button
            type="button"
            className="rl-text rl-link"
            onClick={edit}
            title={`${row.label} 수정`}
          >
            {row.label}
          </button>
        </span>
      </th>
      {segs.length > 0
        ? row.cells.map((v, i) => {
            const seg = segStart.get(i)
            if (seg)
              return (
                <td
                  key={i}
                  className={'cell merged' + (seg.settled ? ' settled' : '')}
                  colSpan={seg.end - seg.start + 1}
                  style={seg.settled ? undefined : tintFor(v)}
                  title={formatKRW(v) + (seg.settled ? ' · 결제 완료' : '')}
                >
                  {short(v)}
                </td>
              )
            if (i >= first && i <= last) return null
            return <td key={i} className="cell" />
          })
        : row.cells.map((v, i) => {
            const isSettled = settledAt(i, v)
            const isPrepay = row.prepaidIdx === i
            return (
              <td
                key={i}
                className={'cell' + (isPrepay ? ' prepaid' : '') + (isSettled ? ' settled' : '')}
                style={isSettled ? undefined : tintFor(v)}
                title={
                  v
                    ? formatKRW(v) +
                      (isPrepay ? ' · 선결제 잔액상환' : '') +
                      (isSettled ? ' · 결제 완료' : '')
                    : ''
                }
              >
                {short(v)}
              </td>
            )
          })}
      <td className="rowtot num" title={row.rowTotal ? formatKRW(row.rowTotal) : ''}>
        {short(row.rowTotal)}
      </td>
    </tr>
  )
}

export default function MatrixView({ onEdit }: { onEdit: (m: ModalState) => void }) {
  const assets = useStore((s) => s.assets)
  const categories = useStore((s) => s.categories)
  const installments = useStore((s) => s.installments)
  const fixedExpenses = useStore((s) => s.fixedExpenses)

  const m = useMemo(
    () => buildMatrix({ assets, categories, installments, fixedExpenses }),
    [assets, categories, installments, fixedExpenses],
  )

  // 펼쳐진 카테고리 key 집합. 기본은 전부 접힘(간소화).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const instRows = useMemo(() => m.rows.filter((r) => r.kind === 'inst'), [m])
  // 현재월 열 (computeHorizon이 현재월부터 시작하므로 사실상 항상 0)
  const nowIdx = m.months.indexOf(currentMonth())

  if (m.rows.length === 0) {
    return (
      <div>
        <h2 className="section-title">📊 내역별 월간 그래프</h2>
        <div className="panel">
          <div className="empty">할부·고정지출을 등록하면 내역별 월간 분포가 표시됩니다.</div>
        </div>
      </div>
    )
  }

  const hasInst = instRows.length > 0
  const hasFixed = m.rows.some((r) => r.kind === 'fixed')

  // 12개월이 화면에 들어오도록 표 너비를 월 수에 비례해 늘림 (나머지는 가로 스크롤)
  const tableWidth = `max(100%, calc(${FIXED_COLS_W} + (100% - ${FIXED_COLS_W}) * ${m.months.length} / ${VISIBLE_MONTHS}), calc(${FIXED_COLS_W} + ${m.months.length} * ${MIN_MONTH_W}px))`

  return (
    <div>
      <h2 className="section-title">📊 내역별 월간 그래프</h2>
      <div className="panel">
      <div className="matrix-wrap">
        <table className="matrix" style={{ width: tableWidth }}>
          <colgroup>
            <col className="c-label" />
            {m.months.map((ym) => (
              <col key={ym} />
            ))}
            <col className="c-tot" />
          </colgroup>
          <thead>
            <tr>
              <th className="corner">내역</th>
              {m.months.map((ym, i) => (
                <th key={ym} className="mcol" title={ym}>
                  {colHeader(ym, i)}
                </th>
              ))}
              <th className="rowtot">합계</th>
            </tr>
          </thead>
          <tbody>
            {instRows.map((row) => (
              <RowView key={row.id} row={row} max={m.max} months={m.months} nowIdx={nowIdx} onEdit={onEdit} />
            ))}
            {m.categoryTotals.map((g, gi) => {
              const open = expanded.has(g.key)
              return (
                <Fragment key={g.key || '__none'}>
                  <CategoryGroupRow
                    g={g}
                    expanded={open}
                    onToggle={() => toggle(g.key)}
                    sep={gi === 0 ? (hasInst ? 'group-sep' : '') : 'cat-sep'}
                  />
                  {open &&
                    g.rows.map((row) => (
                      <RowView
                        key={row.id}
                        row={row}
                        max={m.max}
                        months={m.months}
                        nowIdx={nowIdx}
                        child
                        onEdit={onEdit}
                      />
                    ))}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            {hasInst && <TotalRow label="할부 합계" cells={m.instTotals} kind="sub" />}
            {hasFixed && <TotalRow label="고정지출 합계" cells={m.fixedTotals} kind="sub" />}
            <TotalRow label="월 합계" cells={m.colTotals} kind="total" />
          </tfoot>
        </table>
      </div>
      <div className="muted" style={{ marginTop: 8 }}>
        색이 진할수록 큰 금액 · 금액에 마우스를 올리면 정확한 금액 표시 · 내역 이름을 클릭하면 수정 ·
        카테고리 이름을 클릭하면 고정지출 상세 펼치기
      </div>
      </div>
    </div>
  )
}
