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
  ADMIN_QUOTE_PREVIEW_TITLE,
  adminQuoteErrorMessage,
  adminQuoteStatusLabel,
  adminQuoteText,
  formatAdminQuoteAmount,
  type AdminQuoteDetail,
  type AdminQuoteItem,
} from '../adminQuote.ts'
import { recoveredSpecificationNote } from '../quoteForm.ts'
import { WIREFRAME_SUPPLIER_EXAMPLE } from '../wireframeSupplier.ts'
import { deleteAdminQuote, downloadAdminQuote, fetchAdminQuote } from '../api/adminQuotes.ts'
import {
  adminQuoteDownloadError,
  adminQuoteDownloadNotice,
  adminQuoteDownloadReady,
  canStartAdminQuoteDownload,
  saveAdminQuoteFile,
  type QuoteDownloadKind,
} from '../adminQuoteDownload.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'
import './QuoteViewPage.css'
import './QuotePreviewPage.css'

export default function AdminQuoteDetailPage({ quoteId }: { quoteId: number }) {
  return (
    <AdminShell currentPath={adminQuoteDetailPath(quoteId)}>
      <QuoteDetail quoteId={quoteId} />
    </AdminShell>
  )
}

function isAdminQuoteDetail(value: AdminQuoteDetail | undefined): value is AdminQuoteDetail {
  return Boolean(value && typeof value.quoteNumber === 'string' && value.customer && Array.isArray(value.items))
}

