import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { aggregate } from '../lib/aggregate'
import { formatKRW, formatMonthKr, currentMonth } from '../lib/format'
import type { AssetGroup } from '../lib/aggregate'
import AssetBadge from './AssetBadge'

const VISIBLE_MONTHS = 6

export default function MonthlySummary() {
  const assets = useStore((s) => s.assets)
  const categories = useStore((s) => s.categories)
  const installments = useStore((s) => s.installments)
  const fixedExpenses = useStore((s) => s.fixedExpenses)

  const buckets = useMemo(
    () => aggregate({ assets, categories, installments, fixedExpenses }),
    [assets, categories, installments, fixedExpenses],
  )

  const [open, setOpen] = useState<string | null>(currentMonth())

  // 사이드 요약은 가까운 6개월만. 그 이후는 우측 매트릭스에서 확인.
  const shown = buckets.slice(0, VISIBLE_MONTHS)
  const hiddenCount = buckets.length - shown.length
  const maxTotal = Math.max(1, ...shown.map((b) => b.total))
  const hasData = installments.length > 0 || fixedExpenses.length > 0

  if (!hasData) {
    return (
      <div>
        <h2 className="section-title">📅 월별 결제 예정</h2>
        <div className="panel">
          <div className="empty">할부나 고정지출을 등록하면 월별 결제 예정 금액이 여기 표시됩니다.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="section-title">📅 월별 결제 예정</h2>
      <div className="month-list">
      {shown.map((b) => {
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
      {hiddenCount > 0 && (
        <div className="muted more-months">이후 {hiddenCount}개월은 우측 표에서 확인</div>
      )}
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
            {l.category && <span className="cat-tag">{l.category}</span>}
            {l.label}
            {l.installmentNo != null && l.months != null && (
              <span className="fee">
                {' '}
                ({l.installmentNo}/{l.months}회{l.fee > 0 ? `, 수수료 ${formatKRW(l.fee)}` : ''}
                {l.prepay ? ', 선결제 잔액상환' : ''})
              </span>
            )}
          </span>
          <span className="amt">{formatKRW(l.amount)}</span>
        </div>
      ))}
    </div>
  )
}
