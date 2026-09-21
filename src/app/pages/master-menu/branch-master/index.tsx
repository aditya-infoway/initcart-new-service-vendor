import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, BuildingStorefrontIcon, DocumentArrowDownIcon,
  EyeIcon, FunnelIcon, MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import {
  API_URL, formatDateDDMMYYYY, toastsuccessmsg, toasterrormsg,
} from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { ConfirmModal, type ConfirmMessages } from "@/components/shared/ConfirmModal";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import { Branch, STATUS_OPTIONS, mapApiBranch } from "./data";
import { BranchDrawer } from "./BranchDrawer";
import { BranchViewModal } from "./BranchViewModal";

type StatusOption = (typeof STATUS_OPTIONS)[number];

function safeAxiosConfig(isMultipart = false) {
  const token = localStorage.getItem("access") || "";
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": isMultipart ? "multipart/form-data" : "application/json",
    },
  };
}
function safeUrl(path: string) {
  return `${API_URL}${path.replace(/^\/+/, "")}`;
}

export async function safeGet<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
  return (await axios.get(safeUrl(path), { params, ...safeAxiosConfig() })).data as T;
}
export async function safeDelete<T = any>(path: string): Promise<T> {
  return (await axios.delete(safeUrl(path), safeAxiosConfig())).data as T;
}

const confirmMessages: ConfirmMessages = {
  pending: {
    title: "Delete Branch",
    description: "Are you sure you want to delete this branch? This action cannot be undone.",
    actionText: "Delete",
  },
  success: { title: "Branch Deleted", description: "The branch has been deleted successfully.", actionText: "Done" },
  error: { title: "Delete Failed", description: "Failed to delete the branch. Please try again.", actionText: "Retry" },
};

