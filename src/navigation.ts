export function navigate(path: string, state: unknown = null) {
  window.history.pushState(state, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function pathForMember(member: { role: string; status: string }) {
  if (member.status === 'PENDING') {
    return '/signup/pending'
  }
  if (member.status === 'REJECTED' || member.status === 'INACTIVE') {
    return '/access-restricted'
  }
  if (member.status === 'ACTIVE' && member.role === 'ROLE_USER') {
    return '/consultation?mode=new'
  }
  if (member.status === 'ACTIVE' && member.role === 'ROLE_ADMIN') {
    return '/admin/dashboard'
  }
  return null
}
