export type BranchOrderStatus = "Pending" | "Processing" | "Partially Sent" | "Sent" | "Cancelled";

export interface BranchOrder {
  id: number;
  orderId: string;
  date: string;
  items: number;
  totalQty: number;
  note: string;
  status: string;
}

export interface OrderDetailItem {
  id: number;
  itemName: string;
  variant: string;
  size: string;
  color: string;
  barcode: string;
  hsn: string;
  gstPercent: string;
  requestedQty: number;
  approvedQty: number | null;
  purchasePrice: string;
  status: string;
  adminNote: string;
}

export type OrderItem = OrderDetailItem;

export interface OrderDetail {
  id: number;
  orderId: string;
  status: string;
  statusNote: string;
  orderDate: string;
  totalItems: number;
  requestedQty: number;
  approvedQty: number | null;
  transferNo: string;
  transferred: number;
  pending: number;
  removed: number;
  note: string;
  items: OrderDetailItem[];
}

export interface CompanyItem {
  id: number;
  variantId: number;
  itemName: string;
  category: string;
  variant: string;
  size: string;
  color: string;
  barcode: string;
  hsn: string;
  gstPercent: string;
  price: string;
  purchasePrice: string;
  branchPrice: string;
  salesPrice: string;
  mrp: string;
  globalItemCode: string;
  stock: number;
}

export interface CartItem extends CompanyItem {
  qty: number;
}

export function mapApiBranchOrder(raw: any): BranchOrder {
  return {
    id: Number(raw.id ?? 0),
    orderId: String(raw.order_id ?? raw.orderId ?? `#${raw.id}`),
    date: String(raw.order_date ?? raw.created_at ?? ""),
    items: Number(raw.item_count ?? raw.total_items ?? raw.items ?? 0),
    totalQty: Number(raw.total_requested_qty ?? raw.total_qty ?? raw.totalQty ?? 0),
    note: String(raw.note ?? ""),
    status: String(raw.status ?? "pending"),
  };
}

export function mapApiOrderDetail(raw: any): OrderDetail {
  const items = Array.isArray(raw.items) ? raw.items.map(mapApiOrderDetailItem) : [];

  let transferred = 0;
  let pending = 0;
  let removed = 0;
  if (Array.isArray(raw.items)) {
    for (const it of raw.items) {
      if (it?.is_removed_by_admin) {
        removed++;
      } else if (it?.is_transferred) {
        transferred++;
      } else {
        pending++;
      }
    }
  }
  const approvedQty = raw.items
    ? raw.items.reduce((s: number, i: any) => s + Number(i.approved_quantity ?? 0), 0)
    : (raw.approved_qty != null ? Number(raw.approved_qty) : null);

  return {
    id: Number(raw.id ?? 0),
    orderId: String(raw.order_id ?? `#${raw.id}`),
    status: String(raw.status ?? "pending"),
    statusNote: String(raw.status_note ?? raw.statusNote ?? "Awaiting Approval"),
    orderDate: String(raw.order_date ?? raw.created_at ?? ""),
    totalItems: items.length,
    requestedQty: Array.isArray(raw.items)
      ? raw.items.reduce((s: number, i: any) => s + Number(i.requested_quantity ?? 0), 0)
      : Number(raw.requested_qty ?? raw.total_qty ?? 0),
    approvedQty: approvedQty && approvedQty > 0 ? approvedQty : null,
    transferNo: String(raw.transfer_no ?? "—"),
    transferred,
    pending,
    removed,
    note: String(raw.note ?? ""),
    items,
  };
}

export function mapApiOrderDetailItem(raw: any): OrderDetailItem {
  return {
    id: Number(raw.id ?? 0),
    itemName: String(raw.item_name ?? ""),
    variant: String(raw.variant_info ?? raw.variant ?? "Default"),
    size: raw.size ? String(raw.size) : "—",
    color: raw.color ? String(raw.color) : "—",
    barcode: String(raw.barcode ?? ""),
    hsn: String(raw.hsnCode ?? raw.hsn ?? ""),
    gstPercent: String(raw.tax_percent ?? raw.taxSlab ?? raw.gst ?? "").replace(/%/g, ""),
    requestedQty: Number(raw.requested_quantity ?? raw.qty ?? 0),
    approvedQty: raw.approved_quantity != null ? Number(raw.approved_quantity) : null,
    purchasePrice: String(raw.purchase_price ?? raw.rate ?? "0.00"),
    status: raw.is_removed_by_admin ? "Removed" : raw.is_transferred ? "Transferred" : String(raw.status ?? "Pending"),
    adminNote: String(raw.admin_note ?? ""),
  };
}

