import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'
import PasswordInput from '../../components/PasswordInput.jsx'

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)

  const loadStaff = () => {
    setLoading(true)
    apiFetch('/users/staff/')
      .then(setStaffList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStaff() }, [])

  const createStaff = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await apiFetch('/users/create_staff/', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setMsg(`Personal "${form.username}" creado.`)
      setForm({ username: '', email: '', password: '' })
      loadStaff()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const deactivateStaff = async (id) => {
    if (!confirm('¿Desactivar este miembro del personal?')) return
    try {
      await apiFetch(`/users/${id}/deactivate_staff/`, { method: 'POST' })
      setMsg('Miembro del personal desactivado.')
      loadStaff()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2 className="admin-page-title">Gestión de Personal</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="grid" style={{ marginBottom: 32 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Crear Miembro del Personal</h3>
          <form onSubmit={createStaff}>
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
              {creating ? 'Creando…' : 'Crear Personal'}
            </button>
          </form>
        </div>
      </div>

      <h3>Personal Actual</h3>
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    Sin miembros del personal aún.
                  </td>
                </tr>
              )}
              {staffList.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={`pill ${u.staff_profile?.is_active_staff ? 'ok' : 'bad'}`}>
                      {u.staff_profile?.is_active_staff ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {u.staff_profile?.is_active_staff && (
                      <button
                        className="btn danger"
                        style={{ fontSize: 13, padding: '6px 10px' }}
                        onClick={() => deactivateStaff(u.id)}
                      >
                        Desactivar
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
