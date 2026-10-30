import assert from 'node:assert/strict'
import test from 'node:test'
import { CSRF_MESSAGE } from './loginDecision.ts'
import { memberEditPath, memberIdFromEditPath } from './adminMenu.ts'
import { deactivateMember } from './api/adminMembers.ts'
import { memberStatusLabel } from './adminMemberList.ts'
import {
  buildMemberUpdateBody,
  canConfirmMemberDeactivate,
  canDeactivateMember,
  canSubmitMemberEdit,
  MEMBER_COMPANY_TOO_LONG,
  MEMBER_DEACTIVATE_MESSAGE,
  MEMBER_DEACTIVATE_NOTE,
  MEMBER_EMAIL_INVALID,
  MEMBER_EMAIL_REQUIRED,
  MEMBER_NAME_REQUIRED,
  MEMBER_NAME_TOO_LONG,
  MEMBER_PHONE_TOO_LONG,
  MEMBER_ROLE_INVALID,
  memberDeactivateOutcome,
  memberEditSaveResult,
  validateMemberEdit,
  type MemberEditValues,
} from './memberEdit.ts'

const values: MemberEditValues = {
  name: ' 김영업 ',
  email: ' sales@quoteon.test ',
  phone: ' 010-1111-1111 ',
  companyName: ' 에이원파트너 ',
  role: 'ROLE_USER',
}

test('회원 수정 경로는 회원 번호의 수정 화면이다', () => {
  assert.equal(memberEditPath(12), '/admin/members/12/edit')
  assert.equal(memberIdFromEditPath('/admin/members/12/edit'), 12)
  assert.equal(memberIdFromEditPath('/admin/members'), null)
  assert.equal(memberIdFromEditPath('/admin/members/pending'), null)
  assert.equal(memberIdFromEditPath('/admin/members/0/edit'), null)
})

test('회원 수정은 이름, 이메일, 휴대폰, 소속, 권한을 저장 전에 거른다', () => {
  assert.equal(validateMemberEdit({ ...values, name: '  ' }).name, MEMBER_NAME_REQUIRED)
  assert.equal(validateMemberEdit({ ...values, name: '가'.repeat(101) }).name, MEMBER_NAME_TOO_LONG)
  assert.equal(validateMemberEdit({ ...values, email: '' }).email, MEMBER_EMAIL_REQUIRED)
  assert.equal(validateMemberEdit({ ...values, email: 'not-an-email' }).email, MEMBER_EMAIL_INVALID)
  assert.equal(validateMemberEdit({ ...values, phone: '1'.repeat(21) }).phone, MEMBER_PHONE_TOO_LONG)
  assert.equal(validateMemberEdit({ ...values, companyName: '회'.repeat(256) }).companyName, MEMBER_COMPANY_TOO_LONG)
  assert.equal(validateMemberEdit({ ...values, role: 'ROLE_OTHER' }).role, MEMBER_ROLE_INVALID)
  assert.equal(buildMemberUpdateBody({ ...values, role: '' }), null)
})

test('회원 수정 요청은 권한 코드와 빈 선택 항목을 구분한다', () => {
  assert.deepEqual(buildMemberUpdateBody(values), {
    name: '김영업',
    email: 'sales@quoteon.test',
    phone: '010-1111-1111',
    companyName: '에이원파트너',
    role: 'ROLE_USER',
  })
  assert.deepEqual(buildMemberUpdateBody({ ...values, phone: ' ', companyName: '', role: 'ROLE_ADMIN' }), {
    name: '김영업',
    email: 'sales@quoteon.test',
    phone: null,
    companyName: null,
    role: 'ROLE_ADMIN',
  })
})

test('회원 저장은 성공 시 사용자 목록으로 가고 중복 이메일과 없는 회원을 구분한다', () => {
  assert.equal(canSubmitMemberEdit(false), true)
  assert.equal(canSubmitMemberEdit(true), false)
  assert.deepEqual(
    memberEditSaveResult({
      ok: true,
      status: 200,
      data: {
        id: 12,
        name: '김영업',
        email: 'sales@quoteon.test',
        phone: null,
        companyName: null,
        role: 'ROLE_USER',
        status: 'ACTIVE',
      },
    }),
    { type: 'navigate', path: '/admin/members' },
  )
  assert.deepEqual(
    memberEditSaveResult({
      ok: false,
      status: 409,
      error: { status: 409, code: 'EMAIL_ALREADY_EXISTS', message: '이미 가입된 이메일입니다.', memberStatus: null, name: null, email: null, companyName: null },
    }),
    { type: 'email', message: '이미 가입된 이메일입니다.' },
  )
  assert.deepEqual(
    memberEditSaveResult({
      ok: false,
      status: 404,
      error: { status: 404, code: 'MEMBER_NOT_FOUND', message: '회원을 찾을 수 없습니다.', memberStatus: null, name: null, email: null, companyName: null },
    }),
    { type: 'message', message: '회원을 찾을 수 없습니다.' },
  )
  assert.deepEqual(
    memberEditSaveResult({
      ok: false,
      status: 403,
      error: { status: 403, code: 'CSRF', message: CSRF_MESSAGE, memberStatus: null, name: null, email: null, companyName: null },
    }),
    { type: 'message', message: CSRF_MESSAGE },
  )
})

test('활성 회원만 비활성화 확인 후 목록으로 이동하고 그 외 상태는 요청하지 않는다', () => {
  assert.equal(typeof deactivateMember, 'function')
  assert.equal(MEMBER_DEACTIVATE_NOTE, '비활성화 시 로그인할 수 없습니다.')
  assert.match(MEMBER_DEACTIVATE_MESSAGE, /로그인/)
  assert.match(MEMBER_DEACTIVATE_MESSAGE, /신규 견적/)
  assert.match(MEMBER_DEACTIVATE_MESSAGE, /유지/)
  assert.equal(canDeactivateMember('ACTIVE'), true)
  assert.equal(canDeactivateMember('PENDING'), false)
  assert.equal(canDeactivateMember('REJECTED'), false)
  assert.equal(canDeactivateMember('INACTIVE'), false)
  assert.equal(canConfirmMemberDeactivate(false, false, 'ACTIVE'), false)
  assert.equal(canConfirmMemberDeactivate(true, false, 'ACTIVE'), true)
  assert.equal(canConfirmMemberDeactivate(true, true, 'ACTIVE'), false)
  assert.equal(canConfirmMemberDeactivate(true, false, 'INACTIVE'), false)
  assert.equal(memberStatusLabel('INACTIVE'), '비활성화')
  assert.deepEqual(
    memberDeactivateOutcome({
      ok: true,
      status: 200,
      data: {
        id: 12,
        name: '김영업',
        email: 'sales@quoteon.test',
        phone: null,
        companyName: null,
        role: 'ROLE_USER',
        status: 'INACTIVE',
      },
    }),
    { path: '/admin/members', message: '' },
  )
  const conflict = memberDeactivateOutcome({
    ok: false,
    status: 409,
    error: {
      status: 409,
      code: 'MEMBER_STATUS_CONFLICT',
      message: '활성 회원만 비활성화할 수 있습니다.',
      memberStatus: null,
      name: null,
      email: null,
      companyName: null,
    },
  })
  assert.equal(conflict.path, null)
  assert.equal(conflict.message, '활성 회원만 비활성화할 수 있습니다.')
})