// ── Row actions (3 icons) ──────────────────────────────────────────────────
function BranchRowActions({
  branch,
  onView,
  onEdit,
  onDelete,
}: {
  branch: Branch;
  onView: (b: Branch) => void;
  onEdit: (b: Branch) => void;
  onDelete: (b: Branch) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        title="View"
        onClick={() => onView(branch)}
        className="flex size-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-primary-600 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-primary-400"
      >
        <EyeIcon className="size-4.5 stroke-1" />
      </button>
      <button
        type="button"
        title="Edit"
        onClick={() => onEdit(branch)}
        className="flex size-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-primary-600 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-primary-400"
      >
        <PencilIcon className="size-4.5 stroke-1" />
      </button>
      <button
        type="button"
        title="Delete"
        onClick={() => onDelete(branch)}
        className="flex size-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-dark-200 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        <TrashIcon className="size-4.5 stroke-1" />
      </button>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function BranchMasterPage() {
  const [data, setData] = useState<Branch[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "branchName", desc: false }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilterObj, setStatusFilterObj] = useState(STATUS_OPTIONS[0]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewingBranch, setViewingBranch] = useState<Branch | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const [exporting, setExporting] = useState(false);

  // ── Fetch with pagination params ────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: 1, page_size: 500 };
      if (statusFilterObj.id && statusFilterObj.id !== "all") params.status = statusFilterObj.id;
      const res = (await safeGet("pos/branches/", params)) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.results)
        ? body.results
        : Array.isArray(body)
        ? body
        : [];
      const totalCount =
        typeof body?.count === "number"
          ? body.count
          : typeof body?.total === "number"
          ? body.total
          : rows.length;
      setData(rows.map(mapApiBranch));
      setCount(totalCount);
    } catch (e: any) {
      // Do NOT logout on 401/403/404 — just show empty state + toast on 5xx
      setData([]);
      setCount(0);
      const status = e?.response?.status ?? 0;
      if (status >= 500) {
        toasterrormsg("Could not load branches. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilterObj]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  // ── Status filter effect ───────────────────────────────────────────────
  // (Already baked into fetchBranches deps)

  // ── Handlers ────────────────────────────────────────────────────────────
  const onView = useCallback((b: Branch) => { setViewingBranch(b); setViewOpen(true); }, []);
  const onEdit = useCallback((b: Branch) => { setEditingBranch(b); setDrawerOpen(true); }, []);
  const onDelete = useCallback((b: Branch) => {
    setDeleteTarget(b);
    setDeleteSuccess(false);
    setDeleteError(false);
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await safeDelete(`pos/branches/${deleteTarget.id}/`);
      toastsuccessmsg("Branch deleted successfully.");
      setData((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setCount((c) => Math.max(0, c - 1));
      setDeleteSuccess(true);
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.detail || e?.response?.data?.message || "Failed to delete branch.");
      setDeleteError(true);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget]);

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("access");
      const url = `${API_URL}pos/branches/export/`;
      const resp = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `branches_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
      toastsuccessmsg("Branches exported successfully.");
    } catch {
      // Fallback: generate simple CSV from current data
      try {
        const headers = [
          "#", "Branch Name", "Type", "Business", "Owner", "Email", "Phone",
          "City", "State", "Country", "Status", "Created",
        ];
        const lines: string[] = [headers.join(",")];
        data.forEach((b, i) => {
          const row = [
            String(i + 1),
            `"${b.branchName.replace(/"/g, '""')}"`,
            `"${b.branchType.replace(/"/g, '""')}"`,
            `"${b.businessType}"`,
            `"${b.ownerName.replace(/"/g, '""')}"`,
            `"${b.email}"`,
            `"${b.phone}"`,
            `"${b.city}"`,
            `"${b.state}"`,
            `"${b.country}"`,
            `"${b.status}"`,
            `"${formatDateDDMMYYYY(b.createdAt)}"`,
          ];
          lines.push(row.join(","));
        });
        const csvBlob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const objectUrl = window.URL.createObjectURL(csvBlob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `branches_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(objectUrl);
        toastsuccessmsg("Branches exported as CSV.");
      } catch {
        toasterrormsg("Failed to export branches.");
      }
    } finally {
      setExporting(false);
    }
  }, [data]);

  // ── Columns ─────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Branch>[]>(
    () => [
      { id: "select", header: SelectHeader, cell: SelectCell, enableSorting: false, enableGlobalFilter: false },
      {
        id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
        cell: ({ row }: CellContext<Branch, unknown>) => (
          <span className="text-gray-800 dark:text-dark-100">{row.index + 1}</span>
        ),
      },
      {
        id: "logo", header: "Logo", size: 60, enableSorting: false, enableGlobalFilter: false,
        cell: ({ row }: CellContext<Branch, unknown>) => {
          const { branchLogo, branchName } = row.original;
          if (branchLogo) {
            return (
              <img
                src={branchLogo}
                alt={branchName}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                className="size-9 rounded-full object-cover border border-gray-200 dark:border-dark-500"
              />
            );
          }
          return (
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold dark:bg-primary/20">
              {branchName?.charAt(0).toUpperCase() ?? "B"}
            </div>
          );
        },
      },
      {
        id: "branchName", accessorKey: "branchName", header: "Branch Name",
        cell: ({ getValue, table }: CellContext<Branch, unknown>) => {
          const q = ensureString(table.getState().globalFilter);
          return (
            <span className="font-semibold text-gray-900 dark:text-white">
              <Highlight query={q}>{String(getValue() || "—")}</Highlight>
            </span>
          );
        },
      },
      {
        id: "branchType", accessorKey: "branchType", header: "Type", size: 110,
        cell: ({ getValue }: CellContext<Branch, unknown>) => {
          const v = String(getValue() || "");
          if (!v) return <span className="text-gray-400">—</span>;
          return (
            <Badge color="primary" variant="soft">
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Badge>
          );
        },
      },
      {
        id: "businessType", accessorKey: "businessType", header: "Business", size: 110,
        cell: ({ getValue }: CellContext<Branch, unknown>) => {
          const v = String(getValue() || "branch");
          return (
            <Badge color="info" variant="soft">
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Badge>
          );
        },
      },
      {
        id: "linkedAccount", accessorKey: "linkedAccount", header: "Linked Account", size: 150,
        cell: ({ row }: CellContext<Branch, unknown>) => {
          const { linkedAccount, linkedAccountId } = row.original;
          if (!linkedAccount) return <span className="text-gray-400">—</span>;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-700 dark:text-dark-100 truncate max-w-[120px]">{linkedAccount}</span>
              <Badge
                color={linkedAccountId ? "primary" : "warning"}
                variant="soft"
                className="text-xs shrink-0"
              >
                {linkedAccountId ? "Debitor" : "Creditor"}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "ownerName", accessorKey: "ownerName", header: "Owner",
        cell: ({ getValue, table }: CellContext<Branch, unknown>) => {
          const q = ensureString(table.getState().globalFilter);
          return (
            <span className="text-gray-700 dark:text-dark-100">
              <Highlight query={q}>{String(getValue() || "—")}</Highlight>
            </span>
          );
        },
      },
      {
        id: "email", accessorKey: "email", header: "Email",
        cell: ({ getValue, table }: CellContext<Branch, unknown>) => {
          const q = ensureString(table.getState().globalFilter);
          const v = String(getValue() || "");
          if (!v) return <span className="text-gray-400">—</span>;
          return (
            <span className="text-gray-600 dark:text-dark-200">
              <Highlight query={q}>{v}</Highlight>
            </span>
          );
        },
      },
      {
        id: "phone", accessorKey: "phone", header: "Phone",
        cell: ({ getValue, table }: CellContext<Branch, unknown>) => {
          const q = ensureString(table.getState().globalFilter);
          const v = String(getValue() || "");
          if (!v) return <span className="text-gray-400">—</span>;
          return (
            <a href={`tel:${v}`} className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
              <Highlight query={q}>{v}</Highlight>
            </a>
          );
        },
      },
      {
        id: "city", accessorKey: "city", header: "City",
        cell: ({ getValue, table }: CellContext<Branch, unknown>) => {
          const q = ensureString(table.getState().globalFilter);
          return (
            <span className="text-gray-700 dark:text-dark-100">
              <Highlight query={q}>{String(getValue() || "—")}</Highlight>
            </span>
          );
        },
      },
      {
        id: "status", accessorKey: "status", header: "Status", size: 110,
        cell: ({ getValue }: CellContext<Branch, unknown>) => {
          const v = String(getValue() || "");
          const active = v === "active";
          return (
            <Badge color={active ? "success" : "error"} variant="soft">
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Badge>
          );
        },
      },
      {
        id: "createdAt", accessorKey: "createdAt", header: "Created", size: 120,
        cell: ({ getValue }: CellContext<Branch, unknown>) => (
          <span className="text-gray-500 dark:text-dark-300">
            {formatDateDDMMYYYY(String(getValue() || ""))}
          </span>
        ),
      },
      {
        id: "actions", header: "Actions", size: 130,
        enableSorting: false, enableGlobalFilter: false,
        cell: ({ row }: CellContext<Branch, unknown>) => (
          <BranchRowActions
            branch={row.original}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [onView, onEdit, onDelete],
  );

  const table = useReactTable({
    data,
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
    initialState: { pagination: { pageSize: 15 } },
  });

  const deleteState = deleteError ? "error" : deleteSuccess ? "success" : "pending";

  return (
    <Page title="Branch Master">
      <div className="transition-content w-full pb-5">

        {/* Header / Title */}
        <div className="px-(--margin-x) pt-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
              <BuildingStorefrontIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-wide text-gray-800 dark:text-dark-50">
                Branch Master
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
                {loading ? "Loading branches..." : `${count ?? data.length} branch${(count ?? data.length) === 1 ? "" : "es"} found`}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-(--margin-x) mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
             <div className="w-full max-w-full">
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                prefix={<MagnifyingGlassIcon className="size-4" />}
                classNames={{ input: "ring-primary-500/50 h-9 text-sm focus:ring-3" }}
                placeholder="Search by Name, Owner, Email, Phone, City..."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
           
            {/* <div className="w-44 max-w-full">
              <Combobox
                data={STATUS_OPTIONS}
                value={statusFilterObj}
                onChange={(item: StatusOption | null) => setStatusFilterObj(item ?? STATUS_OPTIONS[0])}
                displayField="label"
                searchFields={["label"]}
                placeholder="Status"
                inputProps={{ className: "h-9 text-sm" }}
              />
            </div> */}
            <Button
              variant="outlined"
              className={clsx("h-9 gap-2 rounded-md px-3 text-sm", showFilter && "border-primary text-primary")}
              onClick={() => setShowFilter((v) => !v)}
            >
              <FunnelIcon className={clsx("size-4", showFilter && "text-primary")} />
              <span>Filter</span>
            </Button>
            <Button
              variant="outlined"
              className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchBranches}
              disabled={loading}
            >
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outlined"
              className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={handleExportExcel}
              disabled={exporting || loading}
            >
              <DocumentArrowDownIcon className={clsx("size-4", exporting && "animate-spin")} />
              <span>Export Excel</span>
            </Button>
            <Button
              color="primary"
              className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => { setEditingBranch(null); setDrawerOpen(true); }}
            >
              <PlusIcon className="size-4" />
              <span>Add Branch</span>
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-dark-200">
                Filter Branches
              </p>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">Status</label>
                  <Combobox
                    data={STATUS_OPTIONS}
                    value={statusFilterObj}
                    onChange={(item: typeof STATUS_OPTIONS[number] | null) => setStatusFilterObj(item ?? STATUS_OPTIONS[0])}
                    displayField="label"
                    searchFields={["label"]}
                    placeholder="Status"
                    inputProps={{ className: "h-9 text-sm" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className=" mt-4">
          <MasterTable
            table={table}
            columnCount={columns.length}
            emptyMessage={loading ? "Loading branches..." : "No branches found. Click + Add Branch to create one."}
          />
        </div>
      </div>

      <BranchDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        branch={editingBranch}
        onSaved={fetchBranches}
      />

      <BranchViewModal
        isOpen={viewOpen}
        close={() => setViewOpen(false)}
        branch={viewingBranch}
      />

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
