import { useEffect, useState } from 'react'
import { ADMIN_DASHBOARD_PATH } from '../adminMenu.ts'
import {
  DASHBOARD_LOAD_FAILED,
  DASHBOARD_LOADING,
  DASHBOARD_PRODUCTS_EMPTY,
  DASHBOARD_RANKS_EMPTY,
  adminDashboardError,
  dashboardBarWidth,
  formatDashboardAmount,
  formatDashboardCount,
  formatDashboardRatio,
  isAdminDashboard,
  type AdminDashboard,
} from '../adminDashboard.ts'
import { fetchAdminDashboard } from '../api/adminDashboard.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminDashboardPage() {
  return (
    <AdminShell currentPath={ADMIN_DASHBOARD_PATH}>
      <Dashboard />
    </AdminShell>
  )
}

function Dashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadMessage, setLoadMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchAdminDashboard().then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !isAdminDashboard(result.data)) {
        setDashboard(null)
        setLoadState('error')
        setLoadMessage(adminDashboardError(result))
        return
      }
      setDashboard(result.data)
      setLoadMessage('')
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <header className="admin-heading">
        <h1>대시보드</h1>
      </header>
      {loadState === 'loading' ? <p className="admin-empty" role="status">{DASHBOARD_LOADING}</p> : null}
      {loadState === 'error' ? (
        <p className="admin-empty" role="alert">{loadMessage || DASHBOARD_LOAD_FAILED}</p>
      ) : null}
      {loadState === 'ready' && dashboard ? (
        <>
          <section className="admin-dashboard-cards" aria-label="요약 통계">
            <article className="admin-dashboard-card">
              <p>오늘 작성된 견적 수</p>
              <strong>{formatDashboardCount(dashboard.todayQuoteCount)}</strong>
            </article>
            <article className="admin-dashboard-card">
              <p>이번 달 견적 금액</p>
              <strong>{formatDashboardAmount(dashboard.monthQuoteAmount)}</strong>
            </article>
            <article className="admin-dashboard-card">
              <p>승인 대기</p>
              <strong>{formatDashboardCount(dashboard.pendingMemberCount)}</strong>
            </article>
            <article className="admin-dashboard-card">
              <p>활성 사용자</p>
              <strong>{formatDashboardCount(dashboard.activeMemberCount)}</strong>
            </article>
          </section>
          <div className="admin-dashboard-panels">
            <section className="admin-dashboard-panel" aria-labelledby="popular-products-title">
              <h2 id="popular-products-title">인기 제품</h2>
              <p className="admin-dashboard-note">이번 달 기준</p>
              {dashboard.popularProducts.length === 0 ? (
                <p className="admin-dashboard-empty">{DASHBOARD_PRODUCTS_EMPTY}</p>
              ) : (
                <ul className="admin-dashboard-products">
                  {dashboard.popularProducts.map((product) => (
                    <li key={product.productCode}>
                      <span className="admin-dashboard-code">{product.productCode}</span>
                      <span className="admin-dashboard-track" aria-hidden="true">
                        <span style={{ width: dashboardBarWidth(product.ratio) }} />
                      </span>
                      <span className="admin-dashboard-ratio">{formatDashboardRatio(product.ratio)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="admin-dashboard-panel" aria-labelledby="member-ranks-title">
              <h2 id="member-ranks-title">사용자별 견적 수</h2>
              <p className="admin-dashboard-note">이번 달 기준</p>
              {dashboard.memberQuoteRanks.length === 0 ? (
                <p className="admin-dashboard-empty">{DASHBOARD_RANKS_EMPTY}</p>
              ) : (
                <ul className="admin-dashboard-ranks">
                  {dashboard.memberQuoteRanks.map((rank) => (
                    <li key={rank.memberId}>
                      <span>{rank.memberName}</span>
                      <strong>{formatDashboardCount(rank.quoteCount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </>
  )
}
