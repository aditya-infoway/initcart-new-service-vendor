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
  CubeIcon, CurrencyRupeeIcon, EyeIcon, FunnelIcon,
  MagnifyingGlassIcon, PlusIcon, ReceiptRefundIcon,
  ShoppingCartIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Table, THead, TBody, Tr, Th, Td, Card } from "@/components/ui";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ─────────────────────────────────────────────────────────────────
interface SaleItem {
  item: number;
  variant: number;
  itemName: string;
  hsnCode: string;
  qty: string;
  price: string;
  unit: string;
  discountPercent: string;
  taxPercent: string;
  basicAmount: string;
  discountAmount: string;
  taxAmount: string;
  netAmount: string;
  purchasePrice: number;
}

interface SaleRecord {
  id: number;
  billNo: string;
  date: string;
  customerName: string;
  paymentTerms: string;
  narration: string;
  totalBasic: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  dueDate: string | null;
  frightCharge: number;
  otherExpense: number;
  roundAmount: number;
  for_: number;
  items: SaleItem[];
}

function mapApiSale(raw: any): SaleRecord {
  const fright = Number(raw.frightcharge ?? 0);
  const other  = Number(raw.otherexpnse ?? 0);
  const round  = Number(raw.roundamount ?? 0);
  return {
    id:            Number(raw.id ?? 0),
    billNo:        String(raw.bill_no ?? ""),
    date:          String(raw.date ?? ""),
    customerName:  String(raw.customer_name ?? ""),
    paymentTerms:  String(raw.payment_terms ?? ""),
    narration:     String(raw.narration ?? ""),
    totalBasic:    Number(raw.total_basic ?? 0),
    totalDiscount: Number(raw.total_discount ?? 0),
    totalTax:      Number(raw.total_tax ?? 0),
    grandTotal:    Number(raw.grand_total ?? 0),
    dueDate:       raw.dueDate ?? null,
    frightCharge:  fright,
    otherExpense:  other,
    roundAmount:   round,
    for_:          fright + other + round,
    items: Array.isArray(raw.items) ? raw.items.map((i: any) => ({
      item:            Number(i.item ?? 0),
      variant:         Number(i.variant ?? 0),
      itemName:        String(i.item_name ?? ""),
      hsnCode:         String(i.hsn_code ?? ""),
      qty:             String(i.qty ?? "0"),
      price:           String(i.price ?? "0"),
      unit:            String(i.unit ?? "pc"),
      discountPercent: String(i.discount_percent ?? "0"),
      taxPercent:      String(i.tax_percent ?? "0"),
      basicAmount:     String(i.basic_amount ?? "0"),
      discountAmount:  String(i.discount_amount ?? "0"),
      taxAmount:       String(i.tax_amount ?? "0"),
      netAmount:       String(i.net_amount ?? "0"),
      purchasePrice:   Number(i.purchase_price ?? 0),
    })) : [],
  };
}

