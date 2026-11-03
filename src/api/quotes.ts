import type { CreateQuoteBody } from '../quoteForm.ts'
import { salesQuoteDownloadPath, type SalesQuoteDownloadKind } from '../quoteDownload.ts'
import {
  quoteEmailHistoriesPath,
  quoteEmailRetryPath,
  quoteEmailSendPath,
  type QuoteEmailHistoryList,
  type QuoteEmailRequest,
  type QuoteEmailResult,
} from '../quoteEmail.ts'
import { QUOTE_PAGE_SIZE, quotesPath, type QuotePage } from '../quoteList.ts'
import { apiDownload, apiRequest } from './client.ts'

export type CreatedQuote = {
  id: number
  quoteNumber: string
  customerId: number
  customerName: string
  supplyAmount: number
  vatAmount: number
  totalAmount: number
  status: string
  quoteDate: string
  createdAt: string
}

export type QuoteItem = {
  id: number
  productId: number
  productName: string
  productCode: string
  specification: string | null
  specificationSource: string | null
  salePrice: number
  quantity: number
  amount: number
}

export type QuoteDetail = CreatedQuote & {
  memo: string | null
  paymentMethod: 'CASH' | 'CARD' | null
  items: QuoteItem[]
}

export function fetchQuotes(page: number, customerName = '', quoteDate = '') {
  return apiRequest<QuotePage>(quotesPath({ page, size: QUOTE_PAGE_SIZE, customerName, quoteDate }))
}

export function fetchQuote(quoteId: number) {
  return apiRequest<QuoteDetail>(`/api/quotes/${quoteId}`)
}

export function downloadQuote(quoteId: number, kind: SalesQuoteDownloadKind) {
  return apiDownload(salesQuoteDownloadPath(quoteId, kind))
}

export function fetchQuoteEmailHistories(quoteId: number) {
  return apiRequest<QuoteEmailHistoryList>(quoteEmailHistoriesPath(quoteId))
}

export function sendQuoteEmail(quoteId: number, body: QuoteEmailRequest) {
  return apiRequest<QuoteEmailResult>(quoteEmailSendPath(quoteId), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function retryQuoteEmail(quoteId: number, historyId: number, body: QuoteEmailRequest) {
  return apiRequest<QuoteEmailResult>(quoteEmailRetryPath(quoteId, historyId), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createQuote(body: CreateQuoteBody) {
  return apiRequest<CreatedQuote>('/api/quotes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateQuote(quoteId: number, body: CreateQuoteBody) {
  return apiRequest<QuoteDetail>(`/api/quotes/${quoteId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
