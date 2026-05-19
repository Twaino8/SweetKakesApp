import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProducts, deleteProduct, computeIngredientCost } from '../../services/productService';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import EmptyState from '../../components/common/EmptyState';
import { useSettings } from '../../hooks/useSettings';
import { calculateProductCost } from '../../utils/calculations';

export default function ProductListScreen({ navigation }: any) {
  const { settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getProducts();
    setProducts(data);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Archive Product', `Archive "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: async () => { await deleteProduct(id); load(); } },
    ]);
  };

  const sym = settings.currency_symbol;

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState icon="cupcake" title="No products yet" subtitle="Tap + to add your first product" />}
        renderItem={({ item }) => {
          const ingCost = computeIngredientCost(item.recipe_items ?? []);
          const pricing = calculateProductCost(ingCost, settings.markup_percent, settings.labor_cost_percent, settings.tax_percent);
          return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProductDetail', { id: item.id })}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="cake-variant" size={28} color="#be185d" />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {item.category && <Text style={styles.category}>{item.category}</Text>}
                <Text style={styles.cost}>
                  Ingredients: {formatCurrency(ingCost, sym)}
                  {'  ·  '}
                  <Text style={styles.price}>Sell: {formatCurrency(pricing.total, sym)}</Text>
                </Text>
                <Text style={styles.itemCount}>{item.recipe_items?.length ?? 0} ingredients in recipe</Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="archive-outline" size={20} color="#d1d5db" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ flexGrow: 1 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ProductForm', {})}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14, marginTop: 4, elevation: 1 },
  iconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  category: { fontSize: 11, color: '#be185d', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  cost: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  price: { color: '#10B981', fontWeight: '700' },
  itemCount: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  deleteBtn: { padding: 8 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#be185d', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