function QuoteDetail({ quoteId }: { quoteId: number }) {
  const [quote, setQuote] = useState<AdminQuoteDetail | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadMessage, setLoadMessage] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadKind, setDownloadKind] = useState<QuoteDownloadKind | null>(null)
  const [downloadNotice, setDownloadNotice] = useState('')
  const [downloadMessage, setDownloadMessage] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
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
      <section className="admin-product-panel admin-quote-detail">
        <div className="admin-edit-head">
          <h2>견적서 상세</h2>
          {loadState === 'ready' && quote ? (
            <div className="admin-quote-downloads">
              <button type="button" disabled={downloading} onClick={() => void download('pdf')}>
                {downloading && downloadKind === 'pdf' ? '다운로드 중' : 'PDF 다운로드'}
              </button>
              <button type="button" disabled={downloading} onClick={() => void download('png')}>
                {downloading && downloadKind === 'png' ? '다운로드 중' : '이미지 다운로드'}
              </button>
              <button type="button" onClick={() => setPreviewOpen(true)}>
                미리보기
              </button>
              <button type="button" className="admin-category-delete" onClick={() => setDeleteOpen(true)}>
                삭제
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="admin-edit-close"
            aria-label="목록으로"
            onClick={() => navigate(ADMIN_QUOTES_PATH)}
          >
            ×
          </button>
        </div>
        {loadState === 'loading' ? <p role="status">견적서를 불러오는 중입니다.</p> : null}
        {loadState === 'error' ? <p className="admin-message" role="alert">{loadMessage || ADMIN_QUOTE_NOT_FOUND}</p> : null}
        {loadState === 'ready' && quote ? (
          <>
            <h3>작성 정보</h3>
            <dl className="admin-product-fields">
              <div>
                <dt>견적 번호</dt>
                <dd>{quote.quoteNumber}</dd>
              </div>
              <div>
                <dt>작성일</dt>
                <dd>{quote.quoteDate}</dd>
              </div>
              <div>
                <dt>작성자</dt>
                <dd>{quote.authorName}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{adminQuoteStatusLabel(quote.status)}</dd>
              </div>
            </dl>
            <h3>고객 정보</h3>
            <dl className="admin-product-fields">
              <div>
                <dt>고객명</dt>
                <dd>{adminQuoteText(quote.customer.name)}</dd>
              </div>
              <div>
                <dt>고객 유형</dt>
                <dd>{adminQuoteText(quote.customer.customerType)}</dd>
              </div>
              <div>
                <dt>전화번호</dt>
                <dd>{adminQuoteText(quote.customer.phone)}</dd>
              </div>
              <div>
                <dt>이메일</dt>
                <dd>{adminQuoteText(quote.customer.email)}</dd>
              </div>
              <div>
                <dt>주소</dt>
                <dd>{adminQuoteText(quote.customer.address)}</dd>
              </div>
            </dl>
            <h3>공급자 정보</h3>
            <WireframeSupplierTable />
            <h3>견적 항목</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">제품명</th>
                    <th scope="col">제품 코드</th>
                    <th scope="col">규격</th>
                    <th scope="col">수량</th>
                    <th scope="col">단가</th>
                    <th scope="col">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.productCode}</td>
                      <SpecificationCell item={item} />
                      <td>{item.quantity}</td>
                      <td>{formatAdminQuoteAmount(item.salePrice)}</td>
                      <td>{formatAdminQuoteAmount(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>금액 정보</h3>
            <dl className="admin-product-fields">
              <div>
                <dt>공급가액</dt>
                <dd>{formatAdminQuoteAmount(quote.supplyAmount)}</dd>
              </div>
              <div>
                <dt>부가세</dt>
                <dd>{formatAdminQuoteAmount(quote.vatAmount)}</dd>
              </div>
              <div>
                <dt>총금액</dt>
                <dd>{formatAdminQuoteAmount(quote.totalAmount)}</dd>
              </div>
            </dl>
            <h3>메모</h3>
            <p>{adminQuoteText(quote.memo)}</p>
            {downloadNotice ? <p className="admin-quote-notice" role="status">{downloadNotice}</p> : null}
            {downloadMessage ? <p className="admin-message" role="alert">{downloadMessage}</p> : null}
          </>
        ) : null}
        {previewOpen && quote ? (
          <div className="admin-dialog-backdrop">
            <article className="quote-preview-sheet" aria-labelledby="admin-quote-preview-title">
              <div className="quote-preview-toolbar">
                <button type="button" onClick={() => setPreviewOpen(false)}>
                  닫기
                </button>
              </div>
              <header className="quote-preview-heading">
                <h2 id="admin-quote-preview-title">{ADMIN_QUOTE_PREVIEW_TITLE}</h2>
                <p>
                  <span>작성일</span>
                  <time dateTime={quote.quoteDate}>{quote.quoteDate}</time>
                </p>
              </header>
              <dl className="quote-preview-parties">
                <div>
                  <dt>작성자</dt>
                  <dd>{adminQuoteText(quote.authorName)}</dd>
                </div>
                <div>
                  <dt>고객</dt>
                  <dd>{adminQuoteText(quote.customer.name)}</dd>
                </div>
              </dl>
              <WireframeSupplierTable />
              <div className="quote-table-wrap">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th scope="col">제품명</th>
                      <th scope="col">제품 코드</th>
                      <th scope="col">규격</th>
                      <th scope="col">수량</th>
                      <th scope="col">단가</th>
                      <th scope="col">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.productName}</td>
                        <td>{item.productCode}</td>
                        <SpecificationCell item={item} />
                        <td>{item.quantity}</td>
                        <td>{formatAdminQuoteAmount(item.salePrice)}</td>
                        <td>{formatAdminQuoteAmount(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="quote-view-summary">
                <div>
                  <dt>공급가액</dt>
                  <dd>{formatAdminQuoteAmount(quote.supplyAmount)}</dd>
                </div>
                <div>
                  <dt>부가세</dt>
                  <dd>{formatAdminQuoteAmount(quote.vatAmount)}</dd>
                </div>
                <div>
                  <dt>총금액</dt>
                  <dd>{formatAdminQuoteAmount(quote.totalAmount)}</dd>
                </div>
              </dl>
              <p>
                <span>메모 </span>
                {adminQuoteText(quote.memo)}
              </p>
            </article>
          </div>
        ) : null}
        {deleteOpen ? (
          <div className="admin-dialog-backdrop">
            <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-quote-delete-title">
              <h2 id="admin-quote-delete-title">{ADMIN_QUOTE_DELETE_TITLE}</h2>
              <p>{ADMIN_QUOTE_DELETE_MESSAGE}</p>
              {deleteMessage ? <p className="admin-message" role="alert">{deleteMessage}</p> : null}
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

function WireframeSupplierTable() {
  return (
    <table className="quote-supplier">
      <tbody>
        {WIREFRAME_SUPPLIER_EXAMPLE.map((field, index) => (
          <tr key={field.label}>
            {index === 0 ? (
              <th className="quote-supplier-group" rowSpan={WIREFRAME_SUPPLIER_EXAMPLE.length} scope="rowgroup">
                공급자
              </th>
            ) : null}
            <th scope="row">{field.label}</th>
            <td>{field.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SpecificationCell({ item }: { item: AdminQuoteItem }) {
  const note = recoveredSpecificationNote(item.specificationSource)
  return (
    <td>
      {adminQuoteText(item.specification)}
      {note ? <span className="quote-spec-note">{note}</span> : null}
    </td>
  )
}
