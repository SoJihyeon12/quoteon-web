import { useEffect, useRef, useState } from 'react'
import { fetchQuoteEmailHistories, retryQuoteEmail, sendQuoteEmail } from '../api/quotes.ts'
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
import { redirectOnAccessFailure } from '../session.ts'

export default function QuoteEmailDialog({
  quoteId,
  onClose,
  onSent,
}: {
  quoteId: number
  onClose: () => void
  onSent?: () => void
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
      const result =
        retryId === null
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
        onSent?.()
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
