import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon, BanknotesIcon,
  ExclamationTriangleIcon, FunnelIcon,
  MagnifyingGlassIcon, PrinterIcon,
  ReceiptRefundIcon, ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Switch } from "@/components/ui";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
interface DueSummary {
  totalBills: number;
  totalPendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  reportDate: string;
}

interface DueBill {
  id: number;
  type: string;
  typeLabel: string;
  dueDate: string;
  billDate: string;
  partyName: string;
  partyId: number;
  billNumber: string;
  purchaseBillNumber: string | null;
  itemCount: number;
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  daysOverdue: number;
  isOverdue: boolean;
}

function mapSummary(raw: any): DueSummary {
  return {
    totalBills:         Number(raw.total_bills          ?? 0),
    totalPendingAmount: Number(raw.total_pending_amount ?? 0),
    overdueCount:       Number(raw.overdue_count        ?? 0),
    overdueAmount:      Number(raw.overdue_amount       ?? 0),
    reportDate:         String(raw.report_date          ?? ""),
  };
}

function mapBill(raw: any): DueBill {
  return {
    id:                  Number(raw.id                   ?? 0),
    type:                String(raw.type                 ?? ""),
    typeLabel:           String(raw.type_label           ?? raw.type ?? ""),
    dueDate:             String(raw.due_date             ?? ""),
    billDate:            String(raw.bill_date            ?? ""),
    partyName:           String(raw.party_name           ?? ""),
    partyId:             Number(raw.party_id             ?? 0),
    billNumber:          String(raw.bill_number          ?? ""),
    purchaseBillNumber:  raw.purchase_bill_number        ?? null,
    itemCount:           Number(raw.item_count           ?? 0),
    totalAmount:         Number(raw.total_amount         ?? 0),
    receivedAmount:      Number(raw.received_amount      ?? 0),
    pendingAmount:       Number(raw.pending_amount       ?? 0),
    daysOverdue:         Number(raw.days_overdue         ?? 0),
    isOverdue:           Boolean(raw.is_overdue),
  };
}

