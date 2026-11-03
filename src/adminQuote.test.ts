import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'
import { ADMIN_QUOTES_PATH, adminQuoteDetailPath, adminQuoteIdFromDetailPath } from './adminMenu.ts'
import { fetchAdminQuote, fetchAdminQuotes } from './api/adminQuotes.ts'
import { formalQuoteLinesFromAdminItems } from './quoteViewDocument.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
import {
  ADMIN_QUOTE_EMPTY,
  ADMIN_QUOTE_NOT_FOUND,
  adminQuoteErrorMessage,
  adminQuotePageLabel,
  adminQuoteStatusLabel,
  adminQuotesRequestPath,
  adminQuoteText,
  canGoToFirstAdminQuotePage,
  canGoToLastAdminQuotePage,
  canGoToNextAdminQuotePage,
  canGoToPreviousAdminQuotePage,
  formatAdminQuoteAmount,
  pageAfterAdminQuoteSearch,
  type AdminQuoteListQuery,
} from './adminQuote.ts'

const filters: AdminQuoteListQuery = {
  page: 2,
  quoteDate: '2026-10-18',
  authorName: ' 김영업 ',
  customerName: ' 김진우 ',
  productKeyword: ' SH-600 ',
}

test('관리자 견적 목록과 상세 경로를 구분한다', () => {
  assert.equal(ADMIN_QUOTES_PATH, '/admin/quotes')
  assert.equal(adminQuoteDetailPath(15), '/admin/quotes/15')
  assert.equal(adminQuoteIdFromDetailPath('/admin/quotes/15'), 15)
  assert.equal(adminQuoteIdFromDetailPath('/admin/quotes'), null)
  assert.equal(adminQuoteIdFromDetailPath('/admin/quotes/0'), null)
  assert.equal(adminQuoteIdFromDetailPath('/quotes/15/view'), null)
})

test('관리자 견적 상세는 정식 견적서와 관리 사이드바를 쓰고 미리보기는 없다', () => {
  const page = readFileSync(join(root, 'src/pages/AdminQuoteDetailPage.tsx'), 'utf8')
  assert.match(page, /FormalQuoteDocument/)
  assert.match(page, /admin-quote-side/)
  assert.match(page, /PDF 다운로드/)
  assert.match(page, /이미지 다운로드/)
  assert.match(page, /삭제/)
  assert.match(page, /updateAdminQuotePrivacy/)
  assert.match(page, /비공개/)
  assert.doesNotMatch(page, /미리보기/)
})

test('관리자 견적 항목은 정식 견적서 행으로 매핑한다', () => {
  assert.deepEqual(
    formalQuoteLinesFromAdminItems([
      {
        id: 9,
        productName: '화이트 신발장',
        productCode: 'SH-600',
        specification: null,
        specificationSource: null,
        salePrice: 120000,
        quantity: 1,
        amount: 120000,
      },
    ]),
    [
      {
        key: 9,
        name: '화이트 신발장',
        productCode: 'SH-600',
        quantity: 1,
        unitPrice: 120000,
        amount: 120000,
      },
    ],
  )
})

test('빈 검색은 10건 전체 목록을 요청한다', () => {
  assert.equal(
    adminQuotesRequestPath({
      page: 0,
      quoteDate: '',
      authorName: '   ',
      customerName: '',
      productKeyword: '',
    }),
    '/api/admin/quotes?page=0&size=10',
  )
  assert.equal(adminQuotesRequestPath({
    page: 0,
    quoteDate: '',
    authorName: '',
    customerName: '',
    productKeyword: '',
  }).includes('status='), false)
})

test('작성일 하루는 시작일과 종료일에 같은 날짜를 전달한다', () => {
  const path = adminQuotesRequestPath({
    page: 0,
    quoteDate: '2026-10-18',
    authorName: '',
    customerName: '',
    productKeyword: '',
  })
  assert.equal(
    path,
    '/api/admin/quotes?page=0&size=10&quoteDateFrom=2026-10-18&quoteDateTo=2026-10-18',
  )
})

