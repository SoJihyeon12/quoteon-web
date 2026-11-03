import type { ApiResult } from './api/types.ts'
import { quoteErrorMessage } from './quoteList.ts'

export const QUOTE_EMAIL_HISTORY_LOADING = '발송 이력을 불러오는 중입니다.'
export const QUOTE_EMAIL_HISTORY_EMPTY = '발송 이력이 없습니다.'
export const QUOTE_EMAIL_HISTORY_FAILED = '이메일 발송 이력을 불러오지 못했습니다.'
export const QUOTE_EMAIL_SENDING = '이메일을 전송하는 중입니다.'
export const QUOTE_EMAIL_SEND_FAILED = '이메일을 전송하지 못했습니다.'
export const QUOTE_EMAIL_RECIPIENT_REQUIRED = '수신 이메일을 입력해 주세요.'
export const QUOTE_EMAIL_RECIPIENT_INVALID = '이메일 형식을 확인해 주세요.'
export const QUOTE_EMAIL_RECIPIENT_TOO_LONG = '이메일은 255자 이하로 입력해 주세요.'
export const QUOTE_EMAIL_SUBJECT_TOO_LONG = '이메일 제목은 255자 이하로 입력해 주세요.'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type QuoteEmailHistory = {
  id: number
  recipientEmail: string
  subject: string | null
  status: string
  sentAt: string | null
  failureReason: string | null
  createdAt: string
}

export type QuoteEmailHistoryList = {
  items: QuoteEmailHistory[]
}

export type QuoteEmailRequest = {
  recipient: string
  subject: string
  content: string
}

export type QuoteEmailResult = {
  quoteId: number
  status: string
}

export function quoteEmailHistoriesPath(quoteId: number) {
  return `/api/quotes/${quoteId}/email/histories`
}

export function quoteEmailSendPath(quoteId: number) {
  return `/api/quotes/${quoteId}/email`
}

export function quoteEmailRetryPath(quoteId: number, historyId: number) {
  return `/api/quotes/${quoteId}/email/histories/${historyId}/retry`
}

export function isQuoteEmailHistoryList(value: QuoteEmailHistoryList | undefined): value is QuoteEmailHistoryList {
  return Boolean(value && Array.isArray(value.items))
}

export function isQuoteEmailResult(value: QuoteEmailResult | undefined): value is QuoteEmailResult {
  return Boolean(value && typeof value.quoteId === 'number' && typeof value.status === 'string')
}

export function quoteEmailHistoryIds(items: QuoteEmailHistory[]) {
  return items.map((item) => item.id)
}

export function quoteEmailStatusLabel(status: string) {
  if (status === 'SUCCESS') {
    return '성공'
  }
  if (status === 'FAILED') {
    return '실패'
  }
  return status
}

export function canRetryQuoteEmail(status: string) {
  return status === 'FAILED'
}

export function formatQuoteEmailTime(value: string | null) {
  if (!value) {
    return ''
  }
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
  if (!match) {
    return value
  }
  return `${match[1]} ${match[2]}`
}

export function quoteEmailAttemptAt(history: Pick<QuoteEmailHistory, 'sentAt' | 'createdAt'>) {
  return formatQuoteEmailTime(history.sentAt ?? history.createdAt)
}

export function quoteEmailFailureReason(history: Pick<QuoteEmailHistory, 'failureReason'>) {
  const reason = history.failureReason?.trim() ?? ''
  return reason || null
}

export function quoteEmailRetryDraft(history: Pick<QuoteEmailHistory, 'recipientEmail' | 'subject'>) {
  return {
    recipient: history.recipientEmail,
    subject: history.subject ?? '',
    content: '',
  }
}

export function quoteEmailFieldError(values: QuoteEmailRequest) {
  const recipient = values.recipient.trim()
  const subject = values.subject.trim()
  if (!recipient) {
    return QUOTE_EMAIL_RECIPIENT_REQUIRED
  }
  if (recipient.length > 255) {
    return QUOTE_EMAIL_RECIPIENT_TOO_LONG
  }
  if (!EMAIL_PATTERN.test(recipient)) {
    return QUOTE_EMAIL_RECIPIENT_INVALID
  }
  if (subject.length > 255) {
    return QUOTE_EMAIL_SUBJECT_TOO_LONG
  }
  return ''
}

export function quoteEmailRequestBody(values: QuoteEmailRequest): QuoteEmailRequest {
  return {
    recipient: values.recipient.trim(),
    subject: values.subject.trim(),
    content: values.content.trim(),
  }
}

export function canStartQuoteEmailSend(sending: boolean) {
  return !sending
}

export function quoteEmailHistoryError(result: ApiResult<unknown>) {
  return quoteErrorMessage(result, QUOTE_EMAIL_HISTORY_FAILED)
}

export function quoteEmailSendError(result: ApiResult<unknown>) {
  return quoteErrorMessage(result, QUOTE_EMAIL_SEND_FAILED)
}
