import { apiRequest, ensureCsrfCookie } from './client.ts'
import type { ApiError, Member } from './types.ts'

const RESTRICTION_KEY = 'quoteon.accessRestriction'

export type AccessRestriction = {
  message: string
  memberStatus: string | null
  name: string | null
  email: string | null
  companyName: string | null
}

export async function fetchCurrentMember() {
  await ensureCsrfCookie()
  return apiRequest<Member>('/api/me')
}

export async function login(email: string, password: string) {
  return apiRequest<Member>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export type SignupAccountType = 'SALES' | 'ADMIN'

export type SignupBody = {
  accountType: SignupAccountType
  name: string
  email: string
  password: string
  phone: string | null
  companyName: string | null
}

export async function signup(body: SignupBody) {
  return apiRequest<Member>('/api/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function logout() {
  return apiRequest<void>('/api/logout', { method: 'POST' })
}

export function saveRestriction(error: ApiError) {
  const value: AccessRestriction = {
    message: error.message,
    memberStatus: error.memberStatus,
    name: error.name,
    email: error.email,
    companyName: error.companyName,
  }
  sessionStorage.setItem(RESTRICTION_KEY, JSON.stringify(value))
}

export function readRestriction(): AccessRestriction | null {
  const raw = sessionStorage.getItem(RESTRICTION_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || !('message' in parsed)) {
      return null
    }
    return parsed as AccessRestriction
  } catch {
    return null
  }
}
