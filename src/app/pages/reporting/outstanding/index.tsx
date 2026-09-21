import { WithIcon, type TabItem } from "@/components/ui/Tab";
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon, BanknotesIcon,
  CurrencyRupeeIcon, FunnelIcon, MagnifyingGlassIcon,
  PrinterIcon, ReceiptRefundIcon, ShoppingCartIcon, HomeIcon, ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Button, Input } from "@/components/ui";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ────────────────────────────────────────────────────────────────────
interface OutstandingRow {
  id: number;
  date: string;
  billNo: string;
  partyName: string;
  terms: string;
  items: number;
  taxableValue: number;
  tax: number;
  grandTotal: number;
  received: number;
  pending: number;
}

interface Summary {
  totalBills: number;
  totalGrand: number;
  totalReceived: number;
  totalPending: number;
}

function mapRow(raw: any): OutstandingRow {
  return {
    id:           Number(raw.id ?? 0),
    date:         String(raw.date ?? ""),
    billNo:       String(raw.bill_no ?? ""),
    partyName:    String(raw.party_name ?? ""),
    terms:        String(raw.terms ?? ""),
    items:        Number(raw.no_of_items ?? raw.items ?? 0),
    taxableValue: Number(raw.total_taxable ?? raw.taxable_value ?? 0),
    tax:          Number(raw.tax ?? 0),
    grandTotal:   Number(raw.grand_total ?? 0),
    received:     Number(raw.received ?? raw.paid ?? 0),
    pending:      Number(raw.pending ?? 0),
  };
}