// ── Items Detail Drawer ────────────────────────────────────────────────────
function ItemsDrawer({ isOpen, onClose, sale }: { isOpen: boolean; onClose: () => void; sale: SaleRecord | null }) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={onClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />

        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[65%] xl:max-w-[55%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-white/20 text-white">
                <ShoppingCartIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Line Items — {sale?.billNo}
                </h3>
                <p className="mt-0.5 text-sm text-white/75">
                  {sale?.customerName} · {formatDateDDMMYYYY(sale?.date ?? "")}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="flat"
              isIcon
              className="size-8 rounded-full text-white hover:bg-white/10"
            >
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="hide-scrollbar grow space-y-4 overflow-y-auto px-5 py-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Total Items", value: sale?.items.length ?? 0, bg: "bg-gradient-to-br from-blue-500 to-blue-700", Icon: CubeIcon },
                { label: "Grand Total", value: `₹${Number(sale?.grandTotal ?? 0).toFixed(2)}`, bg: "bg-gradient-to-br from-primary-500 to-primary-700", Icon: BanknotesIcon },
                { label: "Basic Amount", value: `₹${Number(sale?.totalBasic ?? 0).toFixed(2)}`, bg: "bg-gradient-to-br from-emerald-500 to-emerald-700", Icon: CurrencyRupeeIcon },
              ].map(({ label, value, bg, Icon }) => (
                <div key={label} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bg)}>
                  <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
                  <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                    <Icon className="size-4 text-white" />
                  </div>
                  <p className="text-xl font-bold tabular-nums">{value}</p>
                  <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
                </div>
              ))}
            </div>

            {/* Items table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-600 flex items-center gap-3 bg-gray-50 dark:bg-dark-800">
                <ShoppingCartIcon className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">Line Items</h3>
                <Badge color="primary" variant="soft" className="text-xs font-semibold">
                  {sale?.items.length ?? 0}
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <Table hoverable className="w-full text-left">
                  <THead>
                    <Tr>
                      {["SR","Item Name","HSN","Qty","Price","Per","Disc%","Basic Amt","Disc Amt","Tax Amt","Net Value"].map(h => (
                        <Th key={h} className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                          {h}
                        </Th>
                      ))}
                    </Tr>
                  </THead>
                  <TBody>
                    {!sale?.items.length ? (
                      <Tr>
                        <Td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-400">
                          No items found.
                        </Td>
                      </Tr>
                    ) : sale.items.map((item, i) => (
                      <Tr key={i} className="dark:border-b-dark-500 border-b border-gray-100 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800">
                        <Td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</Td>
                        <Td className="px-4 py-3 font-semibold text-gray-800 dark:text-dark-100">{item.itemName}</Td>
                        <Td className="px-4 py-3 text-xs text-gray-500">{item.hsnCode}</Td>
                        <Td className="px-4 py-3 text-center">
                          <Badge color="info" variant="soft" className="text-xs font-bold">
                            {item.qty}
                          </Badge>
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-semibold text-primary">
                          ₹{Number(item.price).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-center text-xs text-gray-500">{item.unit}</Td>
                        <Td className="px-4 py-3 text-center">
                          <Badge color="warning" variant="soft" className="text-xs">
                            {Number(item.discountPercent).toFixed(2)}%
                          </Badge>
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-semibold text-primary">
                          ₹{Number(item.basicAmount).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono text-gray-500">
                          ₹{Number(item.discountAmount).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-semibold text-amber-600">
                          ₹{Number(item.taxAmount).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-primary">
                          ₹{Number(item.netAmount).toFixed(2)}
                        </Td>
                      </Tr>
                    ))}
                    {(sale?.items.length ?? 0) > 0 && (
                      <Tr className="dark:border-b-dark-500 border-t-2 border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-800">
                        <Td colSpan={7} className="px-4 py-3 text-xs font-bold uppercase text-gray-700 dark:text-dark-100">Total</Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-primary dark:text-primary-400">
                          ₹{sale?.items.reduce((s, i) => s + Number(i.basicAmount), 0).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-gray-500">
                          ₹{sale?.items.reduce((s, i) => s + Number(i.discountAmount), 0).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-amber-600">
                          ₹{sale?.items.reduce((s, i) => s + Number(i.taxAmount), 0).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-primary dark:text-primary-400">
                          ₹{sale?.items.reduce((s, i) => s + Number(i.netAmount), 0).toFixed(2)}
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end border-t border-gray-200 px-5 py-4 dark:border-dark-500">
            <Button variant="outlined" onClick={onClose}>Close</Button>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function SalesRegisterPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterTerms, setFilterTerms] = useState("all");
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/salesentry-list/", { page: 1, page_size: 1000 }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body) ? body : [];
      setRecords(rows.map(mapApiSale));
    } catch {
      toasterrormsg("Failed to fetch sales records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const TERMS_OPTIONS = useMemo(() =>
    ["all", ...Array.from(new Set(records.map(r => r.paymentTerms).filter(Boolean)))],
    [records]);

  const filtered = useMemo(() => {
    if (filterTerms === "all") return records;
    return records.filter(r => r.paymentTerms === filterTerms);
  }, [records, filterTerms]);

  // Summary totals
  const totals = useMemo(() => ({
    totalBasic:    filtered.reduce((s, r) => s + r.totalBasic, 0),
    totalTax:      filtered.reduce((s, r) => s + r.totalTax, 0),
    for_:          filtered.reduce((s, r) => s + r.for_, 0),
    grandTotal:    filtered.reduce((s, r) => s + r.grandTotal, 0),
  }), [filtered]);

  const handleExport = () => {
    const headers = ["SR","Date","Terms","Party Name","Bill No","Due Date","Narration","Total Basic","Total Tax","F+O+R","Grand Total","Items"];
    const rows = filtered.map((r, i) => [
      i + 1, r.date, r.paymentTerms, r.customerName, r.billNo,
      r.dueDate ?? "—", r.narration, r.totalBasic, r.totalTax,
      r.for_, r.grandTotal, r.items.length,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales_register.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnDef<SaleRecord>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SaleRecord, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<SaleRecord, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "paymentTerms", accessorKey: "paymentTerms", header: "Terms",
      cell: ({ getValue }: CellContext<SaleRecord, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <Badge color={v === "Cash" ? "success" : "info"} variant="soft">{v || "—"}</Badge>
        );
      },
    },
    {
      id: "customerName", accessorKey: "customerName", header: "Party Name",
      cell: ({ getValue, table }: CellContext<SaleRecord, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "billNo", accessorKey: "billNo", header: "Bill No",
      cell: ({ getValue, table }: CellContext<SaleRecord, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-primary-600 dark:text-primary-400 whitespace-nowrap">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "dueDate", accessorKey: "dueDate", header: "Due Date",
      cell: ({ getValue }: CellContext<SaleRecord, unknown>) => {
        const v = getValue();
        return (
          <span className="whitespace-nowrap text-gray-500 dark:text-dark-300">
            {v ? formatDateDDMMYYYY(String(v)) : "—"}
          </span>
        );
      },
    },
    {
      id: "narration", accessorKey: "narration", header: "Narration",
      cell: ({ getValue }: CellContext<SaleRecord, unknown>) => (
        <span className="max-w-[120px] truncate block text-gray-500 dark:text-dark-300">
          {String(getValue() ?? "") || "—"}
        </span>
      ),
    },
    {
      id: "totalBasic", accessorKey: "totalBasic", header: "Total Basic",
      cell: ({ getValue }: CellContext<SaleRecord, unknown>) => (
        <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "totalTax", accessorKey: "totalTax", header: "Total Tax",
      cell: ({ getValue }: CellContext<SaleRecord, unknown>) => (
        <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "for_", accessorKey: "for_", header: "F+O+R",
      cell: ({ getValue }: CellContext<SaleRecord, unknown>) => (
        <span className="tabular-nums text-gray-500 dark:text-dark-300">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "grandTotal", accessorKey: "grandTotal", header: "Grand Total",
      cell: ({ getValue }: CellContext<SaleRecord, unknown>) => (
        <span className="font-bold tabular-nums text-primary-600 dark:text-primary-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "items", header: "Items", size: 80, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SaleRecord, unknown>) => (
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200">
            {row.original.items.length}
          </span>
          <Button isIcon variant="flat" className="size-7 rounded-full"
            onClick={() => setSelectedSale(row.original)} title="View Items">
            <EyeIcon className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
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
    <Page title="Sales Entry Report">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Sales Entry Report
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span> records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => setShowFilter(v => !v)}>
              <FunnelIcon className={clsx("size-4", showFilter && "text-primary")} />
              <span>Filters</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" />
              <span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchSales} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => navigate("/sales/sales-entry-report/new")}>
              <PlusIcon className="size-4" />
              <span>Add Sales</span>
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Basic",    value: totals.totalBasic, bg: "bg-gradient-to-br from-primary-500 to-primary-700",   Icon: ShoppingCartIcon },
            { label: "Total Tax",      value: totals.totalTax,   bg: "bg-gradient-to-br from-amber-500 to-amber-600",        Icon: ReceiptRefundIcon },
            { label: "F + O + R",      value: totals.for_,       bg: "bg-gradient-to-br from-purple-500 to-purple-700",      Icon: CurrencyRupeeIcon },
            { label: "Grand Total",    value: totals.grandTotal, bg: "bg-gradient-to-br from-emerald-500 to-emerald-700",    Icon: BanknotesIcon },
          ].map(({ label, value, bg, Icon }) => (
            <div key={label} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bg)}>
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
            placeholder="Search bill no, party, narration..." />
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Payment Terms
              </p>
              <div className="flex flex-wrap gap-2">
                {TERMS_OPTIONS.map(t => (
                  <button key={t} onClick={() => setFilterTerms(t)}
                    className={clsx("rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
                      filterTerms === t
                        ? "bg-primary text-white"
                        : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200")}>
                    {t === "all" ? "All Terms" : t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MasterTable */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading sales records..." : "No sales records found."}
        />
      </div>

      {/* Items Detail Drawer */}
      <ItemsDrawer isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} sale={selectedSale} />
    </Page>
  );
}
