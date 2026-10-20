import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { db } from '../lib/db'
import { save, uid } from '../lib/repo'
import type { Recipe } from '../lib/types'

const ORDER = ['Cheesecakes', 'Cakes & breads', 'Cupcakes & muffins', 'Pies & pastries', 'Cookies', 'Icings & toppings']

async function importBook() {
  const { default: book } = await import('../data/recipes.json')
  const existing = new Set((await db.recipes.toArray()).map((r) => r.title.toLowerCase()))
  let n = 0
  for (const r of book as { title: string; category: string; ingredients: string; method: string }[]) {
    if (existing.has(r.title.toLowerCase())) continue
    await save<Recipe>('recipes', { id: uid(), title: r.title, category: r.category, ingredients: r.ingredients, method: r.method, notes: null })
    n++
  }
  return n
}

export function Recipes() {
  const recipes = useLiveQuery(async () => (await db.recipes.orderBy('title').toArray()).filter((r) => !r.deleted), [])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const list = (recipes ?? []).filter((r) => !query || r.title.toLowerCase().includes(query) || (r.ingredients ?? '').toLowerCase().includes(query))
    const m = new Map<string, Recipe[]>()
    for (const r of list) m.set(r.category ?? 'Other', [...(m.get(r.category ?? 'Other') ?? []), r])
    return [...m.entries()].sort((a, b) => (ORDER.indexOf(a[0]) + 99) % 99 - (ORDER.indexOf(b[0]) + 99) % 99)
  }, [recipes, q])

  if (!recipes) return null

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <h1 className="title">Recipes</h1>
        <Link to="/recipes/new" className="btn btn-primary">
          <Icon name="plus" size={20} stroke={2.5} /> Add recipe
        </Link>
      </header>

      {recipes.length === 0 ? (
        <section className="card stack" style={{ textAlign: 'center' }}>
          <h2 className="section-title">Your recipe book</h2>
          <p className="muted" style={{ margin: 0 }}>Load the 47 recipes from “cake book97” — cheesecakes, fruit cake, cupcakes, pies, icings and more. You can edit any of them afterwards.</p>
          <button
            className="btn btn-primary btn-big"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const n = await importBook()
              setBusy(false)
              toast({ text: `${n} recipes added` })
            }}
          >
            {busy ? 'Loading…' : 'Load recipe book'}
          </button>
        </section>
      ) : (
        <>
          <label htmlFor="rq" className="sr-only">Search recipes</label>
          <input id="rq" className="input" type="search" placeholder="Search recipes or ingredients" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 20 }} />
          <div className="stack">
            {groups.map(([cat, rs]) => (
              <section key={cat}>
                <h2 className="section-title" style={{ marginBottom: 10 }}>{cat}</h2>
                <div className="list">
                  {rs.map((r) => (
                    <Link key={r.id} to={`/recipes/${r.id}`} className="order-row" style={{ background: 'var(--white)', border: '1px solid var(--champagne)', minHeight: 56 }}>
                      <span className="what" style={{ flex: 1 }}>{r.title}</span>
                      <Icon name="chevronRight" size={20} />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            {!groups.length && <p className="empty">No recipes match.</p>}
          </div>
        </>
      )}
    </div>
  )
}

/** Keep the screen on while a recipe is open, so it doesn't lock mid-bake. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const get = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        /* not supported or not allowed */
      }
    }
    void get()
    const onVis = () => document.visibilityState === 'visible' && void get()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [])
}

export function RecipeView() {
  const { id } = useParams()
  const r = useLiveQuery(() => (id ? db.recipes.get(id) : undefined), [id])
  useWakeLock()
  if (!r) return null
  return (
    <div className="page page-narrow stack">
      <header className="row between" style={{ flexWrap: 'wrap' }}>
        <div className="row">
          <Link to="/recipes" className="icon-btn" aria-label="Back to recipes">
            <Icon name="back" size={22} />
          </Link>
          <div>
            <div className="eyebrow">{r.category}</div>
            <h1 className="title">{r.title}</h1>
          </div>
        </div>
        <Link to={`/recipes/${r.id}/edit`} className="btn">
          <Icon name="edit" size={20} /> Edit
        </Link>
      </header>
      {r.ingredients && (
        <section className="card">
          <h2 className="label-caps" style={{ marginBottom: 10 }}>Ingredients</h2>
          <div className="recipe-text">{r.ingredients}</div>
        </section>
      )}
      {r.method && (
        <section className="card">
          <h2 className="label-caps" style={{ marginBottom: 10 }}>Method</h2>
          <div className="recipe-text">{r.method}</div>
        </section>
      )}
      {r.notes && (
        <section className="card">
          <h2 className="label-caps" style={{ marginBottom: 10 }}>Notes</h2>
          <div className="recipe-text">{r.notes}</div>
        </section>
      )}
      <p className="small muted" style={{ textAlign: 'center' }}>The screen stays on while this recipe is open.</p>
    </div>
  )
}

export function RecipeEdit() {
  const { id } = useParams()
  const nav = useNavigate()
  const [r, setR] = useState<Pick<Recipe, 'id' | 'title' | 'category' | 'ingredients' | 'method' | 'notes'> | null>(id ? null : { id: uid(), title: '', category: 'Cakes & breads', ingredients: '', method: '', notes: '' })

  useEffect(() => {
    if (id) void db.recipes.get(id).then((x) => x && setR(x))
  }, [id])
  if (!r) return null
  const set = (k: keyof typeof r, v: string) => setR({ ...r, [k]: v })

  return (
    <div className="page page-narrow stack">
      <header className="row">
        <Link to={id ? `/recipes/${id}` : '/recipes'} className="icon-btn" aria-label="Back">
          <Icon name="back" size={22} />
        </Link>
        <h1 className="title">{id ? 'Edit recipe' : 'New recipe'}</h1>
      </header>
      <div className="field">
        <label htmlFor="rt">Name</label>
        <input id="rt" className="input" value={r.title} onChange={(e) => set('title', e.target.value)} />
      </div>
      <div className="field">
        <span className="flabel">Category</span>
        <div className="pills">
          {ORDER.map((c) => (
            <button key={c} type="button" className="pill soft" aria-pressed={r.category === c} onClick={() => set('category', c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="ri">Ingredients (one per line)</label>
        <textarea id="ri" className="textarea" rows={10} value={r.ingredients ?? ''} onChange={(e) => set('ingredients', e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="rm">Method</label>
        <textarea id="rm" className="textarea" rows={10} value={r.method ?? ''} onChange={(e) => set('method', e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="rn">Notes</label>
        <textarea id="rn" className="textarea" rows={3} value={r.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <button
        className="btn btn-primary btn-big"
        disabled={!r.title.trim()}
        onClick={async () => {
          const existing = id ? await db.recipes.get(id) : undefined
          await save<Recipe>('recipes', { ...(existing ?? {}), ...r, title: r.title.trim() })
          nav(`/recipes/${r.id}`, { replace: true })
        }}
      >
        Save recipe
      </button>
    </div>
  )
}
