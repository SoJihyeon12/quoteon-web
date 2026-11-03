import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(root, 'src/pages/FormalQuoteDocument.css'), 'utf8')
const component = readFileSync(join(root, 'src/components/FormalQuoteDocument.tsx'), 'utf8')

test('정식 견적서 제품 표는 열 너비와 정렬 클래스를 고정한다', () => {
  assert.match(component, /formal-quote-col-no/)
  assert.match(component, /formal-quote-col-name/)
  assert.match(component, /formal-quote-col-code/)
  assert.match(component, /className="formal-quote-no"/)
  assert.match(component, /className="formal-quote-name"/)
  assert.match(component, /className="formal-quote-code"/)
  assert.match(component, /className="formal-quote-maker"/)
  assert.match(component, /className="formal-quote-qty"/)
  assert.match(component, /dateLabel = '견적일'/)
  assert.match(css, /\.formal-quote-col-name\s*\{\s*width:\s*28%;/)
  assert.match(css, /\.formal-quote-col-code\s*\{\s*width:\s*18%;/)
  assert.match(css, /\.formal-quote-no,\s*\n\.formal-quote-qty\s*\{\s*text-align:\s*center;/)
  assert.match(css, /\.formal-quote-amount\s*\{\s*text-align:\s*right;/)
  assert.match(css, /\.formal-quote-maker\s*\{\s*text-align:\s*center;/)
  assert.match(css, /line-height:\s*1\.45;/)
})
