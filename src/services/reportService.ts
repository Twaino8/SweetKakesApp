import { supabase } from '../config/supabase';
import { ProductPerformance } from '../types';

export interface ReportSummary {
  total_revenue: number;
  total_orders: number;
  paid_invoices: number;
  pending_orders: number;
  avg_order_value: number;
}

export async function getDailySummary(date: Date): Promise<ReportSummary> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const { data: orders } = await supabase
    .from('orders')
    .select('total, status')
    .gte('order_date', start.toISOString())
    .lte('order_date', end.toISOString());

  const { data: invoices } = await supabase
    .from('invoices')
    .select('total, status')
    .gte('issue_date', start.toISOString())
    .lte('issue_date', end.toISOString());

  const total_orders = orders?.length ?? 0;
  const total_revenue = orders?.reduce((s, o) => s + Number(o.total), 0) ?? 0;
  const pending_orders = orders?.filter((o) => o.status === 'pending').length ?? 0;
  const paid_invoices = invoices?.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0) ?? 0;
  const avg_order_value = total_orders > 0 ? total_revenue / total_orders : 0;

  return { total_revenue, total_orders, paid_invoices, pending_orders, avg_order_value };
}

export async function getDateRangeSummary(from: Date, to: Date): Promise<{ date: string; revenue: number; orders: number }[]> {
  const { data } = await supabase
    .from('orders')
    .select('order_date, total')
    .gte('order_date', from.toISOString())
    .lte('order_date', to.toISOString())
    .order('order_date');

  const grouped: Record<string, { revenue: number; orders: number }> = {};
  (data ?? []).forEach((o) => {
    const day = o.order_date.slice(0, 10);
    if (!grouped[day]) grouped[day] = { revenue: 0, orders: 0 };
    grouped[day].revenue += Number(o.total);
    grouped[day].orders += 1;
  });

  return Object.entries(grouped).map(([date, v]) => ({ date, ...v }));
}

export async function getTopProducts(from: Date, to: Date, limit = 10): Promise<ProductPerformance[]> {
  const { data } = await supabase
    .from('order_items')
    .select('product_id, quantity, total_price, product:products(name), order:orders!inner(order_date)')
    .gte('order.order_date', from.toISOString())
    .lte('order.order_date', to.toISOString());

  const grouped: Record<string, ProductPerformance> = {};
  (data ?? []).forEach((item: any) => {
    const pid = item.product_id;
    if (!grouped[pid]) {
      grouped[pid] = {
        product_id: pid,
        product_name: item.product?.name ?? 'Unknown',
        total_quantity: 0,
        total_revenue: 0,
      };
    }
    grouped[pid].total_quantity += Number(item.quantity);
    grouped[pid].total_revenue += Number(item.total_price);
  });

  return Object.values(grouped)
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit);
}

export async function getMonthlyRevenue(year: number): Promise<{ month: string; revenue: number }[]> {
  const { data } = await supabase
    .from('orders')
    .select('order_date, total')
    .gte('order_date', `${year}-01-01`)
    .lte('order_date', `${year}-12-31`);

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return { month: `${year}-${m}`, revenue: 0 };
  });

  (data ?? []).forEach((o) => {
    const m = o.order_date.slice(0, 7);
    const found = months.find((x) => x.month === m);
    if (found) found.revenue += Number(o.total);
  });

  return months;
}
