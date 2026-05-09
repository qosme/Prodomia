import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../useAuth.js'

const STATUS_LABELS = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En Progreso',
  RESOLVED: 'Resuelto',
  REJECTED: 'Rechazado',
  CLOSED: 'Cerrado',
}

export default function StaffAssignedPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    apiFetch('/complaints/')
      .then(data => setItems(data))
      .catch(err => setError(err.message || 'Error al cargar los reclamos asignados'))
  }, [])

  if (user?.role !== 'staff') {
    return (
      <div className="container">
        <div className="card">Solo para personal.</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Asignados a mí</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              Actualiza el estado desde cada reclamo.
            </div>
          </div>
        </div>
        <div style={{ height: 12 }} />
        {error && <div className="error">{error}</div>}
        <div className="list">
          {items.map((c) => (
            <Link key={c.id} className="item" to={`/complaints/${c.id}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 650 }}>{c.title}</div>
                <span className="pill">{STATUS_LABELS[c.status] ?? c.status}</span>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Residente: {c.resident_username} • Ubicación: {c.location || '—'}
              </div>
            </Link>
          ))}
          {items.length === 0 && <div className="muted">Sin reclamos asignados.</div>}
        </div>
      </div>
    </div>
  )
}

