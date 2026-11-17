const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatMoney(cents) {
  return money.format((cents ?? 0) / 100)
}

const EMOJI_RULES = [
  [/headphone/i, '🎧'],
  [/earbud/i, '🎧'],
  [/keyboard/i, '⌨️'],
  [/mouse/i, '🖱️'],
  [/hub|usb/i, '🔌'],
  [/speaker/i, '🔊'],
  [/mug|coffee/i, '☕'],
  [/kettle/i, '🫖'],
  [/book|pragmatic|data-intensive/i, '📚'],
  [/t-shirt|tee/i, '👕'],
  [/bag|tote/i, '👜'],
]

export function productEmoji(product) {
  const text = `${product.name} ${product.category ?? ''}`
  const match = EMOJI_RULES.find(([pattern]) => pattern.test(text))
  return match ? match[1] : '🛍️'
}

export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'))
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}
