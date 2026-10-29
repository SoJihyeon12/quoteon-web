import type { ApiError, ApiResult, Member } from './api/types.ts'
import { pathForMember } from './navigation.ts'

export const INVALID_CREDENTIALS_MESSAGE = '이메일 또는 비밀번호가 올바르지 않아 로그인할 수 없습니다.'
export const SESSION_CHECK_FAILED_MESSAGE = '로그인 세션을 확인하지 못했습니다. 다시 로그인해 주세요.'
export const CSRF_MESSAGE = '보안 토큰이 유효하지 않습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
export const NO_SCREEN_MESSAGE = '이 계정의 상태 또는 역할에 해당하는 화면이 없습니다.'
export const CONNECTION_MESSAGE = '로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

export type LoginUiAction =
  | { type: 'show-form' }
  | { type: 'message'; message: string }
  | { type: 'restricted'; error: ApiError }
  | { type: 'navigate'; path: string }

function isRestrictedValue(value: string | null | undefined) {
  return value === 'REJECTED' || value === 'INACTIVE'
}

export function isMemberRestricted(error: ApiError | null): error is ApiError {
  if (!error) {
    return false
  }
  return isRestrictedValue(error.code) || isRestrictedValue(error.memberStatus)
}

function navigateForMember(member: Member): LoginUiAction {
  const path = pathForMember(member)
  if (!path) {
    return { type: 'message', message: NO_SCREEN_MESSAGE }
  }
  return { type: 'navigate', path }
}

function messageForOtherFailure(status: number, error: ApiError | null) {
  if (status === 0) {
    return CONNECTION_MESSAGE
  }
  if (error?.code === 'CSRF') {
    return CSRF_MESSAGE
  }
  if (status === 400 && error?.message) {
    return error.message
  }
  if (error?.message) {
    return error.message
  }
  return CONNECTION_MESSAGE
}

function failureAction(
  result: Extract<ApiResult<Member>, { ok: false }>,
  unauthenticated: LoginUiAction,
  unclassifiedForbidden: LoginUiAction,
): LoginUiAction {
  if (result.status === 401) {
    return unauthenticated
  }
  if (result.status === 403 && isMemberRestricted(result.error)) {
    return { type: 'restricted', error: result.error }
  }
  if (result.status === 403 && result.error?.code === 'PENDING') {
    return { type: 'navigate', path: '/signup/pending' }
  }
  if (result.status === 403 && result.error?.code === 'CSRF') {
    return { type: 'message', message: CSRF_MESSAGE }
  }
  if (result.status === 403 && result.error?.message) {
    return { type: 'message', message: result.error.message }
  }
  if (result.status === 403) {
    return unclassifiedForbidden
  }
  return { type: 'message', message: messageForOtherFailure(result.status, result.error) }
}

export function decideInitialMember(result: ApiResult<Member>): LoginUiAction {
  if (result.ok) {
    return navigateForMember(result.data)
  }
  return failureAction(result, { type: 'show-form' }, { type: 'show-form' })
}

export function decideLoginRequest(result: ApiResult<Member>): LoginUiAction {
  if (result.ok) {
    return { type: 'show-form' }
  }
  return failureAction(
    result,
    { type: 'message', message: INVALID_CREDENTIALS_MESSAGE },
    { type: 'message', message: CONNECTION_MESSAGE },
  )
}

export function decideSessionConfirmation(result: ApiResult<Member>): LoginUiAction {
  if (result.ok) {
    return navigateForMember(result.data)
  }
  const sessionFailed = { type: 'message', message: SESSION_CHECK_FAILED_MESSAGE } as const
  return failureAction(result, sessionFailed, sessionFailed)
}
