import type { CustomerSummary } from './customerList.ts'
import { priceQuote } from './quoteForm.ts'

export const QUOTE_PREVIEW_PATH = '/quotes/preview'
export const QUOTE_WORKBENCH_PATH = '/consultation?mode=new'
export const PREVIEW_DOCUMENT_REQUIRES_SAVED_QUOTE =
  '견적을 저장한 뒤 PDF·JPEG·PNG 저장과 이메일 전송을 사용할 수 있습니다.'

export type QuotePreviewLine = {
  productId: number
  productCode: string
  name: string
  salePrice: number
  quantity: string
}

export type QuotePreviewDraft = {
  customer: CustomerSummary | null
  writtenOn: string
  memo: string
  paymentMethod?: 'CASH' | 'CARD' | ''
  quoteId?: number | null
  lines: QuotePreviewLine[]
}

export function previewSavedQuoteId(draft: QuotePreviewDraft | null | undefined) {
  if (!draft || draft.quoteId == null) {
    return null
  }
  return Number.isSafeInteger(draft.quoteId) && draft.quoteId > 0 ? draft.quoteId : null
}

export type QuotePreviewRow = {
  productId: number
  name: string
  productCode: string
  quantity: string
  unitPrice: number
  amount: number | null
}

export function previewQuote(draft: QuotePreviewDraft) {
  const pending: Array<{ row: QuotePreviewRow; quantity: number | null }> = draft.lines.map((line) => {
    const quantity = parseQuantity(line.quantity)
    return {
      quantity,
      row: {
        productId: line.productId,
        name: line.name,
        productCode: line.productCode,
        quantity: line.quantity,
        unitPrice: line.salePrice,
        amount: null,
      },
    }
  })
  const priced = priceQuote(
    pending.flatMap((item) => (item.quantity === null ? [] : [{ salePrice: item.row.unitPrice, quantity: item.quantity }])),
  )
  let pricedIndex = 0
  const rows = pending.map((item) => {
    if (item.quantity === null) {
      return item.row
    }
    const amount = priced.amounts[pricedIndex] ?? 0
    pricedIndex += 1
    return { ...item.row, amount }
  })
  return {
    customerName: draft.customer?.name ?? '',
    writtenOn: draft.writtenOn,
    rows,
    supplyAmount: priced.supplyAmount,
    vatAmount: priced.vatAmount,
    totalAmount: priced.totalAmount,
  }
}

export function quotePreviewReturnPath(state: unknown) {
  if (!state || typeof state !== 'object' || !('returnPath' in state)) {
    return QUOTE_WORKBENCH_PATH
  }
  const returnPath = state.returnPath
  if (typeof returnPath !== 'string' || !returnPath.startsWith('/consultation')) {
    return QUOTE_WORKBENCH_PATH
  }
  return returnPath
}

export function openQuotePreview(draft: QuotePreviewDraft, returnPath?: string) {
  const page = globalThis.window
  const resolvedReturnPath =
    typeof returnPath === 'string' && returnPath.startsWith('/consultation')
      ? returnPath
      : `${page.location.pathname}${page.location.search}`
  const state = previewHistoryState(draft, resolvedReturnPath)
  page.history.replaceState(state, '', resolvedReturnPath)
  page.history.pushState(state, '', QUOTE_PREVIEW_PATH)
  page.dispatchEvent(new Event('popstate'))
}

export function returnToQuoteWorkbench(draft: QuotePreviewDraft | null) {
  const page = globalThis.window
  const returnPath = quotePreviewReturnPath(page.history.state)
  page.history.pushState(draft ? previewHistoryState(draft, returnPath) : null, '', returnPath)
  page.dispatchEvent(new Event('popstate'))
}

export function clearQuotePreviewHistory() {
  const page = globalThis.window
  if (quotePreviewFromHistory(page.history.state)) {
    page.history.replaceState(null, '', page.location.href)
  }
}

export function quotePreviewFromHistory(state: unknown) {
  if (!state || typeof state !== 'object' || !('source' in state) || state.source !== 'quote-preview') {
    return null
  }
  if (!('draft' in state)) {
    return null
  }
  return readQuotePreview(JSON.stringify(state.draft))
}

function previewHistoryState(draft: QuotePreviewDraft, returnPath: string) {
  return { source: 'quote-preview', draft, returnPath }
}

export function readQuotePreview(raw: string | null): QuotePreviewDraft | null {
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<QuotePreviewDraft>
    if (typeof parsed.writtenOn !== 'string' || typeof parsed.memo !== 'string' || !Array.isArray(parsed.lines)) {
      return null
    }
    if (parsed.customer !== null && !isCustomer(parsed.customer)) {
      return null
    }
    if (!parsed.lines.every(isLine)) {
      return null
    }
    const paymentMethod =
      parsed.paymentMethod === 'CASH' || parsed.paymentMethod === 'CARD' || parsed.paymentMethod === ''
        ? parsed.paymentMethod
        : ''
    const quoteId =
      typeof parsed.quoteId === 'number' && Number.isSafeInteger(parsed.quoteId) && parsed.quoteId > 0
        ? parsed.quoteId
        : null
    return {
      customer: parsed.customer ?? null,
      writtenOn: parsed.writtenOn,
      memo: parsed.memo,
      paymentMethod,
      quoteId,
      lines: parsed.lines,
    }
  } catch {
    return null
  }
}

function isCustomer(value: unknown): value is CustomerSummary {
  if (!value || typeof value !== 'object') {
    return false
  }
  const customer = value as CustomerSummary
  return (
    Number.isSafeInteger(customer.id) &&
    typeof customer.name === 'string' &&
    (customer.phone === null || typeof customer.phone === 'string') &&
    typeof customer.customerType === 'string'
  )
}

function isLine(value: unknown): value is QuotePreviewLine {
  if (!value || typeof value !== 'object') {
    return false
  }
  const line = value as QuotePreviewLine
  return (
    Number.isSafeInteger(line.productId) &&
    typeof line.productCode === 'string' &&
    typeof line.name === 'string' &&
    typeof line.salePrice === 'number' &&
    typeof line.quantity === 'string'
  )
}

function parseQuantity(value: string) {
  const trimmed = value.trim()
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null
  }
  const quantity = Number(trimmed)
  if (!Number.isSafeInteger(quantity)) {
    return null
  }
  return quantity
}
