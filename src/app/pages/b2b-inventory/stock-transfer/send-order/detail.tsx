import {
  ArrowLeftIcon, CheckCircleIcon, TruckIcon,
  DocumentCheckIcon, XMarkIcon, InformationCircleIcon,
  BuildingOfficeIcon, CubeIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Get, Post, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface OrderItemDetail {
  id: number;
  item_name: string;
  variant_info: string;
  barcode: string;
  size: string;
  color: string;
  hsnCode: string;
  taxSlab: string;
  requested_quantity: number;
  available_quantity: number;
  approved_quantity: number;
  is_removed: boolean;
  admin_note: string;
  rate: number;
  branch_price: number;
}

interface OrderDetail {
  id: number;
  order_id: string;
  requesting_branch_name: string;
  source_branch_name: string;
  status: string;
  order_date: string;
  note: string;
  linked_transfer_no: string | null;
  linked_transfer_id: number | null;
  credit_term: string;
  items: OrderItemDetail[];
}

interface TransferItemLite {
  id: number;
  from_item_name: string;
  from_variant_info: string;
  from_barcode: string;
  quantity: number;
  rate: number;
  is_packaged: boolean;
  is_received: boolean;
  basic_amount: number;
  tax_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  net_amount: number;
}

interface TransferDetailLite {
  id: number;
  transfer_no: string;
  from_branch_name: string;
  to_branch_name: string;
  transfer_date: string;
  status: "pending" | "confirmed" | "packaging_start" | "packaging_ready" | "partially_received" | "received" | "cancelled";
  note: string;
  items: TransferItemLite[];
}

// ── Status Helpers ─────────────────────────────────────────────────────────
const ORDER_STATUS_COLOR: Record<string, "info" | "success" | "warning" | "error"> = {
  pending: "info",
  sent: "success",
  no_stock: "warning",
  cancelled: "error",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending (Awaiting Verification)",
  sent: "Verified",
  no_stock: "No Stock Available",
  cancelled: "Cancelled",
};

const TRANSFER_STATUS_COLOR: Record<string, "info" | "primary" | "warning" | "success" | "error"> = {
  pending: "info",
  confirmed: "primary",
  packaging_start: "warning",
  packaging_ready: "primary",
  partially_received: "info",
  received: "success",
  cancelled: "error",
};

const TRANSFER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending Confirmation",
  confirmed: "Confirmed — Awaiting Packaging",
  packaging_start: "Packaging in Progress",
  packaging_ready: "Packed — Ready to Receive",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

// ── GST Summary Card ─────────────────────────────────────────────────────────
interface GstTotals { basic: number; tax: number; cgst: number; sgst: number; igst: number; net: number; }

const GstSummaryCard = ({ totals, title = "GST Summary" }: { totals: GstTotals; title?: string }) => (
  <Card skin="bordered" className="p-6 bg-gradient-to-br from-primary/5 to-blue-50/50 dark:from-primary/10 dark:to-blue-900/10">
    <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-100 mb-4">{title}</h3>
    <div className="space-y-1 text-sm">
      <div className="flex justify-between py-1.5 border-b border-gray-200 dark:border-dark-600">
        <span className="text-gray-600 dark:text-dark-400">Total Basic Amount</span>
        <span className="font-medium">₹ {totals.basic.toFixed(2)}</span>
      </div>
      {totals.cgst > 0 || totals.sgst > 0 ? (
        <>
          <div className="flex justify-between py-1.5 border-b border-gray-200 dark:border-dark-600">
            <span className="text-gray-600 dark:text-dark-400">CGST</span>
            <span className="font-medium">₹ {totals.cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-200 dark:border-dark-600">
            <span className="text-gray-600 dark:text-dark-400">SGST</span>
            <span className="font-medium">₹ {totals.sgst.toFixed(2)}</span>
          </div>
        </>
      ) : totals.igst > 0 ? (
        <div className="flex justify-between py-1.5 border-b border-gray-200 dark:border-dark-600">
          <span className="text-gray-600 dark:text-dark-400">IGST</span>
          <span className="font-medium">₹ {totals.igst.toFixed(2)}</span>
        </div>
      ) : null}
      <div className="flex justify-between pt-2 text-base font-bold">
        <span>Total Tax Amount</span>
        <span className="text-primary-700 dark:text-primary-400">₹ {totals.tax.toFixed(2)}</span>
      </div>
      <div className="flex justify-between pt-2 text-base font-bold border-t-2 border-primary/30 dark:border-primary/20">
        <span>Net Total (incl. Tax)</span>
        <span className="text-primary-700 dark:text-primary-400">₹ {totals.net.toFixed(2)}</span>
      </div>
    </div>
  </Card>
);

// ── Info Field (static info box with label/value) ────────────────────────────
function InfoField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 dark:bg-dark-800 rounded-xl p-3">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{value ?? "—"}</div>
    </div>
  );
}

