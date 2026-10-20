import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { OrderRow } from '../components/OrderBits'
import { dayKey, greeting, hours, jmd, longDate } from '../lib/format'
import { useOrderViews, useSettings, type OrderView } from '../lib/hooks'
import { summarize } from '../lib/repo'
import type { Order } from '../lib/types'

const active = (o: Order) => o.status !== 'cancelled'

export function Today() {
  const settings = useSettings()
  const views = useOrderViews(active)
  const today = dayKey(new Date())
  const tomorrow = dayKey(new Date(Date.now() + 86400000))

  if (!views) return null
  const todays = views.filter((v) => dayKey(v.order.due_at) === today)
  const tomorrows = views.filter((v) => dayKey(v.order.due_at) === tomorrow)
  const overdue = views.filter((v) => dayKey(v.order.due_at) < today && v.order.status !== 'collected')
  const enquiries = views.filter((v) => v.order.status === 'enquiry' && dayKey(v.order.due_at) >= today)

  const sum = (vs: OrderView[]) => vs.map((v) => summarize(v.order, v.items, v.payments, settings))
  const collectToday = sum(todays).reduce((s, x) => s + x.balance, 0)
  const owingCount = sum(todays).filter((x) => x.balance > 0).length
  const workMin = sum(todays.filter((v) => v.order.status !== 'collected')).reduce((s, x) => s + x.workMinutes, 0)
  const capMin = (settings.day_hours || 8) * 60
  const pct = Math.min(100, Math.round((workMin / capMin) * 100))

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">{longDate(new Date())}</div>
          <h1 className="title">{greeting()}</h1>
        </div>
        <Link to="/orders/new" className="btn btn-primary btn-big">
          <Icon name="plus" size={22} stroke={2.5} />
          New order
        </Link>
      </header>

      <div className="grid-today">
        <section className="card stack" aria-labelledby="due-today">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <h2 id="due-today" className="section-title">Due today</h2>
            <span className="small muted hide-phone">{todays.length ? `${todays.length} order${todays.length > 1 ? 's' : ''} · tap a status to move it on` : ''}</span>
          </div>
          {todays.length ? (
            <div className="list">{todays.map((v) => <OrderRow key={v.order.id} v={v} settings={settings} />)}</div>
          ) : (
            <p className="empty">Nothing due today.</p>
          )}

          {overdue.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: 8 }}>Not yet collected</h2>
              <div className="list">{overdue.map((v) => <OrderRow key={v.order.id} v={v} settings={settings} showDay />)}</div>
            </>
          )}

          <h2 className="section-title" style={{ marginTop: 8 }}>Tomorrow</h2>
          {tomorrows.length ? (
            <div className="list">{tomorrows.map((v) => <OrderRow key={v.order.id} v={v} settings={settings} />)}</div>
          ) : (
            <p className="empty">Nothing due tomorrow yet.</p>
          )}
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="collect">
            <h2 id="collect" className="label-caps">To collect today</h2>
            <div className="big-number">{jmd(collectToday)}</div>
            <div className="small muted">
              {owingCount ? `Balances on ${owingCount} order${owingCount > 1 ? 's' : ''}` : 'Nothing owing today'}
            </div>
          </section>

          <section className="card" aria-labelledby="workload">
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <h2 id="workload" className="label-caps">Today’s workload</h2>
              <strong>
                {hours(workMin)} of {settings.day_hours || 8}
              </strong>
            </div>
            <div className={`meter${workMin > capMin ? ' over' : ''}`} role="img" aria-label={`${hours(workMin)} of ${settings.day_hours} booked`} style={{ marginTop: 14 }}>
              <div style={{ width: `${pct}%` }} />
            </div>
            <div className="small muted" style={{ marginTop: 10 }}>
              {workMin > capMin ? 'Over a full day — consider moving an order.' : `About ${hours(Math.max(0, capMin - workMin))} free`}
            </div>
          </section>

          <section className="card" aria-labelledby="enq">
            <h2 id="enq" className="label-caps">Waiting on a deposit</h2>
            {enquiries.length ? (
              <div className="list" style={{ marginTop: 10 }}>
                {enquiries.slice(0, 5).map((v) => (
                  <Link key={v.order.id} to={`/orders/${v.order.id}`} className="row between" style={{ minHeight: 48, textDecoration: 'none', color: 'inherit' }}>
                    <span>{v.customer?.name ?? 'No customer'}</span>
                    <span className="small muted">{longDate(v.order.due_at).replace(/^\w+, /, '')}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="small muted" style={{ marginBottom: 0 }}>No open enquiries.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
