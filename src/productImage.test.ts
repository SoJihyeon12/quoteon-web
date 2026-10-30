import assert from 'node:assert/strict'
import test from 'node:test'
import { CSRF_MESSAGE } from './loginDecision.ts'
import {
  detailImagePath,
  imageUploadMessage,
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_AFTER_CREATE_FAILED,
  PRODUCT_IMAGE_SIZE_MESSAGE,
  PRODUCT_IMAGE_TYPE_MESSAGE,
  productImageUrl,
  replaceDetailImage,
  shouldUploadImages,
  validateProductImage,
} from './productImage.ts'

test('제품 이미지는 JPEG와 PNG만 받고 5MB를 넘기면 요청하지 않는다', () => {
  assert.equal(validateProductImage({ name: 'photo.jpg', size: 100, type: 'image/jpeg' }), '')
  assert.equal(validateProductImage({ name: 'photo.JPEG', size: 100, type: '' }), '')
  assert.equal(validateProductImage({ name: 'photo.png', size: MAX_PRODUCT_IMAGE_BYTES, type: 'image/png' }), '')
  assert.equal(validateProductImage({ name: 'photo.gif', size: 100, type: 'image/gif' }), PRODUCT_IMAGE_TYPE_MESSAGE)
  assert.equal(
    validateProductImage({ name: 'photo.png', size: MAX_PRODUCT_IMAGE_BYTES + 1, type: 'image/png' }),
    PRODUCT_IMAGE_SIZE_MESSAGE,
  )
})

test('상세 이미지 슬롯은 교체한 번호만 바뀌고 나머지 경로는 유지한다', () => {
  const images = [
    { id: 1, imagePath: '/images/products/a.jpg', sortOrder: 1 },
    { id: 2, imagePath: '/images/products/b.jpg', sortOrder: 2 },
    { id: 3, imagePath: '/images/products/c.png', sortOrder: 3 },
  ]
  const replaced = replaceDetailImage(images, 2, '/images/products/b2.jpg')
  assert.equal(detailImagePath(replaced, 1), '/images/products/a.jpg')
  assert.equal(detailImagePath(replaced, 2), '/images/products/b2.jpg')
  assert.equal(detailImagePath(replaced, 3), '/images/products/c.png')
  assert.equal(detailImagePath([], 1), null)
  assert.equal(
    productImageUrl('/images/products/8f3ad7ac-51b0-4e0c-ac37-acb73332f852.png'),
    'http://localhost:8080/images/products/8f3ad7ac-51b0-4e0c-ac37-acb73332f852.png',
  )
  assert.equal(productImageUrl('images/products/a.jpg'), 'http://localhost:8080/images/products/a.jpg')
  assert.equal(
    productImageUrl('http://localhost:8080/images/products/a.jpg'),
    'http://localhost:8080/images/products/a.jpg',
  )
  assert.equal(productImageUrl('https://example.com/a.png'), 'https://example.com/a.png')
  assert.equal(productImageUrl(null), null)
  assert.equal(productImageUrl(undefined), null)
  assert.equal(productImageUrl(''), null)
  assert.equal(productImageUrl('   '), null)
})

test('제품 등록이 성공한 뒤에만 이미지를 올리고 실패 문구를 보여 준다', () => {
  assert.equal(shouldUploadImages(false, true), false)
  assert.equal(shouldUploadImages(true, false), false)
  assert.equal(shouldUploadImages(true, true), true)
  assert.match(PRODUCT_IMAGE_AFTER_CREATE_FAILED, /제품은 등록되었습니다/)
  assert.equal(
    imageUploadMessage({
      ok: false,
      status: 400,
      error: {
        status: 400,
        code: 'INVALID_IMAGE',
        message: PRODUCT_IMAGE_TYPE_MESSAGE,
        memberStatus: null,
        name: null,
        email: null,
        companyName: null,
      },
    }),
    PRODUCT_IMAGE_TYPE_MESSAGE,
  )
  assert.equal(
    imageUploadMessage({
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
    }),
    CSRF_MESSAGE,
  )
})
