import type { ApiResult } from './api/types.ts'
import { adminErrorMessage } from './adminMemberList.ts'

export const ADMIN_QUOTE_PAGE_SIZE = 10
export const ADMIN_QUOTE_EMPTY = '검색 결과가 없습니다.'
export const ADMIN_QUOTE_LIST_FAILED = '견적 목록을 불러오지 못했습니다.'
export const ADMIN_QUOTE_DETAIL_FAILED = '견적서를 불러오지 못했습니다.'
export const ADMIN_QUOTE_NOT_FOUND = '견적서를 찾을 수 없습니다.'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '작성 중',
  SENT: '발송 완료',
}

export type AdminQuoteSummary = {
  id: number
  quoteDate: string
  authorName: string
  customerName: string
  totalAmount: number
  status: string
}

export type AdminQuotePage = {
  items: AdminQuoteSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type AdminQuoteCustomer = {
  id: number
  name: string | null
  customerType: string | null
  phone: string | null
  email: string | null
  address: string | null
}

export type AdminQuoteItem = {
  id: number
  productName: string
  productCode: string
  salePrice: number
  quantity: number
  amount: number
}

export type AdminQuoteDetail = {
  id: number
  quoteNumber: string
  quoteDate: string
  authorName: string
  status: string
  supplyAmount: number
  vatAmount: number
  totalAmount: number
  customer: AdminQuoteCustomer
  items: AdminQuoteItem[]
}

export type AdminQuoteListQuery = {
  page: number
  quoteDate: string
  authorName: string
  customerName: string
  productKeyword: string
}

export function pageAfterAdminQuoteSearch() {
  return 0
}

export function adminQuoteStatusLabel(status: string) {
  return STATUS_LABEL[status] ?? status
}

export function formatAdminQuoteAmount(value: number) {
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value)}원`
}

export function adminQuoteText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : '-'
}

export function adminQuotePageLabel(page: number, totalPages: number) {
  if (totalPages === 0) {
    return '표시할 페이지가 없습니다.'
  }
  return `${page + 1} / ${totalPages}`
}

export function canGoToFirstAdminQuotePage(page: number, totalPages: number) {
  return totalPages > 0 && page > 0
}

export function canGoToPreviousAdminQuotePage(page: number, totalPages: number) {
  return totalPages > 0 && page > 0
}

export function canGoToNextAdminQuotePage(page: number, totalPages: number) {
  return totalPages > 0 && page + 1 < totalPages
}

export function canGoToLastAdminQuotePage(page: number, totalPages: number) {
  return totalPages > 0 && page + 1 < totalPages
}

export function adminQuotesRequestPath(query: AdminQuoteListQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('size', String(ADMIN_QUOTE_PAGE_SIZE))
  const quoteDate = query.quoteDate.trim()
  if (quoteDate) {
    params.set('quoteDateFrom', quoteDate)
    params.set('quoteDateTo', quoteDate)
  }
  const authorName = query.authorName.trim()
  if (authorName) {
    params.set('authorName', authorName)
  }
  const customerName = query.customerName.trim()
  if (customerName) {
    params.set('customerName', customerName)
  }
  const productKeyword = query.productKeyword.trim()
  if (productKeyword) {
    params.set('productKeyword', productKeyword)
  }
  return `/api/admin/quotes?${params.toString()}`
}

export function adminQuoteErrorMessage(result: ApiResult<unknown>, fallback: string) {
  return adminErrorMessage(result, fallback)
}
