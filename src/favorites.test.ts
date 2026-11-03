import assert from 'node:assert/strict'
import test from 'node:test'
import { productsPath } from './productCatalog.ts'
import {
  FAVORITES_EMPTY,
  favoriteOutcomeMessage,
  favoriteToggleLabel,
} from './favorites.ts'

test('즐겨찾기 필터는 favoriteOnly 쿼리를 사용한다', () => {
  assert.equal(
    productsPath({ page: 0, favoriteOnly: true }),
    '/api/products?page=0&size=9&favoriteOnly=true',
  )
  assert.equal(FAVORITES_EMPTY, '즐겨찾기에 등록된 제품이 없습니다.')
})

test('즐겨찾기 토글 문구와 오류 메시지를 구분한다', () => {
  assert.equal(favoriteToggleLabel(false), '즐겨찾기')
  assert.equal(favoriteToggleLabel(true), '즐겨찾기 해제')
  assert.equal(
    favoriteOutcomeMessage(
      {
        ok: false,
        status: 409,
        error: {
          status: 409,
          code: 'FAVORITE_EXISTS',
          message: '이미 즐겨찾기에 등록된 제품입니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      'fallback',
    ),
    '이미 즐겨찾기에 등록된 제품입니다.',
  )
})
