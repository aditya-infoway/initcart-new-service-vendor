import {
  getCoreRowModel, getPaginationRowModel, getSortedRowModel,
  SortingState, useReactTable, ColumnDef, CellContext,
} from "@tanstack/react-table";
import {
  ArrowLeftIcon, ArrowPathIcon, BanknotesIcon,
  CalendarDaysIcon, CurrencyRupeeIcon, UserCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card } from "@/components/ui";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import {
  LedgerDetail, LedgerEntry, getDrCrColor, mapApiLedgerDetail,
} from "./data";

export default function LedgerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<LedgerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await Get(`pos/ledger-history/${id}/`, params) as any;
      const body = res?.data ?? res;
      setDetail(mapApiLedgerDetail(body));
    } catch {
      toasterrormsg("Failed to load ledger history.");
    } finally {
      setLoading(false);
    }
  }, [id, dateFrom, dateTo]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const columns = useMemo<ColumnDef<LedgerEntry>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false,
      cell: ({ row }: CellContext<LedgerEntry, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<LedgerEntry, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "type", accessorKey: "type", header: "Type",
      cell: ({ getValue }: CellContext<LedgerEntry, unknown>) => (
        <Badge color="info" variant="soft" className="capitalize">
          {String(getValue() ?? "—") || "—"}
        </Badge>
      ),
    },
    {
      id: "voucherNo", accessorKey: "voucherNo", header: "Voucher No.",
      cell: ({ getValue }: CellContext<LedgerEntry, unknown>) => (
        <span className=" text-xs font-medium text-primary-600 dark:text-primary-400">
          {String(getValue() ?? "—") || "—"}
        </span>
      ),
    },
    {
      id: "debit", accessorKey: "debit", header: "Debit",
      cell: ({ getValue }: CellContext<LedgerEntry, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className={clsx("tabular-nums font-medium", v > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400")}>
            {v > 0 ? `₹${v.toFixed(2)}` : "—"}
          </span>
        );
      },
    },
    {
      id: "credit", accessorKey: "credit", header: "Credit",
      cell: ({ getValue }: CellContext<LedgerEntry, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className={clsx("tabular-nums font-medium", v > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400")}>
            {v > 0 ? `₹${v.toFixed(2)}` : "—"}
          </span>
        );
      },
    },
    {
      id: "balance", accessorKey: "balance", header: "Balance",
      cell: ({ row }: CellContext<LedgerEntry, unknown>) => (
        <span className={clsx("tabular-nums font-bold", getDrCrColor(row.original.balanceDrcr))}>
          ₹{Number(row.original.balance ?? 0).toFixed(2)}{" "}
          <span className="text-xs">{row.original.balanceDrcr}</span>
        </span>
      ),
    },
    {
      id: "narration", accessorKey: "narration", header: "Narration",
      cell: ({ getValue }: CellContext<LedgerEntry, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300 max-w-[200px] truncate block">
          {String(getValue() ?? "") || "—"}
        </span>
      ),
    },
  ], []);

  const table = useReactTable({
    data: detail?.ledger ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <Page title="Ledger Detail">
      <div className="transition-content w-full px-(--margin-x) py-5 pb-10 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
            onClick={() => navigate("/transaction/ledger-report")}>
            <ArrowLeftIcon className="size-4" /> Back to Ledger
          </Button>
          {detail && (
            <>
              <div className="h-5 w-px bg-gray-300 dark:bg-dark-500" />
              <h1 className="text-lg font-bold text-gray-800 dark:text-dark-50">{detail.account}</h1>
              <Badge color="primary" variant="soft">{detail.group}</Badge>
            </>
          )}
          <div className="ml-auto">
            <Button variant="outlined" className="h-9 gap-2 px-3 text-sm"
              onClick={fetchDetail} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        {detail && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Opening Balance",
                value: `₹${detail.openingBalance.toLocaleString()}`,
                sub: detail.openingDrCr,
                bg: "bg-gradient-to-br from-primary-500 to-primary-700",
                Icon: UserCircleIcon,
              },
              {
                label: "Total Debit",
                value: `₹${detail.totalDebit.toLocaleString()}`,
                sub: "Dr",
                bg: "bg-gradient-to-br from-emerald-500 to-emerald-700",
                Icon: CurrencyRupeeIcon,
              },
              {
                label: "Total Credit",
                value: `₹${detail.totalCredit.toLocaleString()}`,
                sub: "Cr",
                bg: "bg-gradient-to-br from-red-500 to-red-700",
                Icon: BanknotesIcon,
              },
              {
                label: "Closing Balance",
                value: `₹${detail.closingBalance.toLocaleString()}`,
                sub: detail.closingDrCr,
                bg: detail.closingDrCr === "Dr"
                  ? "bg-gradient-to-br from-amber-500 to-amber-600"
                  : "bg-gradient-to-br from-rose-500 to-rose-700",
                Icon: CalendarDaysIcon,
              },
            ].map(({ label, value, sub, bg, Icon }) => (
              <div key={label} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bg)}>
                <div className="pointer-events-none absolute -right-2 -top-2 size-12 rounded-full bg-white/10" />
                <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                  <Icon className="size-4 text-white" />
                </div>
                <p className="text-xl font-bold tabular-nums">{value}</p>
                <p className="mt-0.5 text-xs font-semibold text-white/90">{sub}</p>
                <p className="text-xs text-white/70">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Date range filter */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[180px]">
              <DatePicker
                label="From Date"
                value={dateFrom}
                onChange={(v: any) => setDateFrom(v || "")}
                maxDate={dateTo || undefined}
              />
            </div>
            <div className="min-w-[180px]">
              <DatePicker
                label="To Date"
                value={dateTo}
                onChange={(v: any) => setDateTo(v || "")}
                minDate={dateFrom || undefined}
              />
            </div>
            <Button color="primary" className="h-9 gap-2 px-4 text-sm" onClick={fetchDetail} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              Apply Filter
            </Button>
            {(dateFrom || dateTo) && (
              <Button variant="outlined" className="h-9 px-4 text-sm"
                onClick={() => { setDateFrom(""); setDateTo(""); }}>
                Clear
              </Button>
            )}
            {detail && (
              <p className="ml-auto text-sm text-gray-500 dark:text-dark-300">
                <span className="font-semibold text-gray-800 dark:text-dark-100">{detail.ledger.length}</span> transactions
              </p>
            )}
          </div>
        </Card>

        {/* Ledger table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading ledger..." : "No ledger entries found for this period."}
        />
      </div>
    </Page>
  );
}
