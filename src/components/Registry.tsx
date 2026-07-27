import { useStore, countAssetRefs } from '../store'
import AssetBadge from './AssetBadge'
import { formatKRW, formatMonthKr } from '../lib/format'
import { lastBillingMonth, totalFee } from '../lib/installment'
import type { ModalState } from '../App'

export default function Registry({ onEdit }: { onEdit: (m: ModalState) => void }) {
  const assets = useStore((s) => s.assets)
  const installments = useStore((s) => s.installments)
  const fixedExpenses = useStore((s) => s.fixedExpenses)
  const removeAsset = useStore((s) => s.removeAsset)
  const removeInstallment = useStore((s) => s.removeInstallment)
  const removeFixed = useStore((s) => s.removeFixedExpense)

  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? '(삭제된 자산)'

  const delAsset = (id: string, name: string) => {
    const refs = countAssetRefs(id)
    const total = refs.installments + refs.fixed
    if (total > 0) {
      const ok = confirm(
        `'${name}'에 연결된 할부 ${refs.installments}건, 고정지출 ${refs.fixed}건도 함께 삭제됩니다. 계속?`,
      )
      if (!ok) return
    }
    removeAsset(id)
  }

  return (
    <div className="panel">
      <h2>📂 등록 내역</h2>

      <div className="muted section-label">자산</div>
      {assets.length === 0 && <div className="empty">등록된 자산 없음</div>}
      {assets.map((a) => (
        <div className="list-item" key={a.id}>
          <div className="li-main">
            <span className="cg-name">
              <AssetBadge asset={a} />
              {a.name}
            </span>
            <div className="muted">
              {a.kind === 'card'
                ? `카드 · 매월 ${a.billingDay}일 결제`
                : `계좌${a.bank ? ` · ${a.bank}` : ''}`}
            </div>
          </div>
          <div className="li-actions">
            <button className="tiny ghost" onClick={() => onEdit({ type: 'asset', editingId: a.id })}>
              수정
            </button>
            <button className="tiny ghost danger" onClick={() => delAsset(a.id, a.name)}>
              삭제
            </button>
          </div>
        </div>
      ))}

      <div className="muted section-label">할부</div>
      {installments.length === 0 && <div className="empty">할부 없음</div>}
      {installments.map((i) => {
        const fee = totalFee(i)
        return (
          <div className="list-item" key={i.id}>
            <div className="li-main">
              <div>
                {i.label} <span className="muted">· {assetName(i.assetId)}</span>
              </div>
              <div className="muted">
                {formatKRW(i.total)} · {i.months}개월 ·{' '}
                {i.interest === 'interest' ? `유이자 ${i.annualRate}%` : '무이자'} ·{' '}
                {formatMonthKr(i.firstBillingMonth)}~{formatMonthKr(lastBillingMonth(i))}
                {fee > 0 && ` · 총수수료 ${formatKRW(fee)}`}
              </div>
            </div>
            <div className="li-actions">
              <button className="tiny ghost" onClick={() => onEdit({ type: 'installment', editingId: i.id })}>
                수정
              </button>
              <button className="tiny ghost danger" onClick={() => removeInstallment(i.id)}>
                삭제
              </button>
            </div>
          </div>
        )
      })}

      <div className="muted section-label">고정지출</div>
      {fixedExpenses.length === 0 && <div className="empty">고정지출 없음</div>}
      {fixedExpenses.map((f) => (
        <div className="list-item" key={f.id}>
          <div className="li-main">
            <div>
              {f.label} <span className="muted">· {assetName(f.assetId)}</span>
            </div>
            <div className="muted">
              매월 {formatKRW(f.amount)} · {formatMonthKr(f.startMonth)}~
              {f.endMonth ? formatMonthKr(f.endMonth) : '무기한'}
            </div>
          </div>
          <div className="li-actions">
            <button className="tiny ghost" onClick={() => onEdit({ type: 'fixed', editingId: f.id })}>
              수정
            </button>
            <button className="tiny ghost danger" onClick={() => removeFixed(f.id)}>
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
