// ── Sales Entry — types & helpers ────────────────────────────────────────────

export interface SaleRecord {
  id: number;
  date: string;
  terms: string;
  party: string;
  billNo: string;
  dueDate: string;
  narration: string;
  totalBasic: number;
  totalTax: number;
  for_: number;
  grandTotal: number;
}

/** Variant row from sale-search-item — `id` is variant id, `itemId` is pos_items id */
export interface SaleItem {
  id: number;
  itemId: number;
  itemName: string;
  hsn: string;
  barcode: string;
  size: string;
  color: string;
  salesPrice: number;
  perUnitPrice: number;
  stock: number;
  unit: string;
  unitSupportsFractional: boolean;
  taxPercent: number;
}

export interface CartLine {
  id: number;
  itemId: number;
  variantId: number;
  itemName: string;
  hsn: string;
  barcode: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  unit: string;
  taxPercent: number;
  discPercent: number;
  basic: number;
  discAmt: number;
  taxAmt: number;
  net: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  email: string;
  address: string;
  state?: string;
}

export interface PaymentTerm {
  id: string;
  label: string;
}

export interface SaleItemTaxResult {
  basic: number;
  discAmt: number;
  taxAmt: number;
  net: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export function mapApiSaleRecord(raw: any): SaleRecord {
  return {
    id: Number(raw.id ?? 0),
    date: String(raw.date ?? raw.bill_date ?? ""),
    terms: String(raw.terms ?? raw.payment_terms ?? ""),
    party: String(raw.party ?? raw.customer_name ?? ""),
    billNo: String(raw.bill_no ?? raw.voucher_no ?? ""),
    dueDate: String(raw.due_date ?? ""),
    narration: String(raw.narration ?? ""),
    totalBasic: Number(raw.total_basic ?? raw.basic_amount ?? 0),
    totalTax: Number(raw.total_tax ?? raw.tax_amount ?? 0),
    for_: Number(raw.for ?? raw.freight ?? 0),
    grandTotal: Number(raw.grand_total ?? raw.net_amount ?? 0),
  };
}

export function mapApiSaleItem(raw: any): SaleItem {
  const variantId = Number(raw.id ?? 0);
  const itemId = Number(raw.itemId ?? raw.item_id ?? 0);
  const salesPrice = Number(raw.salesPrice ?? raw.sales_price ?? raw.price ?? 0);
  const perUnitPrice = Number(raw.per_unit_price ?? salesPrice);
  const unitSupportsFractional = Boolean(raw.unit_supports_fractional);
  const effectivePrice =
    unitSupportsFractional && perUnitPrice > 0 ? perUnitPrice : salesPrice;

  return {
    id: variantId,
    itemId,
    itemName: String(raw.itemName ?? raw.item_name ?? raw.name ?? ""),
    hsn: String(raw.hsnCode ?? raw.hsn_code ?? raw.hsn ?? ""),
    barcode: String(raw.barcode ?? ""),
    size: raw.size ? String(raw.size) : "—",
    color: raw.color ? String(raw.color) : "—",
    salesPrice: effectivePrice,
    perUnitPrice,
    stock: Number(raw.current_stock ?? raw.stock ?? 0),
    unit: String(raw.unit ?? raw.unit_name ?? "pc"),
    unitSupportsFractional,
    taxPercent: Number(String(raw.taxSlab ?? raw.tax_percent ?? raw.gst ?? "0").replace("%", "")),
  };
}

export function mapApiCustomer(raw: any): Customer {
  return {
    id: Number(raw.id ?? 0),
    name: String(raw.name ?? raw.account_name ?? raw.customer_name ?? ""),
    mobile: String(raw.mobile ?? raw.phone ?? ""),
    email: String(raw.email ?? ""),
    address: String(raw.address ?? ""),
    state: raw.state ? String(raw.state) : undefined,
  };
}

export function mapTaxResponse(d: any): SaleItemTaxResult {
  return {
    basic: Number(d.basic_amount ?? 0),
    discAmt: Number(d.discount_amount ?? 0),
    taxAmt: Number(d.total_tax ?? 0),
    net: Number(d.net_amount ?? 0),
    cgst: Number(d.cgst ?? 0),
    sgst: Number(d.sgst ?? 0),
    igst: Number(d.igst ?? 0),
  };
}

export function buildCartLine(
  id: number,
  item: SaleItem,
  qty: number,
  price: number,
  discPercent: number,
  tax: SaleItemTaxResult,
): CartLine {
  return {
    id,
    itemId: item.itemId,
    variantId: item.id,
    itemName: item.itemName,
    hsn: item.hsn,
    barcode: item.barcode,
    size: item.size,
    color: item.color,
    qty,
    price,
    unit: item.unit,
    taxPercent: item.taxPercent,
    discPercent,
    basic: tax.basic,
    discAmt: tax.discAmt,
    taxAmt: tax.taxAmt,
    net: tax.net,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
  };
}

export function calcSummary(
  cart: CartLine[],
  freight: number,
  otherExpense: number,
  roundAmt: number,
) {
  const totalBasic = cart.reduce((s, l) => s + l.basic, 0);
  const totalDiscount = cart.reduce((s, l) => s + l.discAmt, 0);
  const totalTax = cart.reduce((s, l) => s + l.taxAmt, 0);
  const cgst = cart.reduce((s, l) => s + l.cgst, 0);
  const sgst = cart.reduce((s, l) => s + l.sgst, 0);
  const igst = cart.reduce((s, l) => s + l.igst, 0);
  const itemsNet = cart.reduce((s, l) => s + l.net, 0);
  const grandTotal = itemsNet + freight + otherExpense + roundAmt;
  return {
    totalBasic,
    totalDiscount,
    totalTax,
    cgst,
    sgst,
    igst,
    freight,
    otherExpense,
    roundAmt,
    grandTotal,
  };
}
