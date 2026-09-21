export interface SalesBill {
  id: number;
  billNo: string;
  billDate: string;
  customerName: string;
  terms: string;
  gstType: string;
  items: number;
  billAmount: number;
  salesNet: number;
  purchaseCost: number;
  profit: number;
  profitPercent: number;
  lineItems: SalesBillLineItem[];
}

export interface SalesBillLineItem {
  id: number;
  itemName: string;
  hsn: string;
  qty: number;
  salePrice: number;
  per: string;
  discPercent: number;
  taxPercent: number;
  netAmount: number;
  salesNet: number;
  purchasePrice: number;
  purchaseCost: number;
  lineProfit: number;
}

export function mapApiBill(raw: any): SalesBill {
  return {
    id: Number(raw.id ?? 0),
    billNo: String(raw.bill_no ?? ""),
    billDate: String(raw.bill_date ?? ""),
    customerName: String(raw.customer_name ?? ""),
    terms: String(raw.payment_terms ?? raw.terms ?? ""),
    gstType: raw.gst_toggle_status === true ? "With GST" : raw.gst_toggle_status === false ? "Without GST" : String(raw.gst_type ?? ""),
    items: Number(raw.number_of_items ?? raw.item_count ?? 0),
    billAmount: Number(raw.bill_amount ?? 0),
    salesNet: Number(raw.sales_net ?? 0),
    purchaseCost: Number(raw.purchase_cost ?? 0),
    profit: Number(raw.profit_amount ?? raw.profit ?? 0),
    profitPercent: Number(raw.profit_percent ?? 0),
    lineItems: Array.isArray(raw.line_items) ? raw.line_items.map(mapApiLineItem) : [],
  };
}

export function mapApiLineItem(raw: any): SalesBillLineItem {
  return {
    id: Number(raw.id ?? 0),
    itemName: String(raw.item_name ?? ""),
    hsn: String(raw.hsn_code ?? raw.hsn ?? ""),
    qty: Number(raw.qty ?? 0),
    salePrice: Number(raw.price ?? raw.sale_price ?? 0),
    per: String(raw.unit ?? raw.per ?? "pc"),
    discPercent: Number(raw.discount_percent ?? raw.disc_percent ?? 0),
    taxPercent: Number(raw.tax_percent ?? 0),
    netAmount: Number(raw.net_amount ?? 0),
    salesNet: Number(raw.sales_net ?? 0),
    purchasePrice: Number(raw.purchase_price ?? 0),
    purchaseCost: Number(raw.purchase_cost ?? 0),
    lineProfit: Number(raw.line_profit ?? 0),
  };
}
