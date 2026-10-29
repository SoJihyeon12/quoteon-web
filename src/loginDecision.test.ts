import assert from 'node:assert/strict'
import test from 'node:test'
import type { ApiError, ApiResult, Member } from './api/types.ts'
import {
  CSRF_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  SESSION_CHECK_FAILED_MESSAGE,
  decideInitialMember,
  decideLoginRequest,
  decideSessionConfirmation,
} from './loginDecision.ts'

function errorBody(
  status: number,
  code: string,
  message: string,
  memberStatus: string | null = null,
  name: string | null = null,
  email: string | null = null,
  companyName: string | null = null,
): ApiError {
  return { status, code, message, memberStatus, name, email, companyName }
}

function failure(error: ApiError): ApiResult<Member> {
  return { ok: false, status: error.status, error }
}

const activeUser: Member = {
  id: 1,
  email: 'sales@quoteon.test',
  name: '영업',
  phone: null,
  companyName: 'QuoteOn',
  role: 'ROLE_USER',
  status: 'ACTIVE',
}

test('최초 진입의 401 UNAUTHENTICATED는 로그인 폼을 유지한다', () => {
  const action = decideInitialMember(failure(errorBody(401, 'UNAUTHENTICATED', '로그인이 필요합니다.')))
  assert.deepEqual(action, { type: 'show-form' })
})

test('최초 진입의 403 REJECTED는 이용 제한 정보와 함께 이동한다', () => {
  const error = errorBody(
    403,
    'REJECTED',
    '가입 신청이 거절되었습니다.',
    'REJECTED',
    '거절회원',
    'rejected@quoteon.test',
    'QuoteOn',
  )
  assert.deepEqual(decideInitialMember(failure(error)), { type: 'restricted', error })
})

test('code가 달라도 memberStatus가 INACTIVE이면 이용 제한으로 구분한다', () => {
  const error = errorBody(403, 'FORBIDDEN', '계정이 비활성화되어 서비스를 이용할 수 없습니다.', 'INACTIVE')
  assert.deepEqual(decideInitialMember(failure(error)), { type: 'restricted', error })
})

test('CSRF 403은 회원 거절이나 비활성으로 분류하지 않는다', () => {
  const error = errorBody(403, 'CSRF', 'CSRF 토큰이 유효하지 않습니다.')
  assert.deepEqual(decideInitialMember(failure(error)), { type: 'message', message: CSRF_MESSAGE })
  assert.notEqual(decideInitialMember(failure(error)).type, 'restricted')
})

test('로그인 요청의 401은 이메일 또는 비밀번호 오류다', () => {
  const action = decideLoginRequest(failure(errorBody(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.')))
  assert.deepEqual(action, { type: 'message', message: INVALID_CREDENTIALS_MESSAGE })
})

test('로그인 성공 뒤 세션 확인 401은 비밀번호 오류가 아니다', () => {
  const loginOk: ApiResult<Member> = { ok: true, status: 200, data: activeUser }
  const confirmed = failure(errorBody(401, 'UNAUTHENTICATED', '로그인이 필요합니다.'))
  assert.equal(loginOk.ok, true)
  const action = decideSessionConfirmation(confirmed)
  assert.deepEqual(action, { type: 'message', message: SESSION_CHECK_FAILED_MESSAGE })
  assert.notEqual(action.type === 'message' ? action.message : '', INVALID_CREDENTIALS_MESSAGE)
})

test('세션 확인의 403 REJECTED는 로그인 요청의 403 CSRF와 다른 결과다', () => {
  const loginCsrf = decideLoginRequest(failure(errorBody(403, 'CSRF', 'CSRF 토큰이 유효하지 않습니다.')))
  const sessionRejected = decideSessionConfirmation(
    failure(errorBody(403, 'REJECTED', '가입 신청이 거절되었습니다.', 'REJECTED')),
  )
  assert.deepEqual(loginCsrf, { type: 'message', message: CSRF_MESSAGE })
  assert.equal(sessionRejected.type, 'restricted')
})

test('세션 확인이 성공하면 회원 상태와 역할로 이동한다', () => {
  const action = decideSessionConfirmation({ ok: true, status: 200, data: activeUser })
  assert.deepEqual(action, { type: 'navigate', path: '/consultation?mode=new' })
})
