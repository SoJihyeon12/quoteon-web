import type { ApiResult } from './api/types.ts'
import { adminErrorMessage } from './adminMemberList.ts'

export type QuoteDownloadKind = 'pdf' | 'png'

export const ADMIN_QUOTE_DOWNLOAD_UNAUTHORIZED = '로그인이 필요합니다.'
export const ADMIN_QUOTE_DOWNLOAD_FORBIDDEN = '다운로드 권한이 없습니다.'
export const ADMIN_QUOTE_DOWNLOAD_NOT_FOUND = '견적서를 찾을 수 없습니다.'
export const ADMIN_QUOTE_DOWNLOAD_GENERATION_FAILED = '견적 파일 생성에 실패했습니다.'
export const ADMIN_QUOTE_DOWNLOAD_FAILED = '견적 파일을 다운로드하지 못했습니다.'
export const ADMIN_QUOTE_BLOB_REVOKE_DELAY_MS = 10_000

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function adminQuoteDownloadPath(quoteId: number, kind: QuoteDownloadKind) {
  return kind === 'pdf' ? `/api/admin/quotes/${quoteId}/pdf` : `/api/admin/quotes/${quoteId}/image`
}

export function canStartAdminQuoteDownload(downloading: boolean) {
  return !downloading
}

export function adminQuoteDownloadNotice(kind: QuoteDownloadKind) {
  return kind === 'pdf' ? 'PDF 파일을 다운로드했습니다.' : '이미지 파일을 다운로드했습니다.'
}

export function contentDispositionFilename(header: string | null) {
  if (!header) {
    return null
  }
  const extended = /filename\*\s*=\s*([^;]+)/i.exec(header)
  if (extended) {
    const decoded = decodeRfc5987(extended[1].trim())
    if (decoded) {
      return decoded
    }
  }
  const quoted = /filename\s*=\s*"((?:\\.|[^"\\])*)"/i.exec(header)
  if (quoted) {
    return quoted[1].replace(/\\(.)/g, '$1')
  }
  const plain = /filename\s*=\s*([^;]+)/i.exec(header)
  if (plain) {
    return plain[1].trim().replace(/^"|"$/g, '')
  }
  return null
}

export function isPdfFile(bytes: Uint8Array) {
  return startsWith(bytes, PDF_MAGIC)
}

export function isPngFile(bytes: Uint8Array) {
  return startsWith(bytes, PNG_MAGIC)
}

export function adminQuoteDownloadReady(
  kind: QuoteDownloadKind,
  contentType: string,
  disposition: string | null,
  bytes: Uint8Array,
) {
  const mediaType = contentType.split(';')[0].trim().toLowerCase()
  const expectedType = kind === 'pdf' ? 'application/pdf' : 'image/png'
  const expectedExtension = kind === 'pdf' ? '.pdf' : '.png'
  const filename = contentDispositionFilename(disposition)
  const validBytes = kind === 'pdf' ? isPdfFile(bytes) : isPngFile(bytes)
  if (mediaType !== expectedType || !filename || !filename.toLowerCase().endsWith(expectedExtension) || !validBytes) {
    return null
  }
  return { filename, mediaType: expectedType }
}

export function adminQuoteDownloadError(result: ApiResult<unknown>) {
  if (result.ok) {
    return ''
  }
  if (result.status === 401) {
    return ADMIN_QUOTE_DOWNLOAD_UNAUTHORIZED
  }
  if (result.status === 403 && result.error?.code === 'FORBIDDEN') {
    return ADMIN_QUOTE_DOWNLOAD_FORBIDDEN
  }
  if (result.status === 404) {
    return result.error?.message || ADMIN_QUOTE_DOWNLOAD_NOT_FOUND
  }
  if (result.status === 500 && result.error?.code === 'DOCUMENT_GENERATION_FAILED') {
    return ADMIN_QUOTE_DOWNLOAD_GENERATION_FAILED
  }
  return adminErrorMessage(result, ADMIN_QUOTE_DOWNLOAD_FAILED)
}

export function saveAdminQuoteFile(filename: string, bytes: Uint8Array, mediaType: string) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy], { type: mediaType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, ADMIN_QUOTE_BLOB_REVOKE_DELAY_MS)
}

function decodeRfc5987(value: string) {
  const unquoted = value.replace(/^"(.*)"$/, '$1')
  const parts = unquoted.split("'")
  const encoded = parts.length >= 3 ? parts.slice(2).join("'") : unquoted
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

function startsWith(bytes: Uint8Array, magic: number[]) {
  if (bytes.length < magic.length) {
    return false
  }
  return magic.every((value, index) => bytes[index] === value)
}
