import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { db } from '../lib/db'
import { dayLabel } from '../lib/format'
import { useSettings, useSyncState } from '../lib/hooks'
import { save, summarize } from '../lib/repo'
import { supabase } from '../lib/supabase'
import { clearLocalData, syncNow } from '../lib/sync'
import type { DeliveryZone, Settings as S } from '../lib/types'

function csv(rows: (string | number | null | undefined)[][]) {
  return rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

async function exportBackup() {
  const [orders, items, payments, customers, settingsRows] = await Promise.all([
    db.orders.toArray(),
    db.order_items.toArray(),
    db.payments.toArray(),
    db.customers.toArray(),
    db.settings.toArray(),
  ])
  const settings = settingsRows[0]
  const cust = new Map(customers.map((c) => [c.id, c]))
  const rows: (string | number | null)[][] = [['Order', 'Due', 'Status', 'Customer', 'Phone', 'Items', 'Handover', 'Delivery fee', 'Price', 'Total', 'Paid', 'Balance']]
  for (const o of orders.filter((x) => !x.deleted).sort((a, b) => a.due_at.localeCompare(b.due_at))) {
    const its = items.filter((i) => i.order_id === o.id && !i.deleted)
    const pays = payments.filter((p) => p.order_id === o.id && !p.deleted)
    const s = summarize(o, its, pays, settings)
    const c = o.customer_id ? cust.get(o.customer_id) : undefined
    rows.push([o.order_no, o.due_at, o.status, c?.name ?? '', c?.phone ?? '', its.map((i) => `${i.name}${i.size ? ' ' + i.size : ''} x${i.quantity}`).join('; '), o.handover, o.delivery_fee, o.price, s.total, s.paid, s.balance])
  }
  rows.push([])
  rows.push(['Payment date', 'Order', 'Kind', 'Method', 'Amount'])
  for (const p of payments.filter((x) => !x.deleted).sort((a, b) => a.paid_at.localeCompare(b.paid_at))) {
    rows.push([p.paid_at, orders.find((o) => o.id === p.order_id)?.order_no ?? '', p.kind, p.method, p.amount])
  }
  const blob = new Blob([csv(rows)], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `sweet-kakes-backup-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

export function Settings() {
  const settings = useSettings()
  const sync = useSyncState()
  const toast = useToast()
  const [s, setS] = useState<S | null>(null)
  const [pw, setPw] = useState('')

  useEffect(() => {
    if (settings.id && !s) setS(settings)
  }, [settings, s])

  if (!s) return null
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v })
  const num = (v: string) => Number(String(v).replace(/[^0-9.]/g, '')) || 0
  const setZone = (i: number, ch: Partial<DeliveryZone>) => set('delivery_zones', s.delivery_zones.map((z, j) => (j === i ? { ...z, ...ch } : z)))

  return (
    <div className="page page-narrow stack">
      <header className="row">
        <Link to="/more" className="icon-btn tab-only" aria-label="Back" style={{ display: 'none' }}>
          <Icon name="back" size={22} />
        </Link>
        <h1 className="title">Settings</h1>
      </header>

      <section className="card stack">
        <h2 className="section-title">Receipts</h2>
        <div className="field">
          <label htmlFor="ph">Business phone</label>
          <input id="ph" className="input" inputMode="tel" value={s.phone ?? ''} onChange={(e) => set('phone', e.target.value || null)} />
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="bn">Bank name</label>
            <input id="bn" className="input" value={s.bank_name ?? ''} onChange={(e) => set('bank_name', e.target.value || null)} />
          </div>
          <div className="field">
            <label htmlFor="ban">Account name</label>
            <input id="ban" className="input" value={s.bank_account_name ?? ''} onChange={(e) => set('bank_account_name', e.target.value || null)} />
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>These appear on receipts and WhatsApp messages. Leave the account number off; send it privately if a customer asks.</p>
      </section>

      <section className="card stack">
        <h2 className="section-title">Orders and pricing</h2>
        <div className="two">
          <div className="field">
            <label htmlFor="dep">Deposit (%)</label>
            <input id="dep" className="input" inputMode="numeric" value={s.deposit_pct} onChange={(e) => set('deposit_pct', e.target.value as unknown as number)} />
          </div>
          <div className="field">
            <label htmlFor="dnote">Deposit terms (on receipts and messages)</label>
            <input id="dnote" className="input" value={s.deposit_note ?? ''} onChange={(e) => set('deposit_note', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hrs">Working hours per day</label>
            <input id="hrs" className="input" inputMode="numeric" value={s.day_hours} onChange={(e) => set('day_hours', e.target.value as unknown as number)} />
          </div>
          <div className="field">
            <label htmlFor="lab">Labour rate (J$ per hour)</label>
            <input id="lab" className="input" inputMode="numeric" value={s.labour_rate} onChange={(e) => set('labour_rate', e.target.value as unknown as number)} />
          </div>
          <div className="field">
            <label htmlFor="mar">Profit margin (%)</label>
            <input id="mar" className="input" inputMode="numeric" value={s.margin_pct} onChange={(e) => set('margin_pct', e.target.value as unknown as number)} />
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Change labour rate and margin any time, for example for the Christmas season. They drive the suggested prices on the Costing screen.</p>
        <label className="row" style={{ minHeight: 52, cursor: 'pointer' }}>
          <input type="checkbox" checked={s.gct_enabled} onChange={(e) => set('gct_enabled', e.target.checked)} style={{ width: 26, height: 26 }} />
          <span>Charge GCT (turn on once registered)</span>
        </label>
        {s.gct_enabled && (
          <div className="field">
            <label htmlFor="gct">GCT rate (%)</label>
            <input id="gct" className="input" inputMode="numeric" value={s.gct_pct} onChange={(e) => set('gct_pct', e.target.value as unknown as number)} />
          </div>
        )}
      </section>

      <section className="card stack">
        <h2 className="section-title">Costing</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Overhead is added as a percentage of the ingredient cost. Total now: <strong>{s.overhead.reduce((t, o) => t + (Number(o.pct) || 0), 0)}%</strong>.
        </p>
        {s.overhead.map((o, i) => (
          <div key={i} className="row" style={{ gap: 10 }}>
            <input
              className="input"
              aria-label="Overhead name"
              value={o.name}
              onChange={(e) => set('overhead', s.overhead.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              style={{ flex: 1 }}
            />
            <input
              className="input"
              aria-label={`${o.name} percent`}
              inputMode="decimal"
              value={o.pct}
              onChange={(e) => set('overhead', s.overhead.map((x, j) => (j === i ? { ...x, pct: e.target.value as unknown as number } : x)))}
              style={{ width: 90, textAlign: 'right' }}
            />
            <span className="muted">%</span>
            <button className="icon-btn" aria-label={`Remove ${o.name}`} onClick={() => set('overhead', s.overhead.filter((_, j) => j !== i))}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => set('overhead', [...s.overhead, { name: 'New cost', pct: 0 }])}>
          + Add overhead
        </button>
        <div className="two">
          <div className="field">
            <label htmlFor="gcp">Gas cylinder price (J$)</label>
            <input id="gcp" className="input" inputMode="numeric" value={s.gas_cylinder_price} onChange={(e) => set('gas_cylinder_price', e.target.value as unknown as number)} />
          </div>
          <div className="field">
            <label htmlFor="gcl">Cylinder size (lb)</label>
            <input id="gcl" className="input" inputMode="numeric" value={s.gas_cylinder_lb} onChange={(e) => set('gas_cylinder_lb', e.target.value as unknown as number)} />
          </div>
          <div className="field">
            <label htmlFor="glh">Gas used per oven hour (lb)</label>
            <input id="glh" className="input" inputMode="decimal" value={s.gas_lb_per_hour} onChange={(e) => set('gas_lb_per_hour', e.target.value as unknown as number)} />
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2 className="section-title">Delivery fees</h2>
        {s.delivery_zones.map((z, i) => (
          <div key={z.id} className="stack" style={{ gap: 10 }}>
            <strong>{z.name}</strong>
            <div className="two">
              <div className="field">
                <label htmlFor={`zmin${i}`}>From (J$)</label>
                <input id={`zmin${i}`} className="input" inputMode="numeric" value={z.min} onChange={(e) => setZone(i, { min: e.target.value as unknown as number })} />
              </div>
              <div className="field">
                <label htmlFor={`zmax${i}`}>To (J$)</label>
                <input id={`zmax${i}`} className="input" inputMode="numeric" value={z.max} onChange={(e) => setZone(i, { max: e.target.value as unknown as number })} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <button
        className="btn btn-primary btn-big"
        onClick={async () => {
          const n = (v: unknown) => num(String(v ?? ''))
          await save<S>('settings', {
            ...s,
            deposit_pct: n(s.deposit_pct),
            day_hours: n(s.day_hours),
            labour_rate: n(s.labour_rate),
            margin_pct: n(s.margin_pct),
            gct_pct: n(s.gct_pct),
            gas_cylinder_price: n(s.gas_cylinder_price),
            gas_cylinder_lb: n(s.gas_cylinder_lb),
            gas_lb_per_hour: n(s.gas_lb_per_hour),
            overhead: s.overhead.map((o) => ({ name: o.name.trim() || 'Overhead', pct: n(o.pct) })),
            delivery_zones: s.delivery_zones.map((z) => ({ ...z, min: n(z.min), max: n(z.max) })),
          })
          toast({ text: 'Settings saved' })
        }}
      >
        Save settings
      </button>

      <section className="card stack">
        <h2 className="section-title">Sync and backup</h2>
        <div className="small muted">
          {sync?.lastSynced ? `Last synced ${dayLabel(sync.lastSynced)} ${new Date(sync.lastSynced).toLocaleTimeString('en-JM', { hour: 'numeric', minute: '2-digit' })}` : 'Not synced yet'}
          {sync?.pending ? ` · ${sync.pending} change${sync.pending > 1 ? 's' : ''} waiting to send` : ''}
          {sync?.phase === 'error' && sync.message ? ` · ${sync.message}` : ''}
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => void syncNow()}>Sync now</button>
          <button className="btn" onClick={() => void exportBackup()}>Download backup (CSV)</button>
        </div>
      </section>

      <section className="card stack">
        <h2 className="section-title">Account</h2>
        <div className="field">
          <label htmlFor="npw">New password</label>
          <input id="npw" className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn"
            disabled={pw.length < 8}
            onClick={async () => {
              const { error } = await supabase.auth.updateUser({ password: pw })
              toast({ text: error ? error.message : 'Password changed' })
              if (!error) setPw('')
            }}
          >
            Change password
          </button>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              if (sync?.pending && !confirm('Some changes have not synced yet and will be lost on this device. Sign out anyway?')) return
              await supabase.auth.signOut()
              await clearLocalData()
              location.reload()
            }}
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
