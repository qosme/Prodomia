import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/payments/announcements/')
      .then(setAnnouncements)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container">
      <h2>Anuncios</h2>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : announcements.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
            No hay anuncios disponibles.
          </p>
        </div>
      ) : (
        <div className="list">
          {announcements.map((a) => (
            <div key={a.id} className="card" style={{ marginBottom: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{a.title}</h3>
                <span className="muted" style={{ fontSize: 12 }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{a.body}</p>
              <span className="muted" style={{ fontSize: 12 }}>
                Publicado por {a.created_by_username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
