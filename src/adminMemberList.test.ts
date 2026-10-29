import assert from 'node:assert/strict'
import test from 'node:test'
import { CSRF_MESSAGE, CONNECTION_MESSAGE } from './loginDecision.ts'
import {
  adminErrorMessage,
  displayText,
  formatCreatedAt,
  pendingMembersPath,
} from './adminMemberList.ts'

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
