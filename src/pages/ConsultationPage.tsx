import { useEffect, useId, useState, type FormEvent, type MouseEvent } from 'react'
import { fetchCurrentMember, logout } from '../api/auth.ts'
import { fetchCategories, fetchProducts } from '../api/catalog.ts'
import type { ApiResult, Category, Product } from '../api/types.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import './ConsultationPage.css'

const CUSTOMER_UNAVAILABLE = '고객 API가 연결되지 않아 고객을 선택할 수 없습니다.'
const PREVIEW_UNAVAILABLE = '견적 API가 연결되지 않아 견적서 미리보기로 이동할 수 없습니다.'
const FAVORITES_UNAVAILABLE = '즐겨찾기 API가 연결되지 않아 즐겨찾기 제품을 불러올 수 없습니다.'

function todayLabel() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`
}

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

function failureMessage(result: ApiResult<unknown>, fallback: string) {
  if (!result.ok && result.error?.message) {
    return result.error.message
  }
  return fallback
}

export default function ConsultationPage() {
  const titleId = useId()
  const popupTitleId = useId()
  const [memberName, setMemberName] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [productKeyword, setProductKeyword] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryNotice, setCategoryNotice] = useState('카테고리를 불러오는 중입니다.')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productNotice, setProductNotice] = useState('제품 목록을 확인하는 중입니다.')
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({})
  const [memo, setMemo] = useState('')
  const [writtenOn, setWrittenOn] = useState(todayLabel)
  const [quoteNotice, setQuoteNotice] = useState('')
  const [customerPopupOpen, setCustomerPopupOpen] = useState(false)
  const [customerKeyword, setCustomerKeyword] = useState('')
  const [customerNotice, setCustomerNotice] = useState(CUSTOMER_UNAVAILABLE)
  const [menuNotice, setMenuNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadWorkbench() {
      const me = await fetchCurrentMember()
      if (cancelled || redirectUnless(me, isSalesMember)) {
        return
      }
      if (!me.ok) {
        setCategoryNotice('카테고리를 불러오지 못했습니다.')
        setProductNotice(failureMessage(me, '로그인 상태를 확인할 수 없습니다.'))
        return
      }

      setMemberName(me.data.name)
      const [categoryResult, productResult] = await Promise.all([fetchCategories(), fetchProducts()])
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(categoryResult) || redirectOnAccessFailure(productResult)) {
        return
      }

      if (!categoryResult.ok) {
        setCategories([])
        setCategoryNotice(failureMessage(categoryResult, '카테고리를 불러오지 못했습니다.'))
      } else if (categoryResult.data.length === 0) {
        setCategories([])
        setCategoryNotice('등록된 카테고리가 없습니다.')
      } else {
        setCategories(categoryResult.data)
        setCategoryNotice('')
      }

      if (!productResult.ok) {
        setProducts([])
        setProductNotice(failureMessage(productResult, '제품 목록을 불러오지 못했습니다.'))
      } else if (productResult.data.length === 0) {
        setProducts([])
        setProductNotice('등록된 판매 제품이 없습니다.')
      } else {
        setProducts(productResult.data)
        setProductNotice('')
      }
      setSessionReady(true)
    }

    loadWorkbench()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!customerPopupOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCustomerPopupOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [customerPopupOpen])

  function resetQuote() {
    setMemo('')
    setWrittenOn(todayLabel())
    setQuoteNotice('')
    setCustomerPopupOpen(false)
    setCustomerKeyword('')
    setCustomerNotice(CUSTOMER_UNAVAILABLE)
  }

  async function handleLogout() {
    const result = await logout()
    if (result.ok || result.status === 401) {
      navigate('/login')
      return
    }
    setMenuNotice(result.error?.message || '로그아웃하지 못했습니다.')
  }

  async function handleProductSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sessionReady) {
      setProducts([])
      setProductNotice('승인된 로그인 세션이 없어 제품을 검색할 수 없습니다.')
      return
    }
    if (favoritesOnly) {
      setProductNotice(FAVORITES_UNAVAILABLE)
      return
    }

    setProductNotice('제품 목록을 불러오는 중입니다.')
    setProducts([])
    const result = await fetchProducts(productKeyword)
    if (redirectOnAccessFailure(result)) {
      return
    }
    if (!result.ok) {
      setProducts([])
      setProductNotice(failureMessage(result, '제품 목록을 불러오지 못했습니다.'))
      return
    }
    setProducts(result.data)
    setProductNotice(
      result.data.length === 0
        ? productKeyword.trim()
          ? '검색 결과가 없습니다.'
          : '등록된 판매 제품이 없습니다.'
        : '',
    )
  }

  function handleFavorites() {
    setFavoritesOnly((current) => !current)
  }

  function handlePreview() {
    setQuoteNotice(PREVIEW_UNAVAILABLE)
  }

  function handleUnavailableMenu(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    setMenuNotice('해당 화면은 아직 연결되지 않았습니다.')
  }

  function handleCustomerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customerKeyword.trim()) {
      setCustomerNotice('고객명 또는 연락처를 입력해 주세요.')
      return
    }

    setCustomerNotice('고객 API가 연결되지 않아 고객명 또는 연락처로 검색할 수 없습니다.')
  }

  const visibleProducts =
    selectedCategoryId === null ? products : products.filter((product) => product.categoryId === selectedCategoryId)
  const showProducts = sessionReady && !favoritesOnly && visibleProducts.length > 0 && !productNotice
  const visibleNotice = !sessionReady
    ? productNotice
    : favoritesOnly
      ? FAVORITES_UNAVAILABLE
      : productNotice || (visibleProducts.length === 0 ? '이 카테고리에 표시할 제품이 없습니다.' : '')

  function renderCategories(parentId: number | null) {
    return categories
      .filter((category) => category.parentId === parentId)
      .map((category) => (
        <div key={category.id}>
          <button
            type="button"
            className="category-item"
            aria-current={selectedCategoryId === category.id ? 'true' : undefined}
            onClick={() => setSelectedCategoryId(category.id)}
          >
            {category.name}
          </button>
          {renderCategories(category.id)}
        </div>
      ))
  }

  return (
    <div className="workbench">
      <h1 className="visually-hidden">상담 작업대</h1>
      <header className="workbench-header">
        <a className="workbench-logo" href="/consultation?mode=new">
          Quote<span>On</span>
        </a>
        <nav className="workbench-nav" aria-label="주요 메뉴">
          <a href="/consultation?mode=new" aria-current="page">
            상담
          </a>
          <a href="/quotes/my" onClick={handleUnavailableMenu}>
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

      <div className="workbench-toolbar">
        <form className="workbench-search" onSubmit={handleProductSearch}>
          <label className="visually-hidden" htmlFor="product-search">
            제품 검색
          </label>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            id="product-search"
            type="search"
            placeholder="제품명, 제품코드, 키워드"
            value={productKeyword}
            onChange={(event) => setProductKeyword(event.target.value)}
          />
        </form>
        <button
          type="button"
          className={favoritesOnly ? 'tool-button is-active' : 'tool-button'}
          aria-pressed={favoritesOnly}
          onClick={handleFavorites}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="m12 3.6 2.3 4.7 5.2.8-3.8 3.6.9 5.2L12 15.6 7.4 18l.9-5.2L4.5 9.1l5.2-.8L12 3.6Z"
              fill={favoritesOnly ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          즐겨찾기
        </button>
        <button type="button" className="tool-button tool-button-primary" onClick={resetQuote}>
          + 새 상담
        </button>
      </div>

      <div className="workbench-body">
        <aside className="category-panel" aria-labelledby="category-title">
          <h2 id="category-title">카테고리</h2>
          <button
            type="button"
            className="category-item"
            aria-current={selectedCategoryId === null ? 'true' : undefined}
            onClick={() => setSelectedCategoryId(null)}
          >
            전체
          </button>
          {renderCategories(null)}
          {categoryNotice ? (
            <p className="panel-note" role="status">
              {categoryNotice}
            </p>
          ) : null}
        </aside>

        <section className="product-panel" aria-labelledby="product-title">
          <h2 id="product-title" className="visually-hidden">
            제품 목록
          </h2>
          {showProducts ? (
            <ul className="product-list">
              {visibleProducts.map((product) => (
                <li key={product.id} className="product-card">
                  {product.imagePath && !failedImages[product.id] ? (
                    <img
                      src={product.imagePath}
                      alt=""
                      onError={() => setFailedImages((current) => ({ ...current, [product.id]: true }))}
                    />
                  ) : (
                    <span className="product-thumb">이미지 없음</span>
                  )}
                  <p className="product-name">{product.name}</p>
                  <p className="product-code">{product.productCode}</p>
                  <p className="product-price">{formatPrice(product.salePrice)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="product-empty">
              <p role="status">{visibleNotice}</p>
            </div>
          )}
          <div className="pager" aria-label="제품 목록 페이지">
            <button type="button" disabled>
              이전
            </button>
            <span>{showProducts ? '1' : '표시할 페이지가 없습니다.'}</span>
            <button type="button" disabled>
              다음
            </button>
          </div>
        </section>

        <aside className="quote-panel" aria-labelledby={titleId}>
          <button type="button" className="customer-select" onClick={() => setCustomerPopupOpen(true)}>
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
            고객을 선택하세요.
          </button>

          <div className="quote-heading">
            <h2 id={titleId}>작성 중 견적</h2>
            <p>
              <span>작성일</span>
              <time dateTime={writtenOn}>{writtenOn}</time>
            </p>
          </div>

          <p className="quote-empty">담은 제품이 없습니다.</p>

          <div className="quote-total">
            <span>합계</span>
            <strong>0원</strong>
          </div>

          <label className="memo-field" htmlFor="quote-memo">
            메모
            <textarea
              id="quote-memo"
              rows={4}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </label>

          {quoteNotice ? (
            <p className="panel-note panel-note-alert" role="status">
              {quoteNotice}
            </p>
          ) : null}

          <button type="button" className="preview-button" onClick={handlePreview}>
            견적서 미리보기
          </button>
        </aside>
      </div>

      {customerPopupOpen ? (
        <div className="customer-modal">
          <div
            className="customer-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={popupTitleId}
          >
            <div className="customer-dialog-head">
              <p id={popupTitleId}>
                선택한 고객: <strong>없음</strong>
              </p>
              <button
                type="button"
                className="dialog-close"
                aria-label="닫기"
                onClick={() => setCustomerPopupOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="customer-search" onSubmit={handleCustomerSearch}>
              <label className="visually-hidden" htmlFor="customer-search">
                고객명 또는 연락처
              </label>
              <input
                id="customer-search"
                type="search"
                placeholder="고객명, 연락처"
                value={customerKeyword}
                autoFocus
                onChange={(event) => setCustomerKeyword(event.target.value)}
              />
              <button type="submit">검색</button>
            </form>

            <div className="customer-table-wrap">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th scope="col">고객명</th>
                    <th scope="col">연락처</th>
                    <th scope="col">구분</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3}>{customerNotice}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pager" aria-label="고객 목록 페이지">
              <button type="button" disabled>
                이전
              </button>
              <span>표시할 페이지가 없습니다.</span>
              <button type="button" disabled>
                다음
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
