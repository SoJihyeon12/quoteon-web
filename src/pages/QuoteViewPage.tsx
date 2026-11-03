import { useEffect, useRef, useState } from 'react'
import { fetchCurrentMember } from '../api/auth.ts'
import LogoutButton from '../components/LogoutButton.tsx'
import { downloadQuote, fetchQuote, fetchQuoteEmailHistories, retryQuoteEmail, sendQuoteEmail, type QuoteDetail } from '../api/quotes.ts'
import { formatAmount, quoteErrorMessage, quoteStatusLabel } from '../quoteList.ts'
import { recoveredSpecificationNote } from '../quoteForm.ts'
import {
  canStartSalesQuoteDownload,
  salesQuoteDownloadError,
  salesQuoteDownloadReady,
  saveSalesQuoteFile,
  type SalesQuoteDownloadKind,
} from '../quoteDownload.ts'
import {
  QUOTE_EMAIL_HISTORY_EMPTY,
  QUOTE_EMAIL_HISTORY_LOADING,
  QUOTE_EMAIL_SENDING,
  canRetryQuoteEmail,
  canStartQuoteEmailSend,
  isQuoteEmailHistoryList,
  isQuoteEmailResult,
  quoteEmailAttemptAt,
  quoteEmailFailureReason,
  quoteEmailFieldError,
  quoteEmailHistoryError,
  quoteEmailRequestBody,
  quoteEmailRetryDraft,
  quoteEmailSendError,
  quoteEmailStatusLabel,
  type QuoteEmailHistory,
} from '../quoteEmail.ts'
import { canEditStoredQuote, quoteEditPath, quoteRewritePath, sentQuoteChangeNotice } from '../quoteWorkbench.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import './ConsultationPage.css'
import './QuoteListPage.css'
import './QuoteViewPage.css'

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

