import { useEffect, useState } from 'react'
import { fetchCurrentMember, logout } from '../api/auth.ts'
import { navigate } from '../navigation.ts'
import { formatAmount } from '../quoteList.ts'
import { previewQuote, quotePreviewFromHistory, returnToQuoteWorkbench } from '../quotePreview.ts'
import { redirectUnless } from '../session.ts'
import './ConsultationPage.css'
import './QuoteListPage.css'
import './QuoteViewPage.css'
import './QuotePreviewPage.css'

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

function displayText(value: string) {
  const trimmed = value.trim()
  return trimmed || '-'
}

export default function QuotePreviewPage() {
  const [memberName, setMemberName] = useState('')
  const [ready, setReady] = useState(false)
  const [menuNotice, setMenuNotice] = useState('')
  const [draft] = useState(() => quotePreviewFromHistory(window.history.state))
  const preview = draft ? previewQuote(draft) : null

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
      <section className="quote-preview-page" aria-labelledby="quote-preview-title">
        {!ready ? (
          <p className="quote-empty" role="status">
            로그인 상태를 확인하는 중입니다.
          </p>
        ) : (
          <article className="quote-preview-sheet">
            <div className="quote-preview-toolbar">
              <button type="button" onClick={returnToWorkbench}>
                수정
              </button>
              <button type="button" aria-label="나가기" onClick={returnToWorkbench}>
                ×
              </button>
            </div>
            <header className="quote-preview-heading">
              <h1 id="quote-preview-title">견적서 미리보기</h1>
              <p>
                <span>작성일</span>
                <time dateTime={preview?.writtenOn || undefined}>{displayText(preview?.writtenOn ?? '')}</time>
              </p>
            </header>
            <dl className="quote-preview-parties">
              <div>
                <dt>작성자</dt>
                <dd>{displayText(memberName)}</dd>
              </div>
              <div>
                <dt>고객</dt>
                <dd>{displayText(preview?.customerName ?? '')}</dd>
              </div>
            </dl>
            <div className="quote-table-wrap">
              <table className="quote-table">
                <thead>
                  <tr>
                    <th scope="col">제품명</th>
                    <th scope="col">제품 코드</th>
                    <th scope="col" className="quote-amount">
                      수량
                    </th>
                    <th scope="col" className="quote-amount">
                      단가
                    </th>
                    <th scope="col" className="quote-amount">
                      금액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview?.rows.map((row) => (
                    <tr key={row.productId}>
                      <td>{row.name}</td>
                      <td>{row.productCode}</td>
                      <td className="quote-amount">{row.quantity}</td>
                      <td className="quote-amount">{formatAmount(row.unitPrice)}</td>
                      <td className="quote-amount">{row.amount === null ? '-' : formatAmount(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="quote-view-summary">
              <div>
                <dt>공급가액</dt>
                <dd>{formatAmount(preview?.supplyAmount ?? 0)}</dd>
              </div>
              <div>
                <dt>부가세</dt>
                <dd>{formatAmount(preview?.vatAmount ?? 0)}</dd>
              </div>
              <div>
                <dt>합계</dt>
                <dd>{formatAmount(preview?.totalAmount ?? 0)}</dd>
              </div>
            </dl>
          </article>
        )}
      </section>
    </div>
  )
}
