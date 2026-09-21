export interface StockVerificationItem {
  id: number;
  itemName: string;
  variant: string;
  size: string;
  color: string;
  barcode: string;
  hsn: string;
  gstPercent: string;
  requestedQty: number;
  sentQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  availableStock: number;
  rate: string;
  purchasePrice: string;
  branchPrice: string;
  salesPrice: string;
  mrp: string;
  remark: string;
  status: "verified" | "pending" | string;
}

export interface StockVerificationRow {
  id: number;
  transferId: string;
  fromBranch: string;
  fromBranchId: number;
  orderId: string;
  orderNote: string;
  date: string;
  items: StockVerificationItem[];
  totalItems: number;
  totalQty: number;
  totalAcceptedQty: number;
  totalRejectedQty: number;
  totalPendingQty: number;
  status: "verified" | "pending" | "partial" | string;
  note: string;
  totalAmount: string;
}

export const STOCK_VERIFY_STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "partial", label: "Partial" },
  { key: "verified", label: "Verified" },
];

export function getVerifyStatusStyle(s: string) {
  switch (s?.toLowerCase()) {
    case "verified":
    case "done":
      return {
        bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
        dot: "bg-emerald-500",
        label: "text-emerald-700 dark:text-emerald-400",
      };
    case "partial":
      return {
        bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
        dot: "bg-amber-500",
        label: "text-amber-700 dark:text-amber-400",
      };
    case "pending":
    default:
      return {
        bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
        dot: "bg-blue-500",
        label: "text-blue-700 dark:text-blue-400",
      };
  }
}

function stripPct(s: unknown) {
  return String(s ?? "").replace(/%/g, "");
}

export function mapApiStockVerificationItem(raw: any): StockVerificationItem {
  const sentQty = Number(raw.sent_quantity ?? raw.sent_qty ?? raw.shipped_qty ?? 0);
  const receivedQty = Number(raw.received_quantity ?? raw.received_qty ?? raw.verified_quantity ?? 0);
  const acceptedQty = Number(raw.accepted_quantity ?? raw.accepted_qty ?? receivedQty);
  const rejectedQty = Number(raw.rejected_quantity ?? raw.rejected_qty ?? 0);
  const reqQty = Number(raw.requested_quantity ?? raw.qty ?? raw.approved_quantity ?? sentQty);
  const statusVal = String(raw.status ?? raw.verification_status ?? "pending").toLowerCase();
  const itemStatus: StockVerificationItem["status"] =
    acceptedQty >= sentQty && sentQty > 0 ? "verified" : (acceptedQty > 0 ? "partial" : "pending");

  return {
    id: Number(raw.id ?? raw.item_id ?? raw.source_variant_id ?? 0),
    itemName: String(raw.item_name ?? raw.name ?? ""),
    variant: String(raw.variant_info ?? raw.variant ?? raw.variant_label ?? "Default"),
    size: raw.size ? String(raw.size) : "—",
    color: raw.color ? String(raw.color) : "—",
    barcode: String(raw.barcode ?? ""),
    hsn: String(raw.hsnCode ?? raw.hsn ?? ""),
    gstPercent: stripPct(raw.tax_percent ?? raw.taxSlab ?? raw.gst),
    requestedQty: reqQty,
    sentQty,
    receivedQty,
    acceptedQty,
    rejectedQty,
    availableStock: Number(raw.available_stock ?? raw.current_stock ?? raw.stock ?? 0),
    rate: String(raw.rate ?? raw.branch_price ?? raw.price ?? "0.00"),
    purchasePrice: String(raw.purchase_price ?? "0.00"),
    branchPrice: String(raw.branch_price ?? raw.price ?? "0.00"),
    salesPrice: String(raw.sales_price ?? "0.00"),
    mrp: String(raw.mrp ?? "0.00"),
    remark: String(raw.remark ?? raw.admin_note ?? ""),
    status: statusVal === "verified" || statusVal === "pending" || statusVal === "partial" ? statusVal : itemStatus,
  };
}

export function extractStockVerificationRows(body: any): { rows: StockVerificationRow[]; count: number; hasMore: boolean } {
  const rawArray: any[] =
    Array.isArray(body?.results?.data) ? body.results.data
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body?.results?.transfers) ? body.results.transfers
    : Array.isArray(body?.results) ? body.results
    : Array.isArray(body) ? body : [];

  const rows = rawArray.map(mapApiStockVerificationRow);
  return { rows, count: Number(body?.count ?? rows.length), hasMore: !!body?.next };
}

