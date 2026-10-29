export type Member = {
  id: number
  email: string
  name: string
  phone: string | null
  companyName: string | null
  role: string
  status: string
}

export type ApiError = {
  status: number
  code: string
  message: string
  memberStatus: string | null
  name: string | null
  email: string | null
  companyName: string | null
}

export type Category = {
  id: number
  name: string
  parentId: number | null
}

export type Product = {
  id: number
  productCode: string
  name: string
  salePrice: number
  categoryId: number
  categoryName: string
  imagePath: string | null
  status: string
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiError | null }
