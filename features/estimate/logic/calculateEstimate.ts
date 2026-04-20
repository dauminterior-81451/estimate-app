import type { EstimateCategory, EstimateItem } from "@/types/estimate";

export const calcItem = (qty: number, price: number) => qty * price;

export const calcCategory = (items: EstimateItem[]) =>
  items.reduce((sum, item) => sum + calcItem(item.qty, item.price), 0);

export const calcTotal = (categories: EstimateCategory[], vat: boolean) => {
  const supply = categories.reduce(
    (sum, category) => sum + calcCategory(category.items),
    0
  );
  const vatAmount = vat ? Math.round(supply * 0.1) : 0;

  return {
    supply,
    vatAmount,
    total: supply + vatAmount,
  };
};
