import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../useAuth.js'

export default function ManagerAssignPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('')

  const staffUsers = useMemo(
    () => users.filter((u) => u.staff_profile),
    [users]
  )

  async function load() {
    setError('')
    try {
      const [c, u] = await Promise.all([apiFetch('/complaints/'), apiFetch('/users/')])
      setComplaints(c)
      setUsers(u)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    }
  }

  async function assign(e) {
    e.preventDefault()
    if (!selectedComplaint || !selectedStaff) return
    try {
      await apiFetch(`/complaints/${selectedComplaint}/assign/`, {
        method: 'POST',
        body: JSON.stringify({ assigned_to: Number(selectedStaff) }),
      })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to assign')
    }
  }

  useEffect(() => {
    Promise.all([apiFetch('/complaints/'), apiFetch('/users/')])
      .then(([c, u]) => { setComplaints(c); setUsers(u) })
      .catch(err => setError(err.message || 'Failed to load data'))
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
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>Assign complaints</h2>
              <div className="muted" style={{ marginTop: 6 }}>
                Select a complaint and assign it to a maintenance staff user.
              </div>
            </div>
          </div>

          <div style={{ height: 12 }} />
          {error && <div className="error">{error}</div>}

          <form onSubmit={assign}>
            <div className="field">
              <label>Complaint</label>
              <select
                value={selectedComplaint}
                onChange={(e) => setSelectedComplaint(e.target.value)}
              >
                <option value="">Select…</option>
                {complaints.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status}) - {c.resident_username}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Staff user</label>
              <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                <option value="">Select…</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Tip: if no staff appear, use `POST /api/users/:id/make_staff/` (or add a small UI later).
              </div>
            </div>

            <button className="btn primary" disabled={!selectedComplaint || !selectedStaff}>
              Assign
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Quick list</h2>
          <div className="list">
            {complaints.slice(0, 10).map((c) => (
              <Link key={c.id} className="item" to={`/complaints/${c.id}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 650 }}>{c.title}</div>
                  <span className="pill">{c.status}</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Assigned to: {c.assignment?.assigned_to_username || '-'}
                </div>
              </Link>
            ))}
            {complaints.length === 0 && <div className="muted">No complaints.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

