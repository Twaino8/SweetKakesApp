import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { dayKey, hours, timeOf } from '../lib/format'
import { orderTitle, useOrderViews, useSettings } from '../lib/hooks'
import { summarize } from '../lib/repo'
import { STATUS_LABEL, type Order } from '../lib/types'

const live = (o: Order) => o.status !== 'cancelled'

function mondayOf(d: Date) {
  const k = dayKey(d)
  const local = new Date(`${k}T12:00:00-05:00`)
  const dow = (local.getUTCDay() + 6) % 7
  return new Date(local.getTime() - dow * 86400000)
}

export function Calendar() {
  const settings = useSettings()
  const views = useOrderViews(live)
  const [offset, setOffset] = useState(0)
  const start = new Date(mondayOf(new Date()).getTime() + offset * 7 * 86400000)
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000))
  const today = dayKey(new Date())
  const cap = (settings.day_hours || 8) * 60
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-JM', { timeZone: 'America/Jamaica', ...o }).format(d)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Week of {fmt(days[0], { day: 'numeric', month: 'long' })}</div>
          <h1 className="title">Calendar</h1>
        </div>
        <div className="row">
          <button className="icon-btn" aria-label="Previous week" onClick={() => setOffset(offset - 1)}>
            <Icon name="chevronLeft" />
          </button>
          <button className="btn" onClick={() => setOffset(0)}>This week</button>
          <button className="icon-btn" aria-label="Next week" onClick={() => setOffset(offset + 1)}>
            <Icon name="chevronRight" />
          </button>
        </div>
      </header>
      <div className="week">
        {days.map((d) => {
          const k = dayKey(d)
          const dayViews = (views ?? []).filter((v) => dayKey(v.order.due_at) === k)
          const mins = dayViews.reduce((s, v) => s + summarize(v.order, v.items, [], settings).workMinutes, 0)
          const pct = Math.min(100, Math.round((mins / cap) * 100))
          return (
            <section key={k} className={`day${k === today ? ' today' : ''}`} aria-label={fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}>
              <div className="day-head">
                <strong>{fmt(d, { weekday: 'short' })} {fmt(d, { day: 'numeric' })}</strong>
                <span className="small muted">{mins ? hours(mins) : ''}</span>
              </div>
              <div className={`meter${mins > cap ? ' over' : ''}`} style={{ height: 8 }} role="img" aria-label={`${hours(mins)} of ${settings.day_hours} booked`}>
                <div style={{ width: `${pct}%` }} />
              </div>
              {dayViews.map((v) => {
                const s = summarize(v.order, v.items, v.payments, settings)
                return (
                  <Link key={v.order.id} to={`/orders/${v.order.id}`} className="day-order" style={{ borderLeft: 'none' }}>
                    <div style={{ fontWeight: 600 }}>{timeOf(v.order.due_at)} · {orderTitle(v.items)}</div>
                    <div className="muted">
                      {v.customer?.name ?? ''} {s.balance > 0 && s.total > 0 ? <span className="owing">· owing</span> : null}
                    </div>
                    <span className={`chip st-${v.order.status}`} style={{ marginTop: 4, fontSize: 12, padding: '2px 8px' }}>
                      {STATUS_LABEL[v.order.status]}
                    </span>
                  </Link>
                )
              })}
              <Link to={`/orders/new?day=${k}`} className="small" style={{ marginTop: 'auto', minHeight: 40, display: 'flex', alignItems: 'center' }}>
                + Add
              </Link>
            </section>
          )
        })}
      </div>
    </div>
  )
}
