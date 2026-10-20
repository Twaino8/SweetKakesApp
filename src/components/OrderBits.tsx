import { Link } from 'react-router-dom'
import { jmd, relDay, timeOf } from '../lib/format'
import { orderTitle, type OrderView } from '../lib/hooks'
import { patch, summarize } from '../lib/repo'
import { STATUS_FLOW, STATUS_LABEL, type Order, type Settings, type Status } from '../lib/types'
import { useToast } from './Toast'

export function StatusChip({ status }: { status: Status }) {
  return <span className={`chip st-${status}`}>{STATUS_LABEL[status]}</span>
}

export function nextStatus(s: Status): Status | null {
  const i = STATUS_FLOW.indexOf(s)
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null
}

export function useAdvance() {
  const toast = useToast()
  return async (order: Order, to?: Status) => {
    const target = to ?? nextStatus(order.status)
    if (!target) return
    const from = order.status
    await patch<Order>('orders', order.id, { status: target })
    toast({
      text: `Moved to ${STATUS_LABEL[target]}`,
      undo: () => void patch<Order>('orders', order.id, { status: from }),
    })
  }
}

export function MoneyLine({ v, settings }: { v: OrderView; settings: Settings }) {
  const s = summarize(v.order, v.items, v.payments, settings)
  if (s.total === 0) return <span className="muted">No price yet</span>
  if (s.balance === 0) return <span className="paid">Paid in full</span>
  if (s.paid === 0) return <span className="owing">Deposit {jmd(s.depositDue)} due</span>
  return <span className="owing">{jmd(s.balance)} owing</span>
}

const HANDOVER: Record<string, string> = { pickup: 'Pickup', kingston: 'Delivery, Kingston', outside: 'Delivery, outside Kingston' }

export function OrderRow({
  v,
  settings,
  showDay = false,
  selected = false,
  advance = true,
}: {
  v: OrderView
  settings: Settings
  showDay?: boolean
  selected?: boolean
  advance?: boolean
}) {
  const go = useAdvance()
  const next = nextStatus(v.order.status)
  return (
    <div className={`order-row${selected ? ' selected' : ''}`}>
      <Link to={`/orders/${v.order.id}`} className="row" style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit', gap: 14 }}>
        <div className="time">
          {showDay && <div className="small muted" style={{ fontWeight: 500 }}>{relDay(v.order.due_at)}</div>}
          {timeOf(v.order.due_at)}
        </div>
        <div className="main">
          <div className="what">{orderTitle(v.items)}</div>
          <div className="sub">
            {v.customer?.name ?? 'No customer'} · {HANDOVER[v.order.handover]} · <MoneyLine v={v} settings={settings} />
          </div>
        </div>
      </Link>
      {advance && next && v.order.status !== 'cancelled' ? (
        <button className={`chip st-${v.order.status}`} onClick={() => void go(v.order)} aria-label={`${STATUS_LABEL[v.order.status]}. Move to ${STATUS_LABEL[next]}`}>
          {STATUS_LABEL[v.order.status]} →
        </button>
      ) : (
        <StatusChip status={v.order.status} />
      )}
    </div>
  )
}

export { HANDOVER }
