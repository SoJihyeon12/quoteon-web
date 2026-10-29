import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCreateQuoteBody, lineAmount, priceQuote } from './quoteForm.ts'

test('제품 금액은 소수 둘째 자리, 부가세는 원 단위 반올림이다', () => {
  assert.equal(lineAmount(15, 1), 15)
  const single = priceQuote([{ salePrice: 15, quantity: 1 }])
  assert.equal(single.supplyAmount, 15)
  assert.equal(single.vatAmount, 2)
  assert.equal(single.totalAmount, 17)

  const cents = priceQuote([{ salePrice: 10.05, quantity: 1 }])
  assert.equal(cents.amounts[0], 10.05)
  assert.equal(cents.vatAmount, 1)
  assert.equal(cents.totalAmount, 11.05)

  const combined = priceQuote([
    { salePrice: 120000, quantity: 2 },
    { salePrice: 15, quantity: 1 },
  ])
  assert.deepEqual(combined.amounts, [240000, 15])
  assert.equal(combined.supplyAmount, 240015)
  assert.equal(combined.vatAmount, 24002)
  assert.equal(combined.totalAmount, 264017)
})

test('견적 생성 본문은 customerId, quoteDate, productId, quantity만 담는다', () => {
  const result = buildCreateQuoteBody({
    customerId: '12',
    quoteDate: '2026-10-29',
    items: [
      { productId: 3, quantity: '2' },
      { productId: 8, quantity: '1' },
    ],
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.body, {
      customerId: 12,
      quoteDate: '2026-10-29',
      items: [
        { productId: 3, quantity: 2 },
        { productId: 8, quantity: 1 },
      ],
    })
  }
})

test('고객, 견적일, 수량, 중복 제품은 저장 전에 거른다', () => {
  assert.equal(
    buildCreateQuoteBody({ customerId: '', quoteDate: '2026-10-29', items: [{ productId: 1, quantity: '1' }] }).ok,
    false,
  )
  assert.equal(
    buildCreateQuoteBody({ customerId: '1', quoteDate: '', items: [{ productId: 1, quantity: '1' }] }).ok,
    false,
  )
  assert.equal(
    buildCreateQuoteBody({ customerId: '1', quoteDate: '2026-02-31', items: [{ productId: 1, quantity: '1' }] }).ok,
    false,
  )
  assert.equal(buildCreateQuoteBody({ customerId: '1', quoteDate: '2026-10-29', items: [] }).ok, false)
  assert.equal(
    buildCreateQuoteBody({ customerId: '1', quoteDate: '2026-10-29', items: [{ productId: 1, quantity: '0' }] }).ok,
    false,
  )
  const duplicate = buildCreateQuoteBody({
    customerId: '1',
    quoteDate: '2026-10-29',
    items: [
      { productId: 4, quantity: '1' },
      { productId: 4, quantity: '2' },
    ],
  })
  assert.equal(duplicate.ok, false)
  if (!duplicate.ok) {
    assert.equal(duplicate.message, '같은 제품을 항목에 중복해서 넣을 수 없습니다.')
  }
})