test('작성자, 고객명, 제품 키워드를 부분 일치 파라미터로 전달한다', () => {
  assert.equal(
    adminQuotesRequestPath(filters),
    '/api/admin/quotes?page=2&size=10&quoteDateFrom=2026-10-18&quoteDateTo=2026-10-18&authorName=%EA%B9%80%EC%98%81%EC%97%85&customerName=%EA%B9%80%EC%A7%84%EC%9A%B0&productKeyword=SH-600',
  )
  assert.equal(typeof fetchAdminQuotes, 'function')
  assert.equal(typeof fetchAdminQuote, 'function')
})

test('검색은 0페이지로 돌아가고 페이지 이동은 검색 조건을 유지한다', () => {
  assert.equal(pageAfterAdminQuoteSearch(), 0)
  const moved = adminQuotesRequestPath({ ...filters, page: 0 })
  const next = adminQuotesRequestPath({ ...filters, page: 3 })
  assert.match(moved, /page=0/)
  assert.match(next, /page=3/)
  assert.match(next, /authorName=/)
  assert.match(next, /customerName=/)
  assert.match(next, /productKeyword=SH-600/)
  assert.match(next, /quoteDateFrom=2026-10-18/)
  assert.match(next, /quoteDateTo=2026-10-18/)
})

test('목록 금액과 상태는 화면 문구로 바꾼다', () => {
  assert.equal(formatAdminQuoteAmount(319000), '319,000원')
  assert.equal(adminQuoteStatusLabel('DRAFT'), '작성 중')
  assert.equal(adminQuoteStatusLabel('SENT'), '발송 완료')
  assert.equal(adminQuoteStatusLabel('OTHER'), 'OTHER')
})

test('견적 페이지는 1부터 표시하고 범위가 없으면 이동할 수 없다', () => {
  assert.equal(adminQuotePageLabel(0, 3), '1 / 3')
  assert.equal(adminQuotePageLabel(0, 0), '표시할 페이지가 없습니다.')
  assert.equal(canGoToFirstAdminQuotePage(0, 3), false)
  assert.equal(canGoToPreviousAdminQuotePage(1, 3), true)
  assert.equal(canGoToNextAdminQuotePage(1, 3), true)
  assert.equal(canGoToLastAdminQuotePage(2, 3), false)
  assert.equal(canGoToFirstAdminQuotePage(0, 0), false)
  assert.equal(canGoToPreviousAdminQuotePage(0, 0), false)
  assert.equal(canGoToNextAdminQuotePage(0, 0), false)
  assert.equal(canGoToLastAdminQuotePage(0, 0), false)
})

test('없는 고객 정보는 대시로 표시하고 상세 닫기는 목록으로 간다', () => {
  assert.equal(adminQuoteText(null), '-')
  assert.equal(adminQuoteText('   '), '-')
  assert.equal(adminQuoteText('customer@quoteon.test'), 'customer@quoteon.test')
  assert.equal(ADMIN_QUOTES_PATH, '/admin/quotes')
  assert.equal(ADMIN_QUOTE_EMPTY, '검색 결과가 없습니다.')
})

test('견적 오류는 연결 실패, CSRF, 없는 견적 문구를 구분한다', () => {
  assert.equal(
    adminQuoteErrorMessage({ ok: false, status: 0, error: null }, ADMIN_QUOTE_NOT_FOUND),
    CONNECTION_MESSAGE,
  )
  assert.equal(
    adminQuoteErrorMessage(
      { ok: false, status: 403, error: { status: 403, code: 'CSRF', message: 'ignored' } },
      ADMIN_QUOTE_NOT_FOUND,
    ),
    CSRF_MESSAGE,
  )
  assert.equal(
    adminQuoteErrorMessage(
      {
        ok: false,
        status: 404,
        error: { status: 404, code: 'QUOTE_NOT_FOUND', message: '견적서를 찾을 수 없습니다.' },
      },
      ADMIN_QUOTE_NOT_FOUND,
    ),
    '견적서를 찾을 수 없습니다.',
  )
})
