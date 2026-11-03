import { useEffect, useState } from 'react'
import { fetchProduct } from '../api/catalog.ts'
import { addFavorite, removeFavorite } from '../api/favorites.ts'
import {
  FAVORITE_ADD_FAILED,
  FAVORITE_REMOVE_FAILED,
  favoriteOutcomeMessage,
  favoriteToggleLabel,
} from '../favorites.ts'
import {
  canMoveCatalogImage,
  catalogImages,
  type SalesProductDetail,
} from '../productCatalog.ts'
import { redirectOnAccessFailure } from '../session.ts'

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`
}

function displayText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed || '-'
}

export default function ProductDetailDialog({
  productId,
  onClose,
  onAdd,
}: {
  productId: number
  onClose: () => void
  onAdd: (product: SalesProductDetail, quantity: string) => void
}) {
  const [product, setProduct] = useState<SalesProductDetail | null>(null)
  const [notice, setNotice] = useState('제품 정보를 불러오는 중입니다.')
  const [quantity, setQuantity] = useState('1')
  const [viewerOpen, setViewerOpen] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  const [favoriting, setFavoriting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchProduct(productId).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !Array.isArray(result.data.detailImages)) {
        setProduct(null)
        setNotice(result.ok ? '제품 정보를 불러오지 못했습니다.' : result.error?.message || '제품 정보를 불러오지 못했습니다.')
        return
      }
      setProduct(result.data)
      setNotice('')
    })
    return () => {
      cancelled = true
    }
  }, [productId])

  const images = product ? catalogImages(product) : []
  const currentImage = images[imageIndex] ?? null
  const favorited = Boolean(product?.favorited)

  function showImage(index: number) {
    if (index < 0 || index >= images.length) {
      return
    }
    setImageFailed(false)
    setImageIndex(index)
    setViewerOpen(true)
  }

  async function toggleFavorite() {
    if (!product || favoriting) {
      return
    }
    setFavoriting(true)
    setNotice('')
    try {
      const result = favorited ? await removeFavorite(product.id) : await addFavorite(product.id)
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        setNotice(
          favoriteOutcomeMessage(result, favorited ? FAVORITE_REMOVE_FAILED : FAVORITE_ADD_FAILED),
        )
        return
      }
      setProduct({ ...product, favorited: result.data.favorited })
    } finally {
      setFavoriting(false)
    }
  }

  return (
    <div className="customer-modal">
      <div
        className="customer-dialog product-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        <div className="customer-dialog-head">
          <h2 id="product-detail-title">{product?.name ?? '제품 상세'}</h2>
          <button
            type="button"
            className={favorited ? 'tool-button is-active' : 'tool-button'}
            aria-pressed={favorited}
            disabled={!product || favoriting}
            onClick={() => void toggleFavorite()}
          >
            {favoriting ? '처리 중' : favoriteToggleLabel(favorited)}
          </button>
          <button type="button" className="dialog-close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        {notice ? <p role="status">{notice}</p> : null}
        {product ? (
          <>
            <div className="product-detail-layout">
              <button
                type="button"
                className="product-detail-photo"
                onClick={() => showImage(0)}
                disabled={images.length === 0}
              >
                {currentImage && !imageFailed ? (
                  <img src={currentImage.imagePath} alt="" onError={() => setImageFailed(true)} />
                ) : (
                  <span className="product-thumb">이미지 없음</span>
                )}
              </button>
              <dl className="product-detail-fields">
                <div>
                  <dt>제품 코드</dt>
                  <dd>{product.productCode}</dd>
                </div>
                <div>
                  <dt>규격</dt>
                  <dd>{displayText(product.specification)}</dd>
                </div>
                <div>
                  <dt>설명</dt>
                  <dd>{displayText(product.description)}</dd>
                </div>
                <div>
                  <dt>기준 단가</dt>
                  <dd>{formatPrice(product.unitPrice)}</dd>
                </div>
                <div>
                  <dt>판매가</dt>
                  <dd>{formatPrice(product.salePrice)}</dd>
                </div>
              </dl>
            </div>
            {images.length > 0 ? (
              <div className="product-detail-thumbs">
                {images.map((image, index) => (
                  <button key={image.key} type="button" onClick={() => showImage(index)}>
                    {image.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="product-detail-quantity">
              <label>
                수량
                <input
                  value={quantity}
                  inputMode="numeric"
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
              <button type="button" onClick={onClose}>
                닫기
              </button>
              <button type="button" className="primary-button" onClick={() => onAdd(product, quantity)}>
                견적에 추가
              </button>
            </div>
          </>
        ) : null}
      </div>
      {viewerOpen && product ? (
        <div className="product-image-viewer" role="dialog" aria-modal="true" aria-label="제품 이미지">
          <div className="customer-dialog-head">
            <h2>{product.name}</h2>
            <button type="button" className="dialog-close" aria-label="닫기" onClick={() => setViewerOpen(false)}>
              ×
            </button>
          </div>
          <div className="product-image-stage">
            <button
              type="button"
              disabled={!canMoveCatalogImage(imageIndex, images.length, -1)}
              onClick={() => showImage(imageIndex - 1)}
            >
              이전
            </button>
            {currentImage && !imageFailed ? (
              <img src={currentImage.imagePath} alt="" onError={() => setImageFailed(true)} />
            ) : (
              <span className="product-thumb">이미지 없음</span>
            )}
            <button
              type="button"
              disabled={!canMoveCatalogImage(imageIndex, images.length, 1)}
              onClick={() => showImage(imageIndex + 1)}
            >
              다음
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