// ── Columns factory ──────────────────────────────────────────────────────────
function makeColumns(label: "Received" | "Paid"): ColumnDef<OutstandingRow>[] {
  return [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<OutstandingRow, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<OutstandingRow, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "billNo", accessorKey: "billNo", header: "Bill No.",
      cell: ({ getValue, table }: CellContext<OutstandingRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-primary-600 dark:text-primary-400 whitespace-nowrap">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "partyName", accessorKey: "partyName", header: "Party Name",
      cell: ({ getValue, table }: CellContext<OutstandingRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "terms", accessorKey: "terms", header: "Terms",
      cell: ({ getValue }: CellContext<OutstandingRow, unknown>) => {
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
      id: "items", accessorKey: "items", header: "Items",
      cell: ({ getValue }: CellContext<OutstandingRow, unknown>) => (
        <span className="text-center font-medium tabular-nums text-gray-700 dark:text-dark-200">
          {String(getValue() ?? "0")}
        </span>
      ),
    },
    {
      id: "taxableValue", accessorKey: "taxableValue", header: "Taxable Value",
      cell: ({ getValue }: CellContext<OutstandingRow, unknown>) => (
        <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "tax", accessorKey: "tax", header: "Tax",
      cell: ({ getValue }: CellContext<OutstandingRow, unknown>) => (
        <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "grandTotal", accessorKey: "grandTotal", header: "Grand Total",
      cell: ({ getValue }: CellContext<OutstandingRow, unknown>) => (
        <span className="font-bold tabular-nums text-gray-800 dark:text-dark-100">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "received", accessorKey: "received", header: label,
      cell: ({ getValue }: CellContext<OutstandingRow, unknown>) => (
        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "pending", accessorKey: "pending", header: "Pending",
      cell: ({ getValue }: CellContext<OutstandingRow, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className={clsx("font-bold tabular-nums rounded-full px-2.5 py-0.5 text-xs",
            v > 0
              ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400")}>
            ₹{v.toFixed(2)}
          </span>
        );
      },
    },
  ];
}

// ── Sub-table component ──────────────────────────────────────────────────────
function OutstandingTable({
  data, loading, label, summary,
}: {
  data: OutstandingRow[];
  loading: boolean;
  label: "Received" | "Paid";
  summary: Summary;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterTerms, setFilterTerms] = useState("all");

  const terms = useMemo(() =>
    ["all", ...Array.from(new Set(data.map(r => r.terms).filter(Boolean)))],
    [data]);

  const filtered = useMemo(() => {
    if (filterTerms === "all") return data;
    return data.filter(r => r.terms === filterTerms);
  }, [data, filterTerms]);

  const columns = useMemo(() => makeColumns(label), [label]);

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
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total Bills",    value: summary.totalBills,    bg: "bg-gradient-to-br from-primary-500 to-primary-700",   Icon: ShoppingCartIcon,  isCurrency: false },
          { label: "Grand Total",    value: summary.totalGrand,    bg: "bg-gradient-to-br from-blue-500 to-blue-700",          Icon: CurrencyRupeeIcon, isCurrency: true },
          { label: label === "Received" ? "Received" : "Paid",
                                     value: summary.totalReceived, bg: "bg-gradient-to-br from-emerald-500 to-emerald-700",    Icon: BanknotesIcon,     isCurrency: true },
          { label: "Pending",        value: summary.totalPending,  bg: "bg-gradient-to-br from-red-500 to-red-700",            Icon: ReceiptRefundIcon, isCurrency: true },
        ].map(({ label: lbl, value, bg, Icon, isCurrency }) => (
          <div key={lbl} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bg)}>
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <Icon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">
              {isCurrency ? `₹${Number(value).toLocaleString()}` : value}
            </p>
            <p className="mt-0.5 text-xs font-medium text-white/80">{lbl}</p>
          </div>
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-dark-300">
          <span className="font-semibold text-gray-800 dark:text-dark-100">
            {table.getFilteredRowModel().rows.length}
          </span> records
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
            onClick={() => setShowFilter(v => !v)}>
            <FunnelIcon className={clsx("size-4", showFilter && "text-primary")} />
            <span>Filters</span>
          </Button>
          <div className="w-56">
            <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4" />}
              classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
              placeholder="Search bill, party..." />
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilter && (
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
      )}

      {/* Table */}
      <MasterTable
        table={table}
        columnCount={columns.length}
        emptyMessage={loading ? "Loading..." : "No records found."}
      />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function OutstandingReportPage() {
  const [receivable, setReceivable] = useState<OutstandingRow[]>([]);
  const [payable, setPayable] = useState<OutstandingRow[]>([]);
  const [receivableSummary, setReceivableSummary] = useState<Summary>({ totalBills: 0, totalGrand: 0, totalReceived: 0, totalPending: 0 });
  const [payableSummary, setPayableSummary] = useState<Summary>({ totalBills: 0, totalGrand: 0, totalReceived: 0, totalPending: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/outstanding-report/", { type: "both" }) as any;
      const body = res?.data ?? res;

      setReceivable(Array.isArray(body?.receivable) ? body.receivable.map(mapRow) : []);
      setPayable(Array.isArray(body?.payable) ? body.payable.map(mapRow) : []);

      const rs = body?.receivable_summary ?? {};
      setReceivableSummary({
        totalBills:    Number(rs.total_bills ?? 0),
        totalGrand:    Number(rs.total_grand ?? 0),
        totalReceived: Number(rs.total_received ?? 0),
        totalPending:  Number(rs.total_pending ?? 0),
      });

      const ps = body?.payable_summary ?? {};
      setPayableSummary({
        totalBills:    Number(ps.total_bills ?? 0),
        totalGrand:    Number(ps.total_grand ?? 0),
        totalReceived: Number(ps.total_paid ?? ps.total_received ?? 0),
        totalPending:  Number(ps.total_pending ?? 0),
      });
    } catch {
      toasterrormsg("Failed to fetch outstanding report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const data = activeTab === 0 ? receivable : payable;
    const headers = ["SR","Date","Bill No","Party Name","Terms","Items","Taxable Value","Tax","Grand Total","Received","Pending"];
    const rows = data.map((r, i) => [
      i + 1, r.date, r.billNo, r.partyName, r.terms, r.items,
      r.taxableValue, r.tax, r.grandTotal, r.received, r.pending,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outstanding_${activeTab === 0 ? "receivable" : "payable"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Page title="Outstanding Report">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-4">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Outstanding Report
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {activeTab === 0 ? receivable.length : payable.length}
              </span> records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" />
              <span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => window.print()}>
              <PrinterIcon className="size-4 text-gray-500" />
              <span>Print</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchData} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-(--margin-x)">
          <WithIcon
            tabs={[
              {
                id: "receivable",
                title: `Receivable (${receivable.length})`,
                icon: BanknotesIcon,
                content: (
                  <OutstandingTable
                    data={receivable}
                    loading={loading}
                    label="Received"
                    summary={receivableSummary}
                  />
                ),
              },
              {
                id: "payable",
                title: `Payable (${payable.length})`,
                icon: ArrowUpRightIcon,
                content: (
                  <OutstandingTable
                    data={payable}
                    loading={loading}
                    label="Paid"
                    summary={payableSummary}
                  />
                ),
              },
            ]}
            selectedIndex={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>
    </Page>
  );
}
