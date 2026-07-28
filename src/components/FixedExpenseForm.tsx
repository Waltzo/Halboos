import { useState } from 'react'
import { useStore } from '../store'
import { currentMonth } from '../lib/format'

// select에서 '새 카테고리 만들기'를 고르기 위한 sentinel 값
const NEW_CAT = '__new__'

export default function FixedExpenseForm({
  editingId,
  onDone,
}: {
  editingId?: string
  onDone: () => void
}) {
  const assets = useStore((s) => s.assets)
  const categories = useStore((s) => s.categories)
  const fixedExpenses = useStore((s) => s.fixedExpenses)
  const add = useStore((s) => s.addFixedExpense)
  const update = useStore((s) => s.updateFixedExpense)
  const addCategory = useStore((s) => s.addCategory)
  const editing = editingId ? fixedExpenses.find((f) => f.id === editingId) : undefined

  const [assetId, setAssetId] = useState(editing?.assetId ?? assets[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '')
  const [newCat, setNewCat] = useState<string | null>(null) // null이면 새 카테고리 입력 숨김
  const [label, setLabel] = useState(editing?.label ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [startMonth, setStartMonth] = useState(editing?.startMonth ?? currentMonth())
  const [endMonth, setEndMonth] = useState(editing?.endMonth ?? '')

  const createCategory = () => {
    const name = (newCat ?? '').trim()
    if (!name) return
    const dup = categories.find((c) => c.name === name)
    setCategoryId(dup ? dup.id : addCategory({ name, color: '' }))
    setNewCat(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetId) {
      alert('먼저 자산을 등록하세요.')
      return
    }
    const a = Math.round(Number(amount) || 0)
    if (a <= 0 || !label.trim()) return
    const data = {
      assetId,
      categoryId: categoryId || undefined,
      label: label.trim(),
      amount: a,
      startMonth,
      endMonth: endMonth || undefined,
    }
    if (editing) update(editing.id, data)
    else add(data)
    onDone()
  }

  if (assets.length === 0) {
    return <div className="empty">먼저 자산(카드/계좌)을 추가하세요.</div>
  }

  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>결제 자산</span>
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.kind === 'card' ? '💳' : '🏦'} {a.name}
              {a.kind === 'card' ? ` (매월 ${a.billingDay}일)` : a.bank ? ` (${a.bank})` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>카테고리</span>
        <select
          value={newCat != null ? NEW_CAT : categoryId}
          onChange={(e) => {
            if (e.target.value === NEW_CAT) setNewCat('')
            else {
              setNewCat(null)
              setCategoryId(e.target.value)
            }
          }}
        >
          <option value="">미분류</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NEW_CAT}>+ 새 카테고리…</option>
        </select>
      </label>

      {newCat != null && (
        <div className="row" style={{ marginBottom: 10 }}>
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                createCategory()
              }
            }}
            placeholder="새 카테고리 이름"
            autoFocus
          />
          <button type="button" className="primary" style={{ flex: 'none' }} onClick={createCategory}>
            만들기
          </button>
        </div>
      )}

      <label className="field">
        <span>내역</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 넷플릭스" autoFocus />
      </label>

      <label className="field">
        <span>월 금액 (원)</span>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="17000" />
      </label>

      <div className="row">
        <label className="field">
          <span>시작월</span>
          <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
        </label>
        <label className="field">
          <span>종료월 (선택)</span>
          <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
        </label>
      </div>

      <button type="submit" className="primary" style={{ width: '100%' }}>
        {editing ? '저장' : '추가'}
      </button>
    </form>
  )
}
