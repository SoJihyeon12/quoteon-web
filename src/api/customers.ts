import type { CreateCustomerBody } from '../customerForm.ts'
import { CUSTOMER_PAGE_SIZE, customersPath, type CustomerPage } from '../customerList.ts'
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

export function fetchCustomers(page: number, keyword: string) {
  return apiRequest<CustomerPage>(customersPath(page, CUSTOMER_PAGE_SIZE, keyword))
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
