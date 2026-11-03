import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { quoteErrorMessage, quoteIdFromViewPath, quoteViewPath } from './quoteList.ts'
import { formalQuoteLinesFromItems } from './quoteViewDocument.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(join(root, 'src/pages/QuoteViewPage.tsx'), 'utf8')
const css = readFileSync(join(root, 'src/pages/QuoteViewPage.css'), 'utf8')

test('견적서 확인 경로는 견적 번호로 /quotes/{id}/view를 만든다', () => {
  assert.equal(quoteViewPath(12), '/quotes/12/view')
  assert.equal(quoteIdFromViewPath('/quotes/12/view'), 12)
  assert.equal(quoteIdFromViewPath('/quotes/my'), null)
  assert.equal(quoteIdFromViewPath('/quotes/new'), null)
  assert.equal(quoteIdFromViewPath('/quotes/0/view'), null)
  assert.equal(quoteIdFromViewPath('/quotes/12'), null)
})

test('견적서 확인은 상단 관리 정보와 정식 견적서를 분리한다', () => {
  assert.match(page, /quote-view-manage/)
  assert.match(page, /FormalQuoteDocument/)
  assert.match(page, /견적번호/)
  assert.match(page, /고객명/)
  assert.match(page, /견적일/)
  assert.match(page, /상태/)
  assert.doesNotMatch(page, /quote-table/)
  assert.doesNotMatch(page, /paymentMethod/)
  assert.match(css, /\.quote-view-manage/)
  assert.match(css, /\.quote-view-document/)
  assert.match(css, /grid-template-columns:\s*repeat\(4/)
})

test('견적 상세 항목은 정식 견적서 행으로 매핑한다', () => {
  assert.deepEqual(
    formalQuoteLinesFromItems([
      {
        id: 7,
        productId: 3,
        productName: '화이트 신발장',
        productCode: 'SH-600',
        specification: '600mm',
        specificationSource: null,
        salePrice: 120000,
        quantity: 2,
        amount: 240000,
      },
    ]),
    [
      {
        key: 7,
        name: '화이트 신발장',
        productCode: 'SH-600',
        quantity: 2,
        unitPrice: 120000,
        amount: 240000,
      },
    ],
  )
})

test('견적서 확인 오류는 없는 견적과 권한 거절 문구를 그대로 보여 준다', () => {
  assert.equal(
    quoteErrorMessage(
      {
        ok: false,
        status: 404,
        error: {
          status: 404,
          code: 'QUOTE_NOT_FOUND',
          message: '견적서를 찾을 수 없습니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '견적서를 찾을 수 없습니다.',
  )
  assert.equal(
    quoteErrorMessage(
      {
        ok: false,
        status: 403,
        error: {
          status: 403,
          code: 'QUOTE_ACCESS_DENIED',
          message: '본인의 견적서만 조회하거나 수정할 수 있습니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '본인의 견적서만 조회하거나 수정할 수 있습니다.',
  )
})
