import type { CreateCustomerBody } from '../customerForm.ts'
import {
  CUSTOMER_PAGE_SIZE,
  customerDeactivatePath,
  customersPath,
  type CustomerPage,
} from '../customerList.ts'
import { apiRequest } from './client.ts'

export type CreatedCustomer = {
  id: number
  name: string
  customerType: string
  phone: string | null
  email: string | null
  address: string | null
  memo: string | null
}

export function fetchCustomers(page: number, keyword: string, customerType = '') {
  return apiRequest<CustomerPage>(customersPath(page, CUSTOMER_PAGE_SIZE, keyword, customerType))
}

export function fetchCustomer(customerId: number) {
  return apiRequest<CreatedCustomer>(`/api/customers/${customerId}`)
}

export function createCustomer(body: CreateCustomerBody) {
  return apiRequest<CreatedCustomer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCustomer(customerId: number, body: CreateCustomerBody) {
  return apiRequest<CreatedCustomer>(`/api/customers/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deactivateCustomer(customerId: number) {
  return apiRequest<CreatedCustomer>(customerDeactivatePath(customerId), {
    method: 'POST',
  })
}
