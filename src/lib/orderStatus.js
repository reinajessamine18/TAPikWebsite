export const ORDER_STATUSES = [
  'Awaiting payment',
  'Payment submitted',
  'Payment rejected',
  'Confirmed payment',
  'Being prepared',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
]

// Statuses an admin can pick by hand. Payment statuses change only through
// proof-of-payment verification.
export const FULFILLMENT_STATUSES = [
  'Being prepared',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
]

export const PAYABLE_STATUSES = ['Awaiting payment', 'Payment rejected']

export function displayOrderStatus(status) {
  if (!status || status === 'Pending') return 'Awaiting payment'
  if (status === 'Processing') return 'Being prepared'
  return status
}

export function orderStatusColor(status) {
  switch (displayOrderStatus(status)) {
    case 'Awaiting payment':
      return 'tapik-status-pending'
    case 'Payment submitted':
      return 'tapik-status-submitted'
    case 'Payment rejected':
      return 'tapik-status-cancelled'
    case 'Confirmed payment':
      return 'tapik-status-confirmed'
    case 'Being prepared':
      return 'tapik-status-preparing'
    case 'Packed':
      return 'tapik-status-packed'
    case 'Shipped':
      return 'tapik-status-shipped'
    case 'Delivered':
      return 'tapik-status-delivered'
    case 'Cancelled':
      return 'tapik-status-cancelled'
    default:
      return 'tapik-status-default'
  }
}

const PAYMENT_LABELS = {
  Pending: 'Unpaid',
  Submitted: 'Awaiting review',
  Paid: 'Paid',
  Rejected: 'Rejected',
}

export function paymentLabel(order) {
  return PAYMENT_LABELS[order?.paymentStatus] || 'Unpaid'
}
