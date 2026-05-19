import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { createCustomer, updateCustomer, getCustomer } from '../../services/customerService';

export default function CustomerFormScreen({ route, navigation }: any) {
  const editId = route.params?.id as string | undefined;
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      getCustomer(editId).then((c) => {
        if (c) setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', notes: c.notes ?? '' });
      });
    }
  }, [editId]);

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    try {
      if (editId) { await updateCustomer(editId, form); }
      else { await createCustomer(form); }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Field label="Full Name *" value={form.name} onChange={set('name')} placeholder="e.g. Jane Smith" />
        <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
        <Field label="Email" value={form.email} onChange={set('email')} placeholder="jane@example.com" keyboardType="email-address" />
        <Field label="Address" value={form.address} onChange={set('address')} placeholder="Street, City, State" multiline />
        <Field label="Notes" value={form.notes} onChange={set('notes')} placeholder="Any additional notes..." multiline />

        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editId ? 'Update Customer' : 'Add Customer'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#be185d', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
