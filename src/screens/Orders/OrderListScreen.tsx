import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getOrders, deleteOrder } from '../../services/orderService';
import { Order } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { useSettings } from '../../hooks/useSettings';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'in_production', 'ready', 'delivered'];

export default function OrderListScreen({ navigation }: any) {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getOrders();
    setOrders(data);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  const sym = settings.currency_symbol;

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(s) => s}
          renderItem={({ item: s }) => (
            <TouchableOpacity style={[styles.filterChip, filter === s && styles.filterChipActive]} onPress={() => setFilter(s)}>
              <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>
                {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState icon="clipboard-list-outline" title="No orders found" subtitle="Tap + to create a new order" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OrderDetail', { id: item.id })}>
            <View style={styles.cardTop}>
              <Text style={styles.orderNum}>{item.order_number}</Text>
              <StatusBadge status={item.status} small />
            </View>
            <Text style={styles.customerName}>{item.customer?.name}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.date}>{formatDate(item.order_date)}</Text>
              <Text style={styles.total}>{formatCurrency(item.total, sym)}</Text>
            </View>
            {item.delivery_date && (
              <Text style={styles.delivery}>Delivery: {formatDate(item.delivery_date)}</Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('OrderForm', {})}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filtersContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: '#be185d' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderNum: { fontSize: 14, fontWeight: '700', color: '#be185d' },
  customerName: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 12, color: '#6b7280' },
  total: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  delivery: { fontSize: 11, color: '#F59E0B', marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#be185d', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
