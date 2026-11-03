import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE } from './loginDecision.ts'
import { formatAmount, pageAfterQuoteSearch, QUOTE_PAGE_SIZE, quoteErrorMessage, quoteListEmptyMessage, quoteListPageCount, quoteStatusLabel, quoteViewPath, quotesPath } from './quoteList.ts'

test('내 견적 목록은 첫 페이지와 다음 페이지 모두 10건씩 요청한다', () => {
  assert.equal(QUOTE_PAGE_SIZE, 10)
  assert.equal(quotesPath({ page: 0, size: QUOTE_PAGE_SIZE }), '/api/quotes?page=0&size=10')
  assert.equal(
    quotesPath({ page: 1, size: QUOTE_PAGE_SIZE, customerName: '   ', quoteDate: '' }),
    '/api/quotes?page=1&size=10',
  )
  assert.equal(quoteViewPath(12), '/quotes/12/view')
})

test('고객명과 작성일 검색도 페이지당 10건을 요청한다', () => {
  assert.equal(
    quotesPath({ page: 0, size: QUOTE_PAGE_SIZE, customerName: ' 김진우 ' }),
    '/api/quotes?page=0&size=10&customerName=%EA%B9%80%EC%A7%84%EC%9A%B0',
  )
  assert.equal(
    quotesPath({ page: 0, size: QUOTE_PAGE_SIZE, quoteDate: '2026-10-18' }),
    '/api/quotes?page=0&size=10&quoteDate=2026-10-18',
  )
  assert.equal(
    quotesPath({ page: 0, size: QUOTE_PAGE_SIZE, customerName: '김진우', quoteDate: '2026-10-18' }),
    '/api/quotes?page=0&size=10&customerName=%EA%B9%80%EC%A7%84%EC%9A%B0&quoteDate=2026-10-18',
  )
})

test('검색은 첫 페이지에서 시작하고 페이지 이동은 검색 조건과 10건 크기를 유지한다', () => {
  assert.equal(pageAfterQuoteSearch(), 0)
  assert.equal(
    quotesPath({ page: 2, size: QUOTE_PAGE_SIZE, customerName: '김진우', quoteDate: '2026-10-18' }),
    '/api/quotes?page=2&size=10&customerName=%EA%B9%80%EC%A7%84%EC%9A%B0&quoteDate=2026-10-18',
  )
  assert.equal(quotesPath({ page: 0, size: QUOTE_PAGE_SIZE, customerName: '', quoteDate: '' }), '/api/quotes?page=0&size=10')
  assert.equal(quoteListPageCount(0), 0)
  assert.equal(quoteListPageCount(10), 1)
  assert.equal(quoteListPageCount(11), 2)
  assert.equal(quoteListPageCount(25), 3)
})

test('검색 결과가 없으면 검색 안내를, 전체 목록이 비면 등록 안내를 보여 준다', () => {
  assert.equal(quoteListEmptyMessage('', ''), '등록된 견적서가 없습니다.')
  assert.equal(quoteListEmptyMessage('김진우', ''), '검색 결과가 없습니다.')
  assert.equal(quoteListEmptyMessage('', '2026-10-18'), '검색 결과가 없습니다.')
  assert.equal(quoteListEmptyMessage('  ', '  '), '등록된 견적서가 없습니다.')
})

test('견적 상태와 금액은 응답 값을 화면 문구로 바꾼다', () => {
  assert.equal(quoteStatusLabel('DRAFT'), '작성 중')
  assert.equal(quoteStatusLabel('SENT'), '발송 완료')
  assert.equal(quoteStatusLabel('OTHER'), 'OTHER')
  assert.equal(formatAmount(132000), '132,000원')
})

test('견적 목록 오류는 연결 실패와 서버 문구를 구분한다', () => {
  assert.equal(quoteErrorMessage({ ok: false, status: 0, error: null }, '실패'), CONNECTION_MESSAGE)
  assert.equal(
    quoteErrorMessage(
      {
        ok: false,
        status: 400,
        error: {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: '페이지 번호는 0 이상이어야 합니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '페이지 번호는 0 이상이어야 합니다.',
  )
})
