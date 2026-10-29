import type { ApiResult } from './api/types.ts'
import { customerErrorMessage } from './customerList.ts'

export const CUSTOMER_DEACTIVATE_TITLE = '고객 비활성화'
export const CUSTOMER_DEACTIVATE_MESSAGE =
  '고객을 비활성화하면 신규 견적에서 선택할 수 없습니다.\n기존 견적 정보는 유지됩니다. 계속하시겠습니까?'
export const CUSTOMER_DEACTIVATE_CANCEL = '취소'
export const CUSTOMER_DEACTIVATE_CONFIRM = '고객 비활성화'
export const CUSTOMER_LIST_PATH = '/customers'

export function canConfirmDeactivate(dialogOpen: boolean, submitting: boolean) {
  return dialogOpen && !submitting
}

export function deactivateOutcome(result: ApiResult<unknown>) {
  if (result.ok) {
    return { path: CUSTOMER_LIST_PATH, message: '' }
  }
  return {
    path: null,
    message: customerErrorMessage(result, '고객을 비활성화하지 못했습니다.'),
  }
}
