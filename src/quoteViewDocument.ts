import type { QuoteItem } from './api/quotes.ts'
import type { AdminQuoteItem } from './adminQuote.ts'
import type { FormalQuoteLine } from './components/FormalQuoteDocument.tsx'

/** 견적 상세 항목을 와이어프레임 16 정식 견적서 행으로 변환한다. */
export function formalQuoteLinesFromItems(items: QuoteItem[]): FormalQuoteLine[] {
  return items.map((item) => ({
    key: item.id,
    name: item.productName,
    productCode: item.productCode,
    quantity: item.quantity,
    unitPrice: item.salePrice,
    amount: item.amount,
  }))
}

/** 관리자 견적 상세 항목을 정식 견적서 행으로 변환한다. */
export function formalQuoteLinesFromAdminItems(items: AdminQuoteItem[]): FormalQuoteLine[] {
  return items.map((item) => ({
    key: item.id,
    name: item.productName,
    productCode: item.productCode,
    quantity: item.quantity,
    unitPrice: item.salePrice,
    amount: item.amount,
  }))
}
