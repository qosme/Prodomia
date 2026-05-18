import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useParams } from 'react-router-dom'
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

const STATUS_COLOR = {
  NEW: 'warn',
  ASSIGNED: 'warn',
  IN_PROGRESS: 'info',
  RESOLVED: 'ok',
  REJECTED: 'bad',
  CLOSED: 'ok',
}

function StatusPill({ status }) {
  return <span className={`pill ${STATUS_COLOR[status] ?? ''}`}>{STATUS_LABELS[status] ?? status}</span>
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
  const fileInputRef = useRef(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  // Vuelve a obtener los datos del reclamo cada vez que cambia el id.
  // load se omite de las dependencias intencionalmente 
  // se recrea en cada render pero solo el id debe ejecutar un refetch.
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

  function toggleSelectPhoto(photoId) {
    setSelectedPhotos(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  function cancelDeleteMode() {
    setDeleteMode(false)
    setSelectedPhotos(new Set())
    setConfirmDelete(false)
  }

  async function deleteSelectedPhotos() {
    try {
      let d
      for (const photoId of selectedPhotos) {
        d = await apiFetch(`/complaints/${id}/photos/${photoId}/`, { method: 'DELETE' })
      }
      if (d) setData(d)
      cancelDeleteMode()
    } catch (err) {
      setError(err.message || 'Failed to delete photos')
    }
  }

  async function uploadPhoto(file) {
    try {
      const sigData = await apiFetch('/complaints/cloudinary_signature/')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('api_key', sigData.api_key)
      fd.append('timestamp', sigData.timestamp)
      fd.append('signature', sigData.signature)
      fd.append('upload_preset', sigData.upload_preset)
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error('Error al subir imagen a Cloudinary')
      const cloudData = await res.json()
      await apiFetch(`/complaints/${id}/upload_photo/`, {
        method: 'POST',
        body: JSON.stringify({ image_url: cloudData.secure_url }),
      })
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
        <div className="card">Cargando…</div>
      </div>
    )
  }

  return (
    <div className="container">

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
                  Por {data.resident_username}
                </div>
              </div>
              <StatusPill status={data.status} />
            </div>

            <div style={{ height: 10 }} />
            <div>{data.description}</div>

            <div style={{ height: 14 }} />
            <h2>Fotos</h2>
            <div className="row" style={{ gap: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadPhoto(f)
                  e.target.value = ''
                }}
              />
              {!deleteMode && !canStaffUpdate && (!canManage || data.resident === user?.id) && (
                <>
                  <button className="btn primary" type="button" onClick={() => fileInputRef.current?.click()}>
                    Elegir archivo
                  </button>
                  {data.photos?.some(p => p.uploaded_by === user?.id) && (
                    <button className="btn danger" type="button" onClick={() => setDeleteMode(true)}>
                      Borrar archivo
                    </button>
                  )}
                </>
              )}
              {deleteMode && (
                <>
                  {!confirmDelete ? (
                    <>
                      <button
                        className="btn danger"
                        type="button"
                        disabled={selectedPhotos.size === 0}
                        onClick={() => setConfirmDelete(true)}
                      >
                        Eliminar {selectedPhotos.size > 0 ? `(${selectedPhotos.size})` : ''}
                      </button>
                      <button className="btn" type="button" onClick={cancelDeleteMode}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>
                        ¿Eliminar {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''}?
                      </span>
                      <button className="btn danger" type="button" onClick={deleteSelectedPhotos}>
                        Confirmar
                      </button>
                      <button className="btn" type="button" onClick={() => setConfirmDelete(false)}>
                        Cancelar
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            {deleteMode && !confirmDelete && (
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Haz clic en las fotos que quieres eliminar y luego presiona <strong>Eliminar</strong>.
              </div>
            )}
            <div style={{ height: 8 }} />
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {data.photos?.map((p) => {
                const canDelete = p.uploaded_by === user?.id
                const isSelected = selectedPhotos.has(p.id)
                return (
                  <div
                    key={p.id}
                    style={{ position: 'relative', display: 'inline-block', cursor: deleteMode && canDelete ? 'pointer' : 'default' }}
                    onClick={() => deleteMode && canDelete && toggleSelectPhoto(p.id)}
                  >
                    <img
                      src={p.image_url}
                      alt=""
                      style={{
                        width: 110, height: 90, objectFit: 'cover', borderRadius: 12, display: 'block',
                        border: isSelected ? '2px solid #e53e3e' : '1px solid var(--border)',
                        opacity: deleteMode && !canDelete ? 0.4 : 1,
                      }}
                    />
                    {deleteMode && canDelete && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 12,
                        background: isSelected ? 'rgba(229,62,62,0.25)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                            ✓
                          </div>
                        )}
                      </div>
                    )}
                    {!deleteMode && (
                      <a href={p.image_url} target="_blank" rel="noreferrer" style={{ position: 'absolute', inset: 0 }} />
                    )}
                  </div>
                )
              })}
              {(!data.photos || data.photos.length === 0) && <div className="muted">Sin fotos.</div>}
            </div>

            <div style={{ height: 14 }} />
            <h2>Comentarios</h2>
            <div className="list">
              {data.comments?.map((c) => (
                <div key={c.id} className="card" style={{ padding: 10, boxShadow: 'none', background: 'rgba(255,255,255,0.03)' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="pill">{c.author_username}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {new Date(c.created_at).toLocaleString('es-CL', { hour12: false })}
                    </span>
                  </div>
                  <div style={{ height: 6 }} />
                  <div>{c.body}</div>
                </div>
              ))}
              {(!data.comments || data.comments.length === 0) && <div className="muted">Sin comentarios.</div>}
            </div>

            <div style={{ height: 10 }} />
            <form onSubmit={addComment}>
              <div className="field">
                <label>Agregar comentario</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <button className="btn primary">Publicar comentario</button>
            </form>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Asignación</h2>
            {data.assignment ? (
              <div className="row">
                <span className="pill ok">{data.assignment.assigned_to_username}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  asignado
                </span>
              </div>
            ) : (
              <div className="muted">Sin asignar.</div>
            )}

            {(canManage || canStaffUpdate) && (
              <>
                <div style={{ height: 14 }} />
                <h2>Estado</h2>
                <form onSubmit={setComplaintStatus}>
                  <div className="field">
                    <label>Cambiar estado</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s] ?? s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn">Actualizar estado</button>
                </form>
              </>
            )}

            {data.status_history?.length > 0 && (
              <>
                <div style={{ height: 14 }} />
                <h2 style={{ margin: '0 0 10px' }}>Historial</h2>
                <div className="list">
                  {[...data.status_history]
                    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
                    .map((h) => (
                      <div key={h.id} className="item" style={{ cursor: 'default' }}>
                        <div className="row" style={{ gap: 6 }}>
                          <StatusPill status={h.from_status} />
                          <ArrowRight size={14} className="muted" />
                          <StatusPill status={h.to_status} />
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          {new Date(h.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                          {h.changed_by_username ? ` · ${h.changed_by_username}` : ''}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}

            <div style={{ height: 14 }} />
            {canManage && (
              <>
                <h2>Acciones del administrador</h2>
                <div className="muted">
                  Usa la pantalla de asignación para asignar este reclamo al personal.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

