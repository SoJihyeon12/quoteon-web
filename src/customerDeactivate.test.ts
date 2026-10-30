import assert from 'node:assert/strict'
import test from 'node:test'
import { deactivateCustomer } from './api/customers.ts'
import type { ApiError } from './api/types.ts'
import {
  CUSTOMER_DEACTIVATE_MESSAGE,
  CUSTOMER_LIST_PATH,
  canConfirmDeactivate,
  deactivateOutcome,
} from './customerDeactivate.ts'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'

function failure(status: number, code: string, message: string) {
  const error: ApiError = {
    status,
    code,
    message,
    memberStatus: null,
    name: null,
    email: null,
    companyName: null,
  }
  return { ok: false as const, status, error }
}

test('고객 상세 화면이 부르는 비활성화 함수가 내보내져 있다', () => {
  assert.equal(typeof deactivateCustomer, 'function')
})

test('확인 팝업이 열려 있고 요청 중이 아닐 때만 비활성화를 호출한다', () => {
  assert.equal(canConfirmDeactivate(false, false), false)
  assert.equal(canConfirmDeactivate(true, false), true)
  assert.equal(canConfirmDeactivate(true, true), false)
})

test('비활성화 성공 시에만 고객 목록으로 이동한다', () => {
  assert.equal(deactivateOutcome({ ok: true, status: 200, data: { id: 12 } }).path, CUSTOMER_LIST_PATH)
  assert.equal(CUSTOMER_LIST_PATH, '/customers')
})

test('비활성화 실패는 서버 문구를 남기고 목록으로 이동하지 않는다', () => {
  assert.match(CUSTOMER_DEACTIVATE_MESSAGE, /계속하시겠습니까/)
  const denied = deactivateOutcome(
    failure(403, 'CUSTOMER_ACCESS_DENIED', '본인의 고객만 견적에 사용할 수 있습니다.'),
  )
  assert.equal(denied.path, null)
  assert.equal(denied.message, '본인의 고객만 견적에 사용할 수 있습니다.')

  const missing = deactivateOutcome(failure(404, 'CUSTOMER_NOT_FOUND', '고객을 찾을 수 없습니다.'))
  assert.equal(missing.path, null)
  assert.equal(missing.message, '고객을 찾을 수 없습니다.')

  const inactive = deactivateOutcome(
    failure(409, 'CUSTOMER_ALREADY_INACTIVE', '활성 고객만 비활성화할 수 있습니다.'),
  )
  assert.equal(inactive.path, null)
  assert.equal(inactive.message, '활성 고객만 비활성화할 수 있습니다.')

  const csrf = deactivateOutcome(failure(403, 'CSRF', 'CSRF 토큰이 유효하지 않습니다.'))
  assert.equal(csrf.path, null)
  assert.equal(csrf.message, CSRF_MESSAGE)

  const offline = deactivateOutcome({ ok: false, status: 0, error: null })
  assert.equal(offline.path, null)
  assert.equal(offline.message, CONNECTION_MESSAGE)

  const unknown = deactivateOutcome({ ok: false, status: 500, error: null })
  assert.equal(unknown.path, null)
  assert.equal(unknown.message, '고객을 비활성화하지 못했습니다.')
})
