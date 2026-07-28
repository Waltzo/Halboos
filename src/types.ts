export type AssetKind = 'card' | 'account' // 카드 / 은행계좌

export type Asset = {
  id: string
  kind: AssetKind
  name: string
  color: string
  billingDay?: number // 카드: 매월 결제일 (1-31)
  bank?: string // 계좌: 은행명
}

export type InterestType = 'none' | 'interest' // 무이자 / 유이자

export type Installment = {
  id: string
  assetId: string
  label: string // 구매처 / 내역
  total: number // 원금 (KRW 정수)
  months: number
  interest: InterestType
  annualRate: number // 유이자 연이율(%). 무이자면 0
  firstBillingMonth: string // 'YYYY-MM' 첫 청구월
}

// 고정지출 분류 (사용자가 직접 생성)
export type Category = {
  id: string
  name: string
  color: string
}

export type FixedExpense = {
  id: string
  assetId: string
  categoryId?: string // 없으면 미분류
  label: string
  amount: number
  startMonth: string // 'YYYY-MM'
  endMonth?: string // 'YYYY-MM' 없으면 무기한
}

export type AppData = {
  assets: Asset[]
  categories: Category[]
  installments: Installment[]
  fixedExpenses: FixedExpense[]
}
