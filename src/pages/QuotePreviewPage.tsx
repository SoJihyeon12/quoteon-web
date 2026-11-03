import { useEffect, useRef, useState } from 'react'
import { fetchCurrentMember } from '../api/auth.ts'
import { downloadQuote } from '../api/quotes.ts'
import FormalQuoteDocument from '../components/FormalQuoteDocument.tsx'
import LogoutButton from '../components/LogoutButton.tsx'
import QuoteEmailDialog from '../components/QuoteEmailDialog.tsx'
import {
  canStartSalesQuoteDownload,
  salesQuoteDownloadError,
  salesQuoteDownloadReady,
  saveSalesQuoteFile,
  type SalesQuoteDownloadKind,
} from '../quoteDownload.ts'
import {
  PREVIEW_DOCUMENT_REQUIRES_SAVED_QUOTE,
  previewQuote,
  previewSavedQuoteId,
  quotePreviewFromHistory,
  returnToQuoteWorkbench,
} from '../quotePreview.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import './ConsultationPage.css'
import './QuoteViewPage.css'
import './FormalQuoteDocument.css'
import './QuotePreviewPage.css'

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

export default function QuotePreviewPage() {
  const [memberName, setMemberName] = useState('')
  const [ready, setReady] = useState(false)
  const [draft] = useState(() => quotePreviewFromHistory(window.history.state))
  const [downloading, setDownloading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [emailOpen, setEmailOpen] = useState(false)
  const downloadRef = useRef(false)
  const preview = draft ? previewQuote(draft) : null
  const savedQuoteId = previewSavedQuoteId(draft)
  const memoText = draft?.memo.trim() ?? ''

  useEffect(() => {
    let cancelled = false
    fetchCurrentMember().then((result) => {
      if (cancelled || redirectUnless(result, isSalesMember)) {
        return
      }
      if (!result.ok) {
        return
      }
      setMemberName(result.data.name)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function returnToWorkbench() {
    returnToQuoteWorkbench(draft)
  }

  function requireSavedQuote() {
    if (savedQuoteId !== null) {
      return true
    }
    setActionMessage(PREVIEW_DOCUMENT_REQUIRES_SAVED_QUOTE)
    return false
  }

  async function download(kind: SalesQuoteDownloadKind) {
    if (!requireSavedQuote() || savedQuoteId === null) {
      return
    }
    if (!canStartSalesQuoteDownload(downloadRef.current)) {
      return
    }
    downloadRef.current = true
    setDownloading(true)
    setActionMessage('')
    try {
      const result = await downloadQuote(savedQuoteId, kind)
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        setActionMessage(salesQuoteDownloadError(result))
        return
      }
      const readyFile = salesQuoteDownloadReady(
        kind,
        result.data.contentType,
        result.data.disposition,
        result.data.bytes,
      )
      if (!readyFile) {
        setActionMessage(salesQuoteDownloadError({ ok: false, status: result.status, error: null }))
        return
      }
      saveSalesQuoteFile(readyFile.filename, result.data.bytes, readyFile.mediaType)
    } finally {
      downloadRef.current = false
      setDownloading(false)
    }
  }

  function openEmail() {
    if (!requireSavedQuote()) {
      return
    }
    setActionMessage('')
    setEmailOpen(true)
  }

  return (
    <div className="workbench">
      <header className="workbench-header">
        <a className="workbench-logo" href="/consultation?mode=new">
          Quote<span>On</span>
        </a>
        <nav className="workbench-nav" aria-label="주요 메뉴">
          <a href="/consultation?mode=new" aria-current="page">
            상담
          </a>
          <a href="/quotes/my">내 견적</a>
          <a href="/customers">고객</a>
        </nav>
        <p className="workbench-user">
          <span className="workbench-user-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M5 19.2c1.4-3 3.8-4.4 7-4.4s5.6 1.4 7 4.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {memberName || '로그인 정보 없음'}
          <LogoutButton className="workbench-logout" />
        </p>
      </header>
      <section className="quote-preview-page" aria-labelledby="quote-preview-title">
        {!ready ? (
          <p className="quote-empty" role="status">
            로그인 상태를 확인하는 중입니다.
          </p>
        ) : !draft || !preview ? (
          <article className="quote-preview-sheet quote-preview-sheet-empty">
            <p className="quote-empty" role="status">
              미리볼 견적 내용이 없습니다. 상담 작업대에서 견적서 미리보기를 열어 주세요.
            </p>
            <button type="button" className="quote-preview-edit" onClick={returnToWorkbench}>
              상담 작업대로 이동
            </button>
          </article>
        ) : (
          <article className="quote-preview-sheet">
            <div className="quote-preview-toolbar">
              <div className="quote-preview-toolbar-actions" role="group" aria-label="견적서 저장 및 전송">
                <button type="button" disabled={downloading} onClick={() => void download('pdf')}>
                  PDF
                </button>
                <button type="button" disabled={downloading} onClick={() => void download('jpeg')}>
                  JPEG
                </button>
                <button type="button" disabled={downloading} onClick={() => void download('png')}>
                  PNG
                </button>
                <button type="button" disabled={downloading} onClick={openEmail}>
                  이메일전송
                </button>
                <button type="button" className="quote-preview-edit" onClick={returnToWorkbench}>
                  수정
                </button>
              </div>
              <button type="button" className="quote-preview-close" aria-label="나가기" onClick={returnToWorkbench}>
                ×
              </button>
            </div>
            {actionMessage ? (
              <p className="quote-preview-action-message" role="alert">
                {actionMessage}
              </p>
            ) : null}

            <div className="quote-preview-document">
              <FormalQuoteDocument
                titleId="quote-preview-title"
                authorName={memberName}
                customerName={preview.customerName}
                quoteDate={preview.writtenOn}
                dateLabel="작성일"
                totalAmount={preview.totalAmount}
                supplyAmount={preview.supplyAmount}
                vatAmount={preview.vatAmount}
                lines={preview.rows.map((row) => ({
                  key: row.productId,
                  name: row.name,
                  productCode: row.productCode,
                  quantity: row.quantity,
                  unitPrice: row.unitPrice,
                  amount: row.amount,
                }))}
              />

              <div className="quote-preview-memo" aria-label="내부 메모">
                <span className="quote-preview-memo-label">메모</span>
                <p className="quote-preview-memo-text">{memoText || '-'}</p>
              </div>
            </div>
          </article>
        )}
      </section>
      {emailOpen && savedQuoteId !== null ? (
        <QuoteEmailDialog quoteId={savedQuoteId} onClose={() => setEmailOpen(false)} />
      ) : null}
    </div>
  )
}
