import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '../../hooks/useSettings';

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'TTD', symbol: 'TT$', label: 'Trinidad Dollar' },
  { code: 'JMD', symbol: 'J$', label: 'Jamaican Dollar' },
  { code: 'BBD', symbol: 'Bds$', label: 'Barbados Dollar' },
];

export default function OwnerProfileScreen() {
  const { settings, loading, saveSettings } = useSettings();
  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    labor_cost_percent: '',
    tax_percent: '',
    markup_percent: '',
    currency: 'USD',
    currency_symbol: '$',
  });
  const [saving, setSaving] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm({
        business_name: settings.business_name,
        owner_name: settings.owner_name,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
        labor_cost_percent: String(settings.labor_cost_percent),
        tax_percent: String(settings.tax_percent),
        markup_percent: String(settings.markup_percent),
        currency: settings.currency,
        currency_symbol: settings.currency_symbol,
      });
    }
  }, [loading, settings]);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = async () => {
    if (!form.business_name.trim()) { Alert.alert('Business name required'); return; }
    setSaving(true);
    const success = await saveSettings({
      ...form,
      labor_cost_percent: parseFloat(form.labor_cost_percent) || 0,
      tax_percent: parseFloat(form.tax_percent) || 0,
      markup_percent: parseFloat(form.markup_percent) || 0,
    });
    setSaving(false);
    if (success) { Alert.alert('Saved', 'Settings saved successfully!'); }
    else { Alert.alert('Error', 'Could not save settings. Check your Supabase connection.'); }
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === form.currency);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Business Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="storefront" size={20} color="#be185d" />
            <Text style={styles.sectionTitle}>Business Information</Text>
          </View>
          <Field label="Business Name *" value={form.business_name} onChange={set('business_name')} placeholder="Sweet Kakes n Treats" />
          <Field label="Owner Name" value={form.owner_name} onChange={set('owner_name')} placeholder="Your full name" />
          <Field label="Email" value={form.email} onChange={set('email')} placeholder="business@email.com" keyboardType="email-address" />
          <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
          <Field label="Address" value={form.address} onChange={set('address')} placeholder="Business address" multiline />
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="currency-usd" size={20} color="#be185d" />
            <Text style={styles.sectionTitle}>Currency</Text>
          </View>
          <TouchableOpacity style={styles.currencyBtn} onPress={() => setShowCurrencyPicker((v) => !v)}>
            <Text style={styles.currencySymbol}>{selectedCurrency?.symbol}</Text>
            <Text style={styles.currencyLabel}>{selectedCurrency?.label} ({selectedCurrency?.code})</Text>
            <MaterialCommunityIcons name={showCurrencyPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#6b7280" />
          </TouchableOpacity>
          {showCurrencyPicker && (
            <View style={styles.currencyList}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity key={c.code} style={[styles.currencyItem, form.currency === c.code && styles.currencyItemActive]} onPress={() => { set('currency')(c.code); set('currency_symbol')(c.symbol); setShowCurrencyPicker(false); }}>
                  <Text style={styles.currencyItemSymbol}>{c.symbol}</Text>
                  <Text style={styles.currencyItemLabel}>{c.label}</Text>
                  {form.currency === c.code && <MaterialCommunityIcons name="check" size={18} color="#be185d" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Default Rates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="percent" size={20} color="#be185d" />
            <Text style={styles.sectionTitle}>Default Pricing Rates</Text>
          </View>
          <Text style={styles.ratesNote}>These are default rates applied to new orders, invoices, and quotations. You can adjust them per-document.</Text>

          <View style={styles.ratesGrid}>
            <RateCard
              label="Labour Cost"
              value={form.labor_cost_percent}
              onChange={set('labor_cost_percent')}
              description="Applied on top of ingredient cost"
              icon="account-hard-hat"
            />
            <RateCard
              label="Markup"
              value={form.markup_percent}
              onChange={set('markup_percent')}
              description="Profit margin percentage"
              icon="trending-up"
            />
            <RateCard
              label="Tax"
              value={form.tax_percent}
              onChange={set('tax_percent')}
              description="Sales tax applied to total"
              icon="bank"
            />
          </View>

          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Price Calculation Preview</Text>
            <Text style={styles.previewText}>For a product with $10.00 ingredient cost:</Text>
            {(() => {
              const ingCost = 10;
              const markup = (ingCost * (parseFloat(form.markup_percent) || 0)) / 100;
              const labor = (ingCost * (parseFloat(form.labor_cost_percent) || 0)) / 100;
              const subtotal = ingCost + markup + labor;
              const tax = (subtotal * (parseFloat(form.tax_percent) || 0)) / 100;
              const total = subtotal + tax;
              return (
                <>
                  <View style={styles.previewRow}><Text style={styles.previewLabel}>Ingredients</Text><Text style={styles.previewVal}>$10.00</Text></View>
                  <View style={styles.previewRow}><Text style={styles.previewLabel}>+ Markup ({form.markup_percent}%)</Text><Text style={styles.previewVal}>+${markup.toFixed(2)}</Text></View>
                  <View style={styles.previewRow}><Text style={styles.previewLabel}>+ Labour ({form.labor_cost_percent}%)</Text><Text style={styles.previewVal}>+${labor.toFixed(2)}</Text></View>
                  <View style={styles.previewRow}><Text style={styles.previewLabel}>+ Tax ({form.tax_percent}%)</Text><Text style={styles.previewVal}>+${tax.toFixed(2)}</Text></View>
                  <View style={[styles.previewRow, styles.previewTotal]}><Text style={styles.previewTotalLabel}>= Selling Price</Text><Text style={styles.previewTotalVal}>${total.toFixed(2)}</Text></View>
                </>
              );
            })()}
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
          <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    </View>
  );
}

function RateCard({ label, value, onChange, description, icon }: any) {
  return (
    <View style={styles.rateCard}>
      <MaterialCommunityIcons name={icon} size={20} color="#be185d" />
      <Text style={styles.rateCardLabel}>{label}</Text>
      <View style={styles.rateInputRow}>
        <TextInput style={styles.rateInput} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
        <Text style={styles.pctSymbol}>%</Text>
      </View>
      <Text style={styles.rateDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 11, fontSize: 14, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb' },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  currencySymbol: { fontSize: 18, fontWeight: 'bold', color: '#be185d', width: 30, textAlign: 'center' },
  currencyLabel: { flex: 1, fontSize: 14, color: '#1f2937' },
  currencyList: { marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  currencyItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8 },
  currencyItemActive: { backgroundColor: '#fce7f3' },
  currencyItemSymbol: { fontSize: 14, fontWeight: 'bold', color: '#be185d', width: 36 },
  currencyItemLabel: { flex: 1, fontSize: 13, color: '#1f2937' },
  ratesNote: { fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 18 },
  ratesGrid: { gap: 10 },
  rateCard: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 4 },
  rateCardLabel: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  rateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 18, fontWeight: 'bold', color: '#be185d', textAlign: 'center' },
  pctSymbol: { fontSize: 18, fontWeight: 'bold', color: '#be185d' },
  rateDescription: { fontSize: 11, color: '#9ca3af' },
  previewBox: { marginTop: 16, backgroundColor: '#fdf2f8', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#fce7f3' },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#be185d', marginBottom: 8 },
  previewText: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  previewLabel: { fontSize: 12, color: '#6b7280' },
  previewVal: { fontSize: 12, color: '#1f2937', fontWeight: '500' },
  previewTotal: { borderTopWidth: 1, borderTopColor: '#fce7f3', marginTop: 4, paddingTop: 8 },
  previewTotalLabel: { fontSize: 14, fontWeight: 'bold', color: '#be185d' },
  previewTotalVal: { fontSize: 16, fontWeight: 'bold', color: '#be185d' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#be185d', borderRadius: 10, padding: 16, margin: 12, marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
