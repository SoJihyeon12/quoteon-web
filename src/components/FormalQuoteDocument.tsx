import {
  FORMAL_QUOTE_INTRO,
  FORMAL_QUOTE_VALIDITY,
  WIREFRAME_MANUFACTURER,
  WIREFRAME_SUPPLIER_EXAMPLE,
} from '../wireframeSupplier.ts'
import { formatAmount } from '../quoteList.ts'

export type FormalQuoteLine = {
  key: string | number
  name: string
  productCode: string
  quantity: string | number
  unitPrice: number
  amount: number | null
}

export default function FormalQuoteDocument({
  titleId,
  authorName,
  customerName,
  quoteDate,
  dateLabel = '견적일',
  totalAmount,
  supplyAmount,
  vatAmount,
  lines,
}: {
  titleId: string
  authorName: string
  customerName: string
  quoteDate: string
  /** 미리보기(REQ-QUOTE-11)는 작성일, 정식·확인 화면은 견적일 */
  dateLabel?: '작성일' | '견적일'
  totalAmount: number
  supplyAmount: number
  vatAmount: number
  lines: FormalQuoteLine[]
}) {
  return (
    <div className="formal-quote">
      <h1 id={titleId} className="formal-quote-title">
        견적서
      </h1>

      <table className="formal-quote-meta">
        <tbody>
          <tr>
            <th scope="row">담당자</th>
            <td>{displayText(authorName)}</td>
          </tr>
          <tr>
            <th scope="row">고객</th>
            <td>{displayText(customerName)}</td>
          </tr>
          <tr>
            <th scope="row">{dateLabel}</th>
            <td>
              <time dateTime={quoteDate || undefined}>{displayText(quoteDate)}</time>
            </td>
          </tr>
          <tr>
            <th scope="row">견적금액</th>
            <td>{formatAmount(totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <table className="formal-quote-supplier">
        <tbody>
          {WIREFRAME_SUPPLIER_EXAMPLE.map((field, index) => (
            <tr key={field.label}>
              {index === 0 ? (
                <th className="formal-quote-supplier-group" rowSpan={WIREFRAME_SUPPLIER_EXAMPLE.length} scope="rowgroup">
                  공급자
                </th>
              ) : null}
              <th scope="row">{field.label}</th>
              <td>{field.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="formal-quote-intro">{FORMAL_QUOTE_INTRO}</p>

      <div className="formal-quote-table-wrap">
        <table className="formal-quote-items">
          <colgroup>
            <col className="formal-quote-col-no" />
            <col className="formal-quote-col-name" />
            <col className="formal-quote-col-code" />
            <col className="formal-quote-col-maker" />
            <col className="formal-quote-col-price" />
            <col className="formal-quote-col-qty" />
            <col className="formal-quote-col-amount" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">NO</th>
              <th scope="col">제품명</th>
              <th scope="col">제품코드</th>
              <th scope="col">제조사</th>
              <th scope="col">제품가격</th>
              <th scope="col">수량</th>
              <th scope="col">금액</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="formal-quote-empty">
                  추가된 제품이 없습니다.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr key={line.key}>
                  <td className="formal-quote-no">{index + 1}</td>
                  <td className="formal-quote-name">{line.name}</td>
                  <td className="formal-quote-code">{line.productCode}</td>
                  <td className="formal-quote-maker">{WIREFRAME_MANUFACTURER}</td>
                  <td className="formal-quote-amount">{formatAmount(line.unitPrice)}</td>
                  <td className="formal-quote-qty">{line.quantity}</td>
                  <td className="formal-quote-amount">
                    {line.amount === null ? '-' : formatAmount(line.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <table className="formal-quote-totals">
        <tbody>
          <tr>
            <th scope="row">공급가액 합계</th>
            <td>{formatAmount(supplyAmount)}</td>
          </tr>
          <tr>
            <th scope="row">VAT(10%)</th>
            <td>{formatAmount(vatAmount)}</td>
          </tr>
          <tr className="formal-quote-grand">
            <th scope="row">총 주문금액</th>
            <td>{formatAmount(totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <p className="formal-quote-validity">{FORMAL_QUOTE_VALIDITY}</p>
    </div>
  )
}

function displayText(value: string) {
  const trimmed = value.trim()
  return trimmed || '-'
}
