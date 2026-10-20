const money = new Intl.NumberFormat('en-JM', { maximumFractionDigits: 0 })

export function jmd(n: number | null | undefined) {
  return `J$${money.format(Math.round(n ?? 0))}`
}

const TZ = 'America/Jamaica'

export function dayKey(d: Date | string) {
  // YYYY-MM-DD in Jamaica time
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(d))
}

export function timeOf(d: string) {
  return new Intl.DateTimeFormat('en-JM', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
    .format(new Date(d))
    .toLowerCase()
}

export function dayLabel(d: Date | string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-JM', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...opts,
  }).format(new Date(d))
}

export function longDate(d: Date | string) {
  return new Intl.DateTimeFormat('en-JM', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(d))
}

/** Relative day name: Today, Tomorrow, or "Sat 24 Oct". */
export function relDay(d: string) {
  const k = dayKey(d)
  const today = dayKey(new Date())
  const tomorrow = dayKey(new Date(Date.now() + 86400000))
  const yesterday = dayKey(new Date(Date.now() - 86400000))
  if (k === today) return 'Today'
  if (k === tomorrow) return 'Tomorrow'
  if (k === yesterday) return 'Yesterday'
  return dayLabel(d)
}

/** Value for <input type="datetime-local"> in Jamaica time (UTC-5, no daylight saving). */
export function toLocalInput(iso: string) {
  const d = new Date(new Date(iso).getTime() - 5 * 3600000)
  return d.toISOString().slice(0, 16)
}

export function fromLocalInput(v: string) {
  return new Date(`${v}:00-05:00`).toISOString()
}

export function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-JM', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date()))
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function hours(minutes: number) {
  const h = minutes / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr${h === 1 ? '' : 's'}`
}