export function mapApiStockVerificationRow(raw: any): StockVerificationRow {
  const items: StockVerificationItem[] = Array.isArray(raw.items)
    ? raw.items.map(mapApiStockVerificationItem)
    : Array.isArray(raw.transfer_items)
      ? raw.transfer_items.map(mapApiStockVerificationItem)
      : [];

  const totalQty = items.reduce((s, i) => s + i.sentQty, 0)
    || Number(raw.total_qty ?? raw.total_quantity ?? 0);
  const totalAcceptedQty = items.reduce((s, i) => s + i.acceptedQty, 0);
  const totalRejectedQty = items.reduce((s, i) => s + i.rejectedQty, 0);
  const totalPendingQty = items.length
    ? totalQty - totalAcceptedQty - totalRejectedQty
    : Number(raw.pending_qty ?? 0);

  let status: StockVerificationRow["status"] = String(raw.status ?? "").toLowerCase();
  if (status !== "pending" && status !== "verified" && status !== "partial") {
    status = totalAcceptedQty >= totalQty && totalQty > 0 ? "verified"
      : totalAcceptedQty > 0 || totalRejectedQty > 0 ? "partial" : "pending";
  }

  return {
    id: Number(raw.id ?? raw.transfer_id ?? 0),
    transferId: String(raw.transfer_no ?? raw.transfer_id ?? raw.id ?? `#${raw.id}`),
    fromBranch: String(raw.from_branch ?? raw.from_branch_name ?? raw.branch_name ?? "Main Branch"),
    fromBranchId: Number(raw.from_branch_id ?? raw.branch_id ?? 0),
    orderId: String(raw.order_id ?? raw.order_no ?? raw.order?.order_id ?? "—"),
    orderNote: String(raw.order_note ?? raw.order?.note ?? raw.note ?? ""),
    date: String(raw.transfer_date ?? raw.date ?? raw.created_at ?? ""),
    items,
    totalItems: items.length || Number(raw.total_items ?? 0),
    totalQty,
    totalAcceptedQty,
    totalRejectedQty,
    totalPendingQty: Math.max(0, totalPendingQty),
    status,
    note: String(raw.note ?? raw.order_note ?? ""),
    totalAmount: String(raw.total_amount ?? raw.net_amount ?? "0.00"),
  };
}

export interface VerifyItemRow {
  id: number;
  itemId: number;
  itemName: string;
  variant: string;
  barcode: string;
  hsn: string;
  gstPercent: string;
  qty: number;
  purchasePrice: string;
  status: "pending" | "verified" | string;
  isVerified: boolean;
}

export interface VerifyTransferInfo {
  id: number;
  transferId: string;
  orderId: string;
  sourceOrderNo: string;
  date: string;
  note: string;
  transferType: string;
  status: "pending" | "verified" | "partial" | "completed" | string;
  fromBranch: string;
  fromBranchId: number;
  fromBranchPhone: string;
  fromBranchEmail: string;
  fromBranchAddress: string;
  fromBranchCity: string;
  fromBranchState: string;
  toBranch: string;
  toBranchPhone: string;
  toBranchEmail: string;
  toBranchAddress: string;
  toBranchCity: string;
  toBranchState: string;
  totalItems: number;
  totalVerified: number;
  totalPending: number;
}

export function mapVerifyItemRow(raw: any): VerifyItemRow {
  const id = Number(raw.id ?? raw.transfer_item_id ?? raw.item_id ?? 0);
  const statusRaw = String(raw.status ?? raw.verification_status ?? "").toLowerCase();
  const isStockUpdated = Boolean(raw.is_stock_updated ?? raw.isVerified ?? raw.verified);
  const isVerified =
    statusRaw === "verified" || statusRaw === "done" || statusRaw === "completed" || isStockUpdated;
  return {
    id,
    itemId: Number(raw.item_id ?? raw.source_item_id ?? id),
    itemName: String(raw.from_item_name ?? raw.item_name ?? raw.name ?? ""),
    variant: String(raw.from_variant_info ?? raw.variant_info ?? raw.variant ?? raw.variant_label ?? "Default"),
    barcode: String(raw.from_barcode ?? raw.barcode ?? ""),
    hsn: String(raw.from_hsn ?? raw.hsnCode ?? raw.hsn ?? ""),
    gstPercent: stripPct(raw.tax_percent ?? raw.taxSlab ?? raw.gst),
    qty: Number(raw.qty ?? raw.quantity ?? raw.sent_quantity ?? raw.sent_qty ?? 0),
    purchasePrice: String(raw.purchase_price ?? raw.purchase ?? raw.rate ?? "0.00"),
    status: isVerified ? "verified" : (statusRaw || "pending"),
    isVerified,
  };
}

