// ── Shared types + helpers for Stock Return pages ─────────────────────────

export const STATUS_LABEL: Record<string, string> = {
  pending:         "Pending",
  packaging_ready: "Packaging Ready",
  approved:        "Approved",
  received:        "Received",
  rejected:        "Rejected",
  cancelled:       "Cancelled",
};

export const STATUS_COLOR: Record<
  string,
  "primary" | "info" | "success" | "warning" | "error"
> = {
  pending:         "primary",
  packaging_ready: "info",
  approved:        "success",
  received:        "success",
  rejected:        "error",
  cancelled:       "warning",
};

export interface ReturnListItem {
  id: number;
  return_no: string;
  branch_name: string;
  to_branch_name: string;
  return_date: string;
  status: string;
  item_count: number;
  total_quantity: number;
  note: string;
  created_at: string;
}

export interface ReturnItem {
  id: number;
  item_name: string;
  variant_info: string;
  barcode: string;
  hsnCode: string;
  taxSlab: string;
  quantity: number;
  rate: number;
  is_packaging_ready: boolean;
  is_returned_to_company: boolean;
  status: string;
}

export interface ReturnDetail {
  id: number;
  return_no: string;
  branch_name: string;
  to_branch_name: string;
  return_date: string;
  note: string;
  status: string;
  source_transfer_no: string;
  source_order_id: string;
  items: ReturnItem[];
}

export interface VerifiedItem {
  id: number;
  item_name: string;
  variant_info: string;
  barcode: string;
  hsnCode: string;
  taxSlab: string;
  quantity: number;
  rate: number;
  transfer_no: string;
  from_branch_name: string;
}

export interface AddedItem {
  uid: number;
  verifiedItemId: number;
  item_name: string;
  variant_info: string;
  barcode: string;
  hsnCode: string;
  taxSlab: string;
  rate: number;
  maxQty: number;
  quantity: number;
  transfer_no: string;
  from_branch_name: string;
}

export function extractVerifiedRows(res: any): any[] {
  const body = res?.data ?? res;
  if (body?.results?.data)  return body.results.data;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data))    return body.data;
  if (Array.isArray(body))          return body;
  return [];
}

export function extractListRows(res: any): any[] {
  const body = res?.data ?? res;
  if (body?.results?.data)  return body.results.data;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data))    return body.data;
  if (Array.isArray(body))          return body;
  return [];
}
