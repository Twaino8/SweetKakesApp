import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { costIt, gasPerHour, overheadPct, roundPrice, unitCost } from '../lib/costing'
import { db } from '../lib/db'
import { jmd } from '../lib/format'
import { useCostings, useIngredients, useSettings } from '../lib/hooks'
import { remove, save, uid } from '../lib/repo'
import type { Costing as CostingRow, CostLine, Ingredient, Product, Recipe } from '../lib/types'

type Tab = 'cakes' | 'ingredients' | 'packaging'

const money2 = (n: number | null) => (n === null ? '—' : `J$${n.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const num = (v: string) => {
  const n = Number(v.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// ---------------------------------------------------------------- list page

export function Costing() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'cakes'
  const settings = useSettings()
  const costings = useCostings()
  const items = useIngredients()
  const products = useLiveQuery(() => db.products.toArray(), [])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)

  if (!costings || !items) return null
  const kind = tab === 'packaging' ? 'packaging' : 'ingredient'
  const list = items.list.filter((i) => i.kind === kind && (!q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase())))
  const toCheck = items.list.filter((i) => i.kind === kind && i.needs_check).length
  const productName = (id: string | null) => products?.find((p) => p.id === id)?.name

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <h1 className="title">Costing</h1>
        {tab === 'cakes' ? (
          <Link to="/costing/new" className="btn btn-primary">
            <Icon name="plus" size={20} stroke={2.5} /> New costing
          </Link>
        ) : (
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={20} stroke={2.5} /> Add {tab === 'packaging' ? 'packaging' : 'ingredient'}
          </button>
        )}
      </header>

      <div className="pills" role="tablist" style={{ marginBottom: 18 }}>
        {(['cakes', 'ingredients', 'packaging'] as Tab[]).map((t) => (
          <button key={t} role="tab" className="pill" aria-pressed={tab === t} aria-selected={tab === t} onClick={() => setParams({ tab: t }, { replace: true })}>
            {{ cakes: 'Cakes', ingredients: 'Ingredients', packaging: 'Packaging' }[t]}
          </button>
        ))}
      </div>

      {tab === 'cakes' ? (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>
            Overhead {overheadPct(settings)}% · gas {jmd(gasPerHour(settings))}/hr · labour {jmd(settings.labour_rate)}/hr · profit {settings.margin_pct}% ·{' '}
            <Link to="/settings">change</Link>
          </p>
          <div className="list">
            {costings.map((c) => {
              const b = costIt(c, items.byId, settings)
              const sell = c.selling_price
              return (
                <Link key={c.id} to={`/costing/${c.id}`} className="order-row" style={{ background: 'var(--white)', border: '1px solid var(--champagne)', textDecoration: 'none' }}>
                  <div className="main">
                    <div className="what">
                      {c.name}
                      {c.size ? ` · ${c.size}` : ''}
                    </div>
                    <div className="sub">
                      Costs {jmd(b.cbp)} · suggested {jmd(b.price)}
                      {productName(c.product_id) ? ` · ${productName(c.product_id)}` : ''}
                    </div>
                    {sell ? (
                      <div className={`small ${sell < b.cbp ? 'owing' : 'paid'}`}>
                        You charge {jmd(sell)}: {sell < b.cbp ? `${jmd(b.cbp - sell)} below cost` : `${jmd(sell - b.cbp)} profit`}
                      </div>
                    ) : null}
                    {b.missing > 0 && <div className="small owing">{b.missing} line{b.missing > 1 ? 's' : ''} can’t be costed yet</div>}
                  </div>
                  <Icon name="chevronRight" size={20} />
                </Link>
              )
            })}
            {!costings.length && <p className="empty">No costings yet. Tap “New costing” to price a cake.</p>}
          </div>
        </>
      ) : (
        <>
          {toCheck > 0 && (
            <div className="owing-box" style={{ marginBottom: 14, fontWeight: 600 }}>
              <span>
                {toCheck} item{toCheck > 1 ? 's' : ''} from the price sheet need{toCheck === 1 ? 's' : ''} checking
              </span>
            </div>
          )}
          <label htmlFor="iq" className="sr-only">Search</label>
          <input id="iq" className="input" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 14 }} />
          <div className="list">
            {list.map((i) => {
              const u = unitCost(i)
              return (
                <button key={i.id} className="order-row" onClick={() => setEditing(i)} style={{ background: 'var(--white)', border: '1px solid var(--champagne)', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                  <div className="main">
                    <div className="what">{i.name}</div>
                    <div className="sub">
                      {jmd(i.pack_price)} for {i.pack_qty ?? '?'} {i.unit ?? ''}
                      {u !== null ? ` · ${money2(u)} per ${i.unit ?? 'unit'}${i.kind === 'ingredient' && i.markup_pct ? ` (incl. ${i.markup_pct}% buffer)` : ''}` : ''}
                    </div>
                  </div>
                  {i.needs_check && <span className="chip st-decorating">Check</span>}
                </button>
              )
            })}
            {!list.length && <p className="empty">Nothing here yet.</p>}
          </div>
        </>
      )}

      {editing && <IngredientSheet item={editing === 'new' ? null : editing} kind={kind} onClose={() => setEditing(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------- ingredient / packaging editor

const UNITS = ['cup', 'tsp', 'tbsp', 'oz', 'floz', 'lb', 'g', 'kg', 'ml', 'amt', 'each', 'box', 'pack']

function IngredientSheet({ item, kind, onClose }: { item: Ingredient | null; kind: Ingredient['kind']; onClose: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({
    name: item?.name ?? '',
    pack_price: String(item?.pack_price ?? ''),
    pack_qty: item?.pack_qty == null ? (kind === 'packaging' ? '1' : '') : String(item.pack_qty),
    unit: item?.unit ?? (kind === 'packaging' ? 'each' : 'cup'),
    markup_pct: String(item?.markup_pct ?? (kind === 'packaging' ? 0 : 60)),
    store: item?.store ?? '',
    notes: item?.notes ?? '',
    needs_check: item?.needs_check ?? false,
  })
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v })
  const preview = unitCost({ ...(item ?? ({} as Ingredient)), kind, pack_price: num(f.pack_price), pack_qty: num(f.pack_qty) || null, markup_pct: num(f.markup_pct) } as Ingredient)

  async function submit() {
    if (!f.name.trim()) return
    await save<Ingredient>('ingredients', {
      ...(item ?? {}),
      id: item?.id ?? uid(),
      kind,
      name: f.name.trim(),
      pack_price: num(f.pack_price),
      pack_qty: num(f.pack_qty) || null,
      unit: f.unit.trim() || null,
      markup_pct: kind === 'packaging' ? 0 : num(f.markup_pct),
      store: f.store.trim() || null,
      notes: f.notes.trim() || null,
      needs_check: f.needs_check,
    })
    toast({ text: 'Saved' })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="ing-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="ing-title" className="section-title">{item ? item.name : kind === 'packaging' ? 'New packaging item' : 'New ingredient'}</h2>
        {item?.needs_check && (
          <div className="owing-box" style={{ display: 'block', fontWeight: 500 }}>
            {item.notes}
          </div>
        )}
        <div className="field">
          <label htmlFor="in">Name</label>
          <input id="in" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="ip">Price paid (J$)</label>
            <input id="ip" className="input" inputMode="decimal" value={f.pack_price} onChange={(e) => set('pack_price', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="iqty">{kind === 'packaging' ? 'How many in the pack' : 'Amount in the pack'}</label>
            <input id="iqty" className="input" inputMode="decimal" value={f.pack_qty} onChange={(e) => set('pack_qty', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <span className="flabel">Measured in</span>
          <div className="pills" style={{ gap: 8 }}>
            {UNITS.map((u) => (
              <button key={u} type="button" className="pill soft" style={{ minHeight: 44, padding: '0 14px' }} aria-pressed={f.unit === u} onClick={() => set('unit', u)}>
                {u}
              </button>
            ))}
          </div>
        </div>
        {kind === 'ingredient' && (
          <div className="field">
            <label htmlFor="imk">Buffer on top of the price (%)</label>
            <input id="imk" className="input" inputMode="decimal" value={f.markup_pct} onChange={(e) => set('markup_pct', e.target.value)} />
          </div>
        )}
        <div className="kv" style={{ fontWeight: 700 }}>
          <span>Cost per {f.unit || 'unit'}</span>
          <span>{money2(preview)}</span>
        </div>
        <div className="field">
          <label htmlFor="ist">Where she buys it</label>
          <input id="ist" className="input" value={f.store} onChange={(e) => set('store', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="inotes">Notes</label>
          <textarea id="inotes" className="textarea" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        {item?.needs_check && (
          <label className="row" style={{ minHeight: 48, cursor: 'pointer' }}>
            <input type="checkbox" checked={!f.needs_check} onChange={(e) => set('needs_check', !e.target.checked)} style={{ width: 24, height: 24 }} />
            <span>I’ve checked this price and pack size</span>
          </label>
        )}
        <button className="btn btn-primary btn-big btn-block" disabled={!f.name.trim()} onClick={() => void submit()}>
          Save
        </button>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          {item && (
            <button
              className="btn btn-ghost"
              onClick={async () => {
                if (!confirm(`Delete ${item.name}? Costings that use it will show it as missing.`)) return
                await remove('ingredients', item.id)
                onClose()
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- picker

function Picker({ kind, items, onPick, onClose }: { kind: Ingredient['kind']; items: Ingredient[]; onPick: (i: Ingredient) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const list = items.filter((i) => i.kind === kind && (!q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase())))
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Choose an item" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-title">{kind === 'packaging' ? 'Add packaging' : 'Add an ingredient'}</h2>
        <input className="input" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search" />
        <div className="list" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {list.map((i) => (
            <button key={i.id} className="order-row" style={{ background: 'var(--white)', border: '1px solid var(--champagne)', textAlign: 'left', cursor: 'pointer', width: '100%' }} onClick={() => onPick(i)}>
              <div className="main">
                <div className="what">{i.name}</div>
                <div className="sub">
                  {unitCost(i) === null ? 'Needs a pack size' : `${money2(unitCost(i))} per ${i.unit ?? 'unit'}`}
                </div>
              </div>
            </button>
          ))}
          {!list.length && <p className="empty">No match.</p>}
        </div>
        <button className="btn btn-block" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- costing worksheet

type Draft = Pick<CostingRow, 'id' | 'name' | 'product_id' | 'size' | 'recipe_id' | 'lines' | 'packaging' | 'bake_hours' | 'labour_hours' | 'selling_price' | 'notes'>

export function CostingEdit() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const settings = useSettings()
  const items = useIngredients()
  const products = useLiveQuery(async () => (await db.products.orderBy('sort').toArray()).filter((p) => !p.deleted && p.active) as Product[], [])
  const recipes = useLiveQuery(async () => (await db.recipes.orderBy('title').toArray()).filter((r) => !r.deleted) as Recipe[], [])
  const [d, setD] = useState<Draft | null>(
    id ? null : { id: uid(), name: '', product_id: null, size: null, recipe_id: null, lines: [], packaging: [], bake_hours: 1, labour_hours: 1, selling_price: null, notes: null },
  )
  const [picker, setPicker] = useState<Ingredient['kind'] | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (id) void db.costings.get(id).then((c) => c && setD(c))
  }, [id])

  const b = useMemo(() => (d && items ? costIt(d, items.byId, settings) : null), [d, items, settings])
  if (!d || !items || !products || !recipes || !b) return null

  const upd = (ch: Partial<Draft>) => {
    setD({ ...d, ...ch })
    setDirty(true)
  }
  const setLine = (key: 'lines' | 'packaging', i: number, ch: Partial<CostLine>) => upd({ [key]: d[key].map((l, j) => (j === i ? { ...l, ...ch } : l)) })
  const dropLine = (key: 'lines' | 'packaging', i: number) => upd({ [key]: d[key].filter((_, j) => j !== i) })
  const product = products.find((p) => p.id === d.product_id)
  const sell = d.selling_price ?? 0

  async function persist() {
    if (!d || !d.name.trim()) return
    const existing = id ? await db.costings.get(id) : undefined
    const clean = (ls: CostLine[]) => ls.map((l) => ({ ingredient_id: l.ingredient_id, qty: num(String(l.qty)) }))
    await save<CostingRow>('costings', {
      ...(existing ?? {}),
      ...d,
      name: d.name.trim(),
      lines: clean(d.lines),
      packaging: clean(d.packaging),
      bake_hours: num(String(d.bake_hours)),
      labour_hours: num(String(d.labour_hours)),
    })
    setDirty(false)
    toast({ text: 'Costing saved' })
    if (!id) nav(`/costing/${d.id}`, { replace: true })
  }

  const lineRows = (key: 'lines' | 'packaging') =>
    (key === 'lines' ? b.lines : b.packLines).map((r, i) => (
      <div key={`${key}-${i}`} className="row" style={{ gap: 10, padding: '8px 0', borderBottom: '1px solid var(--cream)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{r.ingredient?.name ?? 'Deleted item'}</div>
          <div className="small muted">{r.unit === null ? <span className="owing">Can’t cost: check its pack size</span> : `${money2(r.unit)} per ${r.ingredient?.unit ?? 'unit'}`}</div>
        </div>
        <input
          className="input"
          inputMode="decimal"
          aria-label={`Amount of ${r.ingredient?.name ?? 'item'}`}
          value={String(r.line.qty)}
          onChange={(e) => setLine(key, i, { qty: e.target.value === '' ? 0 : (e.target.value as unknown as number) })}
          onBlur={(e) => setLine(key, i, { qty: num(e.target.value) })}
          style={{ width: 92, minHeight: 48, fontSize: 17, textAlign: 'right' }}
        />
        <span className="small muted" style={{ width: 40 }}>{r.ingredient?.unit ?? ''}</span>
        <span style={{ width: 92, textAlign: 'right', fontWeight: 600 }}>{jmd(r.cost)}</span>
        <button className="icon-btn" aria-label={`Remove ${r.ingredient?.name ?? 'item'}`} onClick={() => dropLine(key, i)}>
          <Icon name="trash" size={18} />
        </button>
      </div>
    ))

  return (
    <div className="page">
      <header className="page-head" style={{ justifyContent: 'flex-start' }}>
        <Link to="/costing" className="icon-btn" aria-label="Back to costing">
          <Icon name="back" size={22} />
        </Link>
        <h1 className="title">{id ? d.name || 'Costing' : 'New costing'}</h1>
      </header>

      <div className="form-layout">
        <div className="stack">
          <div className="two">
            <div className="field">
              <label htmlFor="cn">Name</label>
              <input id="cn" className="input" value={d.name} onChange={(e) => upd({ name: e.target.value })} placeholder="e.g. Strawberry cheesecake" />
            </div>
            <div className="field">
              <label htmlFor="csz">Size or batch</label>
              <input id="csz" className="input" value={d.size ?? ''} onChange={(e) => upd({ size: e.target.value || null })} placeholder={'e.g. 9" or 12 cupcakes'} />
            </div>
          </div>
          <div className="field">
            <span className="flabel">Menu product (links this costing to new orders)</span>
            <div className="pills">
              <button type="button" className="pill soft" aria-pressed={!d.product_id} onClick={() => upd({ product_id: null })}>None</button>
              {products.map((p) => (
                <button key={p.id} type="button" className="pill soft" aria-pressed={d.product_id === p.id} onClick={() => upd({ product_id: p.id })}>
                  {p.name}
                </button>
              ))}
            </div>
            {product && product.sizes.length > 0 && (
              <div className="pills" style={{ marginTop: 6 }}>
                {product.sizes.map((s) => (
                  <button key={s} type="button" className="pill soft" aria-pressed={d.size === s} onClick={() => upd({ size: s })}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <section className="card">
            <div className="row between">
              <h2 className="label-caps">Ingredients</h2>
              <button className="btn btn-ghost" onClick={() => setPicker('ingredient')}>
                <Icon name="plus" size={18} /> Add
              </button>
            </div>
            {d.lines.length ? lineRows('lines') : <p className="small muted">No ingredients yet.</p>}
          </section>

          <section className="card">
            <div className="row between">
              <h2 className="label-caps">Packaging</h2>
              <button className="btn btn-ghost" onClick={() => setPicker('packaging')}>
                <Icon name="plus" size={18} /> Add
              </button>
            </div>
            {d.packaging.length ? lineRows('packaging') : <p className="small muted">No packaging yet.</p>}
          </section>

          <div className="two">
            <div className="field">
              <label htmlFor="bh">Oven time (hours)</label>
              <input id="bh" className="input" inputMode="decimal" value={String(d.bake_hours)} onChange={(e) => upd({ bake_hours: e.target.value as unknown as number })} onBlur={(e) => upd({ bake_hours: num(e.target.value) })} />
              <span className="small muted">Gas: {jmd(gasPerHour(settings))} per hour</span>
            </div>
            <div className="field">
              <label htmlFor="lh">Her working time (hours)</label>
              <input id="lh" className="input" inputMode="decimal" value={String(d.labour_hours)} onChange={(e) => upd({ labour_hours: e.target.value as unknown as number })} onBlur={(e) => upd({ labour_hours: num(e.target.value) })} />
              <span className="small muted">Labour: {jmd(settings.labour_rate)} per hour</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="rc">Recipe</label>
            <select id="rc" className="select" value={d.recipe_id ?? ''} onChange={(e) => upd({ recipe_id: e.target.value || null })}>
              <option value="">None</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
            {d.recipe_id && <Link to={`/recipes/${d.recipe_id}`} className="small">Open recipe</Link>}
          </div>
          <div className="field">
            <label htmlFor="cnotes">Notes</label>
            <textarea id="cnotes" className="textarea" value={d.notes ?? ''} onChange={(e) => upd({ notes: e.target.value || null })} />
          </div>
        </div>

        <aside className="card price-panel stack" aria-label="Cost breakdown" style={{ gap: 12 }}>
          <h2 className="section-title">What it costs</h2>
          <div>
            <div className="kv"><span className="muted">Ingredients</span><span>{jmd(b.ingredients)}</span></div>
            <div className="kv"><span className="muted">Overhead ({overheadPct(settings)}%)</span><span>{jmd(b.overhead)}</span></div>
            <div className="kv"><span className="muted">Gas ({d.bake_hours || 0} hr)</span><span>{jmd(b.gas)}</span></div>
            <div className="kv"><span className="muted">Labour ({d.labour_hours || 0} hr)</span><span>{jmd(b.labour)}</span></div>
            <div className="kv"><span className="muted">Packaging</span><span>{jmd(b.packaging)}</span></div>
          </div>
          <div className="total-box">
            <div className="kv" style={{ fontWeight: 700 }}><span>Cost before profit</span><span>{jmd(b.cbp)}</span></div>
            <div className="kv"><span className="muted">Profit ({settings.margin_pct}%)</span><span>{jmd(b.profit)}</span></div>
            <div className="kv" style={{ fontWeight: 700, fontSize: 20, color: '#8e1239' }}><span>Suggested price</span><span>{money2(b.price)}</span></div>
            <div className="kv small muted"><span>Rounded up</span><span>{jmd(roundPrice(b.price))}</span></div>
          </div>
          {b.missing > 0 && <p className="owing small" style={{ margin: 0 }}>{b.missing} line{b.missing > 1 ? 's' : ''} can’t be costed until the pack size is fixed, so the real cost is higher.</p>}
          <div className="field">
            <label htmlFor="sp">What she charges now (J$)</label>
            <input id="sp" className="input" inputMode="numeric" value={d.selling_price ?? ''} onChange={(e) => upd({ selling_price: e.target.value ? num(e.target.value) : null })} placeholder="optional" />
          </div>
          {sell > 0 &&
            (sell < b.cbp ? (
              <div className="owing-box"><span>Below cost by</span><span>{jmd(b.cbp - sell)}</span></div>
            ) : (
              <div className="paid-box"><span>Profit at this price</span><span>{jmd(sell - b.cbp)} ({Math.round(((sell - b.cbp) / b.cbp) * 100)}%)</span></div>
            ))}
          <button className="btn btn-primary btn-big btn-block" disabled={!d.name.trim()} onClick={() => void persist()}>
            {dirty || !id ? 'Save costing' : 'Saved'}
          </button>
          {id && (
            <button
              className="btn btn-ghost"
              onClick={async () => {
                if (!confirm('Delete this costing?')) return
                await remove('costings', d.id)
                nav('/costing', { replace: true })
              }}
            >
              Delete costing
            </button>
          )}
        </aside>
      </div>

      {picker && (
        <Picker
          kind={picker}
          items={items.list}
          onClose={() => setPicker(null)}
          onPick={(i) => {
            const key = picker === 'packaging' ? 'packaging' : 'lines'
            upd({ [key]: [...d[key], { ingredient_id: i.id, qty: 1 }] })
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}
