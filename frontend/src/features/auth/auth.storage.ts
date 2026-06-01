import type { AuthSession } from '@/types'

const SESSION_KEY = 'flately.user.v2'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function persistUserMeta(user: { id: string; email: string; name: string | null; picture: string | null }): void {
  if (!isBrowser()) {
    return
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function getPersistedUserMeta(): { id: string; email: string; name: string | null; picture: string | null } | null {
  if (!isBrowser()) {
    return null
  }
  const raw = window.localStorage.getItem(SESSION_KEY)
  try {
      return raw ? JSON.parse(raw) : null
  } catch {
      return null
  }
}

export function clearPersistedUserMeta(): void {
  if (!isBrowser()) {
    return
  }
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem('flately.auth.session.v1')
}

// Deprecated compatibility methods to keep slice working.
export function persistSession(session: AuthSession): void {
  if (!session.user) return
  persistUserMeta({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      picture: session.user.picture ?? null
  })
}
export function clearPersistedSession(): void {
  clearPersistedUserMeta()
}
export function readPersistedSession(): AuthSession | null {
    const user = getPersistedUserMeta();
    if (user) {
        return { accessToken: '', user } // AccessToken will be requested via refresh endpoint
    }
    return null;
}
