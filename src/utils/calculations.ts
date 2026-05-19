export interface PricingBreakdown {
  ingredient_cost: number;
  markup_amount: number;
  labor_amount: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

export function calculateProductCost(
  ingredientCost: number,
  markupPercent: number,
  laborPercent: number,
  taxPercent: number,
): PricingBreakdown {
  const markup_amount = ingredientCost * (markupPercent / 100);
  const subtotal_before_labor = ingredientCost + markup_amount;
  const labor_amount = subtotal_before_labor * (laborPercent / 100);
  const subtotal = subtotal_before_labor + labor_amount;
  const tax_amount = subtotal * (taxPercent / 100);
  const total = subtotal + tax_amount;

  return {
    ingredient_cost: round2(ingredientCost),
    markup_amount: round2(markup_amount),
    labor_amount: round2(labor_amount),
    subtotal: round2(subtotal),
    tax_amount: round2(tax_amount),
    total: round2(total),
  };
}

export function calculateOrderTotals(
  itemsSubtotal: number,
  laborPercent: number,
  taxPercent: number,
  markupPercent: number,
): { subtotal: number; labor_amount: number; markup_amount: number; tax_amount: number; total: number } {
  const markup_amount = round2(itemsSubtotal * (markupPercent / 100));
  const labor_amount = round2(itemsSubtotal * (laborPercent / 100));
  const subtotal = round2(itemsSubtotal + markup_amount + labor_amount);
  const tax_amount = round2(subtotal * (taxPercent / 100));
  const total = round2(subtotal + tax_amount);
  return { subtotal, labor_amount, markup_amount, tax_amount, total };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function convertToBaseUnit(quantity: number, fromUnit: string): number {
  const conversions: Record<string, number> = {
    kg: 1000,
    g: 1,
    lb: 453.592,
    oz: 28.3495,
    L: 1000,
    mL: 1,
    cup: 240,
    tbsp: 15,
    tsp: 5,
    pcs: 1,
    dozen: 12,
  };
  return quantity * (conversions[fromUnit] ?? 1);
}
