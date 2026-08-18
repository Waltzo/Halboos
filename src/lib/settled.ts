import type { Asset } from '../types'
import { isBillingDayPassed, toMonthStr } from './format'

// 이번 달 청구가 이미 결제 완료된 카드인지 (결제일 도달 → 회색 처리 대상).
// - 계좌(kind === 'account')는 결제일 개념이 없으므로 항상 false
// - billingDay 없는 카드도 false
// - 현재월이 아닌 달은 항상 false
// currentMonth() 대신 같은 today 인스턴스에서 현재월을 유도한다
// → 월 경계에서 월 체크와 일 체크가 어긋나는 일이 없다.
export function isAssetSettled(
  asset: Asset | undefined,
  month: string,
  today: Date = new Date(),
): boolean {
  if (!asset || asset.kind !== 'card' || asset.billingDay == null) return false
  if (month !== toMonthStr(today.getFullYear(), today.getMonth() + 1)) return false
  return isBillingDayPassed(asset.billingDay, today)
}
