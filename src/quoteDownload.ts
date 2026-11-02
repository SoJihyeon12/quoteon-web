import {
  contentDispositionFilename,
  isPdfFile,
  isPngFile,
  saveAdminQuoteFile,
} from './adminQuoteDownload.ts'
import type { ApiResult } from './api/types.ts'
import { quoteErrorMessage } from './quoteList.ts'

export type SalesQuoteDownloadKind = 'pdf' | 'jpeg' | 'png'

export const SALES_QUOTE_DOWNLOAD_FAILED = '견적 파일을 다운로드하지 못했습니다.'

const JPEG_MAGIC = [0xff, 0xd8, 0xff]

const FILE_RULE: Record<SalesQuoteDownloadKind, { mediaType: string; extension: string }> = {
  pdf: { mediaType: 'application/pdf', extension: '.pdf' },
  jpeg: { mediaType: 'image/jpeg', extension: '.jpg' },
  png: { mediaType: 'image/png', extension: '.png' },
}

export function salesQuoteDownloadPath(quoteId: number, kind: SalesQuoteDownloadKind) {
  return `/api/quotes/${quoteId}/${kind}`
}

export function canStartSalesQuoteDownload(downloading: boolean) {
  return !downloading
}

export function isJpegFile(bytes: Uint8Array) {
  if (bytes.length < JPEG_MAGIC.length) {
    return false
  }
  return JPEG_MAGIC.every((value, index) => bytes[index] === value)
}

export function salesQuoteDownloadReady(
  kind: SalesQuoteDownloadKind,
  contentType: string,
  disposition: string | null,
  bytes: Uint8Array,
) {
  const rule = FILE_RULE[kind]
  const mediaType = contentType.split(';')[0].trim().toLowerCase()
  const filename = contentDispositionFilename(disposition)
  const validBytes = kind === 'pdf' ? isPdfFile(bytes) : kind === 'jpeg' ? isJpegFile(bytes) : isPngFile(bytes)
  if (
    mediaType !== rule.mediaType
    || !filename
    || !filename.toLowerCase().endsWith(rule.extension)
    || !validBytes
  ) {
    return null
  }
  return { filename, mediaType: rule.mediaType }
}

export function salesQuoteDownloadError(result: ApiResult<unknown>) {
  return quoteErrorMessage(result, SALES_QUOTE_DOWNLOAD_FAILED)
}

export function saveSalesQuoteFile(filename: string, bytes: Uint8Array, mediaType: string) {
  saveAdminQuoteFile(filename, bytes, mediaType)
}
