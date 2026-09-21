// Import Dependencies
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
  CellContext,
  RowSelectionState,
} from "@tanstack/react-table";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import {
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Badge, Button } from "@/components/ui";
import { Delete, Get, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import {
  ConfirmModal,
  type ConfirmMessages,
} from "@/components/shared/ConfirmModal";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Branch, mapApiBranch } from "./data";
import { BranchDrawer } from "./BranchDrawer";
import { BranchViewModal } from "./BranchViewModal";
import { formatDateDDMMYYYY } from "@/ApiHelper";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ----------------------------------------------------------------------

const confirmMessages: ConfirmMessages = {
  pending: {
    title: "Delete Branch",
    description: "Are you sure you want to delete this branch? This action cannot be undone.",
    actionText: "Delete",
  },
  success: { title: "Branch Deleted", description: "The branch has been deleted successfully." },
  error: { title: "Delete Failed", description: "Failed to delete the branch. Please try again." },
};

// ── Row actions 3-dot ──────────────────────────────────────────────────────
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
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton as={Button} isIcon className="size-8 rounded-full">
        <EllipsisHorizontalIcon className="size-4.5" />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out"
        enterFrom="opacity-0 translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-2"
      >
        <MenuItems
          anchor={{ to: "bottom end", gap: 8 }}
          className="dark:border-dark-500 dark:bg-dark-750 absolute z-100 w-[10rem] rounded-lg border border-gray-300 bg-white py-1 shadow-lg shadow-gray-200/50 outline-hidden dark:shadow-none"
        >
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={() => onView(branch)}
                className={clsx(
                  "flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-dark-100",
                )}
              >
                <EyeIcon className="size-4.5 stroke-1" />
                <span>View</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={() => onEdit(branch)}
                className={clsx(
                  "flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-dark-100",
                )}
              >
                <PencilIcon className="size-4.5 stroke-1" />
                <span>Edit</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={() => onDelete(branch)}
                className={clsx(
                  "this:error text-this dark:text-this-light flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-this/10 dark:bg-this-light/10",
                )}
              >
                <TrashIcon className="size-4.5 stroke-1" />
                <span>Delete</span>
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function BranchMasterPage() {
  const [data, setData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "branchName", desc: false }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // View modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingBranch, setViewingBranch] = useState<Branch | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await Get("pos/branches/", {}, false)) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.results)
        ? body.results
        : Array.isArray(body)
        ? body
        : [];
      setData(rows.map(mapApiBranch));
    } catch {
      toasterrormsg("Failed to fetch branches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // ── Handlers ──────────────────────────────────────────────────────────
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
      await Delete(`pos/branches/${deleteTarget.id}/`, {}, false);
      toastsuccessmsg("Branch deleted successfully.");
      setData((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteSuccess(true);
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.detail || e?.response?.data?.message || "Failed to delete.");
      setDeleteError(true);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget]);

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Branch>[]>(
    () => [
      { id: "select", header: SelectHeader, cell: SelectCell, enableSorting: false, enableGlobalFilter: false },
      {
        id: "srNo", header: "#", size: 60,
        cell: ({ row }: CellContext<Branch, unknown>) => (
          <span className="text-gray-800 dark:text-dark-100">{row.index + 1}</span>
        ),
        enableSorting: false, enableGlobalFilter: false,
      },
      {
        id: "logo", header: "Logo", size: 60,
        cell: ({ row }: CellContext<Branch, unknown>) => {
          const { branchLogo, branchName } = row.original;
          if (branchLogo) {
            return (
              <img
                src={branchLogo}
                alt={branchName}
                className="size-9 rounded-full object-cover border border-gray-200 dark:border-dark-500"
              />
            );
          }
          return (
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              {branchName?.charAt(0).toUpperCase() ?? "B"}
            </div>
          );
        },
        enableSorting: false, enableGlobalFilter: false,
      },
      {
        id: "branchName", accessorKey: "branchName", header: "Branch Name",
        cell: ({ getValue, table }: CellContext<Branch, unknown>) => {
          const q = ensureString(table.getState().globalFilter);
          return (
            <span className="font-medium text-gray-900 dark:text-white">
              <Highlight query={q}>{String(getValue() || "—")}</Highlight>
            </span>
          );
        },
      },
      {
        id: "ownerName", accessorKey: "ownerName", header: "Owner Name",
        cell: ({ getValue }: CellContext<Branch, unknown>) => (
          <span className="text-gray-700 dark:text-dark-100">{String(getValue() || "—")}</span>
        ),
      },
      {
        id: "email", accessorKey: "email", header: "Email ID",
        cell: ({ getValue }: CellContext<Branch, unknown>) => (
          <span className="text-gray-600 dark:text-dark-200">{String(getValue() || "—")}</span>
        ),
      },
      {
        id: "phone", accessorKey: "phone", header: "Phone No.",
        cell: ({ getValue }: CellContext<Branch, unknown>) => {
          const v = String(getValue() || "");
          if (!v) return <span className="text-gray-400">—</span>;
          return (
            <a href={`tel:${v}`} className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
              {v}
            </a>
          );
        },
      },
      {
        id: "branchType", accessorKey: "branchType", header: "Type",
        cell: ({ getValue }: CellContext<Branch, unknown>) => {
          const v = String(getValue() || "");
          return <Badge color="primary" variant="soft">{v.charAt(0).toUpperCase() + v.slice(1)}</Badge>;
        },
      },
      {
        id: "status", accessorKey: "status", header: "Status",
        cell: ({ getValue }: CellContext<Branch, unknown>) => {
          const v = String(getValue() || "");
          return (
            <Badge color={v === "active" ? "success" : "error"} variant="soft">
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Badge>
          );
        },
      },
      {
        id: "createdAt", accessorKey: "createdAt", header: "Created Date",
        cell: ({ getValue }: CellContext<Branch, unknown>) => (
          <span className="text-gray-500 dark:text-dark-300">
            {formatDateDDMMYYYY(String(getValue() || ""))}
          </span>
        ),
      },
      {
        id: "actions", header: "Action", size: 60,
        enableSorting: false, enableGlobalFilter: false,
        cell: ({ row }: CellContext<Branch, unknown>) => (
          <div className="flex justify-center">
            <BranchRowActions
              branch={row.original}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
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
  });

  const deleteState = deleteError ? "error" : deleteSuccess ? "success" : "pending";

  return (
    <Page title="Branch Master">
      <div className="transition-content w-full pb-5">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Branch Master
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              {data.length} branch{data.length === 1 ? "" : "es"} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search branches..."
              className="h-9 w-52 rounded-lg border border-gray-300 bg-white px-3 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            />
            <Button
              variant="outlined"
              className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchBranches}
              disabled={loading}
            >
              <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              color="primary"
              className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => { setEditingBranch(null); setDrawerOpen(true); }}
            >
              <PlusIcon className="size-4" />
              Add Branch
            </Button>
          </div>
        </div>

        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading branches..." : "No branches found. Click + Add Branch to create one."}
        />
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
        onOk={handleDelete}
        confirmLoading={deleteLoading}
        state={deleteState}
      />
    </Page>
  );
}
