import { saveRestriction } from './api/auth.ts'
import type { ApiResult, Member } from './api/types.ts'
import { isMemberRestricted } from './loginDecision.ts'
import { navigate, pathForMember } from './navigation.ts'

export function redirectOnAccessFailure(result: ApiResult<unknown>) {
  if (result.ok) {
    return false
  }
  if (result.status === 403 && isMemberRestricted(result.error)) {
    saveRestriction(result.error)
    navigate('/access-restricted')
    return true
  }
  if (result.status === 403 && result.error?.code === 'PENDING') {
    navigate('/signup/pending')
    return true
  }
  if (result.status === 401) {
    navigate('/login')
    return true
  }
  return false
}

export function redirectUnless(result: ApiResult<Member>, accept: (member: Member) => boolean) {
  if (redirectOnAccessFailure(result)) {
    return true
  }
  if (!result.ok) {
    return false
  }
  if (accept(result.data)) {
    return false
  }
  navigate(pathForMember(result.data) ?? '/login')
  return true
}
