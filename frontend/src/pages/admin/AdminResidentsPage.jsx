import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'

export default function AdminResidentsPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const loadResidents = () => {
    setLoading(true)
    apiFetch('/users/')
      .then((data) => {
        const residents = data.filter((u) => u.resident_profile != null)
        setUsers(residents)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadResidents() }, [])

  const approve = async (id) => {
    try {
      await apiFetch(`/users/${id}/approve_resident/`, { method: 'POST' })
      setMsg('Resident approved.')
      loadResidents()
    } catch (e) {
      setError(e.message)
    }
  }

  const deactivate = async (id) => {
    if (!confirm('Deactivate this user? They will no longer be able to log in.')) return
    try {
      await apiFetch(`/users/${id}/deactivate/`, { method: 'POST' })
      setMsg('User deactivated.')
      loadResidents()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2 className="admin-page-title">Residents</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Unit</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    No residents found.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email || '—'}</td>
                  <td>{u.resident_profile?.unit || '—'}</td>
                  <td>{u.resident_profile?.phone || '—'}</td>
                  <td>
                    <span className={`pill ${u.resident_profile?.is_approved ? 'ok' : 'bad'}`}>
                      {u.resident_profile?.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="row" style={{ gap: 6 }}>
                    {!u.resident_profile?.is_approved && (
                      <button className="btn primary" style={{ fontSize: 13, padding: '6px 10px' }} onClick={() => approve(u.id)}>
                        Approve
                      </button>
                    )}
                    <button className="btn danger" style={{ fontSize: 13, padding: '6px 10px' }} onClick={() => deactivate(u.id)}>
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
