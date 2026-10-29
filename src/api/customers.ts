import { CUSTOMER_PAGE_SIZE, customersPath, type CustomerPage } from '../customerList.ts'
import { apiRequest } from './client.ts'

export function fetchCustomers(page: number, keyword: string) {
  return apiRequest<CustomerPage>(customersPath(page, CUSTOMER_PAGE_SIZE, keyword))
}
