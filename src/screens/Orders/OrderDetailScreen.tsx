import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getOrder, updateOrderStatus, deleteOrder } from '../../services/orderService';
import { createInvoice } from '../../services/invoiceService';
import { Order } from '../../types';
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import { useSettings } from '../../hooks/useSettings';

const STATUSES = ['pending', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled'];

export default function OrderDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { settings } = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { setOrder(await getOrder(id)); }, [id]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const changeStatus = (status: string) => {
    Alert.alert('Update Status', `Change to "${status}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: async () => { await updateOrderStatus(id, status); load(); } },
    ]);
  };

  const convertToInvoice = async () => {
    if (!order) return;
    try {
      const invoiceItems = (order.items ?? []).map((i) => ({
        product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price,
      }));
      const inv = await createInvoice({
        order_id: order.id, customer_id: order.customer_id, issue_date: new Date().toISOString(),
        status: 'draft', notes: order.notes,
        labor_percent: order.labor_percent, tax_percent: order.tax_percent, markup_percent: order.markup_percent,
        subtotal: order.subtotal, labor_amount: order.labor_amount, markup_amount: order.markup_amount,
        tax_amount: order.tax_amount, total: order.total,
      }, invoiceItems);
      Alert.alert('Invoice Created', `Invoice ${inv.invoice_number} created!`, [
        { text: 'View Invoice', onPress: () => navigation.navigate('Invoices', { screen: 'InvoiceDetail', params: { id: inv.id } }) },
        { text: 'OK' },
      ]);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const confirmDelete = () => {
    Alert.alert('Delete Order', 'Permanently delete this order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteOrder(id); navigation.goBack(); } },
    ]);
  };

  if (!order) return null;
  const sym = settings.currency_symbol;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderNum}>{order.order_number}</Text>
          <Text style={styles.customer}>{order.customer?.name}</Text>
          <Text style={styles.date}>{formatDate(order.order_date)}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Status update */}
      <Text style={styles.sectionTitle}>Update Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
        {STATUSES.map((s) => (
          <TouchableOpacity key={s} style={[styles.statusBtn, order.status === s && styles.statusBtnActive, { borderColor: statusColor(s) }]} onPress={() => changeStatus(s)}>
            <Text style={[styles.statusBtnText, { color: statusColor(s) }, order.status === s && styles.statusBtnTextActive]}>{s.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items */}
      <Text style={styles.sectionTitle}>Order Items</Text>
      {(order.items ?? []).map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.product?.name ?? 'Product'}</Text>
            <Text style={styles.itemQty}>× {item.quantity}</Text>
          </View>
          <View style={styles.itemPrices}>
            <Text style={styles.itemUnit}>{formatCurrency(item.unit_price, sym)} ea</Text>
            <Text style={styles.itemTotal}>{formatCurrency(item.total_price, sym)}</Text>
          </View>
        </View>
      ))}

      {/* Totals */}
      <View style={styles.totalsBox}>
        <TRow label="Subtotal" value={formatCurrency(order.subtotal, sym)} />
        <TRow label={`Markup (${order.markup_percent}%)`} value={formatCurrency(order.markup_amount, sym)} />
        <TRow label={`Labour (${order.labor_percent}%)`} value={formatCurrency(order.labor_amount, sym)} />
        <TRow label={`Tax (${order.tax_percent}%)`} value={formatCurrency(order.tax_amount, sym)} />
        <View style={styles.divider} />
        <TRow label="TOTAL" value={formatCurrency(order.total, sym)} bold />
      </View>

      {order.delivery_date && (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="truck-delivery" size={16} color="#6b7280" />
          <Text style={styles.infoText}>Delivery: {formatDate(order.delivery_date)}</Text>
        </View>
      )}
      {order.notes ? <View style={styles.notes}><Text style={styles.notesLabel}>Notes</Text><Text style={styles.notesText}>{order.notes}</Text></View> : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={convertToInvoice}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color="#3B82F6" />
          <Text style={[styles.actionText, { color: '#3B82F6' }]}>Create Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#EF4444' }]} onPress={confirmDelete}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function TRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.tRow}>
      <Text style={[styles.tLabel, bold && styles.tBold]}>{label}</Text>
      <Text style={[styles.tValue, bold && styles.tBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  orderNum: { fontSize: 18, fontWeight: 'bold', color: '#be185d' },
  customer: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginTop: 4 },
  date: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  statusScroll: { paddingLeft: 12, marginBottom: 4 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, marginRight: 8 },
  statusBtnActive: { backgroundColor: '#1f2937' },
  statusBtnText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  statusBtnTextActive: { color: '#fff' },
  itemRow: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 6, borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  itemQty: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  itemPrices: { alignItems: 'flex-end' },
  itemUnit: { fontSize: 11, color: '#6b7280' },
  itemTotal: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  totalsBox: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 16 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  tLabel: { fontSize: 13, color: '#6b7280' },
  tValue: { fontSize: 13, color: '#1f2937', fontWeight: '500' },
  tBold: { fontSize: 17, fontWeight: 'bold', color: '#be185d' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 4 },
  infoText: { fontSize: 13, color: '#6b7280' },
  notes: { backgroundColor: '#fff', margin: 12, borderRadius: 8, padding: 12 },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#be185d', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#374151' },
  actions: { flexDirection: 'row', gap: 10, margin: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#3B82F6', backgroundColor: '#fff' },
  actionText: { fontSize: 13, fontWeight: '600' },
});
