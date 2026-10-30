import assert from 'node:assert/strict'
import test from 'node:test'
import { CSRF_MESSAGE, CONNECTION_MESSAGE } from './loginDecision.ts'
import {
  adminErrorMessage,
  canGoToNextMemberPage,
  canGoToPreviousMemberPage,
  displayText,
  expectedMemberPages,
  formatCreatedAt,
  memberRoleLabel,
  memberStatusLabel,
  membersPath,
  membersRequestPath,
  pageAfterMemberSearch,
  pendingMembersPath,
  visibleMemberCount,
} from './adminMemberList.ts'

test('전체 사용자 11명은 10명씩 나누고 10명 이하면 다음 페이지가 없다', () => {
  assert.equal(membersRequestPath(0, '   '), '/api/admin/members?page=0&size=10')
  assert.equal(membersRequestPath(1, '김영업'), '/api/admin/members?page=1&size=10&keyword=%EA%B9%80%EC%98%81%EC%97%85')
  assert.equal(visibleMemberCount(11, 0), 10)
  assert.equal(visibleMemberCount(11, 1), 1)
  assert.equal(expectedMemberPages(11), 2)
  assert.equal(canGoToPreviousMemberPage(0), false)
  assert.equal(canGoToNextMemberPage(0, expectedMemberPages(11)), true)
  assert.equal(canGoToPreviousMemberPage(1), true)
  assert.equal(canGoToNextMemberPage(1, expectedMemberPages(11)), false)
  assert.equal(canGoToNextMemberPage(0, expectedMemberPages(10)), false)
  assert.equal(canGoToNextMemberPage(0, expectedMemberPages(0)), false)
  assert.equal(pageAfterMemberSearch(), 0)
})

test('전체 사용자 목록은 이름, 이메일, 소속 검색어만 쿼리에 담는다', () => {
  assert.equal(membersPath(0, 20, '   '), '/api/admin/members?page=0&size=20')
  assert.equal(membersPath(0, 20, ' 김영업 '), '/api/admin/members?page=0&size=20&keyword=%EA%B9%80%EC%98%81%EC%97%85')
  assert.equal(
    membersPath(1, 20, 'sales@quoteon.test'),
    '/api/admin/members?page=1&size=20&keyword=sales%40quoteon.test',
  )
  assert.equal(membersPath(2, 20, '에이원파트너'), '/api/admin/members?page=2&size=20&keyword=%EC%97%90%EC%9D%B4%EC%9B%90%ED%8C%8C%ED%8A%B8%EB%84%88')
})

test('회원 권한과 상태는 가입 화면과 이용 제한 화면의 문구로 표시한다', () => {
  assert.equal(memberRoleLabel('ROLE_USER'), '영업사원')
  assert.equal(memberRoleLabel('ROLE_ADMIN'), '관리자')
  assert.equal(memberRoleLabel('ROLE_OTHER'), 'ROLE_OTHER')
  assert.equal(memberStatusLabel('PENDING'), '승인 대기')
  assert.equal(memberStatusLabel('ACTIVE'), '이용 가능')
  assert.equal(memberStatusLabel('REJECTED'), '가입 거절')
  assert.equal(memberStatusLabel('INACTIVE'), '비활성화')
  assert.equal(memberStatusLabel('UNKNOWN'), 'UNKNOWN')
  assert.equal(displayText(null), '-')
})

test('대기 회원 목록은 page, size, keyword를 백엔드 쿼리로 만든다', () => {
  assert.equal(pendingMembersPath(0, 20, '   '), '/api/admin/members/pending?page=0&size=20')
  assert.equal(
    pendingMembersPath(1, 20, ' 목록회사 '),
    '/api/admin/members/pending?page=1&size=20&keyword=%EB%AA%A9%EB%A1%9D%ED%9A%8C%EC%82%AC',
  )
})

test('연락처와 회사명이 없으면 대시를 표시한다', () => {
  assert.equal(displayText(null), '-')
  assert.equal(displayText('   '), '-')
  assert.equal(displayText('01012345678'), '01012345678')
})

test('가입 신청일은 createdAt의 날짜와 시를 표시한다', () => {
  assert.equal(formatCreatedAt('2026-03-01T09:30:00'), '2026-03-01 09:30')
  assert.equal(formatCreatedAt('날짜 없음'), '날짜 없음')
})

test('관리자 API 오류는 연결 실패, CSRF, 서버 문구를 구분한다', () => {
  assert.equal(adminErrorMessage({ ok: false, status: 0, error: null }, '실패'), CONNECTION_MESSAGE)
  assert.equal(
    adminErrorMessage(
      {
        ok: false,
        status: 403,
        error: {
          status: 403,
          code: 'CSRF',
          message: 'CSRF 토큰이 유효하지 않습니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    CSRF_MESSAGE,
  )
  assert.equal(
    adminErrorMessage(
      {
        ok: false,
        status: 409,
        error: {
          status: 409,
          code: 'MEMBER_NOT_PENDING',
          message: '승인 대기 상태의 회원만 처리할 수 있습니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '승인 대기 상태의 회원만 처리할 수 있습니다.',
  )
  assert.equal(
    adminErrorMessage(
      {
        ok: false,
        status: 404,
        error: {
          status: 404,
          code: 'MEMBER_NOT_FOUND',
          message: '회원을 찾을 수 없습니다.',
          memberStatus: null,
          name: null,
          email: null,
          companyName: null,
        },
      },
      '실패',
    ),
    '회원을 찾을 수 없습니다.',
  )
})
