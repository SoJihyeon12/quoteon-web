import { useEffect, useState, type MouseEvent } from 'react'
import { fetchCurrentMember, logout } from '../api/auth.ts'
import { fetchQuote, type QuoteDetail } from '../api/quotes.ts'
import { formatAmount, quoteErrorMessage, quoteStatusLabel } from '../quoteList.ts'
import { navigate } from '../navigation.ts'
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
  const [menuNotice, setMenuNotice] = useState('')

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

  async function handleLogout() {
    const result = await logout()
    if (result.ok || result.status === 401) {
      navigate('/login')
      return
    }
    setMenuNotice(result.error?.message || '로그아웃하지 못했습니다.')
  }

  function handleUnavailableMenu(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    setMenuNotice('해당 화면은 아직 연결되지 않았습니다.')
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
          <a href="/customers" onClick={handleUnavailableMenu}>
            고객
          </a>
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
      <section className="quote-panel" aria-labelledby="quote-view-title">
        <div className="quote-heading">
          <h1 id="quote-view-title">견적서 확인</h1>
        </div>
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
    </div>
  )
}
