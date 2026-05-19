import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, Quotation, OwnerSettings } from '../types';
import { formatCurrency, formatDate } from './formatters';

function buildItemsTableRows(items: any[], symbol: string): string {
  return items
    .map(
      (item) => `
      <tr>
        <td>${item.product?.name ?? 'Item'}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatCurrency(item.unit_price, symbol)}</td>
        <td style="text-align:right">${formatCurrency(item.total_price, symbol)}</td>
      </tr>`,
    )
    .join('');
}

function documentHtml(
  type: 'INVOICE' | 'QUOTATION',
  docNumber: string,
  issueDate: string,
  secondDateLabel: string,
  secondDate: string | undefined,
  status: string,
  customer: any,
  items: any[],
  subtotal: number,
  laborAmount: number,
  laborPercent: number,
  markupAmount: number,
  markupPercent: number,
  taxAmount: number,
  taxPercent: number,
  total: number,
  notes: string,
  settings: OwnerSettings,
): string {
  const sym = settings.currency_symbol;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; margin: 0; padding: 32px; }
      h1 { font-size: 28px; color: #be185d; margin: 0; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
      .business-info { text-align: right; font-size: 12px; color: #6b7280; }
      .doc-meta { background: #fdf2f8; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
      .doc-meta div { line-height: 1.8; }
      label { font-weight: bold; color: #be185d; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th { background: #be185d; color: white; padding: 10px; text-align: left; font-size: 12px; }
      td { padding: 9px 10px; border-bottom: 1px solid #fce7f3; font-size: 12px; }
      tr:nth-child(even) td { background: #fdf2f8; }
      .totals { margin-left: auto; width: 260px; }
      .totals tr td:first-child { color: #6b7280; }
      .totals tr td:last-child { text-align: right; font-weight: 500; }
      .totals .grand-total td { font-size: 16px; font-weight: bold; color: #be185d; border-top: 2px solid #be185d; padding-top: 8px; }
      .status-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #fce7f3; color: #be185d; text-transform: uppercase; }
      .notes { margin-top: 24px; padding: 12px; background: #f9fafb; border-radius: 6px; font-size: 12px; color: #6b7280; }
      .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>${settings.business_name}</h1>
        <div style="font-size:13px; color:#be185d; margin-top:4px">🎂 Baked with Love</div>
      </div>
      <div class="business-info">
        <div>${settings.owner_name}</div>
        <div>${settings.phone}</div>
        <div>${settings.email}</div>
        <div style="max-width:200px; text-align:right">${settings.address}</div>
      </div>
    </div>

    <div class="doc-meta">
      <div>
        <div style="font-size:20px; font-weight:bold; color:#be185d; margin-bottom:8px">${type}</div>
        <div><label>Number: </label>${docNumber}</div>
        <div><label>Date: </label>${formatDate(issueDate)}</div>
        <div><label>${secondDateLabel}: </label>${secondDate ? formatDate(secondDate) : '—'}</div>
        <div style="margin-top:6px"><span class="status-badge">${status.toUpperCase()}</span></div>
      </div>
      <div>
        <div style="font-weight:bold; margin-bottom:4px">Bill To:</div>
        <div style="font-size:14px; font-weight:600">${customer?.name ?? ''}</div>
        <div>${customer?.email ?? ''}</div>
        <div>${customer?.phone ?? ''}</div>
        <div style="max-width:200px">${customer?.address ?? ''}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${buildItemsTableRows(items, sym)}
      </tbody>
    </table>

    <table class="totals">
      <tbody>
        <tr><td>Subtotal</td><td>${formatCurrency(subtotal, sym)}</td></tr>
        <tr><td>Markup (${markupPercent}%)</td><td>${formatCurrency(markupAmount, sym)}</td></tr>
        <tr><td>Labour (${laborPercent}%)</td><td>${formatCurrency(laborAmount, sym)}</td></tr>
        <tr><td>Tax (${taxPercent}%)</td><td>${formatCurrency(taxAmount, sym)}</td></tr>
        <tr class="grand-total"><td>TOTAL</td><td>${formatCurrency(total, sym)}</td></tr>
      </tbody>
    </table>

    ${notes ? `<div class="notes"><strong>Notes:</strong> ${notes}</div>` : ''}

    <div class="footer">
      Thank you for choosing ${settings.business_name}! &nbsp;|&nbsp; ${settings.phone} &nbsp;|&nbsp; ${settings.email}
    </div>
  </body>
  </html>`;
}

export async function generateAndShareInvoicePdf(
  invoice: Invoice,
  settings: OwnerSettings,
): Promise<void> {
  const html = documentHtml(
    'INVOICE',
    invoice.invoice_number,
    invoice.issue_date,
    'Due Date',
    invoice.due_date,
    invoice.status,
    invoice.customer,
    invoice.items ?? [],
    invoice.subtotal,
    invoice.labor_amount,
    invoice.labor_percent,
    invoice.markup_amount,
    invoice.markup_percent,
    invoice.tax_amount,
    invoice.tax_percent,
    invoice.total,
    invoice.notes ?? '',
    settings,
  );

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Invoice ${invoice.invoice_number}`,
    UTI: 'com.adobe.pdf',
  });
}

export async function generateAndShareQuotationPdf(
  quotation: Quotation,
  settings: OwnerSettings,
): Promise<void> {
  const html = documentHtml(
    'QUOTATION',
    quotation.quote_number,
    quotation.issue_date,
    'Valid Until',
    quotation.valid_until,
    quotation.status,
    quotation.customer,
    quotation.items ?? [],
    quotation.subtotal,
    quotation.labor_amount,
    quotation.labor_percent,
    quotation.markup_amount,
    quotation.markup_percent,
    quotation.tax_amount,
    quotation.tax_percent,
    quotation.total,
    quotation.notes ?? '',
    settings,
  );

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Quotation ${quotation.quote_number}`,
    UTI: 'com.adobe.pdf',
  });
}
