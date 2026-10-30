import type { CustomerSummary } from './customerList.ts'

export const QUOTE_EDIT_MODE = 'edit'
export const QUOTE_REWRITE_MODE = 'rewrite'
export const SENT_QUOTE_EDIT_MESSAGE = '발송 완료된 견적은 수정할 수 없습니다.'

export type WorkbenchLine = {
  productId: number
  productCode: string
  name: string
  salePrice: number
  quantity: string
}

export type WorkbenchDraft = {
  writtenOn: string
  customer: CustomerSummary
  lines: WorkbenchLine[]
}

export function quoteWorkbenchQuoteId(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null
  }
  const quoteId = Number(value)
  return Number.isSafeInteger(quoteId) ? quoteId : null
}

export function quoteEditPath(quoteId: number) {
  return `/consultation?mode=${QUOTE_EDIT_MODE}&quoteId=${quoteId}`
}

export function quoteRewritePath(quoteId: number) {
  return `/consultation?mode=${QUOTE_REWRITE_MODE}&quoteId=${quoteId}`
}

export function canEditStoredQuote(status: string) {
  return status === 'DRAFT'
}

export function quoteCustomerLocked(mode: string | null) {
  return mode === QUOTE_EDIT_MODE
}

export function quoteSaveAction(mode: string | null, quoteId: number | null) {
  if (mode === QUOTE_EDIT_MODE) {
    return quoteId === null ? 'blocked' : 'update'
  }
  return 'create'
}

export function workbenchDraftFromQuote(quote: {
  quoteDate: string
  customerId: number
  customerName: string
  items: Array<{
    productId: number
    productName: string
    productCode: string
    salePrice: number
    quantity: number
  }>
}): WorkbenchDraft | null {
  if (!quote.quoteDate.trim() || !Number.isSafeInteger(quote.customerId) || quote.customerId < 1) {
    return null
  }
  if (!quote.customerName.trim() || quote.items.length === 0) {
    return null
  }
  const lines: WorkbenchLine[] = []
  for (const item of quote.items) {
    if (!Number.isSafeInteger(item.productId) || item.productId < 1) {
      return null
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return null
    }
    if (!Number.isFinite(item.salePrice)) {
      return null
    }
    lines.push({
      productId: item.productId,
      productCode: item.productCode,
      name: item.productName,
      salePrice: item.salePrice,
      quantity: String(item.quantity),
    })
  }
  return {
    writtenOn: quote.quoteDate,
    customer: {
      id: quote.customerId,
      name: quote.customerName,
      phone: null,
      customerType: '',
    },
    lines,
  }
}
