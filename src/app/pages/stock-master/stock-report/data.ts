export interface StockItem {
  variantId: number;
  id: number;
  itemName: string;
  hsn: string;
  unit: string;
  brand: string;
  category: string;
  subCategory: string;
  subSubCategory: string;
  size: string;
  color: string;
  purchasePrice: number;
  salesPrice: number;
  stock: number;
  createdBySuperadmin: boolean;
}

export interface StockHistoryEntry {
  id: number;
  date: string;
  type: string;
  qty: number;
  balance: number;
  reference: string;
  note: string;
}

export function mapApiStockItem(raw: any): StockItem {
  return {
    variantId: Number(raw.variantId ?? 0),
    id: Number(raw.id ?? 0),
    itemName: String(raw.itemName ?? ""),
    hsn: String(raw.hsnCode ?? ""),
    unit: String(raw.unit ?? ""),
    brand: String(raw.brand?.name ?? ""),
    category: String(raw.category?.name ?? ""),
    subCategory: String(raw.subCategory?.name ?? ""),
    subSubCategory: String(raw.subSubCategory?.name ?? ""),
    size: String(raw.size ?? ""),
    color: String(raw.color ?? ""),
    purchasePrice: Number(raw.purchasePrice ?? 0),
    salesPrice: Number(raw.salesPrice ?? 0),
    stock: Number(raw.current_stock ?? 0),
    createdBySuperadmin: Boolean(raw.created_by_superadmin),
  };
}

export function mapApiStockHistory(raw: any): StockHistoryEntry {
  return {
    id: Number(raw.id ?? 0),
    date: String(raw.date ?? raw.created_at ?? ""),
    type: String(raw.type ?? raw.transaction_type ?? ""),
    qty: Number(raw.qty ?? raw.quantity ?? 0),
    balance: Number(raw.balance ?? raw.closing_stock ?? 0),
    reference: String(raw.reference ?? raw.ref_no ?? ""),
    note: String(raw.note ?? raw.narration ?? ""),
  };
}
