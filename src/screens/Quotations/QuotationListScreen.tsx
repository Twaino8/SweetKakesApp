import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getQuotations } from '../../services/quotationService';
import { Quotation } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { useSettings } from '../../hooks/useSettings';

export default function QuotationListScreen({ navigation }: any) {
  const { settings } = useSettings();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { setQuotations(await getQuotations()); }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = filter === 'all' ? quotations : quotations.filter((q) => q.status === filter);
  const sym = settings.currency_symbol;
  const FILTERS = ['all', 'draft', 'sent', 'accepted', 'rejected'];

  return (
    <View style={styles.container}>
      <View style={styles.filtersBar}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={FILTERS} keyExtractor={(s) => s}
          renderItem={({ item: s }) => (
            <TouchableOpacity style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
              <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(q) => q.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState icon="file-question-outline" title="No quotations found" subtitle="Tap + to create a quotation" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('QuotationDetail', { id: item.id })}>
            <View style={styles.cardTop}>
              <Text style={styles.number}>{item.quote_number}</Text>
              <StatusBadge status={item.status} small />
            </View>
            <Text style={styles.customer}>{item.customer?.name}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.date}>{formatDate(item.issue_date)}</Text>
              <Text style={styles.total}>{formatCurrency(item.total, sym)}</Text>
            </View>
            {item.valid_until && <Text style={styles.validity}>Valid until: {formatDate(item.valid_until)}</Text>}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('QuotationForm', {})}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filtersBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#8B5CF6' },
  chipText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  number: { fontSize: 14, fontWeight: '700', color: '#8B5CF6' },
  customer: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 12, color: '#6b7280' },
  total: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  validity: { fontSize: 11, color: '#8B5CF6', marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
