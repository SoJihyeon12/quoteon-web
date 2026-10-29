import type { CustomerSummary } from './customerList.ts'
import { priceQuote } from './quoteForm.ts'

export const QUOTE_PREVIEW_PATH = '/quotes/preview'
export const QUOTE_WORKBENCH_PATH = '/consultation?mode=new'

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
  lines: QuotePreviewLine[]
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

export function openQuotePreview(draft: QuotePreviewDraft) {
  const state = previewHistoryState(draft)
  window.history.replaceState(state, '', window.location.href)
  window.history.pushState(state, '', QUOTE_PREVIEW_PATH)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function returnToQuoteWorkbench(draft: QuotePreviewDraft | null) {
  window.history.pushState(draft ? previewHistoryState(draft) : null, '', QUOTE_WORKBENCH_PATH)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function clearQuotePreviewHistory() {
  if (quotePreviewFromHistory(window.history.state)) {
    window.history.replaceState(null, '', window.location.href)
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

function previewHistoryState(draft: QuotePreviewDraft) {
  return { source: 'quote-preview', draft }
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
    return {
      customer: parsed.customer ?? null,
      writtenOn: parsed.writtenOn,
      memo: parsed.memo,
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
