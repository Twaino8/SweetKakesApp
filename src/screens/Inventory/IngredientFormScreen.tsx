import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { createIngredient, updateIngredient, getIngredient } from '../../services/inventoryService';

const UNITS = ['kg', 'g', 'lb', 'oz', 'L', 'mL', 'cup', 'tbsp', 'tsp', 'pcs', 'dozen'];

export default function IngredientFormScreen({ route, navigation }: any) {
  const editId = route.params?.id as string | undefined;
  const [form, setForm] = useState({
    name: '', unit: 'kg', unit_price: '', quantity_in_stock: '', reorder_level: '', supplier: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      getIngredient(editId).then((i) => {
        if (i) setForm({
          name: i.name, unit: i.unit, unit_price: String(i.unit_price), quantity_in_stock: String(i.quantity_in_stock),
          reorder_level: String(i.reorder_level), supplier: i.supplier ?? '', notes: i.notes ?? '',
        });
      });
    }
  }, [editId]);

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      unit_price: parseFloat(form.unit_price) || 0,
      quantity_in_stock: parseFloat(form.quantity_in_stock) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      supplier: form.supplier.trim(),
      notes: form.notes.trim(),
    };
    setSaving(true);
    try {
      if (editId) { await updateIngredient(editId, payload); }
      else { await createIngredient(payload); }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Field label="Ingredient Name *" value={form.name} onChange={set('name')} placeholder="e.g. All-Purpose Flour" />

        <Text style={styles.label}>Unit of Measure *</Text>
        <View style={styles.unitGrid}>
          {UNITS.map((u) => (
            <TouchableOpacity key={u} style={[styles.unitBtn, form.unit === u && styles.unitBtnActive]} onPress={() => set('unit')(u)}>
              <Text style={[styles.unitBtnText, form.unit === u && styles.unitBtnTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Unit Price *" value={form.unit_price} onChange={set('unit_price')} placeholder="0.00" keyboardType="decimal-pad" prefix="$" />
        <Field label="Current Stock Quantity" value={form.quantity_in_stock} onChange={set('quantity_in_stock')} placeholder="0" keyboardType="decimal-pad" />
        <Field label="Reorder Level (alert when below this)" value={form.reorder_level} onChange={set('reorder_level')} placeholder="0" keyboardType="decimal-pad" />
        <Field label="Supplier" value={form.supplier} onChange={set('supplier')} placeholder="Supplier name" />
        <Field label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." multiline />

        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editId ? 'Update Ingredient' : 'Add Ingredient'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType, prefix }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, multiline && styles.textarea, prefix && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType ?? 'default'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  prefix: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', borderRightWidth: 0, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, paddingHorizontal: 10, height: 44, textAlignVertical: 'center', lineHeight: 44, fontSize: 14, color: '#374151' },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb', height: 44 },
  textarea: { height: 80, textAlignVertical: 'top' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  unitBtnActive: { backgroundColor: '#be185d', borderColor: '#be185d' },
  unitBtnText: { fontSize: 13, color: '#374151' },
  unitBtnTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#be185d', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
