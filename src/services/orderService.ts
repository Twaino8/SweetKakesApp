import { supabase } from '../config/supabase';
import { Order, OrderItem } from '../types';
import { generateOrderNumber } from '../utils/formatters';

export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), items:order_items(*, product:products(*))')
    .order('order_date', { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), items:order_items(*, product:products(*))')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Order;
}

export async function createOrder(
  order: Omit<Order, 'id' | 'order_number' | 'customer' | 'items'>,
  items: Omit<OrderItem, 'id' | 'order_id'>[],
): Promise<Order> {
  const orderData = { ...order, order_number: generateOrderNumber() };
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();
  if (error) throw error;

  const orderId = (data as any).id;
  if (items.length > 0) {
    const rows = items.map((i) => ({ ...i, order_id: orderId }));
    const { error: ie } = await supabase.from('order_items').insert(rows);
    if (ie) throw ie;
  }
  return getOrder(orderId) as Promise<Order>;
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateOrder(
  id: string,
  order: Partial<Order>,
  items?: Omit<OrderItem, 'id' | 'order_id'>[],
): Promise<void> {
  const { customer, items: _, ...rest } = order as any;
  const { error } = await supabase.from('orders').update(rest).eq('id', id);
  if (error) throw error;
  if (items !== undefined) {
    await supabase.from('order_items').delete().eq('order_id', id);
    if (items.length > 0) {
      const rows = items.map((i) => ({ ...i, order_id: id }));
      const { error: ie } = await supabase.from('order_items').insert(rows);
      if (ie) throw ie;
    }
  }
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
}

export async function getTodayOrders(): Promise<Order[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), items:order_items(*, product:products(*))')
    .gte('order_date', today.toISOString())
    .lt('order_date', tomorrow.toISOString())
    .order('order_date', { ascending: false });
  if (error) throw error;
  return data as Order[];
}
