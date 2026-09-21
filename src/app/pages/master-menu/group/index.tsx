import {
  Menu, MenuButton, MenuItem, MenuItems, Transition,
} from "@headlessui/react";
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, EllipsisHorizontalIcon, FunnelIcon,
  MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { Delete, Get, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { ConfirmModal, type ConfirmMessages } from "@/components/shared/ConfirmModal";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import { formatDateDDMMYYYY } from "@/ApiHelper";
import { Group, mapApiGroup } from "./data";
import { GroupDrawer } from "./GroupDrawer";

// ── Confirm messages ────────────────────────────────────────────────────────
const confirmMessages: ConfirmMessages = {
  pending: {
    title: "Delete Group",
    description: "Are you sure you want to delete this group? This action cannot be undone.",
    actionText: "Delete",
  },
  success: { title: "Group Deleted", description: "The group has been deleted successfully.", actionText: "Done" },
  error: { title: "Delete Failed", description: "Failed to delete the group. Please try again.", actionText: "Retry" },
};

// ── Row actions ─────────────────────────────────────────────────────────────
function GroupRowActions({ group, onEdit, onDelete }: {
  group: Group;
  onEdit: (g: Group) => void;
  onDelete: (g: Group) => void;
}) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton as={Button} isIcon className="size-8 rounded-full">
        <EllipsisHorizontalIcon className="size-4.5" />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0"
        leave="transition ease-in" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-2"
      >
        <MenuItems
          anchor={{ to: "bottom end", gap: 8 }}
          className="dark:border-dark-500 dark:bg-dark-750 absolute z-100 w-36 rounded-lg border border-gray-300 bg-white py-1 shadow-lg outline-hidden"
        >
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button type="button" onClick={() => onEdit(group)}
                className={clsx("flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-dark-100")}>
                <PencilIcon className="size-4.5 stroke-1" /><span>Edit</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button type="button" onClick={() => onDelete(group)}
                className={clsx("this:error text-this dark:text-this-light flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-this/10 dark:bg-this-light/10")}>
                <TrashIcon className="size-4.5 stroke-1" /><span>Delete</span>
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function GroupPage() {
  const [data, setData] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterName, setFilterName] = useState("");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/groups/", { page: 1, page_size: 200 }) as any;
      const body = res?.data ?? res;
      // API wraps results: { count, results: { success, groups: [...] } }
      const rows: any[] =
        Array.isArray(body?.results?.groups) ? body.results.groups :
        Array.isArray(body?.results) ? body.results :
        Array.isArray(body) ? body : [];
      setData(rows.map(mapApiGroup));
    } catch {
      toasterrormsg("Failed to fetch groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!filterName.trim()) return data;
    return data.filter((g) =>
      g.name.toLowerCase().includes(filterName.toLowerCase())
    );
  }, [data, filterName]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onEdit = useCallback((g: Group) => { setEditingGroup(g); setDrawerOpen(true); }, []);
  const onDelete = useCallback((g: Group) => {
    setDeleteTarget(g); setDeleteSuccess(false); setDeleteError(false); setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await Delete(`pos/groups/${deleteTarget.id}/`, {});
      toastsuccessmsg("Group deleted successfully.");
      setData((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteSuccess(true);
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.detail || e?.response?.data?.message || "Failed to delete group.");
      setDeleteError(true);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Group>[]>(() => [
    { id: "select", header: SelectHeader, cell: SelectCell, enableSorting: false, enableGlobalFilter: false },
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<Group, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{row.index + 1}</span>
      ),
    },
    {
      id: "name", accessorKey: "name", header: "Name",
      cell: ({ getValue, table }: CellContext<Group, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-900 dark:text-white">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "description", accessorKey: "description", header: "Description",
      cell: ({ getValue }: CellContext<Group, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{String(getValue() ?? "—") || "—"}</span>
      ),
    },
    {
      id: "createdAt", accessorKey: "createdAt", header: "Created At",
      cell: ({ getValue }: CellContext<Group, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{formatDateDDMMYYYY(String(getValue() ?? ""))}</span>
      ),
    },
    {
      id: "actions", header: "Action", size: 60, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<Group, unknown>) => (
        <div className="flex justify-center">
          <GroupRowActions group={row.original} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ),
    },
  ], [onEdit, onDelete]);

  const table = useReactTable({
    data: filteredData,
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
    <Page title="Manage Groups">
      <div className="transition-content w-full pb-5">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Manage Groups
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              {data.length} group{data.length === 1 ? "" : "s"} found
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              onClick={fetchGroups}
              disabled={loading}
            >
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button
              color="primary"
              className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => { setEditingGroup(null); setDrawerOpen(true); }}
            >
              <PlusIcon className="size-4" />
              <span>Create New Group</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-(--margin-x) mt-2 max-w-sm">
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "ring-primary-500/50 h-9 text-sm focus:ring-3" }}
            placeholder="Search groups..."
          />
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-dark-200">Filter by Name</p>
              <div className="max-w-xs">
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Type group name..."
                  classNames={{ input: "h-9 text-sm" }}
                />
              </div>
              {filterName && (
                <button
                  onClick={() => setFilterName("")}
                  className="mt-2 text-xs text-primary-600 hover:underline dark:text-primary-400"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading groups..." : "No groups found."}
        />
      </div>

      <GroupDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        group={editingGroup}
        onSaved={fetchGroups}
      />

      <ConfirmModal
        show={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        messages={confirmMessages}
        state={deleteState}
        onOk={handleDelete}
        confirmLoading={deleteLoading}
      />
    </Page>
  );
}
