import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'
import { downloadAdminQuote } from './api/adminQuotes.ts'
import {
  ADMIN_QUOTE_BLOB_REVOKE_DELAY_MS,
  ADMIN_QUOTE_DOWNLOAD_FORBIDDEN,
  ADMIN_QUOTE_DOWNLOAD_GENERATION_FAILED,
  ADMIN_QUOTE_DOWNLOAD_NOT_FOUND,
  ADMIN_QUOTE_DOWNLOAD_UNAUTHORIZED,
  adminQuoteDownloadError,
  adminQuoteDownloadPath,
  adminQuoteDownloadReady,
  canStartAdminQuoteDownload,
  contentDispositionFilename,
  isPdfFile,
  isPngFile,
  saveAdminQuoteFile,
} from './adminQuoteDownload.ts'

const koreanPdf = "attachment; filename*=UTF-8''%EA%B2%AC%EC%A0%81%EC%84%9C_Q-20261018-0001.pdf"
const koreanPng = "attachment; filename=\"quote.png\"; filename*=UTF-8''%EA%B2%AC%EC%A0%81%EC%84%9C_Q-20261018-0001.png"

test('관리자 견적 PDF와 PNG 다운로드 경로를 구분한다', () => {
  assert.equal(adminQuoteDownloadPath(15, 'pdf'), '/api/admin/quotes/15/pdf')
  assert.equal(adminQuoteDownloadPath(15, 'png'), '/api/admin/quotes/15/image')
  assert.equal(typeof downloadAdminQuote, 'function')
})

test('Content-Disposition의 한글 파일명을 우선 사용한다', () => {
  assert.equal(contentDispositionFilename(koreanPdf), '견적서_Q-20261018-0001.pdf')
  assert.equal(contentDispositionFilename(koreanPng), '견적서_Q-20261018-0001.png')
  assert.equal(contentDispositionFilename('attachment; filename="quote.pdf"'), 'quote.pdf')
  assert.equal(contentDispositionFilename(null), null)
})

test('PDF와 PNG는 형식과 확장자가 맞을 때만 저장한다', () => {
  const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
  assert.equal(isPdfFile(pdf), true)
  assert.equal(isPngFile(png), true)
  assert.deepEqual(adminQuoteDownloadReady('pdf', 'application/pdf', koreanPdf, pdf), {
    filename: '견적서_Q-20261018-0001.pdf',
    mediaType: 'application/pdf',
  })
  assert.deepEqual(adminQuoteDownloadReady('png', 'image/png; charset=binary', koreanPng, png), {
    filename: '견적서_Q-20261018-0001.png',
    mediaType: 'image/png',
  })
  assert.equal(adminQuoteDownloadReady('pdf', 'application/json', koreanPdf, pdf), null)
  assert.equal(adminQuoteDownloadReady('pdf', 'application/pdf', koreanPng, pdf), null)
  assert.equal(adminQuoteDownloadReady('png', 'image/png', koreanPng, pdf), null)
  assert.equal(adminQuoteDownloadReady('pdf', 'application/pdf', null, pdf), null)
})

test('다운로드 중에는 다시 시작하지 않는다', () => {
  assert.equal(canStartAdminQuoteDownload(false), true)
  assert.equal(canStartAdminQuoteDownload(true), false)
})

test('견적 파일 오류는 로그인, 권한, 없는 견적, 생성 실패를 구분한다', () => {
  assert.equal(
    adminQuoteDownloadError({
      ok: false,
      status: 401,
      error: { status: 401, code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' },
    }),
    ADMIN_QUOTE_DOWNLOAD_UNAUTHORIZED,
  )
  assert.equal(
    adminQuoteDownloadError({
      ok: false,
      status: 403,
      error: { status: 403, code: 'FORBIDDEN', message: '이 기능을 사용할 권한이 없습니다.' },
    }),
    ADMIN_QUOTE_DOWNLOAD_FORBIDDEN,
  )
  assert.equal(
    adminQuoteDownloadError({
      ok: false,
      status: 404,
      error: { status: 404, code: 'QUOTE_NOT_FOUND', message: '견적서를 찾을 수 없습니다.' },
    }),
    ADMIN_QUOTE_DOWNLOAD_NOT_FOUND,
  )
  assert.equal(
    adminQuoteDownloadError({
      ok: false,
      status: 500,
      error: { status: 500, code: 'DOCUMENT_GENERATION_FAILED', message: '견적서를 생성하지 못했습니다.' },
    }),
    ADMIN_QUOTE_DOWNLOAD_GENERATION_FAILED,
  )
  assert.equal(
    adminQuoteDownloadError({
      ok: false,
      status: 403,
      error: { status: 403, code: 'CSRF', message: 'ignored' },
    }),
    CSRF_MESSAGE,
  )
  assert.equal(adminQuoteDownloadError({ ok: false, status: 0, error: null }), CONNECTION_MESSAGE)
})

test('Blob URL은 클릭 직후가 아니라 10초 뒤에 해제한다', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const revoked: string[] = []
  const clicked: string[] = []
  const removed: string[] = []
  const previousDocument = globalThis.document
  const previousCreate = URL.createObjectURL
  const previousRevoke = URL.revokeObjectURL
  URL.createObjectURL = () => 'blob:quote-file'
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url)
  }
  globalThis.document = {
    body: { appendChild() {} },
    createElement() {
      return {
        href: '',
        download: '',
        click() {
          clicked.push(this.download)
        },
        remove() {
          removed.push(this.download)
        },
      }
    },
  } as unknown as Document

  try {
    const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46])
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    saveAdminQuoteFile('견적서_Q-1.pdf', pdf, 'application/pdf')
    saveAdminQuoteFile('견적서_Q-1.png', png, 'image/png')
    assert.deepEqual(clicked, ['견적서_Q-1.pdf', '견적서_Q-1.png'])
    assert.deepEqual(removed, ['견적서_Q-1.pdf', '견적서_Q-1.png'])
    assert.deepEqual(revoked, [])
    t.mock.timers.tick(ADMIN_QUOTE_BLOB_REVOKE_DELAY_MS - 1)
    assert.deepEqual(revoked, [])
    t.mock.timers.tick(1)
    assert.equal(ADMIN_QUOTE_BLOB_REVOKE_DELAY_MS, 10_000)
    assert.deepEqual(revoked, ['blob:quote-file', 'blob:quote-file'])
  } finally {
    t.mock.timers.reset()
    globalThis.document = previousDocument
    URL.createObjectURL = previousCreate
    URL.revokeObjectURL = previousRevoke
  }
})
