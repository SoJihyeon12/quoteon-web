import assert from 'node:assert/strict'
import test from 'node:test'
import { quoteErrorMessage, quoteIdFromViewPath, quoteViewPath } from './quoteList.ts'

test('견적서 확인 경로는 견적 번호로 /quotes/{id}/view를 만든다', () => {
  assert.equal(quoteViewPath(12), '/quotes/12/view')
  assert.equal(quoteIdFromViewPath('/quotes/12/view'), 12)
  assert.equal(quoteIdFromViewPath('/quotes/my'), null)
  assert.equal(quoteIdFromViewPath('/quotes/new'), null)
  assert.equal(quoteIdFromViewPath('/quotes/0/view'), null)
  assert.equal(quoteIdFromViewPath('/quotes/12'), null)
})

test('견적서 확인 오류는 없는 견적과 권한 거절 문구를 그대로 보여 준다', () => {
  assert.equal(
    quoteErrorMessage(
      {
        ok: false,
        status: 404,
        error: {
          status: 404,
          code: 'QUOTE_NOT_FOUND',
          message: '견적서를 찾을 수 없습니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '견적서를 찾을 수 없습니다.',
  )
  assert.equal(
    quoteErrorMessage(
      {
        ok: false,
        status: 403,
        error: {
          status: 403,
          code: 'QUOTE_ACCESS_DENIED',
          message: '본인의 견적서만 조회하거나 수정할 수 있습니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '본인의 견적서만 조회하거나 수정할 수 있습니다.',
  )
})
