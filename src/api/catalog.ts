import { apiRequest } from './client.ts'
import type { Category, Product } from './types.ts'

export function fetchCategories() {
  return apiRequest<Category[]>('/api/categories')
}

export function fetchProducts(keyword?: string) {
  const trimmed = keyword?.trim()
  const path = trimmed ? `/api/products?keyword=${encodeURIComponent(trimmed)}` : '/api/products'
  return apiRequest<Product[]>(path)
}
