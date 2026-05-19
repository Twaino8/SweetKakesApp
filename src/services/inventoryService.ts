import { supabase } from '../config/supabase';
import { Ingredient } from '../types';

export async function getIngredients(): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Ingredient[];
}

export async function getIngredient(id: string): Promise<Ingredient | null> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Ingredient;
}

export async function createIngredient(ingredient: Omit<Ingredient, 'id' | 'updated_at'>): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .insert(ingredient)
    .select()
    .single();
  if (error) throw error;
  return data as Ingredient;
}

export async function updateIngredient(id: string, ingredient: Partial<Ingredient>): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .update(ingredient)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Ingredient;
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await supabase.from('ingredients').delete().eq('id', id);
  if (error) throw error;
}

export async function updateStock(id: string, newQuantity: number): Promise<void> {
  const { error } = await supabase
    .from('ingredients')
    .update({ quantity_in_stock: newQuantity })
    .eq('id', id);
  if (error) throw error;
}

export async function getLowStockIngredients(): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .filter('quantity_in_stock', 'lte', supabase.rpc as any)
    .order('name');
  // Fallback: fetch all and filter client-side
  const { data: all, error: e2 } = await supabase.from('ingredients').select('*');
  if (e2) return [];
  return (all as Ingredient[]).filter((i) => i.quantity_in_stock <= i.reorder_level);
}
