import type { ApiError, ApiResult } from './types.ts'

const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-XSRF-TOKEN'
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readCookie(name: string) {
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(prefix)) {
      continue
    }
    const raw = trimmed.slice(prefix.length)
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return null
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.status === 'number' && typeof record.code === 'string' && typeof record.message === 'string'
}

export async function ensureCsrfCookie() {
  if (readCookie(CSRF_COOKIE)) {
    return
  }
  await fetch('/api/me', {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (MUTATING.has(method)) {
    await ensureCsrfCookie()
    const token = readCookie(CSRF_COOKIE)
    if (token) {
      headers.set(CSRF_HEADER, token)
    }
    if (init.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      method,
      headers,
      credentials: 'same-origin',
    })
  } catch {
    return { ok: false, status: 0, error: null }
  }

  if (response.status === 204) {
    return { ok: true, status: 204, data: undefined as T }
  }

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      return { ok: false, status: response.status, error: null }
    }
  }
  if (!response.ok) {
    return { ok: false, status: response.status, error: isApiError(body) ? body : null }
  }
  return { ok: true, status: response.status, data: body as T }
}
