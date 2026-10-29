import { useEffect, useState } from 'react'
import { fetchCurrentMember, logout } from '../api/auth.ts'
import { fetchQuotes } from '../api/quotes.ts'
import {
  formatAmount,
  quoteErrorMessage,
  quoteStatusLabel,
  quoteViewPath,
  type QuoteSummary,
} from '../quoteList.ts'
import { navigate } from '../navigation.ts'
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
  const [items, setItems] = useState<QuoteSummary[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [listState, setListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [listMessage, setListMessage] = useState('')
  const [menuNotice, setMenuNotice] = useState('')

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
    fetchQuotes(page).then((result) => {
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
  }, [ready, page])

  async function handleLogout() {
    const result = await logout()
    if (result.ok || result.status === 401) {
      navigate('/login')
      return
    }
    setMenuNotice(result.error?.message || '로그아웃하지 못했습니다.')
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
          <button type="button" className="workbench-logout" onClick={handleLogout}>
            로그아웃
          </button>
        </p>
      </header>
      {menuNotice ? (
        <p className="workbench-menu-notice" role="status">
          {menuNotice}
        </p>
      ) : null}
      <section className="quote-panel" aria-labelledby="quote-list-title">
        <div className="quote-heading">
          <h1 id="quote-list-title">내 견적</h1>
          <a className="quote-create" href="/consultation?mode=new">
            견적서 작성
          </a>
        </div>
        {listState === 'loading' ? (
          <p className="quote-empty" role="status">
            견적서를 불러오는 중입니다.
          </p>
        ) : null}
        {listState === 'empty' ? (
          <p className="quote-empty" role="status">
            등록된 견적서가 없습니다.
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
                  <th scope="col">
                    <span className="visually-hidden">견적서 확인</span>
                  </th>
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
