import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth.jsx'

function StatusPill({ status }) {
  const ok = status === 'RESOLVED' || status === 'CLOSED'
  const bad = status === 'REJECTED'
  return <span className={`pill ${ok ? 'ok' : bad ? 'bad' : ''}`}>{status}</span>
}

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED']

export default function ComplaintDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('IN_PROGRESS')

  const canManage = useMemo(() => user?.role === 'manager', [user])
  const canStaffUpdate = useMemo(() => user?.role === 'staff', [user])

  async function load() {
    setError('')
    setBusy(true)
    try {
      const d = await apiFetch(`/complaints/${id}/`)
      setData(d)
      if (d?.status) setStatus(d.status)
    } catch (err) {
      setError(err.message || 'Failed to load complaint')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    try {
      await apiFetch(`/complaints/${id}/add_comment/`, {
        method: 'POST',
        body: JSON.stringify({ body: comment }),
      })
      setComment('')
      await load()
    } catch (err) {
      setError(err.message || 'Failed to add comment')
    }
  }

  async function uploadPhoto(file) {
    const fd = new FormData()
    fd.append('image', file)
    try {
      await apiFetch(`/complaints/${id}/upload_photo/`, { method: 'POST', body: fd })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to upload photo')
    }
  }

  async function setComplaintStatus(e) {
    e.preventDefault()
    try {
      await apiFetch(`/complaints/${id}/set_status/`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to set status')
    }
  }

  if (!data && busy) {
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link className="muted" to="/">
          ← Back
        </Link>
        <button className="btn" onClick={load} disabled={busy}>
          Refresh
        </button>
      </div>

      <div style={{ height: 12 }} />

      {error && <div className="error">{error}</div>}

      {data && (
        <div className="grid">
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0 }}>{data.title}</h2>
                <div className="muted" style={{ marginTop: 6 }}>
                  {data.category ? `${data.category} • ` : ''}
                  {data.location ? `${data.location} • ` : ''}
                  By {data.resident_username}
                </div>
              </div>
              <StatusPill status={data.status} />
            </div>

            <div style={{ height: 10 }} />
            <div>{data.description}</div>

            <div style={{ height: 14 }} />
            <h2>Photos</h2>
            <div className="row">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadPhoto(f)
                  e.target.value = ''
                }}
              />
            </div>
            <div style={{ height: 8 }} />
            <div className="row" style={{ gap: 8 }}>
              {data.photos?.map((p) => (
                <a key={p.id} href={p.image_url} target="_blank" rel="noreferrer">
                  <img
                    src={p.image_url}
                    alt=""
                    style={{ width: 110, height: 90, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }}
                  />
                </a>
              ))}
              {(!data.photos || data.photos.length === 0) && <div className="muted">No photos.</div>}
            </div>

            <div style={{ height: 14 }} />
            <h2>Comments</h2>
            <div className="list">
              {data.comments?.map((c) => (
                <div key={c.id} className="card" style={{ padding: 10, boxShadow: 'none', background: 'rgba(255,255,255,0.03)' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="pill">{c.author_username}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: 6 }} />
                  <div>{c.body}</div>
                </div>
              ))}
              {(!data.comments || data.comments.length === 0) && <div className="muted">No comments.</div>}
            </div>

            <div style={{ height: 10 }} />
            <form onSubmit={addComment}>
              <div className="field">
                <label>Add comment</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <button className="btn primary">Post comment</button>
            </form>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Assignment</h2>
            {data.assignment ? (
              <div className="row">
                <span className="pill ok">{data.assignment.assigned_to_username}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  assigned
                </span>
              </div>
            ) : (
              <div className="muted">Not assigned yet.</div>
            )}

            <div style={{ height: 14 }} />
            <h2>Status</h2>
            {(canManage || canStaffUpdate) ? (
              <form onSubmit={setComplaintStatus}>
                <div className="field">
                  <label>Set status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn">Update status</button>
              </form>
            ) : (
              <div className="muted">Only manager or assigned staff can update status.</div>
            )}

            <div style={{ height: 14 }} />
            {canManage && (
              <>
                <h2>Manager actions</h2>
                <div className="muted">
                  Use the Assign screen to assign this complaint to staff.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

