import { productsPath, PRODUCT_PAGE_SIZE, type SalesProductDetail } from '../productCatalog.ts'
import { apiRequest } from './client.ts'
import type { Category, Product } from './types.ts'

export type ProductPage = {
  items: Product[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export function fetchCategories() {
  return apiRequest<Category[]>('/api/categories')
}

export function fetchProducts(query: {
  page: number
  keyword?: string
  categoryId?: number | null
  favoriteOnly?: boolean
}) {
  return apiRequest<ProductPage>(productsPath({ ...query, size: PRODUCT_PAGE_SIZE }))
}

export function fetchProduct(productId: number) {
  return apiRequest<SalesProductDetail>(`/api/products/${productId}`)
}
