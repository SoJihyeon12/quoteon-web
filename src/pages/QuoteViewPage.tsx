import { useEffect, useRef, useState } from 'react'
import { fetchCurrentMember } from '../api/auth.ts'
import { downloadQuote, fetchQuote, type QuoteDetail } from '../api/quotes.ts'
import FormalQuoteDocument from '../components/FormalQuoteDocument.tsx'
import LogoutButton from '../components/LogoutButton.tsx'
import QuoteEmailDialog from '../components/QuoteEmailDialog.tsx'
import { quoteErrorMessage, quoteStatusLabel } from '../quoteList.ts'
import {
  canStartSalesQuoteDownload,
  salesQuoteDownloadError,
  salesQuoteDownloadReady,
  saveSalesQuoteFile,
  type SalesQuoteDownloadKind,
} from '../quoteDownload.ts'
import { canEditStoredQuote, quoteEditPath, quoteRewritePath, sentQuoteChangeNotice } from '../quoteWorkbench.ts'
import { formalQuoteLinesFromItems } from '../quoteViewDocument.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import './ConsultationPage.css'
import './QuoteListPage.css'
import './FormalQuoteDocument.css'
import './QuoteViewPage.css'

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

function isQuoteDetail(value: QuoteDetail | undefined) {
  return Boolean(value && Array.isArray(value.items) && typeof value.quoteNumber === 'string')
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

export default function QuoteViewPage({ quoteId }: { quoteId: number }) {
  const [memberName, setMemberName] = useState('')
  const [ready, setReady] = useState(false)
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [viewState, setViewState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [viewMessage, setViewMessage] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState('')
  const [emailOpen, setEmailOpen] = useState(false)
  const downloadRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchCurrentMember().then((result) => {
      if (cancelled || redirectUnless(result, isSalesMember)) {
        return
      }
      if (!result.ok) {
        setViewState('error')
        setViewMessage(result.error?.message || '로그인 상태를 확인할 수 없습니다.')
        return
      }
      setMemberName(result.data.name)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) {
      return
    }
    let cancelled = false
    fetchQuote(quoteId).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !isQuoteDetail(result.data)) {
        setQuote(null)
        setViewState('error')
        setViewMessage(quoteErrorMessage(result, '견적서를 불러오지 못했습니다.'))
        return
      }
      setQuote(result.data)
      setViewMessage('')
      setViewState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [ready, quoteId])

  async function download(kind: SalesQuoteDownloadKind) {
    if (!canStartSalesQuoteDownload(downloadRef.current)) {
      return
    }
    downloadRef.current = true
    setDownloading(true)
    setDownloadMessage('')
    try {
      const result = await downloadQuote(quoteId, kind)
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        setDownloadMessage(salesQuoteDownloadError(result))
        return
      }
      const readyFile = salesQuoteDownloadReady(
        kind,
        result.data.contentType,
        result.data.disposition,
        result.data.bytes,
      )
      if (!readyFile) {
        setDownloadMessage(salesQuoteDownloadError({ ok: false, status: result.status, error: null }))
        return
      }
      saveSalesQuoteFile(readyFile.filename, result.data.bytes, readyFile.mediaType)
    } finally {
      downloadRef.current = false
      setDownloading(false)
    }
  }

  return (
    <div className="workbench">
      <header className="workbench-header">
        <a className="workbench-logo" href="/consultation?mode=new">
          Quote<span>On</span>
        </a>
        <nav className="workbench-nav" aria-label="주요 메뉴">
          <a href="/consultation?mode=new">상담</a>
          <a href="/quotes/my" aria-current="page">
            내 견적
          </a>
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
      <section className="quote-panel quote-view-panel" aria-labelledby="quote-view-title">
        <div className="quote-heading">
          <h1 id="quote-view-title">견적서 확인</h1>
          {viewState === 'ready' && quote ? (
            <div className="quote-view-actions">
              {canEditStoredQuote(quote.status) ? (
                <a className="quote-create" href={quoteEditPath(quote.id)}>
                  견적서 수정
                </a>
              ) : null}
              <a className="quote-create quote-rewrite" href={quoteRewritePath(quote.id)}>
                견적서 재작성
              </a>
            </div>
          ) : null}
        </div>
        {viewState === 'ready' && quote && sentQuoteChangeNotice(quote.status) ? (
          <p className="quote-sent-notice" role="status">
            {sentQuoteChangeNotice(quote.status)}
          </p>
        ) : null}
        {viewState === 'loading' ? (
          <p className="quote-empty" role="status">
            견적서를 불러오는 중입니다.
          </p>
        ) : null}
        {viewState === 'error' ? (
          <p className="quote-empty" role="alert">
            {viewMessage || '견적서를 불러오지 못했습니다.'}
          </p>
        ) : null}
        {viewState === 'ready' && quote ? (
          <div className="quote-view-body">
            <div className="quote-downloads">
              <button type="button" disabled={downloading} onClick={() => void download('pdf')}>
                PDF
              </button>
              <button type="button" disabled={downloading} onClick={() => void download('jpeg')}>
                JPEG
              </button>
              <button type="button" disabled={downloading} onClick={() => void download('png')}>
                PNG
              </button>
              <button type="button" onClick={() => setEmailOpen(true)}>
                이메일전송
              </button>
            </div>
            {downloadMessage ? (
              <p className="quote-download-message" role="alert">
                {downloadMessage}
              </p>
            ) : null}

            <section className="quote-view-manage" aria-label="견적 관리 정보">
              <dl className="quote-view-meta">
                <div>
                  <dt>견적번호</dt>
                  <dd>{quote.quoteNumber}</dd>
                </div>
                <div>
                  <dt>고객명</dt>
                  <dd>{quote.customerName}</dd>
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
                    <span className={`quote-view-status quote-view-status-${statusTone(quote.status)}`}>
                      {quoteStatusLabel(quote.status)}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <article className="quote-view-document" aria-label="정식 견적서">
              <FormalQuoteDocument
                titleId="quote-view-document-title"
                authorName={memberName}
                customerName={quote.customerName}
                quoteDate={quote.quoteDate}
                totalAmount={quote.totalAmount}
                supplyAmount={quote.supplyAmount}
                vatAmount={quote.vatAmount}
                lines={formalQuoteLinesFromItems(quote.items)}
              />
            </article>
          </div>
        ) : null}
      </section>
      {emailOpen ? (
        <QuoteEmailDialog
          quoteId={quoteId}
          onClose={() => setEmailOpen(false)}
          onSent={() => {
            setQuote((current) => (current ? { ...current, status: 'SENT' } : current))
          }}
        />
      ) : null}
    </div>
  )
}
