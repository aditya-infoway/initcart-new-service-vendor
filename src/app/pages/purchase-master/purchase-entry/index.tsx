import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon, BanknotesIcon,
  CurrencyRupeeIcon, EyeIcon, FunnelIcon,
  MagnifyingGlassIcon, PlusIcon, PrinterIcon, ReceiptRefundIcon,
  ShoppingBagIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import * as XLSX from "xlsx";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Decimal-safe rounding (fixes float drift like 12.999999999) ────────────
const round2 = (val: any): number => {
  const n = Number(val);
  if (isNaN(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

// ── Types ──────────────────────────────────────────────────────────────────
interface PurchaseItem {
  itemName: string;
  hsnCode: string;
  qty: string;
  altQty: string;
  price: string;
  unit: string;
  discountPercent: string;
  taxPercent: string;
  basicAmount: string;
  discountAmount: string;
  taxAmount: string;
  netAmount: string;
  barcode: string;
}

interface PurchaseRecord {
  id: number;
  billNo: string;
  purchaseBillNo: string;
  date: string;
  partyName: string;
  paymentTerms: string;
  narration: string;
  totalBasic: number;
  totalTax: number;
  grandTotal: number;
  dueDate: string | null;
  for_: number;
  items: PurchaseItem[];
}

function mapRow(raw: any): PurchaseRecord {
  const fright = round2(raw.frightcharge ?? raw.fright_charge ?? 0);
  const other  = round2(raw.otherexpnse  ?? raw.other_expense  ?? 0);
  const round  = round2(raw.roundamount  ?? raw.round_amount   ?? 0);
  return {
    id:             Number(raw.id ?? 0),
    billNo:         String(raw.bill_no ?? raw.billNo ?? ""),
    purchaseBillNo: String(raw.purchase_bill_no ?? raw.purchasebill_no ?? raw.pur_bill_no ?? ""),
    date:           String(raw.date ?? ""),
    partyName:      String(raw.party_name ?? raw.party_name_name ?? raw.vendor_name ?? ""),
    paymentTerms:   String(raw.payment_terms ?? raw.terms ?? ""),
    narration:      String(raw.narration ?? ""),
    totalBasic:     round2(raw.total_basic ?? 0),
    totalTax:       round2(raw.total_tax ?? 0),
    grandTotal:     round2(raw.grand_total ?? 0),
    dueDate:        raw.due_date ?? raw.dueDate ?? null,
    for_:           round2(fright + other + round),
    items: Array.isArray(raw.items) ? raw.items.map((i: any) => ({
      itemName:        String(i.item_name ?? i.itemName_name ?? ""),
      hsnCode:         String(i.hsn_code ?? i.hsnCode ?? ""),
      qty:             String(i.qty ?? i.quantity ?? "0"),
      altQty:          String(i.alt_qty ?? i.altQuantity ?? "0"),
      price:           String(i.price ?? "0"),
      unit:            String(i.unit ?? i.per ?? "pc"),
      discountPercent: String(i.discount_percent ?? i.discountPercent ?? "0"),
      taxPercent:      String(i.tax_percent ?? "0"),
      basicAmount:     String(i.basic_amount ?? i.basicAmount ?? "0"),
      discountAmount:  String(i.discount_amount ?? i.discountAmount ?? "0"),
      taxAmount:       String(i.tax_amount ?? i.taxAmount ?? "0"),
      netAmount:       String(i.net_amount ?? i.netValue ?? "0"),
      barcode:         String(i.barcode ?? ""),
    })) : [],
  };
}

// ── Items Detail Drawer ────────────────────────────────────────────────────
function ItemsDrawer({ record, onClose }: { record: PurchaseRecord | null; onClose: () => void }) {
  const totalBasic    = round2(record?.items.reduce((s, i) => s + Number(i.basicAmount),    0) ?? 0);
  const totalDiscount = round2(record?.items.reduce((s, i) => s + Number(i.discountAmount), 0) ?? 0);
  const totalTax      = round2(record?.items.reduce((s, i) => s + Number(i.taxAmount),      0) ?? 0);
  const totalNet      = round2(record?.items.reduce((s, i) => s + Number(i.netAmount),      0) ?? 0);

  return (
    <Transition appear show={!!record} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        {/* Backdrop */}
        <TransitionChild as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />

        {/* Slide-over panel */}
        <TransitionChild as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full" enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0" leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[72%] xl:max-w-[65%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* ── Drawer Header ─────────────────────────────────────── */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShoppingBagIcon className="size-5 opacity-80" />
                Purchase Bill — {record?.billNo || "—"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {record?.partyName}
                {record?.date ? ` · ${formatDateDDMMYYYY(record.date)}` : ""}
                {record?.purchaseBillNo ? ` · PB# ${record.purchaseBillNo}` : ""}
              </p>
            </div>
            <Button onClick={onClose} variant="flat" isIcon
              className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          {/* ── Scrollable Body ────────────────────────────────────── */}
          <div className="hide-scrollbar grow overflow-y-auto">

            {/* Bill Info Cards */}
            <div className="px-5 pt-5 pb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Payment Terms", value: record?.paymentTerms || "—",
                  color: record?.paymentTerms?.toLowerCase() === "cash"   ? "text-emerald-600 dark:text-emerald-400"
                       : record?.paymentTerms?.toLowerCase() === "credit" ? "text-amber-600 dark:text-amber-400"
                       : "text-sky-600 dark:text-sky-400" },
                { label: "Due Date",      value: record?.dueDate ? formatDateDDMMYYYY(record.dueDate) : "—",
                  color: "text-gray-700 dark:text-dark-100" },
                { label: "Total Items",   value: String(record?.items.length ?? 0),
                  color: "text-primary-600 dark:text-primary-400" },
                { label: "Narration",     value: record?.narration || "—",
                  color: "text-gray-600 dark:text-dark-200" },
              ].map(({ label, value, color }) => (
                <div key={label}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-500 dark:bg-dark-750">
                  <p className="text-xs text-gray-500 dark:text-dark-400">{label}</p>
                  <p className={clsx("mt-0.5 text-sm font-semibold truncate", color)}>{value}</p>
                </div>
              ))}
            </div>

            {/* Summary Totals */}
            <div className="px-5 pb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Basic",    value: totalBasic,    bg: "from-primary-500 to-primary-700" },
                { label: "Total Discount", value: totalDiscount, bg: "from-rose-500 to-rose-700" },
                { label: "Total Tax",      value: totalTax,      bg: "from-amber-500 to-amber-600" },
                { label: "Net Total",      value: totalNet,      bg: "from-emerald-500 to-emerald-700" },
              ].map(({ label, value, bg }) => (
                <div key={label}
                  className={clsx("relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-md", bg)}>
                  <div className="pointer-events-none absolute -right-2 -top-2 size-12 rounded-full bg-white/10" />
                  <p className="text-lg font-bold tabular-nums">₹{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
                </div>
              ))}
            </div>

            {/* Bill Totals row */}
            <div className="px-5 pb-4">
              <div className="rounded-xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750 divide-y divide-gray-100 dark:divide-dark-600">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-500 dark:text-dark-300">Total Basic</span>
                  <span className="tabular-nums font-semibold text-gray-700 dark:text-dark-100">₹{record?.totalBasic.toFixed(2) ?? "0.00"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-500 dark:text-dark-300">Total Tax</span>
                  <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">₹{record?.totalTax.toFixed(2) ?? "0.00"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-500 dark:text-dark-300">F + O + R</span>
                  <span className="tabular-nums font-semibold text-purple-600 dark:text-purple-400">₹{record?.for_.toFixed(2) ?? "0.00"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 rounded-b-xl">
                  <span className="text-sm font-bold text-primary-700 dark:text-primary-300">Grand Total</span>
                  <span className="tabular-nums text-base font-extrabold text-primary-600 dark:text-primary-400">₹{record?.grandTotal.toFixed(2) ?? "0.00"}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="px-5 pb-5">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-200">
                <ReceiptRefundIcon className="size-4 text-primary-500" />
                Line Items
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-300">
                  {record?.items.length ?? 0}
                </span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-500">
                <Table hoverable className="w-full min-w-[900px] text-left">
                  <THead>
                    <Tr>
                      {["#", "Item Name", "HSN", "Barcode", "Qty", "Alt Qty", "Price", "Per", "Disc%", "Basic Amt", "Disc Amt", "Tax Amt", "Net Value"].map(h => (
                        <Th key={h}
                          className="bg-primary/10 text-xs font-semibold uppercase text-primary-700 dark:bg-primary/20 dark:text-primary-300 whitespace-nowrap">
                          {h}
                        </Th>
                      ))}
                    </Tr>
                  </THead>
                  <TBody>
                    {!record?.items.length ? (
                      <Tr>
                        <Td colSpan={13} className="py-10 text-center text-sm text-gray-400 dark:text-dark-400">
                          No items found.
                        </Td>
                      </Tr>
                    ) : record.items.map((item, i) => (
                      <Tr key={i} className="border-b border-gray-100 dark:border-dark-600 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                        <Td className="text-xs text-gray-400 dark:text-dark-500">{i + 1}</Td>
                        <Td className="font-medium text-gray-800 dark:text-dark-100 whitespace-nowrap">{item.itemName || "—"}</Td>
                        <Td className="text-xs text-gray-500 dark:text-dark-300">{item.hsnCode || "—"}</Td>
                        <Td className="text-xs text-gray-500 dark:text-dark-300 font-mono">{item.barcode || "—"}</Td>
                        <Td className="text-center font-semibold tabular-nums text-gray-800 dark:text-dark-100">{item.qty}</Td>
                        <Td className="text-center tabular-nums text-gray-500 dark:text-dark-300">{Number(item.altQty) > 0 ? item.altQty : "—"}</Td>
                        <Td className="tabular-nums text-gray-700 dark:text-dark-200">₹{round2(item.price).toFixed(2)}</Td>
                        <Td className="text-xs text-gray-500 dark:text-dark-300">{item.unit}</Td>
                        <Td className="tabular-nums text-rose-600 dark:text-rose-400">{round2(item.discountPercent).toFixed(2)}%</Td>
                        <Td className="font-medium tabular-nums text-primary-600 dark:text-primary-400">₹{round2(item.basicAmount).toFixed(2)}</Td>
                        <Td className="tabular-nums text-rose-500 dark:text-rose-400">₹{round2(item.discountAmount).toFixed(2)}</Td>
                        <Td className="font-medium tabular-nums text-amber-600 dark:text-amber-400">₹{round2(item.taxAmount).toFixed(2)}</Td>
                        <Td className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">₹{round2(item.netAmount).toFixed(2)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                  {(record?.items.length ?? 0) > 0 && (
                    <TBody>
                      <Tr className="border-t-2 border-primary/20 dark:border-primary/30">
                        <Td colSpan={9}
                          className="bg-primary/5 dark:bg-primary/10 text-xs font-bold uppercase text-primary-700 dark:text-primary-300">
                          TOTAL
                        </Td>
                        <Td className="bg-primary/5 dark:bg-primary/10 font-bold tabular-nums text-primary-600 dark:text-primary-400">
                          ₹{totalBasic.toFixed(2)}
                        </Td>
                        <Td className="bg-primary/5 dark:bg-primary/10 font-bold tabular-nums text-rose-500 dark:text-rose-400">
                          ₹{totalDiscount.toFixed(2)}
                        </Td>
                        <Td className="bg-primary/5 dark:bg-primary/10 font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          ₹{totalTax.toFixed(2)}
                        </Td>
                        <Td className="bg-primary/5 dark:bg-primary/10 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          ₹{totalNet.toFixed(2)}
                        </Td>
                      </Tr>
                    </TBody>
                  )}
                </Table>
              </div>
            </div>
          </div>

          {/* ── Drawer Footer ──────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-5 py-4 dark:border-dark-500">
            <p className="text-xs text-gray-400 dark:text-dark-400">
              {record?.items.length ?? 0} item{(record?.items.length ?? 0) !== 1 ? "s" : ""} ·
              Grand Total: <span className="font-semibold text-primary-600 dark:text-primary-400">₹{record?.grandTotal.toFixed(2) ?? "0.00"}</span>
            </p>
            <Button variant="outlined" className="px-8" onClick={onClose}>
              Close
            </Button>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PurchaseEntryPage() {
  const navigate = useNavigate();
  const [records, setRecords]           = useState<PurchaseRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter]     = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PurchaseRecord | null>(null);

  const TERMS_OPTIONS = [
    { id: "all",    label: "All Terms" },
    { id: "Cash",   label: "Cash"      },
    { id: "Bank",   label: "Bank"      },
    { id: "Credit", label: "Credit"    },
  ];
  const [filterTermsObj, setFilterTermsObj] = useState(TERMS_OPTIONS[0]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await Get("pos/purchse-items/", { page: 1, page_size: 1000 }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body) ? body : [];
      setRecords(rows.map(mapRow));
    } catch { toasterrormsg("Failed to fetch purchase records."); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = useMemo(() => {
    if (filterTermsObj.id === "all") return records;
    return records.filter(r => r.paymentTerms.toLowerCase() === filterTermsObj.id.toLowerCase());
  }, [records, filterTermsObj]);

  const totals = useMemo(() => ({
    totalBasic: round2(filtered.reduce((s, r) => s + r.totalBasic, 0)),
    totalTax:   round2(filtered.reduce((s, r) => s + r.totalTax, 0)),
    for_:       round2(filtered.reduce((s, r) => s + r.for_, 0)),
    grandTotal: round2(filtered.reduce((s, r) => s + r.grandTotal, 0)),
  }), [filtered]);

  // ── Export to Excel (.xlsx, with grand-total row) ──────────────────────
  const handleExport = () => {
    if (filtered.length === 0) { toasterrormsg("No data to export."); return; }

    const exportData: any[] = filtered.map((r, i) => ({
      "SR No":             i + 1,
      "Date":               r.date || "-",
      "Terms":              r.paymentTerms || "-",
      "Party Name":         r.partyName || "-",
      "Bill No":            r.billNo || "-",
      "Purchase Bill No":   r.purchaseBillNo || "-",
      "Due Date":           r.dueDate || "-",
      "Narration":          r.narration || "-",
      "Total Basic (₹)":    r.totalBasic.toFixed(2),
      "Total Tax (₹)":      r.totalTax.toFixed(2),
      "F+O+R (₹)":          r.for_.toFixed(2),
      "Grand Total (₹)":    r.grandTotal.toFixed(2),
      "Items":              r.items.length,
    }));

    exportData.push({
      "SR No": "", "Date": "", "Terms": "", "Party Name": "TOTAL",
      "Bill No": "", "Purchase Bill No": "", "Due Date": "", "Narration": "",
      "Total Basic (₹)": totals.totalBasic.toFixed(2),
      "Total Tax (₹)":   totals.totalTax.toFixed(2),
      "F+O+R (₹)":       totals.for_.toFixed(2),
      "Grand Total (₹)": totals.grandTotal.toFixed(2),
      "Items": "",
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
      { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 15 }, { wch: 8 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Register");
    XLSX.writeFile(wb, `Purchase_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns = useMemo<ColumnDef<PurchaseRecord>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<PurchaseRecord, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<PurchaseRecord, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "paymentTerms", accessorKey: "paymentTerms", header: "Terms",
      cell: ({ getValue }: CellContext<PurchaseRecord, unknown>) => {
        const v = String(getValue() ?? "");
        const color = v.toLowerCase() === "cash" ? "success" : v.toLowerCase() === "credit" ? "warning" : "info";
        return <Badge color={color as any} variant="soft">{v || "—"}</Badge>;
      },
    },
    {
      id: "partyName", accessorKey: "partyName", header: "Party Name",
      cell: ({ getValue, table }: CellContext<PurchaseRecord, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return <span className="font-medium text-gray-800 dark:text-dark-100"><Highlight query={q}>{String(getValue() ?? "—")}</Highlight></span>;
      },
    },
    {
      id: "billNo", accessorKey: "billNo", header: "Bill No",
      cell: ({ getValue, table }: CellContext<PurchaseRecord, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return <span className="whitespace-nowrap font-medium text-primary-600 dark:text-primary-400"><Highlight query={q}>{String(getValue() ?? "—")}</Highlight></span>;
      },
    },
    {
      id: "purchaseBillNo", accessorKey: "purchaseBillNo", header: "Purchase Bill No",
      cell: ({ getValue, table }: CellContext<PurchaseRecord, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return <span className=" text-xs text-gray-600 dark:text-dark-200 whitespace-nowrap"><Highlight query={q}>{String(getValue() ?? "") || "—"}</Highlight></span>;
      },
    },
    {
      id: "dueDate", accessorKey: "dueDate", header: "Due Date",
      cell: ({ getValue }: CellContext<PurchaseRecord, unknown>) => {
        const v = getValue();
        return <span className="whitespace-nowrap text-gray-500 dark:text-dark-300">{v ? formatDateDDMMYYYY(String(v)) : "—"}</span>;
      },
    },
    {
      id: "narration", accessorKey: "narration", header: "Narration",
      cell: ({ getValue }: CellContext<PurchaseRecord, unknown>) => (
        <span className="block max-w-[120px] truncate text-gray-500 dark:text-dark-300">{String(getValue() ?? "") || "—"}</span>
      ),
    },
    {
      id: "totalBasic", accessorKey: "totalBasic", header: "Total Basic",
      cell: ({ getValue }: CellContext<PurchaseRecord, unknown>) => (
        <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200">₹{round2(getValue() ?? 0).toFixed(2)}</span>
      ),
    },
    {
      id: "totalTax", accessorKey: "totalTax", header: "Total Tax",
      cell: ({ getValue }: CellContext<PurchaseRecord, unknown>) => (
        <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">₹{round2(getValue() ?? 0).toFixed(2)}</span>
      ),
    },
    {
      id: "for_", accessorKey: "for_", header: "F+O+R",
      cell: ({ getValue }: CellContext<PurchaseRecord, unknown>) => (
        <span className="tabular-nums text-gray-500 dark:text-dark-300">₹{round2(getValue() ?? 0).toFixed(2)}</span>
      ),
    },
    {
      id: "grandTotal", accessorKey: "grandTotal", header: "Grand Total",
      cell: ({ getValue }: CellContext<PurchaseRecord, unknown>) => (
        <span className="font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{round2(getValue() ?? 0).toFixed(2)}</span>
      ),
    },
    {
      id: "items", header: "Items", size: 80,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<PurchaseRecord, unknown>) => (
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200">{row.original.items.length}</span>
          <Button isIcon variant="flat" className="size-7 rounded-full"
            onClick={() => setSelectedRecord(row.original)} title="View Items">
            <EyeIcon className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filtered, columns,
    state: { globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    getRowId: row => String(row.id),
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <Page title="Purchase Entry">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">Purchase Entry</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">{table.getFilteredRowModel().rows.length}</span>{" "}records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={() => setShowFilter(v => !v)}>
              <FunnelIcon className={clsx("size-4", showFilter && "text-primary")} />
              <span>Filters</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" /><span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={() => window.print()}>
              <PrinterIcon className="size-4" /><span>Print</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={fetchRecords} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /><span>Refresh</span>
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => navigate("/purchase/purchase-entry/new")}>
              <PlusIcon className="size-4" /><span>Add Purchase</span>
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Basic", value: totals.totalBasic, bg: "from-primary-500 to-primary-700",  Icon: ShoppingBagIcon },
            { label: "Total Tax",   value: totals.totalTax,   bg: "from-amber-500 to-amber-600",       Icon: ReceiptRefundIcon },
            { label: "F + O + R",   value: totals.for_,       bg: "from-purple-500 to-purple-700",     Icon: CurrencyRupeeIcon },
            { label: "Grand Total", value: totals.grandTotal, bg: "from-emerald-500 to-emerald-700",   Icon: BanknotesIcon },
          ].map(({ label, value, bg, Icon }) => (
            <div key={label} className={clsx("relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-md", bg)}>
              <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
              <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                <Icon className="size-4 text-white" />
              </div>
              <p className="text-xl font-bold tabular-nums">₹{value.toLocaleString()}</p>
              <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search Bill No, Party, Purchase Bill No…"
          />
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <Combobox
                  label="Payment Terms"
                  data={TERMS_OPTIONS}
                  displayField="label"
                  searchFields={["label"]}
                  value={filterTermsObj}
                  onChange={(item: any) => setFilterTermsObj(item ?? TERMS_OPTIONS[0])}
                  placeholder="All Terms"
                />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading purchase records…" : "No purchase records found."}
        />
      </div>

      <ItemsDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </Page>
  );
}