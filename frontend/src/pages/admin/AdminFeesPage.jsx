import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function AdminFeesPage() {
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => { loadFees() }, [])

  const createFee = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await apiFetch('/payments/monthly-fees/', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          period_year: parseInt(form.period_year),
          period_month: parseInt(form.period_month),
        }),
      })
      setMsg('Monthly fee created.')
      setForm({ unit: '', amount: '', period_year: now.getFullYear(), period_month: now.getMonth() + 1, due_date: '' })
      loadFees()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteFee = async (id) => {
    if (!confirm('Delete this fee?')) return
    try {
      await apiFetch(`/payments/monthly-fees/${id}/`, { method: 'DELETE' })
      setMsg('Fee deleted.')
      loadFees()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2 className="admin-page-title">Monthly Fees</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginTop: 0 }}>Create Monthly Fee</h3>
        <form onSubmit={createFee}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Unit</label>
              <input
                required
                placeholder="e.g. 101"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Amount (CLP)</label>
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
              <label>Year</label>
              <input
                type="number"
                required
                value={form.period_year}
                onChange={(e) => setForm({ ...form, period_year: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Month</label>
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
              <label>Due Date</label>
              <input
                type="date"
                required
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <button className="btn primary" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create Fee'}
          </button>
        </form>
      </div>

      <h3>All Monthly Fees</h3>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    No fees created yet.
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
                      Delete
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
