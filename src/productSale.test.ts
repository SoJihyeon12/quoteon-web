import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'
import { PRODUCT_NOT_FOUND } from './adminProduct.ts'
import { deleteAdminProduct, stopAdminProduct } from './api/adminProducts.ts'
import {
  canConfirmProductDelete,
  canConfirmProductStop,
  canStopProductSale,
  PRODUCT_DELETE_MESSAGE,
  PRODUCT_IN_USE_MESSAGE,
  PRODUCT_STOP_BLOCKED,
  PRODUCT_STOP_MESSAGE,
  productDeleteOutcome,
  productDeleteRequest,
  productStopOutcome,
  productStopRequest,
} from './productSale.ts'

test('판매 중지 확인을 열기 전에는 요청을 만들지 않는다', () => {
  assert.equal(canConfirmProductStop(false, false, 'ACTIVE'), false)
  assert.equal(canStopProductSale('INACTIVE'), false)
  assert.equal(canConfirmProductStop(true, false, 'INACTIVE'), false)
  assert.equal(canConfirmProductStop(true, true, 'ACTIVE'), false)
})

test('판매 중지 확인 후에만 본문 없는 중지 요청을 만든다', () => {
  assert.equal(canConfirmProductStop(true, false, 'ACTIVE'), true)
  assert.deepEqual(productStopRequest(15), {
    method: 'POST',
    path: '/api/admin/products/15/stop',
    body: null,
  })
  assert.equal(typeof stopAdminProduct, 'function')
  assert.match(PRODUCT_STOP_MESSAGE, /새 견적/)
  assert.match(PRODUCT_STOP_MESSAGE, /유지/)
})

test('판매 중지 성공은 응답의 제품 상태를 수정 화면에 반영한다', () => {
  const outcome = productStopOutcome({
    ok: true,
    status: 200,
    data: {
      id: 15,
      categoryId: 1,
      categoryName: '현관',
      name: '슬라이딩 도어',
      productCode: 'SH-600',
      unitPrice: 80000,
      salePrice: 90000,
      specification: null,
      description: null,
      imagePath: null,
      status: 'INACTIVE',
    },
  })
  assert.equal(outcome.type, 'stopped')
  assert.equal(outcome.product?.status, 'INACTIVE')
  assert.equal(outcome.product?.id, 15)
})

test('판매 중지 실패는 서버 메시지를 표시한다', () => {
  const conflict = productStopOutcome({
    ok: false,
    status: 409,
    error: {
      status: 409,
      code: 'PRODUCT_STATUS_CONFLICT',
      message: PRODUCT_STOP_BLOCKED,
    },
  })
  assert.equal(conflict.type, 'message')
  assert.equal(conflict.message, PRODUCT_STOP_BLOCKED)

  const csrf = productStopOutcome({
    ok: false,
    status: 403,
    error: { status: 403, code: 'CSRF', message: 'ignored' },
  })
  assert.equal(csrf.message, CSRF_MESSAGE)

  const offline = productStopOutcome({ ok: false, status: 0, error: null })
  assert.equal(offline.message, CONNECTION_MESSAGE)
})

test('삭제 확인을 열기 전에는 요청을 만들지 않는다', () => {
  assert.equal(canConfirmProductDelete(false, false), false)
  assert.equal(canConfirmProductDelete(true, true), false)
})

test('삭제 확인 후에만 본문 없는 삭제 요청을 만들고 성공 시 수정 화면에 남긴다', () => {
  assert.equal(canConfirmProductDelete(true, false), true)
  assert.deepEqual(productDeleteRequest(15), {
    method: 'DELETE',
    path: '/api/admin/products/15',
    body: null,
  })
  assert.equal(typeof deleteAdminProduct, 'function')
  const outcome = productDeleteOutcome({
    ok: true,
    status: 200,
    data: {
      id: 15,
      categoryId: 1,
      categoryName: '현관',
      name: '슬라이딩 도어',
      productCode: 'SH-600',
      unitPrice: 80000,
      salePrice: 90000,
      specification: null,
      description: null,
      imagePath: null,
      status: 'ACTIVE',
    },
  })
  assert.equal(outcome.type, 'deleted')
  assert.equal(outcome.path, null)
  assert.equal(outcome.message, PRODUCT_NOT_FOUND)
  assert.match(PRODUCT_DELETE_MESSAGE, /복구/)
})

test('견적에서 사용 중인 제품 삭제는 지정 문구를 표시한다', () => {
  const outcome = productDeleteOutcome({
    ok: false,
    status: 409,
    error: {
      status: 409,
      code: 'PRODUCT_IN_USE',
      message: '서버가 다른 문구를 보내도 지정 문구를 사용한다',
    },
  })
  assert.equal(outcome.type, 'in-use')
  assert.equal(outcome.path, null)
  assert.equal(
    outcome.message,
    '해당 제품은 견적 내역에서 사용 중이므로 삭제할 수 없습니다. 판매 중지를 이용해 주세요.',
  )
  assert.equal(outcome.message, PRODUCT_IN_USE_MESSAGE)
})

test('그 외 삭제 오류는 기존 API 오류 문구를 표시한다', () => {
  const missing = productDeleteOutcome({
    ok: false,
    status: 404,
    error: { status: 404, code: 'PRODUCT_NOT_FOUND', message: '제품을 찾을 수 없습니다.' },
  })
  assert.equal(missing.type, 'message')
  assert.equal(missing.message, '제품을 찾을 수 없습니다.')

  const csrf = productDeleteOutcome({
    ok: false,
    status: 403,
    error: { status: 403, code: 'CSRF', message: 'ignored' },
  })
  assert.equal(csrf.message, CSRF_MESSAGE)
})