// ── Main Detail Page Component ─────────────────────────────────────────────
export default function B2BOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [transfer, setTransfer] = useState<TransferDetailLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTransfer, setLoadingTransfer] = useState(false);
  const [acting, setActing] = useState(false);
  const [receivingItemId, setReceivingItemId] = useState<number | null>(null);

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await Get(`pos/b2b-orders/${id}/`) as any;
      const body = res?.data ?? res;
      setOrder(body?.order ?? body);
    } catch { toasterrormsg("Could not load order detail."); }
    finally { setLoading(false); }
  };

  const loadTransfer = async () => {
    if (!order?.linked_transfer_id) return;
    setLoadingTransfer(true);
    try {
      const res = await Get(`pos/b2b-transfers/${order.linked_transfer_id}/`) as any;
      const body = res?.data ?? res;
      setTransfer(body?.data ?? body);
    } catch { toasterrormsg("Could not load transfer detail"); }
    finally { setLoadingTransfer(false); }
  };

  useEffect(() => { loadOrder(); }, [id]);
  useEffect(() => {
    if (order?.status === "sent" && order.linked_transfer_id) loadTransfer();
  }, [order?.linked_transfer_id, order?.status]);

  const cancelOrder = async () => {
    if (!order) return;
    if (!confirm("Cancel this order?")) return;
    try {
      const res = await Post(`pos/b2b-orders/${order.id}/cancel/`, {}) as any;
      const body = res?.data ?? res;
      body?.success !== false
        ? (toastsuccessmsg(body?.message ?? "Order cancelled."), navigate("/b2b-inventory/stock-transfer/send-order"))
        : toasterrormsg(body?.message ?? "Failed to cancel order.");
    } catch (e: any) { toasterrormsg(e?.response?.data?.message ?? "Error cancelling order."); }
  };

  const doTransferAction = async (action: "confirm" | "receive" | "cancel") => {
    if (!order?.linked_transfer_id) return;
    if (action !== "cancel") {
      // Location check would go here if needed
    } else if (!confirm("Cancel this transfer?")) return;

    setActing(true);
    try {
      const res = await Post(`pos/b2b-transfers/${order.linked_transfer_id}/${action}/`, {}) as any;
      const body = res?.data ?? res;
      body?.success !== false
        ? (toastsuccessmsg(body?.message ?? "Action completed."), loadTransfer())
        : toasterrormsg(body?.message ?? "Action failed.");
    } catch (e: any) { toasterrormsg(e?.response?.data?.message ?? "Error performing action."); }
    finally { setActing(false); }
  };

  const receiveOneItem = async (itemId: number, itemName: string) => {
    if (!order?.linked_transfer_id) return;
    // Location check would go here if needed

    setReceivingItemId(itemId);
    try {
      const res = await Post(`pos/b2b-transfers/${order.linked_transfer_id}/items/${itemId}/receive/`, {}) as any;
      const body = res?.data ?? res;
      body?.success !== false
        ? (toastsuccessmsg(`${itemName} received`), loadTransfer())
        : toasterrormsg(body?.message ?? "Could not receive item.");
    } catch (e: any) { toasterrormsg(e?.response?.data?.message ?? "Error receiving item."); }
    finally { setReceivingItemId(null); }
  };

  // ── Derived State ─────────────────────────────────────────────────────────
  const isPending = order?.status === "pending";
  const totalRequestedQty = order?.items?.reduce((s, i) => s + i.requested_quantity, 0) || 0;

  const gst = transfer ? transfer.items.reduce((acc, i) => ({
    basic: acc.basic + (i.basic_amount || 0),
    tax: acc.tax + (i.tax_amount || 0),
    cgst: acc.cgst + (i.cgst || 0),
    sgst: acc.sgst + (i.sgst || 0),
    igst: acc.igst + (i.igst || 0),
    net: acc.net + (i.net_amount || 0),
  }), { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 }) : { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 };

  const canReceive = !!transfer && ["packaging_ready", "partially_received"].includes(transfer.status);
  const remainingCount = transfer ? transfer.items.filter(i => !i.is_received).length : 0;

  if (loading) {
    return (
      <Page title="Order Detail">
        <div className="transition-content w-full pb-8">
          <div className="px-(--margin-x)">
            <div className="flex items-center justify-center py-16">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (!order) {
    return (
      <Page title="Order Detail">
        <div className="transition-content w-full pb-8">
          <div className="px-(--margin-x)">
            <div className="text-center py-16 text-gray-400 dark:text-dark-400">
              Order not found
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Order Detail">
      <div className="transition-content w-full pb-8 space-y-4">
        <div className="px-(--margin-x) space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={() => navigate("/b2b-inventory/stock-transfer/send-order")}>
                <ArrowLeftIcon className="size-4" /> Back to Orders
              </Button>
              <div>
                <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">{order.order_id}</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Order Detail</p>
              </div>
            </div>
            <Badge color={ORDER_STATUS_COLOR[order.status] ?? "primary"} variant="soft" className="text-xs font-semibold whitespace-nowrap">
              {STATUS_LABEL[order.status] || order.status}
            </Badge>
          </div>

          {/* Order Header */}
          <Card skin="bordered" className="p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoField label="To Branch" value={order.source_branch_name} />
              <InfoField label="Term" value="Credit" />
              <InfoField label="Order Date" value={order.order_date} />
              <InfoField label="Requested Qty" value={totalRequestedQty} />
            </div>
            {order.note && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
                <Badge color="warning" variant="soft" className="text-xs">
                  <span className="font-semibold">📝 {order.note}</span>
                </Badge>
              </div>
            )}
          </Card>

          {/* Pending State */}
          {isPending && (
            <>
              <Card skin="bordered" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table hoverable className="w-full text-left">
                    <THead>
                      <Tr>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Item</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Variant</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Barcode</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Requested Qty</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {order.items?.map((item, idx) => (
                        <Tr key={item.id} className="dark:border-b-dark-500 border-b border-gray-100">
                          <Td className="bg-white dark:bg-dark-900 font-semibold text-gray-800 dark:text-dark-100">{item.item_name}</Td>
                          <Td className="bg-white dark:bg-dark-900">
                            <Badge color="info" variant="soft" className="text-xs">{item.variant_info || "Default"}</Badge>
                          </Td>
                          <Td className="bg-white dark:bg-dark-900  text-xs text-gray-500 dark:text-dark-300">{item.barcode || "—"}</Td>
                          <Td className="bg-white dark:bg-dark-900">
                            <Badge color="success" variant="soft" className="text-xs font-semibold">{item.requested_quantity}</Badge>
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </Card>

              <Card skin="bordered" className="p-4 border-primary/20 bg-primary/5 dark:bg-primary/10">
                <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                  <span className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
                    <InformationCircleIcon className="size-4" />
                    Waiting for {order.source_branch_name} to verify stock & send.
                  </span>
                  <Button variant="outlined" className="h-7 gap-1.5 rounded-md px-3 text-xs border-error-200 text-error-500 hover:bg-error-50 dark:border-error-800/30 dark:text-error-400 dark:hover:bg-error-900/20" onClick={cancelOrder}>
                    <XMarkIcon className="size-3.5" /> Cancel Order
                  </Button>
                </div>
              </Card>
            </>
          )}

          {/* No Stock State */}
          {order.status === "no_stock" && (
            <Card skin="bordered" className="p-4 border-warning/30 bg-warning/5 dark:bg-warning/10">
              <div className="flex items-center gap-2 text-sm text-warning-700 dark:text-warning-400">
                <InformationCircleIcon className="size-4" />
                No stock was available for any item in this order. Please place a new order later.
              </div>
            </Card>
          )}

          {/* Cancelled State */}
          {order.status === "cancelled" && (
            <Card skin="bordered" className="p-4 border-error/30 bg-error/5 dark:bg-error/10">
              <div className="flex items-center gap-2 text-sm text-error-600 dark:text-error-400">
                <XMarkIcon className="size-4" />
                This order was cancelled.
              </div>
            </Card>
          )}

          {/* Sent/Verified State */}
          {order.status === "sent" && (
            <div className="space-y-4">
              {loadingTransfer && !transfer ? (
                <Card skin="bordered" className="p-8">
                  <div className="py-4 text-center text-gray-400 dark:text-dark-400">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    Loading transfer...
                  </div>
                </Card>
              ) : transfer ? (
                <>
                  <Card skin="bordered" className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <TruckIcon className="size-5 text-primary" />
                      <span className="font-semibold text-gray-700 dark:text-dark-200">Transfer {transfer.transfer_no}</span>
                      <Badge color={TRANSFER_STATUS_COLOR[transfer.status] ?? "primary"} variant="soft" className="text-xs font-semibold whitespace-nowrap">
                        {TRANSFER_STATUS_LABEL[transfer.status]}
                      </Badge>
                      {canReceive && (
                        <span className="text-xs text-gray-500 dark:text-dark-400">
                          {remainingCount} of {transfer.items.length} item(s) still to receive
                        </span>
                      )}
                    </div>
                  </Card>

                  <Card skin="bordered" className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table hoverable className="w-full text-left">
                        <THead>
                          <Tr>
                            <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Item</Th>
                            <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Variant</Th>
                            <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Barcode</Th>
                            <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Qty Coming</Th>
                            <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Rate (₹)</Th>
                            <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Amount (₹)</Th>
                            {canReceive && <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Receive</Th>}
                          </Tr>
                        </THead>
                        <TBody>
                          {transfer.items.map((item) => (
                            <Tr key={item.id} className="dark:border-b-dark-500 border-b border-gray-100">
                              <Td className="bg-white dark:bg-dark-900 font-semibold text-gray-800 dark:text-dark-100">{item.from_item_name}</Td>
                              <Td className="bg-white dark:bg-dark-900">
                                <Badge color="info" variant="soft" className="text-xs">{item.from_variant_info || "Default"}</Badge>
                              </Td>
                              <Td className="bg-white dark:bg-dark-900  text-xs text-gray-500 dark:text-dark-300">{item.from_barcode || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900 font-semibold text-gray-700 dark:text-dark-200">{item.quantity}</Td>
                              <Td className="bg-white dark:bg-dark-900  text-gray-700 dark:text-dark-200">₹{item.rate}</Td>
                              <Td className="bg-white dark:bg-dark-900 font-semibold text-gray-700 dark:text-dark-200">₹{(item.quantity * item.rate).toFixed(2)}</Td>
                              {canReceive && (
                                <Td className="bg-white dark:bg-dark-900">
                                  {item.is_received ? (
                                    <Badge color="success" variant="soft" className="text-xs font-semibold inline-flex items-center gap-1">
                                      <CheckCircleIcon className="size-3.5" /> Received
                                    </Badge>
                                  ) : (
                                    <Button color="success" className="h-7 gap-1.5 rounded-md px-3 text-xs" disabled={receivingItemId === item.id} onClick={() => receiveOneItem(item.id, item.from_item_name)}>
                                      <DocumentCheckIcon className="size-3.5" /> {receivingItemId === item.id ? "Receiving..." : "Receive"}
                                    </Button>
                                  )}
                                </Td>
                              )}
                            </Tr>
                          ))}
                        </TBody>
                      </Table>
                    </div>
                  </Card>

                  {gst.basic > 0 && <GstSummaryCard totals={gst} />}

                  <Card skin="bordered" className="p-4 bg-gray-50 dark:bg-dark-800">
                    <div className="flex items-center gap-3 justify-end flex-wrap">
                      {["pending", "confirmed", "packaging_start"].includes(transfer.status) && (
                        <Button variant="outlined" className="h-9 gap-1.5 rounded-md px-4 text-sm border-error-200 text-error-500 hover:bg-error-50 dark:border-error-800/30 dark:text-error-400 dark:hover:bg-error-900/20" disabled={acting} onClick={() => doTransferAction("cancel")}>
                          <XMarkIcon className="size-4" /> Cancel Transfer
                        </Button>
                      )}
                      {transfer.status === "pending" && (
                        <Button color="primary" className="h-9 gap-2 rounded-md px-5 text-sm font-semibold" disabled={acting} onClick={() => doTransferAction("confirm")}>
                          {acting ? (
                            <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Confirming...</>
                          ) : (
                            <><CheckCircleIcon className="size-4" /> Confirm Transfer</>
                          )}
                        </Button>
                      )}
                      {transfer.status === "confirmed" && (
                        <Badge color="primary" variant="soft" className="text-sm inline-flex items-center gap-2">
                          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Waiting for {order.source_branch_name} to start packaging.
                        </Badge>
                      )}
                      {transfer.status === "packaging_start" && (
                        <Badge color="warning" variant="soft" className="text-sm inline-flex items-center gap-2 font-medium">
                          <CubeIcon className="size-4" /> {order.source_branch_name} is packaging your items...
                        </Badge>
                      )}
                      {canReceive && (
                        <Button color="success" className="h-9 gap-2 rounded-md px-5 text-sm font-semibold" disabled={acting || remainingCount === 0} onClick={() => doTransferAction("receive")}>
                          {acting ? (
                            <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Receiving...</>
                          ) : (
                            <><DocumentCheckIcon className="size-4" /> Receive All Remaining ({remainingCount})</>
                          )}
                        </Button>
                      )}
                      {transfer.status === "received" && (
                        <Badge color="success" variant="soft" className="text-sm inline-flex items-center gap-2 font-semibold">
                          <CheckCircleIcon className="size-4" /> Stock received — your inventory has been updated.
                        </Badge>
                      )}
                      {transfer.status === "cancelled" && (
                        <Badge color="error" variant="soft" className="text-sm inline-flex items-center gap-2 font-semibold">
                          This transfer was cancelled.
                        </Badge>
                      )}
                    </div>
                  </Card>
                </>
              ) : (
                <Card skin="bordered" className="p-5 text-sm text-gray-400 dark:text-dark-400">
                  No transfer found for this order.
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
