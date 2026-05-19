import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getDailySummary, getTopProducts, getMonthlyRevenue } from '../../services/reportService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useSettings } from '../../hooks/useSettings';

type Period = 'today' | 'week' | 'month';

export default function ReportsScreen() {
  const { settings } = useSettings();
  const [period, setPeriod] = useState<Period>('today');
  const [summary, setSummary] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const now = new Date();
    const from = new Date(now);
    if (period === 'week') from.setDate(from.getDate() - 7);
    else if (period === 'month') from.setDate(1);

    const [s, top, monthly] = await Promise.all([
      getDailySummary(now),
      getTopProducts(from, now, 5),
      getMonthlyRevenue(now.getFullYear()),
    ]);
    setSummary(s);
    setTopProducts(top);
    setMonthlyRevenue(monthly);
  }, [period]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const sym = settings.currency_symbol;
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary cards */}
      <View style={styles.grid}>
        <SummaryCard icon="currency-usd" label="Revenue" value={formatCurrency(summary?.total_revenue ?? 0, sym)} color="#10B981" />
        <SummaryCard icon="clipboard-list" label="Orders" value={String(summary?.total_orders ?? 0)} color="#3B82F6" />
        <SummaryCard icon="check-circle" label="Paid (Invoices)" value={formatCurrency(summary?.paid_invoices ?? 0, sym)} color="#8B5CF6" />
        <SummaryCard icon="chart-line" label="Avg Order" value={formatCurrency(summary?.avg_order_value ?? 0, sym)} color="#F59E0B" />
      </View>

      {/* Monthly revenue bar chart */}
      <Text style={styles.sectionTitle}>Monthly Revenue ({new Date().getFullYear()})</Text>
      <View style={styles.chartCard}>
        <View style={styles.barChart}>
          {monthlyRevenue.map((m, idx) => {
            const pct = m.revenue / maxRevenue;
            const isCurrentMonth = idx === new Date().getMonth();
            return (
              <View key={m.month} style={styles.barWrapper}>
                <Text style={styles.barValue}>{m.revenue > 0 ? `${sym}${Math.round(m.revenue)}` : ''}</Text>
                <View style={[styles.bar, { height: Math.max(pct * 100, 4), backgroundColor: isCurrentMonth ? '#be185d' : '#fce7f3' }]} />
                <Text style={[styles.barLabel, isCurrentMonth && styles.barLabelActive]}>{MONTHS[idx]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Top products */}
      <Text style={styles.sectionTitle}>Top Products</Text>
      {topProducts.length === 0 ? (
        <Text style={styles.emptyText}>No sales data yet</Text>
      ) : (
        topProducts.map((p, idx) => {
          const maxRev = topProducts[0]?.total_revenue ?? 1;
          const pct = p.total_revenue / maxRev;
          return (
            <View key={p.product_id} style={styles.productRow}>
              <View style={[styles.rank, idx === 0 && styles.rankGold, idx === 1 && styles.rankSilver, idx === 2 && styles.rankBronze]}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{p.product_name}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.productBar, { width: `${pct * 100}%` }]} />
                </View>
                <Text style={styles.productStats}>{p.total_quantity} units sold · {formatCurrency(p.total_revenue, sym)}</Text>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  periodRow: { flexDirection: 'row', padding: 12, gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6' },
  periodBtnActive: { backgroundColor: '#be185d' },
  periodText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  periodTextActive: { color: '#fff', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, gap: 8 },
  summaryCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 10, padding: 14, borderTopWidth: 3, gap: 4, elevation: 1 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 4 },
  summaryLabel: { fontSize: 11, color: '#6b7280' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  chartCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 16, elevation: 1 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 7, color: '#6b7280', marginBottom: 2, textAlign: 'center' },
  bar: { width: '80%', borderRadius: 3, minHeight: 4 },
  barLabel: { fontSize: 9, color: '#9ca3af', marginTop: 4 },
  barLabelActive: { color: '#be185d', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 24, fontSize: 14 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 12, gap: 12, elevation: 1 },
  rank: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  rankGold: { backgroundColor: '#FEF3C7' },
  rankSilver: { backgroundColor: '#F3F4F6' },
  rankBronze: { backgroundColor: '#FEF0E6' },
  rankText: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 6 },
  barContainer: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  productBar: { height: 6, backgroundColor: '#be185d', borderRadius: 3 },
  productStats: { fontSize: 11, color: '#6b7280' },
});
