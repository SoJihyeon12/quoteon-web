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

export function customersPath(page: number, size: number, keyword: string) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  const trimmed = keyword.trim()
  if (trimmed) {
    params.set('keyword', trimmed)
  }
  return `/api/customers?${params.toString()}`
}

export function customerDetailPath(customerId: number) {
  return `/customers/${customerId}`
}

export function customerEditPath(customerId: number) {
  return `/customers/${customerId}/edit`
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
