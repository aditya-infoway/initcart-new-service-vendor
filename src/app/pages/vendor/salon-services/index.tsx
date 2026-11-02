// src/app/pages/vendor/salon-services/index.tsx
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
  Squares2X2Icon, TableCellsIcon, MapPinIcon, PhoneIcon,
  CurrencyDollarIcon, ScissorsIcon, ClockIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { ConfirmModal, type ConfirmMessages } from "@/components/shared/ConfirmModal";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { formatDateDDMMYYYY, toastsuccessmsg, toasterrormsg, Get, API_URL } from "@/ApiHelper";
import DynamicServiceApi from "@/api/dynamicServiceApi";

// ── Constants ────────────────────────────────────────────────────────────
const SERVICE_TYPE = "salon" as const;

const confirmMessages: ConfirmMessages = {
  pending: { title: "Delete Salon Service", description: "Are you sure you want to delete this salon service? This action cannot be undone.", actionText: "Delete" },
  success: { title: "Deleted", description: "Salon service deleted successfully.", actionText: "Done" },
  error: { title: "Delete Failed", description: "Failed to delete the salon service. Please try again.", actionText: "Retry" },
};

// Relative (/media/...) aur absolute dono type ke image URL ko full URL me convert karta hai
const resolveImg = (img: any): string | null => {
  if (!img) return null;
  const src = typeof img === "string" ? img : img.image || img.image_url || img.url || "";
  if (!src) return null;
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  try {
    const origin = new URL(API_URL).origin;
    return `${origin}${src.startsWith("/") ? src : `/${src}`}`;
  } catch {
    return src;
  }
};

