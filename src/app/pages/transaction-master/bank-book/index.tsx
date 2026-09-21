import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon, BanknotesIcon,
  FunnelIcon, MagnifyingGlassIcon, PrinterIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
type EntryKind = "payment" | "receipt";

interface BankEntry {
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
  mode: string;
  chequeNo: string;
  chequeDate: string;
  chequeClearDate: string;
  entryKind: EntryKind;
}

function extractRows(res: any): any[] {
  const body = res?.data ?? res;
  return Array.isArray(body?.results) ? body.results
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body) ? body : [];
}

function mapPayment(r: any): BankEntry {
  return {
    uid:             `bp-${r.id}`,
    id:              Number(r.id ?? 0),
    date:            String(r.date ?? ""),
    createdAt:       String(r.created_at ?? r.date ?? ""),
    voucherNo:       String(r.voucher_no ?? ""),
    type:            String(r.type ?? "BP"),
    accountName:     String(r.bank_account_name ?? r.bank_account ?? "—"),
    partyName:       String(r.party_name ?? r.op_account ?? "—"),
    amount:          -Math.abs(Number(r.amount ?? 0)),
    narration:       String(r.narration ?? ""),
    mode:            String(r.mode ?? ""),
    chequeNo:        String(r.cheque_no ?? ""),
    chequeDate:      String(r.cheque_date ?? ""),
    chequeClearDate: String(r.cheque_clear_date ?? ""),
    entryKind:       "payment",
  };
}

function mapReceipt(r: any): BankEntry {
  return {
    uid:             `br-${r.id}`,
    id:              Number(r.id ?? 0),
    date:            String(r.date ?? ""),
    createdAt:       String(r.created_at ?? r.date ?? ""),
    voucherNo:       String(r.voucher_no ?? ""),
    type:            String(r.type ?? "BR"),
    accountName:     String(r.bank_account_name ?? r.bank_account ?? "—"),
    partyName:       String(r.party_name ?? r.op_account ?? "—"),
    amount:          Math.abs(Number(r.amount ?? 0)),
    narration:       String(r.narration ?? ""),
    mode:            String(r.mode ?? ""),
    chequeNo:        String(r.cheque_no ?? ""),
    chequeDate:      String(r.cheque_date ?? ""),
    chequeClearDate: String(r.cheque_clear_date ?? ""),
    entryKind:       "receipt",
  };
}

// ── Static option lists for Combobox ──────────────────────────────────────
const TYPE_OPTIONS = [
  { id: "",     label: "All Types" },
  // Receipts
  { id: "BR",   label: "BR — Bank Receipt" },
  { id: "SBR",  label: "SBR — Sales Credit Receipt" },
  { id: "PRBR", label: "PRBR — Purchase Return Receipt" },
  // Payments
  { id: "BP",   label: "BP — Bank Payment" },
  { id: "PBP",  label: "PBP — Purchase Credit Payment" },
  { id: "SRBP", label: "SRBP — Sales Return Payment" },
];

const MODE_OPTIONS = [
  { id: "",       label: "All Modes" },
  { id: "NEFT",   label: "NEFT" },
  { id: "RTGS",   label: "RTGS" },
  { id: "IMPS",   label: "IMPS" },
  { id: "UPI",    label: "UPI" },
  { id: "CHEQUE", label: "CHEQUE" },
  { id: "Auto",   label: "Auto" },
];

// ── Type badge ─────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, "success" | "warning" | "error" | "info"> = {
  BR: "success", SBR: "success", PRBR: "success",
  BP: "error",   PBP: "warning", SRBP: "warning",
};
function TypeBadge({ type }: { type: string }) {
  return (
    <Badge color={TYPE_COLOR[type.toUpperCase()] ?? "primary"} variant="soft" className="text-xs">
      {type}
    </Badge>
  );
}

