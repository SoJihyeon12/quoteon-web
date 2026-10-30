import assert from 'node:assert/strict'
import test from 'node:test'
import { updateQuote } from './api/quotes.ts'
import { priceQuote } from './quoteForm.ts'
import { quotePreviewReturnPath } from './quotePreview.ts'
import {
  SENT_QUOTE_EDIT_MESSAGE,
  canEditStoredQuote,
  quoteCustomerLocked,
  quoteEditPath,
  quoteRewritePath,
  quoteSaveAction,
  workbenchDraftFromQuote,
} from './quoteWorkbench.ts'

const storedQuote = {
  quoteDate: '2026-10-29',
  customerId: 4,
  customerName: '김진주',
  items: [
    {
      productId: 1,
      productName: '화이트 신발장',
      productCode: 'SH-600',
      salePrice: 10000,
      quantity: 1,
    },
  ],
}

test('작성 중 견적만 수정하고 발송 완료 견적은 수정하지 않는다', () => {
  assert.equal(canEditStoredQuote('DRAFT'), true)
  assert.equal(canEditStoredQuote('SENT'), false)
  assert.equal(SENT_QUOTE_EDIT_MESSAGE, '발송 완료된 견적은 수정할 수 없습니다.')
})

test('수정은 기존 견적 번호로 갱신하고 재작성과 신규 작성은 새 견적을 만든다', () => {
  assert.equal(quoteEditPath(12), '/consultation?mode=edit&quoteId=12')
  assert.equal(quoteRewritePath(12), '/consultation?mode=rewrite&quoteId=12')
  assert.equal(quoteSaveAction('edit', 12), 'update')
  assert.equal(quoteSaveAction('edit', null), 'blocked')
  assert.equal(quoteSaveAction('rewrite', 12), 'create')
  assert.equal(quoteSaveAction('new', null), 'create')
  assert.equal(quoteSaveAction(null, null), 'create')
  assert.equal(typeof updateQuote, 'function')
})

test('수정 중에는 고객을 잠그고 재작성에서는 고객을 바꿀 수 있다', () => {
  assert.equal(quoteCustomerLocked('edit'), true)
  assert.equal(quoteCustomerLocked('rewrite'), false)
  assert.equal(quoteCustomerLocked('new'), false)
  const draft = workbenchDraftFromQuote(storedQuote)
  assert.equal(draft?.customer.id, 4)
  assert.equal(draft?.customer.name, '김진주')
  assert.equal(draft?.writtenOn, '2026-10-29')
  assert.equal(draft?.lines[0]?.quantity, '1')
})

test('제품이나 수량을 바꾸면 공급가액과 부가세를 다시 계산한다', () => {
  const draft = workbenchDraftFromQuote(storedQuote)
  assert.ok(draft)
  const original = priceQuote(draft.lines.map((line) => ({ salePrice: line.salePrice, quantity: Number(line.quantity) })))
  const changedQuantity = priceQuote([{ salePrice: 10000, quantity: 3 }])
  const changedProduct = priceQuote([{ salePrice: 20000, quantity: 1 }])
  assert.equal(original.supplyAmount, 10000)
  assert.equal(original.vatAmount, 1000)
  assert.equal(original.totalAmount, 11000)
  assert.equal(changedQuantity.supplyAmount, 30000)
  assert.equal(changedQuantity.vatAmount, 3000)
  assert.equal(changedQuantity.totalAmount, 33000)
  assert.equal(changedProduct.supplyAmount, 20000)
  assert.equal(changedProduct.vatAmount, 2000)
  assert.equal(changedProduct.totalAmount, 22000)
})

test('미리보기에서 돌아오면 수정 또는 재작성 주소를 유지한다', () => {
  assert.equal(
    quotePreviewReturnPath({ returnPath: '/consultation?mode=edit&quoteId=12' }),
    '/consultation?mode=edit&quoteId=12',
  )
  assert.equal(
    quotePreviewReturnPath({ returnPath: '/consultation?mode=rewrite&quoteId=12' }),
    '/consultation?mode=rewrite&quoteId=12',
  )
  assert.equal(quotePreviewReturnPath({ returnPath: 'https://example.test' }), '/consultation?mode=new')
  assert.equal(quotePreviewReturnPath(null), '/consultation?mode=new')
})
