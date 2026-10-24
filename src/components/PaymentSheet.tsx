import { useState } from 'react'
import { jmd } from '../lib/format'
import { save, uid } from '../lib/repo'
import type { Payment } from '../lib/types'

export function PaymentSheet({
  orderId,
  suggested,
  kind,
  onClose,
  note,
}: {
  note?: string
  orderId: string
  suggested: number
  kind: Payment['kind']
  onClose: (saved: boolean) => void
}) {
  const [amount, setAmount] = useState(String(Math.max(0, Math.round(suggested))))
  const [method, setMethod] = useState<Payment['method']>('bank')
  const value = Number(amount.replace(/[^0-9.]/g, ''))

  async function submit() {
    if (!value) return
    await save<Payment>('payments', { id: uid(), order_id: orderId, amount: value, method, kind, paid_at: new Date().toISOString() })
    onClose(true)
  }

  return (
    <div className="sheet-backdrop" onClick={() => onClose(false)}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="pay-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="pay-title" className="section-title">
          {kind === 'deposit' ? 'Log deposit' : kind === 'balance' ? 'Log balance payment' : 'Log payment'}
        </h2>
        <div className="field">
          <label htmlFor="amt">Amount (J$)</label>
          <input id="amt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ fontSize: 26, fontWeight: 700 }} />
          {suggested > 0 && <span className="small muted">Suggested: {jmd(suggested)}</span>}
          {kind === 'deposit' && note && <span className="small owing">{note}</span>}
        </div>
        <div className="field">
          <span className="flabel">Paid by</span>
          <div className="pills">
            <button type="button" className="pill" aria-pressed={method === 'bank'} onClick={() => setMethod('bank')}>
              Bank transfer
            </button>
            <button type="button" className="pill" aria-pressed={method === 'cash'} onClick={() => setMethod('cash')}>
              Cash
            </button>
          </div>
        </div>
        <button className="btn btn-primary btn-big btn-block" onClick={() => void submit()} disabled={!value}>
          Save {value ? jmd(value) : ''}
        </button>
        <button className="btn btn-block" onClick={() => onClose(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
