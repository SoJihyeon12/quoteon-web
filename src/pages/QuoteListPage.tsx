import { useEffect, useState, type FormEvent } from 'react'
import { fetchCurrentMember } from '../api/auth.ts'
import LogoutButton from '../components/LogoutButton.tsx'
import { fetchQuotes } from '../api/quotes.ts'
import {
  canContinueQuote,
  canRequote,
  formatAmount,
  pageAfterQuoteSearch,
  quoteErrorMessage,
  quoteListEmptyMessage,
  quoteStatusLabel,
  quoteViewPath,
  type QuoteSummary,
} from '../quoteList.ts'
import { navigate } from '../navigation.ts'
import { quoteEditPath, quoteRewritePath } from '../quoteWorkbench.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import './ConsultationPage.css'
import './QuoteListPage.css'

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

export default function QuoteListPage() {
  const [memberName, setMemberName] = useState('')
  const [ready, setReady] = useState(false)
  const [page, setPage] = useState(0)
  const [customerInput, setCustomerInput] = useState('')
  const [quoteDateInput, setQuoteDateInput] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [quoteDate, setQuoteDate] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [items, setItems] = useState<QuoteSummary[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [listState, setListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [listMessage, setListMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchCurrentMember().then((result) => {
      if (cancelled || redirectUnless(result, isSalesMember)) {
        return
      }
      if (!result.ok) {
        setListState('error')
        setListMessage(result.error?.message || '로그인 상태를 확인할 수 없습니다.')
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
    fetchQuotes(page, customerName, quoteDate).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !Array.isArray(result.data.items)) {
        setItems([])
        setTotalPages(0)
        setListState('error')
        setListMessage(quoteErrorMessage(result, '견적서를 불러오지 못했습니다.'))
        return
      }
      if (page > 0 && result.data.totalPages > 0 && page >= result.data.totalPages) {
        setListState('loading')
        setPage(result.data.totalPages - 1)
        return
      }
      setItems(result.data.items)
      setTotalPages(result.data.totalPages)
      setListMessage('')
      setListState(result.data.items.length === 0 ? 'empty' : 'ready')
    })
    return () => {
      cancelled = true
    }
  }, [ready, page, customerName, quoteDate, reloadKey])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextCustomer = customerInput.trim()
    const nextDate = quoteDateInput
    setListState('loading')
    setPage(pageAfterQuoteSearch())
    if (page === 0 && nextCustomer === customerName && nextDate === quoteDate) {
      setReloadKey((current) => current + 1)
      return
    }
    setCustomerName(nextCustomer)
    setQuoteDate(nextDate)
  }

  function handleReset() {
    setCustomerInput('')
    setQuoteDateInput('')
    setListState('loading')
    setPage(pageAfterQuoteSearch())
    if (page === 0 && customerName === '' && quoteDate === '') {
      setReloadKey((current) => current + 1)
      return
    }
    setCustomerName('')
    setQuoteDate('')
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
      <section className="quote-panel" aria-labelledby="quote-list-title">
        <div className="quote-heading">
          <h1 id="quote-list-title">내 견적</h1>
          <a className="quote-create" href="/consultation?mode=new">
            견적서 작성
          </a>
        </div>
        <form className="quote-search" onSubmit={handleSearch}>
          <label>
            고객명
            <input
              type="search"
              value={customerInput}
              onChange={(event) => setCustomerInput(event.target.value)}
            />
          </label>
          <label>
            작성일
            <input
              type="date"
              value={quoteDateInput}
              onChange={(event) => setQuoteDateInput(event.target.value)}
            />
          </label>
          <button type="submit">검색</button>
          <button type="button" onClick={handleReset}>
            초기화
          </button>
        </form>
        {listState === 'loading' ? (
          <p className="quote-empty" role="status">
            견적서를 불러오는 중입니다.
          </p>
        ) : null}
        {listState === 'empty' ? (
          <p className="quote-empty" role="status">
            {quoteListEmptyMessage(customerName, quoteDate)}
          </p>
        ) : null}
        {listState === 'error' ? (
          <p className="quote-empty" role="alert">
            {listMessage || '견적서를 불러오지 못했습니다.'}
          </p>
        ) : null}
        {listState === 'ready' ? (
          <div className="quote-table-wrap">
            <table className="quote-table">
              <thead>
                <tr>
                  <th scope="col">견적서 번호</th>
                  <th scope="col">고객명</th>
                  <th scope="col">견적일</th>
                  <th scope="col">상태</th>
                  <th scope="col" className="quote-amount">
                    공급가액
                  </th>
                  <th scope="col" className="quote-amount">
                    부가세
                  </th>
                  <th scope="col" className="quote-amount">
                    합계 금액
                  </th>
                  <th scope="col">견적서</th>
                  <th scope="col">작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="quote-row" onClick={() => navigate(quoteViewPath(item.id))}>
                    <td>{item.quoteNumber}</td>
                    <td>{item.customerName}</td>
                    <td>{item.quoteDate}</td>
                    <td>{quoteStatusLabel(item.status)}</td>
                    <td className="quote-amount">{formatAmount(item.supplyAmount)}</td>
                    <td className="quote-amount">{formatAmount(item.vatAmount)}</td>
                    <td className="quote-amount">{formatAmount(item.totalAmount)}</td>
                    <td>
                      <button
                        type="button"
                        className="quote-view-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(quoteViewPath(item.id))
                        }}
                      >
                        견적서 확인
                      </button>
                    </td>
                    <td>
                      <div className="quote-actions">
                        {canContinueQuote(item.status) ? (
                          <a
                            className="quote-action-button quote-action-continue"
                            href={quoteEditPath(item.id)}
                            onClick={(event) => {
                              event.stopPropagation()
                              event.preventDefault()
                              navigate(quoteEditPath(item.id))
                            }}
                          >
                            이어서 작성
                          </a>
                        ) : null}
                        {canRequote(item.status) ? (
                          <a
                            className="quote-action-button quote-action-requote"
                            href={quoteRewritePath(item.id)}
                            onClick={(event) => {
                              event.stopPropagation()
                              event.preventDefault()
                              navigate(quoteRewritePath(item.id))
                            }}
                          >
                            재견적
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {listState !== 'loading' ? (
          <div className="quote-pager" aria-label="견적서 목록 페이지">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => {
                setListState('loading')
                setPage((current) => current - 1)
              }}
            >
              이전
            </button>
            <span>{totalPages === 0 ? '표시할 페이지가 없습니다.' : `${page + 1} / ${totalPages}`}</span>
            <button
              type="button"
              disabled={totalPages === 0 || page + 1 >= totalPages}
              onClick={() => {
                setListState('loading')
                setPage((current) => current + 1)
              }}
            >
              다음
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
