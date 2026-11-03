import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tokens = readFileSync(join(root, 'src/styles/design-tokens.css'), 'utf8')
const base = readFileSync(join(root, 'src/styles/base-ui.css'), 'utf8')
const main = readFileSync(join(root, 'src/main.tsx'), 'utf8')

test('디자인 토큰과 공통 베이스 스타일이 로드된다', () => {
  assert.match(main, /design-tokens\.css/)
  assert.match(main, /base-ui\.css/)
  assert.match(tokens, /--qo-color-primary:\s*#1f6feb/)
  assert.match(tokens, /--qo-btn-height:\s*36px/)
  assert.match(tokens, /--qo-shadow-sheet:\s*0 10px 28px/)
  assert.doesNotMatch(tokens, /--qo-shadow-sheet:\s*var\(--qo-shadow-sheet\)/)
  assert.match(base, /\.visually-hidden/)
  assert.match(base, /focus-visible/)
})

test('주요 화면 CSS가 공통 색상 토큰을 사용한다', () => {
  for (const relative of [
    'src/pages/LoginPage.css',
    'src/pages/ConsultationPage.css',
    'src/pages/QuoteListPage.css',
    'src/pages/AdminHomePage.css',
    'src/pages/QuoteViewPage.css',
  ]) {
    const css = readFileSync(join(root, relative), 'utf8')
    assert.match(css, /var\(--qo-color-primary\)/, relative)
    assert.match(css, /var\(--qo-color-text\)/, relative)
  }
})
