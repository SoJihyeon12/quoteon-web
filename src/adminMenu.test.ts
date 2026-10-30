import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_MEMBER_TABS,
  ADMIN_MENU,
  ADMIN_PENDING_PATH,
  ADMIN_PRODUCT_TABS,
  adminNavIsCurrent,
  adminProductTabIsCurrent,
} from './adminMenu.ts'
import { pathForMember } from './navigation.ts'

test('활성 관리자는 대시보드로, 영업 사용자는 상담 화면으로 이동한다', () => {
  assert.equal(
    pathForMember({ role: 'ROLE_ADMIN', status: 'ACTIVE' }),
    ADMIN_DASHBOARD_PATH,
  )
  assert.equal(
    pathForMember({ role: 'ROLE_USER', status: 'ACTIVE' }),
    '/consultation?mode=new',
  )
})

test('관리자 상단 메뉴는 대시보드, 사용자, 제품, 견적서만 표시한다', () => {
  assert.deepEqual(
    ADMIN_MENU.map((item) => item.label),
    ['대시보드', '사용자 관리', '제품 관리', '견적서 관리'],
  )
  assert.equal(ADMIN_MENU.find((item) => item.label === '대시보드')?.path, '/admin/dashboard')
  assert.equal(ADMIN_MENU.find((item) => item.label === '사용자 관리')?.path, '/admin/members')
  assert.equal(ADMIN_MENU.find((item) => item.label === '제품 관리')?.path, '/admin/products')
  assert.equal(ADMIN_MENU.find((item) => item.label === '견적서 관리')?.path, null)
})

test('사용자 관리 탭은 가입 승인 대기와 전체 사용자를 기존 경로로 연다', () => {
  assert.deepEqual(
    ADMIN_MEMBER_TABS.map((tab) => [tab.label, tab.path]),
    [
      ['가입 승인 대기', ADMIN_PENDING_PATH],
      ['전체 사용자', '/admin/members'],
    ],
  )
  assert.equal(adminNavIsCurrent('/admin/members', '/admin/members/pending'), true)
  assert.equal(adminNavIsCurrent('/admin/members', '/admin/members'), true)
  assert.equal(adminNavIsCurrent('/admin/members', '/admin/members/12/edit'), true)
  assert.equal(adminNavIsCurrent('/admin/dashboard', '/admin/members'), false)
})

test('제품 관리 탭은 제품 목록으로, 카테고리 관리 탭은 카테고리 화면으로 이동한다', () => {
  assert.deepEqual(
    ADMIN_PRODUCT_TABS.map((tab) => [tab.label, tab.path]),
    [
      ['카테고리 관리', '/admin/categories'],
      ['제품 관리', '/admin/products'],
    ],
  )
  assert.equal(adminNavIsCurrent('/admin/products', '/admin/categories'), true)
  assert.equal(adminNavIsCurrent('/admin/products', '/admin/products/4/edit'), true)
  assert.equal(adminProductTabIsCurrent('/admin/products', '/admin/products/4'), true)
  assert.equal(adminProductTabIsCurrent('/admin/categories', '/admin/products'), false)
})
