import type { ProductSaveBody } from '../adminProduct.ts'
import { adminProductsPath, type AdminProductDetail, type AdminProductPage, type ProductListQuery } from '../adminProduct.ts'
import { productDeleteRequest, productStopRequest } from '../productSale.ts'
import { apiRequest } from './client.ts'

export type DetailImageUpload = {
  productId: number
  imagePath: string
  sortOrder: number
}

export function fetchAdminProducts(query: ProductListQuery) {
  return apiRequest<AdminProductPage>(adminProductsPath(query))
}

export function fetchAdminProduct(productId: number) {
  return apiRequest<AdminProductDetail>(`/api/admin/products/${productId}`)
}

export function createAdminProduct(body: ProductSaveBody) {
  return apiRequest<AdminProductDetail>('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAdminProduct(productId: number, body: ProductSaveBody) {
  return apiRequest<AdminProductDetail>(`/api/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

function imageForm(file: File) {
  const body = new FormData()
  body.append('file', file)
  return body
}

export function uploadProductImage(productId: number, file: File) {
  return apiRequest<AdminProductDetail>(`/api/admin/products/${productId}/image`, {
    method: 'POST',
    body: imageForm(file),
  })
}

export function uploadProductDetailImage(productId: number, slot: number, file: File) {
  return apiRequest<DetailImageUpload>(`/api/admin/products/${productId}/detail-images/${slot}`, {
    method: 'POST',
    body: imageForm(file),
  })
}

export function stopAdminProduct(productId: number) {
  const request = productStopRequest(productId)
  return apiRequest<AdminProductDetail>(request.path, { method: request.method })
}

export function deleteAdminProduct(productId: number) {
  const request = productDeleteRequest(productId)
  return apiRequest<AdminProductDetail>(request.path, { method: request.method })
}
