import {
  adminQuotesRequestPath,
  type AdminQuoteDetail,
  type AdminQuoteListQuery,
  type AdminQuotePage,
} from '../adminQuote.ts'
import { adminQuoteDownloadPath, type QuoteDownloadKind } from '../adminQuoteDownload.ts'
import { apiDownload, apiRequest } from './client.ts'

export function fetchAdminQuotes(query: AdminQuoteListQuery) {
  return apiRequest<AdminQuotePage>(adminQuotesRequestPath(query))
}

export function fetchAdminQuote(quoteId: number) {
  return apiRequest<AdminQuoteDetail>(`/api/admin/quotes/${quoteId}`)
}

export function deleteAdminQuote(quoteId: number) {
  return apiRequest<void>(`/api/admin/quotes/${quoteId}`, { method: 'DELETE' })
}

export function updateAdminQuotePrivacy(quoteId: number, isPrivate: boolean) {
  return apiRequest<AdminQuoteDetail>(`/api/admin/quotes/${quoteId}/privacy`, {
    method: 'PATCH',
    body: JSON.stringify({ isPrivate }),
  })
}

export function downloadAdminQuote(quoteId: number, kind: QuoteDownloadKind) {
  return apiDownload(adminQuoteDownloadPath(quoteId, kind))
}
