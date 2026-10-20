import { dayLabel, jmd, timeOf } from './format'
import type { OrderView } from './hooks'
import { summarize } from './repo'
import type { Settings } from './types'

const BASE = import.meta.env.BASE_URL

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Draw a receipt as a PNG the customer can receive on WhatsApp. */
export async function receiptImage(v: OrderView, settings: Settings): Promise<Blob> {
  const s = summarize(v.order, v.items, v.payments, settings)
  const W = 900
  const lines: [string, string, 'normal' | 'bold' | 'muted'][] = []
  for (const it of v.items) {
    const name = `${it.name}${it.size ? ` ${it.size}` : ''}${it.quantity > 1 ? ` × ${it.quantity}` : ''}`
    lines.push([name, '', 'normal'])
    if (it.notes) lines.push([`   ${it.notes}`, '', 'muted'])
  }
  lines.push(['Items', jmd(v.order.price), 'normal'])
  if (s.gct) lines.push([`GCT ${settings.gct_pct}%`, jmd(s.gct), 'normal'])
  if (v.order.delivery_fee) lines.push(['Delivery', jmd(v.order.delivery_fee), 'normal'])
  lines.push(['Total', jmd(s.total), 'bold'])
  for (const p of v.payments) {
    lines.push([`${p.kind === 'deposit' ? 'Deposit' : 'Payment'} · ${p.method === 'bank' ? 'bank transfer' : 'cash'} · ${dayLabel(p.paid_at)}`, `− ${jmd(p.amount)}`, 'muted'])
  }
  lines.push([s.balance ? 'Balance due' : 'Paid in full', s.balance ? jmd(s.balance) : '✓', 'bold'])

  const H = 560 + lines.length * 46 + (settings.phone ? 34 : 0) + (settings.bank_name || settings.bank_account_name ? 34 : 0) + 110
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  await document.fonts.ready
  g.fillStyle = '#fbf4ed'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.roundRect(40, 40, W - 80, H - 80, 28)
  g.fill()
  g.strokeStyle = '#eed7b3'
  g.lineWidth = 2
  g.stroke()

  try {
    const logo = await loadImage(`${BASE}logo.png`)
    g.drawImage(logo, W / 2 - 120, 70, 240, 240)
  } catch {
    /* logo missing offline is not fatal */
  }
  g.textAlign = 'center'
  g.fillStyle = '#190d07'
  g.font = '700 40px "Playfair Display", Georgia, serif'
  g.fillText('Receipt', W / 2, 360)
  g.font = '500 24px "DM Sans", sans-serif'
  g.fillStyle = '#6b5a50'
  g.fillText(`Order ${v.order.order_no} · ${dayLabel(v.order.due_at, { year: 'numeric' })} ${timeOf(v.order.due_at)}`, W / 2, 400)
  g.fillText(v.customer?.name ?? '', W / 2, 436)

  let y = 500
  g.strokeStyle = '#eed7b3'
  g.beginPath()
  g.moveTo(90, y - 30)
  g.lineTo(W - 90, y - 30)
  g.stroke()
  for (const [l, r, style] of lines) {
    if (style === 'bold') {
      g.strokeStyle = '#eed7b3'
      g.beginPath()
      g.moveTo(90, y - 32)
      g.lineTo(W - 90, y - 32)
      g.stroke()
    }
    g.font = `${style === 'bold' ? 700 : 500} ${style === 'bold' ? 28 : 24}px "DM Sans", sans-serif`
    g.fillStyle = style === 'muted' ? '#6b5a50' : style === 'bold' && l === 'Balance due' ? '#9e1742' : '#190d07'
    g.textAlign = 'left'
    g.fillText(l, 90, y)
    g.textAlign = 'right'
    g.fillText(r, W - 90, y)
    y += 46
  }

  y += 40
  g.textAlign = 'center'
  g.font = '500 22px "DM Sans", sans-serif'
  g.fillStyle = '#6b5a50'
  if (settings.bank_name || settings.bank_account_name) {
    g.fillText(`Bank transfer: ${[settings.bank_name, settings.bank_account_name].filter(Boolean).join(' · ')}`, W / 2, y)
    y += 34
  }
  if (settings.phone) {
    g.fillText(settings.phone, W / 2, y)
    y += 34
  }
  g.font = 'italic 600 24px "Playfair Display", Georgia, serif'
  g.fillStyle = '#8a5a1f'
  g.fillText(settings.tagline ?? '', W / 2, y + 10)

  return await new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/png'))
}

export async function shareReceipt(v: OrderView, settings: Settings) {
  const blob = await receiptImage(v, settings)
  const file = new File([blob], `receipt-${v.order.order_no}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Receipt ${v.order.order_no}` })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
}

/** wa.me needs the full international number; Jamaican numbers start 1-876 or 1-658. */
export function whatsappNumber(phone: string | null | undefined) {
  const d = (phone ?? '').replace(/\D/g, '')
  if (d.length === 7) return `1876${d}`
  if (d.length === 10) return `1${d}`
  return d
}

export function orderSummaryText(v: OrderView, settings: Settings) {
  const s = summarize(v.order, v.items, v.payments, settings)
  const items = v.items.map((i) => `• ${i.name}${i.size ? ` ${i.size}` : ''}${i.quantity > 1 ? ` × ${i.quantity}` : ''}${i.notes ? ` (${i.notes})` : ''}`)
  const when = `${dayLabel(v.order.due_at)} at ${timeOf(v.order.due_at)}`
  const lines = [
    `Hi ${v.customer?.name?.split(' ')[0] ?? ''}! Your ${settings.business_name} order ${v.order.order_no}:`,
    ...items,
    `${v.order.handover === 'pickup' ? 'Pickup' : 'Delivery'}: ${when}`,
    `Total: ${jmd(s.total)}`,
    s.paid ? `Paid: ${jmd(s.paid)}` : `Deposit to confirm: ${jmd(s.depositDue)}`,
    s.balance ? `Balance: ${jmd(s.balance)}` : 'Paid in full — thank you!',
  ]
  if (s.balance && (settings.bank_name || settings.bank_account_name)) {
    lines.push(`Bank transfer: ${[settings.bank_name, settings.bank_account_name].filter(Boolean).join(', ')}`)
  }
  return lines.join('\n')
}
