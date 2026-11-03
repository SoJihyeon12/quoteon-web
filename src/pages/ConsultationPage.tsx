import { useEffect, useId, useState, type FormEvent, type MouseEvent } from 'react'
import { fetchCurrentMember } from '../api/auth.ts'
import { fetchCategories, fetchProducts } from '../api/catalog.ts'
import LogoutButton from '../components/LogoutButton.tsx'
import { addFavorite, removeFavorite } from '../api/favorites.ts'
import {
  FAVORITE_ADD_FAILED,
  FAVORITE_REMOVE_FAILED,
  FAVORITES_EMPTY,
  favoriteOutcomeMessage,
  favoriteStar,
  favoriteToggleLabel,
} from '../favorites.ts'
import { fetchCustomer, fetchCustomers } from '../api/customers.ts'
import { createQuote, fetchQuote, updateQuote } from '../api/quotes.ts'
import type { ApiResult, Category, Product } from '../api/types.ts'
import {
  customerErrorMessage,
  customerSummaryFromDetail,
  displayPhone,
  type CustomerSummary,
} from '../customerList.ts'
import {
  CANCEL_QUOTE_DIALOG,
  CANCEL_QUOTE_MESSAGE,
  CANCEL_QUOTE_TITLE,
  NEW_CONSULTATION_DIALOG,
  NEW_CONSULTATION_MESSAGE,
  NEW_CONSULTATION_TITLE,
  consultationDialogPath,
  hasInProgressQuote,
  type ConsultationDialog,
} from '../consultationDraft.ts'
import { navigate } from '../navigation.ts'
import { clearQuotePreviewHistory, openQuotePreview, quotePreviewFromHistory } from '../quotePreview.ts'
import {
  PAYMENT_METHOD_OPTIONS,
  buildCreateQuoteBody,
  priceQuote,
  type QuotePaymentMethod,
} from '../quoteForm.ts'
import { quoteErrorMessage } from '../quoteList.ts'
import {
  QUOTE_EDIT_MODE,
  QUOTE_REWRITE_MODE,
  SENT_QUOTE_EDIT_MESSAGE,
  quoteCustomerLocked,
  quoteSaveAction,
  workbenchDraftFromQuote,
  workbenchPathAfterPreviewSave,
} from '../quoteWorkbench.ts'
import { addedLineQuantity, pageAfterCatalogFilter } from '../productCatalog.ts'
import { redirectOnAccessFailure, redirectUnless } from '../session.ts'
import ProductDetailDialog from './ProductDetailDialog.tsx'
import './ConsultationPage.css'

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

type QuoteLine = {
  productId: number
  productCode: string
  name: string
  salePrice: number
  quantity: string
}

function isSalesMember(member: { role: string; status: string }) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_USER'
}

function validQuantity(value: string) {
  return /^[1-9]\d*$/.test(value.trim())
}

function failureMessage(result: ApiResult<unknown>, fallback: string) {
  if (!result.ok && result.error?.message) {
    return result.error.message
  }
  return fallback
}

