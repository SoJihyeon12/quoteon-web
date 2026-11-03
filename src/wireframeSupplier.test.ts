import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FORMAL_QUOTE_INTRO,
  FORMAL_QUOTE_VALIDITY,
  WIREFRAME_MANUFACTURER,
  WIREFRAME_SUPPLIER_EXAMPLE,
} from './wireframeSupplier.ts'

test('관리자 견적 상세의 공급자는 와이어프레임 2.38 예시 값이다', () => {
  assert.deepEqual(
    WIREFRAME_SUPPLIER_EXAMPLE.map((field) => [field.label, field.value]),
    [
      ['상호', '에이원퍼니처 (A1 Furniture)'],
      ['대표자', '김현진'],
      ['주소', '서울특별시 강남구 테헤란로 123'],
      ['업태/업종', '도소매업/가구 및 가구용품 판매업'],
      ['전화', '02-1234-1234'],
    ],
  )
  assert.equal(WIREFRAME_MANUFACTURER, '에이원퍼니처')
  assert.equal(FORMAL_QUOTE_INTRO, '아래와 같이 견적합니다. (VAT 별도)')
  assert.equal(FORMAL_QUOTE_VALIDITY, '본 견적서는 견적일로부터 30일간 유효합니다.')
})
