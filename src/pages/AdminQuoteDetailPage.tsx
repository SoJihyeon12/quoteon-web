import { useEffect, useState } from 'react'
import { ADMIN_QUOTES_PATH, adminQuoteDetailPath } from '../adminMenu.ts'
import {
  ADMIN_QUOTE_DETAIL_FAILED,
  ADMIN_QUOTE_NOT_FOUND,
  adminQuoteErrorMessage,
  adminQuoteStatusLabel,
  adminQuoteText,
  formatAdminQuoteAmount,
  type AdminQuoteDetail,
} from '../adminQuote.ts'
import { fetchAdminQuote } from '../api/adminQuotes.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

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

  return (
    <>
      <header className="admin-heading">
        <h1>견적서</h1>
      </header>
      <section className="admin-product-panel admin-quote-detail">
        <div className="admin-edit-head">
          <h2>견적서 상세</h2>
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
            <h3>견적 항목</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">제품명</th>
                    <th scope="col">제품 코드</th>
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
          </>
        ) : null}
      </section>
    </>
  )
}
