import { useEffect, useRef, useState, type FormEvent } from 'react'
import { adminErrorMessage, memberRoleLabel } from '../adminMemberList.ts'
import { ADMIN_MEMBERS_PATH, memberEditPath } from '../adminMenu.ts'
import { deactivateMember, fetchMember, updateMember } from '../api/adminMembers.ts'
import {
  buildMemberUpdateBody,
  canConfirmMemberDeactivate,
  canDeactivateMember,
  canSubmitMemberEdit,
  MEMBER_DEACTIVATE_BLOCKED,
  MEMBER_DEACTIVATE_CANCEL,
  MEMBER_DEACTIVATE_CONFIRM,
  MEMBER_DEACTIVATE_MESSAGE,
  MEMBER_DEACTIVATE_NOTE,
  MEMBER_DEACTIVATE_TITLE,
  MEMBER_NOT_FOUND,
  MEMBER_ROLE_OPTIONS,
  memberDeactivateOutcome,
  memberEditSaveResult,
  validateMemberEdit,
  type MemberEditErrors,
} from '../memberEdit.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminMemberEditPage({ memberId }: { memberId: number }) {
  return (
    <AdminShell currentPath={memberEditPath(memberId)}>
      <MemberEditForm memberId={memberId} />
    </AdminShell>
  )
}

