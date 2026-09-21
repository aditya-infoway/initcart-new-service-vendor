import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, CheckIcon,
  ClipboardDocumentListIcon, CubeIcon, DocumentDuplicateIcon,
  EyeIcon, FunnelIcon, MagnifyingGlassIcon, PlusIcon,
  TrashIcon, TruckIcon, XMarkIcon, BuildingStorefrontIcon,
  ArrowsRightLeftIcon, BanknotesIcon, ReceiptPercentIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Input, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Page } from "@/components/shared/Page";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";

// ── Helpers ───────────────────────────────────────────────────────────────
const round2 = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100; };
const safeNum = (v: any) => { if (v === null || v === undefined) return 0; const n = parseFloat(String(v)); return isNaN(n) ? 0 : n; };

// ── Types ─────────────────────────────────────────────────────────────────
interface VariantOption {
  variant_id: number; variant_label: string; display: string;
  size: string | null; color: string | null; barcode: string | null;
  current_stock: number; purchase_price: number; branch_price: number;
  sales_price: number; hsnCode?: string; taxSlab?: string;
}
interface ItemWithVariants {
  item_id: number; item_name: string; item_code: string | null;
  category: string | null; total_stock: number; variant_count: number;
  variants: VariantOption[]; hsnCode?: string; taxSlab?: string;
}
interface BranchOption {
  id: number; branch_name: string; status: string;
  owner_name?: string; phone?: string; email?: string; address?: string;
  sundry_debitor_account_name?: string | null; sundry_creditor_account_name?: string | null;
}
interface FormItem {
  from_variant_id: string; from_item_name: string; from_variant_label: string;
  quantity: number; rate: string; max_stock: number;
  size?: string | null; color?: string | null; barcode?: string | null;
  item_id?: number; hsnCode?: string; taxSlab?: string;
  basicPerUnit?: number; taxPerUnit?: number; cgstPerUnit?: number;
  sgstPerUnit?: number; igstPerUnit?: number; netPerUnit?: number;
}
interface TransferForm {
  to_branch_id: string; transfer_date: string; note: string; items: FormItem[];
}
interface TransferListItem {
  id: number; transfer_no: string; from_branch_name: string;
  to_branch_name: string; transfer_date: string; item_count: number;
  status: "pending" | "completed" | "cancelled";
}
interface TransferItemDetail {
  id: number; from_item_detail?: { item_name: string; variant_info: string };
  quantity: number; rate: number;
  basic_amount?: number; tax_amount?: number; net_amount?: number;
  cgst?: number; sgst?: number; igst?: number;
}
interface TransferDetail extends TransferListItem {
  note: string | null; to_branch: number; items: TransferItemDetail[];
}
interface BranchOrderListItem {
  id: number; order_id: string; branch_name: string; status: string;
  order_date: string; item_count: number; total_requested_qty: number; note: string;
}
interface OrderItemDetail {
  id: number; item_name: string; variant_info: string; barcode: string;
  size: string; color: string; hsnCode: string; taxSlab: string;
  global_item_code: string; requested_quantity: number; approved_quantity: number;
  sent_quantity: number; remaining_quantity: number;
  is_removed_by_admin: boolean; admin_note: string; is_transferred: boolean;
  rate: number; source_item_id: number; source_variant_id: number;
  purchase_price: number; sales_price: number | null; mrp: number | null;
  branch_price: number; current_stock: number; tax_percent?: string;
  basic_amount?: number; tax_amount?: number; cgst?: number; sgst?: number;
  igst?: number; net_amount?: number;
}
interface BranchOrderDetail {
  id: number; order_id: string; branch_id: number; branch_name: string;
  status: string; order_date: string; note: string;
  linked_transfer_no: string | null; items: OrderItemDetail[];
}
interface ItemGstValue { basic: number; tax: number; cgst: number; sgst: number; igst: number; net: number; }
const EMPTY_GST: ItemGstValue = { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 };

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: "warning", processing: "info", partially_sent: "info",
  sent: "success", cancelled: "error",
};
const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending", processing: "Processing",
  partially_sent: "Partially Sent", sent: "Sent", cancelled: "Cancelled",
};
const TRANSFER_STATUS_BADGE: Record<string, string> = {
  pending: "warning", completed: "success", cancelled: "error",
};

function flattenItems(items: ItemWithVariants[]) {
  const out: { item: ItemWithVariants; variant: VariantOption }[] = [];
  items.forEach(item => item.variants.forEach(v => out.push({ item, variant: v })));
  return out;
}

