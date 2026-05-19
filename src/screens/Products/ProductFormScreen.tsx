import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createProduct, updateProduct, getProduct, saveRecipeItems } from '../../services/productService';
import { getIngredients } from '../../services/inventoryService';
import { Ingredient, RecipeItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useSettings } from '../../hooks/useSettings';

export default function ProductFormScreen({ route, navigation }: any) {
  const editId = route.params?.id as string | undefined;
  const { settings } = useSettings();
  const [form, setForm] = useState({ name: '', category: '', description: '' });
  const [recipe, setRecipe] = useState<{ ingredient: Ingredient; quantity: string; unit: string }[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [showIngPicker, setShowIngPicker] = useState(false);

  useEffect(() => {
    getIngredients().then(setIngredients);
    if (editId) {
      getProduct(editId).then((p) => {
        if (!p) return;
        setForm({ name: p.name, category: p.category ?? '', description: p.description ?? '' });
        setRecipe(
          (p.recipe_items ?? []).map((ri) => ({
            ingredient: ri.ingredient!,
            quantity: String(ri.quantity),
            unit: ri.unit,
          })),
        );
      });
    }
  }, [editId]);

  const addIngredient = (ing: Ingredient) => {
    if (recipe.find((r) => r.ingredient.id === ing.id)) { setShowIngPicker(false); return; }
    setRecipe((r) => [...r, { ingredient: ing, quantity: '1', unit: ing.unit }]);
    setShowIngPicker(false);
  };

  const removeIngredient = (idx: number) => setRecipe((r) => r.filter((_, i) => i !== idx));
  const updateQty = (idx: number, val: string) => setRecipe((r) => r.map((item, i) => i === idx ? { ...item, quantity: val } : item));

  const totalCost = recipe.reduce((s, r) => s + (r.ingredient.unit_price * (parseFloat(r.quantity) || 0)), 0);

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Product name required'); return; }
    setSaving(true);
    try {
      const productData = { name: form.name.trim(), category: form.category.trim(), description: form.description.trim(), is_active: true };
      const product = editId ? await updateProduct(editId, productData) : await createProduct(productData);
      const recipeItems: Omit<RecipeItem, 'id'>[] = recipe.map((r) => ({
        product_id: product.id,
        ingredient_id: r.ingredient.id,
        quantity: parseFloat(r.quantity) || 0,
        unit: r.unit,
      }));
      await saveRecipeItems(product.id, recipeItems);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  const sym = settings.currency_symbol;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.field}><Text style={styles.label}>Product Name *</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Chocolate Cake" placeholderTextColor="#9ca3af" />
        </View>
        <View style={styles.field}><Text style={styles.label}>Category</Text>
          <TextInput style={styles.input} value={form.category} onChangeText={(v) => setForm((f) => ({ ...f, category: v }))} placeholder="Cakes, Cookies, Breads..." placeholderTextColor="#9ca3af" />
        </View>
        <View style={styles.field}><Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Brief description..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} />
        </View>

        <View style={styles.recipeHeader}>
          <Text style={styles.sectionTitle}>Recipe Ingredients</Text>
          <TouchableOpacity style={styles.addIngBtn} onPress={() => setShowIngPicker((v) => !v)}>
            <MaterialCommunityIcons name="plus" size={18} color="#be185d" />
            <Text style={styles.addIngText}>Add</Text>
          </TouchableOpacity>
        </View>

        {showIngPicker && (
          <View style={styles.picker}>
            {ingredients.filter((ing) => !recipe.find((r) => r.ingredient.id === ing.id)).map((ing) => (
              <TouchableOpacity key={ing.id} style={styles.pickerItem} onPress={() => addIngredient(ing)}>
                <Text style={styles.pickerName}>{ing.name}</Text>
                <Text style={styles.pickerSub}>{formatCurrency(ing.unit_price, sym)}/{ing.unit}</Text>
              </TouchableOpacity>
            ))}
            {ingredients.length === 0 && <Text style={styles.emptyPicker}>No ingredients — add them in Inventory first</Text>}
          </View>
        )}

        {recipe.map((r, idx) => (
          <View key={r.ingredient.id} style={styles.recipeRow}>
            <View style={styles.recipeLeft}>
              <Text style={styles.recipeIngName}>{r.ingredient.name}</Text>
              <Text style={styles.recipePrice}>{formatCurrency(r.ingredient.unit_price * (parseFloat(r.quantity) || 0), sym)}</Text>
            </View>
            <TextInput
              style={styles.qtyInput}
              value={r.quantity}
              onChangeText={(v) => updateQty(idx, v)}
              keyboardType="decimal-pad"
              placeholder="Qty"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.recipeUnit}>{r.unit}</Text>
            <TouchableOpacity onPress={() => removeIngredient(idx)} style={styles.removeBtn}>
              <MaterialCommunityIcons name="minus-circle-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {recipe.length > 0 && (
          <View style={styles.costSummary}>
            <Text style={styles.costLabel}>Total Ingredient Cost:</Text>
            <Text style={styles.costValue}>{formatCurrency(totalCost, sym)}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  addIngBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#be185d' },
  addIngText: { color: '#be185d', fontSize: 13, fontWeight: '600' },
  picker: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, overflow: 'hidden' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerName: { fontSize: 14, color: '#1f2937', fontWeight: '500' },
  pickerSub: { fontSize: 12, color: '#6b7280' },
  emptyPicker: { padding: 16, color: '#9ca3af', textAlign: 'center', fontSize: 13 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  recipeLeft: { flex: 1 },
  recipeIngName: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  recipePrice: { fontSize: 11, color: '#10B981', marginTop: 2 },
  qtyInput: { width: 60, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 6, fontSize: 14, textAlign: 'center', color: '#1f2937', backgroundColor: '#f9fafb' },
  recipeUnit: { fontSize: 12, color: '#6b7280', minWidth: 28 },
  removeBtn: { padding: 4 },
  costSummary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fce7f3', borderRadius: 8, padding: 12, marginBottom: 16 },
  costLabel: { fontSize: 14, color: '#be185d', fontWeight: '600' },
  costValue: { fontSize: 16, fontWeight: 'bold', color: '#be185d' },
  saveBtn: { backgroundColor: '#be185d', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
