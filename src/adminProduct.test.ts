import assert from 'node:assert/strict'
import test from 'node:test'
import { CSRF_MESSAGE } from './loginDecision.ts'
import {
  adminProductsPath,
  buildProductBody,
  canGoToNextProductPage,
  canGoToPreviousProductPage,
  expectedProductPages,
  formatProductPrice,
  pageAfterProductSearch,
  PRODUCT_CODE_EXISTS,
  PRODUCT_NAME_REQUIRED,
  PRODUCT_SALE_PRICE_INVALID,
  PRODUCT_SPEC_TOO_LONG,
  productSaveResult,
  productStatusLabel,
  validateProductForm,
  validateSalePriceFilter,
  visibleProductCount,
  type ProductFormValues,
} from './adminProduct.ts'

const values: ProductFormValues = {
  categoryId: '2',
  name: ' 화이트 신발장 ',
  productCode: ' SH-600 ',
  unitPrice: '80000',
  salePrice: '120000.50',
  specification: ' 600x330 ',
  description: ' ',
}

test('관리자 제품 목록은 검색어, 카테고리, 판매가, 상태를 쿼리로 구분한다', () => {
  assert.equal(adminProductsPath({
    page: 0,
    keyword: '  ',
    categoryId: null,
    salePrice: '',
    status: '',
  }), '/api/admin/products?page=0&size=10')
  assert.equal(adminProductsPath({
    page: 1,
    keyword: ' 신발 ',
    categoryId: 3,
    salePrice: '120000',
    status: 'ACTIVE',
  }), '/api/admin/products?page=1&size=10&keyword=%EC%8B%A0%EB%B0%9C&categoryId=3&salePrice=120000&status=ACTIVE')
  assert.equal(validateSalePriceFilter(''), '')
  assert.equal(validateSalePriceFilter('12.345'), PRODUCT_SALE_PRICE_INVALID)
  assert.equal(pageAfterProductSearch(), 0)
  assert.equal(visibleProductCount(11, 0), 10)
  assert.equal(visibleProductCount(11, 1), 1)
  assert.equal(expectedProductPages(11), 2)
  assert.equal(canGoToPreviousProductPage(0), false)
  assert.equal(canGoToNextProductPage(0, expectedProductPages(11)), true)
  assert.equal(canGoToPreviousProductPage(1), true)
  assert.equal(canGoToNextProductPage(1, expectedProductPages(11)), false)
  assert.equal(canGoToNextProductPage(0, expectedProductPages(10)), false)
})

test('제품 등록 본문은 금액과 빈 규격, 설명을 구분하고 상태와 이미지를 담지 않는다', () => {
  assert.equal(validateProductForm({ ...values, name: ' ' }).name, PRODUCT_NAME_REQUIRED)
  assert.equal(validateProductForm({ ...values, specification: '규'.repeat(501) }).specification, PRODUCT_SPEC_TOO_LONG)
  assert.equal(validateProductForm({ ...values, salePrice: '-1' }).salePrice, PRODUCT_SALE_PRICE_INVALID)
  assert.deepEqual(buildProductBody(values), {
    categoryId: 2,
    name: '화이트 신발장',
    productCode: 'SH-600',
    unitPrice: 80000,
    salePrice: 120000.5,
    specification: '600x330',
    description: null,
  })
  assert.equal('status' in (buildProductBody(values) ?? {}), false)
  assert.equal('imagePath' in (buildProductBody(values) ?? {}), false)
})

test('제품 상태와 금액은 화면 문구로 바꾸고 저장 오류를 구분한다', () => {
  assert.equal(productStatusLabel('ACTIVE'), '판매중')
  assert.equal(productStatusLabel('INACTIVE'), '판매중지')
  assert.equal(productStatusLabel('UNKNOWN'), 'UNKNOWN')
  assert.equal(formatProductPrice(120000), '120,000원')
  assert.deepEqual(
    productSaveResult({
      ok: true,
      status: 201,
      data: {
        id: 8,
        categoryId: 2,
        categoryName: '신발장',
        name: '화이트 신발장',
        productCode: 'SH-600',
        unitPrice: 80000,
        salePrice: 120000,
        specification: null,
        description: null,
        imagePath: null,
        status: 'ACTIVE',
      },
    }),
    { type: 'saved', path: '/admin/products', message: '' },
  )
  assert.equal(
    productSaveResult({
      ok: false,
      status: 409,
      error: {
        status: 409,
        code: 'PRODUCT_CODE_EXISTS',
        message: PRODUCT_CODE_EXISTS,
        memberStatus: null,
        name: null,
        email: null,
        companyName: null,
      },
    }).message,
    PRODUCT_CODE_EXISTS,
  )
  assert.equal(
    productSaveResult({
      ok: false,
      status: 404,
      error: {
        status: 404,
        code: 'PRODUCT_NOT_FOUND',
        message: '제품을 찾을 수 없습니다.',
        memberStatus: null,
        name: null,
        email: null,
        companyName: null,
      },
    }).message,
    '제품을 찾을 수 없습니다.',
  )
  assert.equal(
    productSaveResult({
      ok: false,
      status: 403,
      error: {
        status: 403,
        code: 'CSRF',
        message: CSRF_MESSAGE,
        memberStatus: null,
        name: null,
        email: null,
        companyName: null,
      },
    }).message,
    CSRF_MESSAGE,
  )
})
