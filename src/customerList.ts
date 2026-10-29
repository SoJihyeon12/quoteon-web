import type { ApiResult } from './api/types.ts'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'

export const CUSTOMER_PAGE_SIZE = 20

export type CustomerSummary = {
  id: number
  name: string
  phone: string | null
  customerType: string
}

export type CustomerPage = {
  items: CustomerSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export function customersPath(page: number, size: number, keyword: string, customerType = '') {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  const trimmed = keyword.trim()
  if (trimmed) {
    params.set('keyword', trimmed)
  }
  if (customerType === '개인' || customerType === '기업') {
    params.set('customerType', customerType)
  }
  return `/api/customers?${params.toString()}`
}

export function customerDetailPath(customerId: number) {
  return `/customers/${customerId}`
}

export function customerEditPath(customerId: number) {
  return `/customers/${customerId}/edit`
}

export function customerSummaryFromDetail(customer: {
  id: number
  name: string
  phone: string | null
  customerType: string
}): CustomerSummary {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    customerType: customer.customerType,
  }
}

export function consultationCustomerId(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null
  }
  const customerId = Number(value)
  return Number.isSafeInteger(customerId) ? customerId : null
}

export function quoteFromCustomerPath(customerId: number) {
  const params = new URLSearchParams()
  params.set('mode', 'new')
  params.set('customerId', String(customerId))
  return `/consultation?${params.toString()}`
}

export function customerRecordRoute(pathname: string) {
  const editing = /^\/customers\/([1-9]\d*)\/edit$/.exec(pathname)
  const detail = /^\/customers\/([1-9]\d*)$/.exec(pathname)
  const match = editing ?? detail
  if (!match) {
    return null
  }
  const customerId = Number(match[1])
  if (!Number.isSafeInteger(customerId)) {
    return null
  }
  return { customerId, editing: Boolean(editing) }
}

export function displayPhone(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '-'
}

export function customerErrorMessage(result: ApiResult<unknown>, fallback: string) {
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
