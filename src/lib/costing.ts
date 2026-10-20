import type { Costing, CostLine, Ingredient, Settings } from './types'

/**
 * Costing follows her SKT Price list spreadsheet exactly:
 *   ingredient line   = qty × (pack price ÷ pack size) × (1 + buffer %)
 *   overhead          = ingredients × sum of overhead %   (83% in her sheet)
 *   gas               = bake hours × lb per hour × (cylinder price ÷ cylinder lb)
 *   labour            = labour hours × labour rate
 *   packaging         = qty × (pack price ÷ pack size)    (no buffer)
 *   cost before profit = ingredients + overhead + gas + labour + packaging
 *   suggested price    = cost before profit × (1 + profit %)
 */

export function unitCost(i: Ingredient | undefined): number | null {
  if (!i || !i.pack_qty || i.pack_qty <= 0) return null
  const base = Number(i.pack_price) / Number(i.pack_qty)
  return i.kind === 'packaging' ? base : base * (1 + Number(i.markup_pct || 0) / 100)
}

export function overheadPct(s: Settings) {
  return (s.overhead ?? []).reduce((t, o) => t + Number(o.pct || 0), 0)
}

export function gasPerHour(s: Settings) {
  if (!s.gas_cylinder_lb) return 0
  return Number(s.gas_lb_per_hour || 0) * (Number(s.gas_cylinder_price || 0) / Number(s.gas_cylinder_lb))
}

export interface LineResult {
  line: CostLine
  ingredient?: Ingredient
  unit: number | null
  cost: number
}

export interface CostBreakdown {
  lines: LineResult[]
  packLines: LineResult[]
  ingredients: number
  overhead: number
  gas: number
  labour: number
  packaging: number
  cbp: number
  profit: number
  price: number
  /** Lines that could not be costed (missing ingredient or pack size). */
  missing: number
}

export function costIt(c: Pick<Costing, 'lines' | 'packaging' | 'bake_hours' | 'labour_hours'>, items: Map<string, Ingredient>, s: Settings): CostBreakdown {
  let missing = 0
  const run = (ls: CostLine[]) =>
    (ls ?? []).map((line) => {
      const ingredient = items.get(line.ingredient_id)
      const unit = unitCost(ingredient)
      if (unit === null) missing++
      return { line, ingredient, unit, cost: unit === null ? 0 : unit * Number(line.qty || 0) }
    })
  const lines = run(c.lines)
  const packLines = run(c.packaging)
  const ingredients = lines.reduce((t, l) => t + l.cost, 0)
  const packaging = packLines.reduce((t, l) => t + l.cost, 0)
  const overhead = (ingredients * overheadPct(s)) / 100
  const gas = Number(c.bake_hours || 0) * gasPerHour(s)
  const labour = Number(c.labour_hours || 0) * Number(s.labour_rate || 0)
  const cbp = ingredients + overhead + gas + labour + packaging
  const profit = (cbp * Number(s.margin_pct || 0)) / 100
  return { lines, packLines, ingredients, overhead, gas, labour, packaging, cbp, profit, price: cbp + profit, missing }
}

/** Round a suggested price up to the nearest J$50, the way a menu price would be set. */
export function roundPrice(n: number) {
  return Math.ceil(n / 50) * 50
}
