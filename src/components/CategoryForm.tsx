import { useState } from 'react'
import { useStore, DEFAULT_COLORS, confirmRemoveCategory } from '../store'
import ColorPicker from './ColorPicker'

export default function CategoryForm({
  editingId,
  onDone,
}: {
  editingId?: string
  onDone: () => void
}) {
  const categories = useStore((s) => s.categories)
  const addCategory = useStore((s) => s.addCategory)
  const updateCategory = useStore((s) => s.updateCategory)
  const editing = editingId ? categories.find((c) => c.id === editingId) : undefined

  const [name, setName] = useState(editing?.name ?? '')
  const [color, setColor] = useState(
    editing?.color ?? DEFAULT_COLORS[categories.length % DEFAULT_COLORS.length],
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (editing) updateCategory(editing.id, { name: name.trim(), color })
    else addCategory({ name: name.trim(), color })
    onDone()
  }

  const remove = () => {
    if (!editing) return
    if (confirmRemoveCategory(editing.id, editing.name)) onDone()
  }

  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>카테고리 이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 구독, 통신비, 보험"
          autoFocus
        />
      </label>

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
