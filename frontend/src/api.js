const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

function getToken() {
  return localStorage.getItem('accessToken')
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (
        data.detail ||
        (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) ||
        (typeof data === 'object' && Object.values(data).flat().find(v => typeof v === 'string'))
      )) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

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

