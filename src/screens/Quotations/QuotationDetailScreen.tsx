import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getQuotation, updateQuotationStatus, deleteQuotation } from '../../services/quotationService';
import { createInvoice } from '../../services/invoiceService';
import { generateAndShareQuotationPdf } from '../../utils/pdfGenerator';
import { Quotation } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import { useSettings } from '../../hooks/useSettings';

export default function QuotationDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { settings } = useSettings();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const load = useCallback(async () => { setQuotation(await getQuotation(id)); }, [id]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const shareAsPdf = async () => {
    if (!quotation) return;
    setGeneratingPdf(true);
    try { await generateAndShareQuotationPdf(quotation, settings); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setGeneratingPdf(false); }
  };

  const convertToInvoice = async () => {
    if (!quotation) return;
    try {
      const invoiceItems = (quotation.items ?? []).map((i) => ({
        product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price,
      }));
      const inv = await createInvoice({
        customer_id: quotation.customer_id, issue_date: new Date().toISOString(), status: 'draft',
        notes: quotation.notes,
        labor_percent: quotation.labor_percent, tax_percent: quotation.tax_percent, markup_percent: quotation.markup_percent,
        subtotal: quotation.subtotal, labor_amount: quotation.labor_amount, markup_amount: quotation.markup_amount,
        tax_amount: quotation.tax_amount, total: quotation.total,
      }, invoiceItems);
      await updateQuotationStatus(id, 'accepted');
      Alert.alert('Invoice Created', `Invoice ${inv.invoice_number} created from this quotation!`, [
        { text: 'View Invoice', onPress: () => navigation.navigate('More', { screen: 'Invoices', params: { screen: 'InvoiceDetail', params: { id: inv.id } } }) },
        { text: 'OK' },
      ]);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (!quotation) return null;
  const sym = settings.currency_symbol;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.quoteNum}>{quotation.quote_number}</Text>
          <Text style={styles.customer}>{quotation.customer?.name}</Text>
          <Text style={styles.date}>Issued: {formatDate(quotation.issue_date)}</Text>
          {quotation.valid_until && <Text style={styles.date}>Valid until: {formatDate(quotation.valid_until)}</Text>}
        </View>
        <StatusBadge status={quotation.status} />
      </View>

      <Text style={styles.sectionTitle}>Items</Text>
      {(quotation.items ?? []).map((item, idx) => (
        <View key={item.id ?? idx} style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemName}>{item.product?.name ?? 'Item'}</Text>
            <Text style={styles.itemQty}>× {item.quantity} @ {formatCurrency(item.unit_price, sym)}</Text>
          </View>
          <Text style={styles.itemTotal}>{formatCurrency(item.total_price, sym)}</Text>
        </View>
      ))}

      <View style={styles.totalsBox}>
        {[['Subtotal', quotation.subtotal], [`Markup (${quotation.markup_percent}%)`, quotation.markup_amount], [`Labour (${quotation.labor_percent}%)`, quotation.labor_amount], [`Tax (${quotation.tax_percent}%)`, quotation.tax_amount]].map(([l, v]: any) => (
          <View key={l} style={styles.tRow}><Text style={styles.tLabel}>{l}</Text><Text style={styles.tValue}>{formatCurrency(Number(v), sym)}</Text></View>
        ))}
        <View style={styles.divider} />
        <View style={styles.tRow}><Text style={styles.tBold}>TOTAL</Text><Text style={styles.tBold}>{formatCurrency(quotation.total, sym)}</Text></View>
      </View>

      {quotation.notes ? <View style={styles.notes}><Text style={styles.notesLabel}>Notes</Text><Text style={styles.notesText}>{quotation.notes}</Text></View> : null}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#8B5CF6' }]} onPress={shareAsPdf} disabled={generatingPdf}>
          {generatingPdf ? <ActivityIndicator size="small" color="#8B5CF6" /> : <MaterialCommunityIcons name="file-pdf-box" size={20} color="#8B5CF6" />}
          <Text style={[styles.actionText, { color: '#8B5CF6' }]}>Share PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#10B981' }]} onPress={convertToInvoice}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color="#10B981" />
          <Text style={[styles.actionText, { color: '#10B981' }]}>Convert to Invoice</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => Alert.alert('Delete', 'Delete this quotation?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteQuotation(id); navigation.goBack(); } }])}>
        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
        <Text style={styles.deleteText}>Delete Quotation</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  quoteNum: { fontSize: 18, fontWeight: 'bold', color: '#8B5CF6' },
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
  tBold: { fontSize: 17, fontWeight: 'bold', color: '#8B5CF6' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  notes: { backgroundColor: '#fff', margin: 12, borderRadius: 8, padding: 12 },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#8B5CF6', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#374151' },
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 12, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1.5, backgroundColor: '#fff' },
  actionText: { fontSize: 13, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 12, padding: 12 },
  deleteText: { fontSize: 13, color: '#EF4444' },
});
