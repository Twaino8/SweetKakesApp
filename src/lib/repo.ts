import { db, type SyncedTable } from './db'
import { scheduleSync } from './sync'
import { supabase } from './supabase'
import type { Order, OrderItem, OrderPhoto, Payment, Product, Settings, SyncRow } from './types'

export const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

/** Save a row on the device and queue it for sync. */
export async function save<T extends SyncRow>(table: SyncedTable, row: Omit<T, 'updated_at' | 'deleted' | 'dirty'> & Partial<SyncRow>) {
  const full = { deleted: false, ...row, updated_at: now(), dirty: 1 as const }
  await db.table(table).put(full)
  scheduleSync()
  return full as unknown as T
}

export async function patch<T extends SyncRow>(table: SyncedTable, id: string, changes: Partial<T>) {
  const current = await db.table(table).get(id)
  if (!current) return
  await db.table(table).put({ ...current, ...changes, updated_at: now(), dirty: 1 })
  scheduleSync()
}

export async function remove(table: SyncedTable, id: string) {
  await patch(table, id, { deleted: true })
}

// ---------- settings ----------

export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updated_at' | 'deleted'> = {
  business_name: 'Sweet Kakes n Treats',
  tagline: 'Homemade goodness in every bite',
  phone: null,
  bank_name: null,
  bank_account_name: null,
  deposit_pct: 60,
  deposit_note: 'Deposits are non-refundable.',
  labour_rate: 0,
  margin_pct: 0,
  gct_enabled: false,
  gct_pct: 15,
  day_hours: 8,
  delivery_zones: [
    { id: 'kingston', name: 'Kingston', min: 500, max: 700 },
    { id: 'outside', name: 'Outside Kingston (Portmore, Spanish Town)', min: 800, max: 900 },
  ],
  overhead: [
    { name: 'Depreciation', pct: 10 },
    { name: 'Electricity', pct: 10 },
    { name: 'Water', pct: 12 },
    { name: 'Rent', pct: 1 },
    { name: 'Traveling', pct: 20 },
    { name: 'Consultation', pct: 30 },
  ],
  gas_cylinder_price: 5500,
  gas_cylinder_lb: 30,
  gas_lb_per_hour: 0.4,
}

export async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** A stable id per user and name, so starter rows made on two devices are the same row. */
async function stableId(seed: string) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed))).slice(0, 16)
  h[6] = (h[6] & 0x0f) | 0x50
  h[8] = (h[8] & 0x3f) | 0x80
  const x = [...h].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`
}

/**
 * First run on a device: settings and starter products. They carry an old timestamp, so if the
 * server already has her real settings or edited products, the server's newer copy always wins.
 */
export async function ensureStarterData() {
  const userId = await currentUserId()
  if (!userId) return
  const OLD = '2000-01-01T00:00:00.000Z'
  if (!(await db.settings.get(userId))) {
    await db.settings.put({ id: userId, ...DEFAULT_SETTINGS, deleted: false, updated_at: OLD, dirty: 1 })
  }
  if ((await db.products.count()) === 0) {
    const cake = ['6"', '7"', '8"', '9"', '10"']
    const starters: [string, Product['line'], string[]][] = [
      ['Cheesecake', 'menu', cake],
      ['Fruit cake', 'seasonal', cake],
      ['Cupcakes', 'menu', []],
      ['Banana bread', 'menu', []],
      ['Custom cake', 'custom', cake],
    ]
    let sort = 1
    for (const [name, line, sizes] of starters) {
      await db.products.put({
        id: await stableId(`${userId}:product:${name}`),
        name, line, sizes, base_price: null, prep_minutes: 60, bake_minutes: 60, active: true, sort: sort++,
        deleted: false, updated_at: OLD, dirty: 1,
      })
    }
  }
  scheduleSync()
}

// ---------- orders ----------

export function newOrderNo() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const tail = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${mm}${dd}-${tail}`
}

export interface OrderSummary {
  total: number
  gct: number
  paid: number
  balance: number
  depositDue: number
  workMinutes: number
}

export function summarize(order: Order, items: OrderItem[], payments: Payment[], settings?: Settings): OrderSummary {
  const live = (r: SyncRow) => !r.deleted
  const gct = settings?.gct_enabled ? Math.round((order.price * (settings.gct_pct ?? 0)) / 100) : 0
  const total = (order.price || 0) + gct + (order.delivery_fee || 0)
  const paid = payments.filter(live).reduce((s, p) => s + Number(p.amount || 0), 0)
  const depositDue = Math.round((total * (order.deposit_pct ?? 60)) / 100)
  const workMinutes = items.filter(live).reduce((s, i) => s + (i.work_minutes || 0) * Math.max(1, itemsWorkUnits(i)), 0)
  return { total, gct, paid, balance: Math.max(0, total - paid), depositDue, workMinutes }
}

/** Work units: each item line is one bake (about 1 hr prep + 1 hr bake), whatever the quantity. */
function itemsWorkUnits(_i: OrderItem) {
  return 1
}

export async function loadOrderBundle(orderId: string) {
  const [order, items, payments, photos] = await Promise.all([
    db.orders.get(orderId),
    db.order_items.where('order_id').equals(orderId).toArray(),
    db.payments.where('order_id').equals(orderId).toArray(),
    db.order_photos.where('order_id').equals(orderId).toArray(),
  ])
  return {
    order,
    items: items.filter((i) => !i.deleted),
    payments: payments.filter((p) => !p.deleted).sort((a, b) => a.paid_at.localeCompare(b.paid_at)),
    photos: photos.filter((p) => !p.deleted),
  }
}

export async function addPhoto(orderId: string, file: File) {
  const userId = await currentUserId()
  const blob = await compressImage(file)
  const path = `${userId ?? 'local'}/${orderId}/${uid()}.jpg`
  await db.pending_photos.put({ path, blob })
  await db.cached_photos.put({ path, blob })
  await save<OrderPhoto>('order_photos', { id: uid(), order_id: orderId, path })
}

/** Shrink a photo to at most 1600 px on its long side as JPEG, to save data and storage. */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.8))
  } catch {
    return file
  }
}

export async function photoUrl(path: string): Promise<string | null> {
  const cached = await db.cached_photos.get(path)
  if (cached) return URL.createObjectURL(cached.blob)
  if (!navigator.onLine) return null
  const { data, error } = await supabase.storage.from('order-photos').download(path)
  if (error || !data) return null
  await db.cached_photos.put({ path, blob: data })
  return URL.createObjectURL(data)
}
