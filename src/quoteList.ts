import type { ApiResult } from './api/types.ts'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'

export const QUOTE_PAGE_SIZE = 20

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

export function quotesPath(page: number, size: number) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  return `/api/quotes?${params.toString()}`
}

export function quoteStatusLabel(status: string) {
  return STATUS_LABEL[status] ?? status
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
