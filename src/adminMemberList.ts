import type { ApiResult } from './api/types.ts'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'

export const PENDING_PAGE_SIZE = 20

export type PendingMember = {
  id: number
  name: string
  email: string
  phone: string | null
  companyName: string | null
  role: string
  createdAt: string
}

export type PendingMemberPage = {
  items: PendingMember[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export function pendingMembersPath(page: number, size: number, keyword: string) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  const trimmed = keyword.trim()
  if (trimmed) {
    params.set('keyword', trimmed)
  }
  return `/api/admin/members/pending?${params.toString()}`
}

export function displayText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '-'
}

export function formatCreatedAt(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
  if (!match) {
    return value
  }
  return `${match[1]} ${match[2]}`
}

export function adminErrorMessage(result: ApiResult<unknown>, fallback: string) {
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
