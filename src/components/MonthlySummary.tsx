import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { aggregate } from '../lib/aggregate'
import { formatKRW, formatMonthKr, currentMonth } from '../lib/format'
import type { AssetGroup } from '../lib/aggregate'
import AssetBadge from './AssetBadge'

export default function MonthlySummary() {
  const assets = useStore((s) => s.assets)
  const installments = useStore((s) => s.installments)
  const fixedExpenses = useStore((s) => s.fixedExpenses)

  const buckets = useMemo(
    () => aggregate({ assets, installments, fixedExpenses }),
    [assets, installments, fixedExpenses],
  )

  const [open, setOpen] = useState<string | null>(currentMonth())

  const maxTotal = Math.max(1, ...buckets.map((b) => b.total))
  const hasData = installments.length > 0 || fixedExpenses.length > 0

  if (!hasData) {
    return (
      <div className="panel">
        <h2>📅 월별 결제 예정</h2>
        <div className="empty">할부나 고정지출을 등록하면 월별 결제 예정 금액이 여기 표시됩니다.</div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, margin: '4px 4px 12px' }}>📅 월별 결제 예정</h2>
      <div className="month-scroll">
      {buckets.map((b) => {
        const isOpen = open === b.month
        return (
          <div className="month-card" key={b.month}>
            <div className="month-head" onClick={() => setOpen(isOpen ? null : b.month)}>
              <span className="mtitle">
                {isOpen ? '▾' : '▸'} {formatMonthKr(b.month)}
              </span>
              <span className="mtotal">{formatKRW(b.total)}</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(b.total / maxTotal) * 100}%` }} />
            </div>
            {isOpen && (
              <div className="month-body">
                {b.byAsset.length === 0 && <div className="empty">이 달 결제 예정 없음</div>}
                {b.byAsset.map((g) => (
                  <AssetGroupView key={g.asset.id} g={g} />
                ))}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}

function AssetGroupView({ g }: { g: AssetGroup }) {
  const a = g.asset
  const sub =
    a.kind === 'card'
      ? `· 매월 ${a.billingDay}일 결제`
      : a.bank
        ? `· ${a.bank}`
        : '· 계좌'
  return (
    <div className="cardgroup">
      <div className="cg-head">
        <span className="cg-name">
          <AssetBadge asset={a} />
          {a.name}
          <span className="cg-sub">{sub}</span>
        </span>
        <span className="amt">{formatKRW(g.subtotal)}</span>
      </div>
      {g.lines.map((l, idx) => (
        <div className="line" key={idx}>
          <span className="lbl">
            {l.label}
            {l.installmentNo != null && l.months != null && (
              <span className="fee">
                {' '}
                ({l.installmentNo}/{l.months}회{l.fee > 0 ? `, 수수료 ${formatKRW(l.fee)}` : ''})
              </span>
            )}
          </span>
          <span className="amt">{formatKRW(l.amount)}</span>
        </div>
      ))}
    </div>
  )
}
