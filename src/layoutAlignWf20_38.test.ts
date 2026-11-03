import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const adminCss = readFileSync(join(root, 'src/pages/AdminHomePage.css'), 'utf8')
const customerCss = readFileSync(join(root, 'src/pages/CustomerListPage.css'), 'utf8')
const customerList = readFileSync(join(root, 'src/pages/CustomerListPage.tsx'), 'utf8')
const customerDetail = readFileSync(join(root, 'src/pages/CustomerDetailPage.tsx'), 'utf8')
const memberEdit = readFileSync(join(root, 'src/pages/AdminMemberEditPage.tsx'), 'utf8')
const productDetail = readFileSync(join(root, 'src/pages/AdminProductDetailPage.tsx'), 'utf8')
const quoteDetailCss = readFileSync(join(root, 'src/pages/AdminQuoteDetailPage.css'), 'utf8')
const quoteList = readFileSync(join(root, 'src/pages/AdminQuoteListPage.tsx'), 'utf8')

test('관리자 공통 제목·검색·수정 패널 너비가 콘텐츠 폭에 맞춰진다', () => {
  assert.match(adminCss, /\.admin-heading\s*\{[^}]*max-width:\s*var\(--qo-content-max\)/s)
  assert.match(adminCss, /\.admin-product-search\s*\{[^}]*max-width:\s*var\(--qo-content-max\)/s)
  assert.match(adminCss, /\.admin-edit,\s*\n\.admin-edit-panel\s*\{/s)
  assert.match(adminCss, /\.admin-product-panel\.admin-quote-detail\s*\{[^}]*max-width:\s*var\(--qo-content-max\)/s)
  assert.match(memberEdit, /admin-edit-panel/)
})

test('고객 목록은 검색과 등록 버튼을 같은 툴바에 두고 표제목을 고객 목록으로 쓴다', () => {
  assert.match(customerList, /고객 목록/)
  assert.match(customerList, /customer-list-toolbar/)
  assert.match(customerList, /\+ 고객 등록/)
  assert.match(customerList, /customer-create-dialog/)
  assert.match(customerList, /aria-label="닫기"/)
  assert.match(customerCss, /\.customer-list-toolbar/)
  assert.match(customerCss, /\.customer-layout \.quote-panel/)
})

test('고객 상세·수정과 제품 상세 버튼 위계 클래스를 유지한다', () => {
  assert.match(customerDetail, /customer-detail-panel/)
  assert.match(customerDetail, /customer-action-primary/)
  assert.match(customerDetail, /customer-action-secondary/)
  assert.doesNotMatch(customerDetail, /고객 비활성화/)
  assert.doesNotMatch(customerDetail, /deactivateCustomer/)
  assert.match(customerCss, /\.customer-detail-panel\s*\{[^}]*max-width:\s*880px/s)
  assert.match(customerCss, /\.customer-detail-panel-edit\s*\{[^}]*max-width:\s*720px/s)
  assert.match(customerCss, /\.customer-detail\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s)
  assert.doesNotMatch(customerCss, /\.customer-detail\s*\{[^}]*repeat\(2/s)
  assert.match(customerCss, /\.customer-list-panel \.quote-heading[\s\S]*width:\s*min\(100%,\s*820px\)/)
  assert.match(productDetail, /admin-product-primary/)
  assert.match(adminCss, /\.admin-product-panel \.admin-category-form-actions button\[type='submit'\]/)
})

test('사용자 수정은 비활성화와 저장을 좌우로 배치한다', () => {
  assert.match(memberEdit, /admin-edit-deactivate/)
  assert.match(memberEdit, />\s*비활성화\s*</)
  assert.match(memberEdit, /type="submit"/)
  assert.match(memberEdit, /MEMBER_DEACTIVATION_REASONS/)
  assert.match(memberEdit, /member-deactivation-reason/)
  assert.match(memberEdit, /MEMBER_DEACTIVATE_FINAL_CONFIRM/)
  assert.match(adminCss, /\.admin-edit-actions > button\[type='submit'\]\s*\{[^}]*margin-left:\s*auto/s)
  assert.match(adminCss, /\.admin-deactivate-reasons/)
})

test('관리자 견적 목록 금액은 헤더·셀 모두 왼쪽 정렬이다', () => {
  assert.match(quoteList, /admin-table-quotes/)
  assert.match(quoteList, /admin-quote-amount/)
  assert.match(
    adminCss,
    /\.admin-table-quotes th\.admin-quote-amount,\s*\n\.admin-table-quotes td\.admin-quote-amount\s*\{[^}]*text-align:\s*left;/s,
  )
  assert.doesNotMatch(
    adminCss,
    /\.admin-table-quotes th\.admin-quote-amount[\s\S]{0,120}text-align:\s*right/,
  )
  assert.match(adminCss, /\.admin-table-quotes \.admin-quote-col-action\s*\{[^}]*width:\s*7\.25rem;/s)
  assert.match(quoteDetailCss, /\.admin-quote-detail \.admin-edit-head/)
})

test('대시보드는 세로 공간을 활용하는 카드·패널 높이를 둔다', () => {
  assert.match(adminCss, /\.admin-dashboard-card\s*\{[^}]*min-height:\s*140px/s)
  assert.match(adminCss, /\.admin-dashboard-panels\s*\{[^}]*min-height:\s*min\(420px/s)
})
