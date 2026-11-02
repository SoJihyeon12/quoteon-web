import assert from 'node:assert/strict'
import test from 'node:test'
import { CONNECTION_MESSAGE, CSRF_MESSAGE } from './loginDecision.ts'
import { fetchAdminDashboard } from './api/adminDashboard.ts'
import {
  ADMIN_DASHBOARD_API_PATH,
  DASHBOARD_LOADING,
  DASHBOARD_PRODUCTS_EMPTY,
  DASHBOARD_RANKS_EMPTY,
  adminDashboardError,
  dashboardBarWidth,
  dashboardProductCodes,
  dashboardRankNames,
  formatDashboardAmount,
  formatDashboardCount,
  formatDashboardRatio,
  isAdminDashboard,
  type AdminDashboard,
} from './adminDashboard.ts'

const dashboard: AdminDashboard = {
  todayQuoteCount: 12,
  monthQuoteAmount: 48200000,
  pendingMemberCount: 3,
  activeMemberCount: 28,
  popularProducts: [
    { productCode: 'P6', quoteCount: 6, ratio: 28.6 },
    { productCode: 'P5', quoteCount: 5, ratio: 23.8 },
    { productCode: 'SH-600', quoteCount: 1, ratio: 40 },
  ],
  memberQuoteRanks: [
    { memberId: 2, memberName: '동점가', quoteCount: 2 },
    { memberId: 1, memberName: '일등', quoteCount: 3 },
    { memberId: 4, memberName: '휴면', quoteCount: 1 },
  ],
}

test('관리자 대시보드는 GET /api/admin/dashboard 응답 필드를 사용한다', () => {
  assert.equal(ADMIN_DASHBOARD_API_PATH, '/api/admin/dashboard')
  assert.equal(typeof fetchAdminDashboard, 'function')
  assert.equal(isAdminDashboard(dashboard), true)
  assert.equal(isAdminDashboard(undefined), false)
})

test('견적 금액은 원화로, 건수와 회원 수는 천 단위로 표시한다', () => {
  assert.equal(formatDashboardAmount(48200000), '48,200,000원')
  assert.equal(formatDashboardAmount(30.5), '30.5원')
  assert.equal(formatDashboardCount(12), '12')
  assert.equal(formatDashboardCount(1212), '1,212')
  assert.equal(formatDashboardCount(dashboard.pendingMemberCount), '3')
  assert.equal(formatDashboardCount(dashboard.activeMemberCount), '28')
})

test('인기 제품 막대와 비율은 응답 ratio를 기준으로 표시한다', () => {
  assert.equal(formatDashboardRatio(40), '40%')
  assert.equal(formatDashboardRatio(28.6), '28.6%')
  assert.equal(dashboardBarWidth(28.6), '28.6%')
  assert.equal(dashboardBarWidth(0), '0%')
  assert.equal(dashboardBarWidth(120), '100%')
  assert.deepEqual(dashboardProductCodes(dashboard.popularProducts), ['P6', 'P5', 'SH-600'])
})

test('사용자별 견적 순위는 응답 순서를 유지한다', () => {
  assert.deepEqual(dashboardRankNames(dashboard.memberQuoteRanks), ['동점가', '일등', '휴면'])
})

test('대시보드 로딩과 빈 목록 문구를 구분한다', () => {
  assert.equal(DASHBOARD_LOADING, '대시보드를 불러오는 중입니다.')
  assert.equal(dashboard.popularProducts.length === 0 ? DASHBOARD_PRODUCTS_EMPTY : '', '')
  assert.equal(DASHBOARD_PRODUCTS_EMPTY, '이번 달 집계된 인기 제품이 없습니다.')
  assert.equal(DASHBOARD_RANKS_EMPTY, '이번 달 견적을 작성한 사용자가 없습니다.')
  assert.deepEqual(dashboardProductCodes([]), [])
  assert.deepEqual(dashboardRankNames([]), [])
})

test('대시보드 오류는 로그인, 권한, 연결 실패와 서버 문구를 구분한다', () => {
  assert.equal(
    adminDashboardError({
      ok: false,
      status: 401,
      error: { status: 401, code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' },
    }),
    '로그인이 필요합니다.',
  )
  assert.equal(
    adminDashboardError({
      ok: false,
      status: 403,
      error: { status: 403, code: 'FORBIDDEN', message: '이 기능을 사용할 권한이 없습니다.' },
    }),
    '이 기능을 사용할 권한이 없습니다.',
  )
  assert.equal(
    adminDashboardError({
      ok: false,
      status: 403,
      error: { status: 403, code: 'CSRF', message: 'ignored' },
    }),
    CSRF_MESSAGE,
  )
  assert.equal(adminDashboardError({ ok: false, status: 0, error: null }), CONNECTION_MESSAGE)
})
