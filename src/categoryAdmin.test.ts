import assert from 'node:assert/strict'
import test from 'node:test'
import type { Category } from './api/types.ts'
import { CSRF_MESSAGE } from './loginDecision.ts'
import {
  buildCategoryBody,
  canConfirmCategoryDelete,
  CATEGORY_CHILD_PARENT,
  CATEGORY_HAS_CHILDREN,
  CATEGORY_HAS_PRODUCTS,
  CATEGORY_NAME_REQUIRED,
  CATEGORY_NAME_TOO_LONG,
  CATEGORY_SELF_PARENT,
  categoryChildren,
  categoryDeleteResult,
  categoryForest,
  categoryPathLabel,
  categorySaveResult,
  descendantIds,
  parentChoices,
  parentSelectionError,
  selectionAfterDelete,
  validateCategoryName,
} from './categoryAdmin.ts'

const categories: Category[] = [
  { id: 1, name: '현관', parentId: null },
  { id: 2, name: '신발장', parentId: 1 },
  { id: 3, name: '거실', parentId: null },
  { id: 4, name: '소파', parentId: 3 },
  { id: 5, name: '거실장', parentId: 3 },
  { id: 6, name: '테이블', parentId: 3 },
  { id: 7, name: '서재', parentId: null },
  { id: 8, name: '책상', parentId: 7 },
]

function failure(status: number, code: string, message: string) {
  return {
    ok: false as const,
    status,
    error: {
      status,
      code,
      message,
      memberStatus: null,
      name: null,
      email: null,
      companyName: null,
    },
  }
}

test('카테고리 트리는 최상위와 하위를 구분한다', () => {
  const roots = categoryForest(categories)
  assert.deepEqual(roots.map((category) => category.name), ['현관', '거실', '서재'])
  assert.deepEqual(roots[1]?.children.map((category) => category.name), ['소파', '거실장', '테이블'])
  assert.deepEqual(categoryChildren(categories, null).map((category) => category.name), ['현관', '거실', '서재'])
  assert.deepEqual(categoryChildren(categories, 3).map((category) => category.name), ['소파', '거실장', '테이블'])
  assert.deepEqual(descendantIds(categories, 3), [4, 5, 6])
  assert.equal(categoryPathLabel(categories, 2), '현관 > 신발장')
})

test('최상위 등록은 parentId를 비우고 하위 등록은 상위 번호를 담는다', () => {
  assert.equal(validateCategoryName('  '), CATEGORY_NAME_REQUIRED)
  assert.equal(validateCategoryName('가'.repeat(101)), CATEGORY_NAME_TOO_LONG)
  assert.deepEqual(buildCategoryBody(categories, ' 창고 ', null, null), { name: '창고', parentId: null })
  assert.deepEqual(buildCategoryBody(categories, '스툴', 3, null), { name: '스툴', parentId: 3 })
  assert.equal(buildCategoryBody(categories, '', null, null), null)
})

test('수정 시 자기 자신과 하위 카테고리는 상위가 될 수 없다', () => {
  assert.deepEqual(parentChoices(categories, 3).map((category) => category.id), [1, 2, 7, 8])
  assert.equal(parentSelectionError(categories, 3, 3), CATEGORY_SELF_PARENT)
  assert.equal(parentSelectionError(categories, 3, 4), CATEGORY_CHILD_PARENT)
  assert.equal(buildCategoryBody(categories, '거실', 4, 3), null)
  assert.deepEqual(buildCategoryBody(categories, '거실', 1, 3), { name: '거실', parentId: 1 })
})

test('카테고리 저장 오류는 중복 이름과 서버 문구를 구분한다', () => {
  assert.deepEqual(
    categorySaveResult({ ok: true, status: 201, data: { id: 9, name: '창고', parentId: null } }),
    { type: 'saved', message: '' },
  )
  assert.deepEqual(
    categorySaveResult(failure(409, 'CATEGORY_NAME_EXISTS', '이미 사용 중인 카테고리명입니다.')),
    { type: 'name', message: '이미 사용 중인 카테고리명입니다.' },
  )
  assert.deepEqual(
    categorySaveResult(failure(404, 'CATEGORY_NOT_FOUND', '상위 카테고리를 찾을 수 없습니다.')),
    { type: 'message', message: '상위 카테고리를 찾을 수 없습니다.' },
  )
  assert.equal(categorySaveResult(failure(403, 'CSRF', CSRF_MESSAGE)).message, CSRF_MESSAGE)
})

test('삭제 확인 전에는 요청하지 않고 하위와 제품이 있으면 거절한다', () => {
  assert.equal(canConfirmCategoryDelete(false, false), false)
  assert.equal(canConfirmCategoryDelete(true, false), true)
  assert.equal(canConfirmCategoryDelete(true, true), false)
  assert.deepEqual(
    categoryDeleteResult(failure(409, 'CATEGORY_HAS_CHILDREN', CATEGORY_HAS_CHILDREN)),
    { deleted: false, message: CATEGORY_HAS_CHILDREN },
  )
  assert.deepEqual(
    categoryDeleteResult(failure(409, 'CATEGORY_HAS_PRODUCTS', CATEGORY_HAS_PRODUCTS)),
    { deleted: false, message: CATEGORY_HAS_PRODUCTS },
  )
  assert.equal(categoryDeleteResult({ ok: true, status: 200, data: categories[5] }).deleted, true)
  assert.equal(selectionAfterDelete(categories, 6), 3)
  assert.equal(selectionAfterDelete(categories, 3), null)
})
