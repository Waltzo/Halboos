import { useMemo } from 'react'
import { useStore } from '../store'
import { buildMatrix } from '../lib/matrix'
import { formatKRW, hexToRgba, parseMonth } from '../lib/format'
import AssetBadge from './AssetBadge'

// 그래프용 축약 표기 (만 단위)
function short(n: number): string {
  if (!n) return ''
  if (n >= 10000) return (n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '만'
  return n.toLocaleString('ko-KR')
}

function colHeader(ym: string): string {
  const { year, month } = parseMonth(ym)
  return `${String(year).slice(2)}.${month}`
}

export default function MatrixView() {
  const assets = useStore((s) => s.assets)
  const installments = useStore((s) => s.installments)
  const fixedExpenses = useStore((s) => s.fixedExpenses)

  const m = useMemo(
    () => buildMatrix({ assets, installments, fixedExpenses }),
    [assets, installments, fixedExpenses],
  )

  if (m.rows.length === 0) {
    return (
      <div className="panel">
        <h2>📊 내역별 월간 그래프</h2>
        <div className="empty">할부·고정지출을 등록하면 내역별 월간 분포가 표시됩니다.</div>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2>📊 내역별 월간 그래프</h2>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="corner">내역</th>
              {m.months.map((ym) => (
                <th key={ym} className="mcol">
                  {colHeader(ym)}
                </th>
              ))}
              <th className="rowtot">합계</th>
            </tr>
          </thead>
          <tbody>
            {m.rows.map((row, ri) => {
              const sep = ri > 0 && row.kind === 'fixed' && m.rows[ri - 1].kind === 'inst'
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
              return (
                <tr key={row.id} className={sep ? 'group-sep' : ''}>
                  <th className="rowlabel">
                    <AssetBadge asset={row.asset} />
                    <span className="rl-kind">{row.kind === 'inst' ? '할부' : '고정'}</span>
                    <span className="rl-text">{row.label}</span>
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
                  <td className="rowtot num">{short(row.rowTotal)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="rowlabel">월 합계</th>
              {m.colTotals.map((v, i) => (
                <td key={i} className="cell num total">
                  {short(v)}
                </td>
              ))}
              <td className="rowtot num total">{short(m.colTotals.reduce((s, v) => s + v, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="muted" style={{ marginTop: 8 }}>
        색이 진할수록 큰 금액 · 셀에 마우스를 올리면 정확한 금액 표시
      </div>
    </div>
  )
}
