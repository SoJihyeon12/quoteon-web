export const CUSTOMER_TYPES = ['COMPANY', 'BUSINESS'] as const

export type CustomerTypeCode = (typeof CUSTOMER_TYPES)[number]

export type CreateCustomerBody = {
  name: string
  customerType: CustomerTypeCode
  phone?: string
  email?: string
  address?: string
  memo?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function buildCreateCustomerBody(input: {
  name: string
  customerType: string
  phone: string
  email: string
  address: string
  memo: string
}): { ok: true; body: CreateCustomerBody } | { ok: false; message: string } {
  const name = input.name.trim()
  if (!name) {
    return { ok: false, message: '고객명을 입력해 주세요.' }
  }
  if (name.length > 100) {
    return { ok: false, message: '고객명은 100자 이하로 입력해 주세요.' }
  }
  if (!isCustomerType(input.customerType)) {
    return { ok: false, message: '고객 유형을 선택해 주세요.' }
  }

  const phone = input.phone.trim()
  if (phone.length > 20) {
    return { ok: false, message: '연락처는 20자 이하로 입력해 주세요.' }
  }
  const email = input.email.trim()
  if (email.length > 255) {
    return { ok: false, message: '이메일은 255자 이하로 입력해 주세요.' }
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    return { ok: false, message: '이메일 형식을 확인해 주세요.' }
  }
  const address = input.address.trim()
  if (address.length > 500) {
    return { ok: false, message: '주소는 500자 이하로 입력해 주세요.' }
  }

  const body: CreateCustomerBody = { name, customerType: input.customerType }
  if (phone) {
    body.phone = phone
  }
  if (email) {
    body.email = email
  }
  if (address) {
    body.address = address
  }
  const memo = input.memo.trim()
  if (memo) {
    body.memo = memo
  }
  return { ok: true, body }
}

function isCustomerType(value: string): value is CustomerTypeCode {
  return CUSTOMER_TYPES.some((type) => type === value)
}
