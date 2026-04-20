import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth.jsx'

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED']

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

export default function ManagerDashboardPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [users, setUsers] = useState([])
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const staffUsers = useMemo(() => users.filter((u) => u.staff_profile), [users])
  const categories = useMemo(() => {
    const set = new Set()
    complaints.forEach((c) => c.category && set.add(c.category))
    return Array.from(set).sort()
  }, [complaints])

  const filtered = useMemo(() => {
    if (!category) return complaints
    return complaints.filter((c) => c.category === category)
  }, [complaints, category])

  async function load() {
    setError('')
    setBusy(true)
    try {
      const [c, u] = await Promise.all([apiFetch('/complaints/'), apiFetch('/users/')])
      setComplaints(c)
      setUsers(u)
    } catch (err) {
      setError(err.message || 'Failed to load manager dashboard')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(id, status) {
    try {
      await apiFetch(`/complaints/${id}/set_status/`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to update status')
    }
  }

  async function assign(id, staffId) {
    try {
      await apiFetch(`/complaints/${id}/assign/`, {
        method: 'POST',
        body: JSON.stringify({ assigned_to: Number(staffId) }),
      })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to assign staff')
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (user?.role !== 'manager') {
    return (
      <div className="container">
        <div className="card">Solo gestores.</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Panel del gestor</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              Ver todos los reclamos, filtrar por categoría, actualizar estado y asignar personal.
            </div>
          </div>
          <button className="btn" onClick={load} disabled={busy}>
            Refrescar
          </button>
        </div>

        <div style={{ height: 12 }} />
        {error && <div className="error">{error}</div>}

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <span className="pill">Total: {complaints.length}</span>
            <span className="pill">Filtrados: {filtered.length}</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button className="btn" onClick={() => setCategory('')} disabled={!category}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={{ height: 12 }} />
        <div className="list">
          {filtered.map((c) => (
            <div key={c.id} className="item" style={{ cursor: 'default' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <Link to={`/complaints/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontWeight: 700 }}>{c.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {c.category ? `${c.category} • ` : ''}
                    {c.location ? `${c.location} • ` : ''}
                    Por {c.resident_username}
                  </div>
                </Link>
                <StatusPill status={c.status} />
              </div>

              <div style={{ height: 10 }} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="row" style={{ gap: 8 }}>
                  <select
                    value={c.assignment?.assigned_to || ''}
                    onChange={(e) => assign(c.id, e.target.value)}
                  >
                    <option value="">Asignar personal…</option>
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Actual: {c.assignment?.assigned_to_username || '—'}
                  </span>
                </div>

                <div className="row" style={{ gap: 8 }}>
                  <select
                    value={c.status}
                    onChange={(e) => setStatus(c.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s] ?? s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="muted">Sin reclamos que coincidan con los filtros.</div>}
        </div>
      </div>
    </div>
  )
}

