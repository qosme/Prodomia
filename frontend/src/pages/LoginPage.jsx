import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username, password)
      nav('/')
    } catch (err) {
      setError(err.message || 'El inicio de sesión ha fallado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: '24px auto' }}>
        <h2>Iniciar Sesión</h2>
        <p className="muted">Use sus credenciales de residente/administrador/personal.</p>
        <div style={{ height: 10 }} />
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Nombre de Usuario</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Iniciando Sesión…' : 'Iniciar Sesión'}
            </button>
            <Link className="muted" to="/register">
              ¿Necesitas una cuenta?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

