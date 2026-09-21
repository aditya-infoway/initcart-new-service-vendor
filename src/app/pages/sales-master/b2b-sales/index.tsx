import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable, flexRender,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, EyeIcon, FunnelIcon,
  MagnifyingGlassIcon, XMarkIcon, DocumentCheckIcon,
  PlusIcon, ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
interface B2BSaleItem {
  id: number;
  from_item_name: string;
  from_variant_info: string;
  from_barcode: string;
  quantity: number;
  rate: number;
  is_stock_updated: boolean;
  tax_percent?: string;
  basic_amount?: number;
  tax_amount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  net_amount?: number;
}

interface B2BSale {
  id: number;
  sale_no: string;
  from_branch_name: string;
  to_branch_name: string;
  sale_date: string;
  status: "pending" | "completed" | "cancelled";
  item_count: number;
  created_at: string;
  items?: B2BSaleItem[];
  note?: string;
  created_by_name?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "warning",
  completed: "success",
  cancelled: "error",
};

// ── Main list page ─────────────────────────────────────────────────────────
export default function B2BSalesPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<B2BSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [statusFilterObj, setStatusFilterObj] = useState<any>(null);

  const STATUS_OPTIONS = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let page = 1;
      let all: B2BSale[] = [];
      while (true) {
        const res = await Get("pos/b2b-sales/", { page: page, page_size: 1000 }) as any;
        const results = res?.data?.results ?? res?.data ?? res;
        const arr: B2BSale[] = Array.isArray(results) ? results : [];
        all = all.concat(arr);
        const hasNext = res?.data?.next;
        if (!hasNext || arr.length === 0) break;
        page++;
        if (page > 200) break;
      }
      
      // Map to consistent format
      const mappedSales = all.map((item: any) => ({
        id: item.id,
        sale_no: item.sale_no,
        from_branch_name: item.from_branch_name || item.from_branch?.branch_name || "-",
        to_branch_name: item.to_branch_name || item.to_branch?.branch_name || "-",
        sale_date: item.sale_date,
        status: item.status || "pending",
        item_count: item.item_count || item.items?.length || 0,
        created_at: item.created_at,
        note: item.note,
        created_by_name: item.created_by_name,
        items: item.items || [],
      }));
      
      setRows(mappedSales);
    } catch {
      toasterrormsg("Could not load B2B sales.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!statusFilterObj?.value) return rows;
    return rows.filter(r => r.status === statusFilterObj.value);
  }, [rows, statusFilterObj]);

  const columns = useMemo<ColumnDef<B2BSale>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<B2BSale, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "sale_no", accessorKey: "sale_no", header: "Sale No",
      cell: ({ getValue, table }: CellContext<B2BSale, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap font-medium text-primary-600 dark:text-primary-400 text-xs">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "from_branch_name", accessorKey: "from_branch_name", header: "From Branch",
      cell: ({ getValue, table }: CellContext<B2BSale, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="text-gray-700 dark:text-dark-200">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "to_branch_name", accessorKey: "to_branch_name", header: "To Branch",
      cell: ({ getValue, table }: CellContext<B2BSale, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="text-gray-700 dark:text-dark-200">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "sale_date", accessorKey: "sale_date", header: "Sale Date",
      cell: ({ getValue }: CellContext<B2BSale, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "item_count", accessorKey: "item_count", header: "Items",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<B2BSale, unknown>) => (
        <Badge color="neutral" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<B2BSale, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <Badge color={(STATUS_COLOR[v] as any) ?? "primary"} variant="soft" className="whitespace-nowrap text-xs">
            {STATUS_LABEL[v] ?? v}
          </Badge>
        );
      },
    },
    {
      id: "actions", header: "Action",
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<B2BSale, unknown>) => (
        <Button isIcon variant="flat" className="size-8 rounded-full"
          title="View Detail"
          onClick={() => navigate(`/sales/b2b-sales/detail/${row.original.id}`)}>
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

  const exportToExcel = () => {
    if (filtered.length === 0) {
      toasterrormsg("No data to export");
      return;
    }
    
    const exportData = filtered.map((sale, index) => ({
      "SR No": index + 1,
      "Sale No": sale.sale_no || "-",
      "From Branch": sale.from_branch_name || "-",
      "To Branch": sale.to_branch_name || "-",
      "Date": sale.sale_date || "-",
      "Status": sale.status || "-",
      "Items": sale.item_count || 0,
      "Created By": sale.created_by_name || "-",
    }));
    
    // Simple CSV export
    const csv = [
      Object.keys(exportData[0]).join(","),
      ...exportData.map(row => Object.values(row).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `B2B_Sales_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toastsuccessmsg(`Exported ${filtered.length} records successfully`);
  };

  return (
    <Page title="B2B Sales">
      <div className="transition-content w-full pb-8">
        {/* Header */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <DocumentCheckIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-dark-100">B2B Sales</h1>
              <p className="text-xs text-gray-500 dark:text-dark-400">Manage branch-to-branch sales</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="gap-2" onClick={exportToExcel}>
              <ArrowDownTrayIcon className="size-4" /> Export
            </Button>
            <Button variant="outlined" className="gap-2" onClick={fetchRows}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
            </Button>
            <Button color="primary" className="gap-2" onClick={() => navigate("/sales/b2b-sales/create")}>
              <PlusIcon className="size-4" /> New B2B Sale
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-(--margin-x) flex flex-wrap gap-3 items-center mt-2">
          <div className="relative flex-1 min-w-[250px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <Input
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search sales..."
              className="pl-10"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "soft" : "outlined"}
            color={showFilters ? "primary" : "neutral"}
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="size-4" /> Filters
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="w-1/2 max-w-xs">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-dark-200 mb-1.5">Status</label>
                  <Combobox
                    data={STATUS_OPTIONS}
                    displayField="label"
                    searchFields={["label"]}
                    value={statusFilterObj}
                    onChange={(item: any) => setStatusFilterObj(item ?? STATUS_OPTIONS[0])}
                    placeholder="All Status"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="px-(--margin-x) mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                <p className="text-gray-400 dark:text-dark-400 text-sm">Loading sales...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-dark-400">
                <DocumentCheckIcon className="mx-auto mb-2 size-8 opacity-30" />
                <p className="text-sm">No sales found</p>
              </div>
            ) : (
              <div className="table-wrapper min-w-full overflow-x-auto">
                <Table hoverable className="w-full text-left">
                  <THead>
                    <Tr>
                      {table.getHeaderGroups().map(headerGroup => (
                        headerGroup.headers.map(header => (
                          <Th
                            key={header.id}
                            className={clsx(
                              "dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap",
                              header.column.getCanSort() && "cursor-pointer hover:bg-gray-200 dark:hover:bg-dark-700"
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.column.columnDef.header as string}
                            {header.column.getIsSorted() === "asc" && " ↑"}
                            {header.column.getIsSorted() === "desc" && " ↓"}
                          </Th>
                        ))
                      ))}
                    </Tr>
                  </THead>
                  <TBody>
                    {table.getRowModel().rows.map(row => (
                      <Tr key={row.id} className="dark:border-b-dark-500 border-b border-gray-100">
                        {row.getVisibleCells().map(cell => (
                          <Td key={cell.id} className="bg-white dark:bg-dark-900">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!loading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-600 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-dark-400">
                  Showing {table.getState().pagination.pageSize * table.getState().pagination.pageIndex + 1}–{Math.min(
                    (table.getState().pagination.pageSize * table.getState().pagination.pageIndex) + table.getState().pagination.pageSize,
                    filtered.length
                  )} of {filtered.length} sales
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outlined"
                    className="h-7 px-3 text-xs"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outlined"
                    className="h-7 px-3 text-xs"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
