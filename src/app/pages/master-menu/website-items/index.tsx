import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
  CellContext,
} from "@tanstack/react-table";
import { WithIcon, type TabItem } from "@/components/ui/Tab";
import {
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
  CubeIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import { Get, Delete, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";
import { ConfirmModal, type ConfirmMessages } from "@/components/shared/ConfirmModal";

// ── Confirm modal messages ─────────────────────────────────────────────────
const confirmMessages: ConfirmMessages = {
  pending: {
    title: "Delete Website Item",
    description: "Are you sure you want to delete this item? This will also remove the linked product from the website and cannot be undone.",
    actionText: "Yes, Delete",
  },
  success: {
    title: "Item Deleted",
    description: "The website item has been deleted successfully.",
  },
  error: {
    title: "Delete Failed",
    description: "Something went wrong while deleting. Please try again.",
  },
};

// ── Types ──────────────────────────────────────────────────────────────────
type WebsiteStatus = "pending" | "approved" | "rejected" | "draft";

interface WebsiteItemRow {
  id: number;
  itemName: string;
  branch_name: string;
  category: string;
  subCategory: string;
  variants_count: number;
  total_stock: number;
  final_price: number;
  website_status: WebsiteStatus;
  main_image: string | null;
  thumbnail_image: string | null;
  platform_charge_percent: number;
  vendor_receivable: number;
  completion_percentage: number;
  linked_product: number | null;
}

interface DashboardStats {
  total_items: number;
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
  total_variants: number;
}

function mapRow(raw: any): WebsiteItemRow {
  return {
    id:                     Number(raw.id ?? 0),
    itemName:               String(raw.itemName ?? raw.item_name ?? ""),
    branch_name:            String(raw.branch_name ?? ""),
    category:               String(raw.category?.name ?? raw.category ?? ""),
    subCategory:            String(raw.subCategory?.name ?? raw.subCategory ?? ""),
    variants_count:         Number(raw.variants_count ?? 0),
    total_stock:            Number(raw.total_stock ?? 0),
    final_price:            Number(raw.final_price ?? 0),
    website_status:         (raw.website_status ?? "draft") as WebsiteStatus,
    main_image:             raw.main_image ?? null,
    thumbnail_image:        raw.thumbnail_image ?? null,
    platform_charge_percent: Number(raw.platform_charge_percent ?? 0),
    vendor_receivable:      Number(raw.vendor_receivable ?? raw.final_price ?? 0),
    completion_percentage:  Number(raw.completion_percentage ?? 0),
    linked_product:         raw.linked_product ?? null,
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace("/api/", "") ?? "http://localhost:8000";

function getFullImageUrl(mediaPath: string | null | undefined): string | null {
  if (!mediaPath) return null;
  if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) return mediaPath;
  if (mediaPath.startsWith("/media/")) return `${API_BASE_URL}${mediaPath}`;
  return `${API_BASE_URL}/media/${mediaPath}`;
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<WebsiteStatus, {
  label: string;
  color: "warning" | "success" | "error" | "neutral";
  variant: "soft";
}> = {
  pending:  { label: "Pending",  color: "warning", variant: "soft" },
  approved: { label: "Approved", color: "success", variant: "soft" },
  rejected: { label: "Rejected", color: "error",   variant: "soft" },
  draft:    { label: "Draft",    color: "neutral",  variant: "soft" },
};

const STATUS_TABS = [
  { key: "all",      label: "All",      icon: GlobeAltIcon },
  { key: "pending",  label: "Pending",  icon: ClockIcon },
  { key: "approved", label: "Approved", icon: CheckCircleIcon },
  { key: "rejected", label: "Rejected", icon: XCircleIcon },
  { key: "draft",    label: "Draft",    icon: DocumentTextIcon },
] as const;

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, gradient,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<any>;
  gradient: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl p-4 text-white shadow-md ${gradient}`}>
      <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
      <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
        <Icon className="size-4 text-white" />
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
    </div>
  );
}

// ── Main List Page ─────────────────────────────────────────────────────────
export default function WebsiteItemsListPage() {
  const navigate = useNavigate();

  const [rows, setRows]                 = useState<WebsiteItemRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [activeTab, setActiveTab]       = useState<string>("all");
  const [page, setPage]                 = useState(1);
  const pageSize                        = 15;
  const [total, setTotal]               = useState(0);

  // delete modal state
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<WebsiteItemRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError,   setDeleteError]   = useState(false);
  const deleteState = deleteError ? "error" : deleteSuccess ? "success" : "pending";

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(globalFilter), 500);
    return () => clearTimeout(t);
  }, [globalFilter]);

  // fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res  = await Get("pos/website-items/dashboard/") as any;
      const body = res?.data ?? res;
      setStats(body);
    } catch {
      // non-critical — stats just won't show
    }
  }, []);

  // fetch items list
  const fetchRows = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: p, page_size: pageSize };
      if (activeTab !== "all") params.status = activeTab;
      if (debouncedFilter)     params.search = debouncedFilter;

      const res  = await Get("pos/website-items/", params) as any;
      const body = res?.data ?? res;
      const items: any[] = body?.items ?? (Array.isArray(body?.results) ? body.results : []);
      setRows(items.map(mapRow));
      setTotal(body?.count ?? items.length);
      setPage(p);
    } catch {
      toasterrormsg("Failed to load website items.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize, activeTab, debouncedFilter]);

  // initial load
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchRows(1); }, [activeTab, debouncedFilter]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const openDelete = useCallback((item: WebsiteItemRow) => {
    setDeleteTarget(item);
    setDeleteSuccess(false);
    setDeleteError(false);
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await Delete(`pos/website-items/${deleteTarget.id}/delete/?delete_product=true`, {});
      toastsuccessmsg("Item deleted successfully.");
      setDeleteSuccess(true);
      fetchRows(page);
      fetchStats();
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.error ?? "Failed to delete item.");
      setDeleteError(true);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, page, fetchRows, fetchStats]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<WebsiteItemRow>[]>(() => [
    {
      id: "srNo",
      header: "#",
      size: 50,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }: CellContext<WebsiteItemRow, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">
          {(page - 1) * pageSize + row.index + 1}
        </span>
      ),
    },
    {
      id: "itemName",
      accessorKey: "itemName",
      header: "Item",
      cell: ({ row, getValue, table }: CellContext<WebsiteItemRow, unknown>) => {
        const q   = ensureString(table.getState().globalFilter);
        const img = getFullImageUrl(row.original.main_image ?? row.original.thumbnail_image);
        return (
          <div className="flex items-center gap-3">
            {img ? (
              <img
                src={img}
                alt={String(getValue() ?? "")}
                className="size-9 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-dark-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/100x100/f0f4f8/94a3b8?text=No+Image";
                }}
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-lg bg-gray-100 ring-1 ring-gray-200 dark:bg-dark-600 dark:ring-dark-500">
                <CubeIcon className="size-4 text-gray-400 dark:text-dark-400" />
              </div>
            )}
            <span className="font-medium text-gray-800 dark:text-dark-100">
              <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
            </span>
          </div>
        );
      },
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ getValue }: CellContext<WebsiteItemRow, unknown>) => (
        <span className="text-gray-600 dark:text-dark-200">{String(getValue() ?? "") || "—"}</span>
      ),
    },
    {
      id: "variants_count",
      accessorKey: "variants_count",
      header: "Variants",
      cell: ({ getValue }: CellContext<WebsiteItemRow, unknown>) => (
        <Badge color="info" variant="soft" className="text-xs">
          {String(getValue() ?? 0)} variant{Number(getValue()) !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      id: "total_stock",
      accessorKey: "total_stock",
      header: "Stock",
      cell: ({ getValue }: CellContext<WebsiteItemRow, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className={clsx("text-sm font-medium", v === 0 ? "text-error-600" : "text-gray-700 dark:text-dark-200")}>
            {v}
          </span>
        );
      },
    },
    {
      id: "final_price",
      accessorKey: "final_price",
      header: "Price",
      cell: ({ getValue }: CellContext<WebsiteItemRow, unknown>) => (
        <span className="font-medium text-gray-800 dark:text-dark-100">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "platform_charge_percent",
      accessorKey: "platform_charge_percent",
      header: "Platform Fee",
      cell: ({ getValue }: CellContext<WebsiteItemRow, unknown>) => {
        const v = Number(getValue() ?? 0);
        return v > 0 ? (
          <Badge color="warning" variant="soft" className="text-xs">{v}%</Badge>
        ) : (
          <span className="text-gray-400 dark:text-dark-500">—</span>
        );
      },
    },
    {
      id: "vendor_receivable",
      accessorKey: "vendor_receivable",
      header: "You Receive",
      cell: ({ getValue }: CellContext<WebsiteItemRow, unknown>) => (
        <span className="font-semibold text-success-600 dark:text-success-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "website_status",
      accessorKey: "website_status",
      header: "Status",
      cell: ({ getValue }: CellContext<WebsiteItemRow, unknown>) => {
        const status = (getValue() ?? "draft") as WebsiteStatus;
        const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
        return (
          <Badge color={cfg.color} variant="soft" className="text-xs capitalize">
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }: CellContext<WebsiteItemRow, unknown>) => (
        <div className="flex items-center gap-2">
          {/* View */}
          <Button
            isIcon
            variant="flat"
            className="size-8 rounded-full"
            title="View Details"
            onClick={() => navigate(`/master-menu/website-items/${row.original.id}`)}
          >
            <EyeIcon className="size-5 text-primary-600" />
          </Button>

          {/* Add Info */}
          <Button
            isIcon
            variant="flat"
            className="size-8 rounded-full"
            title="Add / Edit Product Information"
            onClick={() => navigate(`/master-menu/website-items/${row.original.id}`)}
          >
            <PlusCircleIcon className="size-5 text-purple-600" />
          </Button>

          {/* Edit */}
          <Button
            isIcon
            variant="flat"
            className="size-8 rounded-full"
            title="Edit"
            onClick={() => navigate(`/master-menu/website-items/${row.original.id}`)}
          >
            <PencilSquareIcon className="size-5 text-success-600" />
          </Button>

          {/* Delete */}
          <Button
            isIcon
            variant="flat"
            className="size-8 rounded-full hover:bg-error-50 dark:hover:bg-error-900/20"
            title="Delete"
            onClick={() => openDelete(row.original)}
          >
            <TrashIcon className="size-5 text-error-600" />
          </Button>
        </div>
      ),
    },
  ], [navigate, openDelete, page, pageSize]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter, sorting },
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Page title="Website Items">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Website Products
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Manage items displayed on the website.{" "}
              <span className="font-semibold text-gray-800 dark:text-dark-100">{total}</span>{" "}
              items total
            </p>
          </div>
          <Button
            variant="outlined"
            className="h-9 gap-2 rounded-md px-3 text-sm"
            onClick={() => { fetchRows(1); fetchStats(); }}
            disabled={loading}
          >
            <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div className="px-(--margin-x) mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Items"    value={stats.total_items}    icon={GlobeAltIcon}     gradient="bg-gradient-to-br from-primary-500 to-primary-700"   />
            <StatCard label="Pending"        value={stats.pending}        icon={ClockIcon}         gradient="bg-gradient-to-br from-amber-500 to-amber-600"        />
            <StatCard label="Approved"       value={stats.approved}       icon={CheckCircleIcon}   gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"    />
            <StatCard label="Rejected"       value={stats.rejected}       icon={XCircleIcon}       gradient="bg-gradient-to-br from-rose-500 to-rose-700"          />
            <StatCard label="Draft"          value={stats.draft}          icon={DocumentTextIcon}  gradient="bg-gradient-to-br from-slate-500 to-slate-700"        />
            <StatCard label="Total Variants" value={stats.total_variants} icon={CubeIcon}          gradient="bg-gradient-to-br from-blue-500 to-blue-700"          />
          </div>
        )}

        {/* ── Status Tabs ── */}
        <div className="px-(--margin-x) mt-4">
          <WithIcon
            tabs={STATUS_TABS.map(tab => ({
              id: tab.key,
              title: tab.label,
              icon: tab.icon, // These already have appropriate icons defined
              content: null, // Content is handled separately via activeTab state
            }))}
            selectedIndex={STATUS_TABS.findIndex(t => t.key === activeTab)}
            onChange={(idx) => {
              setActiveTab(STATUS_TABS[idx].key);
              setPage(1);
            }}
            hidePanels={true}
          />
        </div>

        {/* ── Search ── */}
        <div className="px-(--margin-x) mt-3 flex flex-wrap items-end gap-3">
          <div className="max-w-sm flex-1">
            <Input
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4" />}
              classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
              placeholder="Search by item name, category…"
            />
          </div>
          {globalFilter && (
            <Button
              variant="outlined"
              className="h-9 gap-1.5 rounded-md px-3 text-xs text-error-600 border-error-300 hover:bg-error-50 dark:border-error-700 dark:hover:bg-error-900/20"
              onClick={() => setGlobalFilter("")}
            >
              <XMarkIcon className="size-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* ── Info banner ── */}
        <div className="px-(--margin-x) mt-3">
          <div className="rounded-lg border border-info-200 bg-info-50 p-3 dark:border-info-900/40 dark:bg-info-900/10">
            <p className="text-xs text-info-700 dark:text-info-300">
              <span className="font-semibold">Tip:</span> Items with complete information (description,
              images, specifications) are more likely to get approved quickly. Click{" "}
              <span className="font-semibold">View</span> to add missing details.
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading website items…" : "No items found."}
        />

        {/* ── Pagination ── */}
        {total > pageSize && (
          <div className="px-(--margin-x) mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-gray-500 dark:text-dark-300">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outlined"
                className="h-8 px-3 text-xs"
                disabled={page <= 1}
                onClick={() => fetchRows(page - 1)}
              >
                Prev
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let start = Math.max(1, page - 2);
                if (start + 4 > totalPages) start = Math.max(1, totalPages - 4);
                const n = start + i;
                if (n > totalPages) return null;
                return (
                  <Button
                    key={n}
                    variant={n === page ? "filled" : "outlined"}
                    color={n === page ? "primary" : undefined}
                    className="h-8 px-3 text-xs"
                    onClick={() => fetchRows(n)}
                  >
                    {n}
                  </Button>
                );
              })}
              <Button
                variant="outlined"
                className="h-8 px-3 text-xs"
                disabled={page >= totalPages}
                onClick={() => fetchRows(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Modal ── */}
      <ConfirmModal
        show={deleteOpen}
        onClose={() => { if (!deleteLoading) { setDeleteOpen(false); setDeleteTarget(null); } }}
        messages={confirmMessages}
        state={deleteState}
        onOk={handleDelete}
        confirmLoading={deleteLoading}
      />
    </Page>
  );
}
