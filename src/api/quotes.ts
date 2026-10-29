import type { CreateQuoteBody } from '../quoteForm.ts'
import { QUOTE_PAGE_SIZE, quotesPath, type QuotePage } from '../quoteList.ts'
import { apiRequest } from './client.ts'

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
  salePrice: number
  quantity: number
  amount: number
}

export type QuoteDetail = CreatedQuote & {
  items: QuoteItem[]
}

export function fetchQuotes(page: number) {
  return apiRequest<QuotePage>(quotesPath(page, QUOTE_PAGE_SIZE))
}

export function fetchQuote(quoteId: number) {
  return apiRequest<QuoteDetail>(`/api/quotes/${quoteId}`)
}

export function createQuote(body: CreateQuoteBody) {
  return apiRequest<CreatedQuote>('/api/quotes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
