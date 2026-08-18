import { useState } from 'react'
import { useStore, DEFAULT_COLORS, confirmRemoveAsset } from '../store'
import type { AssetKind } from '../types'
import ColorPicker from './ColorPicker'

export default function AssetForm({
  editingId,
  onDone,
}: {
  editingId?: string
  onDone: () => void
}) {
  const assets = useStore((s) => s.assets)
  const addAsset = useStore((s) => s.addAsset)
  const updateAsset = useStore((s) => s.updateAsset)
  const editing = editingId ? assets.find((a) => a.id === editingId) : undefined

  const [kind, setKind] = useState<AssetKind>(editing?.kind ?? 'card')
  const [name, setName] = useState(editing?.name ?? '')
  const [billingDay, setBillingDay] = useState(String(editing?.billingDay ?? 15))
  const [bank, setBank] = useState(editing?.bank ?? '')
  const [color, setColor] = useState(
    editing?.color ?? DEFAULT_COLORS[assets.length % DEFAULT_COLORS.length],
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const base = {
      kind,
      name: name.trim(),
      color,
      billingDay:
        kind === 'card' ? Math.min(31, Math.max(1, Number(billingDay) || 1)) : undefined,
      bank: kind === 'account' ? bank.trim() || undefined : undefined,
    }
    if (editing) updateAsset(editing.id, base)
    else addAsset(base)
    onDone()
  }

  const remove = () => {
    if (!editing) return
    if (confirmRemoveAsset(editing.id, editing.name)) onDone()
  }

  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>종류</span>
        <div className="pill-toggle">
          <button type="button" className={kind === 'card' ? 'on' : ''} onClick={() => setKind('card')}>
            💳 카드
          </button>
          <button
            type="button"
            className={kind === 'account' ? 'on' : ''}
            onClick={() => setKind('account')}
          >
            🏦 은행계좌
          </button>
        </div>
      </label>

      {kind === 'card' ? (
        <>
          <label className="field">
            <span>카드 이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 신한카드"
              autoFocus
            />
          </label>
          <label className="field">
            <span>결제일 (매월)</span>
            <input
              type="number"
              min={1}
              max={31}
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
            />
            <span className="muted hint">29~31일은 해당 월에 없으면 말일로 처리됩니다</span>
          </label>
        </>
      ) : (
        <div className="row">
          <label className="field">
            <span>은행명</span>
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="예: 국민은행" autoFocus />
          </label>
          <label className="field">
            <span>계좌명</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 주거래 통장" />
          </label>
        </div>
      )}

      <label className="field">
        <span>색상</span>
        <ColorPicker value={color} onChange={setColor} />
      </label>

      <div className="form-actions">
        {editing && (
          <button type="button" className="ghost danger" onClick={remove}>
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
