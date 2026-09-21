import {
  Menu, MenuButton, MenuItem, MenuItems, Transition,
} from "@headlessui/react";
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, RowSelectionState,
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
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { ConfirmModal, type ConfirmMessages, type ModalState } from "@/components/shared/ConfirmModal";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { formatDateDDMMYYYY } from "@/ApiHelper";
import { ServiceDrawer } from "./ServiceDrawer";
import { Service } from "./data";

// ── Confirm messages ───────────────────────────────────────────────────────
const confirmMessages: ConfirmMessages = {
  pending: {
    title: "Delete Service",
    description: "Are you sure you want to delete this service? This action cannot be undone.",
    actionText: "Delete",
  },
  success: { title: "Service Deleted", description: "The service has been deleted successfully.", actionText: "Done" },
  error: { title: "Delete Failed", description: "Failed to delete the service. Please try again.", actionText: "Retry" },
};

// ── Row actions ─────────────────────────────────────────────────────────────
function ServiceRowActions({ service, onDelete }: {
  service: Service;
  onDelete: (s: Service) => void;
}) {
  return (
    <Button
      variant="outlined"
      size="sm"
      onClick={() => onDelete(service)}
      className="gap-1.5"
    >
      <TrashIcon className="size-4.5" />
      Delete
    </Button>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function PendingServicesPage() {
  const [data, setData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterName, setFilterName] = useState("");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<"pending" | "success" | "error">("pending");

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("all-services/", { page: 1, page_size: 200 }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body) ? body : Array.isArray(body?.results) ? body.results : [];
      // Filter for pending status and map to the structure used in old admin
      const pendingServices = rows
        .filter((s: any) => s.status === "pending" || s.status === "Pending")
        .map((s: any) => ({
          id: s.id,
          business_name: s.business_name,
          category: s.category,
          subcategory_name: s.subcategory_name,
          status: s.status,
          description: s.description,
          price: s.price,
          serviceName: s.serviceName,
          serviceId: s.serviceId,
        }));
      setData(pendingServices);
    } catch {
      toasterrormsg("Failed to fetch services.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!filterName.trim()) return data;
    return data.filter((s) =>
      (s.serviceName?.toLowerCase() || "").includes(filterName.toLowerCase()) ||
      s.business_name.toLowerCase().includes(filterName.toLowerCase()) ||
      s.category.toLowerCase().includes(filterName.toLowerCase())
    );
  }, [data, filterName]);

  // ── Table columns ───────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Service>[]>(() => [
    {
      id: "select",
      header: SelectHeader,
      cell: SelectCell,
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      accessorKey: "subcategory_name",
      header: "Subcategory",
      cell: (info) => (
        <div className="font-medium text-gray-800 dark:text-dark-100">
          {globalFilter ? <Highlight query={globalFilter}>{info.getValue<string>()}</Highlight> : info.getValue<string>() || "-"}
        </div>
      ),
    },
    {
      accessorKey: "business_name",
      header: "Business Name",
      cell: (info) => (
        <div className="font-medium text-gray-800 dark:text-dark-100">
          {globalFilter ? <Highlight query={globalFilter}>{info.getValue<string>()}</Highlight> : info.getValue<string>()}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => {
        const status = info.getValue<string>();
        return (
          <Badge
            color="warning"
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
        <ServiceRowActions
          service={info.row.original}
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
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: fuzzyFilter,
    initialState: { pagination: { pageSize: 10 } },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingService(null);
    setDrawerOpen(true);
  };

  const handleEdit = (service: Service) => {
    // Edit functionality disabled as per old admin
    toasterrormsg("Edit functionality is disabled for pending services.");
  };

  const handleDelete = (service: Service) => {
    setDeleteTarget(service);
    setDeleteOpen(true);
    setDeleteState("pending");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await Delete(`all-services/${deleteTarget.id}/`, {});
      setData((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteState("success");
      toastsuccessmsg("Service deleted successfully.");
    } catch {
      setDeleteState("error");
      toasterrormsg("Failed to delete service.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingService(null);
  };

  const handleDrawerSaved = () => {
    fetchServices();
    handleDrawerClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Page>
      <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">Pending Services</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">View and manage pending services</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleAdd} color="primary" className="gap-2">
              <PlusIcon className="size-4.5" />
              <span>Add Service</span>
            </Button>
            <Button 
              variant="outlined" 
              className="gap-2" 
              onClick={fetchServices} 
              disabled={loading}
            >
              <ArrowPathIcon className={clsx("size-4.5", loading && "animate-spin")} />
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
            placeholder="Search services..."
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
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-12 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-12 text-center text-gray-500">
                      No pending services found
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={clsx(
                        "border-t border-gray-200 dark:border-dark-500",
                        row.getIsSelected() && "bg-gray-50 dark:bg-dark-600"
                      )}
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
      <ServiceDrawer
        isOpen={drawerOpen}
        close={handleDrawerClose}
        service={editingService}
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
function mapApiService(apiData: any): Service {
  return {
    id: apiData.id || 0,
    serviceId: apiData.serviceId || `SRV-${Math.floor(10000 + Math.random() * 90000)}`,
    serviceName: apiData.serviceName || "",
    business_name: apiData.business_name || "",
    category: apiData.category || "",
    subcategory_name: apiData.subcategory_name || "",
    price: apiData.price || 0,
    description: apiData.description || "",
    status: apiData.status || "Pending",
  };
}

function flexRender(...args: any[]) {
  const [component, props] = args;
  if (typeof component === "function") {
    return component(props);
  }
  return component;
}
