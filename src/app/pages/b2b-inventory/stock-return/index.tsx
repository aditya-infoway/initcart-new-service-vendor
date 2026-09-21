import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
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
import { Badge, Button, Input } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
interface ReturnListItem {
  id: number;
  return_no: string;
  branch_name: string;
  to_branch_name: string;
  return_date: string;
  status: string;
  item_count: number;
  total_quantity: number;
  note: string;
  created_at: string;
  source_b2b_transfer_no: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  packaging_ready: "Packaging Ready",
  approved: "Approved",
  received: "Received",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "info",
  packaging_ready: "primary",
  approved: "success",
  received: "success",
  rejected: "error",
  cancelled: "neutral",
};

// ── Main list page ─────────────────────────────────────────────────────────
export default function B2BStockReturnPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<ReturnListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<{ label: string; value: string } | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/b2b-stock-returns/", { page: 1, page_size: 1000 }) as any;
      const data = res?.data?.results?.data ?? res?.data?.data ?? res?.data?.results ?? res?.data ?? res ?? [];
      const items = Array.isArray(data) ? data : [];
      setRows(items);
    } catch {
      toasterrormsg("Could not load B2B stock returns.");
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
      id: "source_b2b_transfer_no", accessorKey: "source_b2b_transfer_no", header: "Source Transfer",
      cell: ({ getValue }: CellContext<ReturnListItem, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300 text-xs">
          {String(getValue() ?? "") || "—"}
        </span>
      ),
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
        <Badge color="neutral" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "total_quantity", accessorKey: "total_quantity", header: "Total Qty",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<ReturnListItem, unknown>) => (
        <Badge color="primary" variant="soft" className="text-xs">
          {String(getValue() ?? 0)}
        </Badge>
      ),
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<ReturnListItem, unknown>) => {
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
      cell: ({ row }: CellContext<ReturnListItem, unknown>) => (
        <Button isIcon variant="flat" className="size-8 rounded-full"
          title="View Detail"
          onClick={() => navigate(`/b2b-inventory/stock-return/detail/${row.original.id}`)}>
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
    <Page title="B2B Stock Return">
      <div className="transition-content w-full pb-8">
        {/* Header */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <DocumentCheckIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-dark-100">B2B Stock Return</h1>
              <p className="text-xs text-gray-500 dark:text-dark-400">Return branch-to-branch received items back to company</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/b2b-inventory/stock-return/create")}
            color="primary"
            className="flex items-center gap-2"
          >
            <PlusIcon className="size-4" /> New Return
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="px-(--margin-x) flex flex-wrap gap-3 items-center mt-2">
          <div className="relative flex-1 min-w-[250px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search by Return No, Branch..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
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
            onClick={() => setShowFilters(!showFilters)}
            variant="soft"
            color={showFilters || statusFilter?.value ? "primary" : "neutral"}
            className="flex items-center gap-2"
          >
            <FunnelIcon className="size-4" /> Filters
            {statusFilter?.value && <Badge color="error" variant="soft" className="text-[10px]">1</Badge>}
          </Button>

          {statusFilter?.value && (
            <Button
              onClick={() => { setStatusFilter(null); setShowFilters(false); }}
              color="error"
              variant="soft"
              className="flex items-center gap-2"
            >
              <XMarkIcon className="size-4" /> Clear
            </Button>
          )}

          <Button
            onClick={fetchRows}
            color="neutral"
            variant="soft"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="size-4" /> Refresh
          </Button>
        </div>

        {showFilters && (
          <div className="px-(--margin-x) mt-3">
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Combobox
                  label="Status"
                  value={statusFilter}
                  onChange={(item: any) => setStatusFilter(item)}
                  data={[
                    { label: "All Status", value: "" },
                    ...Object.entries(STATUS_LABEL).map(([k, v]) => ({ label: v, value: k })),
                  ]}
                  displayField="label"
                  searchFields={["label"]}
                  by="value"
                />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading B2B returns…" : "No B2B return records found"}
        />
      </div>
    </Page>
  );
}
