import { useEffect, useRef, useState } from 'react'
import { ADMIN_QUOTES_PATH, adminQuoteDetailPath } from '../adminMenu.ts'
import {
  ADMIN_QUOTE_DELETE_CANCEL,
  ADMIN_QUOTE_DELETE_CONFIRM,
  ADMIN_QUOTE_DELETE_FAILED,
  ADMIN_QUOTE_DELETE_MESSAGE,
  ADMIN_QUOTE_DELETE_TITLE,
  ADMIN_QUOTE_DETAIL_FAILED,
  ADMIN_QUOTE_NOT_FOUND,
  ADMIN_QUOTE_PRIVACY_CANCEL,
  ADMIN_QUOTE_PRIVACY_FAILED,
  ADMIN_QUOTE_PRIVATE_CONFIRM,
  ADMIN_QUOTE_PRIVATE_DONE,
  ADMIN_QUOTE_PRIVATE_MESSAGE,
  ADMIN_QUOTE_PRIVATE_TITLE,
  ADMIN_QUOTE_PUBLIC_CONFIRM,
  ADMIN_QUOTE_PUBLIC_DONE,
  ADMIN_QUOTE_PUBLIC_MESSAGE,
  ADMIN_QUOTE_PUBLIC_TITLE,
  adminQuoteErrorMessage,
  adminQuoteStatusLabel,
  adminQuoteText,
  type AdminQuoteDetail,
} from '../adminQuote.ts'
import { deleteAdminQuote, downloadAdminQuote, fetchAdminQuote, updateAdminQuotePrivacy } from '../api/adminQuotes.ts'
import {
  adminQuoteDownloadError,
  adminQuoteDownloadNotice,
  adminQuoteDownloadReady,
  canStartAdminQuoteDownload,
  saveAdminQuoteFile,
  type QuoteDownloadKind,
} from '../adminQuoteDownload.ts'
import FormalQuoteDocument from '../components/FormalQuoteDocument.tsx'
import { navigate } from '../navigation.ts'
import { formalQuoteLinesFromAdminItems } from '../quoteViewDocument.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'
import './FormalQuoteDocument.css'
import './AdminQuoteDetailPage.css'

export default function AdminQuoteDetailPage({ quoteId }: { quoteId: number }) {
  return (
    <AdminShell currentPath={adminQuoteDetailPath(quoteId)}>
      <QuoteDetail quoteId={quoteId} />
    </AdminShell>
  )
}

function isAdminQuoteDetail(value: AdminQuoteDetail | undefined): value is AdminQuoteDetail {
  return Boolean(
    value &&
      typeof value.quoteNumber === 'string' &&
      value.customer &&
      Array.isArray(value.items) &&
      typeof value.isPrivate === 'boolean',
  )
}

function statusTone(status: string) {
  if (status === 'DRAFT') {
    return 'draft'
  }
  if (status === 'SENT') {
    return 'sent'
  }
  return 'other'
}

