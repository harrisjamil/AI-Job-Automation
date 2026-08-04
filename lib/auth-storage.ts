export type StoredAuthUser = {
  id: string
  fullName: string
  email: string
  username: string
}

const AUTH_USER_KEY = "auth_user"

export function saveAuthUser(user: StoredAuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function getAuthUser(): StoredAuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredAuthUser
  } catch {
    return null
  }
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_USER_KEY)
}
