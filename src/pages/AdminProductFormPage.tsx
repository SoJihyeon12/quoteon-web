import { useEffect, useRef, useState, type FormEvent } from 'react'
import { adminErrorMessage } from '../adminMemberList.ts'
import {
  ADMIN_PRODUCT_NEW_PATH,
  ADMIN_PRODUCTS_PATH,
  adminProductDetailPath,
  adminProductEditPath,
} from '../adminMenu.ts'
import {
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProduct,
  stopAdminProduct,
  updateAdminProduct,
  uploadProductDetailImage,
  uploadProductImage,
} from '../api/adminProducts.ts'
import { fetchCategories } from '../api/catalog.ts'
import type { Category } from '../api/types.ts'
import { categoryForest, categoryPathLabel, type CategoryNode } from '../categoryAdmin.ts'
import {
  buildProductBody,
  productSaveResult,
  productStatusLabel,
  PRODUCT_NOT_FOUND,
  validateProductForm,
  type AdminProductDetail,
  type ProductDetailImage,
  type ProductFormErrors,
} from '../adminProduct.ts'
import {
  canConfirmProductDelete,
  canConfirmProductStop,
  canStopProductSale,
  PRODUCT_DELETE_ACK,
  PRODUCT_DELETE_CANCEL,
  PRODUCT_DELETE_CONFIRM,
  PRODUCT_DELETE_MESSAGE,
  PRODUCT_DELETE_TITLE,
  PRODUCT_STOP_BLOCKED,
  PRODUCT_STOP_CANCEL,
  PRODUCT_STOP_CONFIRM,
  PRODUCT_STOP_MESSAGE,
  PRODUCT_STOP_TITLE,
  productDeleteOutcome,
  productStopOutcome,
} from '../productSale.ts'
import {
  DETAIL_IMAGE_SLOTS,
  detailImagePath,
  imageUploadMessage,
  PRODUCT_IMAGE_AFTER_CREATE_FAILED,
  productImageUrl,
  replaceDetailImage,
  shouldUploadImages,
  validateProductImage,
} from '../productImage.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminProductTabs from './AdminProductTabs.tsx'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminProductFormPage({ productId }: { productId: number | null }) {
  const currentPath = productId === null ? ADMIN_PRODUCT_NEW_PATH : adminProductEditPath(productId)
  return (
    <AdminShell currentPath={currentPath}>
      <ProductForm productId={productId} />
    </AdminShell>
  )
}

