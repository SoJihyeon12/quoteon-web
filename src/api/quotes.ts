import { QUOTE_PAGE_SIZE, quotesPath, type QuotePage } from '../quoteList.ts'
import { apiRequest } from './client.ts'

export function fetchQuotes(page: number) {
  return apiRequest<QuotePage>(quotesPath(page, QUOTE_PAGE_SIZE))
}
