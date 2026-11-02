import type { ApiResult } from './api/types.ts'
import { adminErrorMessage } from './adminMemberList.ts'

export const ADMIN_DASHBOARD_API_PATH = '/api/admin/dashboard'
export const DASHBOARD_LOADING = '대시보드를 불러오는 중입니다.'
export const DASHBOARD_LOAD_FAILED = '대시보드를 불러오지 못했습니다.'
export const DASHBOARD_PRODUCTS_EMPTY = '이번 달 집계된 인기 제품이 없습니다.'
export const DASHBOARD_RANKS_EMPTY = '이번 달 견적을 작성한 사용자가 없습니다.'

export type PopularProduct = {
  productCode: string
  quoteCount: number
  ratio: number
}

export type MemberQuoteRank = {
  memberId: number
  memberName: string
  quoteCount: number
}

export type AdminDashboard = {
  todayQuoteCount: number
  monthQuoteAmount: number
  pendingMemberCount: number
  activeMemberCount: number
  popularProducts: PopularProduct[]
  memberQuoteRanks: MemberQuoteRank[]
}

export function formatDashboardCount(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

export function formatDashboardAmount(value: number) {
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value)}원`
}

export function formatDashboardRatio(ratio: number) {
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(ratio)}%`
}

export function dashboardBarWidth(ratio: number) {
  return `${Math.min(100, Math.max(0, ratio))}%`
}

export function dashboardProductCodes(products: PopularProduct[]) {
  return products.map((product) => product.productCode)
}

export function dashboardRankNames(ranks: MemberQuoteRank[]) {
  return ranks.map((rank) => rank.memberName)
}

export function isAdminDashboard(value: AdminDashboard | undefined): value is AdminDashboard {
  return Boolean(
    value
    && Array.isArray(value.popularProducts)
    && Array.isArray(value.memberQuoteRanks)
    && typeof value.todayQuoteCount === 'number'
    && typeof value.monthQuoteAmount === 'number',
  )
}

export function adminDashboardError(result: ApiResult<unknown>) {
  return adminErrorMessage(result, DASHBOARD_LOAD_FAILED)
}
