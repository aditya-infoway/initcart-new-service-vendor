import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon,
  BanknotesIcon, CalendarDaysIcon,
  FunnelIcon, MagnifyingGlassIcon,
  PrinterIcon, XMarkIcon,
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
type EntryCategory = "cash_payment" | "cash_receipt" | "bank_payment" | "bank_receipt";

interface DayBookEntry {
  uid: string;
  id: number;
  date: string;
  createdAt: string;
  voucherNo: string;
  type: string;
  transactionType: "Receipt" | "Payment";
  accountName: string;
  partyName: string;
  amount: number;   // positive = receipt, negative = payment
  narration: string;
  mode: string;
  chequeNo: string;
  category: EntryCategory;
}

const today = new Date().toISOString().split("T")[0];

// ── Mappers ────────────────────────────────────────────────────────────────
function mapCashPayment(r: any): DayBookEntry {
  return {
    uid:             `cp-${r.id}`,
    id:              Number(r.id ?? 0),
    date:            String(r.date ?? ""),
    createdAt:       String(r.created_at ?? r.date ?? ""),
    voucherNo:       String(r.voucher_no ?? ""),
    type:            String(r.type ?? "CP"),
    transactionType: "Payment",
    accountName:     String(r.cash_account_name ?? r.cash_account ?? "—"),
    partyName:       String(r.party_name ?? r.op_account ?? "—"),
    amount:          -Math.abs(Number(r.amount ?? 0)),
    narration:       String(r.narration ?? ""),
    mode:            "Cash",
    chequeNo:        "—",
    category:        "cash_payment",
  };
}
function mapCashReceipt(r: any): DayBookEntry {
  return {
    uid:             `cr-${r.id}`,
    id:              Number(r.id ?? 0),
    date:            String(r.date ?? ""),
    createdAt:       String(r.created_at ?? r.date ?? ""),
    voucherNo:       String(r.voucher_no ?? ""),
    type:            String(r.type ?? "CR"),
    transactionType: "Receipt",
    accountName:     String(r.cash_account_name ?? r.cash_account ?? "—"),
    partyName:       String(r.party_name ?? r.op_account ?? "—"),
    amount:          Math.abs(Number(r.amount ?? 0)),
    narration:       String(r.narration ?? ""),
    mode:            "Cash",
    chequeNo:        "—",
    category:        "cash_receipt",
  };
}
function mapBankPayment(r: any): DayBookEntry {
  return {
    uid:             `bp-${r.id}`,
    id:              Number(r.id ?? 0),
    date:            String(r.date ?? ""),
    createdAt:       String(r.created_at ?? r.date ?? ""),
    voucherNo:       String(r.voucher_no ?? ""),
    type:            String(r.type ?? "BP"),
    transactionType: "Payment",
    accountName:     String(r.bank_account_name ?? r.bank_account ?? "—"),
    partyName:       String(r.party_name ?? r.op_account ?? "—"),
    amount:          -Math.abs(Number(r.amount ?? 0)),
    narration:       String(r.narration ?? ""),
    mode:            String(r.mode ?? "—"),
    chequeNo:        String(r.cheque_no ?? "—"),
    category:        "bank_payment",
  };
}
function mapBankReceipt(r: any): DayBookEntry {
  return {
    uid:             `br-${r.id}`,
    id:              Number(r.id ?? 0),
    date:            String(r.date ?? ""),
    createdAt:       String(r.created_at ?? r.date ?? ""),
    voucherNo:       String(r.voucher_no ?? ""),
    type:            String(r.type ?? "BR"),
    transactionType: "Receipt",
    accountName:     String(r.bank_account_name ?? r.bank_account ?? "—"),
    partyName:       String(r.party_name ?? r.op_account ?? "—"),
    amount:          Math.abs(Number(r.amount ?? 0)),
    narration:       String(r.narration ?? ""),
    mode:            String(r.mode ?? "—"),
    chequeNo:        String(r.cheque_no ?? "—"),
    category:        "bank_receipt",
  };
}

function extractRows(body: any): any[] {
  const d = body?.data ?? body;
  return Array.isArray(d?.results) ? d.results
    : Array.isArray(d?.data) ? d.data
    : Array.isArray(d) ? d : [];
}

