import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable, flexRender,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, EyeIcon, FunnelIcon,
  MagnifyingGlassIcon, XMarkIcon, DocumentCheckIcon,
  CubeIcon, BuildingOfficeIcon, ExclamationTriangleIcon, CheckCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Table, THead, TBody, Tr, Th, Td, Card } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
interface B2BPurchaseItem {
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

interface B2BPurchase {
  id: number;
  sale_no: string;
  from_branch_name: string;
  to_branch_name: string;
  sale_date: string;
  status: string;
  verification_status: "verified" | "pending";
  item_count: number;
  pending_count: number;
  total_quantity: number;
  items?: B2BPurchaseItem[];
  note?: string;
  created_at: string;
}

const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  verified: "Verified",
  pending: "Pending",
};

const VERIFICATION_STATUS_COLOR: Record<string, string> = {
  verified: "success",
  pending: "warning",
};

// ── Main list page ─────────────────────────────────────────────────────────
export default function B2BPurchaseVerificationPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<B2BPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState("");
  const [verificationFilterObj, setVerificationFilterObj] = useState<any>(null);

  const VERIFICATION_OPTIONS = [
    { value: "", label: "All Status" },
    { value: "verified", label: "Verified" },
    { value: "pending", label: "Pending" },
  ];

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let page = 1;
      let all: B2BPurchase[] = [];
      while (true) {
        const res = await Get("pos/b2b-sales/pending-verification/", { page: page, page_size: 1000 }) as any;
        const results = res?.data?.results?.data ?? res?.data?.data ?? res?.data?.results ?? res?.data ?? res;
        const arr: B2BPurchase[] = Array.isArray(results) ? results : [];
        all = all.concat(arr);
        const hasNext = res?.data?.next;
        if (!hasNext || arr.length === 0) break;
        page++;
        if (page > 200) break;
      }
      
      // Map to consistent format
      const mappedPurchases = all.map((item: any) => ({
        id: item.id,
        sale_no: item.sale_no,
        from_branch_name: item.from_branch_name || item.from_branch?.branch_name || "-",
        to_branch_name: item.to_branch_name || item.to_branch?.branch_name || "-",
        sale_date: item.sale_date,
        status: item.status || "pending",
        verification_status: item.verification_status || "pending",
        item_count: item.item_count || item.items?.length || 0,
        pending_count: item.pending_count || 0,
        total_quantity: item.total_quantity || 0,
        items: item.items || [],
        note: item.note,
        created_at: item.created_at,
      }));
      
      setRows(mappedPurchases);
    } catch {
      toasterrormsg("Could not load B2B Purchase Verification.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!verificationFilterObj?.value) return rows;
    return rows.filter(r => r.verification_status === verificationFilterObj.value);
  }, [rows, verificationFilterObj]);

  const counters = useMemo(() => ({
    total: rows.length,
    pending: rows.filter(r => r.verification_status === "pending").length,
    verified: rows.filter(r => r.verification_status === "verified").length,
    totalItems: rows.reduce((sum, r) => sum + (r.item_count || 0), 0),
    totalQty: rows.reduce((sum, r) => sum + (r.total_quantity || 0), 0),
  }), [rows]);

  const columns = useMemo<ColumnDef<B2BPurchase>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<B2BPurchase, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "sale_no", accessorKey: "sale_no", header: "Sale No",
      cell: ({ getValue, table }: CellContext<B2BPurchase, unknown>) => {
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
      cell: ({ getValue, table }: CellContext<B2BPurchase, unknown>) => {
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
      cell: ({ getValue, table }: CellContext<B2BPurchase, unknown>) => {
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
      cell: ({ getValue }: CellContext<B2BPurchase, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "item_count", accessorKey: "item_count", header: "Items",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<B2BPurchase, unknown>) => (
        <Badge color="neutral" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "total_quantity", accessorKey: "total_quantity", header: "Total Qty",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<B2BPurchase, unknown>) => (
        <Badge color="info" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "pending_count", accessorKey: "pending_count", header: "Pending",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<B2BPurchase, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <Badge color={v > 0 ? "warning" : "success"} variant="soft" className="text-xs">
            {v}
          </Badge>
        );
      },
    },
    {
      id: "verification_status", accessorKey: "verification_status", header: "Verification Status",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<B2BPurchase, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <Badge color={(VERIFICATION_STATUS_COLOR[v] as any) ?? "primary"} variant="soft" className="whitespace-nowrap text-xs">
            {VERIFICATION_STATUS_LABEL[v] ?? v}
          </Badge>
        );
      },
    },
    {
      id: "actions", header: "Action",
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<B2BPurchase, unknown>) => {
        const isVerified = row.original.verification_status === "verified";
        return (
          <Button 
            variant={isVerified ? "flat" : "soft"} 
            color={isVerified ? "neutral" : "primary"}
            className="h-7 px-3 text-xs gap-1.5 rounded-lg"
            onClick={() => navigate(`/purchase/b2b-purchase-verification/detail/${row.original.id}`)}
          >
            {isVerified ? (
              <>
                <EyeIcon className="size-3.5" /> View
              </>
            ) : (
              <>
                <DocumentCheckIcon className="size-3.5" /> Verify
              </>
            )}
          </Button>
        );
      },
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
    <Page title="B2B Purchase Verification">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              B2B Purchase Verification
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Showing{" "}
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}of{" "}
              <span className="font-semibold text-gray-800 dark:text-dark-100">{rows.length}</span>{" "}
              purchases
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => setShowFilters(v => !v)}>
              <FunnelIcon className={clsx("size-4", showFilters && "text-primary")} />
              <span>Filters</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchRows} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total",     value: counters.total,     bg: "bg-gradient-to-br from-primary-500 to-primary-700",    Icon: DocumentTextIcon },
            { label: "Pending",   value: counters.pending,   bg: "bg-gradient-to-br from-amber-500 to-amber-600",        Icon: ExclamationTriangleIcon },
            { label: "Verified",  value: counters.verified,  bg: "bg-gradient-to-br from-emerald-500 to-emerald-700",    Icon: CheckCircleIcon },
            { label: "Total Items", value: counters.totalItems, bg: "bg-gradient-to-br from-blue-500 to-blue-700",      Icon: CubeIcon },
            { label: "Total Qty", value: counters.totalQty,   bg: "bg-gradient-to-br from-purple-500 to-purple-700",    Icon: BuildingOfficeIcon },
          ].map(({ label, value, bg, Icon }) => (
            <div key={label} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bg)}>
              <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
              <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                <Icon className="size-4 text-white" />
              </div>
              <p className="text-xl font-bold tabular-nums">{value}</p>
              <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="px-(--margin-x) mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search sale no. or branch..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          {showFilters && (
            <div className="flex items-center gap-2">
              <Combobox
                data={VERIFICATION_OPTIONS}
                displayField="label"
                searchFields={["label"]}
                value={verificationFilterObj}
                onChange={(item: any) => setVerificationFilterObj(item ?? VERIFICATION_OPTIONS[0])}
                placeholder="All Status"
                className="w-40"
              />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="px-(--margin-x) mt-4">
          <Card className="overflow-hidden">
            {loading ? (
              <div className="py-16 text-center">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                <p className="text-gray-400 dark:text-dark-400 text-sm">Loading B2B purchases...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-dark-400">
                <CubeIcon className="mx-auto mb-2 size-8 opacity-30" />
                <p className="text-sm">No B2B purchases found</p>
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
                          <Td key={cell.id} className="px-4 py-3">
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
              <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-dark-400">
                  Showing {table.getState().pagination.pageSize * table.getState().pagination.pageIndex + 1}–{Math.min(
                    (table.getState().pagination.pageSize * table.getState().pagination.pageIndex) + table.getState().pagination.pageSize,
                    filtered.length
                  )} of {filtered.length} purchases
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outlined"
                    className="h-8 px-3 text-xs"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outlined"
                    className="h-8 px-3 text-xs"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
