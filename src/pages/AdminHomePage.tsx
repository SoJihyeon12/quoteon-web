import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  adminErrorMessage,
  displayText,
  formatCreatedAt,
  type PendingMember,
} from '../adminMemberList.ts'
import { ADMIN_PENDING_PATH } from '../adminMenu.ts'
import { approveMember, fetchPendingMembers, rejectMember } from '../api/adminMembers.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminMemberTabs from './AdminMemberTabs.tsx'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'
import './LoginPage.css'
import './StatusPage.css'

type MemberAction = {
  id: number
  name: string
  kind: 'approve' | 'reject'
}

export default function AdminHomePage() {
  return (
    <AdminShell currentPath={ADMIN_PENDING_PATH}>
      <PendingMemberList />
    </AdminShell>
  )
}

function PendingMemberList() {
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [items, setItems] = useState<PendingMember[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [listState, setListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [listMessage, setListMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [confirming, setConfirming] = useState<MemberAction | null>(null)
  const [actingId, setActingId] = useState<number | null>(null)
  const acting = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchPendingMembers(page, keyword).then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !Array.isArray(result.data.items)) {
        setItems([])
        setTotalPages(0)
        setListState('error')
        setListMessage(adminErrorMessage(result, '승인 대기 회원을 불러오지 못했습니다.'))
        return
      }
      if (page > 0 && result.data.totalPages > 0 && page >= result.data.totalPages) {
        setListState('loading')
        setPage(result.data.totalPages - 1)
        return
      }
      setItems(result.data.items)
      setTotalPages(result.data.totalPages)
      setListMessage('')
      setListState(result.data.items.length === 0 ? 'empty' : 'ready')
    })
    return () => {
      cancelled = true
    }
  }, [page, keyword, reloadKey])

  useEffect(() => {
    if (!confirming) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && actingId === null) {
        setConfirming(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [confirming, actingId])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionMessage('')
    setListState('loading')
    setPage(0)
    setKeyword(keywordInput.trim())
    setReloadKey((current) => current + 1)
  }

  async function handleConfirm() {
    if (!confirming || acting.current) {
      return
    }
    acting.current = true
    setActingId(confirming.id)
    setActionMessage('')
    try {
      const result = confirming.kind === 'approve'
        ? await approveMember(confirming.id)
        : await rejectMember(confirming.id)
      if (redirectOnAccessFailure(result)) {
        return
      }
      setListState('loading')
      if (!result.ok) {
        setActionMessage(adminErrorMessage(
          result,
          confirming.kind === 'approve' ? '회원을 승인하지 못했습니다.' : '회원을 거절하지 못했습니다.',
        ))
      }
      setConfirming(null)
      setReloadKey((current) => current + 1)
    } finally {
      acting.current = false
      setActingId(null)
    }
  }

  const emptyMessage = keyword
    ? '검색 결과가 없습니다.'
    : '승인 대기 회원이 없습니다.'
  const confirmLabel = confirming?.kind === 'approve' ? '승인' : '거절'

  return (
    <>
      <header className="admin-heading">
        <h1>가입 승인 대기</h1>
        <p>이름, 이메일, 회사명으로 승인 대기 회원을 찾고 처리할 수 있습니다.</p>
      </header>

      <form className="admin-toolbar" onSubmit={handleSearch}>
        <label className="visually-hidden" htmlFor="pending-member-search">
          승인 대기 회원 검색
        </label>
        <input
          id="pending-member-search"
          type="search"
          placeholder="이름, 이메일, 회사명"
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
        />
        <button type="submit" disabled={listState === 'loading' || actingId !== null}>
          검색
        </button>
      </form>
      <AdminMemberTabs currentPath={ADMIN_PENDING_PATH} />

      {actionMessage ? (
        <p className="admin-message" role="alert">
          {actionMessage}
        </p>
      ) : null}

      {listState === 'loading' ? (
        <p className="admin-empty" role="status">
          승인 대기 회원을 불러오는 중입니다.
        </p>
      ) : null}
      {listState === 'empty' ? (
        <p className="admin-empty" role="status">
          {emptyMessage}
        </p>
      ) : null}
      {listState === 'error' ? (
        <p className="admin-empty" role="alert">
          {listMessage || '승인 대기 회원을 불러오지 못했습니다.'}
        </p>
      ) : null}
      {listState === 'ready' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">이메일</th>
                <th scope="col">연락처</th>
                <th scope="col">회사명</th>
                <th scope="col">가입 신청일</th>
                <th scope="col">처리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>{displayText(item.phone)}</td>
                  <td>{displayText(item.companyName)}</td>
                  <td>{formatCreatedAt(item.createdAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-approve"
                        disabled={actingId !== null}
                        onClick={() => setConfirming({ id: item.id, name: item.name, kind: 'approve' })}
                      >
                        {actingId === item.id ? '처리 중' : '승인'}
                      </button>
                      <button
                        type="button"
                        className="admin-reject"
                        disabled={actingId !== null}
                        onClick={() => setConfirming({ id: item.id, name: item.name, kind: 'reject' })}
                      >
                        {actingId === item.id ? '처리 중' : '거절'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {listState !== 'loading' ? (
        <div className="admin-pager" aria-label="승인 대기 회원 페이지">
          <button
            type="button"
            disabled={page <= 0 || actingId !== null}
            onClick={() => {
            setListState('loading')
            setPage((current) => current - 1)
          }}
          >
            이전
          </button>
          <span>{totalPages === 0 ? '표시할 페이지가 없습니다.' : `${page + 1} / ${totalPages}`}</span>
          <button
            type="button"
            disabled={totalPages === 0 || page + 1 >= totalPages || actingId !== null}
            onClick={() => {
            setListState('loading')
            setPage((current) => current + 1)
          }}
          >
            다음
          </button>
        </div>
      ) : null}

      {confirming ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="member-action-title">
            <h2 id="member-action-title">{confirmLabel}</h2>
            <p>
              {confirming.name} 회원의 가입을 {confirmLabel}하시겠습니까?
            </p>
            <div className="admin-dialog-actions">
              <button
                type="button"
                className="admin-dialog-cancel"
                disabled={actingId !== null}
                onClick={() => setConfirming(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="admin-dialog-confirm"
                disabled={actingId !== null}
                onClick={handleConfirm}
              >
                {actingId !== null ? '처리 중' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
