import { useState } from 'react'
import { logout } from '../api/auth.ts'
import { LOGOUT_CANCEL, LOGOUT_CONFIRM, LOGOUT_FAILED, LOGOUT_MESSAGE, LOGOUT_TITLE } from '../logoutConfirm.ts'
import { navigate } from '../navigation.ts'
import './LogoutButton.css'

export default function LogoutButton({ className }: { className: string }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  function openDialog() {
    if (submitting) {
      return
    }
    setMessage('')
    setOpen(true)
  }

  function closeDialog() {
    if (submitting) {
      return
    }
    setOpen(false)
  }

  async function confirmLogout() {
    if (submitting) {
      return
    }
    setSubmitting(true)
    setMessage('')
    const result = await logout()
    if (result.ok || result.status === 401) {
      navigate('/login')
      return
    }
    setSubmitting(false)
    setMessage(result.error?.message || LOGOUT_FAILED)
  }

  return (
    <>
      <button type="button" className={className} onClick={openDialog}>
        로그아웃
      </button>
      {open ? (
        <div className="logout-dialog-backdrop">
          <div className="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title">
            <h2 id="logout-title">{LOGOUT_TITLE}</h2>
            <p>{LOGOUT_MESSAGE}</p>
            {message ? (
              <p className="logout-dialog-error" role="alert">
                {message}
              </p>
            ) : null}
            <div className="logout-dialog-actions">
              <button type="button" onClick={closeDialog} disabled={submitting}>
                {LOGOUT_CANCEL}
              </button>
              <button type="button" onClick={() => void confirmLogout()} disabled={submitting}>
                {submitting ? '로그아웃 중' : LOGOUT_CONFIRM}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
