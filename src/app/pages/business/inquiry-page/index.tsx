import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, FunnelIcon,
  MagnifyingGlassIcon, UserIcon, EnvelopeIcon, PhoneIcon,
  CalendarIcon, MapPinIcon, TagIcon, CheckCircleIcon,
  ExclamationCircleIcon, XCircleIcon, EyeIcon, CubeIcon,
  InboxIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { Get, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { formatDateDDMMYYYY } from "@/ApiHelper";
import { Inquiry } from "./data";

// ── Main Page ───────────────────────────────────────────────────────────────
export default function InquiryPage() {
  const [data, setData] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("services/vendor/inquiries/", { page: 1, page_size: 200 }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body) ? body : Array.isArray(body?.results) ? body.results : [];
      setData(rows.map(mapApiInquiry));
    } catch {
      toasterrormsg("Failed to fetch inquiries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (globalFilter) {
      const term = globalFilter.toLowerCase();
      filtered = filtered.filter(
        (inq) =>
          inq.customer_name?.toLowerCase().includes(term) ||
          inq.customer_email?.toLowerCase().includes(term) ||
          inq.service_name?.toLowerCase().includes(term) ||
          inq.customer_phone?.includes(term) ||
          inq.subject?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((inq) => inq.status === statusFilter);
    }

    return filtered;
  }, [data, globalFilter, statusFilter]);

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: data.length,
    pending: data.filter((i) => i.status === "pending" || i.status === "Pending").length,
    responded: data.filter((i) => i.status === "responded" || i.status === "Responded").length,
    closed: data.filter((i) => i.status === "closed" || i.status === "Closed").length,
  }), [data]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
      case "Pending":
        return (
          <Badge color="warning" variant="soft" className="capitalize">
            Pending
          </Badge>
        );
      case "responded":
      case "Responded":
        return (
          <Badge color="primary" variant="soft" className="capitalize">
            Responded
          </Badge>
        );
      case "closed":
      case "Closed":
        return (
          <Badge color="neutral" variant="soft" className="capitalize">
            Closed
          </Badge>
        );
      default:
        return (
          <Badge color="neutral" variant="soft" className="capitalize">
            {status || "New"}
          </Badge>
        );
    }
  };

  const handleView = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setViewModalOpen(true);
  };

  // ── Table columns ───────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Inquiry>[]>(() => [
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: (info) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <UserIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-800 dark:text-dark-100 text-sm flex items-center gap-2">
              {globalFilter ? <Highlight query={globalFilter}>{info.getValue<string>()}</Highlight> : info.getValue<string>()}
              {!info.row.original.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1">
                <EnvelopeIcon className="h-3 w-3" />
                {info.row.original.customer_email}
              </span>
              <span className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1">
                <PhoneIcon className="h-3 w-3" />
                {info.row.original.customer_phone}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "service_name",
      header: "Service / Package",
      cell: (info) => (
        <div>
          <p className="font-medium text-gray-800 dark:text-dark-100 text-sm">
            {globalFilter ? <Highlight query={globalFilter}>{info.getValue<string>()}</Highlight> : info.getValue<string>() || "—"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {info.row.original.service_category && (
              <Badge color="primary" variant="soft" className="text-xs">
                <TagIcon className="h-3 w-3" />
                {info.row.original.service_category.replace(/_/g, " ")}
              </Badge>
            )}
            {info.row.original.sub_category && (
              <Badge color="neutral" variant="soft" className="text-xs">
                <CubeIcon className="h-3 w-3" />
                {info.row.original.sub_category}
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date & Time",
      cell: (info) => (
        <div className="text-sm text-gray-600 dark:text-dark-300">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {formatDateDDMMYYYY(info.getValue<string>())}
          </div>
          {info.row.original.customer_city && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-400">
              <MapPinIcon className="h-3 w-3" />
              {info.row.original.customer_city}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => getStatusBadge(info.getValue<string>() || "pending"),
    },
    {
      id: "actions",
      header: "View",
      cell: (info) => (
        <Button
          variant="outlined"
          size="sm"
          onClick={() => handleView(info.row.original)}
          className="gap-1.5"
        >
          <EyeIcon className="h-4 w-4" />
          View
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Page>
      <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">Customer Inquiries</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">View all inquiries received for your services and packages</p>
          </div>
          <Button 
            variant="outlined" 
            className="gap-2" 
            onClick={fetchInquiries} 
            disabled={loading}
          >
            <ArrowPathIcon className={clsx("size-4.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-500 dark:bg-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-dark-400">Total Inquiries</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-dark-100">{stats.total}</h3>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-900/20">
                <InboxIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-500 dark:bg-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-dark-400">Pending</p>
                <h3 className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</h3>
              </div>
              <div className="rounded-xl bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <ExclamationCircleIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-500 dark:bg-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-dark-400">Responded</p>
                <h3 className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.responded}</h3>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
                <CheckCircleIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-500 dark:bg-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-dark-400">Closed</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-600 dark:text-dark-300">{stats.closed}</h3>
              </div>
              <div className="rounded-xl bg-gray-100 p-3 dark:bg-dark-600">
                <XCircleIcon className="h-6 w-6 text-gray-500 dark:text-dark-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by customer name, email, phone or service..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4.5 text-gray-400" />}
              className="w-full max-w-md"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="responded">Responded</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

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
                      No inquiries found
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={clsx(
                        "border-t border-gray-200 dark:border-dark-500 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-dark-600",
                        !row.original.is_read && "bg-blue-50/30 dark:bg-dark-600/30"
                      )}
                      onClick={() => handleView(row.original)}
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

      {/* View Detail Modal */}
      {viewModalOpen && selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-dark-700 border-b border-gray-200 dark:border-dark-500 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-dark-100 flex items-center gap-2">
                Inquiry Details
              </h2>
              <Button
                variant="flat"
                isIcon
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedInquiry(null);
                }}
                className="size-8 rounded-lg"
              >
                <XMarkIcon className="size-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Status & Date */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-dark-500">
                {getStatusBadge(selectedInquiry.status || "pending")}
                <span className="text-sm text-gray-500 dark:text-dark-400 flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {formatDateDDMMYYYY(selectedInquiry.created_at)}
                </span>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider mb-3">
                  Customer Information
                </h3>
                <div className="rounded-xl bg-gray-50 dark:bg-dark-600 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                      <UserIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-dark-100">{selectedInquiry.customer_name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-13">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1.5">
                        <EnvelopeIcon className="h-3.5 w-3.5" /> Email
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-dark-300">{selectedInquiry.customer_email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1.5">
                        <PhoneIcon className="h-3.5 w-3.5" /> Phone
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-dark-300">{selectedInquiry.customer_phone || "—"}</p>
                    </div>
                    {selectedInquiry.customer_city && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1.5">
                          <MapPinIcon className="h-3.5 w-3.5" /> City
                        </p>
                        <p className="text-sm font-medium text-gray-700 dark:text-dark-300">{selectedInquiry.customer_city}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider mb-3">
                  Service / Package
                </h3>
                <div className="rounded-xl bg-gray-50 dark:bg-dark-600 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CubeIcon className="h-5 w-5 text-blue-500" />
                    <p className="font-semibold text-gray-800 dark:text-dark-100 text-lg">
                      {selectedInquiry.service_name || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedInquiry.service_category && (
                      <Badge color="primary" variant="soft" className="text-xs">
                        <TagIcon className="h-3.5 w-3.5" />
                        {selectedInquiry.service_category.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {selectedInquiry.sub_category && (
                      <Badge color="neutral" variant="soft" className="text-xs">
                        <CubeIcon className="h-3.5 w-3.5" />
                        {selectedInquiry.sub_category}
                      </Badge>
                    )}
                  </div>
                  {selectedInquiry.service_url && (
                    <a
                      href={selectedInquiry.service_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm hover:underline inline-flex items-center gap-1"
                    >
                      View Service Page →
                    </a>
                  )}
                </div>
              </div>

              {/* Subject & Message */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider mb-3">
                  Message
                </h3>
                <div className="rounded-xl bg-gray-50 dark:bg-dark-600 p-4">
                  {selectedInquiry.subject && (
                    <p className="font-semibold text-gray-800 dark:text-dark-100 mb-2">{selectedInquiry.subject}</p>
                  )}
                  <p className="text-gray-700 dark:text-dark-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedInquiry.message || "No message provided."}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-600 rounded-b-2xl flex justify-end">
              <Button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedInquiry(null);
                }}
                variant="outlined"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function mapApiInquiry(apiData: any): Inquiry {
  return {
    id: apiData.id || 0,
    inquiry_id: apiData.inquiry_id,
    customer_name: apiData.customer_name || "",
    customer_email: apiData.customer_email || "",
    customer_phone: apiData.customer_phone || "",
    service_name: apiData.service_name || "",
    service_category: apiData.service_category || "",
    sub_category: apiData.sub_category,
    created_at: apiData.created_at || new Date().toISOString(),
    preferred_date: apiData.preferred_date,
    preferred_time: apiData.preferred_time,
    customer_city: apiData.customer_city,
    message: apiData.message,
    subject: apiData.subject,
    status: apiData.status || "pending",
    is_read: apiData.is_read,
    service_url: apiData.service_url,
  };
}

function flexRender(...args: any[]) {
  const [component, props] = args;
  if (typeof component === "function") {
    return component(props);
  }
  return component;
}
