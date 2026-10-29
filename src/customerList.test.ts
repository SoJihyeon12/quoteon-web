import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE } from './loginDecision.ts'
import { customerErrorMessage, customersPath, displayPhone } from './customerList.ts'

test('고객 목록 요청은 page, size, keyword를 쿼리로 붙인다', () => {
  assert.equal(customersPath(0, 20, ''), '/api/customers?page=0&size=20')
  assert.equal(customersPath(1, 20, '  홍길동  '), '/api/customers?page=1&size=20&keyword=%ED%99%8D%EA%B8%B8%EB%8F%99')
})

test('연락처가 없으면 대시를 표시한다', () => {
  assert.equal(displayPhone(null), '-')
  assert.equal(displayPhone('  '), '-')
  assert.equal(displayPhone('01011112222'), '01011112222')
})

test('고객 목록 오류는 연결 실패와 서버 문구를 구분한다', () => {
  assert.equal(customerErrorMessage({ ok: false, status: 0, error: null }, '실패'), CONNECTION_MESSAGE)
  assert.equal(
    customerErrorMessage(
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
