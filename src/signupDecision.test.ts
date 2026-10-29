import assert from 'node:assert/strict'
import test from 'node:test'
import type { ApiResult, Member } from './api/types.ts'
import { CSRF_MESSAGE, CONNECTION_MESSAGE } from './loginDecision.ts'
import {
  DUPLICATE_EMAIL_MESSAGE,
  EMAIL_INVALID,
  NAME_REQUIRED,
  PASSWORD_MISMATCH,
  PHONE_TOO_LONG,
  buildSignupBody,
  decideSignupResult,
  validateSignup,
  type SignupFormValues,
} from './signupDecision.ts'

const blank: SignupFormValues = {
  accountType: 'SALES',
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  phone: '',
  companyName: '',
}

function member(status: string, role = 'ROLE_USER'): Member {
  return {
    id: 1,
    email: 'sales@quoteon.test',
    name: '영업',
    phone: null,
    companyName: 'QuoteOn',
    role,
    status,
  }
}

test('필수값이 없으면 백엔드 검증 문구로 막는다', () => {
  const errors = validateSignup(blank)
  assert.equal(errors.name, NAME_REQUIRED)
  assert.equal(errors.email, '이메일을 입력해 주세요.')
  assert.equal(errors.password, '비밀번호를 입력해 주세요.')
})

test('비밀번호 확인이 다르면 요청 본문을 만들지 않는다', () => {
  const values: SignupFormValues = {
    ...blank,
    name: '김영업',
    email: 'sales@quoteon.test',
    password: 'password1234',
    passwordConfirm: 'password12345',
  }
  assert.equal(validateSignup(values).passwordConfirm, PASSWORD_MISMATCH)
  assert.equal(validateSignup({ ...values, email: 'not-an-email' }).email, EMAIL_INVALID)
})

test('가입 요청에는 API 필드만 담고 비밀번호 확인은 빼 둔다', () => {
  const body = buildSignupBody({
    ...blank,
    name: ' 김영업 ',
    email: ' sales@quoteon.test ',
    password: 'password1234',
    passwordConfirm: 'password1234',
    phone: '   ',
    companyName: ' 리크온 ',
  })
  assert.deepEqual(body, {
    accountType: 'SALES',
    name: '김영업',
    email: 'sales@quoteon.test',
    password: 'password1234',
    phone: null,
    companyName: '리크온',
  })
  assert.equal(body && 'passwordConfirm' in body, false)
})

test('휴대폰이 20자를 넘으면 서버로 보내지 않을 오류를 만든다', () => {
  assert.equal(validateSignup({ ...blank, phone: '1'.repeat(21) }).phone, PHONE_TOO_LONG)
})

test('201 PENDING 응답은 승인 대기 화면으로 이동한다', () => {
  const result: ApiResult<Member> = { ok: true, status: 201, data: member('PENDING') }
  assert.deepEqual(decideSignupResult(result), { type: 'navigate', path: '/signup/pending' })
})

test('409 이메일 중복은 입력값 검증이나 서버 장애와 구분한다', () => {
  const duplicate = decideSignupResult({
    ok: false,
    status: 409,
    error: {
      status: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: DUPLICATE_EMAIL_MESSAGE,
      memberStatus: null,
      name: null,
      email: null,
      companyName: null,
    },
  })
  const validation = decideSignupResult({
    ok: false,
    status: 400,
    error: {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '이메일 형식을 확인해 주세요.',
      memberStatus: null,
      name: null,
      email: null,
      companyName: null,
    },
  })
  const server = decideSignupResult({
    ok: false,
    status: 500,
    error: {
      status: 500,
      code: 'DATA_ACCESS_ERROR',
      message: '데이터를 조회하지 못했습니다.',
      memberStatus: null,
      name: null,
      email: null,
      companyName: null,
    },
  })
  const csrf = decideSignupResult({
    ok: false,
    status: 403,
    error: {
      status: 403,
      code: 'CSRF',
      message: 'CSRF 토큰이 유효하지 않습니다.',
      memberStatus: null,
      name: null,
      email: null,
      companyName: null,
    },
  })
  const offline = decideSignupResult({ ok: false, status: 0, error: null })

  assert.deepEqual(duplicate, { type: 'fields', errors: { email: DUPLICATE_EMAIL_MESSAGE } })
  assert.deepEqual(validation, { type: 'message', message: '이메일 형식을 확인해 주세요.' })
  assert.deepEqual(server, { type: 'message', message: '데이터를 조회하지 못했습니다.' })
  assert.deepEqual(csrf, { type: 'message', message: CSRF_MESSAGE })
  assert.deepEqual(offline, { type: 'message', message: CONNECTION_MESSAGE })
})
