import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api.js'
import { useAuth } from '../useAuth.js'

export default function ManagerHomePage() {
  const { user } = useAuth()
  const hasResidentProfile = user?.resident_profile != null

  const [stats, setStats] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [activeStaff, setActiveStaff] = useState(null)
  const [announcementCount, setAnnouncementCount] = useState(null)
  const [payments, setPayments] = useState([])
  const [fee, setFee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const requests = [
      apiFetch('/payments/stats/').catch(() => null),
      apiFetch('/complaints/').catch(() => []),
      apiFetch('/users/staff/').catch(() => []),
      apiFetch('/payments/announcements/').catch(() => []),
    ]
    if (hasResidentProfile) {
      requests.push(apiFetch('/payments/payments/my_payments/').catch(() => []))
      requests.push(apiFetch('/payments/monthly-fees/my_fee/').catch(() => null))
    }
    Promise.all(requests)
      .then(([s, c, staff, announcements, p, f]) => {
        setStats(s)
        setComplaints(c || [])
        setActiveStaff((staff || []).filter((u) => u.staff_profile?.is_active_staff).length)
        setAnnouncementCount((announcements || []).length)
        if (hasResidentProfile) {
          setPayments(p || [])
          setFee(f || null)
        }
      })
      .finally(() => setLoading(false))
  }, [hasResidentProfile])

  const openComplaints = useMemo(
    () => complaints.filter((c) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)),
    [complaints]
  )

  const myActiveComplaints = useMemo(
    () => complaints.filter(
      (c) => c.resident_username === user?.username && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)
    ),
    [complaints, user]
  )

  const currentFeePaid = fee && payments.some(
    (p) => p.monthly_fee?.id === fee.id && (p.status === 'PAID' || p.status === 'MANUAL')
  )

  const adminCards = [
    {
      to: '/admin-dashboard',
      title: 'Resumen',
      subtitle: loading ? '…' : stats ? `${stats.total_units} unidades activas` : '-',
    },
    {
      to: '/admin-dashboard/residents',
      title: 'Residentes',
      subtitle: loading ? '…' : stats ? `${stats.pending_approvals} pendiente${stats.pending_approvals !== 1 ? 's' : ''}` : '-',
      borderColor: stats?.pending_approvals > 0 ? 'rgba(234, 179, 8, 0.45)' : undefined,
      alert: !loading && stats?.pending_approvals > 0,
    },
    {
      to: '/admin-dashboard/complaints',
      title: 'Reclamos',
      subtitle: loading ? '…' : `${openComplaints.length} abierto${openComplaints.length !== 1 ? 's' : ''}`,
      borderColor: complaints.some((c) => c.status === 'NEW') ? 'rgba(239, 68, 68, 0.35)' : openComplaints.length > 0 ? 'rgba(37, 99, 235, 0.4)' : undefined,
      alert: !loading && complaints.some((c) => c.status === 'NEW'),
    },
    {
      to: '/admin-dashboard/staff',
      title: 'Personal',
      subtitle: loading ? '…' : `${activeStaff ?? '-'} activo${activeStaff !== 1 ? 's' : ''}`,
    },
    {
      to: '/admin-dashboard/fees',
      title: 'Cuotas',
      subtitle: loading ? '…' : stats
        ? `${stats.total_fees_this_month - stats.paid_this_month} pendiente${(stats.total_fees_this_month - stats.paid_this_month) !== 1 ? 's' : ''} este mes`
        : '-',
      borderColor: stats && (stats.total_fees_this_month - stats.paid_this_month) > 0
        ? 'rgba(239, 68, 68, 0.35)'
        : undefined,
    },
    {
      to: '/admin-dashboard/payments',
      title: 'Pagos',
      subtitle: loading ? '…' : stats ? `${stats.paid_this_month} pagado${stats.paid_this_month !== 1 ? 's' : ''} este mes` : '-',
    },
    {
      to: '/admin-dashboard/announcements',
      title: 'Anuncios',
      subtitle: loading ? '…' : `${announcementCount ?? '-'} publicado${announcementCount !== 1 ? 's' : ''}`,
    },
  ]

  return (
    <div className="container">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 4px' }}>Bienvenido, {user?.username}</h2>
        <p className="muted" style={{ margin: 0 }}>Panel de administrador</p>
      </div>

      <h3 style={{ margin: '0 0 12px' }}>Administración</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: hasResidentProfile ? 32 : 0 }}>
        {adminCards.map((card) => (
          <Link key={card.to} to={card.to} style={{ textDecoration: 'none' }}>
            <div
              className="card"
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '24px 14px',
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
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{card.title}</div>
              <div className="muted" style={{ fontSize: 13 }}>{card.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>

      {hasResidentProfile && (
        <>
          <h3 style={{ margin: '0 0 12px' }}>Mi cuenta de residente</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <Link to="/complaints" style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '28px 14px',
                  borderColor: myActiveComplaints.length > 0 ? 'rgba(37, 99, 235, 0.4)' : undefined,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Mis Reclamos</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {loading ? '…' : `${myActiveComplaints.length} activo${myActiveComplaints.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </Link>
            <Link to="/payments" style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '28px 14px',
                  borderColor: fee && !currentFeePaid ? 'rgba(239, 68, 68, 0.4)' : undefined,
                  position: 'relative',
                }}
              >
                {!loading && fee && !currentFeePaid && (
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
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Mis Pagos</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {loading ? '…' : fee ? (currentFeePaid ? 'Al día' : 'Cuota pendiente') : 'Sin cuota este mes'}
                </div>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
