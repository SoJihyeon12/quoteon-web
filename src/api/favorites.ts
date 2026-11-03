import { apiRequest } from './client.ts'

export type FavoriteState = {
  productId: number
  favorited: boolean
}

export function addFavorite(productId: number) {
  return apiRequest<FavoriteState>(`/api/products/${productId}/favorite`, { method: 'POST' })
}

export function removeFavorite(productId: number) {
  return apiRequest<FavoriteState>(`/api/products/${productId}/favorite`, { method: 'DELETE' })
}
