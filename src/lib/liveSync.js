// Tells the other tabs and windows of this browser that orders or stock changed, so an admin decision or a
// customer's payment shows up there at once instead of on the next poll.
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('tapik-live')

export function notifyChange() {
  channel?.postMessage('changed')
}

// Calls listener whenever another tab reports a change. Returns the unsubscribe function.
export function onChange(listener) {
  if (!channel) return () => {}
  const handle = () => listener()
  channel.addEventListener('message', handle)
  return () => channel.removeEventListener('message', handle)
}
