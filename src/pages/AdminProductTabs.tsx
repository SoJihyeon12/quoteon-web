import type { MouseEvent } from 'react'
import { ADMIN_PRODUCT_TABS, adminProductTabIsCurrent } from '../adminMenu.ts'
import { navigate } from '../navigation.ts'

export default function AdminProductTabs({ currentPath }: { currentPath: string }) {
  return (
    <nav className="admin-tabs" aria-label="제품 관리 구분">
      {ADMIN_PRODUCT_TABS.map((tab) => {
        if (!tab.path) {
          return <span key={tab.label}>{tab.label}</span>
        }
        const path = tab.path
        return (
          <a
            key={tab.label}
            href={path}
            aria-current={adminProductTabIsCurrent(path, currentPath) ? 'page' : undefined}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault()
              if (path !== currentPath) {
                navigate(path)
              }
            }}
          >
            {tab.label}
          </a>
        )
      })}
    </nav>
  )
}
