import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { HANDOVER, MoneyLine, nextStatus, StatusChip, useAdvance } from '../components/OrderBits'
import { PaymentSheet } from '../components/PaymentSheet'
import { useToast } from '../components/Toast'
import { dayKey, dayLabel, jmd, relDay, timeOf } from '../lib/format'
import { orderTitle, useOrderViews, useSettings, type OrderView } from '../lib/hooks'
import { orderSummaryText, shareReceipt, whatsappNumber } from '../lib/receipt'
import { addPhoto, patch, photoUrl, summarize } from '../lib/repo'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { STATUS_FLOW, STATUS_LABEL, type Order, type Payment } from '../lib/types'

type Filter = 'upcoming' | 'enquiry' | 'owing' | 'past' | 'all'

export function Orders() {
  const { id } = useParams()
  const settings = useSettings()
  const views = useOrderViews()
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [q, setQ] = useState('')
  const today = dayKey(new Date())

  const shown = useMemo(() => {
    if (!views) return []
    const query = q.trim().toLowerCase()
    return views
      .filter((v) => {
        const k = dayKey(v.order.due_at)
        const s = summarize(v.order, v.items, v.payments, settings)
        if (filter === 'upcoming') return k >= today && v.order.status !== 'cancelled'
        if (filter === 'enquiry') return v.order.status === 'enquiry'
        if (filter === 'owing') return s.balance > 0 && v.order.status !== 'cancelled' && v.order.status !== 'enquiry'
        if (filter === 'past') return k < today
        return true
      })
      .filter((v) =>
        !query
          ? true
          : [v.customer?.name, v.customer?.phone, v.order.order_no, ...v.items.map((i) => i.name)].some((s) => (s ?? '').toLowerCase().includes(query)),
      )
      .sort((a, b) => (filter === 'past' || filter === 'all' ? b.order.due_at.localeCompare(a.order.due_at) : a.order.due_at.localeCompare(b.order.due_at)))
  }, [views, filter, q, settings, today])

  const selected = views?.find((v) => v.order.id === id)

  return (
    <div className={`panes${id ? ' has-detail' : ''}`}>
      <section className="pane-list" aria-label="Order list">
        <div className="row between" style={{ marginBottom: 14 }}>
          <h1 className="title" style={{ fontSize: 32 }}>Orders</h1>
          <Link to="/orders/new" className="icon-btn" style={{ background: 'var(--raspberry)', color: '#fff', borderColor: 'var(--raspberry)', width: 52, height: 52, borderRadius: 26 }} aria-label="New order">
            <Icon name="plus" stroke={2.5} />
          </Link>
        </div>
        <label htmlFor="q" className="sr-only">Search orders</label>
        <input id="q" className="input" type="search" placeholder="Search customer, item or order #" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
        <div className="pills" style={{ marginBottom: 16, gap: 8 }}>
          {(['upcoming', 'enquiry', 'owing', 'past', 'all'] as Filter[]).map((f) => (
            <button key={f} className="pill" style={{ minHeight: 44, padding: '0 14px', fontSize: 15 }} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {{ upcoming: 'Upcoming', enquiry: 'Enquiries', owing: 'Owing', past: 'Past', all: 'All' }[f]}
            </button>
          ))}
        </div>
        <div className="list">
          {shown.map((v) => (
            <Link key={v.order.id} to={`/orders/${v.order.id}`} className={`order-row${v.order.id === id ? ' selected' : ''}`} style={{ background: v.order.id === id ? '#fff' : 'var(--white)', border: v.order.id === id ? undefined : '1px solid var(--champagne)', flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
              <div className="row between">
                <span className="what" style={{ fontWeight: 600 }}>{orderTitle(v.items)}</span>
                <StatusChip status={v.order.status} />
              </div>
              <div className="sub">
                {v.customer?.name ?? 'No customer'} · {relDay(v.order.due_at)} {timeOf(v.order.due_at)}
              </div>
              <div className="small"><MoneyLine v={v} settings={settings} /></div>
            </Link>
          ))}
          {views && !shown.length && <p className="empty">No orders here.</p>}
        </div>
      </section>
      <section className="pane-detail" aria-label="Order detail">
        {selected ? <OrderDetail v={selected} /> : id && views ? <p className="empty">This order was not found.</p> : <p className="empty" style={{ marginTop: 120 }}>Choose an order to see its details.</p>}
      </section>
    </div>
  )
}

function Photo({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let url: string | null = null
    void photoUrl(path).then((u) => {
      url = u
      setSrc(u)
    })
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [path])
  return src ? (
    <a href={src} target="_blank" rel="noreferrer">
      <img src={src} alt="Reference" />
    </a>
  ) : (
    <div className="photo-add" style={{ borderStyle: 'solid', cursor: 'default' }}>Photo loads when online</div>
  )
}

function OrderDetail({ v }: { v: OrderView }) {
  const settings = useSettings()
  const nav = useNavigate()
  const toast = useToast()
  const advance = useAdvance()
  const [sheet, setSheet] = useState<Payment['kind'] | null>(null)
  const photos = useLiveQuery(async () => (await db.order_photos.where('order_id').equals(v.order.id).toArray()).filter((p) => !p.deleted), [v.order.id])
  const s = summarize(v.order, v.items, v.payments, settings)
  const o = v.order
  const idx = STATUS_FLOW.indexOf(o.status)
  const next = nextStatus(o.status)
  const wa = whatsappNumber(v.customer?.phone)

  async function cancelOrder() {
    if (!confirm('Cancel this order? You can bring it back from Undo.')) return
    const from = o.status
    await patch<Order>('orders', o.id, { status: 'cancelled' })
    toast({ text: 'Order cancelled', undo: () => void patch<Order>('orders', o.id, { status: from }) })
  }

  return (
    <div className="page stack" style={{ gap: 20 }}>
      <header className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <button className="icon-btn" aria-label="Back to list" onClick={() => nav('/orders')} style={{ marginTop: 4 }}>
            <Icon name="back" size={22} />
          </button>
          <div>
            <div className="eyebrow">
              Order {o.order_no} · {relDay(o.due_at)} {timeOf(o.due_at)} · {HANDOVER[o.handover]}
            </div>
            <h2 className="title" style={{ fontSize: 30 }}>{orderTitle(v.items)}</h2>
            <div style={{ marginTop: 4 }}>
              {v.customer?.name ?? 'No customer'}
              {v.customer?.phone && (
                <>
                  {' · '}
                  <a href={`tel:${v.customer.phone}`}>{v.customer.phone}</a>
                </>
              )}
            </div>
            {v.customer?.notes && <div className="small owing">{v.customer.notes}</div>}
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Link to={`/orders/${o.id}/edit`} className="btn">
            <Icon name="edit" size={20} /> Edit
          </Link>
          {wa && (
            <a className="btn" href={`https://wa.me/${wa}?text=${encodeURIComponent(orderSummaryText(v, settings))}`} target="_blank" rel="noreferrer">
              <Icon name="share" size={20} /> WhatsApp
            </a>
          )}
        </div>
      </header>

      {o.status === 'cancelled' ? (
        <div className="owing-box">
          <span>This order is cancelled.</span>
          <button className="btn" onClick={() => void patch<Order>('orders', o.id, { status: 'enquiry' })}>
            Restore
          </button>
        </div>
      ) : (
        <div className="statusbar" role="group" aria-label="Status">
          {STATUS_FLOW.map((st, i) =>
            i < idx ? (
              <div key={st} className="done">{STATUS_LABEL[st]}</div>
            ) : i === idx ? (
              <div key={st} className="now" aria-current="step">{STATUS_LABEL[st]}</div>
            ) : st === next ? (
              <button key={st} className="next" onClick={() => void advance(o, st)}>
                {STATUS_LABEL[st]} →
              </button>
            ) : (
              <div key={st}>{STATUS_LABEL[st]}</div>
            ),
          )}
        </div>
      )}

      <div className="two" style={{ alignItems: 'start' }}>
        <section className="card stack" style={{ gap: 14 }}>
          <h3 className="label-caps">Details</h3>
          {v.items.map((it) => (
            <div key={it.id}>
              <div style={{ fontWeight: 600, fontSize: 18 }}>
                {it.name}
                {it.size ? ` ${it.size}` : ''}
                {it.quantity > 1 ? ` × ${it.quantity}` : ''}
              </div>
              {it.notes && <div className="muted">{it.notes}</div>}
            </div>
          ))}
          {o.notes && <div style={{ whiteSpace: 'pre-wrap' }}>{o.notes}</div>}
          {o.delivery_address && <div className="muted">Deliver to: {o.delivery_address}</div>}
          <div className="photos">
            {photos?.map((p) => <Photo key={p.id} path={p.path} />)}
            <label className="photo-add">
              <Icon name="camera" />
              Add photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void addPhoto(o.id, f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </section>

        <section className="card stack" style={{ gap: 12 }}>
          <h3 className="label-caps">Money</h3>
          <div className="kv"><span>Items</span><span>{jmd(o.price)}</span></div>
          {s.gct > 0 && <div className="kv"><span>GCT {settings.gct_pct}%</span><span>{jmd(s.gct)}</span></div>}
          {o.delivery_fee > 0 && <div className="kv"><span>Delivery</span><span>{jmd(o.delivery_fee)}</span></div>}
          <div className="kv" style={{ fontWeight: 700, fontSize: 18 }}><span>Order total</span><span>{jmd(s.total)}</span></div>
          {v.payments.map((p) => (
            <div key={p.id} className="kv paid" style={{ fontWeight: 500 }}>
              <span>
                {p.kind === 'deposit' ? 'Deposit' : p.kind === 'balance' ? 'Balance' : 'Payment'} · {p.method === 'bank' ? 'bank transfer' : 'cash'} · {dayLabel(p.paid_at)}
              </span>
              <span>{jmd(p.amount)}</span>
            </div>
          ))}
          {s.total > 0 &&
            (s.balance > 0 ? (
              <div className="owing-box">
                <span>{s.paid ? 'Balance owing' : `Deposit due (${o.deposit_pct}%)`}</span>
                <span style={{ fontSize: 22 }}>{jmd(s.paid ? s.balance : s.depositDue)}</span>
              </div>
            ) : (
              <div className="paid-box">
                <span>Paid in full</span>
                <span>✓</span>
              </div>
            ))}
          {s.balance > 0 && (
            <button className="btn btn-primary btn-big btn-block" onClick={() => setSheet(s.paid ? 'balance' : 'deposit')}>
              {s.paid ? 'Log balance payment' : 'Log deposit'}
            </button>
          )}
          <button className="btn btn-block" onClick={() => void shareReceipt(v, settings)}>
            Share receipt
          </button>
        </section>
      </div>

      {o.status !== 'cancelled' && o.status !== 'collected' && (
        <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', color: 'var(--ink-2)' }} onClick={() => void cancelOrder()}>
          Cancel this order
        </button>
      )}

      {sheet && (
        <PaymentSheet
          orderId={o.id}
          kind={sheet}
          note={settings.deposit_note}
          suggested={sheet === 'deposit' ? s.depositDue : s.balance}
          onClose={async (saved) => {
            setSheet(null)
            if (saved && o.status === 'enquiry' && sheet === 'deposit') await patch<Order>('orders', o.id, { status: 'confirmed' })
            if (saved) toast({ text: 'Payment saved' })
          }}
        />
      )}
    </div>
  )
}