function ProductForm({ productId }: { productId: number | null }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [specification, setSpecification] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadMessage, setLoadMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ProductFormErrors>({})
  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [dialog, setDialog] = useState<null | 'stop' | 'delete' | 'delete-blocked'>(null)
  const [dialogMessage, setDialogMessage] = useState('')
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [detailImages, setDetailImages] = useState<ProductDetailImage[]>([])
  const [pendingRepresentative, setPendingRepresentative] = useState<File | null>(null)
  const [pendingDetails, setPendingDetails] = useState<(File | null)[]>([null, null, null])
  const [representativePreview, setRepresentativePreview] = useState<string | null>(null)
  const [detailPreviews, setDetailPreviews] = useState<(string | null)[]>([null, null, null])
  const [busySlots, setBusySlots] = useState<string[]>([])
  const savingRef = useRef(false)
  const actionRef = useRef(false)
  const busyRef = useRef(new Set<string>())
  const mountedRef = useRef(true)
  const previewRef = useRef<{ representative: string | null; details: (string | null)[] }>({
    representative: null,
    details: [null, null, null],
  })

  function applyLoadedProduct(product: AdminProductDetail) {
    setCategoryId(String(product.categoryId))
    setName(product.name)
    setProductCode(product.productCode)
    setUnitPrice(String(product.unitPrice))
    setSalePrice(String(product.salePrice))
    setSpecification(product.specification ?? '')
    setDescription(product.description ?? '')
    setStatus(product.status)
    setImagePath(product.imagePath)
    setDetailImages(product.detailImages ?? [])
  }

  function setSlotBusy(key: string, busy: boolean) {
    if (busy) {
      busyRef.current.add(key)
    } else {
      busyRef.current.delete(key)
    }
    if (mountedRef.current) {
      setBusySlots([...busyRef.current])
    }
  }

  function rememberRepresentative(file: File | null) {
    revokePreview(previewRef.current.representative)
    const url = file ? URL.createObjectURL(file) : null
    previewRef.current.representative = url
    setPendingRepresentative(file)
    setRepresentativePreview(url)
  }

  function rememberDetail(slot: number, file: File | null) {
    const index = slot - 1
    revokePreview(previewRef.current.details[index] ?? null)
    const url = file ? URL.createObjectURL(file) : null
    const details = [...previewRef.current.details]
    details[index] = url
    previewRef.current.details = details
    setPendingDetails((current) => {
      const next = [...current]
      next[index] = file
      return next
    })
    setDetailPreviews(details)
  }

  function clearPendingImages() {
    rememberRepresentative(null)
    for (const slot of DETAIL_IMAGE_SLOTS) {
      rememberDetail(slot, null)
    }
  }

  useEffect(() => {
    let cancelled = false
    const productRequest = productId === null ? Promise.resolve(null) : fetchAdminProduct(productId)
    Promise.all([fetchCategories(), productRequest]).then(([categoryResult, productResult]) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(categoryResult) || (productResult && redirectOnAccessFailure(productResult))) {
        return
      }
      if (!categoryResult.ok || !Array.isArray(categoryResult.data)) {
        setLoadState('error')
        setLoadMessage(adminErrorMessage(categoryResult, '카테고리 목록을 불러오지 못했습니다.'))
        return
      }
      setCategories(categoryResult.data)
      if (productResult && !productResult.ok) {
        setLoadState('error')
        setLoadMessage(adminErrorMessage(productResult, PRODUCT_NOT_FOUND))
        return
      }
      if (productResult?.ok) {
        applyLoadedProduct(productResult.data)
      }
      clearPendingImages()
      const notice = readProductImageNotice()
      setFormMessage(notice)
      if (notice) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [productId])

  useEffect(() => {
    if (!dialog) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionRef.current) {
        setDialog(null)
        setDialogMessage('')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dialog])

  useEffect(() => {
    mountedRef.current = true
    const previews = previewRef.current
    return () => {
      mountedRef.current = false
      revokePreview(previews.representative)
      previews.details.forEach(revokePreview)
    }
  }, [])

  async function chooseRepresentative(file: File) {
    const message = validateProductImage(file)
    if (message) {
      setFormMessage(message)
      return
    }
    setFormMessage('')
    if (actionRef.current) {
      return
    }
    if (productId === null) {
      rememberRepresentative(file)
      return
    }
    if (busyRef.current.has('representative')) {
      return
    }
    setSlotBusy('representative', true)
    rememberRepresentative(file)
    try {
      const result = await uploadProductImage(productId, file)
      if (!mountedRef.current || redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        rememberRepresentative(null)
        setFormMessage(imageUploadMessage(result))
        return
      }
      rememberRepresentative(null)
      setImagePath(result.data.imagePath)
      setDetailImages(result.data.detailImages ?? [])
    } finally {
      setSlotBusy('representative', false)
    }
  }

  async function chooseDetail(slot: number, file: File) {
    const message = validateProductImage(file)
    if (message) {
      setFormMessage(message)
      return
    }
    setFormMessage('')
    if (actionRef.current) {
      return
    }
    const key = `detail-${slot}`
    if (productId === null) {
      rememberDetail(slot, file)
      return
    }
    if (busyRef.current.has(key)) {
      return
    }
    setSlotBusy(key, true)
    rememberDetail(slot, file)
    try {
      const result = await uploadProductDetailImage(productId, slot, file)
      if (!mountedRef.current || redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        rememberDetail(slot, null)
        setFormMessage(imageUploadMessage(result))
        return
      }
      rememberDetail(slot, null)
      setDetailImages((current) => replaceDetailImage(current, slot, result.data.imagePath))
    } finally {
      setSlotBusy(key, false)
    }
  }

  function closeDialog() {
    if (actionRef.current) {
      return
    }
    setDialog(null)
    setDialogMessage('')
  }

  function openStop() {
    if (productId === null || savingRef.current || actionRef.current || busyRef.current.size > 0) {
      return
    }
    setFormMessage('')
    if (!canStopProductSale(status)) {
      setFormMessage(PRODUCT_STOP_BLOCKED)
      return
    }
    setDialogMessage('')
    setDialog('stop')
  }

  function openDelete() {
    if (productId === null || savingRef.current || actionRef.current || busyRef.current.size > 0) {
      return
    }
    setFormMessage('')
    setDialogMessage('')
    setDialog('delete')
  }

  async function confirmStop() {
    if (productId === null || !canConfirmProductStop(dialog === 'stop', actionRef.current, status)) {
      return
    }
    actionRef.current = true
    setActing(true)
    setDialogMessage('')
    try {
      const result = await stopAdminProduct(productId)
      if (!mountedRef.current || redirectOnAccessFailure(result)) {
        return
      }
      const outcome = productStopOutcome(result)
      if (outcome.type === 'stopped' && outcome.product) {
        applyLoadedProduct(outcome.product)
        setDialog(null)
        setDialogMessage('')
        return
      }
      setDialogMessage(outcome.message)
    } finally {
      actionRef.current = false
      if (mountedRef.current) {
        setActing(false)
      }
    }
  }

  async function confirmDelete() {
    if (productId === null || !canConfirmProductDelete(dialog === 'delete', actionRef.current)) {
      return
    }
    actionRef.current = true
    setActing(true)
    setDialogMessage('')
    try {
      const result = await deleteAdminProduct(productId)
      if (!mountedRef.current || redirectOnAccessFailure(result)) {
        return
      }
      const outcome = productDeleteOutcome(result)
      if (outcome.type === 'deleted') {
        setDialog(null)
        setDialogMessage('')
        setLoadMessage(outcome.message)
        setLoadState('error')
        return
      }
      if (outcome.type === 'in-use') {
        setDialog('delete-blocked')
        setDialogMessage(outcome.message)
        return
      }
      setDialogMessage(outcome.message)
    } finally {
      actionRef.current = false
      if (mountedRef.current) {
        setActing(false)
      }
    }
  }

  function closeForm() {
    if (savingRef.current || actionRef.current) {
      return
    }
    navigate(productId === null ? ADMIN_PRODUCTS_PATH : adminProductDetailPath(productId))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current || actionRef.current) {
      return
    }
    const values = { categoryId, name, productCode, unitPrice, salePrice, specification, description }
    const errors = validateProductForm(values)
    setFieldErrors(errors)
    setFormMessage('')
    const imageMessage = validatePendingImages(pendingRepresentative, pendingDetails)
    if (imageMessage) {
      setFormMessage(imageMessage)
      return
    }
    const body = buildProductBody(values)
    if (!body) {
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const result = productId === null
        ? await createAdminProduct(body)
        : await updateAdminProduct(productId, body)
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (productId === null && result.ok) {
        const createdId = result.data.id
        const hasImage = pendingRepresentative !== null || pendingDetails.some((file) => file !== null)
        if (shouldUploadImages(true, hasImage)) {
          const failure = await uploadPendingImages(createdId, pendingRepresentative, pendingDetails)
          if (failure === 'redirect') {
            return
          }
          if (failure) {
            navigate(adminProductEditPath(createdId), {
              productImageNotice: `${PRODUCT_IMAGE_AFTER_CREATE_FAILED} ${failure}`,
            })
            return
          }
        }
        navigate(ADMIN_PRODUCTS_PATH)
        return
      }
      const outcome = productSaveResult(result)
      if (outcome.type === 'saved' && outcome.path) {
        navigate(outcome.path)
        return
      }
      if (outcome.type === 'code') {
        setFieldErrors({ productCode: outcome.message })
        return
      }
      setFormMessage(outcome.message)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const options = flattenCategories(categoryForest(categories))
  const locked = saving || acting

  return (
    <>
      <header className="admin-heading">
        <h1>{productId === null ? '제품 등록' : '제품 수정'}</h1>
      </header>
      <AdminProductTabs currentPath={ADMIN_PRODUCTS_PATH} />
      <section className="admin-product-panel">
        <div className="admin-edit-head">
          <h2>{productId === null ? '제품 등록' : '제품 수정'}</h2>
          {productId !== null && loadState === 'ready' ? (
            <div className="admin-product-sale">
              <p className="admin-product-status">{productStatusLabel(status)}</p>
              <button
                type="button"
                className="admin-product-stop"
                disabled={locked || busySlots.length > 0 || !canStopProductSale(status)}
                onClick={openStop}
              >
                판매 중지
              </button>
            </div>
          ) : null}
          <button type="button" className="admin-edit-close" onClick={closeForm} disabled={locked}>닫기</button>
        </div>
        {loadState === 'loading' ? <p role="status">제품 정보를 불러오는 중입니다.</p> : null}
        {loadState === 'error' ? <p className="admin-message" role="alert">{loadMessage}</p> : null}
        {loadState === 'ready' ? (
          <form className="admin-category-form" onSubmit={handleSubmit}>
            <label>
              카테고리
              <select
                value={categoryId}
                aria-invalid={fieldErrors.categoryId ? true : undefined}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={locked}
              >
                <option value="">선택</option>
                {options.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryPathLabel(categories, category.id)}
                  </option>
                ))}
              </select>
            </label>
            {fieldErrors.categoryId ? <p className="admin-field-error">{fieldErrors.categoryId}</p> : null}
            <label>
              제품명
              <input value={name} aria-invalid={fieldErrors.name ? true : undefined} onChange={(event) => setName(event.target.value)} disabled={locked} />
            </label>
            {fieldErrors.name ? <p className="admin-field-error">{fieldErrors.name}</p> : null}
            <label>
              제품 코드
              <input value={productCode} aria-invalid={fieldErrors.productCode ? true : undefined} onChange={(event) => setProductCode(event.target.value)} disabled={locked} />
            </label>
            {fieldErrors.productCode ? <p className="admin-field-error">{fieldErrors.productCode}</p> : null}
            <label>
              단가
              <input value={unitPrice} inputMode="decimal" aria-invalid={fieldErrors.unitPrice ? true : undefined} onChange={(event) => setUnitPrice(event.target.value)} disabled={locked} />
            </label>
            {fieldErrors.unitPrice ? <p className="admin-field-error">{fieldErrors.unitPrice}</p> : null}
            <label>
              판매 가격
              <input value={salePrice} inputMode="decimal" aria-invalid={fieldErrors.salePrice ? true : undefined} onChange={(event) => setSalePrice(event.target.value)} disabled={locked} />
            </label>
            {fieldErrors.salePrice ? <p className="admin-field-error">{fieldErrors.salePrice}</p> : null}
            <label>
              규격
              <input value={specification} aria-invalid={fieldErrors.specification ? true : undefined} onChange={(event) => setSpecification(event.target.value)} disabled={locked} />
            </label>
            {fieldErrors.specification ? <p className="admin-field-error">{fieldErrors.specification}</p> : null}
            <label>
              설명
              <input value={description} onChange={(event) => setDescription(event.target.value)} disabled={locked} />
            </label>
            <div className="admin-product-images">
              <ImagePicker
                label="대표 사진 업로드"
                note="파일당 5MB 이하"
                src={representativePreview ?? productImageUrl(imagePath)}
                disabled={busySlots.includes('representative') || acting || (productId === null && saving)}
                onSelect={(file) => void chooseRepresentative(file)}
              />
              <div className="admin-product-image-group">
                <p className="admin-product-image-group-title">상세 이미지 업로드</p>
                <p className="admin-product-image-note">파일당 5MB 이하</p>
                <div className="admin-product-detail-slots">
                  {DETAIL_IMAGE_SLOTS.map((slot) => (
                    <ImagePicker
                      key={slot}
                      label={`상세 이미지 ${slot}`}
                      compact
                      src={detailPreviews[slot - 1] ?? productImageUrl(detailImagePath(detailImages, slot))}
                      disabled={busySlots.includes(`detail-${slot}`) || acting || (productId === null && saving)}
                      onSelect={(file) => void chooseDetail(slot, file)}
                    />
                  ))}
                </div>
              </div>
            </div>
            {formMessage ? <p className="admin-message" role="alert">{formMessage}</p> : null}
            <div className={productId === null ? 'admin-category-form-actions' : 'admin-category-form-actions admin-product-form-actions'}>
              {productId !== null ? (
                <button
                  type="button"
                  className="admin-category-delete"
                  onClick={openDelete}
                  disabled={locked || busySlots.length > 0}
                >
                  삭제
                </button>
              ) : null}
              <button type="button" onClick={closeForm} disabled={locked}>취소</button>
              <button type="submit" disabled={locked}>{saving ? '저장 중' : '저장'}</button>
            </div>
          </form>
        ) : null}
      </section>
      {dialog === 'stop' ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="product-stop-title">
            <h2 id="product-stop-title">{PRODUCT_STOP_TITLE}</h2>
            <p>{PRODUCT_STOP_MESSAGE}</p>
            {dialogMessage ? <p className="admin-message" role="alert">{dialogMessage}</p> : null}
            <div className="admin-dialog-actions">
              <button type="button" className="admin-dialog-cancel" disabled={acting} onClick={closeDialog}>
                {PRODUCT_STOP_CANCEL}
              </button>
              <button
                type="button"
                className="admin-category-delete"
                disabled={!canConfirmProductStop(true, acting, status)}
                onClick={() => void confirmStop()}
              >
                {acting ? '판매 중지 중' : PRODUCT_STOP_CONFIRM}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {dialog === 'delete' ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="product-delete-title">
            <h2 id="product-delete-title">{PRODUCT_DELETE_TITLE}</h2>
            <p>{PRODUCT_DELETE_MESSAGE}</p>
            {dialogMessage ? <p className="admin-message" role="alert">{dialogMessage}</p> : null}
            <div className="admin-dialog-actions">
              <button type="button" className="admin-dialog-cancel" disabled={acting} onClick={closeDialog}>
                {PRODUCT_DELETE_CANCEL}
              </button>
              <button
                type="button"
                className="admin-category-delete"
                disabled={!canConfirmProductDelete(true, acting)}
                onClick={() => void confirmDelete()}
              >
                {acting ? '삭제 중' : PRODUCT_DELETE_CONFIRM}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {dialog === 'delete-blocked' ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="product-delete-blocked-title">
            <h2 id="product-delete-blocked-title">{PRODUCT_DELETE_TITLE}</h2>
            <p>{dialogMessage}</p>
            <div className="admin-dialog-actions">
              <button type="button" className="admin-dialog-cancel" onClick={closeDialog}>
                {PRODUCT_DELETE_ACK}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const items: CategoryNode[] = []
  for (const node of nodes) {
    items.push(node)
    items.push(...flattenCategories(node.children))
  }
  return items
}

function ImagePicker({
  label,
  note,
  src,
  disabled,
  compact = false,
  onSelect,
}: {
  label: string
  note?: string
  src: string | null
  disabled: boolean
  compact?: boolean
  onSelect: (file: File) => void
}) {
  const className = compact ? 'admin-product-photo admin-product-photo-compact' : 'admin-product-photo'
  return (
    <label className={`admin-product-image-slot${disabled ? ' is-disabled' : ''}`}>
      {src ? (
        <img className={className} src={src} alt={label} />
      ) : (
        <span className={`${className} admin-product-photo-empty`}>
          <span>{label}</span>
          {note ? <span className="admin-product-image-note">{note}</span> : null}
        </span>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        aria-label={label}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) {
            onSelect(file)
          }
        }}
      />
    </label>
  )
}

function readProductImageNotice() {
  const state = window.history.state as { productImageNotice?: string } | null
  return state?.productImageNotice ?? ''
}

function revokePreview(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url)
  }
}

function validatePendingImages(representative: File | null, details: (File | null)[]) {
  if (representative) {
    const message = validateProductImage(representative)
    if (message) {
      return message
    }
  }
  for (const file of details) {
    if (!file) {
      continue
    }
    const message = validateProductImage(file)
    if (message) {
      return message
    }
  }
  return ''
}

async function uploadPendingImages(
  createdId: number,
  representative: File | null,
  details: (File | null)[],
): Promise<'redirect' | string> {
  if (representative) {
    const result = await uploadProductImage(createdId, representative)
    if (redirectOnAccessFailure(result)) {
      return 'redirect'
    }
    if (!result.ok) {
      return imageUploadMessage(result)
    }
  }
  for (let index = 0; index < details.length; index += 1) {
    const file = details[index]
    if (!file) {
      continue
    }
    const result = await uploadProductDetailImage(createdId, index + 1, file)
    if (redirectOnAccessFailure(result)) {
      return 'redirect'
    }
    if (!result.ok) {
      return imageUploadMessage(result)
    }
  }
  return ''
}
