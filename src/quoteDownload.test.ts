import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'
import { downloadQuote } from './api/quotes.ts'
import { canEditStoredQuote, quoteEditPath, quoteRewritePath } from './quoteWorkbench.ts'
import {
  canStartSalesQuoteDownload,
  isJpegFile,
  salesQuoteDownloadError,
  salesQuoteDownloadPath,
  salesQuoteDownloadReady,
  SALES_QUOTE_DOWNLOAD_FAILED,
} from './quoteDownload.ts'

const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const korean = "attachment; filename*=UTF-8''%EA%B2%AC%EC%A0%81%EC%84%9C_Q-1"

test('견적서 다운로드 버튼은 형식별 API를 호출한다', () => {
  assert.equal(salesQuoteDownloadPath(12, 'pdf'), '/api/quotes/12/pdf')
  assert.equal(salesQuoteDownloadPath(12, 'jpeg'), '/api/quotes/12/jpeg')
  assert.equal(salesQuoteDownloadPath(12, 'png'), '/api/quotes/12/png')
  assert.equal(typeof downloadQuote, 'function')
})

test('다운로드 파일은 PDF, JPEG, PNG 확장자를 유지한다', () => {
  assert.deepEqual(
    salesQuoteDownloadReady('pdf', 'application/pdf', `${korean}.pdf`, pdf),
    { filename: '견적서_Q-1.pdf', mediaType: 'application/pdf' },
  )
  assert.deepEqual(
    salesQuoteDownloadReady('jpeg', 'image/jpeg', `${korean}.jpg`, jpeg),
    { filename: '견적서_Q-1.jpg', mediaType: 'image/jpeg' },
  )
  assert.deepEqual(
    salesQuoteDownloadReady('png', 'image/png', `${korean}.png`, png),
    { filename: '견적서_Q-1.png', mediaType: 'image/png' },
  )
  assert.equal(isJpegFile(jpeg), true)
  assert.equal(salesQuoteDownloadReady('jpeg', 'image/jpeg', `${korean}.jpeg`, jpeg), null)
  assert.equal(salesQuoteDownloadReady('pdf', 'application/json', `${korean}.pdf`, pdf), null)
  assert.equal(salesQuoteDownloadReady('png', 'image/png', `${korean}.png`, jpeg), null)
})

test('다운로드 중에는 다시 시작하지 않는다', () => {
  assert.equal(canStartSalesQuoteDownload(false), true)
  assert.equal(canStartSalesQuoteDownload(true), false)
})

test('견적서 다운로드 오류는 로그인, 권한, 없는 견적과 연결 실패를 구분한다', () => {
  assert.equal(
    salesQuoteDownloadError({
      ok: false,
      status: 401,
      error: { status: 401, code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' },
    }),
    '로그인이 필요합니다.',
  )
  assert.equal(
    salesQuoteDownloadError({
      ok: false,
      status: 403,
      error: {
        status: 403,
        code: 'QUOTE_ACCESS_DENIED',
        message: '본인의 견적서만 조회하거나 수정할 수 있습니다.',
      },
    }),
    '본인의 견적서만 조회하거나 수정할 수 있습니다.',
  )
  assert.equal(
    salesQuoteDownloadError({
      ok: false,
      status: 404,
      error: { status: 404, code: 'QUOTE_NOT_FOUND', message: '견적서를 찾을 수 없습니다.' },
    }),
    '견적서를 찾을 수 없습니다.',
  )
  assert.equal(
    salesQuoteDownloadError({
      ok: false,
      status: 500,
      error: { status: 500, code: 'DOCUMENT_GENERATION_FAILED', message: '견적서를 생성하지 못했습니다.' },
    }),
    '견적서를 생성하지 못했습니다.',
  )
  assert.equal(
    salesQuoteDownloadError({
      ok: false,
      status: 403,
      error: { status: 403, code: 'CSRF', message: 'ignored' },
    }),
    CSRF_MESSAGE,
  )
  assert.equal(salesQuoteDownloadError({ ok: false, status: 0, error: null }), CONNECTION_MESSAGE)
  assert.equal(
    salesQuoteDownloadError({ ok: false, status: 200, error: null }),
    SALES_QUOTE_DOWNLOAD_FAILED,
  )
})

test('견적서 확인의 수정과 재작성 경로는 유지한다', () => {
  assert.equal(canEditStoredQuote('DRAFT'), true)
  assert.equal(canEditStoredQuote('SENT'), false)
  assert.equal(quoteEditPath(12), '/consultation?mode=edit&quoteId=12')
  assert.equal(quoteRewritePath(12), '/consultation?mode=rewrite&quoteId=12')
})
