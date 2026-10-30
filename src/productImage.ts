import type { ApiResult } from './api/types.ts'
import { adminErrorMessage } from './adminMemberList.ts'
import type { ProductDetailImage } from './adminProduct.ts'

export const PRODUCT_IMAGE_ORIGIN = 'http://localhost:8080'
export const PRODUCT_IMAGE_TYPE_MESSAGE = 'JPEG 또는 PNG 이미지만 업로드할 수 있습니다.'
export const PRODUCT_IMAGE_SIZE_MESSAGE = '파일 크기는 5MB 이하여야 합니다.'
export const PRODUCT_IMAGE_EMPTY_MESSAGE = '빈 파일은 업로드할 수 없습니다.'
export const PRODUCT_IMAGE_UPLOAD_FAILED = '이미지를 업로드하지 못했습니다.'
export const PRODUCT_IMAGE_AFTER_CREATE_FAILED =
  '제품은 등록되었습니다. 이미지를 업로드하지 못했습니다. 이 화면에서 다시 선택해 주세요.'
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
export const DETAIL_IMAGE_SLOTS = [1, 2, 3] as const

export type ProductImageFile = {
  name: string
  size: number
  type: string
}

export function validateProductImage(file: ProductImageFile) {
  if (file.size <= 0) {
    return PRODUCT_IMAGE_EMPTY_MESSAGE
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return PRODUCT_IMAGE_SIZE_MESSAGE
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const jpeg = extension === 'jpg' || extension === 'jpeg' || file.type === 'image/jpeg'
  const png = extension === 'png' || file.type === 'image/png'
  if (extension && extension !== 'jpg' && extension !== 'jpeg' && extension !== 'png') {
    return PRODUCT_IMAGE_TYPE_MESSAGE
  }
  if (!jpeg && !png) {
    return PRODUCT_IMAGE_TYPE_MESSAGE
  }
  return ''
}

export function productImageUrl(imagePath: string | null | undefined) {
  const path = imagePath?.trim() ?? ''
  if (!path) {
    return null
  }
  if (/^https?:\/\//.test(path)) {
    return path
  }
  return `${PRODUCT_IMAGE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

export function detailImagePath(images: ProductDetailImage[] | null | undefined, slot: number) {
  return images?.find((image) => image.sortOrder === slot)?.imagePath ?? null
}

export function replaceDetailImage(images: ProductDetailImage[] | null | undefined, slot: number, imagePath: string) {
  const kept = (images ?? []).filter((image) => image.sortOrder !== slot)
  kept.push({ id: 0, imagePath, sortOrder: slot })
  return kept.sort((left, right) => left.sortOrder - right.sortOrder)
}

export function imageUploadMessage(result: ApiResult<unknown>) {
  if (result.ok) {
    return ''
  }
  if (result.error?.code === 'INVALID_IMAGE' && result.error.message) {
    return result.error.message
  }
  return adminErrorMessage(result, PRODUCT_IMAGE_UPLOAD_FAILED)
}

export function shouldUploadImages(productCreated: boolean, hasImage: boolean) {
  return productCreated && hasImage
}
