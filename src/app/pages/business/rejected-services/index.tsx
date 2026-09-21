import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, FunnelIcon,
  MagnifyingGlassIcon, PlusIcon, TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { Delete, Get, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { formatDateDDMMYYYY } from "@/ApiHelper";
import { ConfirmModal, type ConfirmMessages, type ModalState } from "@/components/shared/ConfirmModal";

// ── Types ───────────────────────────────────────────────────────────────
interface Service {
  id: number;
  serviceId?: string;
  serviceName?: string;
  business_name: string;
  category: string;
  subcategory_name?: string;
  price?: number;
  description: string;
  status: string;
}

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

// ── Main Page ───────────────────────────────────────────────────────────────
export default function RejectedServicesPage() {
  const [data, setData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filterName, setFilterName] = useState("");

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
      // Filter for rejected status and map to the structure used in old admin
      const rejectedServices = rows
        .filter((s: any) => s.status === "rejected" || s.status === "Rejected")
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
      setData(rejectedServices);
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
      s.business_name.toLowerCase().includes(filterName.toLowerCase()) ||
      s.category.toLowerCase().includes(filterName.toLowerCase())
    );
  }, [data, filterName]);

  // ── Table columns ───────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Service>[]>(() => [
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
            color="error"
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
        <Button
          variant="outlined"
          size="sm"
          onClick={() => handleDelete(info.row.original)}
          className="gap-1.5"
        >
          <TrashIcon className="size-4.5" />
          Delete
        </Button>
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
    // Add functionality for rejected services
    toasterrormsg("Add functionality is disabled for rejected services.");
  };

  const handleEdit = (service: Service) => {
    // Edit functionality disabled as per old admin
    toasterrormsg("Edit functionality is disabled for rejected services.");
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
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Page>
      <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">Rejected Services</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">View and manage rejected services</p>
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
                      No rejected services found
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

      {/* Delete Modal */}
      <ConfirmModal
        show={deleteOpen}
        onClose={handleDrawerClose}
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
