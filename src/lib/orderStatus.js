export const ORDER_STATUSES = [
  'Pending',
  'Being prepared',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
]

export function displayOrderStatus(status) {
  if (!status || status === 'Processing') return status ? 'Being prepared' : 'Pending'
  return status
}

export function orderStatusColor(status) {
  switch (displayOrderStatus(status)) {
    case 'Pending':
      return 'tapik-status-pending'
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