// ── Row Actions ─────────────
function SalonRowActions({ service, onEdit, onDelete }: { service: any; onEdit: (s: any) => void; onDelete: (s: any) => void; }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      {/* MenuButton me 'as' prop lagana zaroori hai varna click nahi hota */}
      <MenuButton as="button" className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-600">
        <EllipsisHorizontalIcon className="size-4.5" />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0"
        leave="transition ease-in" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-2"
      >
        <MenuItems anchor={{ to: "bottom end", gap: 8 }} className="dark:border-dark-500 dark:bg-dark-750 absolute z-100 w-36 rounded-lg border border-gray-300 bg-white py-1 shadow-lg outline-hidden">
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button type="button" onClick={() => onEdit(service)} className={clsx("flex h-9 w-full items-center gap-3 px-3 transition-colors", focus && "bg-gray-100 dark:bg-dark-600")}>
                <PencilIcon className="size-4.5 stroke-1" /><span>Edit</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button type="button" onClick={() => onDelete(service)} className={clsx("flex h-9 w-full items-center gap-3 px-3 text-red-600 transition-colors", focus && "bg-red-50 dark:bg-red-900/20")}>
                <TrashIcon className="size-4.5 stroke-1" /><span>Delete</span>
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function SalonServicesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<"pending" | "success" | "error">("pending");

  // Fetch Subcategories (Old page jaisa logic)
  useEffect(() => {
    Get("service-subcategories/by_service/?service=Salon", {}).then((res: any) => {
      setSubcategories(res.data?.["Salon"] || res["Salon"] || []);
    }).catch(console.error);
  }, []);

  // Fetch Services (Direct Endpoint taaki old data mile)
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await Get("/saloon-services/", { page: 1, page_size: 200 });
      // Handle both array and paginated response
      const rows = Array.isArray(res)
        ? res
        : Array.isArray(res.data)
          ? res.data
          : res.data?.results || res.results || [];
      setData(rows);
    } catch {
      toasterrormsg("Failed to fetch services.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // Helper to get subcategory name (Old logic)
  const getSubcategoryName = (service: any) => {
    if (service.subcategory_name) return service.subcategory_name;
    const sub = service.subcategory;
    if (!sub) return "Unknown";
    const id = typeof sub === 'object' ? sub.id : sub;
    const match = subcategories.find(s => String(s.id) === String(id));
    return match?.subcategory_name || "Unknown";
  };

  // Helper to get minimum price from items array (Old logic)
  const getMinPrice = (service: any) => {
    if (service.price) return service.price; // Agar direct price field hai
    if (service.items && service.items.length > 0) {
      const prices = service.items.map((i: any) => Number(i.price)).filter((p: number) => !isNaN(p) && p > 0);
      if (prices.length > 0) return Math.min(...prices);
    }
    return null;
  };

  const filteredData = useMemo(() => {
    let result = data;
    if (filterName.trim()) {
      result = result.filter((s) =>
        s.business_name?.toLowerCase().includes(filterName.toLowerCase()) ||
        s.service_name?.toLowerCase().includes(filterName.toLowerCase())
      );
    }
    return result;
  }, [data, filterName]);

  const stats = useMemo(() => ({
    total: data.length,
    approved: data.filter(s => s.status === 'approved').length,
    pending: data.filter(s => s.status === 'pending').length,
    rejected: data.filter(s => s.status === 'rejected').length,
  }), [data]);

  const handleAdd = () => navigate("/services/salon/add");
  const handleEdit = (s: any) => navigate(`/services/salon/edit/${s.id}`);
  const handleDelete = (s: any) => { setDeleteTarget(s); setDeleteOpen(true); setDeleteState("pending"); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await DynamicServiceApi.deleteService(SERVICE_TYPE, deleteTarget.id);
      setData((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteState("success");
      toastsuccessmsg("Salon service deleted.");
    } catch {
      setDeleteState("error");
      toasterrormsg("Failed to delete salon service.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Columns mapping (OLD Data fields use karte hue)
  const columns = useMemo<ColumnDef<any>[]>(() => [
    { id: "select", header: SelectHeader, cell: SelectCell, enableSorting: false, enableColumnFilter: false },
    {
      accessorKey: "business_name",
      header: "Service",
      cell: (info) => {
        const s = info.row.original;
        const mainImg = resolveImg(s.main_image);
        return (
          <div className="flex items-center gap-3">
            {mainImg ? (
              <img src={mainImg} alt={s.business_name || ""} className="size-10 rounded-lg object-cover" />
            ) : (
              <div className="size-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <ScissorsIcon className="size-5 text-pink-600" />
              </div>
            )}
            <div>
              <div className="font-medium text-gray-800 dark:text-dark-100">
                {globalFilter ? <Highlight query={globalFilter}>{s.business_name || "-"}</Highlight> : (s.business_name || "-")}
              </div>
              <div className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1 mt-0.5">
                <MapPinIcon className="size-3" /> {s.city || "-"}, {s.state || "-"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subcategory", // Use subcategory id
      header: "Category",
      cell: (info) => <span className="text-gray-600 dark:text-dark-300">{getSubcategoryName(info.row.original)}</span>,
    },
    {
      accessorKey: "contact_no",
      header: "Contact",
      cell: (info) => (
        <div>
          <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-dark-200">
            <PhoneIcon className="size-3" /> {info.getValue<string>() || "-"}
          </div>
          {info.row.original.whatsapp_no && <div className="text-xs text-gray-500 mt-0.5">WA: {info.row.original.whatsapp_no}</div>}
        </div>
      ),
    },
    {
      id: "timings", // OLD page ka Timings column
      header: "Timings",
      cell: (info) => {
        const s = info.row.original;
        const open = s.open_time ? String(s.open_time).slice(0, 5) : "-";
        const close = s.close_time ? String(s.close_time).slice(0, 5) : "-";
        return (
          <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-dark-200">
            <ClockIcon className="size-3" /> {open} - {close}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "price", // Custom accessor
      header: "Price",
      cell: (info) => {
        const price = getMinPrice(info.row.original);
        return <span className="text-gray-600 dark:text-dark-300 flex items-center gap-1"><CurrencyDollarIcon className="size-3" /> ₹{price ? price.toLocaleString() : "-"}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => {
        const status = info.getValue<string>();
        const colorMap: Record<string, "success" | "warning" | "error" | "info"> = { approved: "success", pending: "warning", rejected: "error", draft: "info", inactive: "error" };
        return <Badge color={colorMap[status] || "info"} variant="soft" className="capitalize">{status}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (info) => <SalonRowActions service={info.row.original} onEdit={handleEdit} onDelete={handleDelete} />,
      enableSorting: false,
      enableColumnFilter: false,
    },
  ], [globalFilter, subcategories]);

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

  return (
    <Page>
      <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
        {/* Page Header (Same UI) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">Salon & Beauty</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">View and manage salon & beauty</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outlined" onClick={() => navigate('/services')} className="gap-2">
              <ArrowPathIcon className="size-4.5" /> <span className="hidden sm:inline">Back to All Services</span>
            </Button>
            <Button onClick={handleAdd} color="primary" className="gap-2">
              <PlusIcon className="size-4.5" /> <span>Add New Salon</span>
            </Button>
            <Button variant="outlined" className="gap-2" onClick={fetchServices} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4.5", loading && "animate-spin")} /> <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outlined" isIcon onClick={() => setShowFilter(!showFilter)} className={clsx("h-10 w-10", showFilter && "bg-gray-100")}>
              <FunnelIcon className="size-4.5" />
            </Button>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden dark:border-dark-500">
              <Button variant="outlined" isIcon onClick={() => setViewMode("table")} className={clsx("h-10 w-10 border-none rounded-none", viewMode === "table" && "bg-gray-100")}><TableCellsIcon className="size-4.5" /></Button>
              <Button variant="outlined" isIcon onClick={() => setViewMode("grid")} className={clsx("h-10 w-10 border-none rounded-none", viewMode === "grid" && "bg-gray-100")}><Squares2X2Icon className="size-4.5" /></Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white"><div className="flex justify-between"><div><p className="text-sm">Total</p><p className="text-3xl font-bold">{stats.total}</p></div><div className="p-3 bg-white/20 rounded-lg"><TableCellsIcon className="size-6" /></div></div></div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white"><div className="flex justify-between"><div><p className="text-sm">Approved</p><p className="text-3xl font-bold">{stats.approved}</p></div><div className="p-3 bg-white/20 rounded-lg"><PlusIcon className="size-6" /></div></div></div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white"><div className="flex justify-between"><div><p className="text-sm">Pending</p><p className="text-3xl font-bold">{stats.pending}</p></div><div className="p-3 bg-white/20 rounded-lg"><FunnelIcon className="size-6" /></div></div></div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white"><div className="flex justify-between"><div><p className="text-sm">Rejected</p><p className="text-3xl font-bold">{stats.rejected}</p></div><div className="p-3 bg-white/20 rounded-lg"><TrashIcon className="size-6" /></div></div></div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <Input placeholder="Search..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} prefix={<MagnifyingGlassIcon className="size-4.5 text-gray-400" />} className="w-full max-w-md" />
        </div>

        {/* Table View */}
        {viewMode === "table" && (
          <div className="rounded-lg border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-600">
                  <tr>
                    {table.getHeaderGroups().map((headerGroup) => headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-5 py-4 text-left font-semibold">{flexRender(header.column.columnDef.header, header.getContext())}</th>
                    )))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={columns.length} className="px-5 py-12 text-center">Loading...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan={columns.length} className="px-5 py-12 text-center">No services found</td></tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-200 dark:border-dark-500 hover:bg-gray-50 dark:hover:bg-dark-600">
                        {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-5 py-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-5 py-4 dark:border-dark-500">
              <div className="text-sm text-gray-600">Showing {table.getState().pagination.pageSize} of {filteredData.length} results</div>
              <div className="flex gap-2">
                <Button variant="outlined" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                <Button variant="outlined" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
              </div>
            </div>
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredData.map((service) => {
              const price = getMinPrice(service);
              const mainImg = resolveImg(service.main_image);
              return (
              <div key={service.id} className="group bg-white rounded-2xl border overflow-hidden hover:shadow-lg dark:border-dark-500 dark:bg-dark-700">
                <div className="relative h-56 bg-gray-100 overflow-hidden">
                  {mainImg ? <img src={mainImg} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><ScissorsIcon className="size-20 text-pink-300" /></div>}
                  <div className="absolute top-4 right-4"><Badge color={service.status === 'approved' ? 'success' : 'warning'}>{service.status}</Badge></div>
                  {price && <div className="absolute bottom-4 left-4 bg-white/90 rounded-full px-4 py-2 flex items-center gap-1 shadow-md"><CurrencyDollarIcon className="size-4 text-pink-600" /><span className="font-bold text-pink-600">₹{price.toLocaleString()}</span></div>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-1 truncate dark:text-dark-100">{service.business_name}</h3>
                  <p className="text-sm text-gray-500 mb-4 truncate">{getSubcategoryName(service)}</p>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-dark-300">
                    <div className="flex items-center gap-2"><MapPinIcon className="size-4" /> {service.city || "-"}</div>
                    <div className="flex items-center gap-2"><PhoneIcon className="size-4" /> {service.contact_no || "-"}</div>
                  </div>
                  <div className="flex gap-2 mt-5 pt-4 border-t dark:border-dark-500">
                    <Button size="sm" variant="outlined" className="flex-1" onClick={() => handleEdit(service)}>Edit</Button>
                    <Button size="sm" variant="outlined" color="error" className="flex-1" onClick={() => handleDelete(service)}>Delete</Button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      <ConfirmModal show={deleteOpen} onClose={() => setDeleteOpen(false)} onOk={handleDeleteConfirm} state={deleteState} confirmLoading={deleteLoading} messages={confirmMessages} />
    </Page>
  );
}

function flexRender(...args: any[]) {
  const [component, props] = args;
  if (typeof component === "function") return component(props);
  return component;
}