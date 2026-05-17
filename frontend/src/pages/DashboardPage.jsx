import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../useAuth.js'
import ResidentHomePage from './ResidentHomePage.jsx'
import ManagerHomePage from './ManagerHomePage.jsx'

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

function computeUpdates(complaints) {
  const updates = []
  for (const c of complaints) {
    const lastComment = (c.comments || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
    const lastStatus = (c.status_history || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
    const candidates = []
    if (lastComment) candidates.push({ type: 'comment', at: lastComment.created_at, who: lastComment.author_username, text: `Comentó en “${c.title}”` , complaintId: c.id })
    if (lastStatus) candidates.push({ type: 'status', at: lastStatus.created_at, who: lastStatus.changed_by_username, text: `Estado ${STATUS_LABELS[lastStatus.from_status] ?? lastStatus.from_status} -> ${STATUS_LABELS[lastStatus.to_status] ?? lastStatus.to_status} en “${c.title}”`, complaintId: c.id })
    for (const u of candidates) updates.push(u)
  }
  return updates.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8)
}

export default function DashboardPage() {
  const { user, refreshMe } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const statusCounts = useMemo(() => {
    const m = new Map()
    for (const c of items) m.set(c.status, (m.get(c.status) || 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [items])
  const recentUpdates = useMemo(() => computeUpdates(items), [items])

  async function load() {
    setError('')
    try {
      const data = await apiFetch('/complaints/')
      setItems(data)
    } catch (err) {
      setError(err.message || 'Failed to load complaints')
    }
  }

  // Se ejecuta una vez al montar el componente para obtener el usuario y los reclamos.
  // load y refreshMe se omiten de las dependencias intencionalmente
  // ya que agregarlos haría que el effecto se volviera a ejecutar en cada render, ya que se recrean cada vez.
  useEffect(() => {
    refreshMe()
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (user?.role === 'resident') return <ResidentHomePage />
  if (user?.role === 'manager') return <ManagerHomePage />
  if (user?.role === 'concierge') return <Navigate to="/concierge" replace />

  return (
    <div className="container">
      <div className="grid">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>Reclamos</h2>
              <div className="muted" style={{ marginTop: 6 }}>
                {user?.role === 'manager'
                  ? 'Todos los reclamos en el edificio'
                  : user?.role === 'staff'
                    ? 'Reclamos asignados a ti'
                    : 'Tus reclamos'}
              </div>
            </div>
          </div>

          <div style={{ height: 12 }} />
          {error && <div className="error">{error}</div>}

          {user?.role === 'resident' && (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="row">
                  <span className="pill">Total enviados: {items.length}</span>
                  <span className={`pill ${user?.approved ? 'ok' : 'bad'}`}>
                    {user?.approved ? 'aprobados' : 'pendientes'}
                  </span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {statusCounts.slice(0, 4).map(([s, n]) => (
                    <span key={s} className="pill">
                      {STATUS_LABELS[s] ?? s}: {n}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ height: 10 }} />
              <h2 style={{ margin: '0 0 8px' }}>Actualizaciones recientes</h2>
              <div className="list">
                {recentUpdates.map((u, idx) => (
                  <Link key={`${u.type}-${u.at}-${idx}`} className="item" to={`/complaints/${u.complaintId}`}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 650 }}>{u.text}</div>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {new Date(u.at).toLocaleString('es-CL', { hour12: false })}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      Por {u.who || '-'}
                    </div>
                  </Link>
                ))}
                {recentUpdates.length === 0 && <div className="muted">Sin actualizaciones recientes.</div>}
              </div>
              <div style={{ height: 12 }} />
            </>
          )}

          <div className="list">
            {items.map((c) => (
              <Link key={c.id} className="item" to={`/complaints/${c.id}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 650 }}>{c.title}</div>
                  <StatusPill status={c.status} />
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {c.category ? `${c.category} • ` : ''}
                  {c.location ? `${c.location} • ` : ''}
                  {c.resident_username ? `Por ${c.resident_username}` : ''}
                </div>
              </Link>
            ))}
            {items.length === 0 && <div className="muted">Sin reclamos.</div>}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Escribir un reclamo</h2>
          {user?.role !== 'resident' ? (
            <div className="muted">Este panel es solo para residentes.</div>
          ) : !user?.approved ? (
            <div>
              <div className="pill bad">No aprobado</div>
              <div style={{ height: 8 }} />
              <div className="muted">
                Puedes hacer reclamos una vez que tu cuenta sea aprobada por el administrador.
              </div>
            </div>
          ) : (
            <NewComplaintForm onCreated={load} />
          )}

          <div style={{ height: 14 }} />
          <h2>Cuenta</h2>
          <div className="row">
            <span className="pill">{user?.role === 'resident' ? 'residente' : user?.role || '-'}</span>
            {user?.role === 'resident' && (
              <span className={`pill ${user?.approved ? 'ok' : 'bad'}`}>
                {user?.approved ? 'aprobado' : 'pendiente'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NewComplaintForm({ onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', category: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await apiFetch('/complaints/', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setForm({ title: '', description: '', location: '', category: '' })
      onCreated?.()
    } catch (err) {
      setError(err.message || 'Failed to create complaint')
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
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          required
        />
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

