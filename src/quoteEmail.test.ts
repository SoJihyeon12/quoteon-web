import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'
import { fetchQuoteEmailHistories, retryQuoteEmail, sendQuoteEmail } from './api/quotes.ts'
import { salesQuoteDownloadPath } from './quoteDownload.ts'
import {
  QUOTE_EMAIL_HISTORY_EMPTY,
  QUOTE_EMAIL_HISTORY_LOADING,
  canRetryQuoteEmail,
  canStartQuoteEmailSend,
  formatQuoteEmailTime,
  quoteEmailAttemptAt,
  quoteEmailFailureReason,
  quoteEmailFieldError,
  quoteEmailHistoriesPath,
  quoteEmailHistoryError,
  quoteEmailHistoryIds,
  quoteEmailRequestBody,
  quoteEmailRetryDraft,
  quoteEmailRetryPath,
  quoteEmailSendError,
  quoteEmailSendPath,
  quoteEmailStatusLabel,
  type QuoteEmailHistory,
} from './quoteEmail.ts'

const failed: QuoteEmailHistory = {
  id: 18,
  recipientEmail: 'client@example.com',
  subject: '신발장 견적서',
  status: 'FAILED',
  sentAt: null,
  failureReason: 'smtp down',
  createdAt: '2026-11-02T10:00:00',
}

const sent: QuoteEmailHistory = {
  id: 19,
  recipientEmail: 'client@example.com',
  subject: '신발장 견적서',
  status: 'SUCCESS',
  sentAt: '2026-10-18T14:20:00',
  failureReason: null,
  createdAt: '2026-10-18T14:19:00',
}

test('이메일 발송 이력과 재시도는 견적 번호의 API를 호출한다', () => {
  assert.equal(quoteEmailHistoriesPath(12), '/api/quotes/12/email/histories')
  assert.equal(quoteEmailSendPath(12), '/api/quotes/12/email')
  assert.equal(quoteEmailRetryPath(12, 18), '/api/quotes/12/email/histories/18/retry')
  assert.equal(typeof fetchQuoteEmailHistories, 'function')
  assert.equal(typeof sendQuoteEmail, 'function')
  assert.equal(typeof retryQuoteEmail, 'function')
})

test('발송 이력은 응답 순서를 유지하고 없으면 빈 상태다', () => {
  assert.deepEqual(quoteEmailHistoryIds([failed, sent]), [18, 19])
  assert.deepEqual(quoteEmailHistoryIds([]), [])
  assert.equal(QUOTE_EMAIL_HISTORY_EMPTY, '발송 이력이 없습니다.')
  assert.equal(QUOTE_EMAIL_HISTORY_LOADING, '발송 이력을 불러오는 중입니다.')
})

test('성공과 실패 상태, 실패 사유, 시도 시각을 표시한다', () => {
  assert.equal(quoteEmailStatusLabel('SUCCESS'), '성공')
  assert.equal(quoteEmailStatusLabel('FAILED'), '실패')
  assert.equal(quoteEmailFailureReason(failed), 'smtp down')
  assert.equal(quoteEmailFailureReason(sent), null)
  assert.equal(quoteEmailFailureReason({ failureReason: '   ' }), null)
  assert.equal(quoteEmailAttemptAt(sent), '2026-10-18 14:20')
  assert.equal(quoteEmailAttemptAt(failed), '2026-11-02 10:00')
  assert.equal(formatQuoteEmailTime(null), '')
})

test('실패 건만 재시도하고 본문은 복원하지 않는다', () => {
  assert.equal(canRetryQuoteEmail('FAILED'), true)
  assert.equal(canRetryQuoteEmail('SUCCESS'), false)
  assert.deepEqual(quoteEmailRetryDraft(failed), {
    recipient: 'client@example.com',
    subject: '신발장 견적서',
    content: '',
  })
  assert.deepEqual(quoteEmailRetryDraft({ recipientEmail: 'a@b.co', subject: null }), {
    recipient: 'a@b.co',
    subject: '',
    content: '',
  })
  assert.equal(canStartQuoteEmailSend(false), true)
  assert.equal(canStartQuoteEmailSend(true), false)
})

