import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../auth.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

export default function ManagerStaffPage() {
  const { user } = useAuth()
  const [staff, setStaff] = useState([])
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function load() {
    setError('')
    try {
      const data = await apiFetch('/users/staff/')
      setStaff(data)
    } catch (err) {
      setError(err.message || 'Failed to load staff users')
    }
  }

  async function createStaff(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const created = await apiFetch('/users/create_staff/', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setSuccess(`Created staff: ${created.username}`)
      setForm({ username: '', email: '', password: '' })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to create staff')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (user?.role !== 'manager') {
    return (
      <div className="container">
        <div className="card">Manager only.</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="grid">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Create staff user</h2>
          <p className="muted">For cleaners / concierges. They can be assigned complaints and update status.</p>
          <div style={{ height: 10 }} />
          <form onSubmit={createStaff}>
            <div className="field">
              <label>Username</label>
              <input value={form.username} onChange={(e) => update('username', e.target.value)} required />
            </div>
            <div className="field">
              <label>Email (optional)</label>
              <input value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="field">
              <label>Temporary password</label>
              <PasswordInput value={form.password} onChange={(e) => update('password', e.target.value)} required autoComplete="new-password" />
            </div>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            <button className="btn primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create staff'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>Staff users</h2>
              <div className="muted" style={{ marginTop: 6 }}>Assignable staff list.</div>
            </div>
            <button className="btn" onClick={load}>Refresh</button>
          </div>
          <div style={{ height: 12 }} />
          <div className="list">
            {staff.map((u) => (
              <div key={u.id} className="item" style={{ cursor: 'default' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 650 }}>{u.username}</div>
                  <span className="pill ok">staff</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>{u.email || '—'}</div>
              </div>
            ))}
            {staff.length === 0 && <div className="muted">No staff users yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

