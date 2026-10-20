import Dexie, { type EntityTable } from 'dexie'
import type {
  CachedPhoto,
  Customer,
  Order,
  OrderItem,
  OrderPhoto,
  Payment,
  PendingPhoto,
  Product,
  Recipe,
  Settings,
} from './types'

export interface Meta {
  key: string
  value: string
}

/** The on-device database. The app reads and writes only here; sync.ts moves rows to and from Supabase. */
export const db = new Dexie('sweet-kakes') as Dexie & {
  settings: EntityTable<Settings, 'id'>
  customers: EntityTable<Customer, 'id'>
  products: EntityTable<Product, 'id'>
  orders: EntityTable<Order, 'id'>
  order_items: EntityTable<OrderItem, 'id'>
  payments: EntityTable<Payment, 'id'>
  order_photos: EntityTable<OrderPhoto, 'id'>
  recipes: EntityTable<Recipe, 'id'>
  pending_photos: EntityTable<PendingPhoto, 'path'>
  cached_photos: EntityTable<CachedPhoto, 'path'>
  meta: EntityTable<Meta, 'key'>
}

db.version(1).stores({
  settings: 'id, dirty',
  customers: 'id, dirty, name, phone',
  products: 'id, dirty, sort',
  orders: 'id, dirty, due_at, status, customer_id',
  order_items: 'id, dirty, order_id',
  payments: 'id, dirty, order_id, paid_at',
  order_photos: 'id, dirty, order_id',
  recipes: 'id, dirty, title',
  pending_photos: 'path',
  cached_photos: 'path',
  meta: 'key',
})

export const SYNCED_TABLES = [
  'settings',
  'customers',
  'products',
  'orders',
  'order_items',
  'payments',
  'order_photos',
  'recipes',
] as const

export type SyncedTable = (typeof SYNCED_TABLES)[number]

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.meta.get(key))?.value
}

export async function setMeta(key: string, value: string) {
  await db.meta.put({ key, value })
}
