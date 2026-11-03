import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addedLineQuantity,
  canMoveCatalogImage,
  catalogImages,
  pageAfterCatalogFilter,
  productsPath,
} from './productCatalog.ts'

test('제품 목록 경로는 페이지, 검색어, 카테고리를 유지한다', () => {
  assert.equal(productsPath({ page: 0 }), '/api/products?page=0&size=9')
  assert.equal(
    productsPath({ page: 1, keyword: ' 신발 ', categoryId: 2 }),
    '/api/products?page=1&size=9&keyword=%EC%8B%A0%EB%B0%9C&categoryId=2',
  )
  assert.equal(productsPath({ page: 0, keyword: '   ', categoryId: null }), '/api/products?page=0&size=9')
  assert.equal(
    productsPath({ page: 0, favoriteOnly: true }),
    '/api/products?page=0&size=9&favoriteOnly=true',
  )
  assert.equal(pageAfterCatalogFilter(), 0)
})

test('이미지 목록은 대표 이미지 다음에 상세 이미지를 둔다', () => {
  assert.deepEqual(
    catalogImages({
      imagePath: '/images/products/main.jpg',
      detailImages: [
        { sortOrder: 2, imagePath: '/images/products/b.jpg' },
        { sortOrder: 1, imagePath: '  ' },
        { sortOrder: 3, imagePath: '/images/products/c.png' },
      ],
    }).map((image) => image.label),
    ['대표 이미지', '상세 이미지 2', '상세 이미지 3'],
  )
  assert.deepEqual(catalogImages({ imagePath: null, detailImages: [] }), [])
  assert.equal(canMoveCatalogImage(0, 1, 1), false)
  assert.equal(canMoveCatalogImage(0, 1, -1), false)
  assert.equal(canMoveCatalogImage(0, 3, 1), true)
  assert.equal(canMoveCatalogImage(2, 3, 1), false)
})

test('상세 수량은 기존 견적 수량에 더한다', () => {
  assert.equal(addedLineQuantity('2', '3'), '5')
  assert.equal(addedLineQuantity('0', '1'), null)
  assert.equal(addedLineQuantity('1', '0'), null)
})
