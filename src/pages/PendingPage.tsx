import { useEffect, useState } from 'react'
import { fetchCurrentMember } from '../api/auth.ts'
import LogoutButton from '../components/LogoutButton.tsx'
import type { Member } from '../api/types.ts'
import { redirectUnless } from '../session.ts'
import './LoginPage.css'
import './StatusPage.css'

export default function PendingPage() {
  const [member, setMember] = useState<Member | null>(null)
  const [notice, setNotice] = useState('회원 정보를 확인하는 중입니다.')

  useEffect(() => {
    let cancelled = false
    fetchCurrentMember().then((result) => {
      if (cancelled || redirectUnless(result, (current) => current.status === 'PENDING')) {
        return
      }
      if (!result.ok) {
        setNotice(result.error?.message || '로그인 상태를 확인할 수 없습니다.')
        return
      }
      setMember(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="pending-title">
        <p className="login-logo">
          Quote<span>On</span>
        </p>
        <header className="login-header">
          <h1 id="pending-title">승인 대기</h1>
          <p>관리자 승인 후 서비스를 이용할 수 있습니다.</p>
        </header>
        {member ? (
          <dl className="status-details">
            <div>
              <dt>이름</dt>
              <dd>{member.name}</dd>
            </div>
            <div>
              <dt>소속 회사</dt>
              <dd>{member.companyName || '등록된 회사 정보가 없습니다.'}</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>{member.email}</dd>
            </div>
          </dl>
        ) : (
          <p className="status-note">{notice}</p>
        )}
        <LogoutButton className="login-submit status-action" />
      </section>
    </main>
  )
}
