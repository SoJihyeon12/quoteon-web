import { useEffect } from 'react'
import { fetchCurrentMember, readRestriction } from '../api/auth.ts'
import { navigate, pathForMember } from '../navigation.ts'
import './LoginPage.css'
import './StatusPage.css'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기',
  ACTIVE: '이용 가능',
  REJECTED: '가입 거절',
  INACTIVE: '비활성화',
}

function statusLabel(status: string | null) {
  if (!status) {
    return '확인할 수 없음'
  }
  return STATUS_LABEL[status] ?? status
}

export default function RestrictedPage() {
  const restriction = readRestriction()

  useEffect(() => {
    let cancelled = false
    fetchCurrentMember().then((result) => {
      if (cancelled || !result.ok) {
        return
      }
      const path = pathForMember(result.data)
      if (path && path !== '/access-restricted') {
        navigate(path)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="restricted-title">
        <p className="login-logo">
          Quote<span>On</span>
        </p>
        <header className="login-header">
          <h1 id="restricted-title">이용 제한</h1>
          <p>이 계정으로는 서비스를 이용할 수 없습니다.</p>
        </header>
        <dl className="status-details">
          <div>
            <dt>제한 사유</dt>
            <dd>{restriction?.message || '이용이 제한된 계정입니다.'}</dd>
          </div>
          <div>
            <dt>회원 상태</dt>
            <dd>{statusLabel(restriction?.memberStatus ?? null)}</dd>
          </div>
        </dl>
        <button type="button" className="login-submit status-action" onClick={() => navigate('/login')}>
          로그인으로 이동
        </button>
      </section>
    </main>
  )
}
