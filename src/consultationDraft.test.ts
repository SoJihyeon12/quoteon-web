import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CANCEL_QUOTE_DIALOG,
  NEW_CONSULTATION_DIALOG,
  consultationDialog,
  consultationDialogPath,
  hasInProgressQuote,
} from './consultationDraft.ts'

const empty = { customerSelected: false, lineCount: 0, memo: '' }

test('고객, 제품, 메모가 없으면 작성 중인 견적이 아니다', () => {
  assert.equal(hasInProgressQuote(empty), false)
  assert.equal(hasInProgressQuote({ ...empty, memo: '   ' }), false)
})

test('고객, 제품, 메모 중 하나라도 있으면 작성 중이다', () => {
  assert.equal(hasInProgressQuote({ ...empty, customerSelected: true }), true)
  assert.equal(hasInProgressQuote({ ...empty, lineCount: 1 }), true)
  assert.equal(hasInProgressQuote({ ...empty, memo: '납기 확인' }), true)
})

test('확인 팝업 경로는 현재 상담 쿼리를 유지하고 닫으면 팝업 값만 뺀다', () => {
  assert.equal(consultationDialog('cancel-quote'), CANCEL_QUOTE_DIALOG)
  assert.equal(consultationDialog('new-consultation'), NEW_CONSULTATION_DIALOG)
  assert.equal(consultationDialog('logout'), null)
  assert.equal(
    consultationDialogPath('?mode=new', CANCEL_QUOTE_DIALOG),
    '/consultation?mode=new&dialog=cancel-quote',
  )
  assert.equal(
    consultationDialogPath('mode=new&dialog=cancel-quote', null),
    '/consultation?mode=new',
  )
  assert.equal(
    consultationDialogPath('', NEW_CONSULTATION_DIALOG),
    `/consultation?dialog=${NEW_CONSULTATION_DIALOG}`,
  )
  assert.equal(consultationDialogPath('dialog=new-consultation', null), '/consultation')
})
