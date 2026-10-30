import type { ApiResult } from './api/types.ts'
import { ADMIN_MEMBERS_PATH } from './adminMenu.ts'
import { adminErrorMessage, type MemberSummary } from './adminMemberList.ts'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MEMBER_NAME_REQUIRED = '이름을 입력해 주세요.'
export const MEMBER_NAME_TOO_LONG = '이름은 100자 이하로 입력해 주세요.'
export const MEMBER_EMAIL_REQUIRED = '이메일을 입력해 주세요.'
export const MEMBER_EMAIL_INVALID = '이메일 형식을 확인해 주세요.'
export const MEMBER_EMAIL_TOO_LONG = '이메일은 255자 이하로 입력해 주세요.'
export const MEMBER_PHONE_TOO_LONG = '휴대폰 번호는 20자 이하로 입력해 주세요.'
export const MEMBER_COMPANY_TOO_LONG = '회사명은 255자 이하로 입력해 주세요.'
export const MEMBER_ROLE_INVALID = '권한은 영업사원 또는 관리자만 선택할 수 있습니다.'
export const MEMBER_DUPLICATE_EMAIL = '이미 가입된 이메일입니다.'
export const MEMBER_NOT_FOUND = '회원을 찾을 수 없습니다.'
export const MEMBER_SAVE_FAILED = '회원 정보를 저장하지 못했습니다.'

export const MEMBER_ROLE_OPTIONS = [
  { value: 'ROLE_USER', label: '영업사원' },
  { value: 'ROLE_ADMIN', label: '관리자' },
] as const

export type MemberEditValues = {
  name: string
  email: string
  phone: string
  companyName: string
  role: string
}

export type MemberEditErrors = {
  name?: string
  email?: string
  phone?: string
  companyName?: string
  role?: string
}

export type MemberUpdateBody = {
  name: string
  email: string
  phone: string | null
  companyName: string | null
  role: string
}

export type MemberEditSaveResult =
  | { type: 'navigate'; path: string }
  | { type: 'email'; message: string }
  | { type: 'message'; message: string }

export function validateMemberEdit(values: MemberEditValues): MemberEditErrors {
  const errors: MemberEditErrors = {}
  const name = values.name.trim()
  const email = values.email.trim()
  const phone = values.phone.trim()
  const companyName = values.companyName.trim()

  if (!name) {
    errors.name = MEMBER_NAME_REQUIRED
  } else if (name.length > 100) {
    errors.name = MEMBER_NAME_TOO_LONG
  }
  if (!email) {
    errors.email = MEMBER_EMAIL_REQUIRED
  } else if (email.length > 255) {
    errors.email = MEMBER_EMAIL_TOO_LONG
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = MEMBER_EMAIL_INVALID
  }
  if (phone.length > 20) {
    errors.phone = MEMBER_PHONE_TOO_LONG
  }
  if (companyName.length > 255) {
    errors.companyName = MEMBER_COMPANY_TOO_LONG
  }
  if (values.role !== 'ROLE_USER' && values.role !== 'ROLE_ADMIN') {
    errors.role = MEMBER_ROLE_INVALID
  }
  return errors
}

export function buildMemberUpdateBody(values: MemberEditValues): MemberUpdateBody | null {
  if (Object.keys(validateMemberEdit(values)).length > 0) {
    return null
  }
  const phone = values.phone.trim()
  const companyName = values.companyName.trim()
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: phone ? phone : null,
    companyName: companyName ? companyName : null,
    role: values.role,
  }
}

export function canSubmitMemberEdit(saving: boolean) {
  return !saving
}

export const MEMBER_DEACTIVATE_TITLE = '사용자 비활성화'
export const MEMBER_DEACTIVATE_NOTE = '비활성화 시 로그인할 수 없습니다.'
export const MEMBER_DEACTIVATE_MESSAGE =
  '비활성화하면 로그인과 신규 견적 작성이 제한됩니다. 기존 고객과 견적 데이터는 유지됩니다.'
export const MEMBER_DEACTIVATE_CANCEL = '취소'
export const MEMBER_DEACTIVATE_CONFIRM = '비활성화'
export const MEMBER_DEACTIVATE_BLOCKED = '활성 회원만 비활성화할 수 있습니다.'
export const MEMBER_DEACTIVATE_FAILED = '회원을 비활성화하지 못했습니다.'

export function canDeactivateMember(status: string) {
  return status === 'ACTIVE'
}

export function canConfirmMemberDeactivate(confirmOpen: boolean, submitting: boolean, status: string) {
  return confirmOpen && !submitting && canDeactivateMember(status)
}

export function memberDeactivateOutcome(result: ApiResult<MemberSummary>) {
  if (result.ok) {
    return { path: ADMIN_MEMBERS_PATH, message: '' }
  }
  return {
    path: null,
    message: adminErrorMessage(result, MEMBER_DEACTIVATE_FAILED),
  }
}

export function memberEditSaveResult(result: ApiResult<MemberSummary>): MemberEditSaveResult {
  if (result.ok) {
    return { type: 'navigate', path: ADMIN_MEMBERS_PATH }
  }
  if (result.status === 409 && result.error?.code === 'EMAIL_ALREADY_EXISTS') {
    return { type: 'email', message: result.error.message || MEMBER_DUPLICATE_EMAIL }
  }
  if (result.status === 404) {
    return { type: 'message', message: result.error?.message || MEMBER_NOT_FOUND }
  }
  return { type: 'message', message: adminErrorMessage(result, MEMBER_SAVE_FAILED) }
}
