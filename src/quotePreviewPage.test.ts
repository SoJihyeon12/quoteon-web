import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(join(root, 'src/pages/QuotePreviewPage.tsx'), 'utf8')
const css = readFileSync(join(root, 'src/pages/QuotePreviewPage.css'), 'utf8')
const formal = readFileSync(join(root, 'src/components/FormalQuoteDocument.tsx'), 'utf8')

test('미리보기 화면은 와이어프레임 15 관리 영역과 정식 견적서 본문을 함께 쓴다', () => {
  assert.match(page, /FormalQuoteDocument/)
  assert.match(page, /dateLabel="작성일"/)
  assert.match(page, />\s*PDF\s*</)
  assert.match(page, />\s*JPEG\s*</)
  assert.match(page, />\s*PNG\s*</)
  assert.match(page, />\s*이메일전송\s*</)
  assert.match(page, />\s*수정\s*</)
  assert.match(page, /aria-label="나가기"/)
  assert.match(page, /quote-preview-memo/)
  assert.match(page, /quote-preview-memo-label/)
  assert.match(page, /returnToQuoteWorkbench/)
  assert.match(page, /QuoteEmailDialog/)
  assert.match(page, /downloadQuote/)
  assert.doesNotMatch(page, /결제방법/)
  assert.doesNotMatch(page, /견적서 미리보기로 돌아가기/)
})

test('미리보기 레이아웃은 문서 프레임 안에 메모를 두고 닫기 버튼을 단순화한다', () => {
  assert.match(css, /\.quote-preview-document\s*\{[^}]*border:\s*1px solid var\(--qo-color-border\)/s)
  assert.match(css, /\.quote-preview-document\s*\{[^}]*border-radius:\s*12px;/s)
  assert.match(css, /\.quote-preview-document\s*\{[^}]*box-shadow:\s*var\(--qo-shadow-sheet\)/s)
  assert.match(css, /\.quote-preview-document\s*\{[^}]*padding:\s*22px 20px 18px;/s)
  assert.match(css, /\.quote-preview-sheet\s*\{[^}]*width:\s*min\(100%,\s*960px\)/s)
  assert.match(css, /\.quote-preview-toolbar \.quote-preview-close\s*\{[^}]*border:\s*0;/s)
  assert.match(css, /\.quote-preview-memo-label/)
  assert.match(css, /\.quote-preview-memo-text/)
  assert.match(page, /quote-preview-document[\s\S]*quote-preview-memo[\s\S]*<\/div>\s*<\/div>/)
  const viewCss = readFileSync(join(root, 'src/pages/QuoteViewPage.css'), 'utf8')
  assert.match(viewCss, /\.quote-view-document\s*\{[^}]*border:\s*1px solid var\(--qo-color-border\)/s)
  assert.match(viewCss, /\.quote-view-document\s*\{[^}]*border-radius:\s*12px;/s)
  assert.match(viewCss, /\.quote-view-document\s*\{[^}]*box-shadow:\s*var\(--qo-shadow-sheet\)/s)
  assert.match(viewCss, /\.quote-view-document\s*\{[^}]*padding:\s*22px 20px 18px;/s)
})

test('정식 견적서 기본 날짜 라벨은 견적일이고 미리보기만 작성일을 넘긴다', () => {
  assert.match(formal, /dateLabel = '견적일'/)
  assert.match(formal, /dateLabel\?: '작성일' \| '견적일'/)
  assert.match(page, /dateLabel="작성일"/)
  assert.doesNotMatch(
    readFileSync(join(root, 'src/pages/QuoteViewPage.tsx'), 'utf8'),
    /dateLabel=/,
  )
})
