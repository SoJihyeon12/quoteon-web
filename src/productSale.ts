import type { ApiResult } from './api/types.ts'
import { PRODUCT_NOT_FOUND, type AdminProductDetail } from './adminProduct.ts'
import { adminErrorMessage } from './adminMemberList.ts'

export const PRODUCT_STOP_TITLE = '제품 판매 중지'
export const PRODUCT_STOP_MESSAGE_USED =
  '판매 중지하면 기존 견적에 포함된 제품 정보는 유지됩니다. 판매 중지하시겠습니까?'
export const PRODUCT_STOP_MESSAGE_UNUSED =
  '판매 중지하면 새 견적에서 해당 제품을 선택할 수 없습니다. 판매 중지하시겠습니까?'
/** @deprecated 와이어프레임 2.33/2.34 분리 메시지로 대체. 기존 테스트 호환용 */
export const PRODUCT_STOP_MESSAGE =
  '판매 중지하면 새 견적에서 해당 제품을 선택할 수 없습니다. 기존 견적에 담긴 제품 정보는 유지됩니다. 판매 중지하시겠습니까?'
export const PRODUCT_STOP_CANCEL = '취소'
export const PRODUCT_STOP_CONFIRM = '판매 중지'
export const PRODUCT_STOP_BLOCKED = '판매 중인 제품만 판매 중지할 수 있습니다.'
export const PRODUCT_STOP_FAILED = '제품을 판매 중지하지 못했습니다.'

export const PRODUCT_RESUME_TITLE = '제품 판매 재개'
export const PRODUCT_RESUME_MESSAGE =
  '판매를 재개하면 새 견적에서 이 제품을 다시 선택할 수 있습니다. 판매를 재개하시겠습니까?'
export const PRODUCT_RESUME_CANCEL = '취소'
export const PRODUCT_RESUME_CONFIRM = '판매 재개'
export const PRODUCT_RESUME_BLOCKED = '판매 중지된 제품만 판매를 재개할 수 있습니다.'
export const PRODUCT_RESUME_FAILED = '제품 판매를 재개하지 못했습니다.'

export const PRODUCT_DELETE_TITLE = '제품 삭제'
export const PRODUCT_DELETE_MESSAGE =
  '제품을 삭제하면 제품 목록에서 제거되며, 삭제 후에는 복구할 수 없습니다. 삭제하시겠습니까?'
export const PRODUCT_DELETE_CANCEL = '취소'
export const PRODUCT_DELETE_CONFIRM = '삭제'
export const PRODUCT_DELETE_ACK = '확인'
export const PRODUCT_IN_USE_MESSAGE =
  '해당 제품은 견적 내역에서 사용 중이므로 삭제할 수 없습니다. 판매 중지를 이용해 주세요.'
export const PRODUCT_DELETE_FAILED = '제품을 삭제하지 못했습니다.'

export function productStopMessage(usedInQuotes: boolean) {
  return usedInQuotes ? PRODUCT_STOP_MESSAGE_USED : PRODUCT_STOP_MESSAGE_UNUSED
}

export function productStopRequest(productId: number) {
  return {
    method: 'POST' as const,
    path: `/api/admin/products/${productId}/stop`,
    body: null,
  }
}

export function productResumeRequest(productId: number) {
  return {
    method: 'POST' as const,
    path: `/api/admin/products/${productId}/resume`,
    body: null,
  }
}

export function productDeleteRequest(productId: number) {
  return {
    method: 'DELETE' as const,
    path: `/api/admin/products/${productId}`,
    body: null,
  }
}

export function canStopProductSale(status: string) {
  return status === 'ACTIVE'
}

export function canConfirmProductStop(confirmOpen: boolean, submitting: boolean, status: string) {
  return confirmOpen && !submitting && canStopProductSale(status)
}

export function canResumeProductSale(status: string) {
  return status === 'INACTIVE'
}

export function canConfirmProductResume(confirmOpen: boolean, submitting: boolean, status: string) {
  return confirmOpen && !submitting && canResumeProductSale(status)
}

export function canConfirmProductDelete(confirmOpen: boolean, submitting: boolean) {
  return confirmOpen && !submitting
}

export function productStopOutcome(result: ApiResult<AdminProductDetail>) {
  if (result.ok) {
    return { type: 'stopped' as const, product: result.data, message: '' }
  }
  return {
    type: 'message' as const,
    product: null,
    message: adminErrorMessage(result, PRODUCT_STOP_FAILED),
  }
}

export function productResumeOutcome(result: ApiResult<AdminProductDetail>) {
  if (result.ok) {
    return { type: 'resumed' as const, product: result.data, message: '' }
  }
  return {
    type: 'message' as const,
    product: null,
    message: adminErrorMessage(result, PRODUCT_RESUME_FAILED),
  }
}

export function productDeleteOutcome(result: ApiResult<AdminProductDetail>) {
  if (result.ok) {
    return { type: 'deleted' as const, path: null, message: PRODUCT_NOT_FOUND }
  }
  if (result.status === 409 && result.error?.code === 'PRODUCT_IN_USE') {
    return { type: 'in-use' as const, path: null, message: PRODUCT_IN_USE_MESSAGE }
  }
  return {
    type: 'message' as const,
    path: null,
    message: adminErrorMessage(result, PRODUCT_DELETE_FAILED),
  }
}
