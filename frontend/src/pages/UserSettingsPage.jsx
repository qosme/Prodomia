import { useEffect, useState } from 'react'
import { useAuth } from '../useAuth.js'
import { apiFetch, changePassword } from '../api'
import PasswordInput from '../components/PasswordInput.jsx'

const ROLE_LABEL = { resident: 'Residente', manager: 'Administrador', staff: 'Personal', concierge: 'Conserje' }

export default function UserSettingsPage() {
  const { user, refreshMe } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [infoError, setInfoError] = useState('')
  const [infoSuccess, setInfoSuccess] = useState('')
  const [infoLoading, setInfoLoading] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email || '')
    }
  }, [user])

  async function handleInfoSubmit(e) {
    e.preventDefault()
    setInfoError('')
    setInfoSuccess('')
    setInfoLoading(true)
    try {
      await apiFetch('/me/', {
        method: 'PATCH',
        body: JSON.stringify({ username, email }),
      })
      await refreshMe()
      setInfoSuccess('Información actualizada.')
    } catch (err) {
      setInfoError(err.message || 'Error al actualizar.')
    } finally {
      setInfoLoading(false)
    }
  }

  async function handlePwSubmit(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (newPw !== confirmPw) {
      setPwError('Las contraseñas nuevas no coinciden.')
      return
    }
    setPwLoading(true)
    try {
      await changePassword(currentPw, newPw)
      setPwSuccess('Contraseña cambiada exitosamente.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      setPwError(err.message || 'Error al cambiar la contraseña.')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 600 }}>Mi Cuenta</h1>

      <div className="card" style={{ marginBottom: 14 }}>
        <h2 className="settings-section-title">Información</h2>
        <form onSubmit={handleInfoSubmit}>
          <div className="field">
            <label>Usuario</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Rol</label>
            <div><span className="pill">{ROLE_LABEL[user?.role] ?? user?.role}</span></div>
          </div>
          {infoError && <p className="error">{infoError}</p>}
          {infoSuccess && <p className="success">{infoSuccess}</p>}
          <button className="btn primary" type="submit" disabled={infoLoading} style={{ width: '100%' }}>
            {infoLoading ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="settings-section-title">Cambiar Contraseña</h2>
        <form onSubmit={handlePwSubmit}>
          <div className="field">
            <label>Contraseña actual</label>
            <PasswordInput value={currentPw} onChange={e => setCurrentPw(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className="field">
            <label>Nueva contraseña</label>
            <PasswordInput value={newPw} onChange={e => setNewPw(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="field">
            <label>Confirmar nueva contraseña</label>
            <PasswordInput value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required autoComplete="new-password" />
          </div>
          {pwError && <p className="error">{pwError}</p>}
          {pwSuccess && <p className="success">{pwSuccess}</p>}
          <button className="btn primary" type="submit" disabled={pwLoading} style={{ width: '100%' }}>
            {pwLoading ? 'Guardando…' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
