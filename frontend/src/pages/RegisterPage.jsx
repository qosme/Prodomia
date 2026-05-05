import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api'
import PasswordInput from '../components/PasswordInput.jsx'

export default function RegisterPage() {
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', unit: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      await register(form)
      setSuccess('Registrado. Espere aprobación del administrador, luego inicie sesión.')
      setTimeout(() => nav('/login'), 700)
    } catch (err) {
      setError(err.message || 'El registro ha fallado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 720, margin: '24px auto' }}>
        <h2>Crear una cuenta de usuario</h2>
        <p className="muted">Un administrador debe aprobar su cuenta antes de que pueda enviar reclamos.</p>
        <div style={{ height: 10 }} />
        <form onSubmit={onSubmit}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label>Nombre de Usuario</label>
              <input value={form.username} onChange={(e) => update('username', e.target.value)} />
            </div>
            <div className="field">
              <label>Correo Electrónico</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required autoComplete="email" />
            </div>
          </div>
          <div className="field">
            <label>Contraseña</label>
            <PasswordInput value={form.password} onChange={(e) => update('password', e.target.value)} autoComplete="new-password" required />
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label>Unidad (opcional)</label>
              <input value={form.unit} onChange={(e) => update('unit', e.target.value)} />
            </div>
            <div className="field">
              <label>Teléfono (opcional)</label>
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Creando…' : 'Crear Cuenta'}
            </button>
            <Link className="muted" to="/login">
              ¿Ya tienes una cuenta?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

