import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const ALL_UNITS = '__ALL__'

export default function AdminFeesPage() {
  const [fees, setFees] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [unitsLoading, setUnitsLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const now = new Date()
  const [form, setForm] = useState({
    unit: '',
    amount: '',
    period_year: now.getFullYear(),
    period_month: now.getMonth() + 1,
    due_date: '',
  })
  const [creating, setCreating] = useState(false)

  const loadFees = () => {
    setLoading(true)
    apiFetch('/payments/monthly-fees/')
      .then(setFees)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadFees()
    apiFetch('/users/')
      .then((users) => {
        const unitSet = new Set()
        users
          .filter((u) => u.resident_profile?.is_approved && u.resident_profile?.unit)
          .forEach((u) => unitSet.add(u.resident_profile.unit))
        setUnits(Array.from(unitSet).sort())
      })
      .catch(() => {})
      .finally(() => setUnitsLoading(false))
  }, [])

  const createFee = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setMsg('')
    const base = {
      amount: parseFloat(form.amount),
      period_year: parseInt(form.period_year),
      period_month: parseInt(form.period_month),
      due_date: form.due_date,
    }
    try {
      if (form.unit === ALL_UNITS) {
        const results = await Promise.allSettled(
          units.map((unit) =>
            apiFetch('/payments/monthly-fees/', { method: 'POST', body: JSON.stringify({ ...base, unit }) })
          )
        )
        const created = results.filter((r) => r.status === 'fulfilled').length
        const skipped = results.length - created
        setMsg(
          skipped > 0
            ? `Cuotas creadas: ${created}. Omitidas (ya existían): ${skipped}.`
            : `Cuotas creadas para ${created} unidades.`
        )
      } else {
        await apiFetch('/payments/monthly-fees/', {
          method: 'POST',
          body: JSON.stringify({ ...base, unit: form.unit }),
        })
        setMsg('Cuota mensual creada.')
      }
      setForm({ unit: '', amount: '', period_year: now.getFullYear(), period_month: now.getMonth() + 1, due_date: '' })
      loadFees()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteFee = async (id) => {
    if (!confirm('¿Eliminar esta cuota?')) return
    try {
      await apiFetch(`/payments/monthly-fees/${id}/`, { method: 'DELETE' })
      setMsg('Cuota eliminada.')
      loadFees()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2 className="admin-page-title">Cuotas Mensuales</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginTop: 0 }}>Crear Cuota Mensual</h3>
        <form onSubmit={createFee}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Unidad</label>
              <select
                required
                disabled={unitsLoading}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                <option value="">
                  {unitsLoading ? 'Cargando unidades…' : '- Seleccionar unidad -'}
                </option>
                {!unitsLoading && (
                  <option value={ALL_UNITS}>Todas las unidades ({units.length})</option>
                )}
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Monto (CLP)</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Año</label>
              <input
                type="number"
                required
                value={form.period_year}
                onChange={(e) => setForm({ ...form, period_year: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Mes</label>
              <select
                value={form.period_month}
                onChange={(e) => setForm({ ...form, period_month: e.target.value })}
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha de Vencimiento</label>
              <input
                type="date"
                required
                min="2020-01-01"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <button className="btn primary" type="submit" disabled={creating}>
            {creating ? 'Creando…' : form.unit === ALL_UNITS ? `Crear para todas las unidades (${units.length})` : 'Crear Cuota'}
          </button>
        </form>
      </div>

      <h3>Todas las Cuotas Mensuales</h3>
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Unidad</th>
                <th>Período</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    Sin cuotas creadas aún.
                  </td>
                </tr>
              )}
              {fees.map((f) => (
                <tr key={f.id}>
                  <td>{f.unit}</td>
                  <td>{MONTHS[f.period_month - 1]} {f.period_year}</td>
                  <td>${Number(f.amount).toLocaleString('es-CL')}</td>
                  <td>{f.due_date}</td>
                  <td>
                    <button
                      className="btn danger"
                      style={{ fontSize: 13, padding: '6px 10px' }}
                      onClick={() => deleteFee(f.id)}
                    >
                      Eliminar
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
