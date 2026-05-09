import { useEffect, useMemo, useState } from 'react'
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

const TYPE_LABEL = {
  complaint_status: 'Reclamo',
  complaint_comment: 'Comentario',
  payment: 'Pago',
  announcement: 'Anuncio',
}

const TYPE_STYLE = {
  complaint_status: { background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', borderColor: 'rgba(37, 99, 235, 0.35)' },
  complaint_comment: { background: 'rgba(124, 58, 237, 0.12)', color: '#6d28d9', borderColor: 'rgba(124, 58, 237, 0.35)' },
  payment:           { background: 'rgba(34, 197, 94, 0.12)',  color: '#15803d', borderColor: 'rgba(34, 197, 94, 0.35)'  },
  announcement:      { background: 'rgba(234, 179, 8, 0.15)',  color: '#b45309', borderColor: 'rgba(234, 179, 8, 0.45)'  },
}

export default function ResidentHomePage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [payments, setPayments] = useState([])
  const [fee, setFee] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/complaints/'),
      apiFetch('/payments/payments/my_payments/'),
      apiFetch('/payments/monthly-fees/my_fee/').catch(() => null),
      apiFetch('/payments/announcements/'),
    ])
      .then(([c, p, f, a]) => {
        setComplaints(c)
        setPayments(p)
        setFee(f)
        setAnnouncements(a)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const activeComplaints = useMemo(
    () => complaints.filter((c) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)),
    [complaints]
  )

  const currentFeePaid = fee && payments.some(
    (p) => p.monthly_fee?.id === fee.id && (p.status === 'PAID' || p.status === 'MANUAL')
  )

  const notifications = useMemo(() => {
    const items = []

    for (const c of complaints) {
      for (const h of (c.status_history || [])) {
        items.push({
          at: h.created_at,
          text: `"${c.title}" cambió a ${STATUS_LABELS[h.to_status] ?? h.to_status}`,
          type: 'complaint_status',
          link: `/complaints/${c.id}`,
        })
      }
      for (const cm of (c.comments || [])) {
        items.push({
          at: cm.created_at,
          text: `Nuevo comentario en "${c.title}" por ${cm.author_username}`,
          type: 'complaint_comment',
          link: `/complaints/${c.id}`,
        })
      }
    }

    for (const p of payments) {
      items.push({
        at: p.transaction_date || p.created_at,
        text: `Pago de $${Number(p.amount).toLocaleString('es-CL')} CLP registrado`,
        type: 'payment',
        link: '/payments',
      })
    }

    for (const a of announcements.slice(0, 5)) {
      items.push({
        at: a.created_at,
        text: a.title,
        type: 'announcement',
        link: '/announcements',
      })
    }

    return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12)
  }, [complaints, payments, announcements])

  const navCards = [
    {
      to: '/complaints',
      title: 'Reclamos',
      subtitle: loading ? '…' : `${activeComplaints.length} activo${activeComplaints.length !== 1 ? 's' : ''}`,
      borderColor: activeComplaints.length > 0 ? 'rgba(37, 99, 235, 0.4)' : undefined,
    },
    {
      to: '/payments',
      title: 'Pagos',
      subtitle: loading ? '…' : fee ? (currentFeePaid ? 'Al día' : 'Cuota pendiente') : 'Sin cuota este mes',
      borderColor: fee && !currentFeePaid ? 'rgba(239, 68, 68, 0.4)' : undefined,
      alert: !loading && fee && !currentFeePaid,
    },
    {
      to: '/announcements',
      title: 'Anuncios',
      subtitle: loading ? '…' : `${announcements.length} publicado${announcements.length !== 1 ? 's' : ''}`,
      borderColor: undefined,
    },
  ]

  return (
    <div className="container">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 4px' }}>Bienvenido, {user?.username}</h2>
        <p className="muted" style={{ margin: 0 }}>Panel de residente</p>
      </div>

      {!user?.approved && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.4)' }}>
          <span className="pill bad">Cuenta pendiente de aprobación</span>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 14 }}>
            Podrás enviar reclamos una vez que el administrador apruebe tu cuenta.
          </p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {navCards.map((card) => (
          <Link key={card.to} to={card.to} style={{ textDecoration: 'none' }}>
            <div
              className="card"
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '32px 14px',
                borderColor: card.borderColor,
                position: 'relative',
              }}
            >
              {card.alert && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 12,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}>!</div>
              )}
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{card.title}</div>
              <div className="muted" style={{ fontSize: 13 }}>{card.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>Actividad reciente</h3>
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : notifications.length === 0 ? (
          <p className="muted">Sin actividad reciente.</p>
        ) : (
          <div className="list">
            {notifications.map((n, i) => (
              <Link key={i} className="item" to={n.link}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="pill" style={TYPE_STYLE[n.type]}>{TYPE_LABEL[n.type]}</span>
                    <span style={{ fontWeight: 500 }}>{n.text}</span>
                  </div>
                  <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', marginLeft: 12 }}>
                    {new Date(n.at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
