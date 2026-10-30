import { useEffect, useState } from 'react'
import { adminErrorMessage } from '../adminMemberList.ts'
import {
  ADMIN_PRODUCTS_PATH,
  adminProductDetailPath,
  adminProductEditPath,
} from '../adminMenu.ts'
import { fetchAdminProduct } from '../api/adminProducts.ts'
import { fetchCategories } from '../api/catalog.ts'
import type { Category } from '../api/types.ts'
import { categoryPathLabel } from '../categoryAdmin.ts'
import {
  formatProductPrice,
  productStatusLabel,
  PRODUCT_NOT_FOUND,
  type AdminProductDetail,
} from '../adminProduct.ts'
import { navigate } from '../navigation.ts'
import { DETAIL_IMAGE_SLOTS, detailImagePath, productImageUrl } from '../productImage.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminProductTabs from './AdminProductTabs.tsx'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminProductDetailPage({ productId }: { productId: number }) {
  return (
    <AdminShell currentPath={adminProductDetailPath(productId)}>
      <ProductDetail productId={productId} />
    </AdminShell>
  )
}

function ProductDetail({ productId }: { productId: number }) {
  const [product, setProduct] = useState<AdminProductDetail | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadMessage, setLoadMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchAdminProduct(productId), fetchCategories()]).then(([productResult, categoryResult]) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(productResult) || redirectOnAccessFailure(categoryResult)) {
        return
      }
      if (!productResult.ok) {
        setLoadState('error')
        setLoadMessage(adminErrorMessage(productResult, PRODUCT_NOT_FOUND))
        return
      }
      setProduct(productResult.data)
      if (categoryResult.ok && Array.isArray(categoryResult.data)) {
        setCategories(categoryResult.data)
      }
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [productId])

  const categoryLabel = product
    ? categoryPathLabel(categories, product.categoryId) || product.categoryName
    : ''

  return (
    <>
      <header className="admin-heading">
        <h1>제품 상세 정보</h1>
      </header>
      <AdminProductTabs currentPath={ADMIN_PRODUCTS_PATH} />
      <section className="admin-product-panel" aria-labelledby="product-detail-title">
        {loadState === 'loading' ? <p role="status">제품 정보를 불러오는 중입니다.</p> : null}
        {loadState === 'error' ? <p className="admin-message" role="alert">{loadMessage || PRODUCT_NOT_FOUND}</p> : null}
        {loadState === 'ready' && product ? (
          <>
            <div className="admin-product-panel-head">
              <h2 id="product-detail-title">{product.name}</h2>
              <p className="admin-product-status">{productStatusLabel(product.status)}</p>
            </div>
            <dl className="admin-product-fields">
              <div>
                <dt>카테고리</dt>
                <dd>{categoryLabel}</dd>
              </div>
              <div>
                <dt>제품명</dt>
                <dd>{product.name}</dd>
              </div>
              <div>
                <dt>제품 코드</dt>
                <dd>{product.productCode}</dd>
              </div>
              <div>
                <dt>단가</dt>
                <dd>{formatProductPrice(product.unitPrice)}</dd>
              </div>
              <div>
                <dt>판매 가격</dt>
                <dd>{formatProductPrice(product.salePrice)}</dd>
              </div>
              <div>
                <dt>규격</dt>
                <dd>{product.specification || '-'}</dd>
              </div>
              <div>
                <dt>설명</dt>
                <dd>{product.description || '-'}</dd>
              </div>
            </dl>
            <div className="admin-product-images">
              <ProductPhoto label="대표 사진" imagePath={product.imagePath} />
              <div className="admin-product-detail-slots">
                {DETAIL_IMAGE_SLOTS.map((slot) => (
                  <ProductPhoto
                    key={slot}
                    label={`상세 이미지 ${slot}`}
                    imagePath={detailImagePath(product.detailImages, slot)}
                    compact
                  />
                ))}
              </div>
            </div>
            <div className="admin-category-form-actions">
              <button type="button" onClick={() => navigate(ADMIN_PRODUCTS_PATH)}>닫기</button>
              <button type="button" onClick={() => navigate(adminProductEditPath(productId))}>수정</button>
            </div>
          </>
        ) : null}
      </section>
    </>
  )
}

function ProductPhoto({
  label,
  imagePath,
  compact = false,
}: {
  label: string
  imagePath: string | null
  compact?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = failed ? null : productImageUrl(imagePath)
  const className = compact ? 'admin-product-photo admin-product-photo-compact' : 'admin-product-photo'
  if (!src) {
    return <p className={`${className} admin-product-photo-empty`}>{label}</p>
  }
  return <img className={className} src={src} alt={label} onError={() => setFailed(true)} />
}
