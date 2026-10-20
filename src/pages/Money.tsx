import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { dayKey, jmd, relDay } from '../lib/format'
import { orderTitle, useOrderViews, useSettings } from '../lib/hooks'
import { summarize } from '../lib/repo'
import type { Order } from '../lib/types'

const billable = (o: Order) => o.status !== 'cancelled' && o.status !== 'enquiry'

export function Money() {
  const settings = useSettings()
  const views = useOrderViews(billable)
  const payments = useLiveQuery(async () => (await db.payments.toArray()).filter((p) => !p.deleted), [])
  if (!views || !payments) return null

  const monthKey = dayKey(new Date()).slice(0, 7)
  const monthPays = payments.filter((p) => dayKey(p.paid_at).slice(0, 7) === monthKey)
  const bank = monthPays.filter((p) => p.method === 'bank').reduce((s, p) => s + Number(p.amount), 0)
  const cash = monthPays.filter((p) => p.method === 'cash').reduce((s, p) => s + Number(p.amount), 0)
  const owing = views
    .map((v) => ({ v, s: summarize(v.order, v.items, v.payments, settings) }))
    .filter((x) => x.s.balance > 0 && x.s.total > 0)
  const owingTotal = owing.reduce((s, x) => s + x.s.balance, 0)
  const monthName = new Intl.DateTimeFormat('en-JM', { month: 'long', timeZone: 'America/Jamaica' }).format(new Date())

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <div className="eyebrow">{monthName}</div>
          <h1 className="title">Money</h1>
        </div>
      </header>

      <div className="two" style={{ marginBottom: 22 }}>
        <section className="card">
          <h2 className="label-caps">Received this month</h2>
          <div className="big-number">{jmd(bank + cash)}</div>
          <div className="small muted">Bank transfer {jmd(bank)} · Cash {jmd(cash)}</div>
        </section>
        <section className="card">
          <h2 className="label-caps">Still owed to you</h2>
          <div className="big-number" style={{ color: owingTotal ? '#8a4b00' : undefined }}>{jmd(owingTotal)}</div>
          <div className="small muted">Across {owing.length} order{owing.length === 1 ? '' : 's'}</div>
        </section>
      </div>

      <section className="card stack">
        <h2 className="section-title">Balances owing</h2>
        {owing.length ? (
          <div className="list">
            {owing.map(({ v, s }) => (
              <Link key={v.order.id} to={`/orders/${v.order.id}`} className="order-row" style={{ textDecoration: 'none' }}>
                <div className="main">
                  <div className="what">{v.customer?.name ?? 'No customer'}</div>
                  <div className="sub">
                    {orderTitle(v.items)} · due {relDay(v.order.due_at)}
                  </div>
                </div>
                <strong className="owing" style={{ fontSize: 18 }}>{jmd(s.balance)}</strong>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty">Everyone is paid up.</p>
        )}
      </section>
    </div>
  )
}
