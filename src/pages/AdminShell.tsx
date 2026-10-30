import { useEffect, useState, type ReactNode } from 'react'
import { ADMIN_MENU, adminNavIsCurrent } from '../adminMenu.ts'
import { fetchCurrentMember, logout } from '../api/auth.ts'
import type { Member } from '../api/types.ts'
import { navigate } from '../navigation.ts'
import { redirectUnless } from '../session.ts'
import './AdminHomePage.css'
import './LoginPage.css'

function isAdmin(member: Member) {
  return member.status === 'ACTIVE' && member.role === 'ROLE_ADMIN'
}

export default function AdminShell({
  currentPath,
  children,
}: {
  currentPath: string
  children: ReactNode
}) {
  const [member, setMember] = useState<Member | null>(null)
  const [notice, setNotice] = useState('로그인 상태를 확인하는 중입니다.')
  const [menuNotice, setMenuNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchCurrentMember().then((result) => {
      if (cancelled || redirectUnless(result, isAdmin)) {
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

  async function handleLogout() {
    const result = await logout()
    if (result.ok || result.status === 401) {
      navigate('/login')
      return
    }
    setMenuNotice(result.error?.message || '로그아웃하지 못했습니다.')
  }

  if (!member) {
    return (
      <main className="login-page">
        <section className="login-card" aria-labelledby="admin-title">
          <p className="login-logo">
            Quote<span>On</span>
          </p>
          <header className="login-header">
            <h1 id="admin-title">관리자</h1>
            <p>{notice}</p>
          </header>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="login-logo" href="/admin/dashboard">
          Quote<span>On</span>
        </a>
        <nav className="admin-nav" aria-label="관리자 메뉴">
          {ADMIN_MENU.map((item) => {
            if (!item.path) {
              return <span key={item.label}>{item.label}</span>
            }
            const path = item.path
            return (
              <a
                key={item.label}
                href={path}
                aria-current={adminNavIsCurrent(path, currentPath) ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (path !== currentPath) {
                    navigate(path)
                  }
                }}
              >
                {item.label}
              </a>
            )
          })}
        </nav>
        <p className="admin-user">
          {member.name}
          <button type="button" className="admin-logout" onClick={handleLogout}>
            로그아웃
          </button>
        </p>
      </header>
      {menuNotice ? (
        <p className="admin-message" role="alert">
          {menuNotice}
        </p>
      ) : null}
      {children}
    </main>
  )
}
