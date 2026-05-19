import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getInvoice, updateInvoiceStatus, deleteInvoice } from '../../services/invoiceService';
import { generateAndShareInvoicePdf } from '../../utils/pdfGenerator';
import { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import { useSettings } from '../../hooks/useSettings';

export default function InvoiceDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { settings } = useSettings();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const load = useCallback(async () => { setInvoice(await getInvoice(id)); }, [id]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markPaid = () => {
    Alert.alert('Mark as Paid', 'Mark this invoice as paid?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: async () => { await updateInvoiceStatus(id, 'paid'); load(); } },
    ]);
  };

  const shareAsPdf = async () => {
    if (!invoice) return;
    setGeneratingPdf(true);
    try {
      await generateAndShareInvoicePdf(invoice, settings);
    } catch (e: any) {
      Alert.alert('Error', 'Could not generate PDF: ' + e.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete Invoice', 'Permanently delete this invoice?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteInvoice(id); navigation.goBack(); } },
    ]);
  };

  if (!invoice) return null;
  const sym = settings.currency_symbol;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.invoiceNum}>{invoice.invoice_number}</Text>
          <Text style={styles.customer}>{invoice.customer?.name}</Text>
          <Text style={styles.date}>Issued: {formatDate(invoice.issue_date)}</Text>
          {invoice.due_date && <Text style={styles.date}>Due: {formatDate(invoice.due_date)}</Text>}
        </View>
        <StatusBadge status={invoice.status} />
      </View>

      <Text style={styles.sectionTitle}>Items</Text>
      {(invoice.items ?? []).map((item, idx) => (
        <View key={item.id ?? idx} style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemName}>{item.product?.name ?? 'Item'}</Text>
            <Text style={styles.itemQty}>× {item.quantity} @ {formatCurrency(item.unit_price, sym)}</Text>
          </View>
          <Text style={styles.itemTotal}>{formatCurrency(item.total_price, sym)}</Text>
        </View>
      ))}

      <View style={styles.totalsBox}>
        <TRow label="Subtotal" value={formatCurrency(invoice.subtotal, sym)} />
        <TRow label={`Markup (${invoice.markup_percent}%)`} value={formatCurrency(invoice.markup_amount, sym)} />
        <TRow label={`Labour (${invoice.labor_percent}%)`} value={formatCurrency(invoice.labor_amount, sym)} />
        <TRow label={`Tax (${invoice.tax_percent}%)`} value={formatCurrency(invoice.tax_amount, sym)} />
        <View style={styles.divider} />
        <TRow label="TOTAL" value={formatCurrency(invoice.total, sym)} bold />
      </View>

      {invoice.notes ? (
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{invoice.notes}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#10B981' }]} onPress={markPaid} disabled={invoice.status === 'paid'}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color="#10B981" />
          <Text style={[styles.actionText, { color: '#10B981' }]}>Mark Paid</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#be185d' }]} onPress={shareAsPdf} disabled={generatingPdf}>
          {generatingPdf ? <ActivityIndicator size="small" color="#be185d" /> : <MaterialCommunityIcons name="file-pdf-box" size={20} color="#be185d" />}
          <Text style={[styles.actionText, { color: '#be185d' }]}>Share PDF</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
        <Text style={styles.deleteText}>Delete Invoice</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function TRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.tRow}>
      <Text style={[styles.tLabel, bold && styles.tBold]}>{label}</Text>
      <Text style={[styles.tValue, bold && styles.tBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  invoiceNum: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },
  customer: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginTop: 4 },
  date: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  itemRow: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 4, borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  itemQty: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  totalsBox: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 16 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  tLabel: { fontSize: 13, color: '#6b7280' },
  tValue: { fontSize: 13, color: '#1f2937', fontWeight: '500' },
  tBold: { fontSize: 17, fontWeight: 'bold', color: '#be185d' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  notes: { backgroundColor: '#fff', margin: 12, borderRadius: 8, padding: 12 },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#be185d', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#374151' },
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 12, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1.5, backgroundColor: '#fff' },
  actionText: { fontSize: 13, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 12, padding: 12 },
  deleteText: { fontSize: 13, color: '#EF4444' },
});