// ── Select Items Drawer ───────────────────────────────────────────────────
function SelectItemsDrawer({
  isOpen, onClose, myItems, selectedVariantIds, onConfirm,
}: {
  isOpen: boolean; onClose: () => void; myItems: ItemWithVariants[];
  selectedVariantIds: Set<string>;
  onConfirm: (rows: { item: ItemWithVariants; variant: VariantOption; quantity: number }[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, { item: ItemWithVariants; variant: VariantOption; quantity: number }>>(new Map());

  useEffect(() => { if (!isOpen) { setSearch(""); setSelected(new Map()); } }, [isOpen]);

  const flatItems = flattenItems(myItems).filter(({ item, variant }) => {
    const q = search.toLowerCase();
    return item.item_name.toLowerCase().includes(q) ||
      (variant.barcode || "").toLowerCase().includes(q) ||
      (variant.size || "").toLowerCase().includes(q) ||
      (variant.color || "").toLowerCase().includes(q);
  });

  const toggleSelect = (vid: string, item: ItemWithVariants, variant: VariantOption) => {
    if (selectedVariantIds.has(vid)) { toasterrormsg("Item already added"); return; }
    if (variant.current_stock <= 0) { toasterrormsg("Out of stock"); return; }
    setSelected(prev => { const n = new Map(prev); n.has(vid) ? n.delete(vid) : n.set(vid, { item, variant, quantity: 1 }); return n; });
  };

  const updateQty = (vid: string, qty: number) => {
    setSelected(prev => {
      const n = new Map(prev); const row = n.get(vid);
      if (row) n.set(vid, { ...row, quantity: Math.min(Math.max(1, qty), row.variant.current_stock) });
      return n;
    });
  };

  const selectedCount = selected.size;
  const totalQty = Array.from(selected.values()).reduce((s, r) => s + r.quantity, 0);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40" />
        <TransitionChild as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full" enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0" leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[78%] xl:max-w-[70%] transform-gpu flex-col bg-white dark:bg-dark-700">
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ArrowsRightLeftIcon className="size-5 opacity-80" /> Select Items to Transfer
              </h3>
              <p className="mt-0.5 text-sm text-white/75">Choose variants and set quantities from your stock</p>
            </div>
            <Button onClick={onClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>
          {/* Search */}
          <div className="shrink-0 border-b border-gray-200 px-5 py-3 dark:border-dark-500">
            <Input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4" />}
              placeholder="Search item, barcode, size, color…"
              classNames={{ input: "h-9 text-sm" }} />
          </div>
          {/* Table */}
          <div className="hide-scrollbar grow overflow-y-auto">
            <Table hoverable className="w-full min-w-[900px] text-left">
              <THead>
                <Tr>
                  {["✓","Item","Variant","Size","Color","Barcode","HSN","GST%","Rate ₹","Stock","Qty"].map(h => (
                    <Th key={h} className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 whitespace-nowrap">{h}</Th>
                  ))}
                </Tr>
              </THead>
              <TBody>
                {flatItems.length === 0 ? (
                  <Tr><Td colSpan={11} className="py-12 text-center text-sm text-gray-400">No items match</Td></Tr>
                ) : flatItems.map(({ item, variant }) => {
                  const vid = String(variant.variant_id);
                  const isSel = selected.has(vid);
                  const isAlready = selectedVariantIds.has(vid);
                  const noStock = variant.current_stock <= 0;
                  return (
                    <Tr key={vid}
                      onClick={() => !isAlready && !noStock && toggleSelect(vid, item, variant)}
                      className={clsx("cursor-pointer transition-colors",
                        isAlready && "opacity-50 cursor-not-allowed bg-primary/5",
                        noStock && !isAlready && "opacity-40 cursor-not-allowed",
                        isSel && !isAlready && "bg-primary/10 dark:bg-primary/20",
                      )}>
                      <Td className="w-10" onClick={(e: { stopPropagation: () => any; }) => e.stopPropagation()}>
                        {isAlready
                          ? <span className="text-xs text-primary-500 font-semibold">Added</span>
                          : <div onClick={() => !noStock && toggleSelect(vid, item, variant)}
                              className={clsx("size-5 rounded border-2 mx-auto flex items-center justify-center cursor-pointer",
                                isSel ? "bg-primary border-primary" : "border-gray-300 dark:border-dark-400")}>
                              {isSel && <CheckIcon className="size-3 text-white" />}
                            </div>}
                      </Td>
                      <Td className="font-semibold text-gray-800 dark:text-dark-100">{item.item_name}</Td>
                      <Td className="text-center"><Badge color="info" variant="soft" className="text-xs">{variant.variant_label}</Badge></Td>
                      <Td className="text-center text-xs text-gray-500 dark:text-dark-300">{variant.size || "—"}</Td>
                      <Td className="text-center text-xs text-gray-500 dark:text-dark-300">{variant.color || "—"}</Td>
                      <Td className="text-center font-mono text-xs text-gray-400">{variant.barcode || "—"}</Td>
                      <Td className="text-center font-mono text-xs text-gray-500">{variant.hsnCode || "—"}</Td>
                      <Td className="text-center text-xs"><Badge color="warning" variant="soft">{variant.taxSlab || "0%"}</Badge></Td>
                      <Td className="text-right font-semibold tabular-nums text-primary-600 dark:text-primary-400">₹{variant.branch_price}</Td>
                      <Td className="text-center">
                        <Badge color={noStock ? "error" : variant.current_stock <= 5 ? "warning" : "success"} variant="soft" className="text-xs font-bold">
                          {variant.current_stock}
                        </Badge>
                      </Td>
                      <Td onClick={(e: { stopPropagation: () => any; }) => e.stopPropagation()} className="w-24">
                        {isSel && (
                          <Input type="number" min={1} max={variant.current_stock}
                            value={selected.get(vid)?.quantity ?? 1}
                            onChange={e => updateQty(vid, parseInt(e.target.value) || 1)}
                            classNames={{ input: "h-8 w-20 text-center text-sm font-semibold" }} />
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-5 py-4 dark:border-dark-500">
            <p className="text-sm text-gray-500 dark:text-dark-300">
              {selectedCount > 0
                ? <><span className="font-semibold text-primary-600">{selectedCount} selected</span><span className="ml-2 text-gray-400">· Qty: {totalQty}</span></>
                : "Click rows to select variants"}
            </p>
            <div className="flex gap-3">
              <Button variant="outlined" className="px-5" onClick={onClose}>Cancel</Button>
              <Button color="primary" className="gap-2 px-6" disabled={selectedCount === 0}
                onClick={() => { onConfirm(Array.from(selected.values())); onClose(); }}>
                <CheckCircleIcon className="size-4" /> Add {selectedCount} Variant{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

// ── GST Summary Card ──────────────────────────────────────────────────────
function GstSummaryCard({ totals }: { totals: ItemGstValue }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/10">
      <h4 className="mb-4 text-sm font-semibold text-gray-700 dark:text-dark-200 flex items-center gap-2">
        <ReceiptPercentIcon className="size-4 text-primary-500" /> GST Summary
      </h4>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between border-b border-primary/10 py-1.5">
          <span className="text-gray-600 dark:text-dark-300">Total Basic Amount</span>
          <span className="font-semibold tabular-nums">₹{totals.basic.toFixed(2)}</span>
        </div>
        {(totals.cgst > 0 || totals.sgst > 0) ? (
          <>
            <div className="flex justify-between border-b border-primary/10 py-1.5">
              <span className="text-gray-600 dark:text-dark-300">CGST</span>
              <span className="font-medium tabular-nums">₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 py-1.5">
              <span className="text-gray-600 dark:text-dark-300">SGST</span>
              <span className="font-medium tabular-nums">₹{totals.sgst.toFixed(2)}</span>
            </div>
          </>
        ) : totals.igst > 0 ? (
          <div className="flex justify-between border-b border-primary/10 py-1.5">
            <span className="text-gray-600 dark:text-dark-300">IGST</span>
            <span className="font-medium tabular-nums">₹{totals.igst.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t-2 border-primary/20 pt-2 text-base font-bold">
          <span className="text-gray-700 dark:text-dark-100">Total Tax</span>
          <span className="text-primary-600 dark:text-primary-400 tabular-nums">₹{totals.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between pt-1 text-base font-bold">
          <span className="text-gray-700 dark:text-dark-100">Net Total (incl. Tax)</span>
          <span className="text-primary-600 dark:text-primary-400 tabular-nums">₹{totals.net.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Branch Status Summary Table ───────────────────────────────────────────
interface StatusCol { key: string; label: string; color: string; }
function BranchSummaryTable({
  title, icon, rows, statusCols, onSelect, loading,
}: {
  title: string; icon: React.ReactNode;
  rows: { branch_name: string; total: number; [k: string]: any }[];
  statusCols: StatusCol[]; onSelect: (branch: string, status: string) => void; loading: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-5 py-3.5 dark:border-dark-500 dark:bg-dark-800">
        {icon}
        <span className="font-semibold text-gray-700 dark:text-dark-100">{title}</span>
        <Badge color="info" variant="soft" className="text-xs font-bold">{rows.length}</Badge>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-dark-400">
          <ArrowPathIcon className="mb-2 size-6 animate-spin text-primary-500" />Loading branches…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-dark-400">
          <BuildingStorefrontIcon className="mb-2 size-10 text-gray-200 dark:text-dark-600" />No branch data found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table hoverable className="w-full min-w-[600px] text-left">
            <THead>
              <Tr>
                <Th className="text-xs font-semibold uppercase text-gray-500">Branch</Th>
                <Th className="text-center text-xs font-semibold uppercase text-gray-500">All</Th>
                {statusCols.map(sc => (
                  <Th key={sc.key} className="text-center text-xs font-semibold uppercase text-gray-500">{sc.label}</Th>
                ))}
              </Tr>
            </THead>
            <TBody>
              {rows.map(row => (
                <Tr key={row.branch_name}>
                  <Td className="font-semibold text-gray-800 dark:text-dark-100">
                    <span className="flex items-center gap-2">
                      <BuildingStorefrontIcon className="size-4 text-gray-300 dark:text-dark-500" />
                      {row.branch_name}
                    </span>
                  </Td>
                  <Td className="text-center">
                    <button onClick={() => onSelect(row.branch_name, "")}
                      className="min-w-[36px] rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200 dark:hover:bg-dark-500 transition-colors">
                      {row.total}
                    </button>
                  </Td>
                  {statusCols.map(sc => (
                    <Td key={sc.key} className="text-center">
                      <button
                        onClick={() => onSelect(row.branch_name, sc.key)}
                        disabled={!row[sc.key]}
                        className={clsx("min-w-[36px] rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30", sc.color)}>
                        {row[sc.key] || 0}
                      </button>
                    </Td>
                  ))}
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Order Tracking ────────────────────────────────────────────────────────
const ORDER_STATUS_COLS: StatusCol[] = [
  { key: "pending",        label: "Pending",        color: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "partially_sent", label: "Partially Sent", color: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "sent",           label: "Sent",           color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "cancelled",      label: "Cancelled",      color: "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400" },
];

function OrderTracking() {
  const [allOrders, setAllOrders]   = useState<BranchOrderListItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [view, setView]             = useState<"branches" | "list">("branches");
  const [branchFilter, setBranchFilter] = useState<{ branch_name: string; status: string } | null>(null);
  const [listPage, setListPage]     = useState(1);
  const PAGE_SIZE = 15;

  const [selectedOrder, setSelectedOrder]   = useState<BranchOrderDetail | null>(null);
  const [processing, setProcessing]         = useState(false);
  const [adjustedItems, setAdjustedItems]   = useState<Record<number, { approved_quantity: number; is_removed: boolean; admin_note: string }>>({});
  const [transferDate, setTransferDate]     = useState(new Date().toISOString().slice(0, 10));
  const [transferNote, setTransferNote]     = useState("");
  const [itemGstMap, setItemGstMap]         = useState<Record<number, ItemGstValue>>({});

  const orderGstTotals = useMemo(() => {
    return (selectedOrder?.items || []).reduce((acc, i) => {
      const adj = adjustedItems[i.id];
      if ((adj?.is_removed ?? i.is_removed_by_admin) || (adj?.approved_quantity ?? 0) <= 0) return acc;
      const g = itemGstMap[i.id] || EMPTY_GST;
      return { basic: acc.basic + g.basic, tax: acc.tax + g.tax, cgst: acc.cgst + g.cgst, sgst: acc.sgst + g.sgst, igst: acc.igst + g.igst, net: acc.net + g.net };
    }, { ...EMPTY_GST });
  }, [selectedOrder, adjustedItems, itemGstMap]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      let page = 1; let all: BranchOrderListItem[] = [];
      while (true) {
        const res = await Get(`branch-orders/admin/list/`, { page }) as any;
        const body = res?.data ?? res;
        if (!body?.results?.success) break;
        const arr: BranchOrderListItem[] = body.results.orders || [];
        all = all.concat(arr);
        if (!body.next || arr.length === 0) break;
        if (++page > 200) break;
      }
      setAllOrders(all);
    } catch { toasterrormsg("Could not load orders"); }
    setLoading(false);
  }

  async function fetchItemGst(branchId: number, item: OrderItemDetail, qty: number) {
    if (!qty || qty <= 0) { setItemGstMap(p => ({ ...p, [item.id]: { ...EMPTY_GST } })); return; }
    try {
      const res = await Post("pos/stock-transfer-item-tax/", { from_variant_id: item.source_variant_id, to_branch_id: branchId, quantity: qty }) as any;
      const d = res?.data ?? res;
      setItemGstMap(p => ({ ...p, [item.id]: { basic: d.basic_amount||0, tax: d.tax_amount||0, cgst: d.cgst||0, sgst: d.sgst||0, igst: d.igst||0, net: d.net_amount||0 } }));
    } catch { /* silent */ }
  }

  async function loadOrderDetail(id: number) {
    try {
      const res = await Get(`branch-orders/${id}/`) as any;
      const body = res?.data ?? res;
      if (body.success) {
        const order: BranchOrderDetail = body.order;
        setSelectedOrder(order); setItemGstMap({});
        const init: typeof adjustedItems = {};
        order.items.forEach(item => {
          const rem = item.remaining_quantity ?? (item.requested_quantity - (item.sent_quantity || 0));
          init[item.id] = { approved_quantity: rem, is_removed: item.is_removed_by_admin, admin_note: item.admin_note || "" };
        });
        setAdjustedItems(init); setTransferNote(order.note || "");
        order.items.forEach(item => {
          if (item.is_removed_by_admin) return;
          const rem = item.remaining_quantity ?? (item.requested_quantity - (item.sent_quantity || 0));
          if (rem > 0) fetchItemGst(order.branch_id, item, rem);
        });
      }
    } catch { toasterrormsg("Could not load order detail"); }
  }

  async function processOrder() {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      const res = await Post(`branch-orders/${selectedOrder.id}/process/`, {
        transfer_date: transferDate, note: transferNote,
        items: selectedOrder.items.map(item => ({
          item_id: item.id,
          approved_quantity: adjustedItems[item.id]?.approved_quantity ?? item.requested_quantity,
          is_removed: adjustedItems[item.id]?.is_removed ?? false,
          admin_note: adjustedItems[item.id]?.admin_note ?? "",
        })),
      }) as any;
      const body = res?.data ?? res;
      if (body.success) {
        toastsuccessmsg(`Order processed! Transfer: ${body.linked_transfer}`);
        setSelectedOrder(null); setItemGstMap({}); loadAll();
      } else { toasterrormsg(body.message || "Processing failed"); }
    } catch (e: any) {
      toasterrormsg(e.response?.data?.message || JSON.stringify(e.response?.data) || "Error processing order");
    }
    setProcessing(false);
  }

  async function cancelOrder(id: number) {
    if (!confirm("Cancel this order?")) return;
    try {
      const res = await Post(`branch-orders/${id}/cancel/`, {}) as any;
      const body = res?.data ?? res;
      if (body.success) { toastsuccessmsg("Order cancelled"); loadAll(); setSelectedOrder(null); setItemGstMap({}); }
    } catch { toasterrormsg("Could not cancel order"); }
  }

  const updateAdjust = (itemId: number, field: string, value: any) =>
    setAdjustedItems(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));

  const branchSummary = useMemo(() => {
    const map = new Map<string, any>();
    allOrders.forEach(o => {
      if (!map.has(o.branch_name)) map.set(o.branch_name, { branch_name: o.branch_name, total: 0, pending: 0, partially_sent: 0, sent: 0, cancelled: 0 });
      const row = map.get(o.branch_name)!; row.total++;
      if (o.status in row) row[o.status]++;
    });
    return Array.from(map.values()).sort((a, b) => a.branch_name.localeCompare(b.branch_name));
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    if (!branchFilter) return [];
    return allOrders.filter(o => o.branch_name === branchFilter.branch_name && (branchFilter.status === "" || o.status === branchFilter.status));
  }, [allOrders, branchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = filteredOrders.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);

  // ── Branch Summary View ──────────────────────────────────────────────
  if (!selectedOrder && view === "branches") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
            <BuildingStorefrontIcon className="size-4 text-primary-500" />
            Select a branch &amp; status to view its orders
          </p>
          <Button variant="outlined" className="h-8 gap-1.5 rounded-lg px-3 text-xs" onClick={loadAll}>
            <ArrowPathIcon className={clsx("size-3.5", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
        <BranchSummaryTable title="Branch Orders Summary" icon={<ClipboardDocumentListIcon className="size-4 text-primary-500" />}
          rows={branchSummary} statusCols={ORDER_STATUS_COLS} loading={loading}
          onSelect={(b, s) => { setBranchFilter({ branch_name: b, status: s }); setListPage(1); setView("list"); }} />
      </div>
    );
  }

  // ── Order List View ──────────────────────────────────────────────────
  if (!selectedOrder && view === "list") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
          <Button variant="flat" className="h-8 gap-1.5 rounded-lg px-3 text-sm text-primary-600"
            onClick={() => { setView("branches"); setBranchFilter(null); }}>
            <ArrowLeftIcon className="size-3.5" /> Back to Branches
          </Button>
          <span className="text-gray-300 dark:text-dark-600">|</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-dark-100">
            <BuildingStorefrontIcon className="size-4 text-gray-400" />{branchFilter?.branch_name}
          </span>
          <span className="text-gray-300 dark:text-dark-600">|</span>
          <div className="flex flex-wrap items-center gap-2">
            {["", "pending", "partially_sent", "sent", "cancelled"].map(s => (
              <button key={s}
                onClick={() => { setBranchFilter(f => f ? { ...f, status: s } : f); setListPage(1); }}
                className={clsx("rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                  branchFilter?.status === s ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200")}>
                {s === "" ? "All" : ORDER_STATUS_LABEL[s] || s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-5 py-3.5 dark:border-dark-500 dark:bg-dark-800">
            <ClipboardDocumentListIcon className="size-4 text-primary-500" />
            <span className="font-semibold text-gray-700 dark:text-dark-100">Branch Orders</span>
            <Badge color="info" variant="soft" className="text-xs">{filteredOrders.length}</Badge>
          </div>
          {loading ? (
            <div className="flex flex-col items-center py-16 text-gray-400"><ArrowPathIcon className="mb-2 size-6 animate-spin text-primary-500" />Loading…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400"><ClipboardDocumentListIcon className="mb-2 size-10 text-gray-200" />No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table hoverable className="w-full min-w-[700px] text-left">
                <THead>
                  <Tr>
                    {["Order ID","Branch","Date","Items","Total Qty","Status","Action"].map(h => (
                      <Th key={h} className="text-xs font-semibold uppercase text-gray-500">{h}</Th>
                    ))}
                  </Tr>
                </THead>
                <TBody>
                  {pagedOrders.map(o => (
                    <Tr key={o.id}>
                      <Td><span className="font-bold text-primary-600 dark:text-primary-400">{o.order_id}</span></Td>
                      <Td className="font-medium text-gray-700 dark:text-dark-200">{o.branch_name}</Td>
                      <Td className="text-xs text-gray-500 dark:text-dark-300 whitespace-nowrap">{formatDateDDMMYYYY(o.order_date)}</Td>
                      <Td className="text-center"><Badge color="neutral" variant="soft" className="text-xs font-semibold">{o.item_count}</Badge></Td>
                      <Td className="text-center"><Badge color="info" variant="soft" className="text-xs font-semibold">{o.total_requested_qty}</Badge></Td>
                      <Td><Badge color={ORDER_STATUS_BADGE[o.status] as any || "default"} variant="soft" className="text-xs">{ORDER_STATUS_LABEL[o.status] || o.status}</Badge></Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Button isIcon variant="flat" className="size-7 rounded-full text-primary-500 hover:bg-primary/10"
                            onClick={() => loadOrderDetail(o.id)} title="View & Process"><EyeIcon className="size-4" /></Button>
                          {o.status === "pending" && (
                            <Button isIcon variant="flat" className="size-7 rounded-full text-error-500 hover:bg-error-50"
                              onClick={() => cancelOrder(o.id)} title="Cancel Order"><XMarkIcon className="size-4" /></Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
          {filteredOrders.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3.5 dark:border-dark-500 dark:bg-dark-800">
              <p className="text-xs text-gray-500">Total: <b>{filteredOrders.length}</b></p>
              <div className="flex items-center gap-2">
                <Button variant="outlined" className="h-7 px-3 text-xs" disabled={listPage <= 1} onClick={() => setListPage(p => Math.max(1, p - 1))}>← Prev</Button>
                <span className="text-xs px-2">Page <b>{listPage}</b> / {totalPages}</span>
                <Button variant="outlined" className="h-7 px-3 text-xs" disabled={listPage >= totalPages} onClick={() => setListPage(p => Math.min(totalPages, p + 1))}>Next →</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Order Detail / Process View ──────────────────────────────────────
  const canProcess = ["pending", "processing", "partially_sent"].includes(selectedOrder!.status);
  const activeItems = selectedOrder!.items.filter(i => !adjustedItems[i.id]?.is_removed);

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-dark-500 dark:bg-dark-750">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="flat" className="h-8 gap-1.5 rounded-lg px-3 text-sm text-primary-600"
            onClick={() => setSelectedOrder(null)}>
            <ArrowLeftIcon className="size-3.5" /> Back to Orders
          </Button>
          <span className="text-gray-300 dark:text-dark-600">|</span>
          <span className="font-bold text-gray-800 dark:text-dark-100">{selectedOrder!.order_id}</span>
          <Badge color={ORDER_STATUS_BADGE[selectedOrder!.status] as any || "default"} variant="soft" className="text-xs">
            {ORDER_STATUS_LABEL[selectedOrder!.status] || selectedOrder!.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Branch", value: selectedOrder!.branch_name },
            { label: "Order Date", value: formatDateDDMMYYYY(selectedOrder!.order_date) },
            { label: "Linked Transfer", value: selectedOrder!.linked_transfer_no || "—" },
            { label: "Note", value: selectedOrder!.note || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-gray-50 p-3 dark:bg-dark-800">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-dark-400">{label}</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-dark-100 truncate">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer settings */}
      {canProcess && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-dark-500 dark:bg-dark-750">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-700 dark:text-dark-100">
            <DocumentDuplicateIcon className="size-4 text-primary-500" /> Transfer Settings
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">Transfer Date *</label>
              <DatePicker
                value={transferDate}
                onChange={(v: string) => setTransferDate(v || transferDate)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">Transfer Note</label>
              <Input value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Optional note…" classNames={{ input: "h-9 text-sm" }} />
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3.5 dark:border-dark-500 dark:bg-dark-800">
          <div className="flex items-center gap-2">
            <CubeIcon className="size-4 text-primary-500" />
            <span className="font-semibold text-gray-700 dark:text-dark-100">Order Items</span>
            <Badge color="info" variant="soft" className="text-xs">{selectedOrder!.items.length}</Badge>
          </div>
          {canProcess && (
            <p className="text-xs text-gray-500 dark:text-dark-400">
              Active: <b className="text-success-600">{activeItems.length}</b> · Removed: <b className="text-error-500">{selectedOrder!.items.length - activeItems.length}</b>
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table hoverable className="w-full min-w-[1000px] text-left">
            <THead>
              <Tr>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 w-8">#</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300">Item</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Variant</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Barcode</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">HSN</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">GST%</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Requested</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Sent</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Remaining</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-right">Branch ₹</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-right">Sales ₹</Th>
                <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-right">MRP ₹</Th>
                {canProcess ? (
                  <>
                    <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Approve</Th>
                    <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Note</Th>
                    <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Remove</Th>
                  </>
                ) : (
                  <>
                    <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Approved</Th>
                    <Th className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 text-center">Status</Th>
                  </>
                )}
              </Tr>
            </THead>
            <TBody>
              {selectedOrder!.items.map((item, idx) => {
                const rem = item.remaining_quantity ?? (item.requested_quantity - (item.sent_quantity || 0));
                const adj = adjustedItems[item.id] || { approved_quantity: rem, is_removed: item.is_removed_by_admin, admin_note: "" };
                const isRemoved = adj.is_removed;
                const isDone = rem <= 0 && !isRemoved;
                return (
                  <Tr key={item.id} className={clsx(isRemoved && "opacity-50 bg-error-50/30 dark:bg-error-900/10", isDone && "bg-success-50/30 dark:bg-success-900/10")}>
                    <Td className="text-xs text-gray-400 dark:text-dark-500">{idx + 1}</Td>
                    <Td className="font-semibold text-gray-800 dark:text-dark-100">{item.item_name}</Td>
                    <Td className="text-center"><Badge color="info" variant="soft" className="text-xs">{item.variant_info || "Default"}</Badge></Td>
                    <Td className="text-center font-mono text-xs text-gray-400">{item.barcode || "—"}</Td>
                    <Td className="text-center font-mono text-xs text-gray-500">{item.hsnCode || "—"}</Td>
                    <Td className="text-center"><Badge color="warning" variant="soft" className="text-xs">{item.taxSlab || "0%"}</Badge></Td>
                    <Td className="text-center"><Badge color="info" variant="soft" className="text-xs font-bold">{item.requested_quantity}</Badge></Td>
                    <Td className="text-center"><Badge color="neutral" variant="soft" className="text-xs font-bold">{item.sent_quantity || 0}</Badge></Td>
                    <Td className="text-center">
                      {isDone ? <span className="text-xs font-bold text-success-600">✓ Done</span>
                        : <Badge color="warning" variant="soft" className="text-xs font-bold">{rem}</Badge>}
                    </Td>
                    <Td className="text-right font-mono text-xs font-semibold text-success-600 dark:text-success-400">₹{(item.branch_price || 0).toFixed(2)}</Td>
                    <Td className="text-right font-mono text-xs text-primary-600 dark:text-primary-400">₹{(item.sales_price || 0).toFixed(2)}</Td>
                    <Td className="text-right font-mono text-xs text-purple-600 dark:text-purple-400">₹{(item.mrp || 0).toFixed(2)}</Td>
                    {canProcess ? (
                      <>
                        <Td className="text-center">
                          {!isRemoved && !isDone ? (
                            <Input type="number" min={0} max={rem} value={adj.approved_quantity}
                              onChange={e => { const q = Math.max(0, Math.min(rem, parseInt(e.target.value) || 0)); updateAdjust(item.id, "approved_quantity", q); fetchItemGst(selectedOrder!.branch_id, item, q); }}
                              classNames={{ input: "h-8 w-20 text-center text-sm font-semibold" }} />
                          ) : isDone ? <span className="text-xs font-semibold text-success-600">Fully Sent</span>
                            : <span className="text-xs text-error-400">—</span>}
                        </Td>
                        <Td className="text-center">
                          {!isRemoved && !isDone ? (
                            <Input value={adj.admin_note} onChange={e => updateAdjust(item.id, "admin_note", e.target.value)}
                              placeholder="Note…" classNames={{ input: "h-8 w-28 text-xs" }} />
                          ) : <span className="text-xs italic text-error-400">{adj.admin_note || (isDone ? "" : "Removed")}</span>}
                        </Td>
                        <Td className="text-center">
                          {!isDone && (!isRemoved
                            ? <Button isIcon variant="flat" className="size-7 rounded-full text-error-400 hover:bg-error-50 hover:text-error-600"
                                onClick={() => { updateAdjust(item.id, "is_removed", true); setItemGstMap(p => ({ ...p, [item.id]: { ...EMPTY_GST } })); }}>
                                <TrashIcon className="size-3.5" />
                              </Button>
                            : <Button variant="outlined" className="h-7 rounded-lg px-2 text-xs text-success-600 border-success-300"
                                onClick={() => { updateAdjust(item.id, "is_removed", false); fetchItemGst(selectedOrder!.branch_id, item, adj.approved_quantity || rem); }}>
                                Restore
                              </Button>
                          )}
                        </Td>
                      </>
                    ) : (
                      <>
                        <Td className="text-center">
                          {item.is_removed_by_admin
                            ? <span className="text-xs font-semibold text-error-500">Removed</span>
                            : <Badge color="success" variant="soft" className="text-xs font-bold">{item.sent_quantity}</Badge>}
                        </Td>
                        <Td className="text-center">
                          {item.is_transferred ? <span className="text-xs font-semibold text-success-600">✓ Sent</span>
                            : item.is_removed_by_admin ? <span className="text-xs font-semibold text-error-500">Removed</span>
                            : <span className="text-xs font-semibold text-warning-600">Pending ({rem} left)</span>}
                        </Td>
                      </>
                    )}
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </div>

        {canProcess && (
          <div className="px-5 pb-5 pt-3">
            <GstSummaryCard totals={orderGstTotals} />
          </div>
        )}

        {canProcess && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-dark-500 dark:bg-dark-800">
            <p className="mr-auto text-sm text-gray-500 dark:text-dark-400">
              <span className="font-semibold">{Object.entries(adjustedItems).filter(([, a]) => !a.is_removed && a.approved_quantity > 0).length}</span> item(s) will be sent
              {selectedOrder!.items.length - activeItems.length > 0 &&
                <span className="ml-2 text-error-500">· {selectedOrder!.items.length - activeItems.length} removed</span>}
            </p>
            <Button variant="outlined" className="gap-1.5 border-error-200 px-5 text-error-500 hover:bg-error-50"
              onClick={() => cancelOrder(selectedOrder!.id)}>
              <XMarkIcon className="size-4" /> Cancel Order
            </Button>
            <Button color="primary" className="gap-2 px-7" disabled={processing || activeItems.length === 0} onClick={processOrder}>
              <CheckCircleIcon className="size-4" />
              {processing ? "Processing…" : "Send Items (Create Transfer)"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manual Transfer - Detail Drawer ──────────────────────────────────────
function TransferDetailDrawer({ detail, onClose, onComplete, onCancel }: {
  detail: TransferDetail | null; onClose: () => void;
  onComplete: (id: number) => void; onCancel: (id: number) => void;
}) {
  const totalBasic = detail?.items?.reduce((s, i) => s + safeNum((i as any).basic_amount), 0) || 0;
  const totalTax   = detail?.items?.reduce((s, i) => s + safeNum((i as any).tax_amount), 0) || 0;
  const totalNet   = detail?.items?.reduce((s, i) => s + safeNum((i as any).net_amount), 0) || 0;
  const totalCgst  = detail?.items?.reduce((s, i) => s + safeNum((i as any).cgst), 0) || 0;
  const totalSgst  = detail?.items?.reduce((s, i) => s + safeNum((i as any).sgst), 0) || 0;
  const totalIgst  = detail?.items?.reduce((s, i) => s + safeNum((i as any).igst), 0) || 0;
  const hasGst     = !!detail?.items?.some(i => safeNum((i as any).basic_amount) > 0);
  const grandTotal = detail?.items?.reduce((s, i) => s + i.quantity * i.rate, 0) || 0;

  return (
    <Transition appear show={!!detail} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40" />
        <TransitionChild as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full" enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0" leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[70%] xl:max-w-[62%] transform-gpu flex-col bg-white dark:bg-dark-700">
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TruckIcon className="size-5 opacity-80" /> {detail?.transfer_no}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {detail?.from_branch_name} → {detail?.to_branch_name} · {formatDateDDMMYYYY(detail?.transfer_date || "")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {detail?.status && (
                <Badge color={TRANSFER_STATUS_BADGE[detail.status] as any || "default"} variant="soft" className="text-xs capitalize">{detail.status}</Badge>
              )}
              <Button onClick={onClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
                <XMarkIcon className="size-5" />
              </Button>
            </div>
          </div>
          {/* Body */}
          <div className="hide-scrollbar grow overflow-y-auto px-5 py-5 space-y-4">
            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "From Branch", value: detail?.from_branch_name || "—" },
                { label: "To Branch",   value: detail?.to_branch_name || "—" },
                { label: "Date",        value: formatDateDDMMYYYY(detail?.transfer_date || "") },
                { label: "Note",        value: detail?.note || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-gray-50 p-3 dark:bg-dark-800">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-dark-400">{label}</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-dark-100 truncate">{value}</div>
                </div>
              ))}
            </div>
            {/* Items table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-500">
              <Table hoverable className="w-full min-w-[600px] text-left">
                <THead>
                  <Tr>
                    {["Item","Variant","Qty","Rate ₹","Amount ₹"].map(h => (
                      <Th key={h} className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300">{h}</Th>
                    ))}
                  </Tr>
                </THead>
                <TBody>
                  {detail?.items?.map((item, idx) => (
                    <Tr key={item.id}>
                      <Td className="font-semibold text-gray-800 dark:text-dark-100">{item.from_item_detail?.item_name}</Td>
                      <Td><Badge color="info" variant="soft" className="text-xs">{item.from_item_detail?.variant_info}</Badge></Td>
                      <Td className="text-center font-bold tabular-nums">{item.quantity}</Td>
                      <Td className="text-right font-mono tabular-nums">₹{item.rate}</Td>
                      <Td className="text-right font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{(item.quantity * item.rate).toFixed(2)}</Td>
                    </Tr>
                  ))}
                  <Tr className="border-t-2 border-primary/20 dark:border-primary/30">
                    <Td colSpan={3} className="bg-primary/5 dark:bg-primary/10 text-xs font-bold uppercase text-primary-700 dark:text-primary-300">TOTAL</Td>
                    <Td className="bg-primary/5 dark:bg-primary/10" />
                    <Td className="bg-primary/5 dark:bg-primary/10 text-right font-extrabold tabular-nums text-primary-600 dark:text-primary-400">₹{grandTotal.toFixed(2)}</Td>
                  </Tr>
                </TBody>
              </Table>
            </div>
            {/* GST Summary */}
            {hasGst && (
              <GstSummaryCard totals={{ basic: totalBasic, tax: totalTax, cgst: totalCgst, sgst: totalSgst, igst: totalIgst, net: totalNet }} />
            )}
          </div>
          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-5 py-4 dark:border-dark-500">
            <p className="text-xs text-gray-400 dark:text-dark-400">
              {detail?.items?.length ?? 0} item(s) · Grand Total:{" "}
              <span className="font-semibold text-primary-600 dark:text-primary-400">₹{grandTotal.toFixed(2)}</span>
            </p>
            {detail?.status === "pending" ? (
              <div className="flex gap-3">
                <Button variant="outlined" className="gap-1.5 border-error-200 px-4 text-sm text-error-500 hover:bg-error-50"
                  onClick={() => onCancel(detail.id)}>
                  <XMarkIcon className="size-4" /> Cancel
                </Button>
                <Button color="primary" className="gap-2 px-5 text-sm" onClick={() => onComplete(detail.id)}>
                  <CheckCircleIcon className="size-4" /> Complete Transfer
                </Button>
              </div>
            ) : (
              <Button variant="outlined" className="px-8" onClick={onClose}>Close</Button>
            )}
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
const MANUAL_STATUS_COLS: StatusCol[] = [
  { key: "pending",   label: "Pending",   color: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "completed", label: "Completed", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400" },
];

export default function StockTransferPage() {
  const [mode, setMode]               = useState<"manual" | "order_tracking">("manual");
  const [tab, setTab]                 = useState<"list" | "create">("list");
  const [branches, setBranches]       = useState<BranchOption[]>([]);
  const [myItems, setMyItems]         = useState<ItemWithVariants[]>([]);
  const [loading, setLoading]         = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [detail, setDetail]           = useState<TransferDetail | null>(null);
  const [form, setForm]               = useState<TransferForm>({
    to_branch_id: "", transfer_date: new Date().toISOString().slice(0, 10), note: "", items: [],
  });
  const [destBranchDetails, setDestBranchDetails] = useState<BranchOption | null>(null);

  // Manual transfers list
  const [manualView, setManualView]               = useState<"branches" | "list">("branches");
  const [allTransfers, setAllTransfers]           = useState<TransferListItem[]>([]);
  const [manualLoading, setManualLoading]         = useState(false);
  const [manualBranchFilter, setManualBranchFilter] = useState<{ branch_name: string; status: string } | null>(null);
  const [manualListPage, setManualListPage]       = useState(1);
  const MANUAL_PAGE_SIZE = 15;

  useEffect(() => {
    if (mode === "manual") { loadAll(); setManualView("branches"); setManualBranchFilter(null); }
  }, [mode]);

  useEffect(() => {
    setDestBranchDetails(form.to_branch_id ? (branches.find(b => b.id === parseInt(form.to_branch_id)) || null) : null);
  }, [form.to_branch_id, branches]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadAllTransfers(), loadBranches(), loadMyItems()]);
    setLoading(false);
  }

  async function loadAllTransfers() {
    setManualLoading(true);
    try {
      let page = 1; let all: TransferListItem[] = [];
      while (true) {
        const res = await Get(`stock-transfers/`, { page }) as any;
        const body = res?.data ?? res;
        if (!body?.success) break;
        const arr: TransferListItem[] = body.results || body.data || [];
        all = all.concat(arr);
        if (!body.next || arr.length === 0) break;
        if (++page > 200) break;
      }
      setAllTransfers(all);
    } catch { toasterrormsg("Error loading transfers"); }
    setManualLoading(false);
  }

  async function loadBranches() {
    try {
      const res = await Get("branches/", { ownership_type: "branch" }) as any;
      const body = res?.data ?? res;
      const myId = (() => { try { const b = sessionStorage.getItem("branch"); return b ? JSON.parse(b).id : null; } catch { return null; } })();
      setBranches((body.data || []).filter((b: BranchOption) => b.id !== myId && b.status === "active"));
    } catch { toasterrormsg("Error loading branches"); }
  }

  async function loadMyItems() {
    try {
      const res = await Get("stock-transfers/my-items/") as any;
      const body = res?.data ?? res;
      if (body.success) setMyItems(body.data || []);
    } catch { toasterrormsg("Could not load items"); }
  }

  const selectedVariantIds = new Set(form.items.map(i => i.from_variant_id));
  const destBranchName     = branches.find(b => String(b.id) === form.to_branch_id)?.branch_name || "";

  const manualBranchSummary = useMemo(() => {
    const map = new Map<string, any>();
    allTransfers.forEach(t => {
      if (!map.has(t.to_branch_name)) map.set(t.to_branch_name, { branch_name: t.to_branch_name, total: 0, pending: 0, completed: 0, cancelled: 0 });
      const row = map.get(t.to_branch_name)!; row.total++;
      if (t.status in row) row[t.status]++;
    });
    return Array.from(map.values()).sort((a, b) => a.branch_name.localeCompare(b.branch_name));
  }, [allTransfers]);

  const manualFiltered = useMemo(() => {
    if (!manualBranchFilter) return [];
    return allTransfers.filter(t => t.to_branch_name === manualBranchFilter.branch_name && (manualBranchFilter.status === "" || t.status === manualBranchFilter.status));
  }, [allTransfers, manualBranchFilter]);

  const manualTotalPages = Math.max(1, Math.ceil(manualFiltered.length / MANUAL_PAGE_SIZE));
  const manualPaged      = manualFiltered.slice((manualListPage - 1) * MANUAL_PAGE_SIZE, manualListPage * MANUAL_PAGE_SIZE);

  async function handleConfirm(rows: { item: ItemWithVariants; variant: VariantOption; quantity: number }[]) {
    if (!form.to_branch_id) { toasterrormsg("Select destination branch first"); return; }
    const newItems: FormItem[] = [];
    for (const { item, variant, quantity } of rows) {
      const branchPrice = variant.branch_price || 0;
      let gst = { basicAmount: 0, taxAmount: 0, cgst: 0, sgst: 0, igst: 0, netAmount: branchPrice * quantity };
      try {
        const res = await Post("pos/stock-transfer-item-tax/", { from_variant_id: variant.variant_id, to_branch_id: parseInt(form.to_branch_id), quantity }) as any;
        const d = res?.data ?? res;
        gst = { basicAmount: d.basic_amount||0, taxAmount: d.tax_amount||0, cgst: d.cgst||0, sgst: d.sgst||0, igst: d.igst||0, netAmount: d.net_amount||0 };
      } catch { /* silent */ }
      newItems.push({
        from_variant_id: String(variant.variant_id), from_item_name: item.item_name,
        from_variant_label: variant.variant_label, quantity, rate: String(branchPrice),
        max_stock: variant.current_stock, size: variant.size, color: variant.color,
        barcode: variant.barcode, item_id: item.item_id,
        hsnCode: variant.hsnCode || item.hsnCode, taxSlab: variant.taxSlab || item.taxSlab,
        basicPerUnit: quantity > 0 ? gst.basicAmount / quantity : 0,
        taxPerUnit:   quantity > 0 ? gst.taxAmount / quantity : 0,
        cgstPerUnit:  quantity > 0 ? gst.cgst / quantity : 0,
        sgstPerUnit:  quantity > 0 ? gst.sgst / quantity : 0,
        igstPerUnit:  quantity > 0 ? gst.igst / quantity : 0,
        netPerUnit:   quantity > 0 ? gst.netAmount / quantity : 0,
      });
    }
    setForm(f => ({ ...f, items: [...f.items, ...newItems] }));
    toastsuccessmsg(`${newItems.length} variant(s) added`);
  }

  function removeRow(i: number) { setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }
  function updateRow(i: number, key: "quantity" | "rate", val: string | number) {
    setForm(f => {
      const items = [...f.items];
      if (key === "quantity") {
        const n = Math.min(Math.max(0, Number(val) || 0), items[i].max_stock);
        items[i] = { ...items[i], quantity: n };
      } else {
        items[i] = { ...items[i], rate: String(isNaN(Number(val)) ? 0 : Number(val)) };
      }
      return { ...f, items };
    });
  }
  function resetForm() { setForm({ to_branch_id: "", transfer_date: new Date().toISOString().slice(0, 10), note: "", items: [] }); setDestBranchDetails(null); }

  async function createTransfer() {
    if (!form.items.length)        { toasterrormsg("Add at least one item"); return; }
    if (!form.to_branch_id)        { toasterrormsg("Select destination branch"); return; }
    if (form.items.some(r => Number(r.quantity) === 0)) { toasterrormsg("Remove items with 0 qty"); return; }
    setLoading(true);
    try {
      const res = await Post("stock-transfers/", {
        to_branch_id: parseInt(form.to_branch_id), transfer_date: form.transfer_date, note: form.note,
        items: form.items.map(r => ({ from_variant_id: parseInt(r.from_variant_id), quantity: parseInt(String(r.quantity)), rate: parseFloat(r.rate || "0") })),
      }) as any;
      const body = res?.data ?? res;
      if (body.success) { toastsuccessmsg("Transfer created!"); setTab("list"); resetForm(); loadAllTransfers(); }
      else toasterrormsg(body.message || "Error");
    } catch (e: any) { toasterrormsg(e.response?.data?.message || "Error creating transfer"); }
    setLoading(false);
  }

  async function completeTransfer(id: number) {
    if (!confirm("Complete transfer?")) return;
    try {
      const res = await Post(`stock-transfers/${id}/complete/`, {}) as any;
      const body = res?.data ?? res;
      if (body.success) { toastsuccessmsg(body.message); loadAllTransfers(); if (detail?.id === id) setDetail(null); }
    } catch (e: any) { toasterrormsg(e.response?.data?.message || "Error"); }
  }

  async function cancelTransfer(id: number) {
    if (!confirm("Cancel this transfer?")) return;
    try {
      const res = await Post(`stock-transfers/${id}/cancel/`, {}) as any;
      const body = res?.data ?? res;
      if (body.success) { toastsuccessmsg("Transfer cancelled."); loadAllTransfers(); setDetail(null); }
    } catch { toasterrormsg("Error cancelling"); }
  }

  async function loadDetail(id: number) {
    try {
      const res = await Get(`stock-transfers/${id}/`) as any;
      const body = res?.data ?? res;
      if (body.success) setDetail(body.data);
    } catch { toasterrormsg("Error loading details"); }
  }

  const totals = useMemo(() => ({
    qty:      form.items.reduce((a, b) => a + Number(b.quantity || 0), 0),
    value:    form.items.reduce((a, b) => a + Number(b.quantity || 0) * parseFloat(b.rate || "0"), 0),
    basic:    form.items.reduce((a, b) => a + (b.basicPerUnit || 0) * (b.quantity || 0), 0),
    tax:      form.items.reduce((a, b) => a + (b.taxPerUnit || 0) * (b.quantity || 0), 0),
    cgst:     form.items.reduce((a, b) => a + (b.cgstPerUnit || 0) * (b.quantity || 0), 0),
    sgst:     form.items.reduce((a, b) => a + (b.sgstPerUnit || 0) * (b.quantity || 0), 0),
    igst:     form.items.reduce((a, b) => a + (b.igstPerUnit || 0) * (b.quantity || 0), 0),
    netTotal: form.items.reduce((a, b) => a + (b.netPerUnit || 0) * (b.quantity || 0), 0),
  }), [form.items]);

  return (
    <Page title="Stock Transfer">
      <div className="transition-content w-full pb-8">
        {/* Header */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">Stock Transfer</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">Manage manual transfers &amp; branch orders</p>
          </div>
          {mode === "manual" && tab === "list" && (
            <div className="flex items-center gap-2">
              <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={loadAll} disabled={loading}>
                <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
              </Button>
              <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm" onClick={() => { setTab("create"); resetForm(); }}>
                <PlusIcon className="size-4" /> New Transfer
              </Button>
            </div>
          )}
          {mode === "manual" && tab === "create" && (
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => { setTab("list"); resetForm(); }}>
              <ArrowLeftIcon className="size-4" /> Back to List
            </Button>
          )}
        </div>

        {/* Mode toggle */}
        <div className="px-(--margin-x) mt-2 mb-4">
          <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-dark-500 dark:bg-dark-800">
            {([
              { key: "manual",         label: "Manual Transfer",  Icon: ArrowsRightLeftIcon },
              { key: "order_tracking", label: "Order Tracking",   Icon: ClipboardDocumentListIcon },
            ] as const).map(({ key, label, Icon }) => (
              <button key={key}
                onClick={() => { setMode(key); if (key === "manual") setTab("list"); }}
                className={clsx("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  mode === key ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── ORDER TRACKING ── */}
        {mode === "order_tracking" && (
          <div className="px-(--margin-x)"><OrderTracking /></div>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === "manual" && (
          <div className="px-(--margin-x) space-y-4">

            {/* Branch summary */}
            {tab === "list" && !detail && manualView === "branches" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
                  <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                    <TruckIcon className="size-4 text-primary-500" /> Select a branch &amp; status to view transfers
                  </p>
                  <Button variant="outlined" className="h-8 gap-1.5 rounded-lg px-3 text-xs" onClick={loadAllTransfers}>
                    <ArrowPathIcon className={clsx("size-3.5", manualLoading && "animate-spin")} /> Refresh
                  </Button>
                </div>
                <BranchSummaryTable title="Branch Transfers Summary" icon={<TruckIcon className="size-4 text-primary-500" />}
                  rows={manualBranchSummary} statusCols={MANUAL_STATUS_COLS} loading={manualLoading}
                  onSelect={(b, s) => { setManualBranchFilter({ branch_name: b, status: s }); setManualListPage(1); setManualView("list"); }} />
              </div>
            )}

            {/* Transfer list */}
            {tab === "list" && !detail && manualView === "list" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
                  <Button variant="flat" className="h-8 gap-1.5 rounded-lg px-3 text-sm text-primary-600"
                    onClick={() => { setManualView("branches"); setManualBranchFilter(null); }}>
                    <ArrowLeftIcon className="size-3.5" /> Back to Branches
                  </Button>
                  <span className="text-gray-300 dark:text-dark-600">|</span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-dark-100">
                    <BuildingStorefrontIcon className="size-4 text-gray-400" />{manualBranchFilter?.branch_name}
                  </span>
                  <span className="text-gray-300 dark:text-dark-600">|</span>
                  <div className="flex flex-wrap gap-2">
                    {["","pending","completed","cancelled"].map(s => (
                      <button key={s}
                        onClick={() => { setManualBranchFilter(f => f ? { ...f, status: s } : f); setManualListPage(1); }}
                        className={clsx("rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                          manualBranchFilter?.status === s ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200")}>
                        {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750">
                  <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-5 py-3.5 dark:border-dark-500 dark:bg-dark-800">
                    <TruckIcon className="size-4 text-primary-500" />
                    <span className="font-semibold text-gray-700 dark:text-dark-100">Transfers</span>
                    <Badge color="info" variant="soft" className="text-xs">{manualFiltered.length}</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table hoverable className="w-full min-w-[700px] text-left">
                      <THead>
                        <Tr>
                          {["Transfer No","To Branch","Date","Items","Status","Actions"].map(h => (
                            <Th key={h} className="text-xs font-semibold uppercase text-gray-500">{h}</Th>
                          ))}
                        </Tr>
                      </THead>
                      <TBody>
                        {manualLoading ? (
                          <Tr><Td colSpan={6} className="py-12 text-center"><ArrowPathIcon className="mx-auto size-6 animate-spin text-primary-500" /></Td></Tr>
                        ) : manualPaged.length === 0 ? (
                          <Tr><Td colSpan={6} className="py-16 text-center text-sm text-gray-400">No transfers found</Td></Tr>
                        ) : manualPaged.map(t => (
                          <Tr key={t.id}>
                            <Td><span className="font-bold text-primary-600 dark:text-primary-400">{t.transfer_no}</span></Td>
                            <Td className="font-medium text-gray-700 dark:text-dark-200">{t.to_branch_name}</Td>
                            <Td className="whitespace-nowrap text-xs text-gray-500 dark:text-dark-300">{formatDateDDMMYYYY(t.transfer_date)}</Td>
                            <Td className="text-center"><Badge  variant="soft" className="text-xs font-semibold">{t.item_count}</Badge></Td>
                            <Td><Badge color={TRANSFER_STATUS_BADGE[t.status] as any || "default"} variant="soft" className="text-xs capitalize">{t.status}</Badge></Td>
                            <Td>
                              <div className="flex items-center gap-2">
                                <Button isIcon variant="flat" className="size-7 rounded-full text-primary-500 hover:bg-primary/10" onClick={() => loadDetail(t.id)}><EyeIcon className="size-4" /></Button>
                                {t.status === "pending" && (
                                  <>
                                    <Button isIcon variant="flat" className="size-7 rounded-full text-success-500 hover:bg-success-50" onClick={() => completeTransfer(t.id)} title="Complete"><CheckCircleIcon className="size-4" /></Button>
                                    <Button isIcon variant="flat" className="size-7 rounded-full text-error-400 hover:bg-error-50" onClick={() => cancelTransfer(t.id)} title="Cancel"><XMarkIcon className="size-4" /></Button>
                                  </>
                                )}
                              </div>
                            </Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                  {manualFiltered.length > MANUAL_PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3.5 dark:border-dark-500 dark:bg-dark-800">
                      <p className="text-xs text-gray-500">
                        Showing <b>{Math.min((manualListPage-1)*MANUAL_PAGE_SIZE+1, manualFiltered.length)}</b>–<b>{Math.min(manualListPage*MANUAL_PAGE_SIZE, manualFiltered.length)}</b> of <b>{manualFiltered.length}</b>
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outlined" className="h-7 px-3 text-xs" disabled={manualListPage<=1} onClick={()=>setManualListPage(p=>Math.max(1,p-1))}>← Prev</Button>
                        <span className="text-xs">Page <b>{manualListPage}</b> / {manualTotalPages}</span>
                        <Button variant="outlined" className="h-7 px-3 text-xs" disabled={manualListPage>=manualTotalPages} onClick={()=>setManualListPage(p=>Math.min(manualTotalPages,p+1))}>Next →</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Create Transfer */}
            {tab === "create" && (
              <div className="space-y-4">
                {/* Transfer Details */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-dark-500 dark:bg-dark-750">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800 dark:text-dark-100">
                    <DocumentDuplicateIcon className="size-4 text-primary-500" /> Transfer Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Destination Branch <span className="text-error-500">*</span></label>
                      <Combobox
                        data={branches.map(b => {
                          const acct = b.sundry_debitor_account_name || b.sundry_creditor_account_name;
                          return { ...b, label: acct ? `${b.branch_name} → ${acct}` : `${b.branch_name} (No account linked)` };
                        })}
                        displayField="label"
                        searchFields={["label"]}
                        value={(() => {
                          const b = branches.find(b => String(b.id) === form.to_branch_id);
                          if (!b) return null;
                          const acct = b.sundry_debitor_account_name || b.sundry_creditor_account_name;
                          return { ...b, label: acct ? `${b.branch_name} → ${acct}` : `${b.branch_name} (No account linked)` };
                        })()}
                        onChange={(val: any) => setForm(f => ({ ...f, to_branch_id: val ? String(val.id) : "", items: [] }))}
                        placeholder="Select branch…"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Transfer Date <span className="text-error-500">*</span></label>
                      <DatePicker
                        value={form.transfer_date}
                        onChange={(v: string) => setForm(f => ({ ...f, transfer_date: v || f.transfer_date }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Note</label>
                      <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional…" classNames={{ input: "h-9 text-sm" }} />
                    </div>
                  </div>
                  {/* Dest branch info */}
                  {destBranchDetails && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
                      <div className="mb-2 flex items-center gap-2">
                        <BuildingStorefrontIcon className="size-4 text-primary-600" />
                        <span className="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-400">
                          Destination: {destBranchDetails.branch_name}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                        {[
                          { label: "Owner",   value: destBranchDetails.owner_name || "—" },
                          { label: "Phone",   value: destBranchDetails.phone || "—" },
                          { label: "Email",   value: destBranchDetails.email || "—" },
                          { label: "Address", value: destBranchDetails.address || "—" },
                          { label: "Linked A/c", value: destBranchDetails.sundry_debitor_account_name || destBranchDetails.sundry_creditor_account_name || null },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <span className="text-xs text-gray-400 dark:text-dark-400">{label}</span>
                            <div className={clsx("text-xs font-medium truncate", label === "Linked A/c" && !value ? "text-error-500" : "text-gray-700 dark:text-dark-200")}>
                              {label === "Linked A/c" ? (value || "Not linked") : value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Items table */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750">
                  <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-dark-500">
                    <div className="flex items-center gap-2">
                      <CubeIcon className="size-4 text-primary-500" />
                      <span className="font-bold text-gray-800 dark:text-dark-100">Items</span>
                      {form.items.length > 0 && <Badge color="primary" className="text-xs font-bold">{form.items.length}</Badge>}
                    </div>
                    <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
                      onClick={() => { if (!form.to_branch_id) { toasterrormsg("Select destination first"); return; } setItemModalOpen(true); }}>
                      <ArrowsRightLeftIcon className="size-4" /> Select Items
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table hoverable className="w-full min-w-[900px] text-left">
                      <THead>
                        <Tr>
                          {["#","Item","Variant","Barcode","HSN","GST%","Max Stock","Qty","Rate ₹","Amount ₹","Del"].map(h => (
                            <Th key={h} className="bg-primary/10 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300 whitespace-nowrap">{h}</Th>
                          ))}
                        </Tr>
                      </THead>
                      <TBody>
                        {form.items.length === 0 ? (
                          <Tr><Td colSpan={11} className="py-16 text-center text-sm text-gray-400 dark:text-dark-400">
                            <ArrowsRightLeftIcon className="mx-auto mb-3 size-10 text-gray-200 dark:text-dark-600" />
                            No items added yet
                          </Td></Tr>
                        ) : form.items.map((item, idx) => {
                          const low  = Number(item.quantity) > item.max_stock;
                          const zero = Number(item.quantity) === 0;
                          const amt  = Number(item.quantity || 0) * parseFloat(item.rate || "0");
                          return (
                            <Tr key={item.from_variant_id + idx} className={clsx(low && "bg-error-50/30 dark:bg-error-900/10", zero && !low && "bg-warning-50/30 dark:bg-warning-900/10")}>
                              <Td className="text-xs text-gray-400 dark:text-dark-500">{idx + 1}</Td>
                              <Td className="font-semibold text-gray-800 dark:text-dark-100">{item.from_item_name}</Td>
                              <Td className="text-center"><Badge color="info" variant="soft" className="text-xs">{item.from_variant_label}</Badge></Td>
                              <Td className="text-center font-mono text-xs text-gray-400">{item.barcode || "—"}</Td>
                              <Td className="text-center font-mono text-xs text-gray-500">{item.hsnCode || "—"}</Td>
                              <Td className="text-center"><Badge color="warning" variant="soft" className="text-xs">{item.taxSlab || "0%"}</Badge></Td>
                              <Td className="text-center">
                                <Badge color={item.max_stock <= 5 ? "warning" : "success"} variant="soft" className="text-xs font-bold">{item.max_stock}</Badge>
                              </Td>
                              <Td className="text-center w-24">
                                <Input type="number" min={0} max={item.max_stock} value={item.quantity}
                                  onChange={e => updateRow(idx, "quantity", e.target.value === "" ? 0 : parseInt(e.target.value))}
                                  classNames={{ input: clsx("h-8 w-20 text-center text-sm font-semibold", (low || zero) && "border-warning-400 dark:border-warning-600") }} />
                              </Td>
                              <Td className="text-right w-28">
                                <Input type="number" min={0} value={item.rate}
                                  onChange={e => updateRow(idx, "rate", e.target.value)}
                                  classNames={{ input: "h-8 w-24 text-right text-sm" }} />
                              </Td>
                              <Td className="text-right font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{amt.toFixed(2)}</Td>
                              <Td className="text-center">
                                <Button isIcon variant="flat" className="size-7 rounded-full text-error-400 hover:bg-error-50 hover:text-error-600"
                                  onClick={() => removeRow(idx)}><TrashIcon className="size-3.5" /></Button>
                              </Td>
                            </Tr>
                          );
                        })}
                      </TBody>
                      {form.items.length > 0 && (
                        <TBody>
                          <Tr className="border-t-2 border-primary/20 dark:border-primary/30">
                            <Td colSpan={5} className="bg-primary/5 dark:bg-primary/10 text-xs font-bold uppercase text-primary-700 dark:text-primary-300 text-right">Totals</Td>
                            <Td className="bg-primary/5 dark:bg-primary/10" />
                            <Td className="bg-primary/5 dark:bg-primary/10" />
                            <Td className="bg-primary/5 dark:bg-primary/10 text-center font-bold tabular-nums text-primary-600 dark:text-primary-400">{totals.qty}</Td>
                            <Td className="bg-primary/5 dark:bg-primary/10" />
                            <Td className="bg-primary/5 dark:bg-primary/10 text-right font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{totals.value.toFixed(2)}</Td>
                            <Td className="bg-primary/5 dark:bg-primary/10" />
                          </Tr>
                        </TBody>
                      )}
                    </Table>
                  </div>
                </div>

                {/* GST Summary */}
                {form.items.length > 0 && (
                  <GstSummaryCard totals={{ basic: totals.basic, tax: totals.tax, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, net: totals.netTotal }} />
                )}

                {/* Action bar */}
                <div className="flex items-center justify-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
                  <p className="mr-auto text-sm text-gray-500 dark:text-dark-400">
                    {form.items.length > 0
                      ? <><span className="font-semibold">{form.items.length} variants</span>{form.to_branch_id && <span className="ml-2 text-gray-400">→ {destBranchName}</span>}</>
                      : "No items selected"}
                  </p>
                  <Button variant="outlined" className="gap-1.5 px-5" onClick={() => { setTab("list"); resetForm(); }}>
                    <XMarkIcon className="size-4" /> Cancel
                  </Button>
                  <Button variant="outlined" className="gap-1.5 border-error-200 px-5 text-error-500 hover:bg-error-50"
                    onClick={() => setForm(f => ({ ...f, items: [] }))}>
                    <TrashIcon className="size-4" /> Clear All
                  </Button>
                  <Button color="primary" className="gap-2 px-7"
                    disabled={loading || !form.items.length || !form.to_branch_id || form.items.some(r => Number(r.quantity) > r.max_stock)}
                    onClick={createTransfer}>
                    <CheckCircleIcon className="size-4" />
                    {loading ? "Creating…" : "Create Transfer"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <SelectItemsDrawer isOpen={itemModalOpen} onClose={() => setItemModalOpen(false)}
        myItems={myItems} selectedVariantIds={selectedVariantIds} onConfirm={handleConfirm} />

      <TransferDetailDrawer detail={detail} onClose={() => setDetail(null)}
        onComplete={completeTransfer} onCancel={cancelTransfer} />
    </Page>
  );
}
