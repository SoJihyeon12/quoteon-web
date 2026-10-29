import { useEffect, useRef, useState, type FormEvent } from 'react'
import { fetchCurrentMember, login, saveRestriction } from '../api/auth.ts'
import { decideInitialMember, decideLoginRequest, decideSessionConfirmation, type LoginUiAction } from '../loginDecision.ts'
import { navigate } from '../navigation.ts'
import './LoginPage.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = {
  email?: string
  password?: string
}

function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    errors.email = '이메일을 입력해 주세요.'
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = '이메일 형식을 확인해 주세요.'
  }

  if (!password) {
    errors.password = '비밀번호를 입력해 주세요.'
  }

  return errors
}

function applyLoginAction(action: LoginUiAction, setFormMessage: (message: string) => void) {
  switch (action.type) {
    case 'show-form':
      return
    case 'message':
      setFormMessage(action.message)
      return
    case 'restricted':
      saveRestriction(action.error)
      navigate('/access-restricted')
      return
    case 'navigate':
      navigate(action.path)
      return
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formMessage, setFormMessage] = useState('')
  const submitting = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchCurrentMember().then((result) => {
      if (cancelled) {
        return
      }
      applyLoginAction(decideInitialMember(result), setFormMessage)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLogin(email, password)
    setErrors(nextErrors)
    setFormMessage('')

    if (nextErrors.email || nextErrors.password) {
      const fieldId = nextErrors.email ? 'login-email' : 'login-password'
      document.getElementById(fieldId)?.focus()
      return
    }

    if (submitting.current) {
      return
    }

    submitting.current = true
    try {
      const result = await login(email.trim(), password)
      if (!result.ok) {
        applyLoginAction(decideLoginRequest(result), setFormMessage)
        return
      }

      const confirmed = await fetchCurrentMember()
      applyLoginAction(decideSessionConfirmation(confirmed), setFormMessage)
    } finally {
      submitting.current = false
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="login-logo">
          Quote<span>On</span>
        </p>

        <header className="login-header">
          <h1 id="login-title">로그인</h1>
          <p>이메일과 비밀번호를 입력해 주세요.</p>
        </header>

        <form className="login-form" noValidate onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">이메일</label>
            <div className={errors.email ? 'login-control is-invalid' : 'login-control'}>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="off"
                inputMode="email"
                value={email}
                aria-required="true"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setFormMessage('')
                }}
              />
            </div>
            {errors.email ? (
              <p id="login-email-error" className="login-error" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="login-field">
            <label htmlFor="login-password">비밀번호</label>
            <div className={errors.password ? 'login-control is-invalid' : 'login-control'}>
              <input
                id="login-password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="off"
                value={password}
                aria-required="true"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFormMessage('')
                }}
              />
              <button
                type="button"
                className="login-visibility"
                aria-controls="login-password"
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? '숨기기' : '표시'}
              </button>
            </div>
            {errors.password ? (
              <p id="login-password-error" className="login-error" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>

          {formMessage ? (
            <p className="login-form-message" role="alert">
              {formMessage}
            </p>
          ) : null}

          <button type="submit" className="login-submit">
            로그인
          </button>
        </form>

        <p className="login-signup">
          계정이 없으신가요? <a href="/signup">회원가입</a>
        </p>
      </section>
    </main>
  )
}
