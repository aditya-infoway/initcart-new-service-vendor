// ── Sales Return — types & helpers ───────────────────────────────────────────

export interface SalesReturnRecord {
  id: number;
  returnNo: string;
  date: string;
  customerName: string;
  reason: string;
  returnType: string;
  approvedBy: string;
  grandTotal: number;
  items: SalesReturnItem[];
}

export interface SalesReturnItem {
  item_name: string;
  return_quantity: number | string;
  price: number | string;
  tax_percent: number | string;
  net_amount: number | string;
  hsn_code?: string;
}

export interface BillReturnItem {
  id: number;
  sales_item_id: number;
  item_id: number;
  variant_id: number | null;
  item_name: string;
  hsn_code: string;
  return_quantity: number;
  max_quantity: number;
  original_quantity: number;
  already_returned: number;
  price: number;
  tax_percent: number;
  basic_amount: number;
  tax_amount: number;
  net_amount: number;
  unit: string;
}

export interface BillSummary {
  grand_total: number;
  total_paid: number;
  total_returned: number;
  pending_amount: number;
  payment_history: {
    entry_type: string;
    type: string;
    voucher_no: string;
    date: string;
    amount: number;
    mode: string;
    narration: string;
  }[];
}

export function mapApiSalesReturn(raw: any): SalesReturnRecord {
  return {
    id: Number(raw.id ?? 0),
    returnNo: String(raw.return_no ?? ""),
    date: String(raw.date ?? ""),
    customerName: String(raw.customer_name ?? raw.party_name ?? ""),
    reason: String(raw.reason_for_return ?? raw.reason ?? ""),
    returnType: String(raw.return_type ?? ""),
    approvedBy: String(raw.approved_by ?? ""),
    grandTotal: Number(raw.grand_total ?? 0),
    items: Array.isArray(raw.items) ? raw.items : [],
  };
}

export function mapBillReturnItem(raw: any, returnType: string): BillReturnItem {
  const maxQty = Number(raw.available_quantity ?? 0);
  return {
    id: Number(raw.id ?? 0),
    sales_item_id: Number(raw.sales_item_id ?? 0),
    item_id: Number(raw.item_id ?? 0),
    variant_id: raw.variant_id ?? null,
    item_name: String(raw.item_name ?? ""),
    hsn_code: String(raw.hsn_code ?? ""),
    return_quantity: returnType === "Full" ? maxQty : 0,
    max_quantity: maxQty,
    original_quantity: Number(raw.quantity ?? 0),
    already_returned: Number(raw.already_returned ?? 0),
    price: Number(raw.price ?? 0),
    tax_percent: Number(raw.tax_percent ?? 0),
    basic_amount: Number(raw.basic_amount ?? 0),
    tax_amount: Number(raw.tax_amount ?? 0),
    net_amount: Number(raw.net_amount ?? 0),
    unit: String(raw.unit ?? "Pcs"),
  };
}

export function calcReturnTotals(items: BillReturnItem[]) {
  const sel = items.filter(i => i.return_quantity > 0);
  const ratio = (i: BillReturnItem) => i.max_quantity > 0 ? i.return_quantity / i.max_quantity : 0;
  return {
    qty: sel.reduce((s, i) => s + i.return_quantity, 0),
    basic: sel.reduce((s, i) => s + i.basic_amount * ratio(i), 0),
    tax: sel.reduce((s, i) => s + i.tax_amount * ratio(i), 0),
    net: sel.reduce((s, i) => s + i.net_amount * ratio(i), 0),
  };
}