function MemberEditForm({ memberId }: { memberId: number }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState('ROLE_USER')
  const [status, setStatus] = useState('')
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadMessage, setLoadMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<MemberEditErrors>({})
  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateMessage, setDeactivateMessage] = useState('')
  const busyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchMember(memberId).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok) {
        setLoadState('error')
        setLoadMessage(adminErrorMessage(result, MEMBER_NOT_FOUND))
        return
      }
      setName(result.data.name)
      setEmail(result.data.email)
      setPhone(result.data.phone ?? '')
      setCompanyName(result.data.companyName ?? '')
      setRole(result.data.role)
      setStatus(result.data.status)
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [memberId])

  useEffect(() => {
    if (!confirmOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        setDeactivateMessage('')
        setConfirmOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [confirmOpen])

  function closeForm() {
    if (busyRef.current) {
      return
    }
    navigate(ADMIN_MEMBERS_PATH)
  }

  function openDeactivate() {
    if (busyRef.current) {
      return
    }
    setFormMessage('')
    if (!canDeactivateMember(status)) {
      setFormMessage(MEMBER_DEACTIVATE_BLOCKED)
      return
    }
    setDeactivateMessage('')
    setConfirmOpen(true)
  }

  function cancelDeactivate() {
    if (deactivating) {
      return
    }
    setDeactivateMessage('')
    setConfirmOpen(false)
  }

  async function confirmDeactivate() {
    if (!canConfirmMemberDeactivate(confirmOpen, busyRef.current, status)) {
      return
    }
    busyRef.current = true
    setDeactivating(true)
    setDeactivateMessage('')
    try {
      const result = await deactivateMember(memberId)
      if (redirectOnAccessFailure(result)) {
        return
      }
      const outcome = memberDeactivateOutcome(result)
      if (outcome.path) {
        navigate(outcome.path)
        return
      }
      setDeactivateMessage(outcome.message)
    } finally {
      busyRef.current = false
      setDeactivating(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmitMemberEdit(busyRef.current)) {
      return
    }
    const values = { name, email, phone, companyName, role }
    const errors = validateMemberEdit(values)
    setFieldErrors(errors)
    setFormMessage('')
    if (Object.keys(errors).length > 0) {
      return
    }
    const body = buildMemberUpdateBody(values)
    if (!body) {
      return
    }
    busyRef.current = true
    setSaving(true)
    try {
      const result = await updateMember(memberId, body)
      if (redirectOnAccessFailure(result)) {
        return
      }
      const outcome = memberEditSaveResult(result)
      if (outcome.type === 'navigate') {
        navigate(outcome.path)
        return
      }
      if (outcome.type === 'email') {
        setFieldErrors({ email: outcome.message })
        return
      }
      setFormMessage(outcome.message)
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  const knownRole = role === 'ROLE_USER' || role === 'ROLE_ADMIN'
  const busy = saving || deactivating

  return (
    <section className="admin-edit" aria-labelledby="member-edit-title">
      <div className="admin-edit-head">
        <h1 id="member-edit-title">사용자 수정</h1>
        <button type="button" className="admin-edit-close" onClick={closeForm} disabled={busy}>
          닫기
        </button>
      </div>
      {loadState === 'loading' ? (
        <p className="admin-empty" role="status">
          회원 정보를 불러오는 중입니다.
        </p>
      ) : null}
      {loadState === 'error' ? (
        <p className="admin-message" role="alert">
          {loadMessage || MEMBER_NOT_FOUND}
        </p>
      ) : null}
      {loadState === 'ready' ? (
        <form className="admin-edit-form" onSubmit={handleSubmit}>
          <label>
            이름
            <input
              value={name}
              aria-invalid={fieldErrors.name ? true : undefined}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
            />
          </label>
          {fieldErrors.name ? <p className="admin-field-error">{fieldErrors.name}</p> : null}
          <label>
            이메일
            <input
              type="email"
              value={email}
              aria-invalid={fieldErrors.email ? true : undefined}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
          </label>
          {fieldErrors.email ? <p className="admin-field-error">{fieldErrors.email}</p> : null}
          <label>
            휴대폰
            <input
              value={phone}
              aria-invalid={fieldErrors.phone ? true : undefined}
              onChange={(event) => setPhone(event.target.value)}
              disabled={busy}
            />
          </label>
          {fieldErrors.phone ? <p className="admin-field-error">{fieldErrors.phone}</p> : null}
          <label>
            소속
            <input
              value={companyName}
              aria-invalid={fieldErrors.companyName ? true : undefined}
              onChange={(event) => setCompanyName(event.target.value)}
              disabled={busy}
            />
          </label>
          {fieldErrors.companyName ? <p className="admin-field-error">{fieldErrors.companyName}</p> : null}
          <label>
            권한
            <select
              value={role}
              aria-invalid={fieldErrors.role ? true : undefined}
              onChange={(event) => setRole(event.target.value)}
              disabled={busy}
            >
              {knownRole ? null : <option value={role}>{memberRoleLabel(role)}</option>}
              {MEMBER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {fieldErrors.role ? <p className="admin-field-error">{fieldErrors.role}</p> : null}
          {formMessage ? (
            <p className="admin-message" role="alert">
              {formMessage}
            </p>
          ) : null}
          <div className="admin-edit-actions">
            <div className="admin-edit-deactivate-wrap">
              <button
                type="button"
                className="admin-edit-deactivate"
                disabled={busy}
                onClick={openDeactivate}
              >
                비활성화
              </button>
              <p className="admin-edit-note">{MEMBER_DEACTIVATE_NOTE}</p>
            </div>
            <button type="submit" disabled={!canSubmitMemberEdit(busy)}>
              {saving ? '저장 중' : '저장'}
            </button>
          </div>
        </form>
      ) : null}
      {confirmOpen ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="member-deactivate-title">
            <h2 id="member-deactivate-title">{MEMBER_DEACTIVATE_TITLE}</h2>
            <p>{MEMBER_DEACTIVATE_MESSAGE}</p>
            {deactivateMessage ? (
              <p className="admin-message" role="alert">
                {deactivateMessage}
              </p>
            ) : null}
            <div className="admin-dialog-actions">
              <button
                type="button"
                className="admin-dialog-cancel"
                disabled={deactivating}
                onClick={cancelDeactivate}
              >
                {MEMBER_DEACTIVATE_CANCEL}
              </button>
              <button
                type="button"
                className="admin-edit-deactivate"
                disabled={!canConfirmMemberDeactivate(confirmOpen, deactivating, status)}
                onClick={confirmDeactivate}
              >
                {deactivating ? '비활성화 중' : MEMBER_DEACTIVATE_CONFIRM}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
