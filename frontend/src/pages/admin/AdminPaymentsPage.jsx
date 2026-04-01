import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'

const STATUS_COLORS = {
  PAID: 'ok',
  MANUAL: 'ok',
  PENDING: '',
  FAILED: 'bad',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [markingId, setMarkingId] = useState(null)
  const [notes, setNotes] = useState('')

  const loadPayments = () => {
    setLoading(true)
    apiFetch('/payments/payments/')
      .then(setPayments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPayments() }, [])

  const markPaid = async (id) => {
    try {
      await apiFetch(`/payments/payments/${id}/mark_paid/`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      })
      setMsg('Payment marked as manually paid.')
      setMarkingId(null)
      setNotes('')
      loadPayments()
    } catch (e) {
      setError(e.message)
    }
  }

  const filtered = filterStatus ? payments.filter((p) => p.status === filterStatus) : payments

  return (
    <div>
      <h2 className="admin-page-title">Payments</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="row" style={{ marginBottom: 16 }}>
        <label className="muted">Filter by status:</label>
        <select
          style={{ width: 'auto' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid (WebPay)</option>
          <option value="MANUAL">Paid (Manual)</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Unit</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    No payments found.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <>
                  <tr key={p.id}>
                    <td>{p.resident_username}</td>
                    <td>{p.monthly_fee?.unit || '—'}</td>
                    <td>
                      {p.monthly_fee
                        ? `${MONTHS[p.monthly_fee.period_month - 1]} ${p.monthly_fee.period_year}`
                        : '—'}
                    </td>
                    <td>${Number(p.amount).toLocaleString('es-CL')}</td>
                    <td>
                      <span className={`pill ${STATUS_COLORS[p.status] || ''}`}>{p.status}</span>
                    </td>
                    <td>
                      {p.transaction_date
                        ? new Date(p.transaction_date).toLocaleDateString()
                        : new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {p.status === 'PENDING' && (
                        <button
                          className="btn primary"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          onClick={() => setMarkingId(markingId === p.id ? null : p.id)}
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                  {markingId === p.id && (
                    <tr key={p.id + '-mark'}>
                      <td colSpan={7}>
                        <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            placeholder="Notes (optional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ flex: 1, minWidth: 200 }}
                          />
                          <button className="btn primary" onClick={() => markPaid(p.id)}>
                            Confirm
                          </button>
                          <button className="btn" onClick={() => setMarkingId(null)}>
                            Cancel
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
