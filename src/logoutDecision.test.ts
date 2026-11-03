import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldCompleteClientLogout } from './logoutDecision.ts'

test('정상 로그아웃과 세션 없음·CSRF·연결 실패는 클라이언트 로그아웃을 끝낸다', () => {
  assert.equal(shouldCompleteClientLogout({ ok: true, status: 204, data: undefined }), true)
  assert.equal(shouldCompleteClientLogout({ ok: false, status: 401, error: null }), true)
  assert.equal(
    shouldCompleteClientLogout({
      ok: false,
      status: 403,
      error: { status: 403, code: 'CSRF', message: 'CSRF 토큰이 유효하지 않습니다.' },
    }),
    true,
  )
  assert.equal(
    shouldCompleteClientLogout({
      ok: false,
      status: 403,
      error: { status: 403, code: 'INACTIVE', message: '이용이 제한되었습니다.' },
    }),
    true,
  )
  assert.equal(shouldCompleteClientLogout({ ok: false, status: 0, error: null }), true)
})

test('그 외 서버 오류는 로그아웃 확인 화면에 남겨 재시도할 수 있게 한다', () => {
  assert.equal(
    shouldCompleteClientLogout({
      ok: false,
      status: 500,
      error: { status: 500, code: 'SERVER_ERROR', message: '서버 오류' },
    }),
    false,
  )
})
