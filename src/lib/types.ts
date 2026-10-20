export type Status =
  | 'enquiry'
  | 'confirmed'
  | 'baking'
  | 'decorating'
  | 'ready'
  | 'collected'
  | 'cancelled'

export const STATUS_FLOW: Status[] = ['enquiry', 'confirmed', 'baking', 'decorating', 'ready', 'collected']

export const STATUS_LABEL: Record<Status, string> = {
  enquiry: 'Enquiry',
  confirmed: 'Confirmed',
  baking: 'Baking',
  decorating: 'Decorating',
  ready: 'Ready',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

export type Handover = 'pickup' | 'kingston' | 'outside'

/** Columns every synced row carries. `dirty` exists only on the device. */
export interface SyncRow {
  id: string
  owner_id?: string
  updated_at: string
  deleted: boolean
  dirty?: 0 | 1
}

export interface DeliveryZone {
  id: 'kingston' | 'outside'
  name: string
  min: number
  max: number
}

export interface Settings extends SyncRow {
  business_name: string
  tagline: string | null
  phone: string | null
  bank_name: string | null
  bank_account_name: string | null
  deposit_pct: number
  labour_rate: number
  margin_pct: number
  gct_enabled: boolean
  gct_pct: number
  day_hours: number
  delivery_zones: DeliveryZone[]
  overhead: OverheadItem[]
  gas_cylinder_price: number
  gas_cylinder_lb: number
  gas_lb_per_hour: number
}

export interface OverheadItem {
  name: string
  pct: number
}

/** Anything she buys: ingredients (costed with a buffer) and packaging (costed at plain price). */
export interface Ingredient extends SyncRow {
  kind: 'ingredient' | 'packaging'
  name: string
  pack_price: number
  pack_qty: number | null
  unit: string | null
  markup_pct: number
  store: string | null
  notes: string | null
  needs_check: boolean
}

export interface CostLine {
  ingredient_id: string
  qty: number
}

/** A costing worksheet for one cake or batch. */
export interface Costing extends SyncRow {
  name: string
  product_id: string | null
  size: string | null
  recipe_id: string | null
  lines: CostLine[]
  packaging: CostLine[]
  bake_hours: number
  labour_hours: number
  selling_price: number | null
  notes: string | null
}

export interface Customer extends SyncRow {
  name: string
  phone: string | null
  notes: string | null
}

export interface Product extends SyncRow {
  name: string
  line: 'menu' | 'custom' | 'seasonal'
  sizes: string[]
  base_price: number | null
  prep_minutes: number
  bake_minutes: number
  active: boolean
  sort: number
}

export interface Order extends SyncRow {
  order_no: string
  customer_id: string | null
  due_at: string
  status: Status
  handover: Handover
  delivery_address: string | null
  delivery_fee: number
  price: number
  deposit_pct: number
  notes: string | null
}

export interface OrderItem extends SyncRow {
  order_id: string
  product_id: string | null
  name: string
  size: string | null
  quantity: number
  notes: string | null
  work_minutes: number
}

export interface Payment extends SyncRow {
  order_id: string
  amount: number
  method: 'bank' | 'cash'
  kind: 'deposit' | 'balance' | 'other'
  paid_at: string
}

export interface OrderPhoto extends SyncRow {
  order_id: string
  path: string
}

export interface Recipe extends SyncRow {
  title: string
  category: string | null
  ingredients: string | null
  method: string | null
  notes: string | null
}

/** A photo taken on this device, kept until it has been uploaded. */
export interface PendingPhoto {
  path: string
  blob: Blob
}

/** Photos downloaded for offline viewing. */
export interface CachedPhoto {
  path: string
  blob: Blob
}
