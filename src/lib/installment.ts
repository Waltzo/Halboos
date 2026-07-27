import type { Installment } from '../types'
import { addMonths } from './format'

export type ScheduleRow = {
  month: string // 'YYYY-MM'
  installmentNo: number // 1..months
  principal: number
  fee: number // 할부수수료
  amount: number // principal + fee
}

// 원금 균등분할 + 잔액기준 월수수료(카드사 표준).
// 반올림 잔차는 마지막 회차 원금에 흡수 → sum(principal)===total.
export function buildSchedule(inst: Installment): ScheduleRow[] {
  const { total, months, interest, annualRate, firstBillingMonth } = inst
  if (months <= 0) return []

  const monthlyPrincipal = total / months
  const basePrincipal = Math.round(monthlyPrincipal)
  const rows: ScheduleRow[] = []

  for (let n = 1; n <= months; n++) {
    const remainingStart = total - monthlyPrincipal * (n - 1)
    const fee =
      interest === 'interest'
        ? Math.round((remainingStart * (annualRate / 100)) / 12)
        : 0
    const principal =
      n < months ? basePrincipal : total - basePrincipal * (months - 1)
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

export function lastBillingMonth(inst: Installment): string {
  return addMonths(inst.firstBillingMonth, Math.max(0, inst.months - 1))
}
