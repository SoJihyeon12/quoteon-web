import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ADMIN_CATEGORIES_PATH } from '../adminMenu.ts'
import { adminErrorMessage } from '../adminMemberList.ts'
import { createCategory, deleteCategory, updateCategory } from '../api/adminCategories.ts'
import { fetchCategories } from '../api/catalog.ts'
import type { Category } from '../api/types.ts'
import {
  buildCategoryBody,
  canConfirmCategoryDelete,
  categoryChildren,
  categoryDeleteResult,
  categoryForest,
  categorySaveResult,
  CATEGORY_DELETE_FAILED,
  parentChoices,
  parentSelectionError,
  selectionAfterDelete,
  validateCategoryName,
  type CategoryNode,
} from '../categoryAdmin.ts'
import { redirectOnAccessFailure } from '../session.ts'
import AdminProductTabs from './AdminProductTabs.tsx'
import AdminShell from './AdminShell.tsx'
import './AdminHomePage.css'

export default function AdminCategoryPage() {
  return (
    <AdminShell currentPath={ADMIN_CATEGORIES_PATH}>
      <CategoryManager />
    </AdminShell>
  )
}

function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadMessage, setLoadMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<number | null>(null)
  const [nameError, setNameError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
  const busyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchCategories().then((result) => {
      if (cancelled) {
        return
      }
      if (redirectOnAccessFailure(result)) {
        return
      }
      if (!result.ok || !Array.isArray(result.data)) {
        setCategories([])
        setLoadState('error')
        setLoadMessage(adminErrorMessage(result, '카테고리 목록을 불러오지 못했습니다.'))
        return
      }
      setCategories(result.data)
      setExpanded(new Set(result.data.map((category) => category.id)))
      setSelectedId((current) => {
        if (current === null || result.data.some((category) => category.id === current)) {
          return current
        }
        return null
      })
      setLoadMessage('')
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    if (!confirmOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        setDeleteMessage('')
        setConfirmOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [confirmOpen])

  const selected = categories.find((category) => category.id === selectedId) ?? null
  const children = categoryChildren(categories, selectedId)
  const roots = categoryForest(categories)
  const editingId = mode === 'edit' ? selectedId : null
  const choices = parentChoices(categories, editingId)

  function reload() {
    setLoadState('loading')
    setReloadKey((current) => current + 1)
  }

  function openCreate() {
    if (busyRef.current) {
      return
    }
    setMode('create')
    setName('')
    setParentId(selectedId)
    setNameError('')
    setFormMessage('')
  }

  function openEdit() {
    if (busyRef.current || !selected) {
      return
    }
    setMode('edit')
    setName(selected.name)
    setParentId(selected.parentId)
    setNameError('')
    setFormMessage('')
  }

  function cancelForm() {
    if (busyRef.current) {
      return
    }
    setMode(null)
    setNameError('')
    setFormMessage('')
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyRef.current) {
      return
    }
    const nameMessage = validateCategoryName(name)
    const parentMessage = parentSelectionError(categories, editingId, parentId)
    setNameError(nameMessage)
    setFormMessage(parentMessage)
    const body = buildCategoryBody(categories, name, parentId, editingId)
    if (!body) {
      return
    }
    busyRef.current = true
    setSaving(true)
    try {
      const result = editingId === null
        ? await createCategory(body)
        : await updateCategory(editingId, body)
      if (redirectOnAccessFailure(result)) {
        return
      }
      const outcome = categorySaveResult(result)
      if (outcome.type === 'saved') {
        setMode(null)
        setFormMessage('')
        reload()
        return
      }
      if (outcome.type === 'name') {
        setNameError(outcome.message)
        return
      }
      setFormMessage(outcome.message)
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  function openDelete() {
    if (busyRef.current || !selected) {
      return
    }
    setDeleteMessage('')
    setConfirmOpen(true)
  }

  function cancelDelete() {
    if (deleting) {
      return
    }
    setDeleteMessage('')
    setConfirmOpen(false)
  }

  async function confirmDelete() {
    if (!selected || !canConfirmCategoryDelete(confirmOpen, busyRef.current)) {
      return
    }
    busyRef.current = true
    setDeleting(true)
    setDeleteMessage('')
    try {
      const result = await deleteCategory(selected.id)
      if (redirectOnAccessFailure(result)) {
        return
      }
      const outcome = categoryDeleteResult(result)
      if (!outcome.deleted) {
        setDeleteMessage(outcome.message || CATEGORY_DELETE_FAILED)
        return
      }
      setSelectedId(selectionAfterDelete(categories, selected.id))
      setMode(null)
      setConfirmOpen(false)
      reload()
    } finally {
      busyRef.current = false
      setDeleting(false)
    }
  }

  return (
    <>
      <header className="admin-heading">
        <h1>카테고리 관리</h1>
      </header>
      <AdminProductTabs currentPath={ADMIN_CATEGORIES_PATH} />
      {loadState === 'loading' ? (
        <p className="admin-empty" role="status">
          카테고리 목록을 불러오는 중입니다.
        </p>
      ) : null}
      {loadState === 'error' ? (
        <p className="admin-empty" role="alert">
          {loadMessage || '카테고리 목록을 불러오지 못했습니다.'}
        </p>
      ) : null}
      {loadState === 'ready' ? (
        <div className="admin-category">
          <section className="admin-category-tree" aria-label="카테고리 트리">
            <button
              type="button"
              className="admin-category-node"
              aria-current={selectedId === null ? 'true' : undefined}
              onClick={() => setSelectedId(null)}
            >
              전체
            </button>
            <CategoryBranches
              nodes={roots}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={(categoryId) => {
                setExpanded((current) => {
                  const next = new Set(current)
                  if (next.has(categoryId)) {
                    next.delete(categoryId)
                  } else {
                    next.add(categoryId)
                  }
                  return next
                })
              }}
              onSelect={setSelectedId}
            />
          </section>
          <section className="admin-category-detail" aria-labelledby="category-detail-title">
            <div className="admin-category-head">
              <h2 id="category-detail-title">{selected ? selected.name : '전체'}</h2>
              <div className="admin-category-tools">
                <button type="button" onClick={openCreate} disabled={saving || deleting}>
                  하위 추가
                </button>
                {selected ? (
                  <button type="button" onClick={openEdit} disabled={saving || deleting}>
                    이름 수정
                  </button>
                ) : null}
                {selected ? (
                  <button type="button" className="admin-category-delete" onClick={openDelete} disabled={saving || deleting}>
                    삭제
                  </button>
                ) : null}
              </div>
            </div>
            {mode ? (
              <form className="admin-category-form" onSubmit={handleSave}>
                <label>
                  카테고리명
                  <input
                    value={name}
                    aria-invalid={nameError ? true : undefined}
                    onChange={(event) => setName(event.target.value)}
                    disabled={saving}
                  />
                </label>
                {nameError ? <p className="admin-field-error">{nameError}</p> : null}
                <label>
                  상위 카테고리
                  <select
                    value={parentId === null ? '' : String(parentId)}
                    onChange={(event) => {
                      const value = event.target.value
                      setParentId(value ? Number(value) : null)
                    }}
                    disabled={saving}
                  >
                    <option value="">최상위</option>
                    {choices.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                {formMessage ? (
                  <p className="admin-message" role="alert">
                    {formMessage}
                  </p>
                ) : null}
                <div className="admin-category-form-actions">
                  <button type="button" onClick={cancelForm} disabled={saving}>
                    취소
                  </button>
                  <button type="submit" disabled={saving}>
                    {saving ? '저장 중' : '저장'}
                  </button>
                </div>
              </form>
            ) : null}
            {children.length === 0 ? (
              <p className="admin-category-empty">하위 카테고리가 없습니다.</p>
            ) : (
              <ul className="admin-category-list">
                {children.map((category) => (
                  <li key={category.id}>
                    <button type="button" onClick={() => setSelectedId(category.id)}>
                      {category.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
      {confirmOpen && selected ? (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="category-delete-title">
            <h2 id="category-delete-title">카테고리 삭제</h2>
            <p>{selected.name} 카테고리를 삭제하시겠습니까?</p>
            {deleteMessage ? (
              <p className="admin-message" role="alert">
                {deleteMessage}
              </p>
            ) : null}
            <div className="admin-dialog-actions">
              <button type="button" className="admin-dialog-cancel" disabled={deleting} onClick={cancelDelete}>
                취소
              </button>
              <button
                type="button"
                className="admin-category-delete"
                disabled={!canConfirmCategoryDelete(confirmOpen, deleting)}
                onClick={confirmDelete}
              >
                {deleting ? '삭제 중' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function CategoryBranches({
  nodes,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  nodes: CategoryNode[]
  selectedId: number | null
  expanded: Set<number>
  onToggle: (categoryId: number) => void
  onSelect: (categoryId: number) => void
}) {
  if (nodes.length === 0) {
    return null
  }
  return (
    <ul className="admin-category-branch">
      {nodes.map((node) => (
        <li key={node.id}>
          {node.children.length > 0 ? (
            <button type="button" className="admin-category-toggle" onClick={() => onToggle(node.id)}>
              {expanded.has(node.id) ? '▾' : '▸'}
            </button>
          ) : (
            <span className="admin-category-toggle" />
          )}
          <button
            type="button"
            className="admin-category-node"
            aria-current={selectedId === node.id ? 'true' : undefined}
            onClick={() => onSelect(node.id)}
          >
            {node.name}
          </button>
          {node.children.length > 0 && expanded.has(node.id) ? (
            <CategoryBranches
              nodes={node.children}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}
