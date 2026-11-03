import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PREVIEW_DOCUMENT_REQUIRES_SAVED_QUOTE,
  QUOTE_PREVIEW_PATH,
  QUOTE_WORKBENCH_PATH,
  openQuotePreview,
  previewQuote,
  previewSavedQuoteId,
  quotePreviewFromHistory,
  readQuotePreview,
  returnToQuoteWorkbench,
  type QuotePreviewDraft,
} from './quotePreview.ts'

const draft: QuotePreviewDraft = {
  customer: { id: 4, name: '김진주', phone: '01011112222', customerType: 'COMPANY' },
  writtenOn: '2026-10-18',
  memo: '납기 확인',
  paymentMethod: '',
  quoteId: null,
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
  assert.equal('paymentMethod' in preview, false)
  assert.equal(previewSavedQuoteId(draft), null)
  assert.equal(previewSavedQuoteId({ ...draft, quoteId: 12 }), 12)
  assert.equal(previewSavedQuoteId({ ...draft, quoteId: 0 }), null)
  assert.match(PREVIEW_DOCUMENT_REQUIRES_SAVED_QUOTE, /저장한 뒤/)
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

test('미리보기에서 수정하거나 나가면 열었던 상담 작업대와 작성 내용을 복원한다', () => {
  const paths = [
    '/consultation?mode=new',
    '/consultation?mode=edit&quoteId=12',
    '/consultation?mode=rewrite&quoteId=12',
  ]
  for (const path of paths) {
    const restore = installHistory(`http://localhost${path}`)
    try {
      openQuotePreview(draft)
      assert.equal(globalThis.window.location.pathname, QUOTE_PREVIEW_PATH)
      const opened = quotePreviewFromHistory(globalThis.window.history.state)
      assert.deepEqual(opened, draft)
      returnToQuoteWorkbench(opened)
      assert.equal(`${globalThis.window.location.pathname}${globalThis.window.location.search}`, path)
      assert.deepEqual(quotePreviewFromHistory(globalThis.window.history.state), draft)
    } finally {
      restore()
    }
  }
})

test('자동 저장 후 미리보기는 저장된 견적 ID와 수정 경로를 함께 유지한다', () => {
  const restore = installHistory('http://localhost/consultation?mode=new')
  try {
    const saved = { ...draft, quoteId: 42 }
    openQuotePreview(saved, '/consultation?mode=edit&quoteId=42')
    assert.equal(globalThis.window.location.pathname, QUOTE_PREVIEW_PATH)
    const opened = quotePreviewFromHistory(globalThis.window.history.state)
    assert.equal(opened?.quoteId, 42)
    assert.equal(previewSavedQuoteId(opened), 42)
    returnToQuoteWorkbench(opened)
    assert.equal(
      `${globalThis.window.location.pathname}${globalThis.window.location.search}`,
      '/consultation?mode=edit&quoteId=42',
    )
  } finally {
    restore()
  }
})

test('미리보기 저장값은 상담 화면으로 돌아올 때 고객, 제품, 메모를 복원한다', () => {
  const restored = quotePreviewFromHistory({ source: 'quote-preview', draft })
  assert.deepEqual(restored, draft)
  assert.equal(readQuotePreview(JSON.stringify(draft))?.memo, '납기 확인')
  const withPayment = { ...draft, paymentMethod: 'CARD' as const }
  assert.equal(quotePreviewFromHistory({ source: 'quote-preview', draft: withPayment })?.paymentMethod, 'CARD')
  assert.equal(previewQuote(withPayment).customerName, '김진주')
  assert.equal('paymentMethod' in previewQuote(withPayment), false)
  const withQuoteId = { ...draft, quoteId: 18 }
  assert.equal(quotePreviewFromHistory({ source: 'quote-preview', draft: withQuoteId })?.quoteId, 18)
  assert.equal(quotePreviewFromHistory(null), null)
  assert.equal(quotePreviewFromHistory({ source: 'other', draft }), null)
  assert.equal(readQuotePreview('{"writtenOn":"2026-10-18"}'), null)
  assert.equal(QUOTE_PREVIEW_PATH, '/quotes/preview')
  assert.equal(QUOTE_WORKBENCH_PATH, '/consultation?mode=new')
})

function installHistory(startUrl: string) {
  const entries: Array<{ url: string; state: unknown }> = [{ url: startUrl, state: null }]
  let index = 0
  const original = globalThis.window
  const page = {
    location: {
      get pathname() {
        return new URL(entries[index].url).pathname
      },
      get search() {
        return new URL(entries[index].url).search
      },
      get href() {
        return entries[index].url
      },
    },
    history: {
      get state() {
        return entries[index].state
      },
      replaceState(state: unknown, _title: string, url: string) {
        entries[index] = { url: new URL(url, entries[index].url).href, state }
      },
      pushState(state: unknown, _title: string, url: string) {
        entries.splice(index + 1)
        entries.push({ url: new URL(url, entries[index].url).href, state })
        index += 1
      },
    },
    dispatchEvent() {
      return true
    },
  }
  globalThis.window = page as unknown as Window & typeof globalThis
  return () => {
    globalThis.window = original
  }
}
