import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, FlatList, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createOrder } from '../../services/orderService';
import { getCustomers } from '../../services/customerService';
import { getProducts } from '../../services/productService';
import { Customer, Product, OrderItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateOrderTotals } from '../../utils/calculations';
import { useSettings } from '../../hooks/useSettings';

export default function OrderFormScreen({ navigation }: any) {
  const { settings } = useSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<{ product: Product; quantity: number; unitPrice: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [laborPct, setLaborPct] = useState(String(settings.labor_cost_percent));
  const [taxPct, setTaxPct] = useState(String(settings.tax_percent));
  const [markupPct, setMarkupPct] = useState(String(settings.markup_percent));
  const [saving, setSaving] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    setLaborPct(String(settings.labor_cost_percent));
    setTaxPct(String(settings.tax_percent));
    setMarkupPct(String(settings.markup_percent));
    Promise.all([getCustomers(), getProducts()]).then(([c, p]) => { setCustomers(c); setProducts(p); });
  }, [settings]);

  const itemsSubtotal = items.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * i.quantity, 0);
  const totals = calculateOrderTotals(itemsSubtotal, parseFloat(laborPct) || 0, parseFloat(taxPct) || 0, parseFloat(markupPct) || 0);
  const sym = settings.currency_symbol;

  const addProduct = (p: Product) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.product.id === p.id);
      if (ex) return prev.map((i) => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1, unitPrice: '' }];
    });
    setShowProductModal(false);
  };

  const save = async () => {
    if (!selectedCustomer) { Alert.alert('Please select a customer'); return; }
    if (items.length === 0) { Alert.alert('Add at least one product'); return; }
    setSaving(true);
    try {
      const orderItems: Omit<OrderItem, 'id' | 'order_id'>[] = items.map((i) => {
        const up = parseFloat(i.unitPrice) || 0;
        return { product_id: i.product.id, quantity: i.quantity, unit_price: up, total_price: up * i.quantity };
      });
      await createOrder({
        customer_id: selectedCustomer.id,
        order_date: new Date().toISOString(),
        delivery_date: deliveryDate || undefined,
        status: 'pending',
        notes,
        labor_percent: parseFloat(laborPct) || 0,
        tax_percent: parseFloat(taxPct) || 0,
        markup_percent: parseFloat(markupPct) || 0,
        subtotal: totals.subtotal,
        labor_amount: totals.labor_amount,
        markup_amount: totals.markup_amount,
        tax_amount: totals.tax_amount,
        total: totals.total,
      }, orderItems);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Customer */}
        <Text style={styles.sectionTitle}>Customer *</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCustomerModal(true)}>
          <MaterialCommunityIcons name="account" size={18} color="#6b7280" />
          <Text style={[styles.selectText, selectedCustomer && styles.selectedText]}>
            {selectedCustomer ? selectedCustomer.name : 'Select Customer...'}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color="#9ca3af" />
        </TouchableOpacity>

        {/* Products */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Products *</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowProductModal(true)}>
            <MaterialCommunityIcons name="plus" size={16} color="#be185d" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {items.map((item, idx) => (
          <View key={item.product.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <View style={styles.itemControls}>
                <TouchableOpacity onPress={() => setItems((p) => p.map((i, ii) => ii === idx ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}>
                  <MaterialCommunityIcons name="minus-circle" size={22} color="#6b7280" />
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => setItems((p) => p.map((i, ii) => ii === idx ? { ...i, quantity: i.quantity + 1 } : i))}>
                  <MaterialCommunityIcons name="plus-circle" size={22} color="#be185d" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.itemPrice}>
              <Text style={styles.priceLabel}>Unit Price</Text>
              <TextInput
                style={styles.priceInput}
                value={item.unitPrice}
                onChangeText={(v) => setItems((p) => p.map((i, ii) => ii === idx ? { ...i, unitPrice: v } : i))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={() => setItems((p) => p.filter((_, ii) => ii !== idx))}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Rates */}
        <Text style={styles.sectionTitle}>Pricing Rates</Text>
        <View style={styles.ratesRow}>
          <RateField label="Markup %" value={markupPct} onChange={setMarkupPct} />
          <RateField label="Labour %" value={laborPct} onChange={setLaborPct} />
          <RateField label="Tax %" value={taxPct} onChange={setTaxPct} />
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <TotalRow label="Subtotal" value={formatCurrency(itemsSubtotal, sym)} />
          <TotalRow label={`Markup (${markupPct}%)`} value={formatCurrency(totals.markup_amount, sym)} />
          <TotalRow label={`Labour (${laborPct}%)`} value={formatCurrency(totals.labor_amount, sym)} />
          <TotalRow label={`Tax (${taxPct}%)`} value={formatCurrency(totals.tax_amount, sym)} />
          <View style={styles.totalDivider} />
          <TotalRow label="TOTAL" value={formatCurrency(totals.total, sym)} bold />
        </View>

        {/* Other fields */}
        <Text style={styles.sectionTitle}>Delivery Date (optional)</Text>
        <TextInput style={styles.input} value={deliveryDate} onChangeText={setDeliveryDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9ca3af" />

        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput style={[styles.input, styles.textarea]} value={notes} onChangeText={setNotes} placeholder="Special instructions..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} />

        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Creating Order...' : 'Create Order'}</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Customer Modal */}
      <Modal visible={showCustomerModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <FlatList data={customers} keyExtractor={(c) => c.id} renderItem={({ item }) => (
            <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedCustomer(item); setShowCustomerModal(false); }}>
              <Text style={styles.modalItemText}>{item.name}</Text>
              {item.phone && <Text style={styles.modalItemSub}>{item.phone}</Text>}
            </TouchableOpacity>
          )} />
        </View>
      </Modal>

      {/* Product Modal */}
      <Modal visible={showProductModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <FlatList data={products} keyExtractor={(p) => p.id} renderItem={({ item }) => (
            <TouchableOpacity style={styles.modalItem} onPress={() => addProduct(item)}>
              <Text style={styles.modalItemText}>{item.name}</Text>
              {item.category && <Text style={styles.modalItemSub}>{item.category}</Text>}
            </TouchableOpacity>
          )} />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function RateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.rateLabel}>{label}</Text>
      <TextInput style={styles.rateInput} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
    </View>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.totalBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  selectText: { flex: 1, fontSize: 14, color: '#9ca3af' },
  selectedText: { color: '#1f2937', fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#be185d' },
  addBtnText: { color: '#be185d', fontSize: 12, fontWeight: '600' },
  itemRow: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1f2937', flex: 1 },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qty: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', minWidth: 24, textAlign: 'center' },
  itemPrice: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceLabel: { fontSize: 12, color: '#6b7280' },
  priceInput: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 6, padding: 8, fontSize: 14, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb', textAlign: 'right' },
  ratesRow: { flexDirection: 'row', gap: 8 },
  rateLabel: { fontSize: 12, color: '#374151', fontWeight: '600', marginBottom: 4 },
  rateInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14, textAlign: 'center', color: '#1f2937' },
  totalsBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalValue: { fontSize: 13, color: '#1f2937', fontWeight: '500' },
  totalBold: { fontSize: 16, fontWeight: 'bold', color: '#be185d' },
  totalDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#be185d', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  modalItemText: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  modalItemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