export function mapVerifyTransferInfo(raw: any, items: VerifyItemRow[]): VerifyTransferInfo {
  const totalItems = items.length || Number(raw.total_items ?? 0);
  const totalVerified = items.filter(i => i.isVerified).length;
  const totalPending = totalItems - totalVerified;
  const fromBranchObj =
    (raw.from_branch && typeof raw.from_branch === "object") ? raw.from_branch : {};
  const toBranchObj =
    (raw.to_branch && typeof raw.to_branch === "object") ? raw.to_branch : {};
  const statusRaw = String(raw.status ?? "").toLowerCase();
  const status: VerifyTransferInfo["status"] =
    (statusRaw === "pending" || statusRaw === "verified" || statusRaw === "partial" || statusRaw === "completed") ? statusRaw
      : totalVerified >= totalItems && totalItems > 0 ? "verified"
      : totalVerified > 0 ? "partial" : "pending";
  return {
    id: Number(raw.id ?? raw.transfer_id ?? 0),
    transferId: String(raw.transfer_no ?? raw.transfer_id ?? raw.id ?? `#${raw.id}`),
    orderId: String(raw.source_order_no ?? raw.order_id ?? raw.order_no ?? raw.order?.order_id ?? "—"),
    sourceOrderNo: String(raw.source_order_no ?? raw.order?.order_no ?? raw.order_no ?? ""),
    date: String(raw.transfer_date ?? raw.date ?? raw.created_at ?? ""),
    note: String(raw.note ?? raw.order_note ?? (raw.order ? raw.order.note : "") ?? ""),
    transferType: String(raw.transfer_type ?? "transfer"),
    status,
    fromBranch: String(fromBranchObj.name ?? raw.from_branch ?? raw.from_branch_name ?? raw.branch_name ?? "Main Branch"),
    fromBranchId: Number(fromBranchObj.id ?? raw.from_branch_id ?? raw.branch_id ?? 0),
    fromBranchPhone: String(fromBranchObj.phone ?? raw.from_branch_phone ?? raw.phone ?? ""),
    fromBranchEmail: String(fromBranchObj.email ?? raw.from_branch_email ?? ""),
    fromBranchAddress: String(fromBranchObj.address ?? raw.from_branch_address ?? ""),
    fromBranchCity: String(fromBranchObj.city ?? raw.from_branch_city ?? raw.city ?? ""),
    fromBranchState: String(fromBranchObj.state ?? raw.from_branch_state ?? raw.state ?? ""),
    toBranch: String(toBranchObj.name ?? raw.to_branch ?? raw.to_branch_name ?? ""),
    toBranchPhone: String(toBranchObj.phone ?? raw.to_branch_phone ?? ""),
    toBranchEmail: String(toBranchObj.email ?? raw.to_branch_email ?? ""),
    toBranchAddress: String(toBranchObj.address ?? raw.to_branch_address ?? ""),
    toBranchCity: String(toBranchObj.city ?? raw.to_branch_city ?? ""),
    toBranchState: String(toBranchObj.state ?? raw.to_branch_state ?? ""),
    totalItems,
    totalVerified,
    totalPending,
  };
}

export function extractVerifyItemsResponse(body: any): {
  info: VerifyTransferInfo | null;
  items: VerifyItemRow[];
} {
  const unwrap = (b: any) => {
    if (b?.data && typeof b.data === "object" && !Array.isArray(b.data)) return b.data;
    if (b?.results?.data && typeof b.results.data === "object" && !Array.isArray(b.results.data)) return b.results.data;
    if (b?.results && typeof b.results === "object" && !Array.isArray(b.results)) return b.results;
    return b;
  };
  const raw = unwrap(body);
  const rawItems: any[] =
    Array.isArray(raw.items) ? raw.items
    : Array.isArray(body?.items) ? body.items
    : Array.isArray(raw.transfer_items) ? raw.transfer_items
    : Array.isArray(body?.data?.items) ? body.data.items
    : Array.isArray(body?.results?.data) ? body.results.data
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body?.results) ? body.results
    : [];
  const items = rawItems.map(mapVerifyItemRow);
  const rawInfo =
    (raw && (raw.transfer_no || raw.id || raw.transfer_id || raw.from_branch)) ? raw
    : (body && (body.transfer_no || body.id || body.transfer_id || body.from_branch)) ? body
    : null;
  const info = rawInfo ? mapVerifyTransferInfo(rawInfo, items) : null;
  return { info, items };
}
