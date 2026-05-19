import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCustomers, deleteCustomer } from '../../services/customerService';
import { Customer } from '../../types';
import EmptyState from '../../components/common/EmptyState';

export default function CustomerListScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getCustomers();
    setCustomers(data);
    setFiltered(data);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q) || (c.email ?? '').toLowerCase().includes(q)));
  }, [search, customers]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete Customer', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCustomer(id); load(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Search customers..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState icon="account-group-outline" title="No customers yet" subtitle="Tap + to add your first customer" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CustomerDetail', { id: item.id })}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone && <Text style={styles.sub}>{item.phone}</Text>}
              {item.email && <Text style={styles.sub}>{item.email}</Text>}
            </View>
            <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)} style={styles.deleteBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#d1d5db" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ flexGrow: 1 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CustomerForm', {})}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 10, paddingHorizontal: 12, elevation: 1 },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, height: 44, fontSize: 14, color: '#1f2937' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#be185d' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  deleteBtn: { padding: 8 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#be185d', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