// ── Type badge colour ──────────────────────────────────────────────────────
const TYPE_MAP: Record<string, "success" | "warning" | "info" | "error" | "primary"> = {
  CR: "success", SCR: "success", PRCR: "success",
  BR: "success", SBR: "success", PRBR: "success",
  CP: "error",   PCP: "warning", SRCP: "warning",
  BP: "error",   PBP: "warning", SRBP: "warning",
};
function TypeBadge({ type }: { type: string }) {
  return (
    <Badge color={TYPE_MAP[type.toUpperCase()] ?? "primary"} variant="soft" className="text-xs">
      {type}
    </Badge>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DayBookPage() {
  const [allEntries, setAllEntries]     = useState<DayBookEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters]   = useState(false);

  // Filter state
  const [dateFrom, setDateFrom]                 = useState(today);
  const [dateTo, setDateTo]                     = useState(today);
  const [filterCategory, setFilterCategory]     = useState<any>({ label: "All Transactions", value: "" });
  const [filterTxType, setFilterTxType]         = useState<any>({ label: "All Types", value: "" });

  // ── Fetch all 4 APIs in parallel ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cpRes, crRes, bpRes, brRes] = await Promise.all([
        Get("pos/cash-payments/",  { page: 1, page_size: 1000 }),
        Get("pos/cash-receipts/",  { page: 1, page_size: 1000 }),
        Get("pos/bank-payments/",  { page: 1, page_size: 1000 }),
        Get("pos/bank-receipts/",  { page: 1, page_size: 1000 }),
      ]) as any[];

      const all: DayBookEntry[] = [
        ...extractRows(cpRes).map(mapCashPayment),
        ...extractRows(crRes).map(mapCashReceipt),
        ...extractRows(bpRes).map(mapBankPayment),
        ...extractRows(brRes).map(mapBankReceipt),
      ];

      // Sort newest date first, then by createdAt desc
      all.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });

      setAllEntries(all);
    } catch {
      toasterrormsg("Failed to fetch day book entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Client-side filtering ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let f = allEntries;
    if (dateFrom) f = f.filter(e => e.date >= dateFrom);
    if (dateTo)   f = f.filter(e => e.date <= dateTo);
    if (filterCategory?.value === "cash") f = f.filter(e => e.category.startsWith("cash"));
    if (filterCategory?.value === "bank") f = f.filter(e => e.category.startsWith("bank"));
    if (filterTxType?.value)              f = f.filter(e => e.transactionType === filterTxType.value);
    return f;
  }, [allEntries, dateFrom, dateTo, filterCategory, filterTxType]);

  const isToday = dateFrom === today && dateTo === today && !filterCategory?.value && !filterTxType?.value && !globalFilter;
  const hasActiveFilters = dateFrom !== today || dateTo !== today || !!filterCategory?.value || !!filterTxType?.value;

  const applyToday = () => {
    setDateFrom(today); setDateTo(today);
    setFilterCategory({ label: "All Transactions", value: "" });
    setFilterTxType({ label: "All Types", value: "" });
    setGlobalFilter("");
  };

  const clearFilters = () => {
    setDateFrom(today); setDateTo(today);
    setFilterCategory({ label: "All Transactions", value: "" });
    setFilterTxType({ label: "All Types", value: "" });
    setGlobalFilter("");
  };

  // ── Summary totals (from `filtered`, before global search) ────────────
  const totalReceipts = useMemo(() =>
    filtered.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    [filtered]);
  const totalPayments = useMemo(() =>
    filtered.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0),
    [filtered]);
  const cashBalance = useMemo(() => {
    const r = filtered.filter(e => e.category === "cash_receipt").reduce((s, e) => s + e.amount, 0);
    const p = filtered.filter(e => e.category === "cash_payment").reduce((s, e) => s + Math.abs(e.amount), 0);
    return r - p;
  }, [filtered]);
  const bankBalance = useMemo(() => {
    const r = filtered.filter(e => e.category === "bank_receipt").reduce((s, e) => s + e.amount, 0);
    const p = filtered.filter(e => e.category === "bank_payment").reduce((s, e) => s + Math.abs(e.amount), 0);
    return r - p;
  }, [filtered]);

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["SR","Date","Voucher No","Type","Category","Account Name","Party Name","Mode","Cheque No","Receipt (₹)","Payment (₹)","Narration"];
    const rows = filtered.map((e, i) => [
      i + 1, e.date, e.voucherNo, e.type,
      e.category.includes("cash") ? "Cash" : "Bank",
      e.accountName, e.partyName, e.mode, e.chequeNo,
      e.amount > 0 ? e.amount.toFixed(2) : "—",
      e.amount < 0 ? Math.abs(e.amount).toFixed(2) : "—",
      e.narration,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `day_book_${dateFrom}_to_${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<DayBookEntry>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<DayBookEntry, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<DayBookEntry, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "voucherNo", accessorKey: "voucherNo", header: "Voucher No",
      cell: ({ getValue, table }: CellContext<DayBookEntry, unknown>) => {
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
      cell: ({ getValue }: CellContext<DayBookEntry, unknown>) => (
        <TypeBadge type={String(getValue() ?? "")} />
      ),
    },
    {
      id: "category", accessorKey: "category", header: "Category",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<DayBookEntry, unknown>) => {
        const v = String(getValue() ?? "");
        const isCash = v.startsWith("cash");
        return (
          <Badge color={isCash ? "warning" : "info"} variant="soft" className="text-xs whitespace-nowrap">
            {isCash ? "Cash" : "Bank"}
          </Badge>
        );
      },
    },
    {
      id: "accountName", accessorKey: "accountName", header: "Account Name",
      cell: ({ getValue, table }: CellContext<DayBookEntry, unknown>) => {
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
      cell: ({ getValue, table }: CellContext<DayBookEntry, unknown>) => {
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
      cell: ({ getValue }: CellContext<DayBookEntry, unknown>) => (
        <span className="text-xs text-gray-500 dark:text-dark-300 whitespace-nowrap">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "receipt", header: "Receipt (₹)",
      enableSorting: true,
      enableGlobalFilter: false,
      accessorFn: (row) => (row.amount > 0 ? row.amount : 0),
      cell: ({ row }: CellContext<DayBookEntry, unknown>) =>
        row.original.amount > 0 ? (
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            ₹{row.original.amount.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-dark-600">—</span>
        ),
    },
    {
      id: "payment", header: "Payment (₹)",
      enableSorting: true,
      enableGlobalFilter: false,
      accessorFn: (row) => (row.amount < 0 ? Math.abs(row.amount) : 0),
      cell: ({ row }: CellContext<DayBookEntry, unknown>) =>
        row.original.amount < 0 ? (
          <span className="font-semibold tabular-nums text-error-600 dark:text-error-400">
            ₹{Math.abs(row.original.amount).toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-dark-600">—</span>
        ),
    },
    {
      id: "narration", accessorKey: "narration", header: "Narration",
      cell: ({ getValue, table }: CellContext<DayBookEntry, unknown>) => {
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
    getRowId: (row) => row.uid,
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

  const formatDateLabel = () => {
    if (dateFrom === dateTo) {
      if (dateFrom === today) return "Today";
      return formatDateDDMMYYYY(dateFrom);
    }
    return `${formatDateDDMMYYYY(dateFrom)} – ${formatDateDDMMYYYY(dateTo)}`;
  };

  return (
    <Page title="Day Book">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Day Book
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">{visibleCount}</span>{" "}
              records · <span className="text-primary-600 dark:text-primary-400 font-medium">{formatDateLabel()}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isToday && (
              <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={applyToday}>
                <CalendarDaysIcon className="size-4 text-primary-600" />
                <span>Today</span>
              </Button>
            )}
            <Button
              variant="outlined"
              className={clsx("h-9 gap-2 rounded-md px-3 text-sm", (showFilters || hasActiveFilters) && "border-primary text-primary")}
              onClick={() => setShowFilters(v => !v)}
            >
              <FunnelIcon className={clsx("size-4", (showFilters || hasActiveFilters) && "text-primary")} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                  {[dateFrom !== today || dateTo !== today, !!filterCategory?.value, !!filterTxType?.value].filter(Boolean).length}
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
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={fetchAll} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /><span>Refresh</span>
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
                  onChange={(v: any) => setDateFrom(v || today)}
                  maxDate={dateTo}
                />
                {/* To Date */}
                <DatePicker
                  label="To Date"
                  value={dateTo}
                  onChange={(v: any) => setDateTo(v || today)}
                  minDate={dateFrom}
                />
                {/* Category */}
                <Combobox
                  label="Category"
                  value={filterCategory}
                  onChange={setFilterCategory}
                  data={[
                    { label: "All Transactions", value: "" },
                    { label: "Cash Only",         value: "cash" },
                    { label: "Bank Only",          value: "bank" },
                  ]}
                  placeholder="Select category"
                  displayField="label"
                  searchFields={["label"]}
                  by="value"
                />
                {/* Transaction Type */}
                <Combobox
                  label="Transaction Type"
                  value={filterTxType}
                  onChange={setFilterTxType}
                  data={[
                    { label: "All Types", value: ""        },
                    { label: "Receipt",   value: "Receipt" },
                    { label: "Payment",   value: "Payment" },
                  ]}
                  placeholder="Select type"
                  displayField="label"
                  searchFields={["label"]}
                  by="value"
                />
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button variant="outlined" className="h-8 gap-1.5 rounded-md px-3 text-xs text-error-600 border-error-300 hover:bg-error-50 dark:border-error-800 dark:hover:bg-error-900/20"
                    onClick={clearFilters}>
                    <XMarkIcon className="size-3.5" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Summary cards ─────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label:    "Total Receipts",
              value:    totalReceipts,
              bg:       "from-emerald-500 to-emerald-700",
              sub:      `${filtered.filter(e => e.amount > 0).length} entries`,
              positive: true,
            },
            {
              label:    "Total Payments",
              value:    totalPayments,
              bg:       "from-rose-500 to-rose-700",
              sub:      `${filtered.filter(e => e.amount < 0).length} entries`,
              positive: false,
            },
            {
              label:    "Cash Balance",
              value:    cashBalance,
              bg:       cashBalance >= 0 ? "from-sky-500 to-sky-700" : "from-amber-500 to-amber-700",
              sub:      `Closing balance`,
              positive: cashBalance >= 0,
            },
            {
              label:    "Bank Balance",
              value:    bankBalance,
              bg:       bankBalance >= 0 ? "from-primary-500 to-primary-700" : "from-amber-500 to-amber-700",
              sub:      `Closing balance`,
              positive: bankBalance >= 0,
            },
          ].map(({ label, value, bg, sub }) => (
            <div key={label} className={clsx("relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-md", bg)}>
              <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
              <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                <BanknotesIcon className="size-4 text-white" />
              </div>
              <p className="text-xl font-bold tabular-nums">
                {value < 0 ? "-" : ""}₹{Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
              <p className="mt-0.5 text-xs text-white/60">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Search ────────────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search by Voucher No, Party, Account…"
          />
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={
            loading
              ? "Loading transactions…"
              : isToday
                ? "No transactions found for today."
                : "No transactions found for the selected period."
          }
        />

        {/* ── Footer totals row ─────────────────────────────────────── */}
        {visibleCount > 0 && (
          <div className="px-(--margin-x) mt-2">
            <div className="flex flex-wrap items-center justify-end gap-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm dark:border-dark-500 dark:bg-dark-700">
              <span className="text-gray-500 dark:text-dark-300">
                {visibleCount} transactions
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Receipts: ₹{totalReceipts.toFixed(2)}
              </span>
              <span className="font-semibold text-error-600 dark:text-error-400">
                Payments: ₹{totalPayments.toFixed(2)}
              </span>
              <span className={clsx(
                "font-bold",
                (totalReceipts - totalPayments) >= 0
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-amber-600 dark:text-amber-400",
              )}>
                Closing: ₹{(totalReceipts - totalPayments).toFixed(2)}
              </span>
            </div>
          </div>
        )}

      </div>
    </Page>
  );
}
