import type { SignupAccountType, SignupBody } from './api/auth.ts'
import type { ApiResult, Member } from './api/types.ts'
import { CSRF_MESSAGE, CONNECTION_MESSAGE } from './loginDecision.ts'
import { pathForMember } from './navigation.ts'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const ACCOUNT_TYPE_REQUIRED = '가입 구분을 선택해 주세요.'
export const NAME_REQUIRED = '이름을 입력해 주세요.'
export const NAME_TOO_LONG = '이름은 100자 이하로 입력해 주세요.'
export const EMAIL_REQUIRED = '이메일을 입력해 주세요.'
export const EMAIL_INVALID = '이메일 형식을 확인해 주세요.'
export const EMAIL_TOO_LONG = '이메일은 255자 이하로 입력해 주세요.'
export const PASSWORD_REQUIRED = '비밀번호를 입력해 주세요.'
export const PASSWORD_TOO_LONG = '비밀번호는 72자 이하로 입력해 주세요.'
export const PASSWORD_MISMATCH = '비밀번호가 일치하지 않습니다.'
export const PHONE_TOO_LONG = '휴대폰 번호는 20자 이하로 입력해 주세요.'
export const COMPANY_TOO_LONG = '회사명은 255자 이하로 입력해 주세요.'
export const DUPLICATE_EMAIL_MESSAGE = '이미 가입된 이메일입니다.'

export type SignupFormValues = {
  accountType: SignupAccountType | ''
  name: string
  email: string
  password: string
  passwordConfirm: string
  phone: string
  companyName: string
}

export type SignupFieldErrors = {
  accountType?: string
  name?: string
  email?: string
  password?: string
  passwordConfirm?: string
  phone?: string
  companyName?: string
}

export type SignupUiAction =
  | { type: 'fields'; errors: SignupFieldErrors }
  | { type: 'message'; message: string }
  | { type: 'navigate'; path: string }

export function validateSignup(values: SignupFormValues): SignupFieldErrors {
  const errors: SignupFieldErrors = {}
  const name = values.name.trim()
  const email = values.email.trim()
  const phone = values.phone.trim()
  const companyName = values.companyName.trim()

  if (values.accountType !== 'SALES' && values.accountType !== 'ADMIN') {
    errors.accountType = ACCOUNT_TYPE_REQUIRED
  }
  if (!name) {
    errors.name = NAME_REQUIRED
  } else if (name.length > 100) {
    errors.name = NAME_TOO_LONG
  }
  if (!email) {
    errors.email = EMAIL_REQUIRED
  } else if (email.length > 255) {
    errors.email = EMAIL_TOO_LONG
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = EMAIL_INVALID
  }
  if (!values.password) {
    errors.password = PASSWORD_REQUIRED
  } else if (values.password.length > 72) {
    errors.password = PASSWORD_TOO_LONG
  }
  if (values.password && values.password !== values.passwordConfirm) {
    errors.passwordConfirm = PASSWORD_MISMATCH
  }
  if (phone.length > 20) {
    errors.phone = PHONE_TOO_LONG
  }
  if (companyName.length > 255) {
    errors.companyName = COMPANY_TOO_LONG
  }
  return errors
}

export function buildSignupBody(values: SignupFormValues): SignupBody | null {
  if (values.accountType !== 'SALES' && values.accountType !== 'ADMIN') {
    return null
  }
  const phone = values.phone.trim()
  const companyName = values.companyName.trim()
  return {
    accountType: values.accountType,
    name: values.name.trim(),
    email: values.email.trim(),
    password: values.password,
    phone: phone ? phone : null,
    companyName: companyName ? companyName : null,
  }
}

export function decideSignupResult(result: ApiResult<Member>): SignupUiAction {
  if (result.ok) {
    const path = pathForMember(result.data)
    if (result.data.status === 'PENDING' || path === '/signup/pending') {
      return { type: 'navigate', path: '/signup/pending' }
    }
    if (path) {
      return { type: 'navigate', path }
    }
    return { type: 'message', message: '가입 결과를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.' }
  }
  if (result.status === 409 && result.error?.code === 'EMAIL_ALREADY_EXISTS') {
    return {
      type: 'fields',
      errors: { email: result.error.message || DUPLICATE_EMAIL_MESSAGE },
    }
  }
  if (result.status === 400 && result.error?.code === 'VALIDATION_ERROR') {
    return { type: 'message', message: result.error.message || '요청 값을 확인해 주세요.' }
  }
  if (result.status === 403 && result.error?.code === 'CSRF') {
    return { type: 'message', message: CSRF_MESSAGE }
  }
  if (result.status === 0) {
    return { type: 'message', message: CONNECTION_MESSAGE }
  }
  if (result.error?.message) {
    return { type: 'message', message: result.error.message }
  }
  return { type: 'message', message: '회원가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}
