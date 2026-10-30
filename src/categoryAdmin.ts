import type { ApiResult, Category } from './api/types.ts'
import { adminErrorMessage } from './adminMemberList.ts'

export const CATEGORY_NAME_REQUIRED = '카테고리명을 입력해 주세요.'
export const CATEGORY_NAME_TOO_LONG = '카테고리명은 100자 이하로 입력해 주세요.'
export const CATEGORY_NAME_EXISTS = '이미 사용 중인 카테고리명입니다.'
export const CATEGORY_SELF_PARENT = '자기 자신을 상위 카테고리로 지정할 수 없습니다.'
export const CATEGORY_CHILD_PARENT = '하위 카테고리를 상위 카테고리로 지정할 수 없습니다.'
export const CATEGORY_HAS_CHILDREN = '하위 카테고리가 있어 삭제할 수 없습니다.'
export const CATEGORY_HAS_PRODUCTS = '연결된 제품이 있어 삭제할 수 없습니다.'
export const CATEGORY_DELETE_FAILED = '카테고리를 삭제하지 못했습니다.'
export const CATEGORY_SAVE_FAILED = '카테고리를 저장하지 못했습니다.'

export type CategoryNode = Category & {
  children: CategoryNode[]
}

export type CategorySaveBody = {
  name: string
  parentId: number | null
}

export function categoryForest(categories: Category[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>()
  for (const category of categories) {
    nodes.set(category.id, { ...category, children: [] })
  }
  const roots: CategoryNode[] = []
  for (const category of categories) {
    const node = nodes.get(category.id)
    if (!node) {
      continue
    }
    const parent = category.parentId === null ? undefined : nodes.get(category.parentId)
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function categoryChildren(categories: Category[], parentId: number | null) {
  return categories.filter((category) => category.parentId === parentId)
}

export function descendantIds(categories: Category[], categoryId: number) {
  const ids: number[] = []
  const walk = (parentId: number) => {
    for (const child of categories) {
      if (child.parentId !== parentId) {
        continue
      }
      ids.push(child.id)
      walk(child.id)
    }
  }
  walk(categoryId)
  return ids
}

export function categoryPathLabel(categories: Category[], categoryId: number) {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const names: string[] = []
  const seen = new Set<number>()
  let current = byId.get(categoryId)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    names.push(current.name)
    current = current.parentId === null ? undefined : byId.get(current.parentId)
  }
  return names.reverse().join(' > ')
}

export function parentChoices(categories: Category[], editingId: number | null) {
  if (editingId === null) {
    return categories
  }
  const blocked = new Set([editingId, ...descendantIds(categories, editingId)])
  return categories.filter((category) => !blocked.has(category.id))
}

export function validateCategoryName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return CATEGORY_NAME_REQUIRED
  }
  if (trimmed.length > 100) {
    return CATEGORY_NAME_TOO_LONG
  }
  return ''
}

export function parentSelectionError(categories: Category[], editingId: number | null, parentId: number | null) {
  if (editingId === null || parentId === null) {
    return ''
  }
  if (parentId === editingId) {
    return CATEGORY_SELF_PARENT
  }
  if (descendantIds(categories, editingId).includes(parentId)) {
    return CATEGORY_CHILD_PARENT
  }
  return ''
}

export function buildCategoryBody(
  categories: Category[],
  name: string,
  parentId: number | null,
  editingId: number | null,
): CategorySaveBody | null {
  if (validateCategoryName(name) || parentSelectionError(categories, editingId, parentId)) {
    return null
  }
  return { name: name.trim(), parentId }
}

export function categorySaveResult(result: ApiResult<Category>) {
  if (result.ok) {
    return { type: 'saved' as const, message: '' }
  }
  if (result.status === 409 && result.error?.code === 'CATEGORY_NAME_EXISTS') {
    return { type: 'name' as const, message: result.error.message || CATEGORY_NAME_EXISTS }
  }
  return { type: 'message' as const, message: adminErrorMessage(result, CATEGORY_SAVE_FAILED) }
}

export function canConfirmCategoryDelete(confirmOpen: boolean, submitting: boolean) {
  return confirmOpen && !submitting
}

export function categoryDeleteResult(result: ApiResult<Category>) {
  if (result.ok) {
    return { deleted: true, message: '' }
  }
  if (result.status === 409 && result.error?.code === 'CATEGORY_HAS_CHILDREN') {
    return { deleted: false, message: result.error.message || CATEGORY_HAS_CHILDREN }
  }
  if (result.status === 409 && result.error?.code === 'CATEGORY_HAS_PRODUCTS') {
    return { deleted: false, message: result.error.message || CATEGORY_HAS_PRODUCTS }
  }
  return { deleted: false, message: adminErrorMessage(result, CATEGORY_DELETE_FAILED) }
}

export function selectionAfterDelete(categories: Category[], deletedId: number) {
  return categories.find((category) => category.id === deletedId)?.parentId ?? null
}