function QuoteDetail({ quoteId }: { quoteId: number }) {
  const [quote, setQuote] = useState<AdminQuoteDetail | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadMessage, setLoadMessage] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadKind, setDownloadKind] = useState<QuoteDownloadKind | null>(null)
  const [downloadNotice, setDownloadNotice] = useState('')
  const [downloadMessage, setDownloadMessage] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacyBusy, setPrivacyBusy] = useState(false)
  const [privacyMessage, setPrivacyMessage] = useState('')
  const [privacyNotice, setPrivacyNotice] = useState('')
  const downloadRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchAdminQuote(quoteId).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !isAdminQuoteDetail(result.data)) {
        setQuote(null)
        setLoadState('error')
        setLoadMessage(adminQuoteErrorMessage(result, result.status === 404 ? ADMIN_QUOTE_NOT_FOUND : ADMIN_QUOTE_DETAIL_FAILED))
        return
      }
      setQuote(result.data)
      setLoadMessage('')
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [quoteId])

  async function confirmDelete() {
    if (deleting) {
      return
    }
    setDeleting(true)
    setDeleteMessage('')
    const result = await deleteAdminQuote(quoteId)
    if (redirectOnAccessFailure(result)) {
      return
    }
    if (!result.ok) {
      setDeleting(false)
      setDeleteMessage(adminQuoteErrorMessage(result, ADMIN_QUOTE_DELETE_FAILED))
      return
    }
    navigate(ADMIN_QUOTES_PATH)
  }

  async function confirmPrivacy() {
    if (!quote || privacyBusy) {
      return
    }
    const nextPrivate = !quote.isPrivate
    setPrivacyBusy(true)
    setPrivacyMessage('')
    setPrivacyNotice('')
    const result = await updateAdminQuotePrivacy(quoteId, nextPrivate)
    if (redirectOnAccessFailure(result)) {
      return
    }
    if (!result.ok || !isAdminQuoteDetail(result.data)) {
      setPrivacyBusy(false)
      setPrivacyMessage(adminQuoteErrorMessage(result, ADMIN_QUOTE_PRIVACY_FAILED))
      return
    }
    setQuote(result.data)
    setPrivacyBusy(false)
    setPrivacyOpen(false)
    setPrivacyNotice(nextPrivate ? ADMIN_QUOTE_PRIVATE_DONE : ADMIN_QUOTE_PUBLIC_DONE)
  }

  async function download(kind: QuoteDownloadKind) {
    if (!canStartAdminQuoteDownload(downloadRef.current)) {
      return
    }
    downloadRef.current = true
    setDownloading(true)
    setDownloadKind(kind)
    setDownloadNotice('')
    setDownloadMessage('')
    try {
      const result = await downloadAdminQuote(quoteId, kind)
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        setDownloadMessage(adminQuoteDownloadError(result))
        return
      }
      const ready = adminQuoteDownloadReady(kind, result.data.contentType, result.data.disposition, result.data.bytes)
      if (!ready) {
        setDownloadMessage(adminQuoteDownloadError({ ok: false, status: result.status, error: null }))
        return
      }
      saveAdminQuoteFile(ready.filename, result.data.bytes, ready.mediaType)
      setDownloadNotice(adminQuoteDownloadNotice(kind))
    } finally {
      downloadRef.current = false
      setDownloading(false)
      setDownloadKind(null)
    }
  }

  return (
    <>
      <header className="admin-heading">
        <h1>견적서</h1>
      </header>
      <section className="admin-product-panel admin-quote-detail" aria-labelledby="admin-quote-detail-title">
        <div className="admin-edit-head">
          <h2 id="admin-quote-detail-title">견적서 상세</h2>
        </div>
        {loadState === 'loading' ? <p role="status">견적서를 불러오는 중입니다.</p> : null}
        {loadState === 'error' ? <p className="admin-message" role="alert">{loadMessage || ADMIN_QUOTE_NOT_FOUND}</p> : null}
        {loadState === 'ready' && quote ? (
          <div className="admin-quote-detail-layout">
            <article className="admin-quote-document" aria-label="견적서 본문">
              <FormalQuoteDocument
                titleId="admin-quote-document-title"
                authorName={quote.authorName}
                customerName={adminQuoteText(quote.customer.name)}
                quoteDate={quote.quoteDate}
                totalAmount={quote.totalAmount}
                supplyAmount={quote.supplyAmount}
                vatAmount={quote.vatAmount}
                lines={formalQuoteLinesFromAdminItems(quote.items)}
              />
            </article>

            <aside className="admin-quote-side" aria-label="견적 관리 정보">
              <div className="admin-quote-side-head">
                <h3>관리 정보</h3>
                <button
                  type="button"
                  className="admin-edit-close"
                  aria-label="목록으로"
                  onClick={() => navigate(ADMIN_QUOTES_PATH)}
                >
                  ×
                </button>
              </div>

              <dl className="admin-quote-side-meta">
                <div>
                  <dt>견적번호</dt>
                  <dd>{quote.quoteNumber}</dd>
                </div>
                <div>
                  <dt>작성자</dt>
                  <dd>{adminQuoteText(quote.authorName)}</dd>
                </div>
                <div>
                  <dt>고객</dt>
                  <dd>{adminQuoteText(quote.customer.name)}</dd>
                </div>
                <div>
                  <dt>견적일</dt>
                  <dd>
                    <time dateTime={quote.quoteDate}>{quote.quoteDate}</time>
                  </dd>
                </div>
                <div>
                  <dt>상태</dt>
                  <dd>
                    <span className={`admin-quote-status admin-quote-status-${statusTone(quote.status)}`}>
                      {adminQuoteStatusLabel(quote.status)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>공개 여부</dt>
                  <dd>
                    <span className={`admin-quote-privacy admin-quote-privacy-${quote.isPrivate ? 'private' : 'public'}`}>
                      {quote.isPrivate ? '비공개' : '공개'}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="admin-quote-side-memo">
                <h4>메모</h4>
                <p>{adminQuoteText(quote.memo)}</p>
              </div>

              <div className="admin-quote-side-actions">
                <button type="button" className="admin-quote-action-primary" disabled={downloading} onClick={() => void download('pdf')}>
                  {downloading && downloadKind === 'pdf' ? '다운로드 중' : 'PDF 다운로드'}
                </button>
                <button type="button" className="admin-quote-action-primary" disabled={downloading} onClick={() => void download('png')}>
                  {downloading && downloadKind === 'png' ? '다운로드 중' : '이미지 다운로드'}
                </button>
                <button
                  type="button"
                  className="admin-quote-action-privacy"
                  onClick={() => {
                    setPrivacyMessage('')
                    setPrivacyOpen(true)
                  }}
                >
                  {quote.isPrivate ? '공개' : '비공개'}
                </button>
                <button type="button" className="admin-quote-action-danger" onClick={() => setDeleteOpen(true)}>
                  삭제
                </button>
              </div>

              {privacyNotice ? (
                <p className="admin-quote-notice" role="status">
                  {privacyNotice}
                </p>
              ) : null}
              {downloadNotice ? (
                <p className="admin-quote-notice" role="status">
                  {downloadNotice}
                </p>
              ) : null}
              {downloadMessage ? (
                <p className="admin-message" role="alert">
                  {downloadMessage}
                </p>
              ) : null}
            </aside>
          </div>
        ) : null}

        {privacyOpen && quote ? (
          <div className="admin-dialog-backdrop">
            <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-quote-privacy-title">
              <h2 id="admin-quote-privacy-title">
                {quote.isPrivate ? ADMIN_QUOTE_PUBLIC_TITLE : ADMIN_QUOTE_PRIVATE_TITLE}
              </h2>
              <p>{quote.isPrivate ? ADMIN_QUOTE_PUBLIC_MESSAGE : ADMIN_QUOTE_PRIVATE_MESSAGE}</p>
              {privacyMessage ? (
                <p className="admin-message" role="alert">
                  {privacyMessage}
                </p>
              ) : null}
              <div className="admin-dialog-actions">
                <button
                  type="button"
                  className="admin-dialog-cancel"
                  disabled={privacyBusy}
                  onClick={() => setPrivacyOpen(false)}
                >
                  {ADMIN_QUOTE_PRIVACY_CANCEL}
                </button>
                <button type="button" className="admin-dialog-confirm" disabled={privacyBusy} onClick={() => void confirmPrivacy()}>
                  {privacyBusy ? '변경 중' : quote.isPrivate ? ADMIN_QUOTE_PUBLIC_CONFIRM : ADMIN_QUOTE_PRIVATE_CONFIRM}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteOpen ? (
          <div className="admin-dialog-backdrop">
            <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-quote-delete-title">
              <h2 id="admin-quote-delete-title">{ADMIN_QUOTE_DELETE_TITLE}</h2>
              <p>{ADMIN_QUOTE_DELETE_MESSAGE}</p>
              {deleteMessage ? (
                <p className="admin-message" role="alert">
                  {deleteMessage}
                </p>
              ) : null}
              <div className="admin-dialog-actions">
                <button type="button" className="admin-dialog-cancel" disabled={deleting} onClick={() => setDeleteOpen(false)}>
                  {ADMIN_QUOTE_DELETE_CANCEL}
                </button>
                <button type="button" className="admin-category-delete" disabled={deleting} onClick={() => void confirmDelete()}>
                  {deleting ? '삭제 중' : ADMIN_QUOTE_DELETE_CONFIRM}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </>
  )
}
