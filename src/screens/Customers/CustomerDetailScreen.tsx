import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCustomer } from '../../services/customerService';
import { getOrders } from '../../services/orderService';
import { Customer, Order } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import { useSettings } from '../../hooks/useSettings';

export default function CustomerDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { settings } = useSettings();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [c, allOrders] = await Promise.all([getCustomer(id), getOrders()]);
    setCustomer(c);
    setOrders(allOrders.filter((o) => o.customer_id === id));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totalSpend = orders.reduce((s, o) => s + Number(o.total), 0);
  const sym = settings.currency_symbol;

  if (!customer) return null;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{customer.name.charAt(0)}</Text></View>
        <Text style={styles.name}>{customer.name}</Text>
        {customer.phone && <Text style={styles.sub}>{customer.phone}</Text>}
        {customer.email && <Text style={styles.sub}>{customer.email}</Text>}
        {customer.address && <Text style={styles.sub}>{customer.address}</Text>}
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('CustomerForm', { id })}>
          <MaterialCommunityIcons name="pencil" size={16} color="#be185d" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statVal}>{orders.length}</Text><Text style={styles.statLbl}>Orders</Text></View>
        <View style={styles.stat}><Text style={styles.statVal}>{formatCurrency(totalSpend, sym)}</Text><Text style={styles.statLbl}>Total Spend</Text></View>
      </View>

      {customer.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{customer.notes}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Order History</Text>
      {orders.length === 0 ? (
        <Text style={styles.emptyText}>No orders yet</Text>
      ) : (
        orders.map((order) => (
          <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => navigation.navigate('Orders', { screen: 'OrderDetail', params: { id: order.id } } as any)}>
            <View style={styles.orderRow}>
              <View>
                <Text style={styles.orderNum}>{order.order_number}</Text>
                <Text style={styles.orderDate}>{formatDate(order.order_date)}</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderTotal}>{formatCurrency(order.total, sym)}</Text>
                <StatusBadge status={order.status} small />
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { alignItems: 'center', backgroundColor: '#fff', padding: 24, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#be185d' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  sub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#be185d' },
  editBtnText: { color: '#be185d', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginTop: 12, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  statLbl: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  notesBox: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 14 },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#be185d', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#374151' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  orderCard: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { fontSize: 13, fontWeight: '600', color: '#be185d' },
  orderDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderTotal: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
});
