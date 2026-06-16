const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

function getToken() {
  return localStorage.getItem('accessToken')
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem('refreshToken')
  if (!refresh) return false

  const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    return false
  }

  const data = await res.json()
  localStorage.setItem('accessToken', data.access)
  return true
}

function parseError(res, data) {
  const message =
    (data && typeof data === 'object' && (
      data.detail ||
      (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) ||
      Object.values(data).flat().find(v => typeof v === 'string')
    )) ||
    (typeof data === 'string' && data) ||
    `Request failed (${res.status})`
  const err = new Error(message)
  err.status = res.status
  err.data = data
  return err
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers.set('Authorization', `Bearer ${getToken()}`)
      res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

  if (!res.ok) throw parseError(res, data)

  return data
}

export async function login(email, password) {
  const data = await apiFetch('/auth/token/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('accessToken', data.access)
  localStorage.setItem('refreshToken', data.refresh)
  return data
}

export function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

export async function register(payload) {
  return apiFetch('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function me() {
  return apiFetch('/me/')
}

export async function changePassword(currentPassword, newPassword) {
  return apiFetch('/auth/change-password/', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

