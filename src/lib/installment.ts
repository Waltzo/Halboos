import type { Installment } from '../types'
import { addMonths, monthDiff } from './format'

export type ScheduleRow = {
  month: string // 'YYYY-MM'
  installmentNo: number // 1..months
  principal: number
  fee: number // 할부수수료
  amount: number // principal + fee
}

// 선결제 회차 (1..months). 선결제가 없거나 범위를 벗어나면 정상 마지막 회차(months).
// - 첫 청구월보다 이른 달을 지정하면 1회차로 당김
// - 마지막 회차 이후를 지정하면 효과 없음(정상 스케줄과 동일)
export function prepayNo(inst: Installment): number {
  const { prepaidMonth, months, firstBillingMonth } = inst
  if (!prepaidMonth) return months
  const k = monthDiff(firstBillingMonth, prepaidMonth) + 1
  return Math.min(months, Math.max(1, k))
}

// 실제로 회차가 잘렸는지 (배지·마커 표시용)
export function isPrepaidEffective(inst: Installment): boolean {
  return !!inst.prepaidMonth && prepayNo(inst) < inst.months
}

// 원금 균등분할 + 잔액기준 월수수료(카드사 표준).
// 반올림 잔차는 마지막 회차 원금에 흡수 → sum(principal)===total.
// 선결제한 달이 마지막 회차가 되며, 그 달에 잔여 원금 전액 + 그 달 수수료만 청구.
// (이후 회차 수수료는 면제)
export function buildSchedule(inst: Installment): ScheduleRow[] {
  const { total, months, interest, annualRate, firstBillingMonth } = inst
  if (months <= 0) return []

  const lastNo = prepayNo(inst) // 정상이면 months, 선결제면 그 회차
  const monthlyPrincipal = total / months
  const basePrincipal = Math.round(monthlyPrincipal)
  const rows: ScheduleRow[] = []

  for (let n = 1; n <= lastNo; n++) {
    const remainingStart = total - monthlyPrincipal * (n - 1)
    const fee =
      interest === 'interest'
        ? Math.round((remainingStart * (annualRate / 100)) / 12)
        : 0
    // 마지막 회차(정상 종료 또는 선결제 달)는 남은 원금을 전부 청구
    const principal =
      n < lastNo ? basePrincipal : total - basePrincipal * (n - 1)
    rows.push({
      month: addMonths(firstBillingMonth, n - 1),
      installmentNo: n,
      principal,
      fee,
      amount: principal + fee,
    })
  }
  return rows
}

export function totalFee(inst: Installment): number {
  return buildSchedule(inst).reduce((s, r) => s + r.fee, 0)
}

// 선결제로 면제된 수수료 (선결제가 없으면 0)
export function waivedFee(inst: Installment): number {
  if (!isPrepaidEffective(inst)) return 0
  return totalFee({ ...inst, prepaidMonth: undefined }) - totalFee(inst)
}

export function lastBillingMonth(inst: Installment): string {
  return addMonths(inst.firstBillingMonth, Math.max(0, prepayNo(inst) - 1))
}
