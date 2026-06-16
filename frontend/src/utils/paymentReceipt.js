import { jsPDF } from 'jspdf'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STATUS_LABELS = {
  PAID: 'Pagado (WebPay)',
  MANUAL: 'Pagado (Manual)',
}

const PAYMENT_METHOD_LABELS = {
  PAID: 'WebPay Plus',
  MANUAL: 'Registro manual',
}

function formatCLP(amount) {
  return `$${Number(amount).toLocaleString('es-CL')} CLP`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-CL')
}

function addRow(doc, x, y, label, value) {
  doc.setFont('helvetica', 'bold')
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(value ?? '-'), x + 60, y)
}

// Genera y descarga un comprobante PDF para un pago con estado PAID o MANUAL.
export function downloadPaymentReceipt(payment) {
  if (payment.status !== 'PAID' && payment.status !== 'MANUAL') {
    throw new Error('Solo se pueden generar comprobantes para pagos completados.')
  }

  const doc = new jsPDF()
  const marginX = 20
  let y = 20

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Prodomia', marginX, y)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Comprobante de Pago', marginX, y + 8)
  y += 22

  doc.setLineWidth(0.5)
  doc.line(marginX, y, 190, y)
  y += 12

  doc.setFontSize(11)
  const period = payment.monthly_fee
    ? `${MONTHS[payment.monthly_fee.period_month - 1]} ${payment.monthly_fee.period_year}`
    : '-'

  addRow(doc, marginX, y, 'N° de pago:', payment.id)
  y += 9
  addRow(doc, marginX, y, 'Residente:', payment.resident_username)
  y += 9
  addRow(doc, marginX, y, 'Unidad:', payment.monthly_fee?.unit)
  y += 9
  addRow(doc, marginX, y, 'Período:', period)
  y += 9
  addRow(doc, marginX, y, 'Monto:', formatCLP(payment.amount))
  y += 9
  addRow(doc, marginX, y, 'Estado:', STATUS_LABELS[payment.status] ?? payment.status)
  y += 9
  addRow(doc, marginX, y, 'Método de pago:', PAYMENT_METHOD_LABELS[payment.status])
  y += 9
  addRow(doc, marginX, y, 'Fecha de pago:', formatDate(payment.transaction_date || payment.created_at))
  y += 9

  if (payment.status === 'PAID') {
    if (payment.authorization_code) {
      addRow(doc, marginX, y, 'Código autorización:', payment.authorization_code)
      y += 9
    }
    if (payment.buy_order) {
      addRow(doc, marginX, y, 'Orden de compra:', payment.buy_order)
      y += 9
    }
  }

  if (payment.status === 'MANUAL') {
    if (payment.marked_paid_by_username) {
      addRow(doc, marginX, y, 'Registrado por:', payment.marked_paid_by_username)
      y += 9
    }
    if (payment.notes) {
      addRow(doc, marginX, y, 'Notas:', payment.notes)
      y += 9
    }
  }

  y += 12
  doc.line(marginX, y, 190, y)
  y += 10
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Comprobante generado el ${formatDate(new Date())}`, marginX, y)

  doc.save(`comprobante-pago-${period.replace(/\s+/g, '-')}-${payment.id}.pdf`)
}
