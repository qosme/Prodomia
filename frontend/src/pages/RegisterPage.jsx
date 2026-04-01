import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api'

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
      setSuccess('Registered. Wait for manager approval, then login.')
      setTimeout(() => nav('/login'), 700)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 720, margin: '24px auto' }}>
        <h2>Create resident account</h2>
        <p className="muted">A manager must approve you before you can submit complaints.</p>
        <div style={{ height: 10 }} />
        <form onSubmit={onSubmit}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label>Username</label>
              <input value={form.username} onChange={(e) => update('username', e.target.value)} />
            </div>
            <div className="field">
              <label>Email (optional)</label>
              <input value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label>Unit (optional)</label>
              <input value={form.unit} onChange={(e) => update('unit', e.target.value)} />
            </div>
            <div className="field">
              <label>Phone (optional)</label>
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
            <Link className="muted" to="/login">
              Already have an account?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