function isQuoteDetail(value: QuoteDetail | undefined) {
  return Boolean(value && Array.isArray(value.items) && typeof value.quoteNumber === 'string')
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
      const ready = salesQuoteDownloadReady(
        kind,
        result.data.contentType,
        result.data.disposition,
        result.data.bytes,
      )
      if (!ready) {
        setDownloadMessage(salesQuoteDownloadError({ ok: false, status: result.status, error: null }))
        return
      }
      saveSalesQuoteFile(ready.filename, result.data.bytes, ready.mediaType)
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
      <section className="quote-panel" aria-labelledby="quote-view-title">
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
          <>
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
                <dd>{quote.quoteDate}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{quoteStatusLabel(quote.status)}</dd>
              </div>
            </dl>
            <div className="quote-table-wrap">
              <table className="quote-table">
                <thead>
                  <tr>
                    <th scope="col">상품명</th>
                    <th scope="col">상품코드</th>
                    <th scope="col">규격</th>
                    <th scope="col" className="quote-amount">
                      판매단가
                    </th>
                    <th scope="col" className="quote-amount">
                      수량
                    </th>
                    <th scope="col" className="quote-amount">
                      금액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.productCode}</td>
                      <td>
                        {item.specification?.trim() ? item.specification : '-'}
                        {recoveredSpecificationNote(item.specificationSource) ? (
                          <span className="quote-spec-note">{recoveredSpecificationNote(item.specificationSource)}</span>
                        ) : null}
                      </td>
                      <td className="quote-amount">{formatAmount(item.salePrice)}</td>
                      <td className="quote-amount">{item.quantity}</td>
                      <td className="quote-amount">{formatAmount(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="quote-view-summary">
              <div>
                <dt>공급가액</dt>
                <dd>{formatAmount(quote.supplyAmount)}</dd>
              </div>
              <div>
                <dt>부가세</dt>
                <dd>{formatAmount(quote.vatAmount)}</dd>
              </div>
              <div>
                <dt>합계 금액</dt>
                <dd>{formatAmount(quote.totalAmount)}</dd>
              </div>
            </dl>
          </>
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

function QuoteEmailDialog({
  quoteId,
  onClose,
  onSent,
}: {
  quoteId: number
  onClose: () => void
  onSent: () => void
}) {
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [retryId, setRetryId] = useState<number | null>(null)
  const [histories, setHistories] = useState<QuoteEmailHistory[]>([])
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [historyMessage, setHistoryMessage] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const sendingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchQuoteEmailHistories(quoteId).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !isQuoteEmailHistoryList(result.data)) {
        setHistories([])
        setHistoryState('error')
        setHistoryMessage(quoteEmailHistoryError(result))
        return
      }
      setHistories(result.data.items)
      setHistoryMessage('')
      setHistoryState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [quoteId, reloadKey])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !sendingRef.current) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function reloadHistories() {
    setHistoryState('loading')
    setReloadKey((current) => current + 1)
  }

  function startRetry(history: QuoteEmailHistory) {
    if (!canRetryQuoteEmail(history.status) || !canStartQuoteEmailSend(sendingRef.current)) {
      return
    }
    const draft = quoteEmailRetryDraft(history)
    setRetryId(history.id)
    setRecipient(draft.recipient)
    setSubject(draft.subject)
    setContent(draft.content)
    setFormMessage('')
  }

  async function submitEmail() {
    if (!canStartQuoteEmailSend(sendingRef.current)) {
      return
    }
    const values = { recipient, subject, content }
    const fieldError = quoteEmailFieldError(values)
    if (fieldError) {
      setFormMessage(fieldError)
      return
    }
    sendingRef.current = true
    setSending(true)
    setFormMessage('')
    try {
      const body = quoteEmailRequestBody(values)
      const result = retryId === null
        ? await sendQuoteEmail(quoteId, body)
        : await retryQuoteEmail(quoteId, retryId, body)
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        setFormMessage(quoteEmailSendError(result))
        reloadHistories()
        return
      }
      if (!isQuoteEmailResult(result.data)) {
        setFormMessage(quoteEmailSendError({ ok: false, status: result.status, error: null }))
        reloadHistories()
        return
      }
      if (result.data.status === 'SENT') {
        onSent()
      }
      setRetryId(null)
      reloadHistories()
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return (
    <div className="quote-email-modal">
      <div className="quote-email-dialog" role="dialog" aria-modal="true" aria-labelledby="quote-email-title">
        <div className="quote-email-head">
          <h2 id="quote-email-title">이메일 전송</h2>
          <button type="button" aria-label="닫기" disabled={sending} onClick={onClose}>
            ×
          </button>
        </div>
        <form
          className="quote-email-form"
          onSubmit={(event) => {
            event.preventDefault()
            void submitEmail()
          }}
        >
          <label>
            받는 사람
            <input
              type="email"
              value={recipient}
              disabled={sending}
              onChange={(event) => setRecipient(event.target.value)}
            />
          </label>
          <label>
            제목
            <input value={subject} disabled={sending} onChange={(event) => setSubject(event.target.value)} />
          </label>
          <label>
            내용
            <textarea value={content} disabled={sending} onChange={(event) => setContent(event.target.value)} />
          </label>
          {sending ? <p role="status">{QUOTE_EMAIL_SENDING}</p> : null}
          {formMessage ? <p role="alert">{formMessage}</p> : null}
          <section className="quote-email-history" aria-labelledby="quote-email-history-title">
            <h3 id="quote-email-history-title">전송 이력</h3>
            {historyState === 'loading' ? <p role="status">{QUOTE_EMAIL_HISTORY_LOADING}</p> : null}
            {historyState === 'error' ? <p role="alert">{historyMessage}</p> : null}
            {historyState === 'ready' && histories.length === 0 ? <p>{QUOTE_EMAIL_HISTORY_EMPTY}</p> : null}
            {historyState === 'ready' && histories.length > 0 ? (
              <ul>
                {histories.map((history) => {
                  const reason = quoteEmailFailureReason(history)
                  return (
                    <li key={history.id}>
                      <span>{quoteEmailAttemptAt(history)}</span>
                      <strong>{quoteEmailStatusLabel(history.status)}</strong>
                      {reason ? <span>{reason}</span> : null}
                      {canRetryQuoteEmail(history.status) ? (
                        <button type="button" disabled={sending} onClick={() => startRetry(history)}>
                          재시도
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </section>
          <div className="quote-email-actions">
            <button type="button" disabled={sending} onClick={onClose}>
              취소
            </button>
            <button type="submit" disabled={sending}>
              전송
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
