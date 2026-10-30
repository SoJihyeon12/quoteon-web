import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE } from './loginDecision.ts'
import {
  consultationCustomerId,
  customerErrorMessage,
  customerSummaryFromDetail,
  customerDeactivatePath,
  customerDetailPath,
  customerEditPath,
  customerRecordRoute,
  customersPath,
  displayPhone,
  quoteFromCustomerPath,
} from './customerList.ts'

test('고객 목록 요청은 전체 조회와 유형, 키워드를 구분한다', () => {
  assert.equal(customersPath(0, 20, ''), '/api/customers?page=0&size=20')
  assert.equal(customersPath(1, 20, '  홍길동  '), '/api/customers?page=1&size=20&keyword=%ED%99%8D%EA%B8%B8%EB%8F%99')
  assert.equal(customersPath(0, 20, '', '개인'), '/api/customers?page=0&size=20&customerType=%EA%B0%9C%EC%9D%B8')
  assert.equal(
    customersPath(1, 20, ' 홍길동 ', '기업'),
    '/api/customers?page=1&size=20&keyword=%ED%99%8D%EA%B8%B8%EB%8F%99&customerType=%EA%B8%B0%EC%97%85',
  )
  assert.equal(customersPath(0, 20, '홍길동', ''), '/api/customers?page=0&size=20&keyword=%ED%99%8D%EA%B8%B8%EB%8F%99')
})

test('연락처가 없으면 대시를 표시한다', () => {
  assert.equal(displayPhone(null), '-')
  assert.equal(displayPhone('  '), '-')
  assert.equal(displayPhone('01011112222'), '01011112222')
})

test('고객 상세와 수정 경로는 고객 번호로 구분한다', () => {
  assert.equal(customerDetailPath(12), '/customers/12')
  assert.equal(customerEditPath(12), '/customers/12/edit')
  assert.deepEqual(customerRecordRoute('/customers/12'), { customerId: 12, editing: false })
  assert.deepEqual(customerRecordRoute('/customers/12/edit'), { customerId: 12, editing: true })
  assert.equal(customerRecordRoute('/customers'), null)
  assert.equal(customerRecordRoute('/customers/new'), null)
  assert.equal(customerRecordRoute('/customers/0'), null)
})
test('고객 비활성화 요청은 삭제 없이 고객 번호의 비활성화 경로를 쓴다', () => {
  assert.equal(customerDeactivatePath(12), '/api/customers/12/deactivate')
})

test('고객 목록의 견적 시작은 상담 화면에 고객 번호를 전달한다', () => {
  assert.equal(quoteFromCustomerPath(12), '/consultation?mode=new&customerId=12')
  assert.equal(consultationCustomerId('12'), 12)
  assert.equal(consultationCustomerId('0'), null)
  assert.equal(consultationCustomerId('new'), null)
  assert.equal(consultationCustomerId(null), null)
  assert.deepEqual(
    customerSummaryFromDetail({
      id: 12,
      name: '김진주',
      phone: '01011112222',
      customerType: '기업',
    }),
    { id: 12, name: '김진주', phone: '01011112222', customerType: '기업' },
  )
  assert.equal(
    customerSummaryFromDetail({
      id: 3,
      name: '기존 고객',
      phone: null,
      customerType: 'COMPANY',
    }).customerType,
    'COMPANY',
  )
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
  assert.equal(
    customerErrorMessage(
      {
        ok: false,
        status: 404,
        error: {
          status: 404,
          code: 'CUSTOMER_NOT_FOUND',
          message: '고객을 찾을 수 없습니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '고객을 찾을 수 없습니다.',
  )
})
