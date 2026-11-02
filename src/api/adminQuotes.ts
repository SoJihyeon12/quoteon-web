import {
  adminQuotesRequestPath,
  type AdminQuoteDetail,
  type AdminQuoteListQuery,
  type AdminQuotePage,
} from '../adminQuote.ts'
import { apiRequest } from './client.ts'

export function fetchAdminQuotes(query: AdminQuoteListQuery) {
  return apiRequest<AdminQuotePage>(adminQuotesRequestPath(query))
}

export function fetchAdminQuote(quoteId: number) {
  return apiRequest<AdminQuoteDetail>(`/api/admin/quotes/${quoteId}`)
}
