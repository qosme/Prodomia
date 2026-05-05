import { useState } from 'react'
import { useAuth } from '../auth.jsx'
import { changePassword } from '../api'
import PasswordInput from '../components/PasswordInput.jsx'

const ROLE_LABEL = { resident: 'Residente', manager: 'Administrador', staff: 'Personal' }

export default function UserSettingsPage() {
  const { user } = useAuth()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (newPw !== confirmPw) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await changePassword(currentPw, newPw)
      setSuccess('Contraseña cambiada exitosamente.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 600 }}>Mi Cuenta</h1>

      <div className="card" style={{ marginBottom: 14 }}>
        <h2 className="settings-section-title">Información</h2>
        <div className="field">
          <label>Usuario</label>
          <input value={user.username} readOnly />
        </div>
        {user.email && (
          <div className="field">
            <label>Email</label>
            <input value={user.email} readOnly />
          </div>
        )}
        <div className="field">
          <label>Rol</label>
          <div><span className="pill">{ROLE_LABEL[user.role] ?? user.role}</span></div>
        </div>
      </div>

      <div className="card">
        <h2 className="settings-section-title">Cambiar Contraseña</h2>
        <form onSubmit={handleSubmit}>
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
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <button className="btn primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Guardando…' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
