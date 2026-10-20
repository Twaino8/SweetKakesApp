import { db, getMeta, setMeta, SYNCED_TABLES, type SyncedTable } from './db'
import { PHOTO_BUCKET, supabase } from './supabase'
import type { SyncRow } from './types'

export type SyncState = {
  phase: 'idle' | 'syncing' | 'offline' | 'error' | 'signed-out'
  lastSynced: string | null
  pending: number
  message?: string
}

let state: SyncState = { phase: 'idle', lastSynced: null, pending: 0 }
const listeners = new Set<(s: SyncState) => void>()

function emit(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l(state))
}

export function subscribeSync(fn: (s: SyncState) => void) {
  listeners.add(fn)
  fn(state)
  return () => {
    listeners.delete(fn)
  }
}

async function countPending() {
  let n = await db.pending_photos.count()
  for (const t of SYNCED_TABLES) n += await db.table(t).where('dirty').equals(1).count()
  return n
}

export async function refreshPending() {
  emit({ pending: await countPending() })
}

function stripLocal<T extends SyncRow>(row: T) {
  const copy = { ...row } as Record<string, unknown>
  delete copy.dirty
  return copy
}

async function pushTable(table: SyncedTable, ownerId: string) {
  const rows = (await db.table(table).where('dirty').equals(1).toArray()) as SyncRow[]
  if (!rows.length) return
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    const { error } = await supabase
      .from(table)
      .upsert(batch.map((r) => ({ ...stripLocal(r), owner_id: ownerId })), { onConflict: 'id' })
    if (error) throw new Error(`${table}: ${error.message}`)
    // Clear the flag only if the row was not edited again while uploading
    await db.transaction('rw', db.table(table), async () => {
      for (const r of batch) {
        const now = (await db.table(table).get(r.id)) as SyncRow | undefined
        if (now && now.updated_at === r.updated_at) await db.table(table).update(r.id, { dirty: 0 })
      }
    })
  }
}

async function pullTable(table: SyncedTable) {
  const key = `cursor:${table}`
  let cursor = (await getMeta(key)) ?? '1970-01-01T00:00:00Z'
  // Overlap a few seconds so a slow write committed just before the cursor is not missed
  const since = new Date(new Date(cursor).getTime() - 5000).toISOString()
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('synced_at', since)
      .order('synced_at', { ascending: true })
      .range(from, from + 499)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    await db.transaction('rw', db.table(table), async () => {
      for (const remote of data as (SyncRow & { synced_at: string })[]) {
        if (Date.parse(remote.synced_at) > Date.parse(cursor)) cursor = remote.synced_at
        const local = (await db.table(table).get(remote.id)) as SyncRow | undefined
        // A newer unsent edit on this device wins; it will be pushed next round
        if (local?.dirty && Date.parse(local.updated_at) > Date.parse(remote.updated_at)) continue
        const row: Record<string, unknown> = { ...remote, dirty: 0 }
        delete row.synced_at
        await db.table(table).put(row)
      }
    })
    if (data.length < 500) break
    from += 500
  }
  await setMeta(key, cursor)
}

async function pushPhotos() {
  const pending = await db.pending_photos.toArray()
  for (const p of pending) {
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(p.path, p.blob, { contentType: p.blob.type || 'image/jpeg', upsert: false })
    // A retry after a dropped connection may find the photo already uploaded; that counts as done
    if (error && !/exists|duplicate/i.test(error.message)) throw new Error(`photo: ${error.message}`)
    await db.cached_photos.put({ path: p.path, blob: p.blob })
    await db.pending_photos.delete(p.path)
  }
}

let running: Promise<void> | null = null
let again = false

/** Push local changes, then pull everything newer. Safe to call often. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await syncOnce()
    } while (again)
  })().finally(() => {
    running = null
  })
  return running
}

async function syncOnce() {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) {
    emit({ phase: 'signed-out', pending: await countPending() })
    return
  }
  if (!navigator.onLine) {
    emit({ phase: 'offline', pending: await countPending() })
    return
  }
  emit({ phase: 'syncing' })
  try {
    await pushPhotos()
    for (const t of SYNCED_TABLES) await pushTable(t, user.id)
    for (const t of SYNCED_TABLES) await pullTable(t)
    const now = new Date().toISOString()
    await setMeta('lastSynced', now)
    emit({ phase: 'idle', lastSynced: now, pending: await countPending(), message: undefined })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    emit({
      phase: navigator.onLine ? 'error' : 'offline',
      message,
      pending: await countPending(),
    })
  }
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Called after every local save: sync a moment later, batching quick edits together. */
export function scheduleSync() {
  void refreshPending()
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), 1500)
}

export async function startSyncLoop() {
  emit({ lastSynced: (await getMeta('lastSynced')) ?? null })
  window.addEventListener('online', () => void syncNow())
  window.addEventListener('offline', () => emit({ phase: 'offline' }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow()
  }, 60_000)
  void syncNow()
}

/** Remove every local row, used when signing out on a shared device. */
export async function clearLocalData() {
  await db.delete()
  await db.open()
}
