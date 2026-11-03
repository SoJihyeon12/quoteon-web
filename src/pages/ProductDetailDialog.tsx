import { useEffect, useState } from 'react'
import { fetchProduct } from '../api/catalog.ts'
import { addFavorite, removeFavorite } from '../api/favorites.ts'
import {
  FAVORITE_ADD_FAILED,
  FAVORITE_REMOVE_FAILED,
  favoriteOutcomeMessage,
  favoriteStar,
  favoriteToggleLabel,
} from '../favorites.ts'
import {
  canMoveCatalogImage,
  catalogImages,
  type CatalogImage,
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

function thumbLabel(image: CatalogImage) {
  if (image.key === 'representative') {
    return '대표'
  }
  const detail = /^detail-(\d+)$/.exec(image.key)
  if (detail) {
    return `상세${detail[1]}`
  }
  return image.label
}

function normalizeQuantity(value: string) {
  const parsed = Number(value.trim())
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }
  return Math.floor(parsed)
}

export default function ProductDetailDialog({
  productId,
  onClose,
  onAdd,
  onFavoriteChange,
}: {
  productId: number
  onClose: () => void
  onAdd: (product: SalesProductDetail, quantity: string) => void
  onFavoriteChange?: (productId: number, favorited: boolean) => void
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
      setImageIndex(0)
      setImageFailed(false)
      setNotice('')
    })
    return () => {
      cancelled = true
    }
  }, [productId])

  const images = product ? catalogImages(product) : []
  const currentImage = images[imageIndex] ?? null
  const favorited = Boolean(product?.favorited)
  const canAdd = Boolean(product) && product?.status === 'ACTIVE'

  function selectImage(index: number) {
    if (index < 0 || index >= images.length) {
      return
    }
    setImageFailed(false)
    setImageIndex(index)
  }

  function openViewer(index = imageIndex) {
    if (index < 0 || index >= images.length) {
      return
    }
    setImageFailed(false)
    setImageIndex(index)
    setViewerOpen(true)
  }

  function changeQuantity(delta: number) {
    setQuantity(String(Math.max(1, normalizeQuantity(quantity) + delta)))
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
      onFavoriteChange?.(product.id, result.data.favorited)
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
        <div className="product-detail-head">
          <div className="product-detail-title-row">
            <h2 id="product-detail-title">{product?.name ?? '제품 상세'}</h2>
            <button
              type="button"
              className={favorited ? 'product-detail-favorite is-active' : 'product-detail-favorite'}
              aria-label={favoriteToggleLabel(favorited)}
              aria-pressed={favorited}
              disabled={!product || favoriting}
              onClick={() => void toggleFavorite()}
            >
              <span aria-hidden="true">{favoriteStar(favorited)}</span>
            </button>
          </div>
          <button type="button" className="dialog-close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        {notice ? (
          <p className="product-detail-notice" role="status">
            {notice}
          </p>
        ) : null}
        {product ? (
          <>
            <div className="product-detail-gallery">
              <button
                type="button"
                className="product-detail-photo"
                onClick={() => openViewer(imageIndex)}
                disabled={images.length === 0}
                aria-label="제품 이미지 크게 보기"
              >
                {currentImage && !imageFailed ? (
                  <img src={currentImage.imagePath} alt="" onError={() => setImageFailed(true)} />
                ) : (
                  <span className="product-thumb">이미지 없음</span>
                )}
                {currentImage?.key === 'representative' ? (
                  <span className="product-detail-badge">대표</span>
                ) : null}
              </button>
              {images.length > 0 ? (
                <div className="product-detail-thumbs" aria-label="제품 이미지 목록">
                  {images.map((image, index) => (
                    <button
                      key={image.key}
                      type="button"
                      className={
                        index === imageIndex
                          ? 'product-detail-thumb is-active'
                          : 'product-detail-thumb'
                      }
                      aria-pressed={index === imageIndex}
                      aria-label={thumbLabel(image)}
                      onClick={() => selectImage(index)}
                    >
                      <img src={image.imagePath} alt="" />
                      <span>{thumbLabel(image)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <dl className="product-detail-fields">
              <div>
                <dt>코드</dt>
                <dd>{product.productCode}</dd>
              </div>
              <div>
                <dt>설명</dt>
                <dd>{displayText(product.description)}</dd>
              </div>
              <div>
                <dt>규격</dt>
                <dd>{displayText(product.specification)}</dd>
              </div>
              <div>
                <dt>제품가격</dt>
                <dd className="product-detail-price">{formatPrice(product.salePrice)}</dd>
              </div>
            </dl>

            <div className="product-detail-actions">
              <div className="product-detail-quantity">
                <span className="product-detail-quantity-label" id="product-detail-quantity-label">
                  수량
                </span>
                <div className="product-detail-stepper" role="group" aria-labelledby="product-detail-quantity-label">
                  <button
                    type="button"
                    aria-label="수량 감소"
                    disabled={normalizeQuantity(quantity) <= 1}
                    onClick={() => changeQuantity(-1)}
                  >
                    −
                  </button>
                  <input
                    value={quantity}
                    inputMode="numeric"
                    aria-label="수량"
                    onChange={(event) => setQuantity(event.target.value)}
                    onBlur={() => setQuantity(String(normalizeQuantity(quantity)))}
                  />
                  <button type="button" aria-label="수량 증가" onClick={() => changeQuantity(1)}>
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="product-detail-add"
                disabled={!canAdd}
                onClick={() => onAdd(product, String(normalizeQuantity(quantity)))}
              >
                견적에 추가
              </button>
            </div>
          </>
        ) : null}
      </div>

      {viewerOpen && product ? (
        <div className="product-image-viewer" role="dialog" aria-modal="true" aria-label="제품 이미지">
          <div className="product-image-viewer-card">
            <div className="product-detail-head">
              <div className="product-detail-title-row">
                <h2>{product.name}</h2>
                <button
                  type="button"
                  className={favorited ? 'product-detail-favorite is-active' : 'product-detail-favorite'}
                  aria-label={favoriteToggleLabel(favorited)}
                  aria-pressed={favorited}
                  disabled={favoriting}
                  onClick={() => void toggleFavorite()}
                >
                  <span aria-hidden="true">{favoriteStar(favorited)}</span>
                </button>
              </div>
              <button
                type="button"
                className="dialog-close"
                aria-label="닫기"
                onClick={() => setViewerOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="product-image-stage">
              <button
                type="button"
                className="product-image-nav"
                aria-label="이전 이미지"
                disabled={!canMoveCatalogImage(imageIndex, images.length, -1)}
                onClick={() => selectImage(imageIndex - 1)}
              >
                ‹
              </button>
              {currentImage && !imageFailed ? (
                <img src={currentImage.imagePath} alt="" onError={() => setImageFailed(true)} />
              ) : (
                <span className="product-thumb">이미지 없음</span>
              )}
              <button
                type="button"
                className="product-image-nav"
                aria-label="다음 이미지"
                disabled={!canMoveCatalogImage(imageIndex, images.length, 1)}
                onClick={() => selectImage(imageIndex + 1)}
              >
                ›
              </button>
            </div>
            {images.length > 0 ? (
              <div className="product-image-viewer-thumbs" aria-label="제품 이미지 목록">
                {images.map((image, index) => (
                  <button
                    key={image.key}
                    type="button"
                    className={
                      index === imageIndex
                        ? 'product-detail-thumb is-active'
                        : 'product-detail-thumb'
                    }
                    aria-pressed={index === imageIndex}
                    aria-label={thumbLabel(image)}
                    onClick={() => selectImage(index)}
                  >
                    <img src={image.imagePath} alt="" />
                    <span>{thumbLabel(image)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
