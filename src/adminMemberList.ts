import type { ApiResult } from './api/types.ts'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'

export const PENDING_PAGE_SIZE = 20
export const MEMBER_PAGE_SIZE = 10

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

export type MemberSummary = {
  id: number
  name: string
  email: string
  phone: string | null
  companyName: string | null
  role: string
  status: string
}

export type MemberSummaryPage = {
  items: MemberSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const ROLE_LABEL: Record<string, string> = {
  ROLE_USER: '영업사원',
  ROLE_ADMIN: '관리자',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기',
  ACTIVE: '이용 가능',
  REJECTED: '가입 거절',
  INACTIVE: '비활성화',
}

export function membersPath(page: number, size: number, keyword: string) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  const trimmed = keyword.trim()
  if (trimmed) {
    params.set('keyword', trimmed)
  }
  return `/api/admin/members?${params.toString()}`
}

export function membersRequestPath(page: number, keyword: string) {
  return membersPath(page, MEMBER_PAGE_SIZE, keyword)
}

export function expectedMemberPages(totalElements: number) {
  if (totalElements <= 0) {
    return 0
  }
  return Math.ceil(totalElements / MEMBER_PAGE_SIZE)
}

export function visibleMemberCount(totalElements: number, page: number) {
  const start = page * MEMBER_PAGE_SIZE
  return Math.max(0, Math.min(MEMBER_PAGE_SIZE, totalElements - start))
}

export function canGoToPreviousMemberPage(page: number) {
  return page > 0
}

export function canGoToNextMemberPage(page: number, totalPages: number) {
  return totalPages > 0 && page + 1 < totalPages
}

export function pageAfterMemberSearch() {
  return 0
}

export function memberRoleLabel(role: string) {
  return ROLE_LABEL[role] ?? role
}

export function memberStatusLabel(status: string) {
  return STATUS_LABEL[status] ?? status
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
