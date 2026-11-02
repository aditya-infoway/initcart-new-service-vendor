// src/app/pages/vendor/healthcare-services/index.tsx
import {
  Menu, MenuButton, MenuItem, MenuItems, Transition,
} from "@headlessui/react";
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowPathIcon, EllipsisHorizontalIcon, FunnelIcon,
  MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon,
  Squares2X2Icon, TableCellsIcon, MapPinIcon, PhoneIcon,
  HeartIcon, CheckIcon, ClockIcon, XMarkIcon, EnvelopeIcon,
  ChatBubbleLeftRightIcon, PhotoIcon, ChevronLeftIcon, ChevronRightIcon,
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
const SERVICE_TYPE = "healthcare" as const;
const STATUS_OPTIONS = ["all", "approved", "pending", "rejected"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const confirmMessages: ConfirmMessages = {
  pending: { title: "Delete Healthcare Service", description: "Are you sure you want to delete this healthcare service? This action cannot be undone.", actionText: "Delete" },
  success: { title: "Deleted", description: "Healthcare service deleted successfully.", actionText: "Done" },
  error: { title: "Delete Failed", description: "Failed to delete the healthcare service. Please try again.", actionText: "Retry" },
};

const statusColorMap: Record<string, "success" | "warning" | "error" | "info"> = {
  approved: "success", pending: "warning", rejected: "error", draft: "info", inactive: "error",
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

// main_image + multi_images ko ek hi list me (lightbox ke liye)
const getAllImages = (service: any): string[] =>
  [resolveImg(service.main_image), ...(service.multi_images || []).map((i: any) => resolveImg(i))]
    .filter(Boolean) as string[];

const getLocation = (s: any) =>
  s.city && s.state ? `${s.city}, ${s.state}` : s.address || "-";

// ── Row Actions ──────────────────────────────────────────────────────────
function HealthcareRowActions({ service, onEdit, onDelete }: { service: any; onEdit: (s: any) => void; onDelete: (s: any) => void; }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
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
export default function HealthcareServicesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Image lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<"pending" | "success" | "error">("pending");

  // Fetch Subcategories
  useEffect(() => {
    Get("service-subcategories/by_service/?service=Healthcare", {}).then((res: any) => {
      setSubcategories(res?.data?.["Healthcare"] || res?.["Healthcare"] || []);
    }).catch(console.error);
  }, []);

  // Fetch Services
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await Get("/healthcare-services/", { page: 1, page_size: 200 });
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

  // Subcategory name
  const getSubcategoryName = useCallback((service: any) => {
    if (service.subcategory_name) return service.subcategory_name;
    const sub = service.subcategory;
    if (!sub) return "Unknown";
    const id = typeof sub === "object" ? sub.id : sub;
    const match = subcategories.find((s) => String(s.id) === String(id));
    return match?.subcategory_name || "Unknown";
  }, [subcategories]);

  const filteredData = useMemo(
    () => (statusFilter === "all" ? data : data.filter((s) => s.status === statusFilter)),
    [data, statusFilter],
  );

  const stats = useMemo(() => ({
    total: data.length,
    approved: data.filter((s) => s.status === "approved").length,
    pending: data.filter((s) => s.status === "pending").length,
    rejected: data.filter((s) => s.status === "rejected").length,
  }), [data]);

  const handleAdd = () => navigate("/services/healthcare/add");
  const handleEdit = (s: any) => navigate(`/services/healthcare/edit/${s.id}`);
  const handleDelete = (s: any) => { setDeleteTarget(s); setDeleteOpen(true); setDeleteState("pending"); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await DynamicServiceApi.deleteService(SERVICE_TYPE, deleteTarget.id);
      setData((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteState("success");
      toastsuccessmsg("Healthcare service deleted.");
    } catch {
      setDeleteState("error");
      toasterrormsg("Failed to delete healthcare service.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openGallery = (service: any, startIndex = 0) => {
    const imgs = getAllImages(service);
    if (!imgs.length) return;
    setLightboxImages(imgs);
    setLightboxIndex(startIndex);
  };
  const closeGallery = () => setLightboxImages([]);

  // Columns
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
              <div className="size-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <HeartIcon className="size-5 text-teal-600" />
              </div>
            )}
            <div>
              <div className="font-medium text-gray-800 dark:text-dark-100">
                {globalFilter ? <Highlight query={globalFilter}>{s.business_name || "-"}</Highlight> : (s.business_name || "-")}
              </div>
              <div className="text-xs text-gray-500 dark:text-dark-400 mt-0.5 line-clamp-1 max-w-64">{s.address || "-"}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      accessorFn: (row) => getSubcategoryName(row),
      cell: (info) => <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>()}</span>,
    },
    {
      id: "location",
      header: "Location",
      accessorFn: (row) => `${getLocation(row)} ${row.address || ""}`,
      cell: (info) => (
        <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-dark-200">
          <MapPinIcon className="size-3 shrink-0" /> {getLocation(info.row.original)}
        </div>
      ),
    },
    {
      accessorKey: "contact_no",
      header: "Contact",
      cell: (info) => {
        const s = info.row.original;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-dark-200">
              <PhoneIcon className="size-3" /> {info.getValue<string>() || "-"}
            </div>
            {s.whatsapp_no && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <ChatBubbleLeftRightIcon className="size-3" /> {s.whatsapp_no}
              </div>
            )}
            {s.gmail_id && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-dark-400">
                <EnvelopeIcon className="size-3" /> <span className="truncate max-w-40">{s.gmail_id}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => {
        const status = info.getValue<string>();
        return <Badge color={statusColorMap[status] || "info"} variant="soft" className="capitalize">{status}</Badge>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Added On",
      cell: (info) => {
        const v = info.getValue<string>();
        return <span className="text-sm text-gray-600 dark:text-dark-300">{v ? formatDateDDMMYYYY(v) : "N/A"}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (info) => <HealthcareRowActions service={info.row.original} onEdit={handleEdit} onDelete={handleDelete} />,
      enableSorting: false,
      enableColumnFilter: false,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [globalFilter, getSubcategoryName]);

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
    initialState: { pagination: { pageSize: 12 } },
  });

  const pageRows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const fromRow = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const toRow = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  const Pagination = (
    <div className="flex items-center justify-between border-t px-5 py-4 dark:border-dark-500">
      <div className="text-sm text-gray-600 dark:text-dark-300">
        Showing {fromRow}-{toRow} of {totalFiltered} results
      </div>
      <div className="flex gap-2">
        <Button variant="outlined" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        <Button variant="outlined" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>
    </div>
  );

  return (
    <Page>
      <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">Healthcare Services</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">Manage your healthcare service listings</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outlined" onClick={() => navigate("/services")} className="gap-2">
              <ArrowPathIcon className="size-4.5" /> <span className="hidden sm:inline">Back to All Services</span>
            </Button>
            <Button onClick={handleAdd} color="primary" className="gap-2">
              <PlusIcon className="size-4.5" /> <span>Add New Service</span>
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
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white"><div className="flex justify-between"><div><p className="text-sm">Total Services</p><p className="text-3xl font-bold">{stats.total}</p></div><div className="p-3 bg-white/20 rounded-lg"><HeartIcon className="size-6" /></div></div></div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white"><div className="flex justify-between"><div><p className="text-sm">Approved</p><p className="text-3xl font-bold">{stats.approved}</p></div><div className="p-3 bg-white/20 rounded-lg"><CheckIcon className="size-6" /></div></div></div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white"><div className="flex justify-between"><div><p className="text-sm">Pending</p><p className="text-3xl font-bold">{stats.pending}</p></div><div className="p-3 bg-white/20 rounded-lg"><ClockIcon className="size-6" /></div></div></div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white"><div className="flex justify-between"><div><p className="text-sm">Rejected</p><p className="text-3xl font-bold">{stats.rejected}</p></div><div className="p-3 bg-white/20 rounded-lg"><XMarkIcon className="size-6" /></div></div></div>
        </div>

        {/* Search + Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by business name, category, address, contact..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4.5 text-gray-400" />}
              className="w-full max-w-md"
            />
          </div>
          {showFilter && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-dark-500 dark:bg-dark-700">
              <span className="text-sm text-gray-500 dark:text-dark-300">Status:</span>
              {STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt}
                  size="sm"
                  variant="outlined"
                  onClick={() => setStatusFilter(opt)}
                  className={clsx("capitalize", statusFilter === opt && "bg-gray-100 dark:bg-dark-600")}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Table View */}
        {viewMode === "table" && (
          <div className="rounded-lg border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-600">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          className={clsx("px-5 py-4 text-left font-semibold", header.column.getCanSort() && "cursor-pointer select-none")}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={columns.length} className="px-5 py-12 text-center">Loading...</td></tr>
                  ) : pageRows.length === 0 ? (
                    <tr><td colSpan={columns.length} className="px-5 py-12 text-center">No services found</td></tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-200 dark:border-dark-500 hover:bg-gray-50 dark:hover:bg-dark-600">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-5 py-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {Pagination}
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <>
            {loading ? (
              <div className="rounded-lg border border-gray-200 bg-white px-5 py-12 text-center dark:border-dark-500 dark:bg-dark-700">Loading...</div>
            ) : pageRows.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white px-5 py-12 text-center dark:border-dark-500 dark:bg-dark-700">No services found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pageRows.map(({ original: service }) => {
                  const mainImg = resolveImg(service.main_image);
                  const gallery: any[] = service.multi_images || [];
                  const allImages = getAllImages(service);
                  return (
                    <div key={service.id} className="group bg-white rounded-2xl border overflow-hidden hover:shadow-lg dark:border-dark-500 dark:bg-dark-700">
                      <div className="relative h-56 bg-gray-100 overflow-hidden cursor-pointer dark:bg-dark-600" onClick={() => openGallery(service, 0)}>
                        {mainImg
                          ? <img src={mainImg} alt={service.business_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          : <div className="flex items-center justify-center h-full"><HeartIcon className="size-20 text-teal-300" /></div>}
                        <div className="absolute top-4 right-4">
                          <Badge color={statusColorMap[service.status] || "info"} className="capitalize">{service.status}</Badge>
                        </div>
                        {service.category && (
                          <div className="absolute bottom-4 left-4 bg-white/90 rounded-full px-3 py-1 text-xs font-medium text-teal-700 shadow-md">
                            {service.category}
                          </div>
                        )}
                        {allImages.length > 1 && (
                          <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
                            <PhotoIcon className="size-3" /> {allImages.length}
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg mb-1 truncate dark:text-dark-100">{service.business_name}</h3>
                        <p className="text-sm text-teal-600 mb-4 truncate">{getSubcategoryName(service)}</p>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-dark-300">
                          <div className="flex items-start gap-2"><MapPinIcon className="size-4 mt-0.5 shrink-0" /><span className="line-clamp-2">{getLocation(service)}</span></div>
                          <div className="flex items-center gap-2"><PhoneIcon className="size-4" /> {service.contact_no || "-"}</div>
                          {service.whatsapp_no && <div className="flex items-center gap-2"><ChatBubbleLeftRightIcon className="size-4 text-green-500" /> {service.whatsapp_no}</div>}
                          {service.gmail_id && <div className="flex items-center gap-2"><EnvelopeIcon className="size-4 text-red-400" /> <span className="truncate">{service.gmail_id}</span></div>}
                        </div>

                        {gallery.length > 0 && (
                          <div className="flex gap-2 mt-4">
                            {gallery.slice(0, 4).map((img: any, idx: number) => {
                              const src = resolveImg(img);
                              if (!src) return null;
                              return (
                                <button
                                  key={img.id ?? idx}
                                  type="button"
                                  onClick={() => openGallery(service, mainImg ? idx + 1 : idx)}
                                  className="size-12 overflow-hidden rounded-lg border border-gray-200 hover:border-teal-300 dark:border-dark-500"
                                >
                                  <img src={src} alt={`Gallery ${idx + 1}`} className="size-full object-cover" />
                                </button>
                              );
                            })}
                            {gallery.length > 4 && (
                              <div className="flex size-12 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 dark:bg-dark-600">
                                +{gallery.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 mt-5 pt-4 border-t dark:border-dark-500">
                          <Button size="sm" variant="outlined" className="flex-1" onClick={() => handleEdit(service)}>Edit</Button>
                          <Button size="sm" variant="outlined" color="error" className="flex-1" onClick={() => handleDelete(service)}>Delete</Button>
                        </div>
                        <p className="mt-3 text-xs text-gray-400">
                          Added: {service.created_at ? formatDateDDMMYYYY(service.created_at) : "N/A"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-700">{Pagination}</div>
          </>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4" onClick={closeGallery}>
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={closeGallery} className="absolute -top-12 right-0 text-white hover:text-gray-300">
              <XMarkIcon className="size-8" />
            </button>
            {lightboxImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i > 0 ? i - 1 : lightboxImages.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white hover:bg-white/30"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i < lightboxImages.length - 1 ? i + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white hover:bg-white/30"
                >
                  <ChevronRightIcon className="size-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                  {lightboxIndex + 1} / {lightboxImages.length}
                </div>
              </>
            )}
            <img src={lightboxImages[lightboxIndex]} alt="Full size" className="h-auto max-h-[90vh] w-full rounded-2xl object-contain" />
          </div>
        </div>
      )}

      <ConfirmModal show={deleteOpen} onClose={() => setDeleteOpen(false)} onOk={handleDeleteConfirm} state={deleteState} confirmLoading={deleteLoading} messages={confirmMessages} />
    </Page>
  );
}