test('이메일 전송 본문은 수신자, 제목, 내용을 담고 형식을 먼저 확인한다', () => {
  assert.deepEqual(
    quoteEmailRequestBody({ recipient: ' retry@example.com ', subject: ' 재전송 ', content: ' 다시 보냅니다. ' }),
    { recipient: 'retry@example.com', subject: '재전송', content: '다시 보냅니다.' },
  )
  assert.equal(quoteEmailFieldError({ recipient: ' ', subject: '', content: '' }), '수신 이메일을 입력해 주세요.')
  assert.equal(
    quoteEmailFieldError({ recipient: 'not-an-email', subject: '', content: '' }),
    '이메일 형식을 확인해 주세요.',
  )
  assert.equal(quoteEmailFieldError({ recipient: 'a@b.co', subject: '제목', content: '' }), '')
})

test('이메일 오류는 401, 403, 404, 409, 500과 검증 오류를 구분한다', () => {
  assert.equal(
    quoteEmailHistoryError({
      ok: false,
      status: 401,
      error: { status: 401, code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' },
    }),
    '로그인이 필요합니다.',
  )
  assert.equal(
    quoteEmailHistoryError({
      ok: false,
      status: 403,
      error: { status: 403, code: 'QUOTE_ACCESS_DENIED', message: '본인의 견적서만 조회하거나 수정할 수 있습니다.' },
    }),
    '본인의 견적서만 조회하거나 수정할 수 있습니다.',
  )
  assert.equal(
    quoteEmailSendError({
      ok: false,
      status: 404,
      error: { status: 404, code: 'QUOTE_NOT_FOUND', message: '견적서를 찾을 수 없습니다.' },
    }),
    '견적서를 찾을 수 없습니다.',
  )
  assert.equal(
    quoteEmailSendError({
      ok: false,
      status: 404,
      error: { status: 404, code: 'EMAIL_HISTORY_NOT_FOUND', message: '이메일 발송 이력을 찾을 수 없습니다.' },
    }),
    '이메일 발송 이력을 찾을 수 없습니다.',
  )
  assert.equal(
    quoteEmailSendError({
      ok: false,
      status: 409,
      error: { status: 409, code: 'EMAIL_RETRY_NOT_ALLOWED', message: '실패한 이메일 발송만 재시도할 수 있습니다.' },
    }),
    '실패한 이메일 발송만 재시도할 수 있습니다.',
  )
  assert.equal(
    quoteEmailSendError({
      ok: false,
      status: 400,
      error: { status: 400, code: 'VALIDATION_ERROR', message: '수신 이메일을 입력해 주세요.' },
    }),
    '수신 이메일을 입력해 주세요.',
  )
  assert.equal(
    quoteEmailSendError({
      ok: false,
      status: 500,
      error: { status: 500, code: 'EMAIL_SEND_FAILED', message: '견적서 이메일을 전송하지 못했습니다.' },
    }),
    '견적서 이메일을 전송하지 못했습니다.',
  )
  assert.equal(
    quoteEmailSendError({
      ok: false,
      status: 500,
      error: { status: 500, code: 'EMAIL_STATUS_NOT_SAVED', message: '이메일은 전송되었지만 견적 상태를 저장하지 못했습니다.' },
    }),
    '이메일은 전송되었지만 견적 상태를 저장하지 못했습니다.',
  )
  assert.equal(
    quoteEmailSendError({
      ok: false,
      status: 500,
      error: { status: 500, code: 'MAIL_NOT_CONFIGURED', message: '메일 발송 설정이 없습니다: host' },
    }),
    '메일 발송 설정이 없습니다: host',
  )
  assert.equal(
    quoteEmailSendError({
      ok: false,
      status: 403,
      error: { status: 403, code: 'CSRF', message: 'ignored' },
    }),
    CSRF_MESSAGE,
  )
  assert.equal(quoteEmailHistoryError({ ok: false, status: 0, error: null }), CONNECTION_MESSAGE)
})

test('견적서 PDF, JPEG, PNG 다운로드 경로는 유지한다', () => {
  assert.equal(salesQuoteDownloadPath(12, 'pdf'), '/api/quotes/12/pdf')
  assert.equal(salesQuoteDownloadPath(12, 'jpeg'), '/api/quotes/12/jpeg')
  assert.equal(salesQuoteDownloadPath(12, 'png'), '/api/quotes/12/png')
})
