import { useRef, useState, type FormEvent } from 'react'
import { signup, type SignupAccountType } from '../api/auth.ts'
import { navigate } from '../navigation.ts'
import {
  buildSignupBody,
  decideSignupResult,
  validateSignup,
  type SignupFieldErrors,
  type SignupUiAction,
} from '../signupDecision.ts'
import './LoginPage.css'
import './SignupPage.css'

const FIELD_ORDER = ['accountType', 'name', 'email', 'password', 'passwordConfirm', 'phone', 'companyName'] as const

function applySignupAction(
  action: SignupUiAction,
  setErrors: (errors: SignupFieldErrors) => void,
  setFormMessage: (message: string) => void,
) {
  if (action.type === 'fields') {
    setErrors(action.errors)
    focusField(action.errors)
    return
  }
  if (action.type === 'message') {
    setFormMessage(action.message)
    return
  }
  navigate(action.path)
}

function focusField(errors: SignupFieldErrors) {
  const field = FIELD_ORDER.find((name) => errors[name])
  if (!field) {
    return
  }
  document.getElementById(field === 'accountType' ? 'signup-account-sales' : `signup-${field}`)?.focus()
}

export default function SignupPage() {
  const [accountType, setAccountType] = useState<SignupAccountType>('SALES')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [errors, setErrors] = useState<SignupFieldErrors>({})
  const [formMessage, setFormMessage] = useState('')
  const submitting = useRef(false)

  function values() {
    return { accountType, name, email, password, passwordConfirm, phone, companyName }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formValues = values()
    const nextErrors = validateSignup(formValues)
    setErrors(nextErrors)
    setFormMessage('')
    if (Object.keys(nextErrors).length > 0) {
      focusField(nextErrors)
      return
    }

    const body = buildSignupBody(formValues)
    if (!body || submitting.current) {
      return
    }

    submitting.current = true
    try {
      applySignupAction(decideSignupResult(await signup(body)), setErrors, setFormMessage)
    } finally {
      submitting.current = false
    }
  }

  return (
    <main className="login-page signup-page">
      <section className="login-card" aria-labelledby="signup-title">
        <p className="login-logo">
          Quote<span>On</span>
        </p>
        <header className="login-header">
          <h1 id="signup-title">회원가입</h1>
          <p>가입 신청 후 관리자 승인이 필요합니다.</p>
        </header>

        <form className="login-form" noValidate onSubmit={handleSubmit}>
          <fieldset className="signup-account-field">
            <legend>가입 구분</legend>
            <div className="signup-account" role="radiogroup" aria-label="가입 구분">
              <button
                id="signup-account-sales"
                type="button"
                role="radio"
                aria-checked={accountType === 'SALES'}
                onClick={() => setAccountType('SALES')}
              >
                영업사원
              </button>
              <button
                id="signup-account-admin"
                type="button"
                role="radio"
                aria-checked={accountType === 'ADMIN'}
                onClick={() => setAccountType('ADMIN')}
              >
                관리자
              </button>
            </div>
            {errors.accountType ? (
              <p className="login-error" role="alert">
                {errors.accountType}
              </p>
            ) : null}
          </fieldset>

          <div className="login-field">
            <label htmlFor="signup-name">이름</label>
            <div className={errors.name ? 'login-control is-invalid' : 'login-control'}>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={100}
                value={name}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? 'signup-name-error' : undefined}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            {errors.name ? (
              <p id="signup-name-error" className="login-error" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="login-field">
            <label htmlFor="signup-email">이메일</label>
            <div className={errors.email ? 'login-control is-invalid' : 'login-control'}>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="off"
                inputMode="email"
                maxLength={255}
                value={email}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {errors.email ? (
              <p id="signup-email-error" className="login-error" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="login-field">
            <label htmlFor="signup-password">비밀번호</label>
            <div className={errors.password ? 'login-control is-invalid' : 'login-control'}>
              <input
                id="signup-password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={72}
                value={password}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'signup-password-error' : undefined}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="login-visibility"
                aria-controls="signup-password"
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? '숨기기' : '표시'}
              </button>
            </div>
            {errors.password ? (
              <p id="signup-password-error" className="login-error" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>

          <div className="login-field">
            <label htmlFor="signup-passwordConfirm">비밀번호 확인</label>
            <div className={errors.passwordConfirm ? 'login-control is-invalid' : 'login-control'}>
              <input
                id="signup-passwordConfirm"
                name="passwordConfirm"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={72}
                value={passwordConfirm}
                aria-invalid={errors.passwordConfirm ? true : undefined}
                aria-describedby={errors.passwordConfirm ? 'signup-password-confirm-error' : undefined}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
            </div>
            {errors.passwordConfirm ? (
              <p id="signup-password-confirm-error" className="login-error" role="alert">
                {errors.passwordConfirm}
              </p>
            ) : null}
          </div>

          <div className="login-field">
            <label htmlFor="signup-phone">휴대폰</label>
            <div className={errors.phone ? 'login-control is-invalid' : 'login-control'}>
              <input
                id="signup-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={20}
                value={phone}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? 'signup-phone-error' : undefined}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            {errors.phone ? (
              <p id="signup-phone-error" className="login-error" role="alert">
                {errors.phone}
              </p>
            ) : null}
          </div>

          <div className="login-field">
            <label htmlFor="signup-companyName">소속 회사</label>
            <div className={errors.companyName ? 'login-control is-invalid' : 'login-control'}>
              <input
                id="signup-companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                maxLength={255}
                value={companyName}
                aria-invalid={errors.companyName ? true : undefined}
                aria-describedby={errors.companyName ? 'signup-company-error' : undefined}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </div>
            {errors.companyName ? (
              <p id="signup-company-error" className="login-error" role="alert">
                {errors.companyName}
              </p>
            ) : null}
          </div>

          {formMessage ? (
            <p className="login-form-message" role="alert">
              {formMessage}
            </p>
          ) : null}

          <button type="submit" className="login-submit">
            가입 신청
          </button>
          <p className="signup-note">관리자 승인 후 이용할 수 있습니다.</p>
        </form>

        <p className="login-signup">
          <a href="/login">로그인으로 돌아가기</a>
        </p>
      </section>
    </main>
  )
}
