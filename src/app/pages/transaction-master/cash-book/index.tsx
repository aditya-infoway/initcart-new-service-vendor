import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon, BanknotesIcon,
  MagnifyingGlassIcon, PrinterIcon, FunnelIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
type EntryType = "payment" | "receipt";

interface CashEntry {
  uid: string;
  id: number;
  date: string;
  createdAt: string;
  voucherNo: string;
  type: string;
  accountName: string;
  partyName: string;
  amount: number;   // positive = receipt, negative = payment
  narration: string;
  entryType: EntryType;
}

function extractRows(res: any): any[] {
  const body = res?.data ?? res;
  return Array.isArray(body?.results) ? body.results
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body) ? body : [];
}

function mapPayment(r: any): CashEntry {
  return {
    uid:         `cp-${r.id}`,
    id:          Number(r.id ?? 0),
    date:        String(r.date ?? ""),
    createdAt:   String(r.created_at ?? r.date ?? ""),
    voucherNo:   String(r.voucher_no ?? ""),
    type:        String(r.type ?? "CP"),
    accountName: String(r.cash_account_name ?? r.cash_account ?? "—"),
    partyName:   String(r.party_name ?? r.op_account ?? "—"),
    amount:      -Math.abs(Number(r.amount ?? 0)),
    narration:   String(r.narration ?? ""),
    entryType:   "payment",
  };
}

function mapReceipt(r: any): CashEntry {
  return {
    uid:         `cr-${r.id}`,
    id:          Number(r.id ?? 0),
    date:        String(r.date ?? ""),
    createdAt:   String(r.created_at ?? r.date ?? ""),
    voucherNo:   String(r.voucher_no ?? ""),
    type:        String(r.type ?? "CR"),
    accountName: String(r.cash_account_name ?? r.cash_account ?? "—"),
    partyName:   String(r.party_name ?? r.op_account ?? "—"),
    amount:      Math.abs(Number(r.amount ?? 0)),
    narration:   String(r.narration ?? ""),
    entryType:   "receipt",
  };
}

