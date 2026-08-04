import { useState } from 'react'
import { useStore } from '../store'
import type { InterestType } from '../types'
import { currentMonth } from '../lib/format'

export default function InstallmentForm({
  editingId,
  onDone,
}: {
  editingId?: string
  onDone: () => void
}) {
  const assets = useStore((s) => s.assets)
  const installments = useStore((s) => s.installments)
  const add = useStore((s) => s.addInstallment)
  const update = useStore((s) => s.updateInstallment)
  const remove = useStore((s) => s.removeInstallment)
  const editing = editingId ? installments.find((i) => i.id === editingId) : undefined

  const cards = assets.filter((a) => a.kind === 'card')

  const [assetId, setAssetId] = useState(editing?.assetId ?? cards[0]?.id ?? '')
  const [label, setLabel] = useState(editing?.label ?? '')
  const [total, setTotal] = useState(editing ? String(editing.total) : '')
  const [months, setMonths] = useState(String(editing?.months ?? 12))
  const [interest, setInterest] = useState<InterestType>(editing?.interest ?? 'none')
  const [annualRate, setAnnualRate] = useState(String(editing?.annualRate || 15))
  const [firstBillingMonth, setFirstBillingMonth] = useState(
    editing?.firstBillingMonth ?? currentMonth(),
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetId) {
      alert('먼저 카드 자산을 등록하세요.')
      return
    }
    const t = Math.round(Number(total) || 0)
    const m = Math.max(1, Math.round(Number(months) || 1))
    if (t <= 0 || !label.trim()) return
    const data = {
      assetId,
      label: label.trim(),
      total: t,
      months: m,
      interest,
      annualRate: interest === 'interest' ? Number(annualRate) || 0 : 0,
      firstBillingMonth,
    }
    if (editing) update(editing.id, data)
    else add(data)
    onDone()
  }

  const del = () => {
    if (!editing) return
    if (!confirm(`'${editing.label}' 할부를 삭제할까요?`)) return
    remove(editing.id)
    onDone()
  }

  if (cards.length === 0) {
    return <div className="empty">할부는 카드 자산이 필요합니다. 먼저 카드를 추가하세요.</div>
  }

  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>카드</span>
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (매월 {c.billingDay}일)
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>내역 / 구매처</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 냉장고" autoFocus />
      </label>

      <div className="row">
        <label className="field">
          <span>원금 (원)</span>
          <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="1200000" />
        </label>
        <label className="field">
          <span>개월수</span>
          <input type="number" min={1} value={months} onChange={(e) => setMonths(e.target.value)} />
        </label>
      </div>

      <label className="field">
        <span>이자 방식</span>
        <div className="pill-toggle">
          <button type="button" className={interest === 'none' ? 'on' : ''} onClick={() => setInterest('none')}>
            무이자
          </button>
          <button
            type="button"
            className={interest === 'interest' ? 'on' : ''}
            onClick={() => setInterest('interest')}
          >
            유이자
          </button>
        </div>
      </label>

      {interest === 'interest' && (
        <label className="field">
          <span>연이율 (%)</span>
          <input
            type="number"
            step="0.1"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
          />
        </label>
      )}

      <label className="field">
        <span>첫 청구월</span>
        <input type="month" value={firstBillingMonth} onChange={(e) => setFirstBillingMonth(e.target.value)} />
      </label>

      <div className="form-actions">
        {editing && (
          <button type="button" className="ghost danger" onClick={del}>
            삭제
          </button>
        )}
        <button type="submit" className="primary submit">
          {editing ? '저장' : '추가'}
        </button>
      </div>
    </form>
  )
}
