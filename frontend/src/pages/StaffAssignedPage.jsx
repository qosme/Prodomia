import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth.jsx'

export default function StaffAssignedPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setError('')
    setBusy(true)
    try {
      const data = await apiFetch('/complaints/')
      setItems(data)
    } catch (err) {
      setError(err.message || 'Failed to load assigned complaints')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (user?.role !== 'staff') {
    return (
      <div className="container">
        <div className="card">Staff only.</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Assigned to me</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              Update status inside each complaint.
            </div>
          </div>
          <button className="btn" onClick={load} disabled={busy}>
            Refresh
          </button>
        </div>
        <div style={{ height: 12 }} />
        {error && <div className="error">{error}</div>}
        <div className="list">
          {items.map((c) => (
            <Link key={c.id} className="item" to={`/complaints/${c.id}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 650 }}>{c.title}</div>
                <span className="pill">{c.status}</span>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Resident: {c.resident_username} • Location: {c.location || '—'}
              </div>
            </Link>
          ))}
          {items.length === 0 && <div className="muted">No assigned complaints.</div>}
        </div>
      </div>
    </div>
  )
}

