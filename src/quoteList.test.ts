import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE } from './loginDecision.ts'
import { formatAmount, quoteErrorMessage, quoteStatusLabel, quotesPath } from './quoteList.ts'

test('견적 목록 요청은 page와 size를 쿼리로 붙인다', () => {
  assert.equal(quotesPath(0, 20), '/api/quotes?page=0&size=20')
  assert.equal(quotesPath(1, 20), '/api/quotes?page=1&size=20')
})

test('견적 상태와 금액은 응답 값을 화면 문구로 바꾼다', () => {
  assert.equal(quoteStatusLabel('DRAFT'), '작성 중')
  assert.equal(quoteStatusLabel('SENT'), '발송 완료')
  assert.equal(quoteStatusLabel('OTHER'), 'OTHER')
  assert.equal(formatAmount(132000), '132,000원')
})

test('견적 목록 오류는 연결 실패와 서버 문구를 구분한다', () => {
  assert.equal(quoteErrorMessage({ ok: false, status: 0, error: null }, '실패'), CONNECTION_MESSAGE)
  assert.equal(
    quoteErrorMessage(
      {
        ok: false,
        status: 400,
        error: {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: '페이지 번호는 0 이상이어야 합니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '페이지 번호는 0 이상이어야 합니다.',
  )
})
