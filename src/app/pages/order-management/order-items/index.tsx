import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, EyeIcon, FunnelIcon,
  MagnifyingGlassIcon, PlusIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import {
  BranchOrder, mapApiBranchOrder,
  ORDER_STATUS_FILTERS, getOrderStatusStyle,
} from "./data";

const PAGE_SIZE = 15;

export default function OrderItemsPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<BranchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  const fetchOrders = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const res = await Get("pos/branch-orders/", { page: pg }) as any;
      const body = res?.data ?? res;
      const rows = Array.isArray(body?.results?.orders) ? body.results.orders
        : Array.isArray(body?.results) ? body.results
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body) ? body : [];
      setOrders(rows.map(mapApiBranchOrder));
      setTotal(body?.count ?? rows.length);
      setTotalPages(Math.ceil((body?.count ?? rows.length) / PAGE_SIZE) || 1);
    } catch { toasterrormsg("Failed to fetch orders."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(page); }, [fetchOrders, page]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const columns = useMemo<ColumnDef<BranchOrder>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<BranchOrder, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">
          {(page - 1) * PAGE_SIZE + row.index + 1}
        </span>
      ),
    },
    {
      id: "orderId", accessorKey: "orderId", header: "Order ID",
      cell: ({ getValue, table }: CellContext<BranchOrder, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-primary-600 dark:text-primary-400 whitespace-nowrap">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<BranchOrder, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "items", accessorKey: "items", header: "Items",
      cell: ({ getValue }: CellContext<BranchOrder, unknown>) => (
        <span className="text-center font-medium text-gray-800 dark:text-dark-100">{String(getValue() ?? "0")}</span>
      ),
    },
    {
      id: "totalQty", accessorKey: "totalQty", header: "Total Qty",
      cell: ({ getValue }: CellContext<BranchOrder, unknown>) => (
        <span className="text-center font-semibold text-gray-800 dark:text-dark-100 tabular-nums">{String(getValue() ?? "0")}</span>
      ),
    },
    {
      id: "note", accessorKey: "note", header: "Note",
      cell: ({ getValue }: CellContext<BranchOrder, unknown>) => (
        <span className="max-w-[150px] truncate block text-gray-500 dark:text-dark-300">
          {String(getValue() ?? "") || "—"}
        </span>
      ),
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      cell: ({ getValue }: CellContext<BranchOrder, unknown>) => {
        const v = String(getValue() ?? "");
        const s = getOrderStatusStyle(v);
        return (
          <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", s.bg, s.text)}>
            {v.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      id: "actions", header: "Action", size: 60, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<BranchOrder, unknown>) => (
        <div className="flex justify-center">
          <Button isIcon variant="flat" className="size-8 rounded-full"
            onClick={() => navigate(`/order-management/order-items/${row.original.id}`)}
            title="View Detail">
            <EyeIcon className="size-4" />
          </Button>
        </div>
      ),
    },
  ], [navigate, page]);

  const table = useReactTable({
    data: filteredByStatus,
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
    <Page title="Order Request Register">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Order Request Register
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Showing{" "}
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}of{" "}
              <span className="font-semibold text-gray-800 dark:text-dark-100">{total}</span>{" "}
              order records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => setShowFilter(v => !v)}>
              <FunnelIcon className={clsx("size-4", showFilter && "text-primary")} />
              <span>Filters</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => fetchOrders(page)} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => navigate("/order-management/order-items/new")}>
              <PlusIcon className="size-4" />
              <span>New Order</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-(--margin-x) mt-2 max-w-sm">
          <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search order ID, status..." />
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">Status</p>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUS_FILTERS.map(f => (
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
          </div>
        )}

        {/* Table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading orders..." : "No orders found."}
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
