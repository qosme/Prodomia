import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'
import PasswordInput from '../../components/PasswordInput.jsx'

export default function AdminConciergePage() {
  const [conciergeList, setConciergeList] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)

  const loadConcierges = () => {
    setLoading(true)
    apiFetch('/users/concierges/')
      .then(setConciergeList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadConcierges() }, [])

  const createConcierge = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await apiFetch('/users/create_concierge/', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setMsg(`Conserje "${form.username}" creado.`)
      setForm({ username: '', email: '', password: '' })
      loadConcierges()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const deactivate = async (id) => {
    if (!confirm('¿Desactivar este conserje?')) return
    try {
      await apiFetch(`/users/${id}/deactivate_concierge/`, { method: 'POST' })
      setMsg('Conserje desactivado.')
      loadConcierges()
    } catch (e) {
      setError(e.message)
    }
  }

  const activate = async (id) => {
    try {
      await apiFetch(`/users/${id}/activate_concierge/`, { method: 'POST' })
      setMsg('Conserje activado.')
      loadConcierges()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2 className="admin-page-title">Gestión de Conserjes</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="grid" style={{ marginBottom: 32 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Crear Conserje</h3>
          <form onSubmit={createConcierge}>
            <div className="field">
              <label>Usuario</label>
              <input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <PasswordInput
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <button className="btn primary" type="submit" disabled={creating}>
              {creating ? 'Creando…' : 'Crear Conserje'}
            </button>
          </form>
        </div>
      </div>

      <h3>Conserjes Actuales</h3>
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conciergeList.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    Sin conserjes registrados aún.
                  </td>
                </tr>
              )}
              {conciergeList.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email || '-'}</td>
                  <td>
                    <span className={`pill ${u.concierge_profile?.is_active_concierge ? 'ok' : 'bad'}`}>
                      {u.concierge_profile?.is_active_concierge ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {u.concierge_profile?.is_active_concierge ? (
                      <button
                        className="btn danger"
                        style={{ fontSize: 13, padding: '6px 10px' }}
                        onClick={() => deactivate(u.id)}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        className="btn primary"
                        style={{ fontSize: 13, padding: '6px 10px' }}
                        onClick={() => activate(u.id)}
                      >
                        Activar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
