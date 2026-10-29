import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCreateCustomerBody } from './customerForm.ts'

test('고객 등록 본문은 입력 항목만 담고 빈 선택 항목은 빼 둔다', () => {
  const result = buildCreateCustomerBody({
    name: ' 홍길동 ',
    customerType: '개인',
    phone: ' 01011112222 ',
    email: ' hong@example.com ',
    address: ' 서울시 ',
    memo: ' 첫 상담 ',
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.body, {
      name: '홍길동',
      customerType: '개인',
      phone: '01011112222',
      email: 'hong@example.com',
      address: '서울시',
      memo: '첫 상담',
    })
    assert.equal('memberId' in result.body, false)
    assert.equal('status' in result.body, false)
  }
})

test('연락처와 이메일이 없으면 고객명과 유형만 보낸다', () => {
  const result = buildCreateCustomerBody({
    name: '김철수',
    customerType: '기업',
    phone: ' ',
    email: '',
    address: '',
    memo: '',
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.body, { name: '김철수', customerType: '기업' })
  }
})

test('고객명, 유형, 이메일 형식은 저장 전에 거른다', () => {
  assert.equal(
    buildCreateCustomerBody({
      name: ' ',
      customerType: '개인',
      phone: '',
      email: '',
      address: '',
      memo: '',
    }).ok,
    false,
  )
  const missingType = buildCreateCustomerBody({
    name: '홍길동',
    customerType: '',
    phone: '',
    email: '',
    address: '',
    memo: '',
  })
  assert.equal(missingType.ok, false)
  if (!missingType.ok) {
    assert.equal(missingType.message, '고객 유형을 선택해 주세요.')
  }
  const email = buildCreateCustomerBody({
    name: '홍길동',
    customerType: '개인',
    phone: '',
    email: 'not-an-email',
    address: '',
    memo: '',
  })
  assert.equal(email.ok, false)
  if (!email.ok) {
    assert.equal(email.message, '이메일 형식을 확인해 주세요.')
  }
  const rejected = buildCreateCustomerBody({
    name: '홍길동',
    customerType: 'COMPANY',
    phone: '',
    email: '',
    address: '',
    memo: '',
  })
  assert.equal(rejected.ok, false)
  if (!rejected.ok) {
    assert.equal(rejected.message, '고객 유형은 개인 또는 기업만 선택할 수 있습니다.')
  }
})
