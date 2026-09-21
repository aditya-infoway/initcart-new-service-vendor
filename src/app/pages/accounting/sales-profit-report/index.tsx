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
  MagnifyingGlassIcon, ReceiptRefundIcon,
  ShoppingCartIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Button, Card, Input, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import { SalesBill, SalesBillLineItem, mapApiBill } from "./data";

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ bill, onClose }: { bill: SalesBill | null; onClose: () => void }) {
  const totals = useMemo(() => ({
    netAmount: bill?.lineItems.reduce((s, l) => s + l.netAmount, 0) ?? 0,
    salesNet: bill?.lineItems.reduce((s, l) => s + l.salesNet, 0) ?? 0,
    purchaseCost: bill?.lineItems.reduce((s, l) => s + l.purchaseCost, 0) ?? 0,
    lineProfit: bill?.lineItems.reduce((s, l) => s + l.lineProfit, 0) ?? 0,
  }), [bill]);

  return (
    <Transition appear show={!!bill} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>

        {/* Backdrop */}
        <TransitionChild
          as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />

        {/* Drawer panel — slides in from the right */}
        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full" enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0" leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[80%] xl:max-w-[72%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between bg-primary px-5 py-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Line Items — {bill?.billNo}
              </h3>
              <p className="mt-0.5 text-xs text-white/70">
                {bill?.customerName} · {formatDateDDMMYYYY(bill?.billDate ?? "")} · {bill?.terms}
              </p>
            </div>

            <Button onClick={onClose} variant="flat" isIcon
              className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>



          {/* Scrollable body */}
          <div className="hide-scrollbar grow overflow-y-auto">
            <div className="px-5 py-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  label: "BILL AMOUNT",
                  value: bill?.billAmount ?? 0,
                  bg: "from-primary-500 to-primary-700",
                },
                {
                  label: "PURCHASE COST",
                  value: bill?.purchaseCost ?? 0,
                  bg: "from-rose-500 to-rose-700",
                },
                {
                  label: "PROFIT",
                  value: bill?.profit ?? 0,
                  bg: "from-emerald-500 to-emerald-700",
                  pct: bill?.profitPercent,
                },
              ].map(({ label, value, bg, pct }) => (
                <div
                  key={label}
                  className={clsx(
                    "relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-md",
                    bg
                  )}
                >
                  <div className="pointer-events-none absolute -right-2 -top-2 size-12 rounded-full bg-white/10" />

                  <p className="text-lg font-bold tabular-nums">
                    ₹
                    {Number(value).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}

                    {pct != null && (
                      <span className="ml-1 text-xs font-normal">
                        ({Number(pct).toFixed(1)}%)
                      </span>
                    )}
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-white/80">
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto px-5">

              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    {["SR", "Item Name", "HSN", "Qty", "Sale Price", "Per", "Disc%", "Tax%", "Net Amount", "Sales Net", "Purchase Price", "Purchase Cost", "Line Profit"].map(h => (
                      <Th key={h} className="bg-gray-100 dark:bg-dark-800 text-xs font-semibold uppercase text-gray-600 dark:text-dark-100 whitespace-nowrap">
                        {h}
                      </Th>
                    ))}
                  </Tr>
                </THead>
                <TBody>
                  {!bill?.lineItems.length ? (
                    <Tr>
                      <Td colSpan={13} className="py-10 text-center text-sm text-gray-400">
                        No line items available.
                      </Td>
                    </Tr>
                  ) : bill.lineItems.map((l, i) => (
                    <Tr key={l.id ?? i} className="border-b border-gray-200 dark:border-dark-500">
                      <Td className="text-gray-400">{i + 1}</Td>
                      <Td className="font-medium text-gray-800 dark:text-dark-100 whitespace-nowrap">{l.itemName}</Td>
                      <Td className="text-xs text-gray-500">{l.hsn}</Td>
                      <Td className="text-center font-semibold text-gray-800 dark:text-dark-100">{l.qty}</Td>
                      <Td className="font-semibold tabular-nums text-gray-800 dark:text-dark-100">₹{l.salePrice.toFixed(2)}</Td>
                      <Td className="text-gray-500">{l.per}</Td>
                      <Td className="text-gray-500">{l.discPercent}%</Td>
                      <Td className="font-medium text-amber-600">{l.taxPercent}%</Td>
                      <Td className="font-semibold tabular-nums text-primary-600 dark:text-primary-400">₹{l.netAmount.toFixed(2)}</Td>
                      <Td className="font-semibold tabular-nums text-primary-600 dark:text-primary-400">₹{l.salesNet.toFixed(2)}</Td>
                      <Td className="font-medium tabular-nums text-amber-600">₹{l.purchasePrice.toFixed(2)}</Td>
                      <Td className="font-medium tabular-nums text-amber-600">₹{l.purchaseCost.toFixed(2)}</Td>
                      <Td className={clsx("font-bold tabular-nums",
                        l.lineProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {l.lineProfit >= 0 ? "+" : ""}₹{l.lineProfit.toFixed(2)}
                      </Td>
                    </Tr>
                  ))}
                </TBody>

                {/* Totals footer */}
                {(bill?.lineItems.length ?? 0) > 0 && (
                  <TBody>
                    <Tr className="border-t-2 border-gray-300 dark:border-dark-500">
                      <Td colSpan={8} className="bg-gray-50 dark:bg-dark-800 text-xs font-bold uppercase text-gray-600 dark:text-dark-200">
                        TOTAL
                      </Td>
                      <Td className="bg-gray-50 dark:bg-dark-800 font-bold tabular-nums text-primary-600 dark:text-primary-400">
                        ₹{totals.netAmount.toFixed(2)}
                      </Td>
                      <Td className="bg-gray-50 dark:bg-dark-800 font-bold tabular-nums text-primary-600 dark:text-primary-400">
                        ₹{totals.salesNet.toFixed(2)}
                      </Td>
                      <Td className="bg-gray-50 dark:bg-dark-800" />
                      <Td className="bg-gray-50 dark:bg-dark-800 font-bold tabular-nums text-amber-600">
                        ₹{totals.purchaseCost.toFixed(2)}
                      </Td>
                      <Td className={clsx("bg-gray-50 dark:bg-dark-800 font-bold tabular-nums",
                        totals.lineProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {totals.lineProfit >= 0 ? "+" : ""}₹{totals.lineProfit.toFixed(2)}
                      </Td>
                    </Tr>
                  </TBody>
                )}
              </Table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 justify-end border-t border-gray-200 px-5 py-4 dark:border-dark-600">
            <Button variant="outlined" className="px-8" onClick={onClose}>Close</Button>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SalesProfitReportPage() {
  const [bills, setBills] = useState<SalesBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterTerms, setFilterTerms] = useState("all");
  const [selectedBill, setSelectedBill] = useState<SalesBill | null>(null);
  const [summaryFromApi, setSummaryFromApi] = useState(false);
  const [summary, setSummary] = useState({ billAmount: 0, salesNet: 0, purchaseCost: 0, profit: 0 });

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/sales-bill-wise-profit/", { page: 1, page_size: 1000 }) as any;
      const body = res?.data ?? res;
      // API: { count, results: { success, summary, data: [...] } }
      const rows: any[] = Array.isArray(body?.results?.data) ? body.results.data
        : Array.isArray(body?.results) ? body.results
          : Array.isArray(body?.data) ? body.data
            : Array.isArray(body) ? body : [];
      // Use API summary if available
      const summary = body?.results?.summary;
      if (summary) {
        setSummary({
          billAmount: Number(summary.total_sales_amount ?? 0),
          salesNet: Number(summary.total_sales_net ?? 0),
          purchaseCost: Number(summary.total_purchase_cost ?? 0),
          profit: Number(summary.total_profit ?? 0),
        });
        setSummaryFromApi(true);
      } else {
        setSummaryFromApi(false);
      }
      setBills(rows.map(mapApiBill));
    } catch {
      toasterrormsg("Failed to fetch sales profit report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const terms = useMemo(() =>
    ["all", ...Array.from(new Set(bills.map(b => b.terms).filter(Boolean)))],
    [bills]);

  const filtered = useMemo(() => {
    if (filterTerms === "all") return bills;
    return bills.filter(b => b.terms === filterTerms);
  }, [bills, filterTerms]);

  const totals = useMemo(() => summaryFromApi ? summary : ({
    billAmount: filtered.reduce((s, b) => s + b.billAmount, 0),
    salesNet: filtered.reduce((s, b) => s + b.salesNet, 0),
    purchaseCost: filtered.reduce((s, b) => s + b.purchaseCost, 0),
    profit: filtered.reduce((s, b) => s + b.profit, 0),
  }), [filtered, summary, summaryFromApi]);

  const handleExport = () => {
    const headers = ["SR", "Bill No", "Bill Date", "Customer", "Items", "Bill Amount", "Sales Net", "Purchase Cost", "Profit", "Profit %", "Terms", "GST Type"];
    const rows = filtered.map((b, i) => [
      i + 1, b.billNo, b.billDate, b.customerName, b.items,
      b.billAmount, b.salesNet, b.purchaseCost, b.profit,
      `${b.profitPercent.toFixed(1)}%`, b.terms, b.gstType,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales_profit_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnDef<SalesBill>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SalesBill, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "billNo", accessorKey: "billNo", header: "Bill No",
      cell: ({ getValue, table }: CellContext<SalesBill, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "billDate", accessorKey: "billDate", header: "Bill Date",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "customerName", accessorKey: "customerName", header: "Customer Name",
      cell: ({ getValue, table }: CellContext<SalesBill, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "items", accessorKey: "items", header: "Items",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => (
        <span className="text-center font-medium tabular-nums text-gray-700 dark:text-dark-200">
          {String(getValue() ?? "0")}
        </span>
      ),
    },
    {
      id: "billAmount", accessorKey: "billAmount", header: "Bill Amount",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => (
        <span className="font-semibold tabular-nums text-gray-800 dark:text-dark-100">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "salesNet", accessorKey: "salesNet", header: "Sales Net",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => (
        <span className="font-medium tabular-nums text-primary-600 dark:text-primary-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "purchaseCost", accessorKey: "purchaseCost", header: "Purchase Cost",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => (
        <span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "profit", accessorKey: "profit", header: "Profit",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className={clsx("font-bold tabular-nums",
            v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {v >= 0 ? "+" : ""}₹{v.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "profitPercent", accessorKey: "profitPercent", header: "Profit %",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
            v >= 0
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400")}>
            {v.toFixed(1)}%
          </span>
        );
      },
    },
    {
      id: "terms", accessorKey: "terms", header: "Terms",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold",
            v === "Cash"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300")}>
            {v || "—"}
          </span>
        );
      },
    },
    {
      id: "gstType", accessorKey: "gstType", header: "GST Type",
      cell: ({ getValue }: CellContext<SalesBill, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{String(getValue() ?? "—") || "—"}</span>
      ),
    },
    {
      id: "actions", header: "Detail", size: 70, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SalesBill, unknown>) => (
        <div className="flex justify-center">
          <Button isIcon variant="flat" className="size-8 rounded-full"
            onClick={() => setSelectedBill(row.original)} title="View Detail">
            <EyeIcon className="size-4" />
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
    <Page title="Sales Bill Wise Profit Report">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Sales Bill Wise Profit Report
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">{filtered.length}</span> bills
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
              onClick={fetchBills} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Sales (Bill Amt)", value: totals.billAmount, bg: "bg-gradient-to-br from-primary-500 to-primary-700", Icon: ShoppingCartIcon },
            { label: "Sales Net (Excl. GST)", value: totals.salesNet, bg: "bg-gradient-to-br from-blue-500 to-blue-700", Icon: CurrencyRupeeIcon },
            { label: "Purchase Cost", value: totals.purchaseCost, bg: "bg-gradient-to-br from-amber-500 to-amber-600", Icon: ReceiptRefundIcon },
            {
              label: "Total Profit", value: totals.profit, bg: totals.profit >= 0
                ? "bg-gradient-to-br from-emerald-500 to-emerald-700"
                : "bg-gradient-to-br from-red-500 to-red-700", Icon: BanknotesIcon
            },
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
            placeholder="Search bill no, customer..." />
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Payment Terms
              </p>
              <div className="flex flex-wrap gap-2">
                {terms.map(t => (
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
          emptyMessage={loading ? "Loading sales profit report..." : "No bills found."}
        />
      </div>

      {/* Detail Drawer */}
      <DetailDrawer bill={selectedBill} onClose={() => setSelectedBill(null)} />
    </Page>
  );
}
