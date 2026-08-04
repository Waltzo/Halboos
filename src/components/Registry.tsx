import {
  useStore,
  countCategoryRefs,
  confirmRemoveAsset,
  confirmRemoveCategory,
} from '../store'
import AssetBadge from './AssetBadge'
import { formatKRW, formatMonthKr } from '../lib/format'
import { lastBillingMonth, totalFee } from '../lib/installment'
import type { FixedExpense } from '../types'
import type { ModalState } from '../App'

export default function Registry({ onEdit }: { onEdit: (m: ModalState) => void }) {
  const assets = useStore((s) => s.assets)
  const categories = useStore((s) => s.categories)
  const installments = useStore((s) => s.installments)
  const fixedExpenses = useStore((s) => s.fixedExpenses)
  const removeInstallment = useStore((s) => s.removeInstallment)
  const removeFixed = useStore((s) => s.removeFixedExpense)

  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? '(삭제된 자산)'
  const fixedTotal = fixedExpenses.reduce((s, f) => s + f.amount, 0)

  // 카테고리별 고정지출 묶음 (없는 카테고리를 참조하는 항목도 미분류로)
  const known = new Set(categories.map((c) => c.id))
  const groups: { key: string; name: string; color?: string; items: FixedExpense[] }[] = [
    ...categories.map((c) => ({
      key: c.id,
      name: c.name,
      color: c.color,
      items: fixedExpenses.filter((f) => f.categoryId === c.id),
    })),
    {
      key: '',
      name: '미분류',
      items: fixedExpenses.filter((f) => !f.categoryId || !known.has(f.categoryId)),
    },
  ].filter((g) => g.items.length > 0)

  const fixedItem = (f: FixedExpense) => (
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
  )

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
            <button className="tiny ghost danger" onClick={() => confirmRemoveAsset(a.id, a.name)}>
              삭제
            </button>
          </div>
        </div>
      ))}

      <div className="section-label section-head">
        <span className="muted">고정지출 카테고리</span>
        <button className="tiny ghost" onClick={() => onEdit({ type: 'category' })}>
          + 카테고리
        </button>
      </div>
      {categories.length === 0 && (
        <div className="empty">카테고리 없음 · 고정지출을 묶어서 볼 수 있습니다</div>
      )}
      {categories.map((c) => (
        <div className="list-item" key={c.id}>
          <div className="li-main">
            <span className="cg-name">
              <span className="dot" style={{ background: c.color }} />
              {c.name}
            </span>
            <div className="muted">
              고정지출 {countCategoryRefs(c.id)}건 ·{' '}
              {formatKRW(
                fixedExpenses.filter((f) => f.categoryId === c.id).reduce((s, f) => s + f.amount, 0),
              )}
              /월
            </div>
          </div>
          <div className="li-actions">
            <button
              className="tiny ghost"
              onClick={() => onEdit({ type: 'category', editingId: c.id })}
            >
              수정
            </button>
            <button
              className="tiny ghost danger"
              onClick={() => confirmRemoveCategory(c.id, c.name)}
            >
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

      <div className="muted section-label">
        고정지출
        {fixedExpenses.length > 0 && ` · 월 합계 ${formatKRW(fixedTotal)}`}
      </div>
      {fixedExpenses.length === 0 && <div className="empty">고정지출 없음</div>}
      {groups.map((g) => (
        <div className="cat-group" key={g.key || '__none'}>
          <div className="cat-head">
            <span className="cg-name">
              <span className="dot" style={{ background: g.color ?? 'var(--border)' }} />
              {g.name}
            </span>
            <span className="amt">
              {formatKRW(g.items.reduce((s, f) => s + f.amount, 0))}/월
            </span>
          </div>
          {g.items.map(fixedItem)}
        </div>
      ))}
    </div>
  )
}
