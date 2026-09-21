import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable, flexRender,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, EyeIcon, FunnelIcon,
  MagnifyingGlassIcon, PlusIcon, XMarkIcon, DocumentCheckIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
interface OrderListItem {
  id: number;
  order_id: string;
  requesting_branch_name: string;
  source_branch_name: string;
  status: string;
  order_date: string;
  item_count: number;
  total_requested_qty: number;
  note: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending (Awaiting Verification)",
  sent: "Verified",
  no_stock: "No Stock Available",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, "info" | "success" | "warning" | "error"> = {
  pending: "info",
  sent: "success",
  no_stock: "warning",
  cancelled: "error",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

// ── Main list page ─────────────────────────────────────────────────────────
export default function B2BOrderRequestPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilterObj, setStatusFilterObj] = useState<{ value: string; label: string } | null>(STATUS_OPTIONS[0]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/b2b-orders/", { page: 1, page_size: 1000 }) as any;
      const data = res?.data?.results?.orders ?? res?.data?.orders ?? res?.data?.results ?? res?.data ?? res ?? [];
      const items = Array.isArray(data) ? data : [];
      setRows(items);
    } catch {
      toasterrormsg("Could not load B2B orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!statusFilterObj?.value) return rows;
    return rows.filter(r => r.status === statusFilterObj.value);
  }, [rows, statusFilterObj]);

  const columns = useMemo<ColumnDef<OrderListItem>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<OrderListItem, unknown>) => (
        <span className="text-gray-500 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "order_id", accessorKey: "order_id", header: "Order ID",
      cell: ({ getValue, table }: CellContext<OrderListItem, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap font-medium text-primary-600 dark:text-primary-400  text-xs">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "source_branch_name", accessorKey: "source_branch_name", header: "To Branch",
      cell: ({ getValue, table }: CellContext<OrderListItem, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="text-gray-700 dark:text-dark-200">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "order_date", accessorKey: "order_date", header: "Order Date",
      cell: ({ getValue }: CellContext<OrderListItem, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "item_count", accessorKey: "item_count", header: "Items",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<OrderListItem, unknown>) => (
        <Badge color="neutral" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "total_requested_qty", accessorKey: "total_requested_qty", header: "Total Qty",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<OrderListItem, unknown>) => (
        <Badge color="primary" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<OrderListItem, unknown>) => {
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
      cell: ({ row }: CellContext<OrderListItem, unknown>) => (
        <Button isIcon variant="flat" className="size-8 rounded-full"
          title="View Detail"
          onClick={() => navigate(`/b2b-inventory/stock-transfer/send-order/detail/${row.original.id}`)}>
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
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: fuzzyFilter,
  });

  return (
    <Page title="B2B Order Request">
      <div className="transition-content w-full pb-8 space-y-4">
        {/* Header */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <DocumentCheckIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-dark-100">B2B Order Request</h1>
              <p className="text-xs text-gray-500 dark:text-dark-400">Order stock directly from another branch</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/b2b-inventory/stock-transfer/send-order/create")}
            color="primary"
            className="flex items-center gap-2"
          >
            <PlusIcon className="size-4" /> New Order
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="px-(--margin-x) flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[250px]">
            <Input
              value={globalFilter ?? ""}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search by Order ID..."
              prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
              suffix={globalFilter ? (
                <button
                  onClick={() => setGlobalFilter("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="size-4" />
                </button>
              ) : undefined}
            />
          </div>
          <Button
            variant="outlined"
            onClick={() => setShowFilters(!showFilters)}
            className={clsx("gap-2", showFilters && "bg-primary/10 border-primary/30 text-primary")}
          >
            <FunnelIcon className="size-4" /> Filters
          </Button>
          {statusFilterObj?.value && (
            <Button variant="outlined" className="gap-2 text-error-600 border-error-200 hover:bg-error-50" onClick={() => setStatusFilterObj(STATUS_OPTIONS[0])}>
              <XMarkIcon className="size-4" /> Clear Filters
            </Button>
          )}
          <Button variant="outlined" className="gap-2" onClick={fetchRows}>
            <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
          </Button>
        </div>

        {/* Filter Panel
        {showFilters && (
          <div className="px-(--margin-x)">
            <Card skin="bordered" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Combobox
                    data={STATUS_OPTIONS}
                    displayField="label"
                    searchFields={["label"]}
                    label="Status"
                    value={statusFilterObj}
                    onChange={(item: { value: string; label: string } | null) => setStatusFilterObj(item ?? STATUS_OPTIONS[0])}
                  />
                </div>
              </div>
            </Card>
          </div>
        )} */}

        {/* Table */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="overflow-hidden">
            <div className="table-wrapper min-w-full overflow-x-auto">
              <Table hoverable className="w-full text-left">
                <THead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <Tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <Th
                          key={header.id}
                          className={clsx(
                            "dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs",
                            header.column.getCanSort() && "cursor-pointer hover:bg-gray-200 dark:hover:bg-dark-700"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {header.isPlaceholder ? null : (
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: "↑",
                                desc: "↓"
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </Th>
                      ))}
                    </Tr>
                  ))}
                </THead>
                <TBody>
                  {loading ? (
                    <Tr>
                      <Td colSpan={columns.length} className="py-12 text-center text-gray-400 dark:text-dark-400">
                        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                        Loading orders...
                      </Td>
                    </Tr>
                  ) : filtered.length === 0 ? (
                    <Tr>
                      <Td colSpan={columns.length} className="py-12 text-center text-gray-400 dark:text-dark-400">
                        <DocumentCheckIcon className="mx-auto mb-2 size-8 opacity-30" />
                        No orders found
                        <div className="mt-2">
                          <Button variant="flat" className="text-primary-600 text-sm font-semibold" onClick={() => navigate("/b2b-inventory/stock-transfer/send-order/create")}>
                            + Place New Order
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <Tr
                        key={row.id}
                        className={clsx(
                          "dark:border-b-dark-500 border-b border-gray-100",
                          row.getIsSelected() && "bg-primary-500/5 dark:bg-primary-500/10"
                        )}
                      >
                        {row.getVisibleCells().map(cell => (
                          <Td
                            key={cell.id}
                            className="bg-white dark:bg-dark-900"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Td>
                        ))}
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="px-(--margin-x) text-sm text-gray-500 dark:text-dark-400">
          Showing {filtered.length} of {rows.length} orders
          {statusFilterObj?.value && ` with status: ${STATUS_LABEL[statusFilterObj.value]}`}
        </div>
      </div>
    </Page>
  );
}
