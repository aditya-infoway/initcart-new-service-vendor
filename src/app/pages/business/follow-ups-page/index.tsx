import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, FunnelIcon,
  MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { formatDateDDMMYYYY } from "@/ApiHelper";
import { FollowUpDrawer } from "./FollowUpDrawer";
import { FollowUp } from "./data";
import { ConfirmModal, type ConfirmMessages, type ModalState } from "@/components/shared/ConfirmModal";

// ── Confirm messages ───────────────────────────────────────────────────────
const confirmMessages: ConfirmMessages = {
  pending: {
    title: "Delete Follow-up",
    description: "Are you sure you want to delete this follow-up? This action cannot be undone.",
    actionText: "Delete",
  },
  success: { title: "Follow-up Deleted", description: "The follow-up has been deleted successfully.", actionText: "Done" },
  error: { title: "Delete Failed", description: "Failed to delete the follow-up. Please try again.", actionText: "Retry" },
};

// ── Row actions ─────────────────────────────────────────────────────────────
function FollowUpRowActions({ followUp, onEdit, onDelete }: {
  followUp: FollowUp;
  onEdit: (f: FollowUp) => void;
  onDelete: (f: FollowUp) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outlined"
        size="sm"
        onClick={() => onEdit(followUp)}
        className="gap-1.5"
      >
        <PencilIcon className="size-4.5" />
        Edit
      </Button>
      <Button
        variant="outlined"
        size="sm"
        onClick={() => onDelete(followUp)}
        className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <TrashIcon className="size-4.5" />
        Delete
      </Button>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function FollowUpsPage() {
  const [data, setData] = useState<FollowUp[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filterName, setFilterName] = useState("");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FollowUp | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<"pending" | "success" | "error">("pending");

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!filterName.trim()) return data;
    return data.filter((f) =>
      f.customerName.toLowerCase().includes(filterName.toLowerCase()) ||
      f.followupType.toLowerCase().includes(filterName.toLowerCase())
    );
  }, [data, filterName]);

  // ── Table columns ───────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<FollowUp>[]>(() => [
    {
      accessorKey: "followupId",
      header: "Follow-up ID",
      cell: (info) => (
        <div className="font-medium text-gray-800 dark:text-dark-100">
          {globalFilter ? <Highlight query={globalFilter}>{info.getValue<string>()}</Highlight> : info.getValue<string>()}
        </div>
      ),
    },
    {
      accessorKey: "inquiryId",
      header: "Inquiry ID",
      cell: (info) => (
        <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: (info) => (
        <div className="font-medium text-gray-800 dark:text-dark-100">
          {globalFilter ? <Highlight query={globalFilter}>{info.getValue<string>()}</Highlight> : info.getValue<string>()}
        </div>
      ),
    },
    {
      accessorKey: "followupDate",
      header: "Follow-up Date",
      cell: (info) => (
        <span className="text-gray-600 dark:text-dark-300">{formatDateDDMMYYYY(info.getValue<string>())}</span>
      ),
    },
    {
      accessorKey: "followupType",
      header: "Follow-up Type",
      cell: (info) => (
        <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => {
        const status = info.getValue<string>();
        return (
          <Badge
            color={status === "Completed" ? "success" : status === "Pending" ? "warning" : "error"}
            variant="soft"
            className="capitalize"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <FollowUpRowActions
          followUp={info.row.original}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
  ], [globalFilter]);

  // ── Table instance ───────────────────────────────────────────────────────
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: fuzzyFilter,
    initialState: { pagination: { pageSize: 10 } },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingFollowUp(null);
    setDrawerOpen(true);
  };

  const handleEdit = (followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    setDrawerOpen(true);
  };

  const handleDelete = (followUp: FollowUp) => {
    setDeleteTarget(followUp);
    setDeleteOpen(true);
    setDeleteState("pending");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      // Local state deletion (same as old admin)
      setData((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteState("success");
      toastsuccessmsg("Follow-up deleted successfully.");
    } catch {
      setDeleteState("error");
      toasterrormsg("Failed to delete follow-up.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingFollowUp(null);
  };

  const handleDrawerSaved = (savedFollowUp: FollowUp) => {
    if (editingFollowUp) {
      // Update existing
      setData((prev) => prev.map((f) => f.id === savedFollowUp.id ? savedFollowUp : f));
      toastsuccessmsg("Follow-up updated successfully.");
    } else {
      // Add new
      setData((prev) => [savedFollowUp, ...prev]);
      toastsuccessmsg("Follow-up added successfully.");
    }
    handleDrawerClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Page>
      <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">Follow-ups Page</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">View and manage customer follow-ups</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleAdd} color="primary" className="gap-2">
              <PlusIcon className="size-4.5" />
              <span>Add Follow-up</span>
            </Button>
            <Button
              variant="outlined"
              className="gap-2"
              onClick={() => setData([])}
            >
              <ArrowPathIcon className="size-4.5" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outlined"
              isIcon
              onClick={() => setShowFilter(!showFilter)}
              className={clsx(
                "h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 focus:border-primary focus:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600 dark:hover:text-dark-100",
                showFilter && "bg-gray-100 dark:bg-dark-600"
              )}
            >
              <FunnelIcon className="size-4.5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search follow-ups..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4.5 text-gray-400" />}
            className="w-full max-w-md"
          />
        </div>

        {/* Filter */}
        {showFilter && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-700">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Filter by name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="flex-1"
              />
              <Button variant="outlined" onClick={() => setFilterName("")}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-600">
                <tr>
                  {table.getHeaderGroups().map((headerGroup) =>
                    headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-dark-200"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={clsx(
                              header.column.getCanSort() && "cursor-pointer select-none hover:text-primary",
                              "flex items-center gap-2"
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc" && <span>↑</span>}
                            {header.column.getIsSorted() === "desc" && <span>↓</span>}
                          </div>
                        )}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-12 text-center text-gray-500">
                      No follow-ups found
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-200 dark:border-dark-500"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4 dark:border-dark-500">
            <div className="text-sm text-gray-600 dark:text-dark-300">
              Showing {table.getState().pagination.pageSize} of {filteredData.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <FollowUpDrawer
        isOpen={drawerOpen}
        close={handleDrawerClose}
        followUp={editingFollowUp}
        onSaved={handleDrawerSaved}
      />

      {/* Delete Modal */}
      <ConfirmModal
        show={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onOk={handleDeleteConfirm}
        state={deleteState}
        confirmLoading={deleteLoading}
        messages={confirmMessages}
      />
    </Page>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function flexRender(...args: any[]) {
  const [component, props] = args;
  if (typeof component === "function") {
    return component(props);
  }
  return component;
}