// ── Mode badge ─────────────────────────────────────────────────────────────
function ModeBadge({ mode }: { mode: string }) {
  if (!mode || mode === "—") return <span className="text-gray-300 dark:text-dark-600">—</span>;
  const color = mode === "CHEQUE" ? "warning" : mode === "UPI" ? "info" : "primary";
  return <Badge color={color} variant="soft" className="text-xs">{mode}</Badge>;
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function BankBookPage() {
  const [allEntries, setAllEntries]     = useState<BankEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters]   = useState(false);

  // Filter state
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [filterTypeObj, setFilterTypeObj]   = useState(TYPE_OPTIONS[0]);
  const [filterModeObj, setFilterModeObj]   = useState(MODE_OPTIONS[0]);
  const [filterAccount, setFilterAccount]   = useState("");

  // ── Fetch bank-payments + bank-receipts in parallel ────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bpRes, brRes] = await Promise.all([
        Get("pos/bank-payments/", { page: 1, page_size: 1000 }),
        Get("pos/bank-receipts/", { page: 1, page_size: 1000 }),
      ]) as any[];

      const all: BankEntry[] = [
        ...extractRows(bpRes).map(mapPayment),
        ...extractRows(brRes).map(mapReceipt),
      ];

      all.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });

      setAllEntries(all);
    } catch {
      toasterrormsg("Failed to fetch bank book entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Client-side filtering ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let f = allEntries;
    if (dateFrom)              f = f.filter(e => e.date >= dateFrom);
    if (dateTo)                f = f.filter(e => e.date <= dateTo);
    if (filterTypeObj.id)      f = f.filter(e => e.type.toLowerCase() === filterTypeObj.id.toLowerCase());
    if (filterModeObj.id)      f = f.filter(e => e.mode.toLowerCase() === filterModeObj.id.toLowerCase());
    if (filterAccount)         f = f.filter(e => e.accountName.toLowerCase().includes(filterAccount.toLowerCase()));
    return f;
  }, [allEntries, dateFrom, dateTo, filterTypeObj, filterModeObj, filterAccount]);

  const hasActiveFilters = !!(dateFrom || dateTo || filterTypeObj.id || filterModeObj.id || filterAccount);

  const clearFilters = () => {
    setDateFrom(""); setDateTo("");
    setFilterTypeObj(TYPE_OPTIONS[0]);
    setFilterModeObj(MODE_OPTIONS[0]);
    setFilterAccount("");
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
    const headers = ["SR","Date","Voucher No","Type","Account Name","Party Name","Mode","Cheque No","Cheque Date","Clear Date","Receipt (₹)","Payment (₹)","Narration"];
    const rows = filtered.map((e, i) => [
      i + 1, e.date, e.voucherNo, e.type,
      e.accountName, e.partyName, e.mode,
      e.chequeNo || "—", e.chequeDate || "—", e.chequeClearDate || "—",
      e.amount > 0 ? e.amount.toFixed(2) : "—",
      e.amount < 0 ? Math.abs(e.amount).toFixed(2) : "—",
      e.narration,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `bank_book_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<BankEntry>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<BankEntry, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<BankEntry, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "voucherNo", accessorKey: "voucherNo", header: "Voucher No",
      cell: ({ getValue, table }: CellContext<BankEntry, unknown>) => {
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
      cell: ({ getValue }: CellContext<BankEntry, unknown>) => (
        <TypeBadge type={String(getValue() ?? "")} />
      ),
    },
    {
      id: "accountName", accessorKey: "accountName", header: "Account Name",
      cell: ({ getValue, table }: CellContext<BankEntry, unknown>) => {
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
      cell: ({ getValue, table }: CellContext<BankEntry, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "mode", accessorKey: "mode", header: "Mode",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<BankEntry, unknown>) => (
        <ModeBadge mode={String(getValue() ?? "")} />
      ),
    },
    {
      id: "chequeNo", accessorKey: "chequeNo", header: "Cheque No",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<BankEntry, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <span className=" text-xs text-gray-500 dark:text-dark-300">
            {v || "—"}
          </span>
        );
      },
    },
    {
      id: "receipt", header: "Receipt (₹)",
      enableGlobalFilter: false,
      accessorFn: row => row.amount > 0 ? row.amount : 0,
      cell: ({ row }: CellContext<BankEntry, unknown>) =>
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
      cell: ({ row }: CellContext<BankEntry, unknown>) =>
        row.original.amount < 0 ? (
          <span className="font-semibold tabular-nums text-error-600 dark:text-error-400">
            ₹{Math.abs(row.original.amount).toFixed(2)}
          </span>
        ) : <span className="text-gray-300 dark:text-dark-600">—</span>,
    },
    {
      id: "narration", accessorKey: "narration", header: "Narration",
      cell: ({ getValue, table }: CellContext<BankEntry, unknown>) => {
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
    <Page title="Bank Book">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Bank Book
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
                  {[dateFrom, dateTo, filterTypeObj.id, filterModeObj.id, filterAccount].filter(Boolean).length}
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

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

                {/* Transaction Type — Combobox */}
                <Combobox
                  label="Transaction Type"
                  data={TYPE_OPTIONS}
                  displayField="label"
                  searchFields={["label", "id"]}
                  value={filterTypeObj}
                  onChange={(item: any) => setFilterTypeObj(item ?? TYPE_OPTIONS[0])}
                  placeholder="All Types"
                />

                {/* Mode — Combobox */}
                <Combobox
                  label="Mode"
                  data={MODE_OPTIONS}
                  displayField="label"
                  searchFields={["label"]}
                  value={filterModeObj}
                  onChange={(item: any) => setFilterModeObj(item ?? MODE_OPTIONS[0])}
                  placeholder="All Modes"
                />

                {/* Bank Account text filter */}
                <Input
                  label="Bank Account"
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
            <p className="text-xl font-bold tabular-nums">
              ₹{totalReceipts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Receipts</p>
            <p className="mt-0.5 text-xs text-white/60">{filtered.filter(e => e.amount > 0).length} entries</p>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">
              ₹{totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
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
            placeholder="Search by Voucher No, Party, Account, Mode…"
          />
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading bank book…" : "No bank transactions found."}
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