const DEFAULT_SUMMARY: DueSummary = {
  totalBills: 0, totalPendingAmount: 0,
  overdueCount: 0, overdueAmount: 0, reportDate: "",
};

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ bill }: { bill: DueBill }) {
  if (bill.isOverdue) {
    return (
      <Badge color="error" variant="soft" className="whitespace-nowrap">
        Overdue {bill.daysOverdue > 0 ? `(${bill.daysOverdue}d)` : ""}
      </Badge>
    );
  }
  if (bill.pendingAmount <= 0) {
    return <Badge color="success" variant="soft">Paid</Badge>;
  }
  return <Badge color="warning" variant="soft">Due</Badge>;
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DuePaymentPage() {
  const [bills, setBills]               = useState<DueBill[]>([]);
  const [summary, setSummary]           = useState<DueSummary>(DEFAULT_SUMMARY);
  const [loading, setLoading]           = useState(true);
  const [overdueOnly, setOverdueOnly]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([{ id: "dueDate", desc: false }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter]     = useState(false);
  const [filterType, setFilterType]     = useState("all");

  // ── Fetch — re-runs whenever overdueOnly changes ───────────────────────
  const fetchData = useCallback(async (onlyOverdue: boolean) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (onlyOverdue) params.overdue_only = true;

      const res  = await Get("pos/due-payment-report/", params) as any;
      const body = res?.data ?? res;

      setSummary(mapSummary(body?.summary ?? {}));
      const rows: any[] = Array.isArray(body?.bills) ? body.bills : [];
      setBills(rows.map(mapBill));
    } catch {
      toasterrormsg("Failed to fetch due payment report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(overdueOnly); }, [fetchData, overdueOnly]);

  // ── Toggle handler ─────────────────────────────────────────────────────
  const handleOverdueToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOverdueOnly(e.target.checked);
  };

  // ── Local filters ──────────────────────────────────────────────────────
  const TYPE_OPTIONS = useMemo(() =>
    ["all", ...Array.from(new Set(bills.map(b => b.type).filter(Boolean)))],
    [bills]);

  const filtered = useMemo(() => {
    if (filterType === "all") return bills;
    return bills.filter(b => b.type === filterType);
  }, [bills, filterType]);

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["#","Due Date","Bill Date","Type","Party Name","Bill No","Supplier Bill","Items","Total","Received","Pending","Status"];
    const rows = filtered.map((b, i) => [
      i + 1,
      b.dueDate, b.billDate, b.typeLabel, b.partyName,
      b.billNumber, b.purchaseBillNumber ?? "—",
      b.itemCount,
      b.totalAmount, b.receivedAmount, b.pendingAmount,
      b.isOverdue ? `Overdue(${b.daysOverdue}d)` : b.pendingAmount <= 0 ? "Paid" : "Due",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "due_payment_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<DueBill>[]>(() => [
    {
      id: "srNo", header: "#", size: 50,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<DueBill, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "dueDate", accessorKey: "dueDate", header: "Due Date",
      cell: ({ getValue, row }: CellContext<DueBill, unknown>) => (
        <span className={clsx(
          "whitespace-nowrap font-medium",
          row.original.isOverdue
            ? "text-error-600 dark:text-error-400"
            : "text-gray-700 dark:text-dark-200",
        )}>
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "billDate", accessorKey: "billDate", header: "Bill Date",
      cell: ({ getValue }: CellContext<DueBill, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "typeLabel", accessorKey: "typeLabel", header: "Type",
      cell: ({ getValue }: CellContext<DueBill, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <Badge
            color={v.toLowerCase().includes("purchase") ? "info" : "primary"}
            variant="soft"
          >
            {v || "—"}
          </Badge>
        );
      },
    },
    {
      id: "partyName", accessorKey: "partyName", header: "Party Name",
      cell: ({ getValue, table }: CellContext<DueBill, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "billNumber", accessorKey: "billNumber", header: "Bill No.",
      cell: ({ getValue, table }: CellContext<DueBill, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap font-medium text-primary-600 dark:text-primary-400">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "purchaseBillNumber", accessorKey: "purchaseBillNumber", header: "Supplier Bill",
      cell: ({ getValue }: CellContext<DueBill, unknown>) => {
        const v = getValue();
        return (
          <span className=" text-xs text-gray-500 dark:text-dark-300">
            {v ? String(v) : "—"}
          </span>
        );
      },
    },
    {
      id: "itemCount", accessorKey: "itemCount", header: "Items",
      cell: ({ getValue }: CellContext<DueBill, unknown>) => (
        <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200 text-center block">
          {Number(getValue() ?? 0)}
        </span>
      ),
    },
    {
      id: "totalAmount", accessorKey: "totalAmount", header: "Total",
      cell: ({ getValue }: CellContext<DueBill, unknown>) => (
        <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "receivedAmount", accessorKey: "receivedAmount", header: "Received",
      cell: ({ getValue }: CellContext<DueBill, unknown>) => (
        <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "pendingAmount", accessorKey: "pendingAmount", header: "Pending",
      cell: ({ getValue }: CellContext<DueBill, unknown>) => (
        <span className="font-bold tabular-nums text-error-600 dark:text-error-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "status", header: "Status", enableSorting: true,
      accessorFn: (row) => row.isOverdue ? 0 : row.pendingAmount <= 0 ? 2 : 1,
      cell: ({ row }: CellContext<DueBill, unknown>) => (
        <StatusBadge bill={row.original} />
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

  // Derived totals from filtered+searched rows
  const visibleRows    = table.getFilteredRowModel().rows;
  const totalReceived  = visibleRows.reduce((s, r) => s + r.original.receivedAmount, 0);

  return (
    <Page title="Due Payment Report">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Due Payment Report
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* ── Overdue Only toggle ───────────────── */}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition-colors hover:border-error-400 dark:border-dark-500 dark:bg-dark-700">
              <Switch
                color="error"
                checked={overdueOnly}
                onChange={handleOverdueToggle}
                disabled={loading}
              />
              <span className={clsx(
                "text-sm font-medium select-none",
                overdueOnly
                  ? "text-error-600 dark:text-error-400"
                  : "text-gray-600 dark:text-dark-200",
              )}>
                {overdueOnly ? "Overdue Only" : "All Bills"}
              </span>
              {overdueOnly && (
                <ExclamationTriangleIcon className="size-4 text-error-500" />
              )}
            </label>

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
              onClick={handlePrint}>
              <PrinterIcon className="size-4" />
              <span>Print</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => fetchData(overdueOnly)} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ── Summary cards ─────────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Total Bills */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <ShoppingCartIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">{summary.totalBills}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Bills</p>
          </div>

          {/* Total Amount */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{summary.totalPendingAmount.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Amount</p>
          </div>

          {/* Total Received */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <ReceiptRefundIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{totalReceived.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Received</p>
          </div>

          {/* Total Pending */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{summary.totalPendingAmount.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Pending</p>
          </div>

          {/* Overdue Bills */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <ExclamationTriangleIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">{summary.overdueCount}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Overdue Bills</p>
          </div>

          {/* Overdue Amount */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-600 to-red-800 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <ExclamationTriangleIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{summary.overdueAmount.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Overdue Amount</p>
          </div>
        </div>

        {/* ── Search ────────────────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search by party name, bill no…"
          />
        </div>

        {/* ── Filter panel ──────────────────────────────────────────────── */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Bill Type
              </p>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                      filterType === t
                        ? "bg-primary text-white"
                        : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200",
                    )}
                  >
                    {t === "all" ? "All Types" : t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Overdue banner (when toggle is on) ───────────────────────── */}
        {overdueOnly && (
          <div className="px-(--margin-x) mt-3">
            <div className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 dark:border-error-900/40 dark:bg-error-900/20">
              <ExclamationTriangleIcon className="size-4 shrink-0 text-error-600 dark:text-error-400" />
              <p className="text-sm text-error-700 dark:text-error-300">
                Showing overdue bills only —{" "}
                <span className="font-semibold">{summary.overdueCount} bills</span>{" "}
                totalling{" "}
                <span className="font-semibold">₹{summary.overdueAmount.toLocaleString()}</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={
            loading
              ? "Loading due payment records…"
              : overdueOnly
                ? "No overdue bills found."
                : "No due payment records found."
          }
        />
      </div>
    </Page>
  );
}
