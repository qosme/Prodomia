import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'
import { downloadPaymentReceipt } from '../../utils/paymentReceipt.js'

const STATUS_COLORS = {
  PAID: 'ok',
  MANUAL: 'ok',
  PENDING: '',
  FAILED: 'bad',
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STATUS_LABELS = {
  PAID: 'Pagado (WebPay)',
  MANUAL: 'Pagado (Manual)',
  PENDING: 'Pendiente',
  FAILED: 'Fallido',
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [markingId, setMarkingId] = useState(null)
  const [notes, setNotes] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      apiFetch('/payments/payments/'),
      apiFetch('/payments/monthly-fees/'),
    ])
      .then(([p, f]) => {
        setPayments(p)
        setFees(f)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([apiFetch('/payments/payments/'), apiFetch('/payments/monthly-fees/')])
      .then(([p, f]) => { setPayments(p); setFees(f) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const markPaid = async (id) => {
    try {
      await apiFetch(`/payments/payments/${id}/mark_paid/`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      })
      setMsg('Pago registrado como pagado manualmente.')
      setMarkingId(null)
      setNotes('')
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const createManual = async (feeId) => {
    try {
      await apiFetch('/payments/payments/create_manual/', {
        method: 'POST',
        body: JSON.stringify({ monthly_fee_id: feeId, notes }),
      })
      setMsg('Pago manual registrado.')
      setMarkingId(null)
      setNotes('')
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  // Cuotas que no tienen un pago registrado como PAID o MANUAL
  const paidFeeIds = new Set(
    payments
      .filter((p) => p.status === 'PAID' || p.status === 'MANUAL')
      .map((p) => p.monthly_fee?.id)
      .filter(Boolean)
  )
  const unpaidFees = fees.filter((f) => !paidFeeIds.has(f.id))

  const filtered = filterStatus ? payments.filter((p) => p.status === filterStatus) : payments

  return (
    <div>
      <h2 className="admin-page-title">Pagos</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      {/* Cuotas sin pago registrado */}
      {!loading && unpaidFees.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12 }}>Cuotas sin pago registrado</h3>
          <div className="admin-table-wrap" style={{ marginBottom: 32 }}>
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
                {unpaidFees.map((f) => (
                  <>
                    <tr key={f.id}>
                      <td>{f.unit}</td>
                      <td>{MONTHS[f.period_month - 1]} {f.period_year}</td>
                      <td>${Number(f.amount).toLocaleString('es-CL')}</td>
                      <td>{f.due_date}</td>
                      <td>
                        <button
                          className="btn primary"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          onClick={() => setMarkingId(markingId === f.id ? null : f.id)}
                        >
                          Registrar pago manual
                        </button>
                      </td>
                    </tr>
                    {markingId === f.id && (
                      <tr key={f.id + '-manual'}>
                        <td colSpan={5}>
                          <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              placeholder="Notas (opcional)"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              style={{ flex: 1, minWidth: 200 }}
                            />
                            <button className="btn primary" onClick={() => createManual(f.id)}>
                              Confirmar
                            </button>
                            <button className="btn" onClick={() => setMarkingId(null)}>
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Historial de pagos */}
      <div className="row" style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Historial de pagos</h3>
        <div className="row" style={{ gap: 8 }}>
          <label className="muted" style={{ fontSize: 13 }}>Estado</label>
          <select
            style={{ width: 'auto' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PAID">Pagado (WebPay)</option>
            <option value="MANUAL">Pagado (Manual)</option>
            <option value="FAILED">Fallido</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Residente</th>
                <th>Unidad</th>
                <th>Período</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    Sin pagos registrados.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <>
                  <tr key={p.id}>
                    <td>{p.resident_username}</td>
                    <td>{p.monthly_fee?.unit || '-'}</td>
                    <td>
                      {p.monthly_fee
                        ? `${MONTHS[p.monthly_fee.period_month - 1]} ${p.monthly_fee.period_year}`
                        : '-'}
                    </td>
                    <td>${Number(p.amount).toLocaleString('es-CL')}</td>
                    <td>
                      <span className={`pill ${STATUS_COLORS[p.status] || ''}`}>{STATUS_LABELS[p.status] ?? p.status}</span>
                    </td>
                    <td>
                      {p.transaction_date
                        ? new Date(p.transaction_date).toLocaleDateString('es-CL')
                        : new Date(p.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td>
                      {p.status === 'PENDING' && (
                        <button
                          className="btn primary"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          onClick={() => setMarkingId(markingId === p.id ? null : p.id)}
                        >
                          Marcar como Pagado
                        </button>
                      )}
                      {(p.status === 'PAID' || p.status === 'MANUAL') && (
                        <button
                          className="btn success"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          onClick={() => downloadPaymentReceipt(p)}
                        >
                          Descargar PDF
                        </button>
                      )}
                    </td>
                  </tr>
                  {markingId === p.id && (
                    <tr key={p.id + '-mark'}>
                      <td colSpan={7}>
                        <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            placeholder="Notas (opcional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ flex: 1, minWidth: 200 }}
                          />
                          <button className="btn primary" onClick={() => markPaid(p.id)}>
                            Confirmar
                          </button>
                          <button className="btn" onClick={() => setMarkingId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
