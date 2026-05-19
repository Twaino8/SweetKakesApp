import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '../../hooks/useSettings';
import { getDailySummary, ReportSummary } from '../../services/reportService';
import { getTodayOrders } from '../../services/orderService';
import { getIngredients } from '../../services/inventoryService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import { Order, Ingredient } from '../../types';

export default function DashboardScreen({ navigation }: any) {
  const { settings } = useSettings();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<Ingredient[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [s, orders, ingredients] = await Promise.all([
      getDailySummary(new Date()),
      getTodayOrders(),
      getIngredients(),
    ]);
    setSummary(s);
    setTodayOrders(orders);
    setLowStock(ingredients.filter((i) => i.quantity_in_stock <= i.reorder_level && i.reorder_level > 0));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const sym = settings.currency_symbol;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back! 🎂</Text>
          <Text style={styles.businessName}>{settings.business_name}</Text>
        </View>
        <Text style={styles.date}>{formatDate(new Date().toISOString())}</Text>
      </View>

      {/* Today's Stats */}
      <Text style={styles.sectionTitle}>Today's Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="currency-usd" label="Revenue" value={formatCurrency(summary?.total_revenue ?? 0, sym)} color="#10B981" />
        <StatCard icon="clipboard-list" label="Orders" value={String(summary?.total_orders ?? 0)} color="#3B82F6" />
        <StatCard icon="check-circle" label="Paid" value={formatCurrency(summary?.paid_invoices ?? 0, sym)} color="#8B5CF6" />
        <StatCard icon="clock-outline" label="Pending" value={String(summary?.pending_orders ?? 0)} color="#F59E0B" />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <QuickAction icon="plus-circle" label="New Order" onPress={() => navigation.navigate('Orders', { screen: 'OrderForm' })} color="#be185d" />
        <QuickAction icon="file-document" label="Invoice" onPress={() => navigation.navigate('Invoices', { screen: 'InvoiceForm' })} color="#3B82F6" />
        <QuickAction icon="file-question" label="Quote" onPress={() => navigation.navigate('Quotations', { screen: 'QuotationForm' })} color="#8B5CF6" />
        <QuickAction icon="calculator" label="Pricing" onPress={() => navigation.navigate('Calculator')} color="#10B981" />
      </View>

      {/* Today's Orders */}
      {todayOrders.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Today's Orders</Text>
          {todayOrders.slice(0, 5).map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => navigation.navigate('Orders', { screen: 'OrderDetail', params: { id: order.id } })}
            >
              <View style={styles.orderCardRow}>
                <View>
                  <Text style={styles.orderNumber}>{order.order_number}</Text>
                  <Text style={styles.customerName}>{order.customer?.name}</Text>
                </View>
                <View style={styles.orderCardRight}>
                  <Text style={styles.orderTotal}>{formatCurrency(order.total, sym)}</Text>
                  <StatusBadge status={order.status} small />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <>
          <View style={styles.alertHeader}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: '#EF4444', marginBottom: 0 }]}>
              {' '}Low Stock Alert ({lowStock.length})
            </Text>
          </View>
          {lowStock.slice(0, 3).map((ing) => (
            <TouchableOpacity
              key={ing.id}
              style={styles.alertCard}
              onPress={() => navigation.navigate('Inventory')}
            >
              <Text style={styles.alertName}>{ing.name}</Text>
              <Text style={styles.alertStock}>{ing.quantity_in_stock} {ing.unit} remaining</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '1A' }]}>
        <MaterialCommunityIcons name={icon as any} size={26} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 16, backgroundColor: '#be185d' },
  greeting: { fontSize: 13, color: '#fce7f3' },
  businessName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  date: { fontSize: 12, color: '#fce7f3', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 10, padding: 14, borderLeftWidth: 4, gap: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 11, color: '#6b7280' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, marginBottom: 4 },
  actionBtn: { alignItems: 'center', gap: 6, flex: 1 },
  actionIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, color: '#374151', fontWeight: '500', textAlign: 'center' },
  orderCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
  orderCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: 13, fontWeight: '600', color: '#be185d' },
  customerName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  orderCardRight: { alignItems: 'flex-end', gap: 4 },
  orderTotal: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  alertCard: { backgroundColor: '#FEF2F2', marginHorizontal: 16, marginBottom: 6, borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  alertName: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  alertStock: { fontSize: 12, color: '#EF4444', marginTop: 2 },
});
