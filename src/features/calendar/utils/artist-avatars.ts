import type { ApiGoogleConnection } from '../types'

/**
 * Staff id → picture: the connected Google account's photo first, the uploaded avatar otherwise.
 * Shared by every screen that shows `ArtistBadge`, so an artist looks the same everywhere.
 */
export function artistAvatarMap(
  connections: ApiGoogleConnection[],
  staff: ReadonlyArray<{ id: string; avatar?: string }>,
): Record<string, string> {
  const avatars: Record<string, string> = {}
  for (const connection of connections) {
    if (connection.status === 'connected' && connection.googleAccountPicture) {
      avatars[connection.staffId] = connection.googleAccountPicture
    }
  }
  for (const member of staff) {
    if (member.avatar && !avatars[member.id]) avatars[member.id] = member.avatar
  }
  return avatars
}
