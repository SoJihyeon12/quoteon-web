import { useEffect, useState, type FormEvent } from 'react'
import {
  canGoToNextProductPage,
  canGoToPreviousProductPage,
  formatProductPrice,
  pageAfterProductSearch,
  productStatusLabel,
  validateSalePriceFilter,
  type AdminProductSummary,
} from '../adminProduct.ts'
import {
  ADMIN_PRODUCT_NEW_PATH,
  ADMIN_PRODUCTS_PATH,
  adminProductDetailPath,
  adminProductEditPath,
} from '../adminMenu.ts'
import { adminErrorMessage } from '../adminMemberList.ts'
import { fetchAdminProducts } from '../api/adminProducts.ts'
import { fetchCategories } from '../api/catalog.ts'
import type { Category } from '../api/types.ts'
import { categoryForest, type CategoryNode } from '../categoryAdmin.ts'
import { navigate } from '../navigation.ts'
import { productImageUrl } from '../productImage.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminProductTabs from './AdminProductTabs.tsx'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminProductListPage() {
  return (
    <AdminShell currentPath={ADMIN_PRODUCTS_PATH}>
      <ProductList />
    </AdminShell>
  )
}

function ProductList() {
  const [categories, setCategories] = useState<Category[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [salePriceInput, setSalePriceInput] = useState('')
  const [statusInput, setStatusInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [status, setStatus] = useState('')
  const [priceError, setPriceError] = useState('')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [items, setItems] = useState<AdminProductSummary[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [listState, setListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [listMessage, setListMessage] = useState('')
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({})

  useEffect(() => {
    let cancelled = false
    fetchCategories().then((result) => {
      if (cancelled || redirectOnAccessFailure(result) || !result.ok || !Array.isArray(result.data)) {
        return
      }
      setCategories(result.data)
      setExpanded(new Set(result.data.map((category) => category.id)))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAdminProducts({ page, keyword, categoryId, salePrice, status }).then((result) => {
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
        setListMessage(adminErrorMessage(result, '제품 목록을 불러오지 못했습니다.'))
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
  }, [page, keyword, categoryId, salePrice, status, reloadKey])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const priceMessage = validateSalePriceFilter(salePriceInput)
    setPriceError(priceMessage)
    if (priceMessage) {
      return
    }
    const nextKeyword = keywordInput.trim()
    const nextPrice = salePriceInput.trim()
    const nextStatus = statusInput
    setListState('loading')
    setPage(pageAfterProductSearch())
    if (page === 0 && nextKeyword === keyword && nextPrice === salePrice && nextStatus === status) {
      setReloadKey((current) => current + 1)
      return
    }
    setKeyword(nextKeyword)
    setSalePrice(nextPrice)
    setStatus(nextStatus)
  }

  function selectCategory(nextId: number | null) {
    setListState('loading')
    setPage(pageAfterProductSearch())
    if (page === 0 && nextId === categoryId) {
      setReloadKey((current) => current + 1)
      return
    }
    setCategoryId(nextId)
  }

  const emptyMessage = keyword || salePrice || status || categoryId !== null
    ? '검색 결과가 없습니다.'
    : '등록된 제품이 없습니다.'

  return (
    <>
      <header className="admin-heading">
        <h1>제품 관리</h1>
      </header>
      <AdminProductTabs currentPath={ADMIN_PRODUCTS_PATH} />
      <div className="admin-category">
        <section className="admin-category-tree" aria-label="카테고리 트리">
          <button
            type="button"
            className="admin-category-node"
            aria-current={categoryId === null ? 'true' : undefined}
            onClick={() => selectCategory(null)}
          >
            전체
          </button>
          <ProductCategoryBranches
            nodes={categoryForest(categories)}
            categoryId={categoryId}
            expanded={expanded}
            onToggle={(id) => {
              setExpanded((current) => {
                const next = new Set(current)
                if (next.has(id)) {
                  next.delete(id)
                } else {
                  next.add(id)
                }
                return next
              })
            }}
            onSelect={selectCategory}
          />
        </section>
        <section className="admin-category-detail">
          <form className="admin-product-search" onSubmit={handleSearch}>
            <label>
              <span className="visually-hidden">제품 검색</span>
              <input
                type="search"
                placeholder="제품명, 제품 코드, 세부 정보"
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </label>
            <label>
              판매 가격
              <input
                inputMode="decimal"
                value={salePriceInput}
                aria-invalid={priceError ? true : undefined}
                onChange={(event) => setSalePriceInput(event.target.value)}
              />
            </label>
            <label>
              상태
              <select value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
                <option value="">전체</option>
                <option value="ACTIVE">판매중</option>
                <option value="INACTIVE">판매중지</option>
              </select>
            </label>
            <button type="submit" disabled={listState === 'loading'}>검색</button>
            <a
              className="admin-product-create"
              href={ADMIN_PRODUCT_NEW_PATH}
              onClick={(event) => {
                event.preventDefault()
                navigate(ADMIN_PRODUCT_NEW_PATH)
              }}
            >
              제품 등록
            </a>
          </form>
          {priceError ? <p className="admin-field-error">{priceError}</p> : null}
          {listState === 'loading' ? <p className="admin-category-empty" role="status">제품 목록을 불러오는 중입니다.</p> : null}
          {listState === 'empty' ? <p className="admin-category-empty" role="status">{emptyMessage}</p> : null}
          {listState === 'error' ? <p className="admin-message" role="alert">{listMessage || '제품 목록을 불러오지 못했습니다.'}</p> : null}
          {listState === 'ready' ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">이미지</th>
                    <th scope="col">제품명</th>
                    <th scope="col">제품 코드</th>
                    <th scope="col">판매 가격</th>
                    <th scope="col">상태</th>
                    <th scope="col">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const imageSrc = productImageUrl(item.imagePath)
                    return (
                    <tr key={item.id}>
                      <td>
                        {imageSrc && !failedImages[item.id] ? (
                          <img
                            className="admin-product-thumb"
                            src={imageSrc}
                            alt={item.name}
                            onError={() => setFailedImages((current) => ({ ...current, [item.id]: true }))}
                          />
                        ) : (
                          <span className="admin-product-thumb">이미지</span>
                        )}
                      </td>
                      <td>{item.name}</td>
                      <td>{item.productCode}</td>
                      <td>{formatProductPrice(item.salePrice)}</td>
                      <td>{productStatusLabel(item.status)}</td>
                      <td>
                        <div className="admin-actions">
                          <a
                            className="admin-edit-link"
                            href={adminProductDetailPath(item.id)}
                            onClick={(event) => {
                              event.preventDefault()
                              navigate(adminProductDetailPath(item.id))
                            }}
                          >
                            상세 보기
                          </a>
                          <a
                            className="admin-edit-link"
                            href={adminProductEditPath(item.id)}
                            onClick={(event) => {
                              event.preventDefault()
                              navigate(adminProductEditPath(item.id))
                            }}
                          >
                            수정
                          </a>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          {listState !== 'loading' ? (
            <div className="admin-pager" aria-label="제품 목록 페이지">
              <button
                type="button"
                disabled={!canGoToPreviousProductPage(page)}
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
                disabled={!canGoToNextProductPage(page, totalPages)}
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
    </>
  )
}

function ProductCategoryBranches({
  nodes,
  categoryId,
  expanded,
  onToggle,
  onSelect,
}: {
  nodes: CategoryNode[]
  categoryId: number | null
  expanded: Set<number>
  onToggle: (categoryId: number) => void
  onSelect: (categoryId: number) => void
}) {
  if (nodes.length === 0) {
    return null
  }
  return (
    <ul className="admin-category-branch">
      {nodes.map((node) => (
        <li key={node.id}>
          {node.children.length > 0 ? (
            <button type="button" className="admin-category-toggle" onClick={() => onToggle(node.id)}>
              {expanded.has(node.id) ? '▾' : '▸'}
            </button>
          ) : (
            <span className="admin-category-toggle" />
          )}
          <button
            type="button"
            className="admin-category-node"
            aria-current={categoryId === node.id ? 'true' : undefined}
            onClick={() => onSelect(node.id)}
          >
            {node.name}
          </button>
          {node.children.length > 0 && expanded.has(node.id) ? (
            <ProductCategoryBranches
              nodes={node.children}
              categoryId={categoryId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}
