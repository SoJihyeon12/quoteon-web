import assert from 'node:assert/strict'
import test from 'node:test'
import {
  QUOTE_PREVIEW_PATH,
  QUOTE_WORKBENCH_PATH,
  previewQuote,
  quotePreviewFromHistory,
  readQuotePreview,
  type QuotePreviewDraft,
} from './quotePreview.ts'

const draft: QuotePreviewDraft = {
  customer: { id: 4, name: '김진주', phone: '01011112222', customerType: 'COMPANY' },
  writtenOn: '2026-10-18',
  memo: '납기 확인',
  lines: [
    { productId: 1, productCode: 'SH-600', name: '화이트 신발장', salePrice: 120000, quantity: '1' },
    { productId: 2, productCode: 'SH-800', name: '오크 원목 신발장', salePrice: 190000, quantity: '1' },
  ],
}

test('미리보기는 작성 중 고객, 작성일, 수량, 단가와 상담 화면과 같은 금액을 보여 준다', () => {
  const preview = previewQuote(draft)
  assert.equal(preview.customerName, '김진주')
  assert.equal(preview.writtenOn, '2026-10-18')
  assert.deepEqual(
    preview.rows.map((row) => [row.name, row.productCode, row.quantity, row.unitPrice, row.amount]),
    [
      ['화이트 신발장', 'SH-600', '1', 120000, 120000],
      ['오크 원목 신발장', 'SH-800', '1', 190000, 190000],
    ],
  )
  assert.equal(preview.supplyAmount, 310000)
  assert.equal(preview.vatAmount, 31000)
  assert.equal(preview.totalAmount, 341000)
  assert.equal('memo' in preview, false)
})

test('수량이 계산할 수 없으면 그 줄은 합계에서 빠진다', () => {
  const preview = previewQuote({
    ...draft,
    lines: [{ productId: 1, productCode: 'SH-600', name: '화이트 신발장', salePrice: 15, quantity: '0' }],
  })
  assert.equal(preview.rows[0]?.amount, null)
  assert.equal(preview.supplyAmount, 0)
  assert.equal(preview.vatAmount, 0)
  assert.equal(preview.totalAmount, 0)
})

test('미리보기 저장값은 상담 화면으로 돌아올 때 고객, 제품, 메모를 복원한다', () => {
  const restored = quotePreviewFromHistory({ source: 'quote-preview', draft })
  assert.deepEqual(restored, draft)
  assert.equal(readQuotePreview(JSON.stringify(draft))?.memo, '납기 확인')
  assert.equal(quotePreviewFromHistory(null), null)
  assert.equal(quotePreviewFromHistory({ source: 'other', draft }), null)
  assert.equal(readQuotePreview('{"writtenOn":"2026-10-18"}'), null)
  assert.equal(QUOTE_PREVIEW_PATH, '/quotes/preview')
  assert.equal(QUOTE_WORKBENCH_PATH, '/consultation?mode=new')
})
