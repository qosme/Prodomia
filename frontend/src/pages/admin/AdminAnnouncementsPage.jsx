import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', body: '' })
  const [creating, setCreating] = useState(false)

  const loadAnnouncements = () => {
    setLoading(true)
    apiFetch('/payments/announcements/')
      .then(setAnnouncements)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAnnouncements() }, [])

  const create = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await apiFetch('/payments/announcements/', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setMsg('Anuncio publicado.')
      setForm({ title: '', body: '' })
      loadAnnouncements()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('¿Eliminar este anuncio?')) return
    try {
      await apiFetch(`/payments/announcements/${id}/`, { method: 'DELETE' })
      setMsg('Anuncio eliminado.')
      loadAnnouncements()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2 className="admin-page-title">Anuncios</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginTop: 0 }}>Nuevo Anuncio</h3>
        <form onSubmit={create}>
          <div className="field">
            <label>Título</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Mensaje</label>
            <textarea
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <button className="btn primary" type="submit" disabled={creating}>
            {creating ? 'Publicando…' : 'Publicar'}
          </button>
        </form>
      </div>

      <h3>Anuncios Publicados</h3>
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="list">
          {announcements.length === 0 && (
            <p className="muted">Sin anuncios aún.</p>
          )}
          {announcements.map((a) => (
            <div key={a.id} className="item" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{a.title}</strong>
                <span className={`pill ${a.is_active ? 'ok' : 'bad'}`}>
                  {a.is_active ? 'Activo' : 'Eliminado'}
                </span>
              </div>
              <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{a.body}</p>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  Por {a.created_by_username} · {new Date(a.created_at).toLocaleDateString('es-CL')}
                </span>
                {a.is_active && (
                  <button
                    className="btn danger"
                    style={{ fontSize: 13, padding: '5px 10px' }}
                    onClick={() => remove(a.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
