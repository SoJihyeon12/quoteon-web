import type { MouseEvent } from 'react'
import { ADMIN_MEMBER_TABS } from '../adminMenu.ts'
import { navigate } from '../navigation.ts'

export default function AdminMemberTabs({ currentPath }: { currentPath: string }) {
  return (
    <nav className="admin-tabs" aria-label="사용자 목록 구분">
      {ADMIN_MEMBER_TABS.map((tab) => (
        <a
          key={tab.path}
          href={tab.path}
          aria-current={tab.path === currentPath ? 'page' : undefined}
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault()
            if (tab.path !== currentPath) {
              navigate(tab.path)
            }
          }}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  )
}
