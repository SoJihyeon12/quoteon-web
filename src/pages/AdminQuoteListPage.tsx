import { useEffect, useState, type FormEvent } from 'react'
import { ADMIN_QUOTES_PATH, adminQuoteDetailPath } from '../adminMenu.ts'
import {
  ADMIN_QUOTE_EMPTY,
  ADMIN_QUOTE_LIST_FAILED,
  adminQuoteErrorMessage,
  adminQuotePageLabel,
  adminQuoteStatusLabel,
  canGoToFirstAdminQuotePage,
  canGoToLastAdminQuotePage,
  canGoToNextAdminQuotePage,
  canGoToPreviousAdminQuotePage,
  formatAdminQuoteAmount,
  pageAfterAdminQuoteSearch,
  type AdminQuoteSummary,
} from '../adminQuote.ts'
import { fetchAdminQuotes } from '../api/adminQuotes.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminQuoteListPage() {
  return (
    <AdminShell currentPath={ADMIN_QUOTES_PATH}>
      <QuoteList />
    </AdminShell>
  )
}

function QuoteList() {
  const [quoteDateInput, setQuoteDateInput] = useState('')
  const [authorInput, setAuthorInput] = useState('')
  const [customerInput, setCustomerInput] = useState('')
  const [productInput, setProductInput] = useState('')
  const [quoteDate, setQuoteDate] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [productKeyword, setProductKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [items, setItems] = useState<AdminQuoteSummary[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [listState, setListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [listMessage, setListMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchAdminQuotes({ page, quoteDate, authorName, customerName, productKeyword }).then((result) => {
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
        setListMessage(adminQuoteErrorMessage(result, ADMIN_QUOTE_LIST_FAILED))
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
  }, [page, quoteDate, authorName, customerName, productKeyword, reloadKey])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextDate = quoteDateInput
    const nextAuthor = authorInput.trim()
    const nextCustomer = customerInput.trim()
    const nextProduct = productInput.trim()
    setListState('loading')
    setPage(pageAfterAdminQuoteSearch())
    if (
      page === 0
      && nextDate === quoteDate
      && nextAuthor === authorName
      && nextCustomer === customerName
      && nextProduct === productKeyword
    ) {
      setReloadKey((current) => current + 1)
      return
    }
    setQuoteDate(nextDate)
    setAuthorName(nextAuthor)
    setCustomerName(nextCustomer)
    setProductKeyword(nextProduct)
  }

  function movePage(nextPage: number) {
    setListState('loading')
    setPage(nextPage)
  }

  return (
    <>
      <header className="admin-heading">
        <h1>견적서 목록</h1>
      </header>
      <form className="admin-product-search" onSubmit={handleSearch}>
        <label>
          작성일
          <input type="date" value={quoteDateInput} onChange={(event) => setQuoteDateInput(event.target.value)} />
        </label>
        <label>
          작성자
          <input value={authorInput} onChange={(event) => setAuthorInput(event.target.value)} />
        </label>
        <label>
          고객명
          <input value={customerInput} onChange={(event) => setCustomerInput(event.target.value)} />
        </label>
        <label>
          제품 키워드
          <input value={productInput} onChange={(event) => setProductInput(event.target.value)} />
        </label>
        <button type="submit" disabled={listState === 'loading'}>검색</button>
      </form>
      {listState === 'loading' ? <p className="admin-empty" role="status">견적 목록을 불러오는 중입니다.</p> : null}
      {listState === 'empty' ? <p className="admin-empty" role="status">{ADMIN_QUOTE_EMPTY}</p> : null}
      {listState === 'error' ? (
        <p className="admin-empty" role="alert">{listMessage || ADMIN_QUOTE_LIST_FAILED}</p>
      ) : null}
      {listState === 'ready' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">작성일</th>
                <th scope="col">작성자</th>
                <th scope="col">고객명</th>
                <th scope="col">금액</th>
                <th scope="col">상태</th>
                <th scope="col">상세</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.quoteDate}</td>
                  <td>{item.authorName}</td>
                  <td>{item.customerName}</td>
                  <td>{formatAdminQuoteAmount(item.totalAmount)}</td>
                  <td>{adminQuoteStatusLabel(item.status)}</td>
                  <td>
                    <a
                      className="admin-edit-link"
                      href={adminQuoteDetailPath(item.id)}
                      onClick={(event) => {
                        event.preventDefault()
                        navigate(adminQuoteDetailPath(item.id))
                      }}
                    >
                      상세 보기
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {listState !== 'loading' ? (
        <div className="admin-pager" aria-label="견적 목록 페이지">
          <button
            type="button"
            aria-label="첫 페이지"
            disabled={!canGoToFirstAdminQuotePage(page, totalPages)}
            onClick={() => movePage(0)}
          >
            «
          </button>
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={!canGoToPreviousAdminQuotePage(page, totalPages)}
            onClick={() => movePage(page - 1)}
          >
            {'<'}
          </button>
          <span>{adminQuotePageLabel(page, totalPages)}</span>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={!canGoToNextAdminQuotePage(page, totalPages)}
            onClick={() => movePage(page + 1)}
          >
            {'>'}
          </button>
          <button
            type="button"
            aria-label="마지막 페이지"
            disabled={!canGoToLastAdminQuotePage(page, totalPages)}
            onClick={() => movePage(totalPages - 1)}
          >
            »
          </button>
        </div>
      ) : null}
    </>
  )
}
