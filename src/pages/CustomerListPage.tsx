import { useEffect, useState, type FormEvent } from 'react'
import { fetchCurrentMember, logout } from '../api/auth.ts'
import { createCustomer, fetchCustomers } from '../api/customers.ts'
import { CUSTOMER_TYPES, buildCreateCustomerBody } from '../customerForm.ts'
import {
  customerDetailPath,
  customerErrorMessage,
  displayPhone,
  quoteFromCustomerPath,
  type CustomerSummary,
} from '../customerList.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import './ConsultationPage.css'
import './QuoteListPage.css'
import './CustomerListPage.css'

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

export default function CustomerListPage({ creating }: { creating: boolean }) {
  const [memberName, setMemberName] = useState('')
  const [ready, setReady] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [submittedKeyword, setSubmittedKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [items, setItems] = useState<CustomerSummary[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [listState, setListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [listMessage, setListMessage] = useState('')
  const [menuNotice, setMenuNotice] = useState('')
  const [name, setName] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)

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
    fetchCustomers(page, submittedKeyword).then((result) => {
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
        setListMessage(customerErrorMessage(result, '고객 목록을 불러오지 못했습니다.'))
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
  }, [ready, page, submittedKeyword, reloadKey])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedKeyword(keyword)
    setPage(0)
    setListState('loading')
    setReloadKey((current) => current + 1)
  }

  async function handleLogout() {
    const result = await logout()
    if (result.ok || result.status === 401) {
      navigate('/login')
      return
    }
    setMenuNotice(result.error?.message || '로그아웃하지 못했습니다.')
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const built = buildCreateCustomerBody({ name, customerType, phone, email, address, memo })
    if (!built.ok) {
      setFormMessage(built.message)
      return
    }
    setSaving(true)
    setFormMessage('')
    const result = await createCustomer(built.body)
    if (redirectOnAccessFailure(result)) {
      return
    }
    if (!result.ok) {
      setSaving(false)
      setFormMessage(customerErrorMessage(result, '고객을 등록하지 못했습니다.'))
      return
    }
    navigate('/customers')
  }

  return (
    <div className="workbench">
      <header className="workbench-header">
        <a className="workbench-logo" href="/consultation?mode=new">
          Quote<span>On</span>
        </a>
        <nav className="workbench-nav" aria-label="주요 메뉴">
          <a href="/consultation?mode=new">상담</a>
          <a href="/quotes/my">내 견적</a>
          <a href="/customers" aria-current="page">
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
      <section className="quote-panel" aria-labelledby="customer-list-title">
        <div className="quote-heading">
          <h1 id="customer-list-title">고객</h1>
          <a className="quote-create" href="/customers/new">
            고객 등록
          </a>
        </div>
        <form className="customer-list-search" onSubmit={handleSearch}>
          <label className="visually-hidden" htmlFor="customer-list-search">
            고객명 또는 연락처
          </label>
          <input
            id="customer-list-search"
            type="search"
            placeholder="고객명, 연락처"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button type="submit">검색</button>
        </form>
        {listState === 'loading' ? (
          <p className="quote-empty" role="status">
            고객 목록을 불러오는 중입니다.
          </p>
        ) : null}
        {listState === 'empty' ? (
          <p className="quote-empty" role="status">
            {submittedKeyword.trim() ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
          </p>
        ) : null}
        {listState === 'error' ? (
          <p className="quote-empty" role="alert">
            {listMessage || '고객 목록을 불러오지 못했습니다.'}
          </p>
        ) : null}
        {listState === 'ready' ? (
          <div className="quote-table-wrap">
            <table className="quote-table">
              <thead>
                <tr>
                  <th scope="col">고객명</th>
                  <th scope="col">연락처</th>
                  <th scope="col">구분</th>
                  <th scope="col">
                    <span className="visually-hidden">상세 보기</span>
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">견적 시작</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{displayPhone(item.phone)}</td>
                    <td>{item.customerType}</td>
                    <td>
                      <a className="customer-pick" href={customerDetailPath(item.id)}>
                        상세 보기
                      </a>
                    </td>
                    <td>
                      <a className="customer-pick" href={quoteFromCustomerPath(item.id)}>
                        견적 시작
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {listState !== 'loading' ? (
          <div className="quote-pager" aria-label="고객 목록 페이지">
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
      {creating ? (
        <div className="customer-modal">
          <div className="customer-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-create-title">
            <div className="customer-dialog-head">
              <h2 id="customer-create-title">고객 등록</h2>
            </div>
            <form className="customer-create-form" onSubmit={handleCreate}>
              <label>
                고객명
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>
                고객 유형
                <select value={customerType} onChange={(event) => setCustomerType(event.target.value)}>
                  <option value="">선택</option>
                  {CUSTOMER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                연락처
                <input value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <label>
                이메일
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label>
                주소
                <input value={address} onChange={(event) => setAddress(event.target.value)} />
              </label>
              <label>
                메모
                <textarea rows={4} value={memo} onChange={(event) => setMemo(event.target.value)} />
              </label>
              {formMessage ? (
                <p className="customer-create-message" role="alert">
                  {formMessage}
                </p>
              ) : null}
              <div className="customer-create-actions">
                <button type="button" onClick={() => navigate('/customers')}>
                  취소
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? '저장 중입니다.' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
