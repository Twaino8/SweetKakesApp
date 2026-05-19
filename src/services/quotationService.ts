import { supabase } from '../config/supabase';
import { Quotation, QuotationItem } from '../types';
import { generateQuoteNumber } from '../utils/formatters';

export async function getQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customer:customers(*), items:quotation_items(*, product:products(*))')
    .order('issue_date', { ascending: false });
  if (error) throw error;
  return data as Quotation[];
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customer:customers(*), items:quotation_items(*, product:products(*))')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Quotation;
}

export async function createQuotation(
  quotation: Omit<Quotation, 'id' | 'quote_number' | 'customer' | 'items'>,
  items: Omit<QuotationItem, 'id' | 'quotation_id'>[],
): Promise<Quotation> {
  const quotationData = { ...quotation, quote_number: generateQuoteNumber() };
  const { data, error } = await supabase
    .from('quotations')
    .insert(quotationData)
    .select()
    .single();
  if (error) throw error;

  const quotationId = (data as any).id;
  if (items.length > 0) {
    const rows = items.map((i) => ({ ...i, quotation_id: quotationId }));
    const { error: ie } = await supabase.from('quotation_items').insert(rows);
    if (ie) throw ie;
  }
  return getQuotation(quotationId) as Promise<Quotation>;
}

export async function updateQuotationStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('quotations').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateQuotation(
  id: string,
  quotation: Partial<Quotation>,
  items?: Omit<QuotationItem, 'id' | 'quotation_id'>[],
): Promise<void> {
  const { customer, items: _, ...rest } = quotation as any;
  const { error } = await supabase.from('quotations').update(rest).eq('id', id);
  if (error) throw error;
  if (items !== undefined) {
    await supabase.from('quotation_items').delete().eq('quotation_id', id);
    if (items.length > 0) {
      const rows = items.map((i) => ({ ...i, quotation_id: id }));
      const { error: ie } = await supabase.from('quotation_items').insert(rows);
      if (ie) throw ie;
    }
  }
}

export async function deleteQuotation(id: string): Promise<void> {
  const { error } = await supabase.from('quotations').delete().eq('id', id);
  if (error) throw error;
}

export async function convertToInvoice(quotation: Quotation): Promise<Omit<Quotation, 'id' | 'quote_number' | 'customer' | 'items'>> {
  return {
    customer_id: quotation.customer_id,
    issue_date: new Date().toISOString(),
    status: 'draft',
    notes: quotation.notes,
    labor_percent: quotation.labor_percent,
    tax_percent: quotation.tax_percent,
    markup_percent: quotation.markup_percent,
    subtotal: quotation.subtotal,
    labor_amount: quotation.labor_amount,
    markup_amount: quotation.markup_amount,
    tax_amount: quotation.tax_amount,
    total: quotation.total,
  } as any;
}
