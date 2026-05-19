import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIngredients } from '../../services/inventoryService';
import { Ingredient } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateProductCost } from '../../utils/calculations';
import { useSettings } from '../../hooks/useSettings';

interface CalcItem {
  ingredient: Ingredient;
  quantity: string;
}

export default function PriceCalculatorScreen() {
  const { settings } = useSettings();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selected, setSelected] = useState<CalcItem[]>([]);
  const [search, setSearch] = useState('');
  const [markupPct, setMarkupPct] = useState(String(settings.markup_percent));
  const [laborPct, setLaborPct] = useState(String(settings.labor_cost_percent));
  const [taxPct, setTaxPct] = useState(String(settings.tax_percent));
  const [productName, setProductName] = useState('');

  useEffect(() => { getIngredients().then(setIngredients); }, []);
  useEffect(() => {
    setMarkupPct(String(settings.markup_percent));
    setLaborPct(String(settings.labor_cost_percent));
    setTaxPct(String(settings.tax_percent));
  }, [settings]);

  const filteredIngredients = ingredients.filter(
    (i) => i.name.toLowerCase().includes(search.toLowerCase()) && !selected.find((s) => s.ingredient.id === i.id),
  );

  const addIngredient = (ing: Ingredient) => {
    setSelected((prev) => [...prev, { ingredient: ing, quantity: '1' }]);
    setSearch('');
  };

  const removeIngredient = (id: string) => setSelected((prev) => prev.filter((s) => s.ingredient.id !== id));
  const updateQty = (id: string, qty: string) => setSelected((prev) => prev.map((s) => s.ingredient.id === id ? { ...s, quantity: qty } : s));

  const ingredientCost = selected.reduce((sum, s) => sum + s.ingredient.unit_price * (parseFloat(s.quantity) || 0), 0);
  const pricing = calculateProductCost(
    ingredientCost,
    parseFloat(markupPct) || 0,
    parseFloat(laborPct) || 0,
    parseFloat(taxPct) || 0,
  );
  const sym = settings.currency_symbol;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.titleCard}>
        <MaterialCommunityIcons name="calculator" size={28} color="#be185d" />
        <Text style={styles.title}>Pricing Calculator</Text>
        <Text style={styles.subtitle}>Calculate the selling price based on ingredients and rates</Text>
      </View>

      <Text style={styles.sectionTitle}>Product Name (optional)</Text>
      <TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="e.g. Custom Birthday Cake" placeholderTextColor="#9ca3af" />

      <Text style={styles.sectionTitle}>Search & Add Ingredients</Text>
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
        <TextInput style={styles.search} placeholder="Search ingredient..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />
      </View>
      {search.length > 0 && filteredIngredients.length > 0 && (
        <View style={styles.dropdown}>
          {filteredIngredients.slice(0, 6).map((ing) => (
            <TouchableOpacity key={ing.id} style={styles.dropdownItem} onPress={() => addIngredient(ing)}>
              <Text style={styles.dropdownName}>{ing.name}</Text>
              <Text style={styles.dropdownPrice}>{formatCurrency(ing.unit_price, sym)}/{ing.unit}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selected.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Selected Ingredients</Text>
          {selected.map((item) => (
            <View key={item.ingredient.id} style={styles.ingRow}>
              <View style={styles.ingInfo}>
                <Text style={styles.ingName}>{item.ingredient.name}</Text>
                <Text style={styles.ingCost}>
                  {formatCurrency(item.ingredient.unit_price * (parseFloat(item.quantity) || 0), sym)}
                  <Text style={styles.ingRate}> @ {formatCurrency(item.ingredient.unit_price, sym)}/{item.ingredient.unit}</Text>
                </Text>
              </View>
              <TextInput
                style={styles.qtyInput}
                value={item.quantity}
                onChangeText={(v) => updateQty(item.ingredient.id, v)}
                keyboardType="decimal-pad"
                placeholder="Qty"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.unitLabel}>{item.ingredient.unit}</Text>
              <TouchableOpacity onPress={() => removeIngredient(item.ingredient.id)}>
                <MaterialCommunityIcons name="minus-circle-outline" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Pricing Rates</Text>
      <View style={styles.ratesRow}>
        {[['Markup %', markupPct, setMarkupPct], ['Labour %', laborPct, setLaborPct], ['Tax %', taxPct, setTaxPct]].map(([lbl, val, fn]: any) => (
          <View key={lbl} style={styles.rateField}>
            <Text style={styles.rateLabel}>{lbl}</Text>
            <TextInput style={styles.rateInput} value={val} onChangeText={fn} keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
          </View>
        ))}
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>Price Breakdown</Text>
        {productName ? <Text style={styles.productLabel}>{productName}</Text> : null}
        <View style={styles.breakdownRow}>
          <Text style={styles.bLabel}>Ingredient Cost</Text>
          <Text style={styles.bValue}>{formatCurrency(pricing.ingredient_cost, sym)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.bLabel}>Markup ({markupPct}%)</Text>
          <Text style={styles.bValue}>{formatCurrency(pricing.markup_amount, sym)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.bLabel}>Labour ({laborPct}%)</Text>
          <Text style={styles.bValue}>{formatCurrency(pricing.labor_amount, sym)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.bLabel}>Tax ({taxPct}%)</Text>
          <Text style={styles.bValue}>{formatCurrency(pricing.tax_amount, sym)}</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.breakdownRow}>
          <Text style={styles.totalLabel}>SELLING PRICE</Text>
          <Text style={styles.totalPrice}>{formatCurrency(pricing.total, sym)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.resetBtn} onPress={() => { setSelected([]); setProductName(''); }}>
        <MaterialCommunityIcons name="refresh" size={18} color="#6b7280" />
        <Text style={styles.resetText}>Reset Calculator</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  titleCard: { alignItems: 'center', backgroundColor: '#fff', padding: 24, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 6 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  search: { flex: 1, height: 44, fontSize: 14, color: '#1f2937' },
  dropdown: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', marginTop: 4 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  dropdownName: { fontSize: 14, color: '#1f2937', fontWeight: '500' },
  dropdownPrice: { fontSize: 12, color: '#6b7280' },
  ingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 6, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  ingInfo: { flex: 1 },
  ingName: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  ingCost: { fontSize: 12, color: '#10B981', marginTop: 2, fontWeight: '600' },
  ingRate: { color: '#9ca3af', fontWeight: '400' },
  qtyInput: { width: 60, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 6, fontSize: 14, textAlign: 'center', color: '#1f2937', backgroundColor: '#f9fafb' },
  unitLabel: { fontSize: 11, color: '#6b7280', minWidth: 28 },
  ratesRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16 },
  rateField: { flex: 1 },
  rateLabel: { fontSize: 12, color: '#374151', fontWeight: '600', marginBottom: 4 },
  rateInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14, textAlign: 'center', color: '#1f2937' },
  resultCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20, borderRadius: 12, padding: 20, borderWidth: 2, borderColor: '#fce7f3', elevation: 2 },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#be185d', marginBottom: 4 },
  productLabel: { fontSize: 13, color: '#6b7280', marginBottom: 12, fontStyle: 'italic' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  bLabel: { fontSize: 13, color: '#6b7280' },
  bValue: { fontSize: 13, color: '#1f2937', fontWeight: '500' },
  totalDivider: { height: 1.5, backgroundColor: '#fce7f3', marginVertical: 10 },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: '#be185d' },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: '#be185d' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 16, padding: 12 },
  resetText: { fontSize: 13, color: '#6b7280' },
});
