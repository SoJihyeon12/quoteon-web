export const ADMIN_DASHBOARD_PATH = '/admin/dashboard'
export const ADMIN_MEMBERS_PATH = '/admin/members'
export const ADMIN_PENDING_PATH = '/admin/members/pending'
export const ADMIN_CATEGORIES_PATH = '/admin/categories'
export const ADMIN_PRODUCTS_PATH = '/admin/products'
export const ADMIN_PRODUCT_NEW_PATH = '/admin/products/new'

export type AdminMenuItem = {
  label: string
  path: string | null
}

export const ADMIN_MENU: AdminMenuItem[] = [
  { label: '대시보드', path: ADMIN_DASHBOARD_PATH },
  { label: '사용자 관리', path: ADMIN_MEMBERS_PATH },
  { label: '제품 관리', path: ADMIN_PRODUCTS_PATH },
  { label: '견적서 관리', path: null },
]

export const ADMIN_MEMBER_TABS = [
  { label: '가입 승인 대기', path: ADMIN_PENDING_PATH },
  { label: '전체 사용자', path: ADMIN_MEMBERS_PATH },
]

export const ADMIN_PRODUCT_TABS: AdminMenuItem[] = [
  { label: '카테고리 관리', path: ADMIN_CATEGORIES_PATH },
  { label: '제품 관리', path: ADMIN_PRODUCTS_PATH },
]

export function adminProductDetailPath(productId: number) {
  return `/admin/products/${productId}`
}

export function adminProductEditPath(productId: number) {
  return `/admin/products/${productId}/edit`
}

export function adminProductIdFromDetailPath(pathname: string) {
  return productIdFromPath(/^\/admin\/products\/(\d+)$/, pathname)
}

export function adminProductIdFromEditPath(pathname: string) {
  return productIdFromPath(/^\/admin\/products\/(\d+)\/edit$/, pathname)
}

function productIdFromPath(pattern: RegExp, pathname: string) {
  const match = pattern.exec(pathname)
  if (!match) {
    return null
  }
  const productId = Number(match[1])
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return null
  }
  return productId
}

function isAdminProductSection(pathname: string) {
  return pathname === ADMIN_CATEGORIES_PATH
    || pathname === ADMIN_PRODUCTS_PATH
    || pathname === ADMIN_PRODUCT_NEW_PATH
    || adminProductIdFromDetailPath(pathname) !== null
    || adminProductIdFromEditPath(pathname) !== null
}

export function memberEditPath(memberId: number) {
  return `/admin/members/${memberId}/edit`
}

export function memberIdFromEditPath(pathname: string) {
  const match = /^\/admin\/members\/(\d+)\/edit$/.exec(pathname)
  if (!match) {
    return null
  }
  const memberId = Number(match[1])
  if (!Number.isSafeInteger(memberId) || memberId <= 0) {
    return null
  }
  return memberId
}

export function adminNavIsCurrent(itemPath: string, currentPath: string) {
  if (itemPath === ADMIN_MEMBERS_PATH) {
    return currentPath === ADMIN_MEMBERS_PATH
      || currentPath === ADMIN_PENDING_PATH
      || memberIdFromEditPath(currentPath) !== null
  }
  if (itemPath === ADMIN_PRODUCTS_PATH) {
    return isAdminProductSection(currentPath)
  }
  return itemPath === currentPath
}

export function adminProductTabIsCurrent(tabPath: string, currentPath: string) {
  if (tabPath === ADMIN_PRODUCTS_PATH) {
    return currentPath === ADMIN_PRODUCTS_PATH
      || currentPath === ADMIN_PRODUCT_NEW_PATH
      || adminProductIdFromDetailPath(currentPath) !== null
      || adminProductIdFromEditPath(currentPath) !== null
  }
  return tabPath === currentPath
}
