import type { ApiResult } from './api/types.ts'

/**
 * 서버에 세션이 없거나 CSRF·권한 오류가 나도 클라이언트 로그아웃을 끝낸다.
 * 보호된 API 우회가 아니라, 이미 서버 인증이 없거나 정리된 상태를 로그인 화면으로 맞춘다.
 */
export function shouldCompleteClientLogout(result: ApiResult<unknown>) {
  if (result.ok) {
    return true
  }
  if (result.status === 0 || result.status === 401 || result.status === 403) {
    return true
  }
  return false
}
