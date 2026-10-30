import type { CategorySaveBody } from '../categoryAdmin.ts'
import { apiRequest } from './client.ts'
import type { Category } from './types.ts'

export function createCategory(body: CategorySaveBody) {
  return apiRequest<Category>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCategory(categoryId: number, body: CategorySaveBody) {
  return apiRequest<Category>(`/api/admin/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteCategory(categoryId: number) {
  return apiRequest<Category>(`/api/admin/categories/${categoryId}`, {
    method: 'DELETE',
  })
}
