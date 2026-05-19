export interface OwnerSettings {
  id?: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  labor_cost_percent: number;
  tax_percent: number;
  markup_percent: number;
  currency: string;
  currency_symbol: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  quantity_in_stock: number;
  reorder_level: number;
  supplier?: string;
  notes?: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  description?: string;
  is_active: boolean;
  recipe_items?: RecipeItem[];
  calculated_cost?: number;
}

export interface RecipeItem {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  ingredient?: Ingredient;
}

export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'ready' | 'delivered' | 'cancelled';
export type DocumentStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'accepted' | 'rejected' | 'expired';

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  delivery_date?: string;
  status: OrderStatus;
  notes?: string;
  labor_percent: number;
  tax_percent: number;
  markup_percent: number;
  subtotal: number;
  labor_amount: number;
  markup_amount: number;
  tax_amount: number;
  total: number;
  customer?: Customer;
  items?: OrderItem[];
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  product?: Product;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id?: string;
  customer_id: string;
  issue_date: string;
  due_date?: string;
  status: DocumentStatus;
  notes?: string;
  labor_percent: number;
  tax_percent: number;
  markup_percent: number;
  subtotal: number;
  labor_amount: number;
  markup_amount: number;
  tax_amount: number;
  total: number;
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  product?: Product;
}

export interface Quotation {
  id: string;
  quote_number: string;
  customer_id: string;
  issue_date: string;
  valid_until?: string;
  status: DocumentStatus;
  notes?: string;
  labor_percent: number;
  tax_percent: number;
  markup_percent: number;
  subtotal: number;
  labor_amount: number;
  markup_amount: number;
  tax_amount: number;
  total: number;
  customer?: Customer;
  items?: QuotationItem[];
}

export interface DailySalesSummary {
  date: string;
  total_orders: number;
  total_revenue: number;
  paid_invoices: number;
  pending_orders: number;
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface CalculatorIngredient {
  ingredient: Ingredient;
  quantity: number;
  cost: number;
}