export default function ConsultationPage({
  dialog,
  customerId,
  quoteId,
  mode,
}: {
  dialog: ConsultationDialog | null
  customerId: number | null
  quoteId: number | null
  mode: string | null
}) {
  const titleId = useId()
  const popupTitleId = useId()
  const confirmTitleId = useId()
  const [memberName, setMemberName] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [productKeyword, setProductKeyword] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(
    () => new URLSearchParams(window.location.search).get('filter') === 'favorites',
  )
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryNotice, setCategoryNotice] = useState('카테고리를 불러오는 중입니다.')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [submittedProductKeyword, setSubmittedProductKeyword] = useState('')
  const [productPage, setProductPage] = useState(0)
  const [productTotalPages, setProductTotalPages] = useState(0)
  const [productReloadKey, setProductReloadKey] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [productNotice, setProductNotice] = useState('제품 목록을 확인하는 중입니다.')
  const [favoriteNotice, setFavoriteNotice] = useState('')
  const [favoritingIds, setFavoritingIds] = useState<Record<number, boolean>>({})
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({})
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [restoredDraft] = useState(() => quotePreviewFromHistory(window.history.state))
  const loadsStoredQuote =
    (mode === QUOTE_EDIT_MODE || mode === QUOTE_REWRITE_MODE) && quoteId !== null && !restoredDraft
  const [sourceReady, setSourceReady] = useState(!loadsStoredQuote)
  const [editBlocked, setEditBlocked] = useState(mode === QUOTE_EDIT_MODE && quoteId === null)
  const customerLocked = quoteCustomerLocked(mode)
  const [memo, setMemo] = useState(() => restoredDraft?.memo ?? '')
  const [paymentMethod, setPaymentMethod] = useState<QuotePaymentMethod | ''>(
    () =>
      restoredDraft?.paymentMethod === 'CASH' || restoredDraft?.paymentMethod === 'CARD'
        ? restoredDraft.paymentMethod
        : '',
  )
  const [writtenOn, setWrittenOn] = useState(() => restoredDraft?.writtenOn || todayLabel())
  const [quoteNotice, setQuoteNotice] = useState('')
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>(() => restoredDraft?.lines ?? [])
  const [saving, setSaving] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(() => restoredDraft?.customer ?? null)
  const [customerPopupOpen, setCustomerPopupOpen] = useState(false)
  const [customerKeyword, setCustomerKeyword] = useState('')
  const [submittedKeyword, setSubmittedKeyword] = useState('')
  const [customerPage, setCustomerPage] = useState(0)
  const [customerReloadKey, setCustomerReloadKey] = useState(0)
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [customerTotalPages, setCustomerTotalPages] = useState(0)
  const [customerListState, setCustomerListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [customerNotice, setCustomerNotice] = useState('')

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
      const categoryResult = await fetchCategories()
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(categoryResult)) {
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

      setSessionReady(true)
    }

    loadWorkbench()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sessionReady) {
      return
    }
    let cancelled = false
    fetchProducts({
      page: productPage,
      keyword: submittedProductKeyword,
      categoryId: selectedCategoryId,
      favoriteOnly: favoritesOnly,
    }).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !Array.isArray(result.data.items)) {
        setProducts([])
        setProductTotalPages(0)
        setProductNotice(failureMessage(result, '제품 목록을 불러오지 못했습니다.'))
        return
      }
      if (productPage > 0 && result.data.totalPages > 0 && productPage >= result.data.totalPages) {
        setProductPage(result.data.totalPages - 1)
        return
      }
      setProducts(result.data.items)
      setProductTotalPages(result.data.totalPages)
      if (result.data.items.length === 0) {
        setProductNotice(
          favoritesOnly
            ? FAVORITES_EMPTY
            : submittedProductKeyword.trim()
              ? '검색 결과가 없습니다.'
              : selectedCategoryId !== null
                ? '이 카테고리에 표시할 제품이 없습니다.'
                : '등록된 판매 제품이 없습니다.',
        )
        return
      }
      setProductNotice('')
    })
    return () => {
      cancelled = true
    }
  }, [sessionReady, favoritesOnly, productPage, submittedProductKeyword, selectedCategoryId, productReloadKey])

  useEffect(() => {
    if (!sessionReady || customerId === null || quoteId !== null) {
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
      if (!result.ok || typeof result.data.name !== 'string' || !Number.isSafeInteger(result.data.id)) {
        setQuoteNotice(customerErrorMessage(result, '고객 정보를 불러오지 못했습니다.'))
        return
      }
      setSelectedCustomer(customerSummaryFromDetail(result.data))
    })
    return () => {
      cancelled = true
    }
  }, [sessionReady, customerId, quoteId])

  useEffect(() => {
    if (!sessionReady || quoteId === null) {
      return
    }
    if (mode !== QUOTE_EDIT_MODE && mode !== QUOTE_REWRITE_MODE) {
      return
    }
    let cancelled = false
    fetchQuote(quoteId).then(async (result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !Array.isArray(result.data.items)) {
        setSourceReady(false)
        setQuoteNotice(quoteErrorMessage(result, '견적서를 불러오지 못했습니다.'))
        return
      }
      if (restoredDraft) {
        if (mode === QUOTE_EDIT_MODE && result.data.status !== 'DRAFT') {
          setEditBlocked(true)
          setQuoteNotice(SENT_QUOTE_EDIT_MESSAGE)
        }
        return
      }
      const draft = workbenchDraftFromQuote(result.data)
      if (!draft) {
        setSourceReady(false)
        setQuoteNotice('견적서를 불러오지 못했습니다.')
        return
      }
      if (mode === QUOTE_EDIT_MODE && result.data.status !== 'DRAFT') {
        setEditBlocked(true)
        setQuoteNotice(SENT_QUOTE_EDIT_MESSAGE)
      }
      setWrittenOn(draft.writtenOn)
      setQuoteLines(draft.lines)
      setSelectedCustomer(draft.customer)
      setMemo(draft.memo)
      setPaymentMethod(draft.paymentMethod)
      const customerResult = await fetchCustomer(result.data.customerId)
      if (cancelled) {
        return
      }
      if (customerResult.ok && typeof customerResult.data.name === 'string') {
        setSelectedCustomer((current) =>
          current && current.id !== result.data.customerId
            ? current
            : customerSummaryFromDetail(customerResult.data),
        )
      } else if (!customerResult.ok) {
        redirectOnAccessFailure(customerResult)
      }
      setSourceReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [sessionReady, quoteId, mode, restoredDraft])

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

  useEffect(() => {
    if (!customerPopupOpen || !sessionReady) {
      return
    }
    let cancelled = false
    fetchCustomers(customerPage, submittedKeyword).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !Array.isArray(result.data.items)) {
        setCustomers([])
        setCustomerTotalPages(0)
        setCustomerListState('error')
        setCustomerNotice(customerErrorMessage(result, '고객 목록을 불러오지 못했습니다.'))
        return
      }
      if (customerPage > 0 && result.data.totalPages > 0 && customerPage >= result.data.totalPages) {
        setCustomerListState('loading')
        setCustomerPage(result.data.totalPages - 1)
        return
      }
      setCustomers(result.data.items)
      setCustomerTotalPages(result.data.totalPages)
      setCustomerNotice('')
      setCustomerListState(result.data.items.length === 0 ? 'empty' : 'ready')
    })
    return () => {
      cancelled = true
    }
  }, [customerPopupOpen, sessionReady, customerPage, submittedKeyword, customerReloadKey])

  function resetQuote() {
    setMemo('')
    setPaymentMethod('')
    setWrittenOn(todayLabel())
    setQuoteNotice('')
    setQuoteLines([])
    setSaving(false)
    setSelectedCustomer(null)
    setCustomerPopupOpen(false)
    setCustomerKeyword('')
    setSubmittedKeyword('')
    setCustomerPage(0)
    setCustomers([])
    setCustomerTotalPages(0)
    setCustomerListState('loading')
    setCustomerNotice('')
    clearQuotePreviewHistory()
  }

  const quoteDraft = {
    customerSelected: selectedCustomer !== null,
    lineCount: quoteLines.length,
    memo,
  }
  const quoteInProgress = hasInProgressQuote(quoteDraft)
  const visibleDialog = quoteInProgress ? dialog : null

  useEffect(() => {
    if (dialog && !quoteInProgress) {
      navigate(consultationDialogPath(window.location.search, null))
    }
  }, [dialog, quoteInProgress])

  function openQuoteDialog(next: ConsultationDialog) {
    navigate(consultationDialogPath(window.location.search, next))
  }

  function closeQuoteDialog() {
    navigate(consultationDialogPath(window.location.search, null))
  }

  function requestNewConsultation() {
    if (!hasInProgressQuote(quoteDraft)) {
      resetQuote()
      return
    }
    openQuoteDialog(NEW_CONSULTATION_DIALOG)
  }

  function requestCancelQuote() {
    if (!hasInProgressQuote(quoteDraft)) {
      return
    }
    openQuoteDialog(CANCEL_QUOTE_DIALOG)
  }

  function confirmQuoteDialog() {
    resetQuote()
    if (mode === QUOTE_EDIT_MODE || mode === QUOTE_REWRITE_MODE) {
      navigate('/consultation?mode=new')
    }
  }

  function openCustomerPopup() {
    if (customerLocked) {
      return
    }
    setCustomerListState('loading')
    setCustomerPopupOpen(true)
  }

  function chooseCustomer(customer: CustomerSummary) {
    if (customerLocked) {
      return
    }
    setSelectedCustomer(customer)
    setQuoteNotice('')
    setCustomerPopupOpen(false)
  }

  function addProduct(product: Product, quantity = '1') {
    if (product.status !== 'ACTIVE' || !validQuantity(quantity)) {
      setQuoteNotice('판매 중인 제품만 1개 이상의 수량으로 견적에 추가할 수 있습니다.')
      return
    }
    setQuoteNotice('')
    setSelectedProductId(null)
    setQuoteLines((current) => {
      const existing = current.find((line) => line.productId === product.id)
      if (!existing) {
        return [
          ...current,
          {
            productId: product.id,
            productCode: product.productCode,
            name: product.name,
            salePrice: product.salePrice,
            quantity,
          },
        ]
      }
      const next = addedLineQuantity(existing.quantity, quantity) ?? quantity
      return current.map((line) =>
        line.productId === product.id ? { ...line, quantity: next } : line,
      )
    })
  }

  async function persistCurrentQuote(): Promise<
    { ok: true; id: number } | { ok: false; message?: string; redirected?: boolean }
  > {
    const built = buildCreateQuoteBody({
      customerId: selectedCustomer ? String(selectedCustomer.id) : '',
      quoteDate: writtenOn,
      memo,
      paymentMethod,
      items: quoteLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    })
    if (!built.ok) {
      return { ok: false, message: built.message }
    }
    const action = quoteSaveAction(mode, quoteId)
    if (action === 'blocked' || editBlocked || !sourceReady) {
      return { ok: false, message: editBlocked ? SENT_QUOTE_EDIT_MESSAGE : undefined }
    }
    const result =
      action === 'update' && quoteId !== null
        ? await updateQuote(quoteId, built.body)
        : await createQuote(built.body)
    if (redirectOnAccessFailure(result)) {
      return { ok: false, redirected: true }
    }
    if (!result.ok) {
      return { ok: false, message: quoteErrorMessage(result, '견적서를 저장하지 못했습니다.') }
    }
    return { ok: true, id: result.data.id }
  }

  async function handleSaveQuote() {
    if (saving) {
      return
    }
    setSaving(true)
    setQuoteNotice('')
    try {
      const persisted = await persistCurrentQuote()
      if (!persisted.ok) {
        if (persisted.redirected) {
          return
        }
        if (persisted.message) {
          setQuoteNotice(persisted.message)
        }
        return
      }
      navigate('/quotes/my')
    } finally {
      setSaving(false)
    }
  }

  function handleProductSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sessionReady) {
      setProducts([])
      setProductNotice('승인된 로그인 세션이 없어 제품을 검색할 수 없습니다.')
      return
    }
    const nextPage = pageAfterCatalogFilter()
    setSubmittedProductKeyword(productKeyword)
    setProductPage(nextPage)
    if (productPage === nextPage && productKeyword === submittedProductKeyword) {
      setProductReloadKey((current) => current + 1)
    }
  }

  function selectCategory(categoryId: number | null) {
    const nextPage = pageAfterCatalogFilter()
    setSelectedCategoryId(categoryId)
    setProductPage(nextPage)
  }

  function syncFavoritesFilter(next: boolean) {
    const params = new URLSearchParams(window.location.search)
    if (next) {
      params.set('filter', 'favorites')
    } else {
      params.delete('filter')
    }
    const query = params.toString()
    window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname)
  }

  function handleFavorites() {
    setFavoritesOnly((current) => {
      const next = !current
      syncFavoritesFilter(next)
      setProductPage(pageAfterCatalogFilter())
      return next
    })
  }

  function applyFavoriteState(productId: number, favorited: boolean) {
    setFavoriteNotice('')
    setProducts((current) => {
      const next = current.map((product) =>
        product.id === productId ? { ...product, favorited } : product,
      )
      if (favoritesOnly && !favorited) {
        return next.filter((product) => product.id !== productId)
      }
      return next
    })
  }

  async function toggleProductFavorite(product: Product, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (favoritingIds[product.id]) {
      return
    }
    const wasFavorited = Boolean(product.favorited)
    setFavoritingIds((current) => ({ ...current, [product.id]: true }))
    setFavoriteNotice('')
    applyFavoriteState(product.id, !wasFavorited)
    try {
      const result = wasFavorited ? await removeFavorite(product.id) : await addFavorite(product.id)
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        applyFavoriteState(product.id, wasFavorited)
        if (favoritesOnly && wasFavorited) {
          setProductReloadKey((current) => current + 1)
        }
        setFavoriteNotice(
          favoriteOutcomeMessage(result, wasFavorited ? FAVORITE_REMOVE_FAILED : FAVORITE_ADD_FAILED),
        )
        return
      }
      applyFavoriteState(product.id, result.data.favorited)
    } finally {
      setFavoritingIds((current) => {
        const next = { ...current }
        delete next[product.id]
        return next
      })
    }
  }

  async function handlePreview() {
    if (saving) {
      return
    }
    setSaving(true)
    setQuoteNotice('')
    try {
      const persisted = await persistCurrentQuote()
      if (!persisted.ok) {
        if (persisted.redirected) {
          return
        }
        if (persisted.message) {
          setQuoteNotice(persisted.message)
        }
        return
      }
      const returnPath = workbenchPathAfterPreviewSave(persisted.id)
      openQuotePreview(
        {
          customer: selectedCustomer,
          writtenOn,
          memo,
          paymentMethod,
          quoteId: persisted.id,
          lines: quoteLines,
        },
        returnPath,
      )
    } finally {
      setSaving(false)
    }
  }

  function handleCustomerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedKeyword(customerKeyword)
    setCustomerPage(0)
    setCustomerListState('loading')
    setCustomerReloadKey((current) => current + 1)
  }

  const pricedLines = quoteLines.flatMap((line) =>
    validQuantity(line.quantity) ? [{ salePrice: line.salePrice, quantity: Number(line.quantity) }] : [],
  )
  const priced = priceQuote(pricedLines)
  const amountByProductId = new Map<number, number>()
  let pricedIndex = 0
  for (const line of quoteLines) {
    if (!validQuantity(line.quantity)) {
      continue
    }
    amountByProductId.set(line.productId, priced.amounts[pricedIndex] ?? 0)
    pricedIndex += 1
  }

  const showProducts = sessionReady && products.length > 0 && !productNotice
  const visibleNotice = productNotice

  function renderCategories(parentId: number | null) {
    return categories
      .filter((category) => category.parentId === parentId)
      .map((category) => (
        <div key={category.id}>
          <button
            type="button"
            className="category-item"
            aria-current={selectedCategoryId === category.id ? 'true' : undefined}
            onClick={() => selectCategory(category.id)}
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
          <a href="/quotes/my">
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
        <button type="button" className="tool-button tool-button-primary" onClick={requestNewConsultation}>
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
            onClick={() => selectCategory(null)}
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
          {favoriteNotice ? (
            <p className="panel-note" role="status">
              {favoriteNotice}
            </p>
          ) : null}
          {showProducts ? (
            <ul className="product-list">
              {products.map((product) => {
                const favorited = Boolean(product.favorited)
                const favoriting = Boolean(favoritingIds[product.id])
                return (
                  <li key={product.id} className="product-card">
                    <button
                      type="button"
                      className={favorited ? 'product-favorite is-active' : 'product-favorite'}
                      aria-label={favoriteToggleLabel(favorited)}
                      aria-pressed={favorited}
                      disabled={favoriting}
                      onClick={(event) => void toggleProductFavorite(product, event)}
                    >
                      <span aria-hidden="true">{favoriteStar(favorited)}</span>
                    </button>
                    <button type="button" className="product-open" onClick={() => setSelectedProductId(product.id)}>
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
                    </button>
                    <button type="button" className="product-add" onClick={() => addProduct(product)}>
                      담기
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="product-empty">
              <p role="status">{visibleNotice}</p>
            </div>
          )}
          <div className="pager" aria-label="제품 목록 페이지">
            <button
              type="button"
              disabled={!sessionReady || productPage <= 0}
              onClick={() => setProductPage((current) => current - 1)}
            >
              이전
            </button>
            <span>
              {!sessionReady || productTotalPages === 0
                ? '표시할 페이지가 없습니다.'
                : `${productPage + 1} / ${productTotalPages}`}
            </span>
            <button
              type="button"
              disabled={!sessionReady || productTotalPages === 0 || productPage + 1 >= productTotalPages}
              onClick={() => setProductPage((current) => current + 1)}
            >
              다음
            </button>
          </div>
        </section>

        <aside className="quote-panel" aria-labelledby={titleId}>
          <button
            type="button"
            className="customer-select"
            onClick={openCustomerPopup}
            disabled={customerLocked}
          >
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
            {selectedCustomer ? selectedCustomer.name : '고객을 선택하세요.'}
          </button>

          <div className="quote-heading">
            <h2 id={titleId}>작성 중 견적</h2>
            <p>
              <span>작성일</span>
              <time dateTime={writtenOn}>{writtenOn}</time>
            </p>
          </div>

          {quoteLines.length === 0 ? (
            <p className="quote-empty">담은 제품이 없습니다.</p>
          ) : (
            <ul className="quote-lines">
              {quoteLines.map((line) => {
                const amount = amountByProductId.get(line.productId)
                const quantityValue = Number(line.quantity)
                const quantityNumber =
                  Number.isFinite(quantityValue) && quantityValue >= 1 ? Math.floor(quantityValue) : 1
                return (
                  <li key={line.productId} className="quote-line">
                    <div className="quote-line-head">
                      <div className="quote-line-meta">
                        <strong>{line.name}</strong>
                        <span>{line.productCode}</span>
                      </div>
                      <button
                        type="button"
                        className="quote-line-remove"
                        aria-label={`${line.name} 삭제`}
                        onClick={() =>
                          setQuoteLines((current) => current.filter((item) => item.productId !== line.productId))
                        }
                      >
                        ×
                      </button>
                    </div>
                    <div className="quote-line-controls">
                      <div className="quote-line-stepper" role="group" aria-label={`${line.name} 수량`}>
                        <button
                          type="button"
                          aria-label={`${line.name} 수량 감소`}
                          disabled={quantityNumber <= 1}
                          onClick={() =>
                            setQuoteLines((current) =>
                              current.map((item) =>
                                item.productId === line.productId
                                  ? { ...item, quantity: String(Math.max(1, quantityNumber - 1)) }
                                  : item,
                              ),
                            )
                          }
                        >
                          −
                        </button>
                        <input
                          inputMode="numeric"
                          aria-label={`${line.name} 수량`}
                          value={line.quantity}
                          onChange={(event) =>
                            setQuoteLines((current) =>
                              current.map((item) =>
                                item.productId === line.productId
                                  ? { ...item, quantity: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          aria-label={`${line.name} 수량 증가`}
                          onClick={() =>
                            setQuoteLines((current) =>
                              current.map((item) =>
                                item.productId === line.productId
                                  ? { ...item, quantity: String(quantityNumber + 1) }
                                  : item,
                              ),
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <div className="quote-line-prices">
                        <span>단가 {formatPrice(line.salePrice)}</span>
                        <strong>{amount === undefined ? '-' : formatPrice(amount)}</strong>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="quote-summary">
            {quoteLines.length > 0 ? (
              <div className="quote-amounts">
                <p>
                  <span>공급가액</span>
                  <strong>{formatPrice(priced.supplyAmount)}</strong>
                </p>
                <p>
                  <span>부가세 10%</span>
                  <strong>{formatPrice(priced.vatAmount)}</strong>
                </p>
              </div>
            ) : null}

            <div className="quote-total">
              <span>합계</span>
              <strong>{formatPrice(priced.totalAmount)}</strong>
            </div>
          </div>

          <div className="payment-method-field" role="group" aria-labelledby="quote-payment-label">
            <span id="quote-payment-label">결제방법</span>
            <div className="payment-method-options">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    paymentMethod === option.value
                      ? 'payment-method-option is-active'
                      : 'payment-method-option'
                  }
                  aria-pressed={paymentMethod === option.value}
                  onClick={() => setPaymentMethod(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="memo-field" htmlFor="quote-memo">
            <span>메모</span>
            <textarea
              id="quote-memo"
              rows={3}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </label>

          {quoteNotice ? (
            <p className="panel-note panel-note-alert" role="status">
              {quoteNotice}
            </p>
          ) : null}

          <div className="quote-actions">
            <button
              type="button"
              className="preview-button"
              disabled={saving || editBlocked || !sourceReady}
              onClick={handleSaveQuote}
            >
              {saving ? '저장 중입니다.' : '견적서 저장'}
            </button>
            <button
              type="button"
              className="preview-button preview-button-secondary"
              disabled={saving || editBlocked || !sourceReady}
              onClick={() => void handlePreview()}
            >
              {saving ? '저장 중입니다.' : '견적서 미리보기'}
            </button>
            {quoteInProgress ? (
              <button type="button" className="quote-cancel" onClick={requestCancelQuote}>
                견적 취소
              </button>
            ) : null}
          </div>
        </aside>
      </div>

      {visibleDialog ? (
        <div className="customer-modal">
          <div
            className={
              visibleDialog === CANCEL_QUOTE_DIALOG
                ? 'customer-dialog quote-confirm-dialog quote-confirm-dialog-cancel'
                : 'customer-dialog quote-confirm-dialog'
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
          >
            {visibleDialog === NEW_CONSULTATION_DIALOG ? (
              <button type="button" className="dialog-close quote-confirm-close" aria-label="취소" onClick={closeQuoteDialog}>
                ×
              </button>
            ) : null}
            <h2 id={confirmTitleId}>
              {visibleDialog === CANCEL_QUOTE_DIALOG ? CANCEL_QUOTE_TITLE : NEW_CONSULTATION_TITLE}
            </h2>
            {visibleDialog === CANCEL_QUOTE_DIALOG ? (
              <p className="quote-confirm-message">
                {CANCEL_QUOTE_MESSAGE.split('\n').map((line) => (
                  <span key={line} className="quote-confirm-message-line">
                    {line}
                  </span>
                ))}
              </p>
            ) : (
              <p>{NEW_CONSULTATION_MESSAGE}</p>
            )}
            <div className="quote-confirm-actions">
              <button
                type="button"
                className={visibleDialog === CANCEL_QUOTE_DIALOG ? 'quote-confirm-blue' : 'quote-confirm-red'}
                onClick={closeQuoteDialog}
              >
                {visibleDialog === CANCEL_QUOTE_DIALOG ? '돌아가기' : '취소'}
              </button>
              <button
                type="button"
                className={visibleDialog === CANCEL_QUOTE_DIALOG ? 'quote-confirm-red' : 'quote-confirm-blue'}
                onClick={confirmQuoteDialog}
              >
                {visibleDialog === CANCEL_QUOTE_DIALOG ? '견적 취소' : '확인'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {customerPopupOpen ? (
        <div className="customer-modal">
          <div
            className="customer-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={popupTitleId}
          >
            <div className="customer-dialog-head customer-dialog-head-select">
              <h2 id={popupTitleId} className="visually-hidden">
                고객 선택
              </h2>
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
                    <th scope="col">
                      <span className="visually-hidden">선택</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customerListState === 'loading' ? (
                    <tr>
                      <td colSpan={4}>고객 목록을 불러오는 중입니다.</td>
                    </tr>
                  ) : null}
                  {customerListState === 'empty' ? (
                    <tr>
                      <td colSpan={4}>
                        {submittedKeyword.trim() ? '검색 결과가 없습니다.' : '선택할 수 있는 고객이 없습니다.'}
                      </td>
                    </tr>
                  ) : null}
                  {customerListState === 'error' ? (
                    <tr>
                      <td colSpan={4}>{customerNotice || '고객 목록을 불러오지 못했습니다.'}</td>
                    </tr>
                  ) : null}
                  {customerListState === 'ready'
                    ? customers.map((customer) => (
                        <tr key={customer.id} className="customer-row" onClick={() => chooseCustomer(customer)}>
                          <td>{customer.name}</td>
                          <td>{displayPhone(customer.phone)}</td>
                          <td>{customer.customerType}</td>
                          <td>
                            <button
                              type="button"
                              className="customer-pick"
                              onClick={(event) => {
                                event.stopPropagation()
                                chooseCustomer(customer)
                              }}
                            >
                              선택
                            </button>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>

            <div className="pager" aria-label="고객 목록 페이지">
              <button
                type="button"
                disabled={customerListState === 'loading' || customerPage <= 0}
                onClick={() => {
                  setCustomerListState('loading')
                  setCustomerPage((current) => current - 1)
                }}
              >
                이전
              </button>
              <span>
                {customerTotalPages === 0 ? '표시할 페이지가 없습니다.' : `${customerPage + 1} / ${customerTotalPages}`}
              </span>
              <button
                type="button"
                disabled={customerListState === 'loading' || customerTotalPages === 0 || customerPage + 1 >= customerTotalPages}
                onClick={() => {
                  setCustomerListState('loading')
                  setCustomerPage((current) => current + 1)
                }}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {selectedProductId !== null ? (
        <ProductDetailDialog
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onFavoriteChange={applyFavoriteState}
          onAdd={(product, quantity) =>
            addProduct(
              {
                id: product.id,
                productCode: product.productCode,
                name: product.name,
                salePrice: product.salePrice,
                categoryId: 0,
                categoryName: '',
                imagePath: product.imagePath,
                status: product.status,
              },
              quantity,
            )
          }
        />
      ) : null}
    </div>
  )
}
