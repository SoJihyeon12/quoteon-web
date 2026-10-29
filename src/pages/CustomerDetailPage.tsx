import { useEffect, useState, type FormEvent } from 'react'
import { fetchCurrentMember, logout } from '../api/auth.ts'
import { fetchCustomer, updateCustomer, type CreatedCustomer } from '../api/customers.ts'
import { CUSTOMER_TYPES, buildCreateCustomerBody } from '../customerForm.ts'
import { customerDetailPath, customerEditPath, customerErrorMessage, displayPhone } from '../customerList.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import './ConsultationPage.css'
import './QuoteListPage.css'
import './CustomerListPage.css'

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

function textValue(value: string | null | undefined) {
  return value ?? ''
}

export default function CustomerDetailPage({
  customerId,
  editing,
}: {
  customerId: number
  editing: boolean
}) {
  const [memberName, setMemberName] = useState('')
  const [ready, setReady] = useState(false)
  const [customer, setCustomer] = useState<CreatedCustomer | null>(null)
  const [viewState, setViewState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [viewMessage, setViewMessage] = useState('')
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
    fetchCustomer(customerId).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || typeof result.data.name !== 'string') {
        setCustomer(null)
        setViewState('error')
        setViewMessage(customerErrorMessage(result, '고객 정보를 불러오지 못했습니다.'))
        return
      }
      setCustomer(result.data)
      setName(result.data.name)
      setCustomerType(result.data.customerType)
      setPhone(textValue(result.data.phone))
      setEmail(textValue(result.data.email))
      setAddress(textValue(result.data.address))
      setMemo(textValue(result.data.memo))
      setViewMessage('')
      setViewState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [ready, customerId])

  async function handleLogout() {
    const result = await logout()
    if (result.ok || result.status === 401) {
      navigate('/login')
      return
    }
    setMenuNotice(result.error?.message || '로그아웃하지 못했습니다.')
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const built = buildCreateCustomerBody({ name, customerType, phone, email, address, memo })
    if (!built.ok) {
      setFormMessage(built.message)
      return
    }
    setSaving(true)
    setFormMessage('')
    const result = await updateCustomer(customerId, built.body)
    if (redirectOnAccessFailure(result)) {
      return
    }
    if (!result.ok) {
      setSaving(false)
      setFormMessage(customerErrorMessage(result, '고객 정보를 저장하지 못했습니다.'))
      return
    }
    navigate(customerDetailPath(customerId))
  }

  const typeOptions =
    customerType && !CUSTOMER_TYPES.some((type) => type === customerType)
      ? [customerType, ...CUSTOMER_TYPES]
      : [...CUSTOMER_TYPES]

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
      <section className="quote-panel" aria-labelledby="customer-detail-title">
        <div className="quote-heading">
          <h1 id="customer-detail-title">{editing ? '고객 정보 수정' : '고객 상세'}</h1>
        </div>
        {viewState === 'loading' ? (
          <p className="quote-empty" role="status">
            고객 정보를 불러오는 중입니다.
          </p>
        ) : null}
        {viewState === 'error' ? (
          <p className="quote-empty" role="alert">
            {viewMessage || '고객 정보를 불러오지 못했습니다.'}
          </p>
        ) : null}
        {viewState === 'ready' && customer && !editing ? (
          <>
            <dl className="customer-detail">
              <div>
                <dt>고객명</dt>
                <dd>{displayPhone(customer.name)}</dd>
              </div>
              <div>
                <dt>고객 유형</dt>
                <dd>{displayPhone(customer.customerType)}</dd>
              </div>
              <div>
                <dt>연락처</dt>
                <dd>{displayPhone(customer.phone)}</dd>
              </div>
              <div>
                <dt>이메일</dt>
                <dd>{displayPhone(customer.email)}</dd>
              </div>
              <div>
                <dt>주소</dt>
                <dd>{displayPhone(customer.address)}</dd>
              </div>
              <div>
                <dt>메모</dt>
                <dd>{displayPhone(customer.memo)}</dd>
              </div>
            </dl>
            <div className="customer-create-actions">
              <button type="button" onClick={() => navigate('/customers')}>
                닫기
              </button>
              <button type="button" onClick={() => navigate(customerEditPath(customerId))}>
                수정
              </button>
            </div>
          </>
        ) : null}
        {viewState === 'ready' && customer && editing ? (
          <form className="customer-create-form" onSubmit={handleSave}>
            <label>
              고객명
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              고객 유형
              <select value={customerType} onChange={(event) => setCustomerType(event.target.value)}>
                <option value="">선택</option>
                {typeOptions.map((type) => (
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
              <button type="button" onClick={() => navigate(customerDetailPath(customerId))}>
                취소
              </button>
              <button type="submit" disabled={saving}>
                {saving ? '저장 중입니다.' : '저장'}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  )
}
