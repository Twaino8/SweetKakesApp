import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIngredients, deleteIngredient } from '../../services/inventoryService';
import { Ingredient } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import EmptyState from '../../components/common/EmptyState';
import { useSettings } from '../../hooks/useSettings';

export default function InventoryListScreen({ navigation }: any) {
  const { settings } = useSettings();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filtered, setFiltered] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getIngredients();
    setIngredients(data);
    setFiltered(data);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(ingredients.filter((i) => i.name.toLowerCase().includes(q)));
  }, [search, ingredients]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete Ingredient', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteIngredient(id); load(); } },
    ]);
  };

  const sym = settings.currency_symbol;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
        <TextInput style={styles.search} placeholder="Search ingredients..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState icon="package-variant-closed" title="No ingredients yet" subtitle="Tap + to add your first ingredient" />}
        renderItem={({ item }) => {
          const isLow = item.reorder_level > 0 && item.quantity_in_stock <= item.reorder_level;
          return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('IngredientForm', { id: item.id })}>
              <View style={[styles.statusDot, { backgroundColor: isLow ? '#EF4444' : '#10B981' }]} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  Stock: <Text style={[styles.stockNum, isLow && { color: '#EF4444' }]}>{item.quantity_in_stock} {item.unit}</Text>
                  {'  ·  '}{formatCurrency(item.unit_price, sym)}/{item.unit}
                </Text>
                {item.supplier ? <Text style={styles.supplier}>Supplier: {item.supplier}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#d1d5db" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ flexGrow: 1 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('IngredientForm', {})}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 10, paddingHorizontal: 12, gap: 8, elevation: 1 },
  search: { flex: 1, height: 44, fontSize: 14, color: '#1f2937' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14, elevation: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  stockNum: { fontWeight: '600' },
  supplier: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  deleteBtn: { padding: 8 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#be185d', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
