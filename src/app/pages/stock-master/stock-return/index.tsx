import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, EyeIcon, FunnelIcon,
  MagnifyingGlassIcon, PlusIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import {
  STATUS_LABEL, STATUS_COLOR, ReturnListItem, extractListRows,
} from "./data";

// ── Main list page ─────────────────────────────────────────────────────────
export default function StockReturnPage() {
  const navigate = useNavigate();

  const [rows, setRows]                 = useState<ReturnListItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters]   = useState(false);
  const [statusFilter, setStatusFilter] = useState<{ label: string; value: string } | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await Get("pos/stock-returns/", { page: 1, page_size: 1000 }) as any;
      const data = extractListRows(res);
      setRows(data);
    } catch {
      toasterrormsg("Could not load stock returns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!statusFilter?.value) return rows;
    return rows.filter(r => r.status === statusFilter.value);
  }, [rows, statusFilter]);

  const columns = useMemo<ColumnDef<ReturnListItem>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<ReturnListItem, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "return_no", accessorKey: "return_no", header: "Return No",
      cell: ({ getValue, table }: CellContext<ReturnListItem, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap font-medium text-primary-600 dark:text-primary-400  text-xs">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "to_branch_name", accessorKey: "to_branch_name", header: "To Branch",
      cell: ({ getValue, table }: CellContext<ReturnListItem, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="text-gray-700 dark:text-dark-200">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "return_date", accessorKey: "return_date", header: "Return Date",
      cell: ({ getValue }: CellContext<ReturnListItem, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "item_count", accessorKey: "item_count", header: "Items",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<ReturnListItem, unknown>) => (
        <Badge color="primary" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "total_quantity", accessorKey: "total_quantity", header: "Total Qty",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<ReturnListItem, unknown>) => (
        <Badge color="info" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "note", accessorKey: "note", header: "Note",
      cell: ({ getValue }: CellContext<ReturnListItem, unknown>) => (
        <span className="block max-w-[160px] truncate text-gray-500 dark:text-dark-300 text-xs">
          {String(getValue() ?? "") || "—"}
        </span>
      ),
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<ReturnListItem, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <Badge color={STATUS_COLOR[v] ?? "primary"} variant="soft" className="whitespace-nowrap text-xs">
            {STATUS_LABEL[v] ?? v}
          </Badge>
        );
      },
    },
    {
      id: "actions", header: "Action",
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<ReturnListItem, unknown>) => (
        <Button isIcon variant="flat" className="size-8 rounded-full"
          title="View Detail"
          onClick={() => navigate(`/order-management/stock-return/${row.original.id}`)}>
          <EyeIcon className="size-4" />
        </Button>
      ),
    },
  ], [navigate]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    getRowId: row => String(row.id),
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

  const hasActiveFilters = !!statusFilter?.value;

  return (
    <Page title="Stock Return Register">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Stock Return Register
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}records
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
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">1</span>
              )}
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchRows} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => navigate("/order-management/stock-return")}>
              <PlusIcon className="size-4" />
              <span>New Return</span>
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-(--margin-x) mt-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Combobox
                  label="Status"
                  value={statusFilter}
                  onChange={(item: any) => setStatusFilter(item)}
                  data={[
                    { label: "All Status",       value: "" },
                    { label: "Pending",          value: "pending" },
                    { label: "Packaging Ready",  value: "packaging_ready" },
                    { label: "Approved",         value: "approved" },
                    { label: "Received",         value: "received" },
                    { label: "Rejected",         value: "rejected" },
                    { label: "Cancelled",        value: "cancelled" },
                  ]}
                  displayField="label"
                  searchFields={["label"]}
                  by="value"
                />
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button
                    variant="outlined"
                    className="h-8 gap-1.5 rounded-md px-3 text-xs text-error-600 border-error-300 hover:bg-error-50 dark:border-error-800 dark:hover:bg-error-900/20"
                    onClick={() => setStatusFilter(null)}>
                    <XMarkIcon className="size-3.5" /> Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search by Return No, Branch…"
          />
        </div>

        {/* Table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading stock returns…" : "No stock returns found."}
        />
      </div>
    </Page>
  );
}
