// src/app/pages/master-menu/item-barcodes/index.tsx
import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowPathIcon, MagnifyingGlassIcon, PrinterIcon,
  QrCodeIcon, XMarkIcon, CheckIcon, CheckCircleIcon,
  ClockIcon, SparklesIcon, CursorArrowRaysIcon,
  PencilIcon, LockClosedIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useState, useMemo } from "react";
import Barcode from "react-barcode";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Spinner, Table, TBody, Td, THead, Th, Tr, Checkbox } from "@/components/ui";
import { Get, Post, Put, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ────────────────────────────────────────────────────────────────────

interface PendingVariant {
  variant_id: number;
  item_id: number;
  item_name: string;
  size: string;
  color: string;
  mrp: number;
  sales_price: number;
  purchase_price: number;
  current_stock: number;
  op_stock: number;
  barcode: string;
  unit: string;
  hsn_code: string;
}

interface GeneratedVariant {
  variant_id: number;
  item_id: number;
  item_name: string;
  size: string;
  color: string;
  mrp: number;
  sales_price: number;
  current_stock: number;
  barcode: string;
  unit: string;
  hsn_code: string;
  entry_type: string;
}

interface PaginationInfo {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

interface PrintItem {
  variant_id: number;
  item_name: string;
  barcode: string;
  size: string;
  color: string;
  mrp: number;
  sales_price: number;
  hsn_code: string;
  printKey: string;
}

// ── Label presets for print (TSC TE244) ──────────────────────────────────────

const LABEL_PRESETS = [
  { id: "38x25_x2", label: "38×25 mm (2/row)", w: 38, h: 25, cols: 2, pageW: 78, pageH: 25, barH: 20, barW: 1.0, fs: 7 },
  { id: "50x25_x2", label: "50×25 mm (2/row)", w: 50, h: 25, cols: 2, pageW: 102, pageH: 25, barH: 20, barW: 1.2, fs: 7 },
  { id: "50x30_x2", label: "50×30 mm (2/row)", w: 50, h: 30, cols: 2, pageW: 102, pageH: 30, barH: 25, barW: 1.2, fs: 7 },
  { id: "100x50_x1", label: "100×50 mm (1/row)", w: 100, h: 50, cols: 1, pageW: 102, pageH: 50, barH: 38, barW: 1.8, fs: 10 },
  { id: "58x40_x1", label: "58×40 mm (1/row)", w: 58, h: 40, cols: 1, pageW: 60, pageH: 40, barH: 30, barW: 1.4, fs: 9 },
] as const;
type PresetId = typeof LABEL_PRESETS[number]["id"];

// ── Stat Card ────────────────────────────────────────────────────────────────

const STAT_CONFIGS = [
  {
    key: "pending" as const,
    label: "Pending",
    bg: "bg-amber-500",
    Icon: ClockIcon,
  },
  {
    key: "generated" as const,
    label: "Generated",
    bg: "bg-emerald-500",
    Icon: QrCodeIcon,
  },
  {
    key: "newlyCreated" as const,
    label: "Newly Created",
    bg: "bg-violet-500",
    Icon: SparklesIcon,
  },
  {
    key: "selected" as const,
    label: "Selected",
    bg: "bg-primary-600",
    Icon: CursorArrowRaysIcon,
  },
] as const;

function StatCard({
  label, value, bg, Icon,
}: { label: string; value: number; bg: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }) {
  return (
    <Card
      className={clsx(
        "group relative overflow-hidden bg-linear-to-br p-4 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        bg,
      )}
      skin="none"
    >
      {/* decorative circle */}
      <div className="pointer-events-none absolute -right-5 -top-5 z-0 size-24 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/75">{label}</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/15 text-white shadow-sm backdrop-blur-sm">
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({
  pagination, onPage, onSize,
}: {
  pagination: PaginationInfo;
  onPage: (p: number) => void;
  onSize: (s: number) => void;
}) {
  const { current_page: cp, total_pages: tp, count, page_size } = pagination;
  const pages: number[] = [];
  const start = Math.max(1, cp - 2);
  const end = Math.min(tp, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700">
      <p className="text-sm text-gray-500 dark:text-dark-300">
        Showing{" "}
        <span className="font-medium text-gray-800 dark:text-dark-100">
          {(cp - 1) * page_size + 1}–{Math.min(cp * page_size, count)}
        </span>{" "}
        of <span className="font-medium text-gray-800 dark:text-dark-100">{count}</span>
      </p>
      <div className="flex items-center gap-2">
        <select
          value={page_size}
          onChange={e => onSize(Number(e.target.value))}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
        >
          {[15, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <Button variant="outlined" className="h-7 px-2 text-xs" disabled={!pagination.has_previous} onClick={() => onPage(cp - 1)}>Prev</Button>
        {pages.map(p => (
          <Button key={p} variant={p === cp ? "filled" : "outlined"} color={p === cp ? "primary" : undefined}
            className="h-7 w-7 text-xs" onClick={() => onPage(p)}>{p}</Button>
        ))}
        <Button variant="outlined" className="h-7 px-2 text-xs" disabled={!pagination.has_next} onClick={() => onPage(cp + 1)}>Next</Button>
      </div>
    </div>
  );
}

// ── Print-in-new-window ───────────────────────────────────────────────────────

function printInNewWindow(items: PrintItem[], preset: typeof LABEL_PRESETS[number]) {
  const win = window.open("", "_blank", "width=520,height=600");
  if (!win) { alert("Popup blocked — please allow popups for this site."); return; }

  const labelsHtml = items.map((item, i) => `
    <div class="label">
      <div class="lname">${item.item_name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      ${(item.size || item.color) ? `<div class="lmeta">${[item.size && "S:" + item.size, item.color && "C:" + item.color].filter(Boolean).join(" | ")}</div>` : ""}
      <div class="lprice">
        ${item.hsn_code ? `<span>HSN:${item.hsn_code}</span>` : ""}
        <span>SP:&#8377;${item.sales_price}</span>
        <strong>MRP:&#8377;${item.mrp}</strong>
      </div>
      <svg id="bc${i}"></svg>
    </div>`).join("");

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Barcode Labels</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    @page{size:${preset.pageW}mm ${preset.pageH}mm;margin:0}
    html,body{width:${preset.pageW}mm;background:#fff;font-family:Arial,sans-serif}
    .grid{display:grid;grid-template-columns:repeat(${preset.cols},${preset.w}mm);row-gap:0}
    .label{width:${preset.w}mm;height:${preset.h}mm;padding:1mm 1.5mm;border:.2mm solid #ccc;
      display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden;
      page-break-inside:avoid;break-inside:avoid}
    .lname{font-size:${preset.h > 35 ? 10 : 7.5}pt;font-weight:700;text-align:center;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${preset.w - 3}mm;line-height:1.2;margin-bottom:.3mm}
    .lmeta{font-size:${preset.h > 35 ? 8 : 6}pt;color:#444;text-align:center;line-height:1.1;margin-bottom:.3mm}
    .lprice{font-size:${preset.h > 35 ? 8.5 : 6.5}pt;display:flex;justify-content:center;gap:1.5mm;flex-wrap:wrap;margin-bottom:.5mm}
    .lprice strong{font-weight:800}
    svg{display:block;width:${preset.w - 3}mm;height:auto;max-width:${preset.w - 3}mm}
    @media print{@page{size:${preset.pageW}mm ${preset.pageH}mm;margin:0}}
  </style></head><body>
  <div class="grid">${labelsHtml}</div>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
  <script>window.addEventListener("load",function(){
    var codes=${JSON.stringify(items.map(i => i.barcode))};
    codes.forEach(function(code,i){try{JsBarcode("#bc"+i,code,{format:"CODE128",width:${preset.barW},height:${preset.barH},displayValue:true,fontSize:${preset.fs + 1},margin:1,textMargin:1});}catch(e){}});
    setTimeout(function(){window.print();window.onafterprint=function(){window.close();};},600);
  });<\/script></body></html>`);
  win.document.close();
}

// ── Print Modal ───────────────────────────────────────────────────────────────

function PrintModal({
  open, onClose, items,
}: { open: boolean; onClose: () => void; items: PrintItem[] }) {
  const [presetId, setPresetId] = useState<PresetId>("50x25_x2");
  const preset = LABEL_PRESETS.find(p => p.id === presetId) ?? LABEL_PRESETS[1];

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm dark:bg-black/40"
        />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={DialogPanel}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-primary px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-white">Print Barcode Labels</h3>
                  <p className="mt-0.5 text-xs text-white/70">{items.length} label{items.length !== 1 ? "s" : ""} ready</p>
                </div>
                <Button onClick={onClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
                  <XMarkIcon className="size-5" />
                </Button>
              </div>

              {/* Preset selector */}
              <div className="p-4 border-b border-gray-200 dark:border-dark-600">
                <p className="text-xs font-semibold text-gray-500 dark:text-dark-300 mb-2 uppercase tracking-wide">Label Size (TSC TE244)</p>
                <div className="grid grid-cols-2 gap-2">
                  {LABEL_PRESETS.map(p => (
                    <button key={p.id} type="button" onClick={() => setPresetId(p.id)}
                      className={clsx(
                        "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                        presetId === p.id
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-primary dark:border-dark-500 dark:bg-dark-750 dark:text-dark-100",
                      )}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 flex gap-4 flex-wrap">
                  <span>Page: <strong>{preset.pageW}×{preset.pageH}mm</strong></span>
                  <span>Label: <strong>{preset.w}×{preset.h}mm</strong></span>
                  <span>Columns: <strong>{preset.cols}</strong></span>
                </div>
              </div>

              {/* Preview scroll */}
              <div className="max-h-64 overflow-y-auto bg-gray-50 dark:bg-dark-800 p-4">
                <p className="mb-2 text-xs text-gray-400">Screen preview (approximate)</p>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(preset.cols, 3)}, 1fr)` }}>
                  {items.slice(0, 12).map(item => (
                    <div key={item.printKey}
                      className="rounded border border-dashed border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 flex flex-col items-center justify-center overflow-hidden p-1 text-center"
                      style={{ minHeight: preset.h * 2.5 }}>
                      <p className="truncate w-full text-center text-[9px] font-bold text-gray-700 dark:text-dark-100 leading-tight">{item.item_name}</p>
                      {(item.size || item.color) && (
                        <p className="text-[8px] text-gray-500 dark:text-dark-400 leading-tight">{[item.size && `S:${item.size}`, item.color && `C:${item.color}`].filter(Boolean).join(" ")}</p>
                      )}
                      <p className="text-[8px] font-semibold text-gray-600 dark:text-dark-300 leading-tight">MRP:₹{item.mrp}</p>
                      <Barcode value={item.barcode} width={0.9} height={24} fontSize={7} margin={1} displayValue />
                    </div>
                  ))}
                  {items.length > 12 && (
                    <div className="flex items-center justify-center rounded border border-dashed border-gray-300 dark:border-dark-500 text-xs text-gray-400" style={{ minHeight: preset.h * 2.5 }}>
                      +{items.length - 12} more
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 dark:border-dark-600 px-5 py-4">
                <span className="text-sm text-gray-500 dark:text-dark-300">
                  Total: <strong className="text-gray-800 dark:text-dark-100">{items.length}</strong> labels
                </span>
                <div className="flex gap-2">
                  <Button variant="outlined" className="px-5" onClick={onClose}>Cancel</Button>
                  <Button color="primary" className="gap-2 px-6"
                    onClick={() => { onClose(); printInNewWindow(items, preset); }}>
                    <PrinterIcon className="size-4" /> Print Now
                  </Button>
                </div>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ItemBarcodesPage() {
  // ── role-based access ──
  const isSuperAdmin = useMemo(() => localStorage.getItem("role") === "superadmin", []);

  // Superadmin: company + manual dono edit kar sakta hai.
  // Normal branch: sirf manual entry_type wale items edit kar sakta hai.
  const canEditBarcode = (entryType: string | undefined): boolean => {
    if (isSuperAdmin) return true;
    return (entryType || "manual") === "manual";
  };

  const [tab, setTab] = useState<"pending" | "generated">("pending");


  // pending state
  const [pending, setPending] = useState<PendingVariant[]>([]);
  const [pendingPage, setPendingPage] = useState<PaginationInfo>({ count: 0, total_pages: 1, current_page: 1, page_size: 15, has_next: false, has_previous: false });
  const [pendingLoading, setPendingLoading] = useState(true);

  // generated state
  const [generated, setGenerated] = useState<GeneratedVariant[]>([]);
  const [generatedPage, setGeneratedPage] = useState<PaginationInfo>({ count: 0, total_pages: 1, current_page: 1, page_size: 15, has_next: false, has_previous: false });
  const [genLoading, setGenLoading] = useState(true);

  // selection & generation
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [generatedMap, setGeneratedMap] = useState<Map<number, string>>(new Map());
  const [manualInputs, setManualInputs] = useState<Map<number, string>>(new Map());
  const [stockInputs, setStockInputs] = useState<Map<number, string>>(new Map());
  const [stockSaving, setStockSaving] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [printQtys, setPrintQtys] = useState<Map<number, number>>(new Map());

  // search
  const [pendingSearch, setPendingSearch] = useState("");
  const [generatedSearch, setGeneratedSearch] = useState("");
  const [debouncedPS, setDebouncedPS] = useState("");
  const [debouncedGS, setDebouncedGS] = useState("");

  // print modal
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [showPrint, setShowPrint] = useState(false);


  // ── inline barcode edit (generated tab) ──
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [editBarcodeValue, setEditBarcodeValue] = useState("");
  const [updatingBarcode, setUpdatingBarcode] = useState(false);
  // debounce
  useEffect(() => { const t = setTimeout(() => setDebouncedPS(pendingSearch), 500); return () => clearTimeout(t); }, [pendingSearch]);
  useEffect(() => { const t = setTimeout(() => setDebouncedGS(generatedSearch), 500); return () => clearTimeout(t); }, [generatedSearch]);

  // ── Fetch pending ─────────────────────────────────────────────────────────
  const fetchPending = useCallback(async (page = 1, pageSize = 15, search = "") => {
    setPendingLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      const res = await Get("pos/barcodes/pending/", params) as any;
      const body = res?.data ?? res;
      if (body.success) {
        setPending(body.pending_variants ?? []);
        setPendingPage({
          count: body.count ?? 0,
          total_pages: body.total_pages ?? 1,
          current_page: body.current_page ?? page,
          page_size: body.page_size ?? pageSize,
          has_next: body.has_next ?? false,
          has_previous: body.has_previous ?? false,
        });
      }
    } catch { toasterrormsg("Failed to load pending items"); }
    finally { setPendingLoading(false); }
  }, []);

  // ── Fetch generated ───────────────────────────────────────────────────────
  const fetchGenerated = useCallback(async (page = 1, pageSize = 15, search = "") => {
    setGenLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      const res = await Get("pos/barcodes/generated/", params) as any;
      const body = res?.data ?? res;
      if (body.success) {
        const variants: GeneratedVariant[] = body.generated_variants ?? [];
        setGenerated(variants);
        setGeneratedPage({
          count: body.count ?? 0,
          total_pages: body.total_pages ?? 1,
          current_page: body.current_page ?? page,
          page_size: body.page_size ?? pageSize,
          has_next: body.has_next ?? false,
          has_previous: body.has_previous ?? false,
        });
        // init print qtys
        setPrintQtys(prev => {
          const next = new Map(prev);
          variants.forEach(v => { if (!next.has(v.variant_id)) next.set(v.variant_id, Math.min(100, Math.max(1, v.current_stock || 1))); });
          return next;
        });
      }
    } catch { toasterrormsg("Failed to load generated barcodes"); }
    finally { setGenLoading(false); }
  }, []);

  // initial load + search triggers
  useEffect(() => { fetchPending(1, pendingPage.page_size, debouncedPS); }, [debouncedPS]);
  useEffect(() => { fetchGenerated(1, generatedPage.page_size, debouncedGS); }, [debouncedGS]);

  const handleTabChange = (t: "pending" | "generated") => {
    setTab(t);
    setSelectedIds(new Set());
    if (t === "pending") fetchPending(1, pendingPage.page_size, debouncedPS);
    if (t === "generated") fetchGenerated(1, generatedPage.page_size, debouncedGS);
  };

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleAll = () => {
    const src = tab === "pending" ? pending : generated;
    if (selectedIds.size === src.length && src.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(src.map(v => v.variant_id)));
  };
  const toggleOne = (id: number) => setSelectedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // ── Generate single ────────────────────────────────────────────────────────
  const handleGenerateSingle = async (v: PendingVariant) => {
    const manual = manualInputs.get(v.variant_id)?.trim() ?? "";
    try {
      const res = await Post(`pos/barcodes/generate/${v.variant_id}/`, manual ? { barcode: manual } : {}) as any;
      const body = res?.data ?? res;
      if (body.success) {
        setGeneratedMap(prev => new Map(prev).set(v.variant_id, body.barcode));
        toastsuccessmsg(`Barcode generated: ${body.barcode}`);
        fetchPending(pendingPage.current_page, pendingPage.page_size, debouncedPS);
        fetchGenerated(1, generatedPage.page_size, "");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message ?? "Generate failed");
    }
  };

  // ── Bulk generate ──────────────────────────────────────────────────────────
  const handleBulkGenerate = async () => {
    if (!selectedIds.size) { toasterrormsg("Select items first"); return; }
    setBulkLoading(true);
    try {
      const res = await Post("pos/barcodes/bulk-generate/", { variant_ids: Array.from(selectedIds) }) as any;
      const body = res?.data ?? res;
      if (body.success) {
        const next = new Map(generatedMap);
        (body.results as any[]).forEach(r => { if (r.success) next.set(r.variant_id, r.barcode); });
        setGeneratedMap(next);
        toastsuccessmsg(`${body.generated_count} barcodes generated`);
        setSelectedIds(new Set());
        fetchPending(pendingPage.current_page, pendingPage.page_size, debouncedPS);
        fetchGenerated(1, generatedPage.page_size, "");
      }
    } catch { toasterrormsg("Bulk generate failed"); }
    finally { setBulkLoading(false); }
  };
  // ── Update stock ───────────────────────────────────────────────────────────
  const handleUpdateStock = async (variantId: number) => {
    const val = stockInputs.get(variantId);
    if (!val) { toasterrormsg("Enter stock quantity"); return; }
    setStockSaving(prev => new Set(prev).add(variantId));
    try {
      const res = await Put(`pos/barcodes/update-stock/${variantId}/`, { stock: parseInt(val) }) as any;
      const body = res?.data ?? res;
      if (body.success) {
        setPending(prev => prev.map(v => v.variant_id === variantId ? { ...v, current_stock: body.current_stock } : v));
        toastsuccessmsg("Stock updated");
      }
    } catch { toasterrormsg("Stock update failed"); }
    finally { setStockSaving(prev => { const s = new Set(prev); s.delete(variantId); return s; }); }
  };

  // ── Update barcode (generated tab, role-restricted) ──────────────────────
  const startEditBarcode = (v: GeneratedVariant) => {
    setEditingVariantId(v.variant_id);
    setEditBarcodeValue(v.barcode);
  };

  const cancelEditBarcode = () => {
    setEditingVariantId(null);
    setEditBarcodeValue("");
  };

  const handleUpdateBarcode = async (variantId: number) => {
    const newBarcode = editBarcodeValue.trim();
    if (!newBarcode || newBarcode.length < 3) {
      toasterrormsg("Please enter a valid barcode (min 3 characters)");
      return;
    }
    setUpdatingBarcode(true);
    try {
      const res = await Put(`pos/barcodes/update/${variantId}/`, { barcode: newBarcode }) as any;
      const body = res?.data ?? res;
      if (body.success) {
        setGenerated(prev => prev.map(v => v.variant_id === variantId ? { ...v, barcode: body.new_barcode } : v));
        toastsuccessmsg(`Barcode updated to: ${body.new_barcode}`);
        cancelEditBarcode();
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message ?? "Failed to update barcode");
    } finally {
      setUpdatingBarcode(false);
    }
  };

  // ── Print qty helper ────────────────────────────────────────────────────────
  const updateQty = (id: number, qty: number) =>
    setPrintQtys(prev => new Map(prev).set(id, Math.min(100, Math.max(0, qty))));

  // ── Build & open print ──────────────────────────────────────────────────────
  const buildPrintItems = (src: any[]): PrintItem[] => {
    const result: PrintItem[] = [];
    src.forEach(v => {
      const barcode = v.resolvedBarcode ?? v.barcode;
      if (!barcode) return;
      const copies = printQtys.get(v.variant_id) ?? 1;
      for (let i = 0; i < copies; i++) {
        result.push({
          variant_id: v.variant_id, item_name: v.item_name, barcode,
          size: v.size ?? "", color: v.color ?? "", mrp: v.mrp, sales_price: v.sales_price ?? 0,
          hsn_code: v.hsn_code ?? "", printKey: `${v.variant_id}-${i}-${Date.now()}`
        });
      }
    });
    return result;
  };

  const openPrint = () => {
    let items: PrintItem[] = [];
    if (tab === "generated") {
      const src = selectedIds.size > 0
        ? generated.filter(v => selectedIds.has(v.variant_id))
        : generated;
      items = buildPrintItems(src);
    } else {
      const src = pending
        .filter(v => generatedMap.has(v.variant_id) && (selectedIds.size === 0 || selectedIds.has(v.variant_id)))
        .map(v => ({ ...v, resolvedBarcode: generatedMap.get(v.variant_id)! }));
      items = buildPrintItems(src);
    }
    if (!items.length) { toasterrormsg("No barcodes to print"); return; }
    setPrintItems(items);
    setShowPrint(true);
  };

  const openSinglePrint = (v: GeneratedVariant) => {
    const copies = printQtys.get(v.variant_id) ?? 1;
    if (copies === 0) { toasterrormsg("Qty is 0"); return; }
    const items: PrintItem[] = Array.from({ length: copies }, (_, i) => ({
      variant_id: v.variant_id, item_name: v.item_name, barcode: v.barcode,
      size: v.size, color: v.color, mrp: v.mrp, sales_price: v.sales_price,
      hsn_code: v.hsn_code ?? "", printKey: `${v.variant_id}-${i}-${Date.now()}`,
    }));
    setPrintItems(items);
    setShowPrint(true);
  };

  const activeRows = tab === "pending" ? pending : generated;
  const allSelected = activeRows.length > 0 && selectedIds.size === activeRows.length;

  return (
    <Page title="Item Barcodes">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50 flex items-center gap-2">
              <QrCodeIcon className="size-5 text-primary" /> Item Barcodes
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Generate, manage and print barcode labels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 px-3 text-sm"
              onClick={() => tab === "pending"
                ? fetchPending(pendingPage.current_page, pendingPage.page_size, debouncedPS)
                : fetchGenerated(generatedPage.current_page, generatedPage.page_size, debouncedGS)}
              disabled={pendingLoading || genLoading}>
              <ArrowPathIcon className={clsx("size-4", (pendingLoading || genLoading) && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="px-(--margin-x) mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_CONFIGS.map(cfg => {
            const value =
              cfg.key === "pending" ? pendingPage.count :
                cfg.key === "generated" ? generatedPage.count :
                  cfg.key === "newlyCreated" ? generatedMap.size :
                    selectedIds.size;
            return (
              <StatCard
                key={cfg.key}
                label={cfg.label}
                value={value}
                bg={cfg.bg}
                Icon={cfg.Icon}
              />
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div className="px-(--margin-x) mt-5">
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit dark:border-dark-500 dark:bg-dark-750">
            {([
              { key: "pending", label: `Pending (${pendingPage.count})` },
              { key: "generated", label: `Generated (${generatedPage.count})` },
            ] as const).map(t => (
              <button key={t.key} type="button" onClick={() => handleTabChange(t.key)}
                className={clsx(
                  "rounded-lg px-5 py-1.5 text-sm font-semibold transition-all",
                  tab === t.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-600",
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search + actions bar ── */}
        <div className="px-(--margin-x) mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-72">
              <Input
                value={tab === "pending" ? pendingSearch : generatedSearch}
                onChange={e => tab === "pending" ? setPendingSearch(e.target.value) : setGeneratedSearch(e.target.value)}
                prefix={<MagnifyingGlassIcon className="size-4" />}
                classNames={{ input: "h-9 text-sm" }}
                placeholder={tab === "pending" ? "Search item, size, color…" : "Search item, barcode…"}
              />
            </div>
            {selectedIds.size > 0 && (
              <Badge color="info" variant="soft" className="text-xs">{selectedIds.size} selected</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {tab === "pending" && (
              <Button color="primary" className="h-9 gap-2 px-4 text-sm"
                onClick={handleBulkGenerate}
                disabled={bulkLoading || selectedIds.size === 0}>
                {bulkLoading
                  ? <Spinner size="xs" />
                  : <QrCodeIcon className="size-4" />}
                Generate ({selectedIds.size})
              </Button>
            )}
            <Button color="success" className="h-9 gap-2 px-4 text-sm" onClick={openPrint}>
              <PrinterIcon className="size-4" />
              Print {tab === "generated" && selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </Button>
          </div>
        </div>

        {/* ══════════════════ PENDING TAB ══════════════════ */}
        {tab === "pending" && (
          <div className="px-(--margin-x) pt-4">
            <Card className="relative overflow-hidden">
              {pendingLoading ? (
                <div className="flex items-center justify-center gap-3 py-16">
                  <Spinner size="md" /> <span className="text-sm text-gray-500 dark:text-dark-300">Loading…</span>
                </div>
              ) : (
                <div className="table-wrapper min-w-full overflow-x-auto">
                  <Table hoverable className="w-full text-left">
                    <THead>
                      <Tr>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase w-10">
                          <Checkbox checked={allSelected} onChange={toggleAll} />
                        </Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase w-10">#</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Item Name</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Variant</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">MRP</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Stock</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase min-w-[160px]">Manual Barcode</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase min-w-[180px]">Preview</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase text-center">Action</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {pending.length === 0 ? (
                        <Tr>
                          <Td colSpan={9} className="py-14 text-center text-gray-400 dark:text-dark-400">
                            <QrCodeIcon className="mx-auto mb-2 size-10 text-gray-200 dark:text-dark-600" />
                            {pendingPage.count === 0 ? "All items have barcodes!" : "No results"}
                          </Td>
                        </Tr>
                      ) : pending.map((v, idx) => {
                        const gened = generatedMap.get(v.variant_id);
                        const stockAmt = v.current_stock || v.op_stock || 0;
                        const saving = stockSaving.has(v.variant_id);
                        const manualVal = manualInputs.get(v.variant_id) ?? "";
                        return (
                          <Tr key={v.variant_id}
                            className={clsx("border-b border-gray-200 dark:border-dark-500 transition-colors",
                              selectedIds.has(v.variant_id) && "bg-primary-500/5 dark:bg-primary-500/10")}>
                            <Td className="bg-white dark:bg-dark-700 w-10">
                              <Checkbox checked={selectedIds.has(v.variant_id)} onChange={() => toggleOne(v.variant_id)} />
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 text-gray-400 dark:text-dark-400 text-xs">
                              {(pendingPage.current_page - 1) * pendingPage.page_size + idx + 1}
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 font-semibold text-gray-800 dark:text-dark-100 whitespace-nowrap">
                              {v.item_name}
                            </Td>
                            <Td className="bg-white dark:bg-dark-700">
                              <div className="flex gap-1 flex-wrap">
                                {v.size && <Badge color="neutral" variant="soft" className="text-xs">{v.size}</Badge>}
                                {v.color && <Badge color="neutral" variant="soft" className="text-xs">{v.color}</Badge>}
                                {!v.size && !v.color && <span className="text-gray-300 dark:text-dark-600 text-xs">—</span>}
                              </div>
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 font-medium text-gray-700 dark:text-dark-200">₹{v.mrp}</Td>
                            <Td className="bg-white dark:bg-dark-700">
                              {stockAmt > 0 ? (
                                <Badge color="success" variant="soft" className="text-xs">✓ {stockAmt}</Badge>
                              ) : (
                                <div className="flex gap-1.5 items-center">
                                  <Input type="number" min="0" placeholder="Qty"
                                    value={stockInputs.get(v.variant_id) ?? ""}
                                    onChange={e => setStockInputs(prev => new Map(prev).set(v.variant_id, e.target.value))}
                                    classNames={{ input: "h-7 w-20 text-xs" }} />
                                  <Button isIcon variant="flat" className="size-7 rounded-full bg-warning-100 hover:bg-warning-200 dark:bg-warning-900/20"
                                    onClick={() => handleUpdateStock(v.variant_id)} disabled={saving}>
                                    {saving ? <Spinner size="xs" /> : <CheckIcon className="size-3.5 text-warning-600" />}
                                  </Button>
                                </div>
                              )}
                            </Td>
                            <Td className="bg-white dark:bg-dark-700">
                              {!gened ? (
                                <Input type="text" placeholder="Manual (optional)"
                                  value={manualVal} maxLength={50}
                                  onChange={e => setManualInputs(prev => new Map(prev).set(v.variant_id, e.target.value.replace(/[^a-zA-Z0-9]/g, "")))}
                                  classNames={{ input: "h-7 w-36 text-xs " }} />
                              ) : <span className="text-gray-300 dark:text-dark-600 text-xs">—</span>}
                            </Td>
                            <Td className="bg-white dark:bg-dark-700">
                              {gened ? (
                                <div>
                                  <Barcode value={gened} width={1.2} height={28} fontSize={8} margin={2} displayValue />
                                  <p className="text-[10px] text-gray-400 dark:text-dark-400  mt-0.5">{gened}</p>
                                </div>
                              ) : (
                                <span className="text-xs italic text-warning-500">Not generated</span>
                              )}
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 text-center">
                              {!gened ? (
                                <Button color="primary" className="h-7 gap-1 px-3 text-xs mx-auto" onClick={() => handleGenerateSingle(v)}>
                                  <QrCodeIcon className="size-3.5" />
                                  {manualVal ? "Save" : "Auto"}
                                </Button>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="flex items-center gap-1 text-xs font-medium text-success-600 dark:text-success-400">
                                    <CheckCircleIcon className="size-3.5" /> Done
                                  </span>
                                  <button type="button"
                                    onClick={() => setGeneratedMap(prev => { const m = new Map(prev); m.delete(v.variant_id); return m; })}
                                    className="text-xs text-error-500 hover:text-error-700 dark:text-error-400">
                                    Reset
                                  </button>
                                </div>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
              {!pendingLoading && pendingPage.count > pendingPage.page_size && (
                <PaginationBar
                  pagination={pendingPage}
                  onPage={p => { fetchPending(p, pendingPage.page_size, debouncedPS); setSelectedIds(new Set()); }}
                  onSize={s => { fetchPending(1, s, debouncedPS); setSelectedIds(new Set()); }}
                />
              )}
            </Card>
          </div>
        )}

        {/* ══════════════════ GENERATED TAB ══════════════════ */}
        {tab === "generated" && (
          <div className="px-(--margin-x) pt-4">
            <Card className="relative overflow-hidden">
              {genLoading ? (
                <div className="flex items-center justify-center gap-3 py-16">
                  <Spinner size="md" /> <span className="text-sm text-gray-500 dark:text-dark-300">Loading…</span>
                </div>
              ) : (
                <div className="table-wrapper min-w-full overflow-x-auto">
                  <Table hoverable className="w-full text-left">
                    <THead>
                      <Tr>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase w-10">
                          <Checkbox checked={allSelected} onChange={toggleAll} />
                        </Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">SR No.</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Item Name</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Variant</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Type</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">MRP</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">S.Price</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Stock</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Barcode</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Copies</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase">Preview</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase text-center">Print</Th>
                        <Th className="bg-gray-200 dark:bg-dark-800 dark:text-dark-100 font-semibold text-gray-800 uppercase text-center">Update</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {generated.length === 0 ? (
                        <Tr>
                          <Td colSpan={13} className="py-14 text-center text-gray-400 dark:text-dark-400">
                            <QrCodeIcon className="mx-auto mb-2 size-10 text-gray-200 dark:text-dark-600" />
                            {generatedPage.count === 0 ? "No barcodes yet — generate from Pending tab." : "No results"}
                          </Td>
                        </Tr>
                      ) : generated.map((v, idx) => {
                        const qty = printQtys.get(v.variant_id) ?? 1;
                        return (
                          <Tr key={v.variant_id}
                            className={clsx("border-b border-gray-200 dark:border-dark-500 transition-colors",
                              selectedIds.has(v.variant_id) && "bg-primary-500/5 dark:bg-primary-500/10")}>
                            <Td className="bg-white dark:bg-dark-700 w-10">
                              <Checkbox checked={selectedIds.has(v.variant_id)} onChange={() => toggleOne(v.variant_id)} />
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 text-gray-400 dark:text-dark-400 text-xs">
                              {(generatedPage.current_page - 1) * generatedPage.page_size + idx + 1}
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 font-semibold text-gray-800 dark:text-dark-100 whitespace-nowrap">
                              {v.item_name}
                            </Td>
                            <Td className="bg-white dark:bg-dark-700">
                              <div className="flex gap-1 flex-wrap">
                                {v.size && <Badge color="neutral" variant="soft" className="text-xs">{v.size}</Badge>}
                                {v.color && <Badge color="neutral" variant="soft" className="text-xs">{v.color}</Badge>}
                                {!v.size && !v.color && <span className="text-gray-300 dark:text-dark-600 text-xs">—</span>}
                              </div>
                            </Td>
                            <Td className="bg-white dark:bg-dark-700">
                              <Badge color={v.entry_type === "company" ? "info" : "success"} variant="soft" className="text-xs capitalize">
                                {v.entry_type || "manual"}
                              </Badge>
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 font-medium text-gray-700 dark:text-dark-200">₹{v.mrp}</Td>
                            <Td className="bg-white dark:bg-dark-700 text-gray-600 dark:text-dark-300">₹{v.sales_price}</Td>
                            <Td className="bg-white dark:bg-dark-700">
                              <Badge color={v.current_stock > 0 ? "success" : "error"} variant="soft" className="text-xs">
                                {v.current_stock > 0 ? `✓ ${v.current_stock}` : "Out"}
                              </Badge>
                            </Td>
                            <Td className="bg-white dark:bg-dark-700  text-xs text-gray-700 dark:text-dark-200 whitespace-nowrap">
                              {v.barcode}
                            </Td>
                            <Td className="bg-white dark:bg-dark-700">
                              <div className="flex items-center gap-1 whitespace-nowrap">

                                <button
                                  type="button"
                                  onClick={() => updateQty(v.variant_id, Math.max(0, qty - 1))}
                                  className="flex size-6 shrink-0 items-center justify-center rounded bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200 dark:hover:bg-dark-500"
                                >
                                  −
                                </button>

                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={qty}
                                  onChange={(e) =>
                                    updateQty(v.variant_id, parseInt(e.target.value) || 0)
                                  }
                                  classNames={{
                                    input: "h-6 w-14 min-w-14 px-1 text-center text-xs",
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={() => updateQty(v.variant_id, Math.min(100, qty + 1))}
                                  className="flex size-6 shrink-0 items-center justify-center rounded bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200 dark:hover:bg-dark-500"
                                >
                                  +
                                </button>

                              </div>
                            </Td>
                            <Td className="bg-white dark:bg-dark-700">
                              <Barcode value={v.barcode} width={1.1} height={26} fontSize={7} margin={2} displayValue />
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 text-center">
                              <Button color="success" className="h-7 gap-1 px-3 text-xs mx-auto whitespace-nowrap"
                                disabled={qty === 0} onClick={() => openSinglePrint(v)}>
                                <PrinterIcon className="size-3.5" />
                                {qty > 1 ? `×${qty}` : "Print"}
                              </Button>
                            </Td>
                            <Td className="bg-white dark:bg-dark-700 text-center">
                              {editingVariantId === v.variant_id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input
                                    autoFocus
                                    value={editBarcodeValue}
                                    onChange={e => setEditBarcodeValue(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") handleUpdateBarcode(v.variant_id);
                                      if (e.key === "Escape") cancelEditBarcode();
                                    }}
                                    placeholder="New barcode"
                                    classNames={{ input: "h-7 w-28 text-xs " }}
                                  />
                                  <Button isIcon variant="flat" className="size-7 rounded-full bg-success-100 hover:bg-success-200 dark:bg-success-900/20"
                                    disabled={updatingBarcode} onClick={() => handleUpdateBarcode(v.variant_id)}>
                                    {updatingBarcode ? <span className="size-3.5 animate-spin rounded-full border-2 border-success-600 border-t-transparent" /> : <CheckIcon className="size-3.5 text-success-600" />}
                                  </Button>
                                  <Button isIcon variant="flat" className="size-7 rounded-full hover:bg-error-50 dark:hover:bg-error-900/20"
                                    onClick={cancelEditBarcode}>
                                    <XMarkIcon className="size-3.5 text-error-600" />
                                  </Button>
                                </div>
                              ) : canEditBarcode(v.entry_type) ? (
                                <Button isIcon variant="flat" className="size-7 rounded-full hover:bg-primary/10"
                                  title="Edit barcode" onClick={() => startEditBarcode(v)}>
                                  <PencilIcon className="size-3.5 text-primary-600" />
                                </Button>
                              ) : (
                                <span className="inline-flex" title="Company items cannot be edited by branch users">
                                  <LockClosedIcon className="size-3.5 text-gray-400" />
                                </span>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
              {!genLoading && generatedPage.count > generatedPage.page_size && (
                <PaginationBar
                  pagination={generatedPage}
                  onPage={p => { fetchGenerated(p, generatedPage.page_size, debouncedGS); setSelectedIds(new Set()); }}
                  onSize={s => { fetchGenerated(1, s, debouncedGS); setSelectedIds(new Set()); }}
                />
              )}
            </Card>
          </div>
        )}

      </div>

      {/* ── Print Modal ── */}
      <PrintModal open={showPrint} onClose={() => setShowPrint(false)} items={printItems} />
    </Page>
  );
}
