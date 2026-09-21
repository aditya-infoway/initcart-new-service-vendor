import {
  ArrowLeftIcon, CheckCircleIcon, TruckIcon,
  DocumentCheckIcon, XMarkIcon, InformationCircleIcon,
  BuildingOfficeIcon, CubeIcon, ExclamationTriangleIcon,
  ClockIcon, ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, Post, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface OrderItemDetail {
  id: number;
  item_name: string;
  variant_info: string;
  barcode: string;
  hsnCode: string;
  taxSlab: string;
  requested_quantity: number;
  available_quantity: number;
  approved_quantity: number;
  is_removed: boolean;
  admin_note: string;
  branch_price: number;
  live_stock: number;
}

interface OrderDetail {
  id: number;
  order_id: string;
  requesting_branch_name: string;
  source_branch_name: string;
  status: "pending" | "sent" | "no_stock" | "cancelled";
  order_date: string;
  note: string;
  items: OrderItemDetail[];
  linked_transfer_no: string | null;
  linked_transfer_id: number | null;
  created_at: string;
}

interface TransferItemDetail {
  id: number;
  from_item_name: string;
  from_variant_info: string;
  from_barcode: string;
  quantity: number;
  rate: number;
  tax_percent: string;
  basic_amount: number | string;
  tax_amount: number | string;
  cgst: number | string;
  sgst: number | string;
  igst: number | string;
  net_amount: number | string;
}

interface TransferDetail {
  id: number;
  transfer_no: string;
  from_branch_name: string;
  to_branch_name: string;
  transfer_date: string;
  status: "pending" | "confirmed" | "packaging_start" | "packaging_ready" | "partially_received" | "received" | "cancelled";
  note: string;
  items: TransferItemDetail[];
  source_order_no: string | null;
}

type Stage =
  | "pending" | "no_stock" | "cancelled"
  | "awaiting_confirm" | "ready_to_package" | "packaging_in_progress" | "awaiting_receive"
  | "received" | "transfer_cancelled";

const STAGE_CONFIG: Record<Stage, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending Verify", color: "warning", icon: ClockIcon },
  no_stock: { label: "No Stock", color: "neutral", icon: ExclamationTriangleIcon },
  cancelled: { label: "Order Cancelled", color: "error", icon: XMarkIcon },
  awaiting_confirm: { label: "Awaiting Confirm", color: "info", icon: ClockIcon },
  ready_to_package: { label: "Ready to Package", color: "primary", icon: CubeIcon },
  packaging_in_progress: { label: "Packaging Started", color: "info", icon: CubeIcon },
  awaiting_receive: { label: "Awaiting Receive", color: "info", icon: TruckIcon },
  received: { label: "Received", color: "success", icon: CheckCircleIcon },
  transfer_cancelled: { label: "Transfer Cancelled", color: "error", icon: XMarkIcon },
};

// ── Helper functions ─────────────────────────────────────────────────────
const safeNum = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
};

// ── GST Summary Card ─────────────────────────────────────────────────────────
interface GstTotals { basic: number; tax: number; cgst: number; sgst: number; igst: number; net: number; }

