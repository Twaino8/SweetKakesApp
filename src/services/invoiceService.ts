import { supabase } from '../config/supabase';
import { Invoice, InvoiceItem } from '../types';
import { generateInvoiceNumber } from '../utils/formatters';

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customer:customers(*), items:invoice_items(*, product:products(*))')
    .order('issue_date', { ascending: false });
  if (error) throw error;
  return data as Invoice[];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customer:customers(*), items:invoice_items(*, product:products(*))')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Invoice;
}

export async function createInvoice(
  invoice: Omit<Invoice, 'id' | 'invoice_number' | 'customer' | 'items'>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[],
): Promise<Invoice> {
  const invoiceData = { ...invoice, invoice_number: generateInvoiceNumber() };
  const { data, error } = await supabase
    .from('invoices')
    .insert(invoiceData)
    .select()
    .single();
  if (error) throw error;

  const invoiceId = (data as any).id;
  if (items.length > 0) {
    const rows = items.map((i) => ({ ...i, invoice_id: invoiceId }));
    const { error: ie } = await supabase.from('invoice_items').insert(rows);
    if (ie) throw ie;
  }
  return getInvoice(invoiceId) as Promise<Invoice>;
}

export async function updateInvoiceStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateInvoice(
  id: string,
  invoice: Partial<Invoice>,
  items?: Omit<InvoiceItem, 'id' | 'invoice_id'>[],
): Promise<void> {
  const { customer, items: _, ...rest } = invoice as any;
  const { error } = await supabase.from('invoices').update(rest).eq('id', id);
  if (error) throw error;
  if (items !== undefined) {
    await supabase.from('invoice_items').delete().eq('invoice_id', id);
    if (items.length > 0) {
      const rows = items.map((i) => ({ ...i, invoice_id: id }));
      const { error: ie } = await supabase.from('invoice_items').insert(rows);
      if (ie) throw ie;
    }
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}
