import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, CheckCircleIcon, ClockIcon,
  EyeIcon, FunnelIcon, InboxStackIcon,
  MagnifyingGlassIcon, TruckIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { formatDateDDMMYYYY, Get, toasterrormsg } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import {
  StockVerificationRow, extractStockVerificationRows,
  STOCK_VERIFY_STATUS_FILTERS, getVerifyStatusStyle,
} from "./data";

const API_ENDPOINT = "pos/stock-transfers/pending-verification/";
const PAGE_SIZE = 15;

export default function StockVerificationPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<StockVerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  const fetchRows = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const res = await Get(API_ENDPOINT, { page: pg }) as any;
      const body = res?.data ?? res;
      const { rows: list, count } = extractStockVerificationRows(body);
      setRows(list);
      setTotal(count || list.length);
      setTotalPages(Math.ceil((count || list.length) / PAGE_SIZE) || 1);
    } catch {
      toasterrormsg("Failed to load stock verifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(page); }, [fetchRows, page]);

  const counters = useMemo(() => ({
    incoming: rows.length,
    pending: rows.filter(r => r.status === "pending").length,
    verified: rows.filter(r => r.status === "verified").length,
    partial: rows.filter(r => r.status === "partial").length,
    itemsPending: rows.reduce((s, r) => s + r.totalPendingQty, 0),
  }), [rows]);

  const branches = useMemo(() => Array.from(new Set(rows.map(r => r.fromBranch).filter(Boolean))), [rows]);

  const filteredRows = useMemo(() => {
    let d = rows;
    if (statusFilter !== "all") d = d.filter(r => r.status === statusFilter);
    if (branchFilter !== "all") d = d.filter(r => r.fromBranch === branchFilter);
    return d;
  }, [rows, statusFilter, branchFilter]);

  const columns = useMemo<ColumnDef<StockVerificationRow>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<StockVerificationRow, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">
          {(page - 1) * PAGE_SIZE + row.index + 1}
        </span>
      ),
    },
    {
      id: "transferId", accessorKey: "transferId", header: "Transfer No.",
      cell: ({ getValue, table, row }: CellContext<StockVerificationRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
            </span>
            <span className="text-[11px] text-gray-400 dark:text-dark-400">
              for {row.original.orderId}
            </span>
          </div>
        );
      },
    },
    {
      id: "fromBranch", accessorKey: "fromBranch", header: "From Branch",
      cell: ({ getValue, table }: CellContext<StockVerificationRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-dark-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-dark-100">
            <TruckIcon className="size-3.5" />
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<StockVerificationRow, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "totalItems", accessorKey: "totalItems", header: "Items",
      cell: ({ getValue }: CellContext<StockVerificationRow, unknown>) => (
        <span className="text-center font-medium text-gray-800 dark:text-dark-100 tabular-nums">
          {String(getValue() ?? "0")}
        </span>
      ),
    },
    {
      id: "totalQty", accessorKey: "totalQty", header: "Total Qty",
      cell: ({ getValue }: CellContext<StockVerificationRow, unknown>) => (
        <span className="font-semibold tabular-nums text-gray-800 dark:text-dark-100">
          {String(getValue() ?? "0")}
        </span>
      ),
    },
    {
      id: "totalPendingQty", accessorKey: "totalPendingQty", header: "Pending",
      cell: ({ getValue, row }: CellContext<StockVerificationRow, unknown>) => {
        const v = Number(getValue() ?? 0);
        if (row.original.status === "verified") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircleIcon className="size-3" /> 0
            </span>
          );
        }
        return v > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <ClockIcon className="size-3" /> {v}
          </span>
        ) : <span className="text-xs text-gray-400">—</span>;
      },
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      cell: ({ getValue }: CellContext<StockVerificationRow, unknown>) => {
        const v = String(getValue() ?? "");
        const s = getVerifyStatusStyle(v);
        return (
          <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize", s.bg)}>
            <span className={clsx("size-1.5 rounded-full", s.dot)} />
            {v}
          </span>
        );
      },
    },
    {
      id: "actions", header: "Action", size: 80, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<StockVerificationRow, unknown>) => (
        <div className="flex justify-center">
          {row.original.status === "verified" ? (
            <Button isIcon variant="flat" className="size-8 rounded-full"
              onClick={() => navigate(`/order-management/stock-verification/${row.original.id}`)}
              title="View">
              <EyeIcon className="size-4" />
            </Button>
          ) : (
            <Button color="success" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
              onClick={() => navigate(`/order-management/stock-verification/${row.original.id}/verify-items`)}
              title="Verify">
              <CheckCircleIcon className="size-4" /> Verify
            </Button>
          )}
        </div>
      ),
    },
  ], [navigate, page]);

  const table = useReactTable({
    data: filteredRows,
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
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  return (
    <Page title="Stock Verification">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Stock Verification
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Showing{" "}
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}of{" "}
              <span className="font-semibold text-gray-800 dark:text-dark-100">{total}</span>{" "}
              incoming transfers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => setShowFilter(v => !v)}>
              <FunnelIcon className={clsx("size-4", showFilter && "text-primary")} />
              <span>Filters</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => fetchRows(page)} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Incoming",  value: counters.incoming,  bg: "bg-gradient-to-br from-primary-500 to-primary-700",   Icon: InboxStackIcon },
            { label: "Pending",   value: counters.pending,   bg: "bg-gradient-to-br from-amber-500 to-amber-600",        Icon: ClockIcon },
            { label: "Verified",  value: counters.verified,  bg: "bg-gradient-to-br from-emerald-500 to-emerald-700",    Icon: CheckCircleIcon },
            { label: "Partial",   value: counters.partial,   bg: "bg-gradient-to-br from-rose-500 to-rose-700",          Icon: TruckIcon },
          ].map(({ label, value, bg, Icon }) => (
            <div key={label} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bg)}>
              <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
              <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                <Icon className="size-4 text-white" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search transfer, order, branch..." />
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600 space-y-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STOCK_VERIFY_STATUS_FILTERS.map(f => (
                    <button key={f.key} onClick={() => setStatusFilter(f.key)}
                      className={clsx("rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        statusFilter === f.key
                          ? "bg-primary text-white"
                          : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200")}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {branches.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">From Branch</p>
                  <div className="flex flex-wrap gap-2">
                    {["all", ...branches].map(b => (
                      <button key={b} onClick={() => setBranchFilter(b)}
                        className={clsx("rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
                          branchFilter === b
                            ? "bg-primary text-white"
                            : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200")}>
                        {b === "all" ? "All Branches" : b}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(statusFilter !== "all" || branchFilter !== "all") && (
                <Button variant="flat" className="h-8 text-xs text-error hover:bg-error/10"
                  onClick={() => { setStatusFilter("all"); setBranchFilter("all"); }}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}

        {/* MasterTable */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading incoming transfers..." : "No transfers found."}
        />

        {/* Server pagination */}
        {totalPages > 1 && (
          <div className="px-(--margin-x) mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-dark-300">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="outlined" className="h-8 px-3 text-xs"
                disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={clsx("size-8 rounded-lg text-xs font-medium transition-colors",
                    p === page ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600")}>
                  {p}
                </button>
              ))}
              <Button variant="outlined" className="h-8 px-3 text-xs"
                disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
