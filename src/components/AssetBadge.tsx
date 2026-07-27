import type { Asset } from '../types'
import { hexToRgba } from '../lib/format'

// 자산 색 + 종류 이모지를 하나로 합친 뱃지
export default function AssetBadge({ asset }: { asset?: Asset }) {
  const emoji = asset?.kind === 'account' ? '🏦' : '💳'
  const color = asset?.color ?? '#888888'
  return (
    <span
      className="asset-badge"
      style={{ background: hexToRgba(color, 0.22), boxShadow: `inset 0 0 0 1.5px ${color}` }}
    >
      {emoji}
    </span>
  )
}
