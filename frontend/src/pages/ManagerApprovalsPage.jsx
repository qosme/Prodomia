import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../auth.jsx'

export default function ManagerApprovalsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setError('')
    setBusy(true)
    try {
      const data = await apiFetch('/users/pending_residents/')
      setItems(data)
    } catch (err) {
      setError(err.message || 'Failed to load pending residents')
    } finally {
      setBusy(false)
    }
  }

  async function approve(id) {
    try {
      await apiFetch(`/users/${id}/approve_resident/`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to approve resident')
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
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Resident approvals</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              Approve residents so they can submit complaints.
            </div>
          </div>
        </div>
        <div style={{ height: 12 }} />
        {error && <div className="error">{error}</div>}
        <div className="list">
          {items.map((u) => (
            <div key={u.id} className="item" style={{ cursor: 'default' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 650 }}>{u.username}</div>
                <div className="row">
                  <span className="pill bad">pending</span>
                  <button className="btn primary" onClick={() => approve(u.id)}>
                    Approve
                  </button>
                </div>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Unit: {u.resident_profile?.unit || '—'} • Phone: {u.resident_profile?.phone || '—'}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="muted">No pending residents.</div>}
        </div>
      </div>
    </div>
  )
}

