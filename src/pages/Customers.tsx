import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { StatusChip } from '../components/OrderBits'
import { useToast } from '../components/Toast'
import { db } from '../lib/db'
import { dayLabel } from '../lib/format'
import { orderTitle, useOrderViews } from '../lib/hooks'
import { save } from '../lib/repo'
import type { Customer } from '../lib/types'

export function Customers() {
  const customers = useLiveQuery(async () => (await db.customers.orderBy('name').toArray()).filter((c) => !c.deleted), [])
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase()
    return (customers ?? []).filter((c) => !query || c.name.toLowerCase().includes(query) || (c.phone ?? '').includes(query))
  }, [customers, q])

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <h1 className="title">Customers</h1>
      </header>
      <label htmlFor="cq" className="sr-only">Search customers</label>
      <input id="cq" className="input" type="search" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 16 }} />
      <div className="list">
        {shown.map((c) => (
          <Link key={c.id} to={`/customers/${c.id}`} className="order-row" style={{ background: 'var(--white)', border: '1px solid var(--champagne)' }}>
            <div className="main">
              <div className="what">{c.name}</div>
              <div className="sub">{c.phone ?? 'No phone'}</div>
            </div>
            <Icon name="chevronRight" size={20} />
          </Link>
        ))}
        {customers && !shown.length && <p className="empty">Customers appear here when you add them to an order.</p>}
      </div>
    </div>
  )
}

export function CustomerView() {
  const { id } = useParams()
  const toast = useToast()
  const c = useLiveQuery(() => (id ? db.customers.get(id) : undefined), [id])
  const views = useOrderViews()
  const [edit, setEdit] = useState<Customer | null>(null)
  if (!c) return null
  const theirs = (views ?? []).filter((v) => v.order.customer_id === c.id).reverse()
  const form = edit ?? c

  return (
    <div className="page page-narrow stack">
      <header className="row">
        <Link to="/customers" className="icon-btn" aria-label="Back">
          <Icon name="back" size={22} />
        </Link>
        <h1 className="title">{c.name}</h1>
      </header>
      <section className="card stack">
        <div className="two">
          <div className="field">
            <label htmlFor="cn">Name</label>
            <input id="cn" className="input" value={form.name} onChange={(e) => setEdit({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="cp">Phone</label>
            <input id="cp" className="input" inputMode="tel" value={form.phone ?? ''} onChange={(e) => setEdit({ ...form, phone: e.target.value || null })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cnotes">Notes (allergies, likes, key dates)</label>
          <textarea id="cnotes" className="textarea" value={form.notes ?? ''} onChange={(e) => setEdit({ ...form, notes: e.target.value || null })} />
        </div>
        {edit && (
          <button
            className="btn btn-primary"
            onClick={async () => {
              await save<Customer>('customers', edit)
              setEdit(null)
              toast({ text: 'Customer saved' })
            }}
          >
            Save
          </button>
        )}
      </section>
      <section className="card stack">
        <h2 className="section-title">Orders</h2>
        {theirs.length ? (
          <div className="list">
            {theirs.map((v) => (
              <Link key={v.order.id} to={`/orders/${v.order.id}`} className="order-row" style={{ textDecoration: 'none' }}>
                <div className="main">
                  <div className="what">{orderTitle(v.items)}</div>
                  <div className="sub">{dayLabel(v.order.due_at, { year: 'numeric' })}</div>
                </div>
                <StatusChip status={v.order.status} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty">No orders yet.</p>
        )}
      </section>
    </div>
  )
}

export function More() {
  const links = [
    { to: '/recipes', label: 'Recipes', icon: 'recipes' },
    { to: '/customers', label: 'Customers', icon: 'customers' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ]
  return (
    <div className="page page-narrow stack">
      <header className="row" style={{ gap: 14 }}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Sweet Kakes n Treats" style={{ width: 64, height: 64 }} />
        <h1 className="title">More</h1>
      </header>
      <div className="list">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="order-row" style={{ background: 'var(--white)', border: '1px solid var(--champagne)', minHeight: 64 }}>
            <Icon name={l.icon} />
            <span className="what" style={{ flex: 1 }}>{l.label}</span>
            <Icon name="chevronRight" size={20} />
          </Link>
        ))}
      </div>
    </div>
  )
}
