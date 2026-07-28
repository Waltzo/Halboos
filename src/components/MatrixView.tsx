import { useMemo } from 'react'
import { useStore } from '../store'
import { buildMatrix } from '../lib/matrix'
import { formatKRW, hexToRgba, parseMonth } from '../lib/format'
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

// 합계 행 (할부 합계 / 카테고리별 / 고정지출 합계 / 월 합계)
function TotalRow({
  label,
  cells,
  kind,
  color,
}: {
  label: string
  cells: number[]
  kind: 'sub' | 'cat' | 'total'
  color?: string
}) {
  const sum = cells.reduce((s, v) => s + v, 0)
  return (
    <tr className={kind === 'total' ? '' : `${kind}total-row`}>
      <th className="rowlabel">
        {kind === 'cat' && <span className="dot" style={{ background: color ?? 'var(--border)' }} />}
        {label}
      </th>
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

export default function MatrixView({ onEdit }: { onEdit: (m: ModalState) => void }) {
  const assets = useStore((s) => s.assets)
  const categories = useStore((s) => s.categories)
  const installments = useStore((s) => s.installments)
  const fixedExpenses = useStore((s) => s.fixedExpenses)

  const m = useMemo(
    () => buildMatrix({ assets, categories, installments, fixedExpenses }),
    [assets, categories, installments, fixedExpenses],
  )

  if (m.rows.length === 0) {
    return (
      <div className="panel">
        <h2>📊 내역별 월간 그래프</h2>
        <div className="empty">할부·고정지출을 등록하면 내역별 월간 분포가 표시됩니다.</div>
      </div>
    )
  }

  const hasInst = m.rows.some((r) => r.kind === 'inst')
  const hasFixed = m.rows.some((r) => r.kind === 'fixed')

  // 12개월이 화면에 들어오도록 표 너비를 월 수에 비례해 늘림 (나머지는 가로 스크롤)
  const tableWidth = `max(100%, calc(${FIXED_COLS_W} + (100% - ${FIXED_COLS_W}) * ${m.months.length} / ${VISIBLE_MONTHS}), calc(${FIXED_COLS_W} + ${m.months.length} * ${MIN_MONTH_W}px))`

  return (
    <div className="panel">
      <h2>📊 내역별 월간 그래프</h2>
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
            {m.rows.map((row, ri) => {
              const prev = ri > 0 ? m.rows[ri - 1] : undefined
              // 할부→고정 경계는 진한 선, 고정지출 안의 카테고리 경계는 옅은 선
              const kindSep = !!prev && prev.kind !== row.kind
              const catSep =
                !!prev &&
                !kindSep &&
                row.kind === 'fixed' &&
                (prev.category?.id ?? '') !== (row.category?.id ?? '')
              const bgFor = (v: number) => {
                const ratio = m.max > 0 ? v / m.max : 0
                return v > 0 && row.asset ? hexToRgba(row.asset.color, 0.15 + 0.75 * ratio) : 'transparent'
              }
              // 고정지출: 연속된 같은 금액 구간을 한 셀로 병합
              let first = -1
              let last = -1
              row.cells.forEach((v, i) => {
                if (v > 0) {
                  if (first < 0) first = i
                  last = i
                }
              })
              const merge = row.kind === 'fixed' && first >= 0
              const kindLabel = row.kind === 'inst' ? '할부' : (row.category?.name ?? '미분류')
              const edit = () =>
                onEdit({
                  type: row.kind === 'inst' ? 'installment' : 'fixed',
                  editingId: row.id,
                })
              return (
                <tr key={row.id} className={kindSep ? 'group-sep' : catSep ? 'cat-sep' : ''}>
                  <th className="rowlabel">
                    <span className="rl-inner">
                      <AssetBadge asset={row.asset} />
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
                  {merge
                    ? row.cells.map((v, i) => {
                        if (i < first || i > last) return <td key={i} className="cell" />
                        if (i === first)
                          return (
                            <td
                              key={i}
                              className="cell merged"
                              colSpan={last - first + 1}
                              style={{ background: bgFor(v) }}
                              title={formatKRW(v)}
                            >
                              {short(v)}
                            </td>
                          )
                        return null
                      })
                    : row.cells.map((v, i) => (
                        <td
                          key={i}
                          className="cell"
                          style={{ background: bgFor(v) }}
                          title={v ? formatKRW(v) : ''}
                        >
                          {short(v)}
                        </td>
                      ))}
                  <td className="rowtot num" title={row.rowTotal ? formatKRW(row.rowTotal) : ''}>
                    {short(row.rowTotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            {hasInst && <TotalRow label="할부 합계" cells={m.instTotals} kind="sub" />}
            {hasFixed && <TotalRow label="고정지출 합계" cells={m.fixedTotals} kind="sub" />}
            {/* 카테고리별 내역은 고정지출 합계의 하위 항목 */}
            {m.categoryTotals.length > 1 &&
              m.categoryTotals.map((c) => (
                <TotalRow key={c.key || '__none'} label={c.name} cells={c.cells} kind="cat" color={c.color} />
              ))}
            <TotalRow label="월 합계" cells={m.colTotals} kind="total" />
          </tfoot>
        </table>
      </div>
      <div className="muted" style={{ marginTop: 8 }}>
        색이 진할수록 큰 금액 · 금액에 마우스를 올리면 정확한 금액 표시 · 내역 이름을 클릭하면 수정
      </div>
    </div>
  )
}
