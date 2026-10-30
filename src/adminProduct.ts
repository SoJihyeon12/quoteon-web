import type { ApiResult } from './api/types.ts'
import { ADMIN_PRODUCTS_PATH } from './adminMenu.ts'
import { adminErrorMessage } from './adminMemberList.ts'

export const ADMIN_PRODUCT_PAGE_SIZE = 10
export const PRODUCT_CATEGORY_REQUIRED = '카테고리를 선택해 주세요.'
export const PRODUCT_NAME_REQUIRED = '제품명을 입력해 주세요.'
export const PRODUCT_NAME_TOO_LONG = '제품명은 255자 이하로 입력해 주세요.'
export const PRODUCT_CODE_REQUIRED = '제품 코드를 입력해 주세요.'
export const PRODUCT_CODE_TOO_LONG = '제품 코드는 100자 이하로 입력해 주세요.'
export const PRODUCT_CODE_EXISTS = '이미 사용 중인 제품 코드입니다.'
export const PRODUCT_UNIT_PRICE_REQUIRED = '단가를 입력해 주세요.'
export const PRODUCT_UNIT_PRICE_INVALID = '단가는 소수점 둘째 자리까지, 정수 10자리 이하로 입력해 주세요.'
export const PRODUCT_SALE_PRICE_REQUIRED = '판매 가격을 입력해 주세요.'
export const PRODUCT_SALE_PRICE_INVALID = '판매 가격은 소수점 둘째 자리까지, 정수 10자리 이하로 입력해 주세요.'
export const PRODUCT_SPEC_TOO_LONG = '규격은 500자 이하로 입력해 주세요.'
export const PRODUCT_NOT_FOUND = '제품을 찾을 수 없습니다.'
export const PRODUCT_SAVE_FAILED = '제품을 저장하지 못했습니다.'

const PRICE_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '판매중',
  INACTIVE: '판매중지',
}

export type AdminProductSummary = {
  id: number
  imagePath: string | null
  name: string
  productCode: string
  salePrice: number
  status: string
}

export type AdminProductPage = {
  items: AdminProductSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ProductDetailImage = {
  id: number
  imagePath: string
  sortOrder: number
}

export type AdminProductDetail = {
  id: number
  categoryId: number
  categoryName: string
  name: string
  productCode: string
  unitPrice: number
  salePrice: number
  specification: string | null
  description: string | null
  imagePath: string | null
  status: string
  detailImages?: ProductDetailImage[]
}

export type ProductSaveBody = {
  categoryId: number
  name: string
  productCode: string
  unitPrice: number
  salePrice: number
  specification: string | null
  description: string | null
}

export type ProductFormValues = {
  categoryId: string
  name: string
  productCode: string
  unitPrice: string
  salePrice: string
  specification: string
  description: string
}

export type ProductFormErrors = {
  categoryId?: string
  name?: string
  productCode?: string
  unitPrice?: string
  salePrice?: string
  specification?: string
}

export type ProductListQuery = {
  page: number
  keyword: string
  categoryId: number | null
  salePrice: string
  status: string
}

export function productStatusLabel(status: string) {
  return STATUS_LABEL[status] ?? status
}

export function formatProductPrice(value: number) {
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value)}원`
}

export function adminProductsPath(query: ProductListQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('size', String(ADMIN_PRODUCT_PAGE_SIZE))
  const keyword = query.keyword.trim()
  if (keyword) {
    params.set('keyword', keyword)
  }
  if (query.categoryId !== null) {
    params.set('categoryId', String(query.categoryId))
  }
  const salePrice = query.salePrice.trim()
  if (salePrice) {
    params.set('salePrice', salePrice)
  }
  const status = query.status.trim()
  if (status) {
    params.set('status', status)
  }
  return `/api/admin/products?${params.toString()}`
}

export function validateSalePriceFilter(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  if (!PRICE_PATTERN.test(trimmed)) {
    return PRODUCT_SALE_PRICE_INVALID
  }
  return ''
}

export function validateProductForm(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {}
  const name = values.name.trim()
  const productCode = values.productCode.trim()
  const unitPrice = values.unitPrice.trim()
  const salePrice = values.salePrice.trim()
  const specification = values.specification.trim()
  if (!values.categoryId) {
    errors.categoryId = PRODUCT_CATEGORY_REQUIRED
  }
  if (!name) {
    errors.name = PRODUCT_NAME_REQUIRED
  } else if (name.length > 255) {
    errors.name = PRODUCT_NAME_TOO_LONG
  }
  if (!productCode) {
    errors.productCode = PRODUCT_CODE_REQUIRED
  } else if (productCode.length > 100) {
    errors.productCode = PRODUCT_CODE_TOO_LONG
  }
  if (!unitPrice) {
    errors.unitPrice = PRODUCT_UNIT_PRICE_REQUIRED
  } else if (!PRICE_PATTERN.test(unitPrice)) {
    errors.unitPrice = PRODUCT_UNIT_PRICE_INVALID
  }
  if (!salePrice) {
    errors.salePrice = PRODUCT_SALE_PRICE_REQUIRED
  } else if (!PRICE_PATTERN.test(salePrice)) {
    errors.salePrice = PRODUCT_SALE_PRICE_INVALID
  }
  if (specification.length > 500) {
    errors.specification = PRODUCT_SPEC_TOO_LONG
  }
  return errors
}

export function buildProductBody(values: ProductFormValues): ProductSaveBody | null {
  if (Object.keys(validateProductForm(values)).length > 0) {
    return null
  }
  const specification = values.specification.trim()
  const description = values.description.trim()
  return {
    categoryId: Number(values.categoryId),
    name: values.name.trim(),
    productCode: values.productCode.trim(),
    unitPrice: Number(values.unitPrice.trim()),
    salePrice: Number(values.salePrice.trim()),
    specification: specification ? specification : null,
    description: description ? description : null,
  }
}

export function productSaveResult(result: ApiResult<AdminProductDetail>) {
  if (result.ok) {
    return { type: 'saved' as const, path: ADMIN_PRODUCTS_PATH, message: '' }
  }
  if (result.status === 409 && result.error?.code === 'PRODUCT_CODE_EXISTS') {
    return { type: 'code' as const, path: null, message: result.error.message || PRODUCT_CODE_EXISTS }
  }
  if (result.status === 404) {
    return { type: 'message' as const, path: null, message: result.error?.message || PRODUCT_NOT_FOUND }
  }
  return { type: 'message' as const, path: null, message: adminErrorMessage(result, PRODUCT_SAVE_FAILED) }
}

export function expectedProductPages(totalElements: number) {
  if (totalElements <= 0) {
    return 0
  }
  return Math.ceil(totalElements / ADMIN_PRODUCT_PAGE_SIZE)
}

export function visibleProductCount(totalElements: number, page: number) {
  const start = page * ADMIN_PRODUCT_PAGE_SIZE
  return Math.max(0, Math.min(ADMIN_PRODUCT_PAGE_SIZE, totalElements - start))
}

export function canGoToPreviousProductPage(page: number) {
  return page > 0
}

export function canGoToNextProductPage(page: number, totalPages: number) {
  return totalPages > 0 && page + 1 < totalPages
}

export function pageAfterProductSearch() {
  return 0
}
