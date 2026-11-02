import { ADMIN_DASHBOARD_API_PATH, type AdminDashboard } from '../adminDashboard.ts'
import { apiRequest } from './client.ts'

export function fetchAdminDashboard() {
  return apiRequest<AdminDashboard>(ADMIN_DASHBOARD_API_PATH)
}
