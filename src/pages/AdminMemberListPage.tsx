import { useEffect, useState, type FormEvent } from 'react'
import {
  adminErrorMessage,
  canGoToNextMemberPage,
  canGoToPreviousMemberPage,
  displayText,
  memberRoleLabel,
  memberStatusLabel,
  pageAfterMemberSearch,
  type MemberSummary,
} from '../adminMemberList.ts'
import { ADMIN_MEMBERS_PATH, memberEditPath } from '../adminMenu.ts'
import { fetchMembers } from '../api/adminMembers.ts'
import { navigate } from '../navigation.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminMemberTabs from './AdminMemberTabs.tsx'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminMemberListPage() {
  return (
    <AdminShell currentPath={ADMIN_MEMBERS_PATH}>
      <MemberList />
    </AdminShell>
  )
}

function MemberList() {
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [items, setItems] = useState<MemberSummary[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [listState, setListState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [listMessage, setListMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchMembers(page, keyword).then((result) => {
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
        setListMessage(adminErrorMessage(result, '사용자 목록을 불러오지 못했습니다.'))
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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = keywordInput.trim()
    setListState('loading')
    setPage(pageAfterMemberSearch())
    if (page === 0 && next === keyword) {
      setReloadKey((current) => current + 1)
      return
    }
    setKeyword(next)
  }

  const emptyMessage = keyword ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'

  return (
    <>
      <header className="admin-heading">
        <h1>사용자 관리</h1>
      </header>
      <form className="admin-toolbar" onSubmit={handleSearch}>
        <label className="visually-hidden" htmlFor="member-search">
          사용자 검색
        </label>
        <input
          id="member-search"
          type="search"
          placeholder="이름, 이메일, 소속"
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
        />
        <button type="submit" disabled={listState === 'loading'}>
          검색
        </button>
      </form>
      <AdminMemberTabs currentPath={ADMIN_MEMBERS_PATH} />
      {listState === 'loading' ? (
        <p className="admin-empty" role="status">
          사용자 목록을 불러오는 중입니다.
        </p>
      ) : null}
      {listState === 'empty' ? (
        <p className="admin-empty" role="status">
          {emptyMessage}
        </p>
      ) : null}
      {listState === 'error' ? (
        <p className="admin-empty" role="alert">
          {listMessage || '사용자 목록을 불러오지 못했습니다.'}
        </p>
      ) : null}
      {listState === 'ready' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">이메일</th>
                <th scope="col">휴대폰</th>
                <th scope="col">소속</th>
                <th scope="col">권한</th>
                <th scope="col">상태</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>{displayText(item.phone)}</td>
                  <td>{displayText(item.companyName)}</td>
                  <td>{memberRoleLabel(item.role)}</td>
                  <td>{memberStatusLabel(item.status)}</td>
                  <td>
                    <a
                      className="admin-edit-link"
                      href={memberEditPath(item.id)}
                      onClick={(event) => {
                        event.preventDefault()
                        navigate(memberEditPath(item.id))
                      }}
                    >
                      수정
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {listState !== 'loading' ? (
        <div className="admin-pager" aria-label="사용자 목록 페이지">
          <button
            type="button"
            disabled={!canGoToPreviousMemberPage(page)}
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
            disabled={!canGoToNextMemberPage(page, totalPages)}
            onClick={() => {
              setListState('loading')
              setPage((current) => current + 1)
            }}
          >
            다음
          </button>
        </div>
      ) : null}
    </>
  )
}
