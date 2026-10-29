import { pendingMembersPath, PENDING_PAGE_SIZE, type PendingMemberPage } from '../adminMemberList.ts'
import { apiRequest } from './client.ts'
import type { Member } from './types.ts'

export function fetchPendingMembers(page: number, keyword: string) {
  return apiRequest<PendingMemberPage>(pendingMembersPath(page, PENDING_PAGE_SIZE, keyword))
}

export function approveMember(memberId: number) {
  return apiRequest<Member>(`/api/admin/members/${memberId}/approve`, { method: 'POST' })
}

export function rejectMember(memberId: number) {
  return apiRequest<Member>(`/api/admin/members/${memberId}/reject`, { method: 'POST' })
}
