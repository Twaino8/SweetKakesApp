import { supabase } from '../config/supabase';
import { Product, RecipeItem } from '../types';

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, recipe_items(*, ingredient:ingredients(*))')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data as Product[];
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, recipe_items(*, ingredient:ingredients(*))')
    .order('name');
  if (error) throw error;
  return data as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, recipe_items(*, ingredient:ingredients(*))')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Product;
}

export async function createProduct(product: Omit<Product, 'id' | 'recipe_items' | 'calculated_cost'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  const { recipe_items, calculated_cost, ...rest } = product as any;
  const { data, error } = await supabase
    .from('products')
    .update(rest)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

export async function saveRecipeItems(productId: string, items: Omit<RecipeItem, 'id'>[]): Promise<void> {
  await supabase.from('recipe_items').delete().eq('product_id', productId);
  if (items.length === 0) return;
  const rows = items.map((i) => ({ ...i, product_id: productId }));
  const { error } = await supabase.from('recipe_items').insert(rows);
  if (error) throw error;
}

export function computeIngredientCost(recipe_items: RecipeItem[]): number {
  return recipe_items.reduce((sum, item) => {
    const price = item.ingredient?.unit_price ?? 0;
    return sum + price * item.quantity;
  }, 0);
}
