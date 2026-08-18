// 통화·날짜 유틸 (외부 의존 없음)

export function formatKRW(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원'
}

// 'YYYY-MM' → { year, month }
export function parseMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, month: m }
}

export function toMonthStr(year: number, month: number): string {
  // month: 1-12 로 정규화
  const y = year + Math.floor((month - 1) / 12)
  const m = ((month - 1) % 12 + 12) % 12 + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

// 'YYYY-MM' 에 k개월 더함 (k 음수 가능)
export function addMonths(ym: string, k: number): string {
  const { year, month } = parseMonth(ym)
  return toMonthStr(year, month + k)
}

// 'YYYY-MM' 문자열 비교 (사전순 == 시간순)
export function monthLte(a: string, b: string): boolean {
  return a <= b
}

export function monthDiff(from: string, to: string): number {
  const a = parseMonth(from)
  const b = parseMonth(to)
  return (b.year - a.year) * 12 + (b.month - a.month)
}

export function currentMonth(): string {
  const d = new Date()
  return toMonthStr(d.getFullYear(), d.getMonth() + 1)
}

// 이번 달에서 지정한 결제일이 되었거나 지났는지 (결제일 당일부터 결제 완료).
// 결제일이 그 달에 없으면(예: 31일 · 2월) 말일로 당겨서 판단한다.
export function isBillingDayPassed(billingDay: number, today: Date = new Date()): boolean {
  const y = today.getFullYear()
  const m = today.getMonth() + 1
  const lastDay = new Date(y, m, 0).getDate() // m이 1-based이므로 '다음 달 0일' = 이번 달 말일
  const effective = Math.min(Math.max(1, Math.round(billingDay)), lastDay)
  return today.getDate() >= effective
}

// 'YYYY-MM' → '2026년 7월' 표시용
export function formatMonthKr(ym: string): string {
  const { year, month } = parseMonth(ym)
  return `${year}년 ${month}월`
}

// '#rrggbb' + alpha → 'rgba(...)'
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
