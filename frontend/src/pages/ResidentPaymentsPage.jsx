import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api.js'
import { downloadPaymentReceipt } from '../utils/paymentReceipt.js'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STATUS_LABELS = {
  PAID: 'Pagado',
  MANUAL: 'Pagado (Manual)',
  PENDING: 'Pendiente',
  FAILED: 'Fallido',
}

const STATUS_COLORS = {
  PAID: 'ok',
  MANUAL: 'ok',
  PENDING: '',
  FAILED: 'bad',
}

export default function ResidentPaymentsPage() {
  const [searchParams] = useSearchParams()
  const result = searchParams.get('result')

  const [fee, setFee] = useState(undefined)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/payments/monthly-fees/my_fee/'),
      apiFetch('/payments/payments/my_payments/'),
    ])
      .then(([feeData, paymentsData]) => {
        setFee(feeData)
        setPayments(paymentsData)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const currentFeePaid = fee && payments.some(
    (p) =>
      p.monthly_fee?.id === fee.id &&
      (p.status === 'PAID' || p.status === 'MANUAL'),
  )

  const handlePay = async () => {
    if (!fee) return
    setPaying(true)
    setError('')
    try {
      const data = await apiFetch('/payments/webpay/init/', {
        method: 'POST',
        body: JSON.stringify({ monthly_fee_id: fee.id }),
      })
      // WebPay Plus requiere un POST con token_ws, ya que solo un GET da una página en blanco
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = data.redirect_url
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'token_ws'
      input.value = data.token
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
    } catch (e) {
      setError(e.message)
      setPaying(false)
    }
  }

  return (
    <div className="container">
      <h2>Mis Pagos</h2>

      {result === 'success' && (
        <div className="card" style={{ borderColor: 'rgba(34,197,94,0.4)', marginBottom: 20 }}>
          <p className="success" style={{ margin: 0 }}>
            ¡Pago exitoso! Tu cuota ha sido registrada.
          </p>
        </div>
      )}
      {result === 'cancelled' && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.4)', marginBottom: 20 }}>
          <p className="error" style={{ margin: 0 }}>Pago cancelado.</p>
        </div>
      )}
      {result === 'failed' && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.4)', marginBottom: 20 }}>
          <p className="error" style={{ margin: 0 }}>Pago fallido. Por favor intenta de nuevo.</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="grid">
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Cuota del Mes Actual</h3>
              {fee ? (
                <>
                  <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
                    ${Number(fee.amount).toLocaleString('es-CL')}
                    <span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 8 }}>CLP</span>
                  </div>
                  <p className="muted" style={{ margin: '0 0 4px' }}>
                    {MONTHS[fee.period_month - 1]} {fee.period_year} · Unidad {fee.unit}
                  </p>
                  <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>
                    Vencimiento: {fee.due_date}
                  </p>
                  {currentFeePaid ? (
                    <span className="pill ok">Pagado</span>
                  ) : (
                    <button
                      className="btn primary"
                      onClick={handlePay}
                      disabled={paying}
                      style={{ fontSize: 15, padding: '12px 20px' }}
                    >
                      {paying ? 'Redirigiendo a WebPay…' : 'Pagar con WebPay Plus'}
                    </button>
                  )}
                </>
              ) : (
                <p className="muted">No hay cuota disponible para este mes.</p>
              )}
            </div>
          </div>

          <div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Historial de Pagos</h3>
              {payments.length === 0 ? (
                <p className="muted">No hay registros de pagos.</p>
              ) : (
                <div className="list">
                  {payments.map((p) => (
                    <div key={p.id} className="item">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <strong>
                          {p.monthly_fee
                            ? `${MONTHS[p.monthly_fee.period_month - 1]} ${p.monthly_fee.period_year}`
                            : '-'}
                        </strong>
                        <span className={`pill ${STATUS_COLORS[p.status] || ''}`}>{STATUS_LABELS[p.status] ?? p.status}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        ${Number(p.amount).toLocaleString('es-CL')} ·{' '}
                        {p.transaction_date
                          ? new Date(p.transaction_date).toLocaleDateString('es-CL')
                          : new Date(p.created_at).toLocaleDateString('es-CL')}
                      </div>
                      {p.authorization_code && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          Auth: {p.authorization_code}
                        </div>
                      )}
                      {(p.status === 'PAID' || p.status === 'MANUAL') && (
                        <button
                          className="btn success"
                          style={{ fontSize: 12, padding: '4px 10px', marginTop: 8 }}
                          onClick={() => downloadPaymentReceipt(p)}
                        >
                          Descargar comprobante (PDF)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
