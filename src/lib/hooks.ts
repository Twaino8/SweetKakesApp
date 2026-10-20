import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { db } from './db'
import { DEFAULT_SETTINGS } from './repo'
import { supabase } from './supabase'
import { subscribeSync, type SyncState } from './sync'
import type { Costing, Customer, Ingredient, Order, OrderItem, Payment, Settings } from './types'

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

export function useSyncState() {
  const [s, setS] = useState<SyncState | null>(null)
  useEffect(() => subscribeSync(setS), [])
  return s
}

export function useSettings(): Settings {
  const row = useLiveQuery(() => db.settings.toCollection().first(), [])
  // Fill in any setting this device has not received yet with its default
  return { id: '', updated_at: '', deleted: false, ...DEFAULT_SETTINGS, ...(row ?? {}) } as Settings
}

export interface OrderView {
  order: Order
  customer?: Customer
  items: OrderItem[]
  payments: Payment[]
}

/** All live orders with their customer, items and payments, joined on the device. */
export function useOrderViews(filter?: (o: Order) => boolean): OrderView[] | undefined {
  return useLiveQuery(async () => {
    const [orders, customers, items, payments] = await Promise.all([
      db.orders.toArray(),
      db.customers.toArray(),
      db.order_items.toArray(),
      db.payments.toArray(),
    ])
    const cust = new Map(customers.map((c) => [c.id, c]))
    const byOrder = <T extends { order_id: string; deleted: boolean }>(rows: T[]) => {
      const m = new Map<string, T[]>()
      for (const r of rows) if (!r.deleted) m.set(r.order_id, [...(m.get(r.order_id) ?? []), r])
      return m
    }
    const it = byOrder(items)
    const pay = byOrder(payments)
    return orders
      .filter((o) => !o.deleted && (!filter || filter(o)))
      .sort((a, b) => a.due_at.localeCompare(b.due_at))
      .map((o) => ({
        order: o,
        customer: o.customer_id ? cust.get(o.customer_id) : undefined,
        items: it.get(o.id) ?? [],
        payments: pay.get(o.id) ?? [],
      }))
  }, [filter])
}

export function orderTitle(items: OrderItem[]) {
  if (!items.length) return 'Order'
  const first = items[0]
  const head = `${first.name}${first.size ? ` ${first.size}` : ''}${first.quantity > 1 ? ` × ${first.quantity}` : ''}`
  return items.length > 1 ? `${head} + ${items.length - 1} more` : head
}

/** Every live ingredient and packaging item, by id. */
export function useIngredients() {
  return useLiveQuery(async () => {
    const all = (await db.ingredients.toArray()).filter((i) => !i.deleted)
    all.sort((a, b) => a.name.localeCompare(b.name))
    return { list: all, byId: new Map(all.map((i) => [i.id, i] as [string, Ingredient])) }
  }, [])
}

export function useCostings() {
  return useLiveQuery(async () => (await db.costings.toArray()).filter((c) => !c.deleted).sort((a, b) => a.name.localeCompare(b.name)) as Costing[], [])
}
