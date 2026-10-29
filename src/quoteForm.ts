export type QuotePriceLine = {
  salePrice: number
  quantity: number
}

export type CreateQuoteItemBody = {
  productId: number
  quantity: number
}

export type CreateQuoteBody = {
  customerId: number
  quoteDate: string
  items: CreateQuoteItemBody[]
}

export type QuotePrice = {
  amounts: number[]
  supplyAmount: number
  vatAmount: number
  totalAmount: number
}

const CUSTOMER_MESSAGE = '고객을 선택해 주세요.'
const DATE_MESSAGE = '견적일을 입력해 주세요.'
const ITEMS_MESSAGE = '견적 항목을 한 개 이상 입력해 주세요.'
const QUANTITY_MESSAGE = '수량은 1 이상이어야 합니다.'
const DUPLICATE_MESSAGE = '같은 제품을 항목에 중복해서 넣을 수 없습니다.'
const PRODUCT_MESSAGE = '제품을 선택해 주세요.'

export function lineAmount(salePrice: number, quantity: number) {
  return toCents(salePrice) * quantity / 100
}

export function priceQuote(lines: QuotePriceLine[]): QuotePrice {
  let supplyCents = 0
  const amounts = lines.map((line) => {
    const cents = toCents(line.salePrice) * line.quantity
    supplyCents += cents
    return cents / 100
  })
  const supplyAmount = supplyCents / 100
  const vatAmount = vatFromSupplyCents(supplyCents)
  return {
    amounts,
    supplyAmount,
    vatAmount,
    totalAmount: supplyAmount + vatAmount,
  }
}

export function buildCreateQuoteBody(input: {
  customerId: string
  quoteDate: string
  items: { productId: number; quantity: string }[]
}): { ok: true; body: CreateQuoteBody } | { ok: false; message: string } {
  const customerId = parseCustomerId(input.customerId)
  if (customerId === null) {
    return { ok: false, message: CUSTOMER_MESSAGE }
  }
  if (!isIsoDate(input.quoteDate.trim())) {
    return { ok: false, message: DATE_MESSAGE }
  }
  if (input.items.length === 0) {
    return { ok: false, message: ITEMS_MESSAGE }
  }

  const seen = new Set<number>()
  const items: CreateQuoteItemBody[] = []
  for (const item of input.items) {
    if (!Number.isInteger(item.productId) || item.productId < 1) {
      return { ok: false, message: PRODUCT_MESSAGE }
    }
    if (seen.has(item.productId)) {
      return { ok: false, message: DUPLICATE_MESSAGE }
    }
    const quantity = parseQuantity(item.quantity)
    if (quantity === null) {
      return { ok: false, message: QUANTITY_MESSAGE }
    }
    seen.add(item.productId)
    items.push({ productId: item.productId, quantity })
  }

  return {
    ok: true,
    body: {
      customerId,
      quoteDate: input.quoteDate.trim(),
      items,
    },
  }
}

function parseCustomerId(value: string) {
  const trimmed = value.trim()
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null
  }
  const customerId = Number(trimmed)
  if (!Number.isSafeInteger(customerId)) {
    return null
  }
  return customerId
}

function parseQuantity(value: string) {
  const trimmed = value.trim()
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null
  }
  const quantity = Number(trimmed)
  if (!Number.isSafeInteger(quantity)) {
    return null
  }
  return quantity
}

function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return false
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function toCents(value: number) {
  const sign = value < 0 ? -1 : 1
  const scaled = Math.abs(value) * 100
  const whole = Math.floor(scaled + 1e-8)
  const fraction = scaled - whole
  const cents = fraction >= 0.5 - 1e-8 ? whole + 1 : whole
  return sign * cents
}

function vatFromSupplyCents(supplyCents: number) {
  const base = Math.trunc(supplyCents / 1000)
  const remainder = supplyCents % 1000
  if (remainder >= 500) {
    return base + 1
  }
  if (remainder <= -500) {
    return base - 1
  }
  return base
}
