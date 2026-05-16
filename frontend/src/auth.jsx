import { useEffect, useMemo, useState } from 'react'
import { login as apiLogin, logout as apiLogout, me as apiMe } from './api'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refreshMe() {
    try {
      const data = await apiMe()
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshMe()
  }, [])

  async function login(email, password) {
    await apiLogin(email, password)
    await refreshMe()
  }

  function logout() {
    apiLogout()
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


