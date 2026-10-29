import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { fetchCurrentMember, logout } from '../api/auth.ts'
import { fetchProducts } from '../api/catalog.ts'
import { createQuote } from '../api/quotes.ts'
import type { Product } from '../api/types.ts'
import { navigate } from '../navigation.ts'
import { buildCreateQuoteBody, priceQuote } from '../quoteForm.ts'
import { formatAmount, quoteErrorMessage } from '../quoteList.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import './ConsultationPage.css'
import './QuoteListPage.css'
import './QuoteFormPage.css'

type DraftItem = {
  productId: number
  productCode: string
  name: string
  salePrice: number
  quantity: string
}

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

function todayInputValue() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function validQuantity(value: string) {
  return /^[1-9]\d*$/.test(value.trim())
}

export default function QuoteFormPage() {
  const [memberName, setMemberName] = useState('')
  const [ready, setReady] = useState(false)
  const [sessionMessage, setSessionMessage] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [quoteDate, setQuoteDate] = useState(todayInputValue)
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productState, setProductState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [productMessage, setProductMessage] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [menuNotice, setMenuNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchCurrentMember().then((result) => {
      if (cancelled || redirectUnless(result, isSalesMember)) {
        return
      }
      if (!result.ok) {
        setSessionMessage(result.error?.message || '로그인 상태를 확인할 수 없습니다.')
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
    fetchProducts().then((result) => {
      if (cancelled) {
        return
      }
      applyProducts(result)
    })
    return () => {
      cancelled = true
    }
  }, [ready])

  function applyProducts(result: Awaited<ReturnType<typeof fetchProducts>>) {
    if (redirectOnAccessFailure(result)) {
      return
    }
    if (!result.ok || !Array.isArray(result.data)) {
      setProducts([])
      setProductState('error')
      setProductMessage(quoteErrorMessage(result, '제품을 불러오지 못했습니다.'))
      return
    }
    setProducts(result.data)
    setProductMessage('')
    setProductState(result.data.length === 0 ? 'empty' : 'ready')
  }

  async function handleSearch() {
    setProductState('loading')
    applyProducts(await fetchProducts(keyword))
  }

  function addProduct(product: Product) {
    if (items.some((item) => item.productId === product.id)) {
      setFormMessage('같은 제품을 항목에 중복해서 넣을 수 없습니다.')
      return
    }
    setFormMessage('')
    setItems((current) => [
      ...current,
      {
        productId: product.id,
        productCode: product.productCode,
        name: product.name,
        salePrice: product.salePrice,
        quantity: '1',
      },
    ])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const built = buildCreateQuoteBody({
      customerId,
      quoteDate,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    })
    if (!built.ok) {
      setFormMessage(built.message)
      return
    }
    setSaving(true)
    setFormMessage('')
    const result = await createQuote(built.body)
    if (redirectOnAccessFailure(result)) {
      return
    }
    if (!result.ok) {
      setSaving(false)
      setFormMessage(quoteErrorMessage(result, '견적서를 저장하지 못했습니다.'))
      return
    }
    navigate('/quotes/my')
  }

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

  const pricedItems = items.flatMap((item) =>
    validQuantity(item.quantity) ? [{ salePrice: item.salePrice, quantity: Number(item.quantity) }] : [],
  )
  const priced = priceQuote(pricedItems)
  const amountByProductId = new Map<number, number>()
  let pricedIndex = 0
  for (const item of items) {
    if (!validQuantity(item.quantity)) {
      continue
    }
    amountByProductId.set(item.productId, priced.amounts[pricedIndex] ?? 0)
    pricedIndex += 1
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
      <section className="quote-panel" aria-labelledby="quote-form-title">
        <div className="quote-heading">
          <h1 id="quote-form-title">견적서 작성</h1>
          <a className="quote-cancel" href="/quotes/my">
            목록
          </a>
        </div>
        {!ready && !sessionMessage ? (
          <p className="quote-empty" role="status">
            로그인 상태를 확인하는 중입니다.
          </p>
        ) : null}
        {sessionMessage ? (
          <p className="quote-empty" role="alert">
            {sessionMessage}
          </p>
        ) : null}
        {ready ? (
          <form className="quote-form" onSubmit={handleSubmit}>
            <div className="quote-form-grid">
              <label className="quote-field">
                고객 번호
                <input
                  inputMode="numeric"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                />
              </label>
              <label className="quote-field">
                견적일
                <input type="date" value={quoteDate} onChange={(event) => setQuoteDate(event.target.value)} />
              </label>
            </div>
            <p className="quote-help">
              고객 목록 조회 API가 없어 고객명으로 고를 수 없습니다. 로그인한 영업사원 소유의 고객 번호를 입력해 주세요.
            </p>
            <div className="quote-search">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                aria-label="제품 검색"
                placeholder="제품명 또는 제품 코드"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleSearch()
                  }
                }}
              />
              <button type="button" onClick={() => void handleSearch()}>
                검색
              </button>
            </div>
            {productState === 'loading' ? (
              <p className="quote-empty" role="status">
                제품을 불러오는 중입니다.
              </p>
            ) : null}
            {productState === 'empty' ? (
              <p className="quote-empty" role="status">
                {keyword.trim() ? '검색된 판매 제품이 없습니다.' : '등록된 판매 제품이 없습니다.'}
              </p>
            ) : null}
            {productState === 'error' ? (
              <p className="quote-empty" role="alert">
                {productMessage || '제품을 불러오지 못했습니다.'}
              </p>
            ) : null}
            {productState === 'ready' ? (
              <ul className="quote-products">
                {products.map((product) => (
                  <li key={product.id}>
                    <div>
                      <p className="quote-product-name">{product.name}</p>
                      <p className="quote-product-meta">
                        {product.productCode} · {formatAmount(product.salePrice)}
                      </p>
                    </div>
                    <button type="button" className="quote-add" onClick={() => addProduct(product)}>
                      선택
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {items.length === 0 ? (
              <p className="quote-empty">선택한 제품이 없습니다. 제품을 선택한 뒤 수량을 입력해 주세요.</p>
            ) : (
              <div className="quote-table-wrap quote-lines">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th scope="col">제품</th>
                      <th scope="col" className="quote-amount">
                        단가
                      </th>
                      <th scope="col">수량</th>
                      <th scope="col" className="quote-amount">
                        금액
                      </th>
                      <th scope="col">
                        <span className="visually-hidden">삭제</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const amount = amountByProductId.get(item.productId)
                      return (
                        <tr key={item.productId}>
                          <td>
                            {item.name}
                            <div className="quote-product-meta">{item.productCode}</div>
                          </td>
                          <td className="quote-amount">{formatAmount(item.salePrice)}</td>
                          <td>
                            <input
                              aria-label={`${item.name} 수량`}
                              inputMode="numeric"
                              value={item.quantity}
                              onChange={(event) =>
                                setItems((current) =>
                                  current.map((line) =>
                                    line.productId === item.productId
                                      ? { ...line, quantity: event.target.value }
                                      : line,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="quote-amount">{amount === undefined ? '-' : formatAmount(amount)}</td>
                          <td>
                            <button
                              type="button"
                              className="quote-line-remove"
                              onClick={() => setItems((current) => current.filter((line) => line.productId !== item.productId))}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <dl className="quote-summary">
              <div>
                <dt>공급가액</dt>
                <dd>{formatAmount(priced.supplyAmount)}</dd>
              </div>
              <div>
                <dt>부가세 10%</dt>
                <dd>{formatAmount(priced.vatAmount)}</dd>
              </div>
              <div className="quote-total">
                <dt>합계 금액</dt>
                <dd>{formatAmount(priced.totalAmount)}</dd>
              </div>
            </dl>
            {formMessage ? (
              <p className="quote-form-message" role="alert">
                {formMessage}
              </p>
            ) : null}
            <div className="quote-actions">
              <button type="submit" className="quote-save" disabled={saving}>
                {saving ? '저장 중입니다.' : '견적서 저장'}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  )
}
