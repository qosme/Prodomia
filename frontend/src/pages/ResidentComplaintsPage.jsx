import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api.js'
import { useAuth } from '../auth.jsx'

const STATUS_LABELS = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En Progreso',
  RESOLVED: 'Resuelto',
  REJECTED: 'Rechazado',
  CLOSED: 'Cerrado',
}

function StatusPill({ status }) {
  const ok = status === 'RESOLVED' || status === 'CLOSED'
  const bad = status === 'REJECTED'
  return <span className={`pill ${ok ? 'ok' : bad ? 'bad' : ''}`}>{STATUS_LABELS[status] ?? status}</span>
}

export default function ResidentComplaintsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canCreate = (user?.role === 'resident' && user?.approved) ||
    (user?.role === 'manager' && user?.resident_profile != null)

  async function load() {
    setError('')
    setBusy(true)
    try {
      const all = await apiFetch('/complaints/')
      const mine = user?.role === 'manager'
        ? all.filter((c) => c.resident_username === user.username)
        : all
      setItems(mine)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container">
      <div className="grid">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Mis Reclamos</h2>
            <button className="btn" onClick={load} disabled={busy}>Refrescar</button>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="list">
            {items.map((c) => (
              <Link key={c.id} className="item" to={`/complaints/${c.id}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 650 }}>{c.title}</div>
                  <StatusPill status={c.status} />
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {c.category ? `${c.category} • ` : ''}
                  {c.location || ''}
                </div>
              </Link>
            ))}
            {items.length === 0 && !busy && <div className="muted">Sin reclamos aún.</div>}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Nuevo Reclamo</h2>
          {canCreate ? (
            <NewComplaintForm onCreated={load} />
          ) : (
            <div>
              <span className="pill bad">No aprobado</span>
              <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                Podrás enviar reclamos una vez que tu cuenta sea aprobada por el administrador.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NewComplaintForm({ onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', category: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(k, v) { setForm((p) => ({ ...p, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await apiFetch('/complaints/', { method: 'POST', body: JSON.stringify(form) })
      setForm({ title: '', description: '', location: '', category: '' })
      onCreated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Título</label>
        <input value={form.title} onChange={(e) => update('title', e.target.value)} required />
      </div>
      <div className="field">
        <label>Descripción</label>
        <textarea value={form.description} onChange={(e) => update('description', e.target.value)} required />
      </div>
      <div className="field">
        <label>Ubicación (opcional)</label>
        <input value={form.location} onChange={(e) => update('location', e.target.value)} />
      </div>
      <div className="field">
        <label>Categoría (opcional)</label>
        <input value={form.category} onChange={(e) => update('category', e.target.value)} />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn primary" disabled={busy}>
        {busy ? 'Enviando…' : 'Enviar Reclamo'}
      </button>
    </form>
  )
}
