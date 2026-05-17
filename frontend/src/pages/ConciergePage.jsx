import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'
import { useAuth } from '../useAuth.js'

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  DELIVERED: 'Entregado',
}

export default function ConciergePage() {
  const { user } = useAuth()
  const [packages, setPackages] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ resident: '', description: '', carrier: '', notes: '' })
  const [creating, setCreating] = useState(false)
  const [delivering, setDelivering] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const loadPackages = () =>
    apiFetch('/packages/')
      .then(setPackages)
      .catch((e) => setError(e.message))

  const loadResidents = () =>
    apiFetch('/users/approved_residents/')
      .then(setResidents)
      .catch(() => {})

  useEffect(() => {
    Promise.all([loadPackages(), loadResidents()]).finally(() => setLoading(false))
  }, [])

  const createPackage = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setMsg('')
    try {
      await apiFetch('/packages/', {
        method: 'POST',
        body: JSON.stringify({ ...form, resident: Number(form.resident) }),
      })
      setMsg('Pedido registrado. Se notificó al residente por correo.')
      setForm({ resident: '', description: '', carrier: '', notes: '' })
      loadPackages()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const markDelivered = async (id) => {
    setDelivering(id)
    setError('')
    try {
      await apiFetch(`/packages/${id}/mark_delivered/`, { method: 'POST' })
      setMsg('Pedido marcado como entregado.')
      loadPackages()
    } catch (err) {
      setError(err.message)
    } finally {
      setDelivering(null)
    }
  }

  const pending = packages.filter((p) => p.status === 'PENDING')
  const delivered = packages.filter((p) => p.status === 'DELIVERED')

  return (
    <div className="container">
      <h2 style={{ margin: '0 0 4px' }}>Conserjería</h2>
      <p className="muted" style={{ margin: '0 0 24px' }}>
        Bienvenido, {user?.username}.<br />Registra y gestiona los pedidos de los residentes.
      </p>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="grid" style={{ marginBottom: 28 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Registrar Pedido Recibido</h3>
          <form onSubmit={createPackage}>
            <div className="field">
              <label>Residente destinatario</label>
              <select
                required
                value={form.resident}
                onChange={(e) => setForm({ ...form, resident: e.target.value })}
              >
                <option value="">- Seleccionar residente -</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.username}
                    {r.resident_profile?.unit ? ` (Unidad ${r.resident_profile.unit})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Descripción del paquete</label>
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Caja grande de Amazon"
              />
            </div>
            <div className="field">
              <label>Transportista (opcional)</label>
              <input
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                placeholder="Ej: Correos Chile, Starken, Chilexpress…"
              />
            </div>
            <div className="field">
              <label>Notas adicionales (opcional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Ej: Requiere firma, frágil…"
              />
            </div>
            <button className="btn primary" type="submit" disabled={creating || loading}>
              {creating ? 'Registrando…' : 'Registrar Pedido'}
            </button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px' }}>
          Pendientes de retiro
          {pending.length > 0 && (
            <span className="pill bad" style={{ marginLeft: 10, fontSize: 13 }}>{pending.length}</span>
          )}
        </h3>
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : pending.length === 0 ? (
          <p className="muted">No hay pedidos pendientes.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Residente</th>
                  <th>Unidad</th>
                  <th>Descripción</th>
                  <th>Transportista</th>
                  <th>Recibido</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td>{p.resident_username}</td>
                    <td>{p.resident_unit || '-'}</td>
                    <td>{p.description}</td>
                    <td>{p.carrier || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(p.received_at).toLocaleString('es-CL', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}
                    </td>
                    <td>
                      <button
                        className="btn primary"
                        style={{ fontSize: 13, padding: '6px 10px' }}
                        disabled={delivering === p.id}
                        onClick={() => markDelivered(p.id)}
                      >
                        {delivering === p.id ? 'Procesando…' : 'Marcar entregado'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {delivered.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 12px' }}>Historial de entregados</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Residente</th>
                  <th>Unidad</th>
                  <th>Descripción</th>
                  <th>Recibido</th>
                  <th>Entregado</th>
                </tr>
              </thead>
              <tbody>
                {delivered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.resident_username}</td>
                    <td>{p.resident_unit || '-'}</td>
                    <td>{p.description}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(p.received_at).toLocaleString('es-CL', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {p.delivered_at
                        ? new Date(p.delivered_at).toLocaleString('es-CL', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: false,
                          })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
