import { pendingMembersPath, PENDING_PAGE_SIZE, membersRequestPath, type MemberSummary, type MemberSummaryPage, type PendingMemberPage } from '../adminMemberList.ts'
import type { MemberUpdateBody } from '../memberEdit.ts'
import { apiRequest } from './client.ts'
import type { Member } from './types.ts'

export function fetchPendingMembers(page: number, keyword: string) {
  return apiRequest<PendingMemberPage>(pendingMembersPath(page, PENDING_PAGE_SIZE, keyword))
}

export function fetchMembers(page: number, keyword: string) {
  return apiRequest<MemberSummaryPage>(membersRequestPath(page, keyword))
}

export function fetchMember(memberId: number) {
  return apiRequest<MemberSummary>(`/api/admin/members/${memberId}`)
}

export function updateMember(memberId: number, body: MemberUpdateBody) {
  return apiRequest<MemberSummary>(`/api/admin/members/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deactivateMember(memberId: number) {
  return apiRequest<MemberSummary>(`/api/admin/members/${memberId}/deactivate`, { method: 'POST' })
}

export function approveMember(memberId: number) {
  return apiRequest<Member>(`/api/admin/members/${memberId}/approve`, { method: 'POST' })
}

export function rejectMember(memberId: number) {
  return apiRequest<Member>(`/api/admin/members/${memberId}/reject`, { method: 'POST' })
}
