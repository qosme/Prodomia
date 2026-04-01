import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat-card ${accent ? 'accent-' + accent : ''}`}>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/payments/stats/')
      .then(setStats)
      .catch((e) => setError(e.message))
  }, [])

  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div>
      <h2 className="admin-page-title">Overview</h2>
      <p className="muted" style={{ marginBottom: 24 }}>
        {monthName} snapshot
      </p>

      {error && <p className="error">{error}</p>}

      {stats ? (
        <div className="stat-grid">
          <StatCard
            label="Active Units"
            value={stats.total_units}
            sub="approved residents"
          />
          <StatCard
            label="Pending Approvals"
            value={stats.pending_approvals}
            accent={stats.pending_approvals > 0 ? 'warn' : null}
          />
          <StatCard
            label="Open Complaints"
            value={stats.open_complaints}
            accent={stats.open_complaints > 0 ? 'warn' : null}
          />
          <StatCard
            label="Fees Issued"
            value={stats.total_fees_this_month}
            sub="this month"
          />
          <StatCard
            label="Payments Received"
            value={stats.paid_this_month}
            sub="this month"
            accent="ok"
          />
          <StatCard
            label="Revenue"
            value={`$${stats.revenue_this_month.toLocaleString('es-CL')}`}
            sub="this month (CLP)"
            accent="ok"
          />
        </div>
      ) : (
        !error && <p className="muted">Loading stats…</p>
      )}
    </div>
  )
}
