export const PRODUCT_PAGE_SIZE = 9

export type CatalogDetailImage = {
  sortOrder: number
  imagePath: string | null
}

export type SalesProductDetail = {
  id: number
  productCode: string
  name: string
  unitPrice: number
  salePrice: number
  specification: string | null
  description: string | null
  imagePath: string | null
  status: string
  favorited?: boolean
  detailImages: CatalogDetailImage[]
}

export type CatalogImage = {
  key: string
  label: string
  imagePath: string
}

export function productsPath(query: {
  page: number
  size?: number
  keyword?: string
  categoryId?: number | null
  favoriteOnly?: boolean
}) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('size', String(query.size ?? PRODUCT_PAGE_SIZE))
  const keyword = query.keyword?.trim() ?? ''
  if (keyword) {
    params.set('keyword', keyword)
  }
  if (query.categoryId != null) {
    params.set('categoryId', String(query.categoryId))
  }
  if (query.favoriteOnly) {
    params.set('favoriteOnly', 'true')
  }
  return `/api/products?${params.toString()}`
}

export function pageAfterCatalogFilter() {
  return 0
}

export function catalogImages(product: {
  imagePath: string | null
  detailImages: CatalogDetailImage[]
}): CatalogImage[] {
  const images: CatalogImage[] = []
  const representative = product.imagePath?.trim() ?? ''
  if (representative) {
    images.push({ key: 'representative', label: '대표 이미지', imagePath: representative })
  }
  const details = [...product.detailImages].sort((left, right) => left.sortOrder - right.sortOrder)
  for (const image of details) {
    const path = image.imagePath?.trim() ?? ''
    if (!path) {
      continue
    }
    images.push({
      key: `detail-${image.sortOrder}`,
      label: `상세 이미지 ${image.sortOrder}`,
      imagePath: path,
    })
  }
  return images
}

export function canMoveCatalogImage(index: number, count: number, direction: -1 | 1) {
  const next = index + direction
  return count > 0 && next >= 0 && next < count
}

export function addedLineQuantity(current: string, added: string) {
  if (!/^[1-9]\d*$/.test(current.trim()) || !/^[1-9]\d*$/.test(added.trim())) {
    return null
  }
  return String(Number(current) + Number(added))
}
