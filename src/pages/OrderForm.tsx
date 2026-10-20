import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PaymentSheet } from '../components/PaymentSheet'
import { db } from '../lib/db'
import { dayKey, fromLocalInput, hours, jmd, toLocalInput } from '../lib/format'
import { useSettings } from '../lib/hooks'
import { loadOrderBundle, newOrderNo, save, summarize, uid } from '../lib/repo'
import type { Customer, Handover, Order, OrderItem, Product } from '../lib/types'

type Draft = Pick<OrderItem, 'id' | 'product_id' | 'name' | 'size' | 'quantity' | 'notes' | 'work_minutes'>

function defaultDue(day?: string | null) {
  // The chosen calendar day, else tomorrow, at 2 pm Jamaica time
  const k = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : dayKey(new Date(Date.now() + 86400000))
  return new Date(`${k}T14:00:00-05:00`).toISOString()
}

export function OrderForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const nav = useNavigate()
  const settings = useSettings()
  const products = useLiveQuery(async () => (await db.products.orderBy('sort').toArray()).filter((p) => p.active && !p.deleted), [])
  const customers = useLiveQuery(async () => (await db.customers.toArray()).filter((c) => !c.deleted), [])

  const [orderId] = useState(() => id ?? uid())
  const [existing, setExisting] = useState<Order | null>(null)
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([])
  const [loaded, setLoaded] = useState(!editing)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [custQuery, setCustQuery] = useState('')
  const [newCust, setNewCust] = useState<{ name: string; phone: string } | null>(null)
  const [items, setItems] = useState<Draft[]>([])
  const [params] = useSearchParams()
  const [due, setDue] = useState(() => defaultDue(params.get('day')))
  const [handover, setHandover] = useState<Handover>('pickup')
  const [fee, setFee] = useState('0')
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [paySheet, setPaySheet] = useState<{ amount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const b = await loadOrderBundle(id)
      if (!b.order) return
      setExisting(b.order)
      setOriginalItems(b.items)
      setItems(b.items.map(({ id, product_id, name, size, quantity, notes, work_minutes }) => ({ id, product_id, name, size, quantity, notes, work_minutes })))
      setDue(b.order.due_at)
      setHandover(b.order.handover)
      setFee(String(b.order.delivery_fee ?? 0))
      setAddress(b.order.delivery_address ?? '')
      setPrice(b.order.price ? String(b.order.price) : '')
      setNotes(b.order.notes ?? '')
      if (b.order.customer_id) setCustomer((await db.customers.get(b.order.customer_id)) ?? null)
      setLoaded(true)
    })()
  }, [id])

  const zones = settings.delivery_zones
  const zone = zones.find((z) => z.id === handover)

  function pickHandover(h: Handover) {
    setHandover(h)
    const z = zones.find((x) => x.id === h)
    setFee(z ? String(z.min) : '0')
  }

  function addProduct(p: Product) {
    setItems((xs) => [
      ...xs,
      { id: uid(), product_id: p.id, name: p.name, size: p.sizes[0] ?? null, quantity: /cupcake/i.test(p.name) ? 12 : 1, notes: null, work_minutes: (p.prep_minutes ?? 60) + (p.bake_minutes ?? 60) },
    ])
  }
  const upd = (i: number, ch: Partial<Draft>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...ch } : x)))

  const matches = useMemo(() => {
    const q = custQuery.trim().toLowerCase()
    if (!q || !customers) return []
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')).slice(0, 6)
  }, [custQuery, customers])

  // How busy is the chosen day, not counting this order
  const dayLoad = useLiveQuery(async () => {
    const k = dayKey(due)
    const orders = (await db.orders.toArray()).filter((o) => !o.deleted && o.id !== orderId && o.status !== 'cancelled' && dayKey(o.due_at) === k)
    let mins = 0
    for (const o of orders) {
      const its = await db.order_items.where('order_id').equals(o.id).toArray()
      mins += summarize(o, its, [], settings).workMinutes
    }
    return mins
  }, [due, orderId, settings])

  const priceNum = Number(price.replace(/[^0-9.]/g, '')) || 0
  const feeNum = handover === 'pickup' ? 0 : Number(fee.replace(/[^0-9.]/g, '')) || 0
  const draftOrder = { price: priceNum, delivery_fee: feeNum, deposit_pct: settings.deposit_pct } as Order
  const sum = summarize(draftOrder, items as OrderItem[], [], settings)
  const capMin = (settings.day_hours || 8) * 60
  const free = capMin - (dayLoad ?? 0) - sum.workMinutes

  async function persist(confirm: boolean) {
    setError(null)
    if (!customer && !newCust?.name.trim()) return setError('Choose or add a customer.')
    if (!items.length) return setError('Add at least one item.')
    let customerId = customer?.id ?? null
    if (!customer && newCust) {
      const c = await save<Customer>('customers', { id: uid(), name: newCust.name.trim(), phone: newCust.phone.trim() || null, notes: null })
      customerId = c.id
    }
    const status = confirm && (!existing || existing.status === 'enquiry') ? 'confirmed' : (existing?.status ?? 'enquiry')
    await save<Order>('orders', {
      ...(existing ?? {}),
      id: orderId,
      order_no: existing?.order_no ?? newOrderNo(),
      customer_id: customerId,
      due_at: due,
      status,
      handover,
      delivery_address: handover === 'pickup' ? null : address.trim() || null,
      delivery_fee: feeNum,
      price: priceNum,
      deposit_pct: existing?.deposit_pct ?? settings.deposit_pct,
      notes: notes.trim() || null,
    })
    for (const it of items) await save<OrderItem>('order_items', { ...it, order_id: orderId })
    for (const gone of originalItems.filter((o) => !items.some((i) => i.id === o.id))) {
      await save<OrderItem>('order_items', { ...gone, deleted: true })
    }
    if (confirm && !editing) setPaySheet({ amount: sum.depositDue })
    else nav(`/orders/${orderId}`, { replace: true })
  }

  if (!loaded || !products || !customers) return null

  return (
    <div className="page">
      <header className="page-head" style={{ justifyContent: 'flex-start' }}>
        <Link to={editing ? `/orders/${orderId}` : '/'} className="icon-btn" aria-label="Back">
          <Icon name="back" size={22} />
        </Link>
        <h1 className="title">{editing ? `Edit order ${existing?.order_no ?? ''}` : 'New order'}</h1>
      </header>

      <div className="form-layout">
        <div className="stack">
          {/* Customer */}
          <div className="field">
            <label htmlFor="cust">Customer</label>
            {customer ? (
              <div className="row between card" style={{ padding: '12px 16px' }}>
                <div>
                  <strong>{customer.name}</strong>
                  {customer.phone && <div className="small muted">{customer.phone}</div>}
                  {customer.notes && <div className="small owing">{customer.notes}</div>}
                </div>
                <button className="btn btn-ghost" onClick={() => setCustomer(null)}>
                  Change
                </button>
              </div>
            ) : newCust ? (
              <div className="two">
                <input id="cust" className="input" placeholder="Name" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} autoFocus />
                <input className="input" placeholder="Phone (optional)" inputMode="tel" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} aria-label="Phone" />
              </div>
            ) : (
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="search" style={{ flex: 1 }}>
                  <input id="cust" className="input" placeholder="Search name or phone" value={custQuery} onChange={(e) => setCustQuery(e.target.value)} autoComplete="off" />
                  {matches.length > 0 && (
                    <div className="suggest">
                      {matches.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCustomer(c)
                            setCustQuery('')
                          }}
                        >
                          <strong>{c.name}</strong> <span className="muted small">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn" style={{ borderColor: 'var(--raspberry)', color: 'var(--raspberry)' }} onClick={() => setNewCust({ name: custQuery, phone: '' })}>
                  + New
                </button>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="field">
            <span className="flabel">{items.length ? 'Items' : 'What are they ordering?'}</span>
            {items.map((it, i) => {
              const p = products.find((x) => x.id === it.product_id)
              return (
                <div key={it.id} className="card stack" style={{ padding: 18, gap: 14 }}>
                  <div className="row between">
                    <strong style={{ fontSize: 19 }}>{it.name}</strong>
                    <button className="icon-btn" aria-label={`Remove ${it.name}`} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>
                      <Icon name="trash" size={20} />
                    </button>
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
                    {p && p.sizes.length > 0 && (
                      <div className="pills" role="group" aria-label="Size">
                        {p.sizes.map((s) => (
                          <button key={s} type="button" className="pill soft" aria-pressed={it.size === s} onClick={() => upd(i, { size: s })}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="stepper" role="group" aria-label="Quantity">
                      <button type="button" aria-label="Fewer" onClick={() => upd(i, { quantity: Math.max(1, it.quantity - 1) })}>
                        −
                      </button>
                      <output>{it.quantity}</output>
                      <button type="button" aria-label="More" onClick={() => upd(i, { quantity: it.quantity + 1 })}>
                        +
                      </button>
                    </div>
                  </div>
                  <input className="input" placeholder="Flavour, topping, writing…" value={it.notes ?? ''} onChange={(e) => upd(i, { notes: e.target.value || null })} aria-label={`${it.name} notes`} />
                </div>
              )
            })}
            <div className="pills">
              {products.map((p) => (
                <button key={p.id} type="button" className={`pill${p.line === 'custom' ? ' dashed' : ''}`} onClick={() => addProduct(p)}>
                  {items.length ? '+ ' : ''}
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* When and how */}
          <div className="two">
            <div className="field">
              <label htmlFor="due">Due</label>
              <input id="due" className="input" type="datetime-local" value={toLocalInput(due)} onChange={(e) => e.target.value && setDue(fromLocalInput(e.target.value))} />
              <span className={`small ${free < 0 ? 'owing' : 'paid'}`}>{free < 0 ? `Day is over by ${hours(-free)}` : `${hours(free)} free that day after this order`}</span>
            </div>
            <div className="field">
              <span className="flabel">Handover</span>
              <div className="pills">
                <button type="button" className="pill soft" aria-pressed={handover === 'pickup'} onClick={() => pickHandover('pickup')}>
                  Pickup
                </button>
                {zones.map((z) => (
                  <button key={z.id} type="button" className="pill soft" aria-pressed={handover === z.id} onClick={() => pickHandover(z.id)}>
                    {z.id === 'kingston' ? 'Kingston' : 'Outside Kingston'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {handover !== 'pickup' && (
            <div className="two">
              <div className="field">
                <label htmlFor="fee">Delivery fee (J$)</label>
                <input id="fee" className="input" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
                {zone && <span className="small muted">{zone.name}: {jmd(zone.min)} to {jmd(zone.max)}</span>}
              </div>
              <div className="field">
                <label htmlFor="addr">Delivery address</label>
                <input id="addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="notes">Order notes</label>
            <textarea id="notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else to remember" />
          </div>
        </div>

        <aside className="card price-panel stack" aria-label="Price">
          <h2 className="section-title">Price</h2>
          <div className="field">
            <label htmlFor="price">Your price for the items (J$)</label>
            <input id="price" className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} style={{ fontSize: 24, fontWeight: 700, borderColor: 'var(--gold)', borderWidth: 2 }} placeholder="0" />
            <span className="small muted">Ingredient costing and a suggested price arrive with recipes in phase 2.</span>
          </div>
          <div className="total-box">
            {sum.gct > 0 && (
              <div className="kv">
                <span className="muted">GCT {settings.gct_pct}%</span>
                <span>{jmd(sum.gct)}</span>
              </div>
            )}
            {feeNum > 0 && (
              <div className="kv">
                <span className="muted">Delivery</span>
                <span>{jmd(feeNum)}</span>
              </div>
            )}
            <div className="kv" style={{ fontWeight: 700, fontSize: 19 }}>
              <span>Order total</span>
              <span>{jmd(sum.total)}</span>
            </div>
            <div className="kv" style={{ color: '#8e1239', fontWeight: 600 }}>
              <span>{settings.deposit_pct}% deposit</span>
              <span>{jmd(sum.depositDue)}</span>
            </div>
          </div>
          {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
          {editing ? (
            <button className="btn btn-primary btn-big btn-block" onClick={() => void persist(false)}>
              Save changes
            </button>
          ) : (
            <>
              <button className="btn btn-primary btn-big btn-block" onClick={() => void persist(true)}>
                Confirm + log deposit
              </button>
              <button className="btn btn-block" onClick={() => void persist(false)}>
                Save as enquiry
              </button>
            </>
          )}
        </aside>
      </div>

      {paySheet && (
        <PaymentSheet
          orderId={orderId}
          suggested={paySheet.amount}
          kind="deposit"
          onClose={() => nav(`/orders/${orderId}`, { replace: true })}
        />
      )}
    </div>
  )
}
