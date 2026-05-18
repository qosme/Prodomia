import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'
import { useAuth } from '../useAuth.js'

const STATUS_LABELS = {
  PENDING: 'Pendiente de retiro',
  DELIVERED: 'Entregado',
}

function PackageRow({ pkg }) {
  const isPending = pkg.status === 'PENDING'
  return (
    <div className="item">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontWeight: 650 }}>{pkg.description}</div>
        <span className={`pill ${isPending ? '' : 'ok'}`}>{STATUS_LABELS[pkg.status] ?? pkg.status}</span>
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
        {pkg.carrier && <span>Transportista: {pkg.carrier} &nbsp;•&nbsp; </span>}
        Recibido: {new Date(pkg.received_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
        {pkg.delivered_at && (
          <span>
            &nbsp;•&nbsp; Entregado: {new Date(pkg.delivered_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        )}
        {pkg.notes && <div style={{ marginTop: 2 }}>Notas: {pkg.notes}</div>}
      </div>
    </div>
  )
}

export default function ResidentPackagesPage() {
  const { user, loading: authLoading } = useAuth()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const approved = (user?.role === 'resident' && user?.approved) ||
    (user?.role === 'manager' && user?.resident_profile != null)

  useEffect(() => {
    if (authLoading || !approved) return
    apiFetch('/packages/my_packages/')
      .then(setPackages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [authLoading, approved])

  if (!authLoading && !approved) {
    return (
      <div className="container">
        <h2 style={{ margin: '0 0 4px' }}>Mis Pedidos</h2>
        <div className="card" style={{ marginTop: 20 }}>
          <span className="pill bad">No aprobado</span>
          <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
            Podrás ver tus pedidos una vez que tu cuenta sea aprobada por el administrador.
          </p>
        </div>
      </div>
    )
  }

  const pending = packages.filter((p) => p.status === 'PENDING')
  const delivered = packages.filter((p) => p.status === 'DELIVERED')

  return (
    <div className="container">
      <h2 style={{ margin: '0 0 4px' }}>Mis Pedidos</h2>
      <p className="muted" style={{ margin: '0 0 24px' }}>
        Pedidos recibidos por conserjería para usted.
      </p>

      {error && <p className="error">{error}</p>}

      {authLoading || loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 12px' }}>
              Pendientes de retiro
              {pending.length > 0 && (
                <span className="pill bad" style={{ marginLeft: 10, fontSize: 13 }}>
                  {pending.length}
                </span>
              )}
            </h3>
            {pending.length === 0 ? (
              <p className="muted">No tienes pedidos pendientes.</p>
            ) : (
              <div className="list">
                {pending.map((p) => <PackageRow key={p.id} pkg={p} />)}
              </div>
            )}
          </div>

          {delivered.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 12px' }}>Historial de entregados</h3>
              <div className="list">
                {delivered.map((p) => <PackageRow key={p.id} pkg={p} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
