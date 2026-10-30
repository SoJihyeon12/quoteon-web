import { ADMIN_DASHBOARD_PATH } from '../adminMenu.ts'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminDashboardPage() {
  return (
    <AdminShell currentPath={ADMIN_DASHBOARD_PATH}>
      <header className="admin-heading">
        <h1>대시보드</h1>
      </header>
    </AdminShell>
  )
}