// ── Type badge colour map ──────────────────────────────────────────────────
const TYPE_COLOR: Record<string, "success" | "warning" | "error" | "info"> = {
  CR: "success", SCR: "success", PRCR: "success",
  CP: "error",   PCP: "warning", SRCP: "warning",
};
function TypeBadge({ type }: { type: string }) {
  return (
    <Badge color={TYPE_COLOR[type.toUpperCase()] ?? "primary"} variant="soft" className="text-xs">
      {type}
    </Badge>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CashBookPage() {
  const [allEntries, setAllEntries]     = useState<CashEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters]   = useState(false);

  // Filter state
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [filterType, setFilterType]     = useState<{ label: string; value: string } | null>(null);
  const [filterAccount, setFilterAccount] = useState("");

  // ── Fetch cash-payments + cash-receipts in parallel ────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cpRes, crRes] = await Promise.all([
        Get("pos/cash-payments/",  { page: 1, page_size: 1000 }),
        Get("pos/cash-receipts/",  { page: 1, page_size: 1000 }),
      ]) as any[];

      const all: CashEntry[] = [
        ...extractRows(cpRes).map(mapPayment),
        ...extractRows(crRes).map(mapReceipt),
      ];

      all.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });

      setAllEntries(all);
    } catch {
      toasterrormsg("Failed to fetch cash book entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Client-side filtering ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let f = allEntries;
    if (dateFrom)     f = f.filter(e => e.date >= dateFrom);
    if (dateTo)       f = f.filter(e => e.date <= dateTo);
    if (filterType?.value)   f = f.filter(e => e.type.toLowerCase() === filterType.value.toLowerCase());
    if (filterAccount) f = f.filter(e => e.accountName.toLowerCase().includes(filterAccount.toLowerCase()));
    return f;
  }, [allEntries, dateFrom, dateTo, filterType, filterAccount]);

  const hasActiveFilters = !!(dateFrom || dateTo || filterType?.value || filterAccount);

  const clearFilters = () => {
    setDateFrom(""); setDateTo("");
    setFilterType(null); setFilterAccount("");
    setGlobalFilter("");
  };

  // ── Summary totals ─────────────────────────────────────────────────────
  const totalReceipts = useMemo(() =>
    filtered.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    [filtered]);
  const totalPayments = useMemo(() =>
    filtered.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0),
    [filtered]);
  const closingBalance = totalReceipts - totalPayments;

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["SR","Date","Voucher No","Type","Account Name","Party Name","Receipt (₹)","Payment (₹)","Narration"];
    const rows = filtered.map((e, i) => [
      i + 1, e.date, e.voucherNo, e.type,
      e.accountName, e.partyName,
      e.amount > 0 ? e.amount.toFixed(2) : "—",
      e.amount < 0 ? Math.abs(e.amount).toFixed(2) : "—",
      e.narration,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `cash_book_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<CashEntry>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<CashEntry, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<CashEntry, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "voucherNo", accessorKey: "voucherNo", header: "Voucher No",
      cell: ({ getValue, table }: CellContext<CashEntry, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap  text-xs font-semibold text-primary-600 dark:text-primary-400">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "type", accessorKey: "type", header: "Type",
      cell: ({ getValue }: CellContext<CashEntry, unknown>) => (
        <TypeBadge type={String(getValue() ?? "")} />
      ),
    },
    {
      id: "accountName", accessorKey: "accountName", header: "Account Name",
      cell: ({ getValue, table }: CellContext<CashEntry, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap text-gray-700 dark:text-dark-200">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "partyName", accessorKey: "partyName", header: "Party Name",
      cell: ({ getValue, table }: CellContext<CashEntry, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "receipt", header: "Receipt (₹)",
      enableGlobalFilter: false,
      accessorFn: row => row.amount > 0 ? row.amount : 0,
      cell: ({ row }: CellContext<CashEntry, unknown>) =>
        row.original.amount > 0 ? (
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            ₹{row.original.amount.toFixed(2)}
          </span>
        ) : <span className="text-gray-300 dark:text-dark-600">—</span>,
    },
    {
      id: "payment", header: "Payment (₹)",
      enableGlobalFilter: false,
      accessorFn: row => row.amount < 0 ? Math.abs(row.amount) : 0,
      cell: ({ row }: CellContext<CashEntry, unknown>) =>
        row.original.amount < 0 ? (
          <span className="font-semibold tabular-nums text-error-600 dark:text-error-400">
            ₹{Math.abs(row.original.amount).toFixed(2)}
          </span>
        ) : <span className="text-gray-300 dark:text-dark-600">—</span>,
    },
    {
      id: "narration", accessorKey: "narration", header: "Narration",
      cell: ({ getValue, table }: CellContext<CashEntry, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="block max-w-[180px] truncate text-xs text-gray-500 dark:text-dark-300">
            <Highlight query={q}>{String(getValue() ?? "") || "—"}</Highlight>
          </span>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    getRowId: row => row.uid,
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const visibleCount = table.getFilteredRowModel().rows.length;

  return (
    <Page title="Cash Book">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Cash Book
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">{visibleCount}</span>{" "}records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outlined"
              className={clsx("h-9 gap-2 rounded-md px-3 text-sm",
                (showFilters || hasActiveFilters) && "border-primary text-primary")}
              onClick={() => setShowFilters(v => !v)}
            >
              <FunnelIcon className={clsx("size-4", (showFilters || hasActiveFilters) && "text-primary")} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                  {[dateFrom, dateTo, filterType?.value, filterAccount].filter(Boolean).length}
                </span>
              )}
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" />
              <span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={() => window.print()}>
              <PrinterIcon className="size-4" /><span>Print</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchAll} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ── Filter panel ──────────────────────────────────────────── */}
        {showFilters && (
          <div className="px-(--margin-x) mt-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* From Date */}
                <DatePicker
                  label="From Date"
                  value={dateFrom}
                  onChange={(v: any) => setDateFrom(v || "")}
                  maxDate={dateTo || undefined}
                />
                {/* To Date */}
                <DatePicker
                  label="To Date"
                  value={dateTo}
                  onChange={(v: any) => setDateTo(v || "")}
                  minDate={dateFrom || undefined}
                />
                {/* Transaction Type */}
                <Combobox
                  label="Transaction Type"
                  value={filterType}
                  onChange={(item: any) => setFilterType(item)}
                  data={[
                    { label: "All Types",                         value: ""     },
                    { label: "CR — Cash Receipt",                 value: "CR"   },
                    { label: "SCR — Sales Credit Receipt",        value: "SCR"  },
                    { label: "PRCR — Purchase Return Receipt",    value: "PRCR" },
                    { label: "CP — Cash Payment",                 value: "CP"   },
                    { label: "PCP — Purchase Credit Payment",     value: "PCP"  },
                    { label: "SRCP — Sales Return Payment",       value: "SRCP" },
                   ]}
                  displayField="label"
                  searchFields={["label"]}
                  by="value"
                />
                {/* Account filter */}
                <Input
                  label="Cash Account"
                  value={filterAccount}
                  onChange={e => setFilterAccount(e.target.value)}
                  placeholder="Filter by account name…"
                  classNames={{ input: "h-9 text-sm" }}
                />
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button
                    variant="outlined"
                    className="h-8 gap-1.5 rounded-md px-3 text-xs text-error-600 border-error-300 hover:bg-error-50 dark:border-error-800 dark:hover:bg-error-900/20"
                    onClick={clearFilters}
                  >
                    <XMarkIcon className="size-3.5" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Summary cards ─────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{totalReceipts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Receipts</p>
            <p className="mt-0.5 text-xs text-white/60">{filtered.filter(e => e.amount > 0).length} entries</p>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Payments</p>
            <p className="mt-0.5 text-xs text-white/60">{filtered.filter(e => e.amount < 0).length} entries</p>
          </div>
          <div className={clsx(
            "relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-md",
            closingBalance >= 0 ? "from-primary-500 to-primary-700" : "from-amber-500 to-amber-700",
          )}>
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">
              {closingBalance < 0 ? "-" : ""}₹{Math.abs(closingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Closing Balance</p>
            <p className="mt-0.5 text-xs text-white/60">{filtered.length} total transactions</p>
          </div>
        </div>

        {/* ── Search ────────────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search by Voucher No, Party, Account, Narration…"
          />
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading cash book…" : "No cash transactions found."}
        />

        {/* ── Footer totals ─────────────────────────────────────────── */}
        {visibleCount > 0 && (
          <div className="px-(--margin-x) mt-2">
            <div className="flex flex-wrap items-center justify-end gap-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm dark:border-dark-500 dark:bg-dark-700">
              <span className="text-gray-500 dark:text-dark-300">{visibleCount} transactions</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Receipts: ₹{totalReceipts.toFixed(2)}
              </span>
              <span className="font-semibold text-error-600 dark:text-error-400">
                Payments: ₹{totalPayments.toFixed(2)}
              </span>
              <span className={clsx(
                "font-bold",
                closingBalance >= 0
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-amber-600 dark:text-amber-400",
              )}>
                Closing: ₹{closingBalance.toFixed(2)}
              </span>
            </div>
          </div>
        )}

      </div>
    </Page>
  );
}