export function mapApiCompanyItem(raw: any): CompanyItem[] {
  const itemId = Number(raw.item_id ?? raw.id ?? 0);
  const itemName = String(raw.item_name ?? raw.name ?? "");
  const category = String(raw.category ?? raw.category_name ?? "");
  const baseHsn = String(raw.hsnCode ?? raw.hsn ?? "");
  const baseGst = String(raw.taxSlab ?? raw.gst_percent ?? raw.gst ?? "").replace(/%/g, "");

  const variants: any[] = Array.isArray(raw.variants) && raw.variants.length > 0
    ? raw.variants
    : [raw];

  return variants.map((v: any) => {
    const hsn = String(v.hsnCode ?? v.hsn ?? baseHsn ?? "");
    const gst = String(v.taxSlab ?? v.gst_percent ?? v.gst ?? baseGst ?? "").replace(/%/g, "");
    return {
      id: itemId,
      variantId: Number(v.variant_id ?? v.id ?? itemId),
      itemName,
      category,
      variant: String(v.variant_label ?? v.variant ?? "Default"),
      size: v.size ? String(v.size) : "—",
      color: v.color ? String(v.color) : "—",
      barcode: String(v.barcode ?? raw.barcode ?? ""),
      hsn,
      gstPercent: gst,
      price: String(v.branch_price ?? v.purchase_price ?? v.price ?? "0.00"),
      purchasePrice: String(v.purchase_price ?? raw.purchase_price ?? "0.00"),
      branchPrice: String(v.branch_price ?? v.price ?? "0.00"),
      salesPrice: String(v.sales_price ?? raw.sales_price ?? "0.00"),
      mrp: String(v.mrp ?? raw.mrp ?? "0.00"),
      globalItemCode: String(v.global_item_code ?? ""),
      stock: Number(v.current_stock ?? v.stock ?? raw.stock ?? raw.available_stock ?? 0),
    };
  });
}

export function flattenApiCompanyItems(rawList: any[]): CompanyItem[] {
  return (rawList ?? []).flatMap(raw => mapApiCompanyItem(raw));
}

export function extractCompanyItemRows(body: any): { items: CompanyItem[]; count: number; hasMore: boolean } {
  const rawArray: any[] =
    Array.isArray(body?.results?.data) ? body.results.data
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body?.results) ? body.results
    : Array.isArray(body) ? body : [];

  const count = Number(body?.count ?? rawArray.length);
  const hasMore = !!body?.next;
  return { items: flattenApiCompanyItems(rawArray), count, hasMore };
}

export const ORDER_STATUS_FILTERS = [
  { key: "all",            label: "All Status" },
  { key: "pending",        label: "Pending" },
  { key: "processing",     label: "Processing" },
  { key: "partially_sent", label: "Partially Sent" },
  { key: "sent",           label: "Sent" },
  { key: "cancelled",      label: "Cancelled" },
];

export function getOrderStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case "sent":           return { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" };
    case "pending":        return { bg: "bg-amber-50 dark:bg-amber-500/10",     text: "text-amber-700 dark:text-amber-300" };
    case "processing":     return { bg: "bg-blue-50 dark:bg-blue-500/10",       text: "text-blue-700 dark:text-blue-300" };
    case "partially_sent": return { bg: "bg-purple-50 dark:bg-purple-500/10",   text: "text-purple-700 dark:text-purple-300" };
    case "cancelled":      return { bg: "bg-red-50 dark:bg-red-500/10",         text: "text-red-700 dark:text-red-300" };
    default:               return { bg: "bg-gray-100 dark:bg-dark-600",         text: "text-gray-700 dark:text-dark-200" };
  }
}
