import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import CustomerListScreen from '../screens/Customers/CustomerListScreen';
import CustomerDetailScreen from '../screens/Customers/CustomerDetailScreen';
import CustomerFormScreen from '../screens/Customers/CustomerFormScreen';
import OrderListScreen from '../screens/Orders/OrderListScreen';
import OrderDetailScreen from '../screens/Orders/OrderDetailScreen';
import OrderFormScreen from '../screens/Orders/OrderFormScreen';
import InvoiceListScreen from '../screens/Invoices/InvoiceListScreen';
import InvoiceDetailScreen from '../screens/Invoices/InvoiceDetailScreen';
import InvoiceFormScreen from '../screens/Invoices/InvoiceFormScreen';
import QuotationListScreen from '../screens/Quotations/QuotationListScreen';
import QuotationDetailScreen from '../screens/Quotations/QuotationDetailScreen';
import QuotationFormScreen from '../screens/Quotations/QuotationFormScreen';
import InventoryListScreen from '../screens/Inventory/InventoryListScreen';
import IngredientFormScreen from '../screens/Inventory/IngredientFormScreen';
import ProductListScreen from '../screens/Products/ProductListScreen';
import ProductFormScreen from '../screens/Products/ProductFormScreen';
import PriceCalculatorScreen from '../screens/Calculator/PriceCalculatorScreen';
import ReportsScreen from '../screens/Reports/ReportsScreen';
import OwnerProfileScreen from '../screens/Settings/OwnerProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const PINK = '#be185d';
const HEADER_STYLE = { backgroundColor: PINK };
const HEADER_TITLE_STYLE = { color: '#fff', fontWeight: '700' as const };
const HEADER_TINT = '#fff';

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: HEADER_STYLE, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ title: 'Customers' }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={({ route }: any) => ({ title: route.params?.id ? 'Edit Customer' : 'New Customer' })} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: HEADER_STYLE, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: 'Orders' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
      <Stack.Screen name="OrderForm" component={OrderFormScreen} options={{ title: 'New Order' }} />
    </Stack.Navigator>
  );
}

function InvoicesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#3B82F6' }, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Invoice' }} />
      <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={{ title: 'New Invoice' }} />
    </Stack.Navigator>
  );
}

function QuotationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#8B5CF6' }, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="QuotationList" component={QuotationListScreen} options={{ title: 'Quotations' }} />
      <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} options={{ title: 'Quotation' }} />
      <Stack.Screen name="QuotationForm" component={QuotationFormScreen} options={{ title: 'New Quotation' }} />
    </Stack.Navigator>
  );
}

function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#10B981' }, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="InventoryList" component={InventoryListScreen} options={{ title: 'Inventory' }} />
      <Stack.Screen name="IngredientForm" component={IngredientFormScreen} options={({ route }: any) => ({ title: route.params?.id ? 'Edit Ingredient' : 'Add Ingredient' })} />
    </Stack.Navigator>
  );
}

function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: HEADER_STYLE, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Products & Recipes' }} />
      <Stack.Screen name="ProductDetail" component={ProductFormScreen} options={{ title: 'Edit Product' }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={({ route }: any) => ({ title: route.params?.id ? 'Edit Product' : 'New Product' })} />
    </Stack.Navigator>
  );
}

// Combined "More" stack with Invoices + Quotations + Products + Calculator
function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: HEADER_STYLE, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: 'More' }} />
      <Stack.Screen name="Invoices" component={InvoicesStack} options={{ headerShown: false }} />
      <Stack.Screen name="Quotations" component={QuotationsStack} options={{ headerShown: false }} />
      <Stack.Screen name="Products" component={ProductsStack} options={{ headerShown: false }} />
      <Stack.Screen name="Calculator" component={PriceCalculatorScreen} options={{ title: 'Price Calculator', headerStyle: HEADER_STYLE, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }} />
    </Stack.Navigator>
  );
}

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function MoreMenuScreen({ navigation }: any) {
  const items = [
    { label: 'Invoices', icon: 'file-document', color: '#3B82F6', screen: 'Invoices' },
    { label: 'Quotations', icon: 'file-question', color: '#8B5CF6', screen: 'Quotations' },
    { label: 'Products & Recipes', icon: 'cupcake', color: '#be185d', screen: 'Products' },
    { label: 'Price Calculator', icon: 'calculator', color: '#10B981', screen: 'Calculator' },
  ];
  return (
    <View style={moreStyles.container}>
      {items.map((item) => (
        <TouchableOpacity key={item.screen} style={moreStyles.card} onPress={() => navigation.navigate(item.screen)}>
          <View style={[moreStyles.icon, { backgroundColor: item.color + '1A' }]}>
            <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
          </View>
          <Text style={moreStyles.label}>{item.label}</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const moreStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12, elevation: 1 },
  icon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1f2937' },
});

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, string> = {
              Dashboard: 'view-dashboard',
              Customers: 'account-group',
              Orders: 'clipboard-list',
              Inventory: 'package-variant',
              Reports: 'chart-bar',
              Settings: 'cog',
              More: 'dots-horizontal-circle',
            };
            return <MaterialCommunityIcons name={(icons[route.name] ?? 'circle') as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: PINK,
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: { paddingBottom: 4, height: 60 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreenWrapper} />
        <Tab.Screen name="Customers" component={CustomersStack} />
        <Tab.Screen name="Orders" component={OrdersStack} />
        <Tab.Screen name="Inventory" component={InventoryStack} />
        <Tab.Screen name="Reports" component={ReportsScreenWrapper} />
        <Tab.Screen name="More" component={MoreStack} />
        <Tab.Screen name="Settings" component={SettingsScreenWrapper} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function DashboardScreenWrapper({ navigation }: any) {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: HEADER_STYLE, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ title: '🎂 Sweet Kakes n Treats' }} />
    </Stack.Navigator>
  );
}

function ReportsScreenWrapper() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#F59E0B' }, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="ReportsMain" component={ReportsScreen} options={{ title: 'Sales Reports' }} />
    </Stack.Navigator>
  );
}

function SettingsScreenWrapper() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: HEADER_STYLE, headerTitleStyle: HEADER_TITLE_STYLE, headerTintColor: HEADER_TINT }}>
      <Stack.Screen name="SettingsMain" component={OwnerProfileScreen} options={{ title: 'Owner Profile & Settings' }} />
    </Stack.Navigator>
  );
}
