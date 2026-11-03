import type { ApiResult } from './api/types.ts'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'

export const QUOTE_PAGE_SIZE = 10

export type QuoteSummary = {
  id: number
  quoteNumber: string
  customerId: number
  customerName: string
  quoteDate: string
  status: string
  supplyAmount: number
  vatAmount: number
  totalAmount: number
  createdAt: string
}

export type QuotePage = {
  items: QuoteSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '작성 중',
  SENT: '발송 완료',
}

export function quoteViewPath(quoteId: number) {
  return `/quotes/${quoteId}/view`
}

export function quoteIdFromViewPath(pathname: string) {
  const match = /^\/quotes\/([1-9]\d*)\/view$/.exec(pathname)
  if (!match) {
    return null
  }
  const quoteId = Number(match[1])
  return Number.isSafeInteger(quoteId) ? quoteId : null
}

export function quotesPath(query: { page: number; size: number; customerName?: string; quoteDate?: string }) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('size', String(query.size))
  const customerName = query.customerName?.trim() ?? ''
  if (customerName) {
    params.set('customerName', customerName)
  }
  const quoteDate = query.quoteDate?.trim() ?? ''
  if (quoteDate) {
    params.set('quoteDate', quoteDate)
  }
  return `/api/quotes?${params.toString()}`
}

export const QUOTE_LIST_EMPTY = '등록된 견적서가 없습니다.'
export const QUOTE_SEARCH_EMPTY = '검색 결과가 없습니다.'

export function pageAfterQuoteSearch() {
  return 0
}

export function quoteListPageCount(totalElements: number) {
  if (totalElements <= 0) {
    return 0
  }
  return Math.ceil(totalElements / QUOTE_PAGE_SIZE)
}

export function quoteListEmptyMessage(customerName: string, quoteDate: string) {
  return customerName.trim() || quoteDate.trim() ? QUOTE_SEARCH_EMPTY : QUOTE_LIST_EMPTY
}

export function quoteStatusLabel(status: string) {
  return STATUS_LABEL[status] ?? status
}

export function canContinueQuote(status: string) {
  return status === 'DRAFT'
}

export function canRequote(status: string) {
  return status === 'SENT'
}

export function formatAmount(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`
}

export function quoteErrorMessage(result: ApiResult<unknown>, fallback: string) {
  if (result.ok) {
    return ''
  }
  if (result.status === 0) {
    return CONNECTION_MESSAGE
  }
  if (result.error?.code === 'CSRF') {
    return CSRF_MESSAGE
  }
  if (result.error?.message) {
    return result.error.message
  }
  return fallback
}
