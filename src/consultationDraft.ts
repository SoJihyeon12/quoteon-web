export const CANCEL_QUOTE_DIALOG = 'cancel-quote'
export const NEW_CONSULTATION_DIALOG = 'new-consultation'

export const CANCEL_QUOTE_TITLE = '견적 취소'
export const CANCEL_QUOTE_MESSAGE =
  '작성 중인 견적을 취소하면 현재 고객과 제품 작성 내용이 삭제됩니다.\n계속하시겠습니까?'
export const NEW_CONSULTATION_TITLE = '새 상담 시작'
export const NEW_CONSULTATION_MESSAGE =
  '새 상담을 시작하면 현재 작성 중인 견적 정보가 초기화됩니다.\n계속하시겠습니까?'

const DIALOGS = [CANCEL_QUOTE_DIALOG, NEW_CONSULTATION_DIALOG] as const

export type ConsultationDialog = (typeof DIALOGS)[number]

export type QuoteDraft = {
  customerSelected: boolean
  lineCount: number
  memo: string
}

export function consultationDialog(value: string | null): ConsultationDialog | null {
  if (value === CANCEL_QUOTE_DIALOG || value === NEW_CONSULTATION_DIALOG) {
    return value
  }
  return null
}

export function hasInProgressQuote(draft: QuoteDraft) {
  return draft.customerSelected || draft.lineCount > 0 || draft.memo.trim() !== ''
}

export function consultationDialogPath(currentSearch: string, dialog: ConsultationDialog | null) {
  const normalized = currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch
  const params = new URLSearchParams(normalized)
  if (dialog) {
    params.set('dialog', dialog)
  } else {
    params.delete('dialog')
  }
  const query = params.toString()
  return query ? `/consultation?${query}` : '/consultation'
}
