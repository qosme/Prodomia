import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api.js'
import { useAuth } from '../useAuth.js'

const STATUS_LABELS = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En Progreso',
  RESOLVED: 'Resuelto',
  REJECTED: 'Rechazado',
  CLOSED: 'Cerrado',
}

function StatusPill({ status }) {
  const ok = status === 'RESOLVED' || status === 'CLOSED'
  const bad = status === 'REJECTED'
  return <span className={`pill ${ok ? 'ok' : bad ? 'bad' : ''}`}>{STATUS_LABELS[status] ?? status}</span>
}

export default function ResidentComplaintsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canCreate = (user?.role === 'resident' && user?.approved) ||
    (user?.role === 'manager' && user?.resident_profile != null)

  async function load() {
    setError('')
    setBusy(true)
    try {
      const all = await apiFetch('/complaints/')
      const mine = user?.role === 'manager'
        ? all.filter((c) => c.resident_username === user.username)
        : all
      setItems(mine)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container">
      <div className="grid">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Mis Reclamos</h2>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="list">
            {items.map((c) => (
              <Link key={c.id} className="item" to={`/complaints/${c.id}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 650 }}>{c.title}</div>
                  <StatusPill status={c.status} />
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {c.category ? `${c.category} • ` : ''}
                  {c.location || ''}
                </div>
              </Link>
            ))}
            {items.length === 0 && !busy && <div className="muted">Sin reclamos aún.</div>}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Nuevo Reclamo</h2>
          {canCreate ? (
            <NewComplaintForm onCreated={load} />
          ) : (
            <div>
              <span className="pill bad">No aprobado</span>
              <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                Podrás enviar reclamos una vez que tu cuenta sea aprobada por el administrador.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NewComplaintForm({ onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', category: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState([])
  const fileInputRef = useRef(null)

  function update(k, v) { setForm((p) => ({ ...p, [k]: v })) }

  function addPhoto(file) {
    setPendingPhotos(prev => [...prev, { file, previewUrl: URL.createObjectURL(file) }])
  }

  function removePhoto(index) {
    setPendingPhotos(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadPhoto(complaintId, file) {
    const sigData = await apiFetch('/complaints/cloudinary_signature/')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sigData.api_key)
    fd.append('timestamp', sigData.timestamp)
    fd.append('signature', sigData.signature)
    fd.append('upload_preset', sigData.upload_preset)
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Error al subir imagen a Cloudinary')
    const cloudData = await res.json()
    await apiFetch(`/complaints/${complaintId}/upload_photo/`, {
      method: 'POST',
      body: JSON.stringify({ image_url: cloudData.secure_url }),
    })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const complaint = await apiFetch('/complaints/', { method: 'POST', body: JSON.stringify(form) })
      for (const { file } of pendingPhotos) {
        await uploadPhoto(complaint.id, file)
      }
      setForm({ title: '', description: '', location: '', category: '' })
      setPendingPhotos([])
      onCreated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Título</label>
        <input value={form.title} onChange={(e) => update('title', e.target.value)} required />
      </div>
      <div className="field">
        <label>Descripción</label>
        <textarea value={form.description} onChange={(e) => update('description', e.target.value)} required />
      </div>
      <div className="field">
        <label>Ubicación (opcional)</label>
        <input value={form.location} onChange={(e) => update('location', e.target.value)} />
      </div>
      <div className="field">
        <label>Categoría (opcional)</label>
        <select value={form.category} onChange={(e) => update('category', e.target.value)}>
          <option value="">- Sin categoría -</option>
          <option>Ruidos molestos</option>
          <option>Áreas comunes</option>
          <option>Estacionamiento</option>
          <option>Mantención</option>
          <option>Limpieza</option>
          <option>Seguridad</option>
          <option>Mascotas</option>
          <option>Daños</option>
          <option>Otro</option>
        </select>
      </div>
      <div className="field">
        <label>Fotos (opcional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) addPhoto(f)
            e.target.value = ''
          }}
        />
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <button className="btn primary" type="button" onClick={() => fileInputRef.current?.click()}>
            Elegir archivo
          </button>
        </div>
        {pendingPhotos.length > 0 && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {pendingPhotos.map(({ previewUrl }, i) => (
              <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={previewUrl}
                  alt=""
                  style={{ width: 110, height: 90, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '2px 5px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      <hr style={{ margin: '16px 0', borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn success" disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar Reclamo'}
        </button>
      </div>
    </form>
  )
}
