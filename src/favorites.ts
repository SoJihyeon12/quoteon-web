import type { ApiResult } from './api/types.ts'

export const FAVORITES_EMPTY = '즐겨찾기에 등록된 제품이 없습니다.'
export const FAVORITE_ADD_FAILED = '즐겨찾기에 추가하지 못했습니다.'
export const FAVORITE_REMOVE_FAILED = '즐겨찾기를 해제하지 못했습니다.'

export function favoriteToggleLabel(favorited: boolean) {
  return favorited ? '즐겨찾기 해제' : '즐겨찾기'
}

export function favoriteStar(favorited: boolean) {
  return favorited ? '★' : '☆'
}

export function favoriteOutcomeMessage(result: ApiResult<{ productId: number; favorited: boolean }>, fallback: string) {
  if (result.ok) {
    return ''
  }
  return result.error?.message || fallback
}
