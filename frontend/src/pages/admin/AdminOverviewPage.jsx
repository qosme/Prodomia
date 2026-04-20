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
  const monthName = now.toLocaleString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div>
      <h2 className="admin-page-title">Resumen</h2>
      <p className="muted" style={{ marginBottom: 24 }}>
        {monthName}
      </p>

      {error && <p className="error">{error}</p>}

      {stats ? (
        <div className="stat-grid">
          <StatCard
            label="Unidades Activas"
            value={stats.total_units}
            sub="residentes aprobados"
          />
          <StatCard
            label="Aprobaciones Pendientes"
            value={stats.pending_approvals}
            accent={stats.pending_approvals > 0 ? 'warn' : null}
          />
          <StatCard
            label="Reclamos Abiertos"
            value={stats.open_complaints}
            accent={stats.open_complaints > 0 ? 'warn' : null}
          />
          <StatCard
            label="Cuotas Emitidas"
            value={stats.total_fees_this_month}
            sub="este mes"
          />
          <StatCard
            label="Pagos Recibidos"
            value={stats.paid_this_month}
            sub="este mes"
            accent="ok"
          />
          <StatCard
            label="Ingresos"
            value={`$${stats.revenue_this_month.toLocaleString('es-CL')}`}
            sub="este mes (CLP)"
            accent="ok"
          />
        </div>
      ) : (
        !error && <p className="muted">Cargando estadísticas…</p>
      )}
    </div>
  )
}
