import { DEFAULT_COLORS } from '../store'

// 실제 색을 보여주는 스와치 + 커스텀 색상 선택
export default function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (c: string) => void
}) {
  return (
    <div className="color-picker">
      {DEFAULT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={'swatch' + (value.toLowerCase() === c.toLowerCase() ? ' on' : '')}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={c}
        />
      ))}
      <label className="swatch custom" style={{ background: value }} title="직접 선택">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        🎨
      </label>
    </div>
  )
}