const GstSummaryCard = ({ totals, title = "GST Summary" }: { totals: GstTotals; title?: string }) => (
  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800/30">
    <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-100 mb-4">{title}</h3>
    <div className="space-y-1 text-sm">
      <div className="flex justify-between py-1.5 border-b border-blue-100 dark:border-blue-800/30">
        <span className="text-gray-600 dark:text-dark-400">Total Basic Amount</span>
        <span className="font-medium">₹ {totals.basic.toFixed(2)}</span>
      </div>
      {totals.cgst > 0 || totals.sgst > 0 ? (
        <>
          <div className="flex justify-between py-1.5 border-b border-blue-100 dark:border-blue-800/30">
            <span className="text-gray-600 dark:text-dark-400">CGST</span>
            <span className="font-medium">₹ {totals.cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-blue-100 dark:border-blue-800/30">
            <span className="text-gray-600 dark:text-dark-400">SGST</span>
            <span className="font-medium">₹ {totals.sgst.toFixed(2)}</span>
          </div>
        </>
      ) : totals.igst > 0 ? (
        <div className="flex justify-between py-1.5 border-b border-blue-100 dark:border-blue-800/30">
          <span className="text-gray-600 dark:text-dark-400">IGST</span>
          <span className="font-medium">₹ {totals.igst.toFixed(2)}</span>
        </div>
      ) : null}
      <div className="flex justify-between pt-2 text-base font-bold">
        <span>Total Tax Amount</span>
        <span className="text-blue-700 dark:text-blue-400">₹ {totals.tax.toFixed(2)}</span>
      </div>
      <div className="flex justify-between pt-2 text-base font-bold border-t-2 border-blue-300 dark:border-blue-700">
        <span>Net Total (incl. Tax)</span>
        <span className="text-blue-700 dark:text-blue-400">₹ {totals.net.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

// ── Main Detail Page Component ─────────────────────────────────────────────
export default function ReceivedOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const [adjusted, setAdjusted] = useState<Record<number, { approved_quantity: number; admin_note: string }>>({});
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferNote, setTransferNote] = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await Get(`pos/b2b-orders/${id}/`) as any;
      const body = res?.data ?? res;
      if (body?.success) {
        const o: OrderDetail = body.order;
        setOrder(o);
        
        if (o.status === "pending") {
          const init: typeof adjusted = {};
          o.items.forEach(item => {
            const cap = Math.min(item.requested_quantity, item.live_stock || 0);
            init[item.id] = { approved_quantity: Math.max(0, cap), admin_note: item.admin_note || "" };
          });
          setAdjusted(init);
          setTransferDate(new Date().toISOString().slice(0, 10));
          setTransferNote(o.note || "");
        }
        
        if (o.linked_transfer_id) {
          const tRes = await Get(`pos/b2b-transfers/${o.linked_transfer_id}/`) as any;
          if (tRes?.data?.success) setTransfer(tRes.data.data);
        } else {
          setTransfer(null);
        }
      }
    } catch { toasterrormsg("Could not load order detail"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const updateAdjust = (itemId: number, field: "approved_quantity" | "admin_note", value: any) => {
    setAdjusted(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  // ── Verify Order (creates transfer) ──
  const handleVerify = async () => {
    if (!order) return;
    if (!confirm("Verify this order? Quantities beyond your live stock have already been capped. This will create a stock transfer for the requesting branch to confirm.")) return;
    
    setActing(true);
    try {
      const itemsPayload = order.items.map(item => ({
        item_id: item.id,
        approved_quantity: adjusted[item.id]?.approved_quantity ?? 0,
        admin_note: adjusted[item.id]?.admin_note ?? "",
      }));
      const res = await Post(`pos/b2b-orders/${order.id}/process/`, {
        transfer_date: transferDate,
        note: transferNote,
        items: itemsPayload,
      }) as any;
      if (res?.data?.success) {
        toastsuccessmsg("Order verified");
        await load();
      } else {
        toasterrormsg(res?.data?.message || "Verification failed");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Error verifying order");
    }
    setActing(false);
  };

  // ── Cancel Order (only while pending) ──
  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm("Cancel this order? This action cannot be undone.")) return;
    setActing(true);
    try {
      const res = await Post(`pos/b2b-orders/${order.id}/cancel/`, {}) as any;
      if (res?.data?.success) {
        toastsuccessmsg("Order cancelled");
        navigate("/b2b-inventory/stock-transfer/received-orders");
      } else {
        toasterrormsg(res?.data?.message || "Could not cancel");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Could not cancel order");
    }
    setActing(false);
  };

  // ── Start Packaging (no stock movement yet) ──
  const handlePackagingStart = async () => {
    if (!transfer) return;
    if (!confirm("Start packaging? This lets the requesting branch know you've begun preparing their stock. No stock will be deducted yet.")) return;
    
    setActing(true);
    try {
      const res = await Post(`pos/b2b-transfers/${transfer.id}/packaging-start/`, {}) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message);
        await load();
      } else {
        toasterrormsg(res?.data?.message || "Action failed");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Error starting packaging");
    }
    setActing(false);
  };

  // ── Mark Packaging Ready (deducts my stock) ──
  const handlePackagingReady = async () => {
    if (!transfer) return;
    if (!confirm("Mark packaging ready? This will deduct stock from your branch for every item in this transfer.")) return;
    
    setActing(true);
    try {
      const res = await Post(`pos/b2b-transfers/${transfer.id}/packaging-ready/`, {}) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message);
        await load();
      } else {
        toasterrormsg(res?.data?.message || "Action failed");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Error updating packaging");
    }
    setActing(false);
  };

  // ── Cancel Transfer (only while pending/confirmed/packaging_start) ──
  const handleCancelTransfer = async () => {
    if (!transfer) return;
    if (!confirm("Cancel this transfer? This action cannot be undone.")) return;
    setActing(true);
    try {
      const res = await Post(`pos/b2b-transfers/${transfer.id}/cancel/`, {}) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message);
        navigate("/b2b-inventory/stock-transfer/received-orders");
      } else {
        toasterrormsg(res?.data?.message || "Could not cancel");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Could not cancel transfer");
    }
    setActing(false);
  };

  // ── Derived State ─────────────────────────────────────────────────────────
  const stage: Stage =
    !order ? "pending" :
    order.status === "pending" ? "pending" :
    order.status === "no_stock" ? "no_stock" :
    order.status === "cancelled" ? "cancelled" :
    !transfer ? "awaiting_confirm" :
    transfer.status === "pending" ? "awaiting_confirm" :
    transfer.status === "confirmed" ? "ready_to_package" :
    transfer.status === "packaging_start" ? "packaging_in_progress" :
    transfer.status === "partially_received" ? "awaiting_receive" :
    transfer.status === "packaging_ready" ? "awaiting_receive" :
    transfer.status === "received" ? "received" : "transfer_cancelled";

  const canVerify = order?.status === "pending";
  const canCancelOrder = order?.status === "pending";
  const canStartPackaging = !!transfer && transfer.status === "confirmed";
  const canMarkPackagingReady = !!transfer && transfer.status === "packaging_start";
  const canCancelTransfer = !!transfer && ["pending", "confirmed", "packaging_start"].includes(transfer.status);

  const gstTotals: GstTotals = useMemo(() => {
    const items = transfer?.items || [];
    return items.reduce((acc, i) => ({
      basic: acc.basic + safeNum(i.basic_amount),
      tax: acc.tax + safeNum(i.tax_amount),
      cgst: acc.cgst + safeNum(i.cgst),
      sgst: acc.sgst + safeNum(i.sgst),
      igst: acc.igst + safeNum(i.igst),
      net: acc.net + safeNum(i.net_amount),
    }), { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 });
  }, [transfer]);
  const hasGst = gstTotals.basic > 0 || gstTotals.tax > 0;

  const totalItems = order?.items.length || 0;

  if (loading && !order) {
    return (
      <Page title="Order Detail">
        <div className="transition-content w-full pb-8">
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </Page>
    );
  }

  if (!order) {
    return (
      <Page title="Order Detail">
        <div className="transition-content w-full pb-8">
          <div className="text-center py-16 text-gray-400 dark:text-dark-400">
            Order not found
          </div>
        </div>
      </Page>
    );
  }

  const StageIcon = STAGE_CONFIG[stage].icon;

  return (
    <Page title="Order Detail">
      <div className="transition-content w-full pb-8 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={() => navigate("/b2b-inventory/stock-transfer/received-orders")}>
              <ArrowLeftIcon className="size-4" /> Back to Requests
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">{order.order_id}</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Order Detail</p>
            </div>
          </div>
          <Badge color={STAGE_CONFIG[stage].color as any} variant="soft" className="text-xs font-semibold flex items-center gap-1">
            <StageIcon className="size-3" /> {STAGE_CONFIG[stage].label}
          </Badge>
        </div>

        {/* Order Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-gray-50 rounded-xl p-3 dark:bg-dark-800">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Requesting Branch</div>
              <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{order.requesting_branch_name}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 dark:bg-dark-800">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Order Date</div>
              <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{order.order_date}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 dark:bg-dark-800">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Linked Transfer</div>
              <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{order.linked_transfer_no || "—"}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 dark:bg-dark-800">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Items</div>
              <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{totalItems}</div>
            </div>
          </div>
          {order.note && (
            <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30">
              <span className="text-xs text-amber-700 dark:text-amber-400">📝 {order.note}</span>
            </div>
          )}
        </div>

        {/* Transfer settings — only shown while verifying */}
        {canVerify && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
            <h3 className="font-semibold text-gray-700 dark:text-dark-200 mb-3 flex items-center gap-2 text-sm">
              <ClipboardDocumentIcon className="text-primary" /> Transfer Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-dark-400 block mb-1 uppercase">Transfer Date *</label>
                <DatePicker
                  value={transferDate}
                  onChange={(v: any) => setTransferDate(v || new Date().toISOString().slice(0, 10))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-dark-400 block mb-1 uppercase">Transfer Note</label>
                <Input
                  value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  placeholder="Optional note..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Items table */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750 overflow-hidden">
          <div className="overflow-x-auto">
            {canVerify ? (
              <table className="w-full text-sm">
                <thead className="bg-primary">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-white">#</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-white">Item</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">Variant</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">Barcode</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">HSN</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">GST%</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">Requested</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">My Stock</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-white">Purchase ₹</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">Verify Qty</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">Admin Note</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => {
                    const cap = Math.min(item.requested_quantity, item.live_stock || 0);
                    const adj = adjusted[item.id] || { approved_quantity: Math.max(0, cap), admin_note: "" };
                    return (
                      <tr key={item.id} className={clsx(
                        "border-t border-gray-100 dark:border-dark-600 transition-colors",
                        idx % 2 === 0 ? "bg-white dark:bg-dark-750" : "bg-gray-50/40 dark:bg-dark-700/40"
                      )}>
                        <td className="px-3 py-3 text-gray-400 dark:text-dark-400 text-xs">{idx + 1}</td>
                        <td className="px-3 py-3 font-semibold text-gray-800 dark:text-dark-100">{item.item_name}</td>
                        <td className="px-3 py-3 text-center">
                          <Badge color="info" variant="soft" className="text-xs">{item.variant_info || "Default"}</Badge>
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-xs text-gray-500 dark:text-dark-300">{item.barcode || "—"}</td>
                        <td className="px-3 py-3 text-center font-mono text-xs text-gray-500 dark:text-dark-300">{item.hsnCode || "—"}</td>
                        <td className="px-3 py-3 text-center">
                          <Badge color="warning" variant="soft" className="text-xs">{item.taxSlab || "0%"}</Badge>
                        </td>
                        <td className="px-3 py-3 text-center font-semibold">
                          <Badge color="primary" variant="soft" className="text-xs">{item.requested_quantity}</Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge color={item.live_stock <= 0 ? "error" : item.live_stock < item.requested_quantity ? "warning" : "success"} variant="soft" className="text-xs font-bold">
                            {item.live_stock}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{(item.branch_price || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Input
                            type="number"
                            min={0}
                            max={cap}
                            value={adj.approved_quantity}
                            onChange={e => updateAdjust(item.id, "approved_quantity", Math.max(0, Math.min(cap, parseInt(e.target.value) || 0)))}
                            className="w-20 text-center"
                          />
                          {cap < item.requested_quantity && <div className="text-[10px] text-amber-600 mt-1">Capped at stock ({cap})</div>}
                          {cap <= 0 && <div className="text-[10px] text-red-500 mt-1">Will be removed</div>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Input
                            type="text"
                            placeholder="Note..."
                            value={adj.admin_note}
                            onChange={e => updateAdjust(item.id, "admin_note", e.target.value)}
                            className="w-28"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : transfer ? (
              <table className="w-full text-sm">
                <thead className="bg-primary">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-white">#</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-white">Item</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">Variant</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">Barcode</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-white">Qty</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-white">Rate ₹</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-white">Net ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer.items.map((item, idx) => (
                    <tr key={item.id} className={clsx(idx % 2 === 0 ? "bg-white dark:bg-dark-750" : "bg-gray-50/40 dark:bg-dark-700/40")}>
                      <td className="px-3 py-3 text-gray-400 dark:text-dark-400 text-xs">{idx + 1}</td>
                      <td className="px-3 py-3 font-semibold text-gray-800 dark:text-dark-100">{item.from_item_name}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge color="info" variant="soft" className="text-xs">{item.from_variant_info || "Default"}</Badge>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs text-gray-500 dark:text-dark-300">{item.from_barcode || "—"}</td>
                      <td className="px-3 py-3 text-center font-semibold">
                        <Badge color="primary" variant="soft" className="text-xs">{item.quantity}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-700 dark:text-dark-200">₹{safeNum(item.rate).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">₹{safeNum(item.net_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-gray-400 dark:text-dark-400 text-sm">No transfer created for this order.</div>
            )}
          </div>
        </div>

        {/* GST Summary */}
        {hasGst && <GstSummaryCard totals={gstTotals} />}

        {/* Action panel */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-800 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {canVerify && (
              <>
                <span className="mr-2 text-sm text-gray-500 dark:text-dark-400">
                  {Object.values(adjusted).filter(a => a.approved_quantity > 0).length} item(s) will be sent
                </span>
                <Button variant="outlined" className="gap-1.5 text-error-600 border-error-200 hover:bg-error-50 dark:border-error-800/30 dark:text-error-400 dark:hover:bg-error-900/20" disabled={acting} onClick={handleCancelOrder}>
                  <XMarkIcon className="size-4" /> Cancel Order
                </Button>
                <Button color="success" className="gap-2" disabled={acting} onClick={handleVerify}>
                  {acting ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Verifying...</>
                  ) : (
                    <><CheckCircleIcon className="size-4" />Verify Order</>
                  )}
                </Button>
              </>
            )}

            {canStartPackaging && (
              <>
                {canCancelTransfer && (
                  <Button variant="outlined" className="gap-1.5 text-error-600 border-error-200 hover:bg-error-50 dark:border-error-800/30 dark:text-error-400 dark:hover:bg-error-900/20" disabled={acting} onClick={handleCancelTransfer}>
                    <XMarkIcon className="size-4" /> Cancel Transfer
                  </Button>
                )}
                <Button color="primary" className="gap-2" disabled={acting} onClick={handlePackagingStart}>
                  {acting ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Starting...</>
                  ) : (
                    <><CubeIcon className="size-4" />Start Packaging</>
                  )}
                </Button>
              </>
            )}

            {canMarkPackagingReady && (
              <>
                {canCancelTransfer && (
                  <Button variant="outlined" className="gap-1.5 text-error-600 border-error-200 hover:bg-error-50 dark:border-error-800/30 dark:text-error-400 dark:hover:bg-error-900/20" disabled={acting} onClick={handleCancelTransfer}>
                    <XMarkIcon className="size-4" /> Cancel Transfer
                  </Button>
                )}
                <Button color="primary" className="gap-2" disabled={acting} onClick={handlePackagingReady}>
                  {acting ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Packaging...</>
                  ) : (
                    <><CheckCircleIcon className="size-4" />Mark Packaging Ready</>
                  )}
                </Button>
              </>
            )}

            {!canVerify && !canStartPackaging && !canMarkPackagingReady && canCancelTransfer && (
              <Button variant="outlined" className="gap-1.5 text-error-600 border-error-200 hover:bg-error-50 dark:border-error-800/30 dark:text-error-400 dark:hover:bg-error-900/20" disabled={acting} onClick={handleCancelTransfer}>
                <XMarkIcon className="size-4" /> Cancel Transfer
              </Button>
            )}
          </div>

          {canVerify && (
            <span className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1.5">
              <InformationCircleIcon className="text-primary size-4" /> Requested qty capped to your live stock — 0-stock items auto-removed
            </span>
          )}
        </div>

        {/* Status messages */}
        {stage === "awaiting_confirm" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-blue-700 dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-2 text-sm">
            <ClockIcon className="size-4" /> Verified — waiting for {order.requesting_branch_name} to confirm this transfer before you can start packaging.
          </div>
        )}
        {stage === "ready_to_package" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-primary-700 dark:border-primary/30 dark:bg-primary/10 dark:text-primary-300 flex items-center gap-2 text-sm">
            <CubeIcon className="size-4" /> Confirmed by {order.requesting_branch_name} — you can start packaging now.
          </div>
        )}
        {stage === "packaging_in_progress" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-blue-700 dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-2 text-sm">
            <CubeIcon className="size-4" /> Packaging in progress — mark ready once done to deduct stock and notify {order.requesting_branch_name}.
          </div>
        )}
        {stage === "awaiting_receive" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-blue-700 dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-2 text-sm">
            <TruckIcon className="size-4" /> Packaging marked ready — your stock has been deducted. Waiting for {order.requesting_branch_name} to receive the stock.
          </div>
        )}
        {stage === "received" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center gap-2 text-sm">
            <CheckCircleIcon className="size-4" /> Stock received by {order.requesting_branch_name}. Transfer complete.
          </div>
        )}
        {stage === "no_stock" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-600 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-400 flex items-center gap-2 text-sm">
            <ExclamationTriangleIcon className="size-4" /> No stock was available for any requested item — order was closed automatically.
          </div>
        )}
        {stage === "cancelled" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-600 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2 text-sm">
            <XMarkIcon className="size-4" /> This order was cancelled.
          </div>
        )}
        {stage === "transfer_cancelled" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-600 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2 text-sm">
            <XMarkIcon className="size-4" /> This transfer was cancelled.
          </div>
        )}
        {stage === "pending" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-400 flex items-center gap-2 text-sm">
            <ClockIcon className="size-4" /> Awaiting your verification. Adjust quantities per your live stock and click "Verify Order".
          </div>
        )}
      </div>
    </Page>
  );
}
