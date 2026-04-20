import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../api.js'

const STATUS_COLORS = {
  NEW: '',
  ASSIGNED: '',
  IN_PROGRESS: '',
  RESOLVED: 'ok',
  CLOSED: 'ok',
  REJECTED: 'bad',
}

const STATUS_LABELS = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En Progreso',
  RESOLVED: 'Resuelto',
  REJECTED: 'Rechazado',
  CLOSED: 'Cerrado',
}

const CATEGORIES = ['', 'Plumbing', 'Electrical', 'Cleaning', 'Security', 'Noise', 'Other']

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    apiFetch('/complaints/')
      .then(setComplaints)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = complaints.filter((c) => {
    if (filterCat && c.category !== filterCat) return false
    if (filterStatus && c.status !== filterStatus) return false
    return true
  })

  return (
    <div>
      <h2 className="admin-page-title">Todos los Reclamos</h2>
      {error && <p className="error">{error}</p>}

      <div className="row" style={{ marginBottom: 16, gap: 12 }}>
        <div>
          <label className="muted" style={{ fontSize: 13 }}>Category</label>
          <select
            style={{ marginLeft: 8, width: 'auto' }}
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'Todos'}</option>)}
          </select>
        </div>
        <div>
          <label className="muted" style={{ fontSize: 13 }}>Status</label>
          <select
            style={{ marginLeft: 8, width: 'auto' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="NEW">Nuevo</option>
            <option value="ASSIGNED">Asignado</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="RESOLVED">Resuelto</option>
            <option value="REJECTED">Rechazado</option>
            <option value="CLOSED">Cerrado</option>
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
                    <Link to={`/complaints/${c.id}`} style={{ color: 'var(--brand)' }}>
                      {c.title}
                    </Link>
                  </td>
                  <td>{c.resident_username}</td>
                  <td>{c.category || '—'}</td>
                  <td>{c.location || '—'}</td>
                  <td>
                    <span className={`pill ${STATUS_COLORS[c.status] || ''}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
                  </td>
                  <td>{c.assignment?.assigned_to_username || '—'}</td>
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
