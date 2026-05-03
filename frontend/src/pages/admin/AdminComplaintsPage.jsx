import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../api.js'

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED']

const STATUS_LABELS = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En Progreso',
  RESOLVED: 'Resuelto',
  REJECTED: 'Rechazado',
  CLOSED: 'Cerrado',
}

const inlineSelect = {
  width: 'auto',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  padding: '4px 0',
  borderRadius: 0,
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([])
  const [staffUsers, setStaffUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const categories = useMemo(() => {
    const set = new Set()
    complaints.forEach((c) => c.category && set.add(c.category))
    return Array.from(set).sort()
  }, [complaints])

  const filtered = useMemo(
    () =>
      complaints.filter((c) => {
        if (filterCat && c.category !== filterCat) return false
        if (filterStatus && c.status !== filterStatus) return false
        return true
      }),
    [complaints, filterCat, filterStatus]
  )

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [c, users] = await Promise.all([apiFetch('/complaints/'), apiFetch('/users/')])
      setComplaints(c)
      setStaffUsers(users.filter((u) => u.staff_profile))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function setStatus(id, status) {
    try {
      await apiFetch(`/complaints/${id}/set_status/`, { method: 'POST', body: JSON.stringify({ status }) })
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    } catch (e) {
      setError(e.message)
    }
  }

  async function assign(id, staffId) {
    if (!staffId) return
    try {
      await apiFetch(`/complaints/${id}/assign/`, { method: 'POST', body: JSON.stringify({ assigned_to: Number(staffId) }) })
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <h2 className="admin-page-title">Reclamos</h2>
      {error && <p className="error">{error}</p>}

      <div className="row" style={{ marginBottom: 16, gap: 12 }}>
        <div>
          <label className="muted" style={{ fontSize: 13 }}>Categoría</label>
          <select style={{ marginLeft: 8, width: 'auto' }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="muted" style={{ fontSize: 13 }}>Estado</label>
          <select style={{ marginLeft: 8, width: 'auto' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Residente</th>
                <th>Categoría</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Asignado a</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    Sin reclamos.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/complaints/${c.id}`} style={{ color: 'var(--brand)' }}>{c.title}</Link>
                  </td>
                  <td>{c.resident_username}</td>
                  <td>{c.category || '—'}</td>
                  <td>{c.location || '—'}</td>
                  <td>
                    <select style={inlineSelect} value={c.status} onChange={(e) => setStatus(c.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      style={inlineSelect}
                      value={c.assignment?.assigned_to || ''}
                      onChange={(e) => assign(c.id, e.target.value)}
                    >
                      <option value="">— Sin asignar —</option>
                      {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
