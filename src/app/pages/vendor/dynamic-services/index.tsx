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
  CurrencyDollarIcon, TagIcon, StarIcon, HomeIcon,
  ScissorsIcon, BriefcaseIcon, BuildingOfficeIcon,
  AcademicCapIcon, UserIcon, BuildingStorefrontIcon,
  PaperAirplaneIcon, HeartIcon, RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Card } from "@/components/ui";
import { Delete, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { ConfirmModal, type ConfirmMessages, type ModalState } from "@/components/shared/ConfirmModal";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { formatDateDDMMYYYY } from "@/ApiHelper";
import DynamicServiceApi from "@/api/dynamicServiceApi";
import type { DynamicService } from "@/api/dynamicServiceApi";

// ── Service Type Configuration ───────────────────────────────────────────────────────
const serviceTypes = [
  { id: 'real_estate', name: 'Real Estate', icon: HomeIcon, color: 'blue' },
  { id: 'gym', name: 'Gym', icon: HeartIcon, color: 'orange' },
  { id: 'salon', name: 'Salon', icon: ScissorsIcon, color: 'pink' },
  { id: 'travel_agency', name: 'Travel Agency', icon: PaperAirplaneIcon, color: 'purple' },
  { id: 'finance', name: 'Finance', icon: BriefcaseIcon, color: 'green' },
  { id: 'tech_industry', name: 'Tech Industry', icon: BuildingOfficeIcon, color: 'indigo' },
  { id: 'hotel', name: 'Hotel & Restaurant', icon: BuildingStorefrontIcon, color: 'amber' },
  { id: 'healthcare', name: 'Healthcare', icon: HeartIcon, color: 'red' },
  { id: 'education', name: 'Education', icon: AcademicCapIcon, color: 'teal' },
  { id: 'professional', name: 'Professional', icon: UserIcon, color: 'cyan' },
  { id: 'workplace', name: 'Work Place', icon: RectangleGroupIcon, color: 'gray' },
];

// ── Types ───────────────────────────────────────────────────────────────
interface DynamicServiceFormValues {
  service_name: string;
  short_description: string;
  full_description: string;
  price: number;
  offer_price?: number;
  gst_percentage: string;
  contact_person: string;
  contact_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  video_url?: string;
  batch_timings?: string;
  terms_conditions: string;
  service_type?: string;
  category?: string;
  subcategory_name?: string;
  business_name?: string;
  
  // Education specific
  education_type?: string;
  subjects_courses?: string;
  mode_of_class?: string;
  class_duration?: string;
  faculty_details?: string;
  facilities?: string;
  eligibility_criteria?: string;
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

// ── Row actions ─────────────────────────────────────────────────────────────
function DynamicServiceRowActions({ service, onEdit, onDelete }: {
  service: DynamicService;
  onEdit: (s: DynamicService) => void;
  onDelete: (s: DynamicService) => void;
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
              <button type="button" onClick={() => onEdit(service)}
                className={clsx("flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-dark-100")}>
                <PencilIcon className="size-4.5 stroke-1" /><span>Edit</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button type="button" onClick={() => onDelete(service)}
                className={clsx("text-red-600 dark:text-red-400 flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-red-50 dark:bg-red-900/20")}>
                <TrashIcon className="size-4.5 stroke-1" /><span>Delete</span>
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}

// ── Service Type Display Names ─────────────────────────────────────────────
const getServiceTypeDisplayName = (serviceType: string): string => {
  const displayMap: Record<string, string> = {
    'real_estate': 'Real Estate',
    'gym': 'Gym & Fitness',
    'salon': 'Salon & Beauty',
    'travel': 'Travel Agency',
    'finance': 'Finance',
    'tech': 'Technology Services',
    'hotel': 'Hotel',
    'healthcare': 'Healthcare',
    'education': 'Education',
    'professional': 'Professional Services',
    'restaurant': 'Restaurant',
  };
  return displayMap[serviceType] || serviceType.replace('_', ' ').toUpperCase();
};

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DynamicServicesPage() {
  const { serviceType } = useParams<{ serviceType: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DynamicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DynamicService | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<"pending" | "success" | "error">("pending");

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    if (!serviceType) return;
    setLoading(true);
    try {
      const res = await DynamicServiceApi.getAllServices(serviceType, { page: 1, page_size: 200 });
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body) ? body : Array.isArray(body?.results) ? body.results : [];
      setData(rows);
    } catch {
      toasterrormsg("Failed to fetch services.");
    } finally {
      setLoading(false);
    }
  }, [serviceType]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // ── Show All Services Overview when no serviceType ─────────────────────────────
  if (!serviceType) {
    return (
      <Page>
        <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">
                All Services
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
                Manage all your service listings across different categories
              </p>
            </div>
            <Button
              variant="outlined"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowPathIcon className="size-4.5" />
              Back to Dashboard
            </Button>
          </div>

          {/* Service Types Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {serviceTypes.map((service) => (
              <Card
                key={service.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/services/${service.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${service.color}-100 dark:bg-${service.color}-900/20`}>
                    <service.icon className={`w-6 h-6 text-${service.color}-600 dark:text-${service.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 dark:text-dark-100">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                      Manage {service.name.toLowerCase()} listings
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Page>
    );
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = data;
    
    if (filterName.trim()) {
      result = result.filter((s) =>
        s.service_name?.toLowerCase().includes(filterName.toLowerCase()) ||
        s.business_name?.toLowerCase().includes(filterName.toLowerCase()) ||
        s.category?.toLowerCase().includes(filterName.toLowerCase())
      );
    }
    
    if (filterVendor.trim()) {
      result = result.filter((s) =>
        s.vendor_name?.toLowerCase().includes(filterVendor.toLowerCase()) ||
        String(s.vendor)?.includes(filterVendor)
      );
    }
    
    return result;
  }, [data, filterName, filterVendor]);

  // ── Statistics ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    return {
      total: data.length,
      approved: data.filter(s => s.status === 'approved').length,
      pending: data.filter(s => s.status === 'pending').length,
      rejected: data.filter(s => s.status === 'rejected').length,
    };
  }, [data]);

  // ── Table columns ───────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<DynamicService>[]>(() => {
    if (serviceType === "hotel") {
      return [
        {
          id: "select",
          header: SelectHeader,
          cell: SelectCell,
          enableSorting: false,
          enableColumnFilter: false,
        },
        {
          accessorKey: "hotel_name",
          header: "Hotel",
          cell: (info) => (
            <div className="font-medium text-gray-800 dark:text-dark-100">
              {globalFilter ? <Highlight query={globalFilter}>{info.getValue<string>() || info.row.original.service_name}</Highlight> : (info.getValue<string>() || info.row.original.service_name)}
            </div>
          ),
        },
        {
          accessorKey: "category",
          header: "Category",
          cell: (info) => (
            <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>() || "-"}</span>
          ),
        },
        {
          accessorKey: "location",
          header: "Location",
          cell: (info) => {
            const location = info.getValue<string>();
            const city = info.row.original.city;
            // Show city if available, otherwise show location if it's not a URL
            const displayLocation = city || (location && !location.startsWith('http') ? location : '-');
            return (
              <span className="text-gray-600 dark:text-dark-300">{displayLocation}</span>
            );
          },
        },
        {
          accessorKey: "contact_no",
          header: "Contact",
          cell: (info) => (
            <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>() || "-"}</span>
          ),
        },
        {
          accessorKey: "hotel_rating",
          header: "Rating",
          cell: (info) => (
            <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>() || "-"}</span>
          ),
        },
        {
          accessorKey: "room_category",
          header: "Room Category",
          cell: (info) => (
            <span className="text-gray-600 dark:text-dark-300 capitalize">{info.getValue<string>() || "-"}</span>
          ),
        },
        {
          accessorKey: "status",
          header: "Status",
          cell: (info) => {
            const status = info.getValue<string>();
            const colorMap: Record<string, "success" | "warning" | "error" | "info"> = {
              'approved': 'success',
              'pending': 'warning',
              'rejected': 'error',
              'draft': 'info',
              'inactive': 'error',
            };
            return (
              <Badge
                color={colorMap[status] || 'info'}
                variant="soft"
                className="capitalize"
              >
                {status}
              </Badge>
            );
          },
        },
        {
          accessorKey: "created_at",
          header: "Added On",
          cell: (info) => (
            <span className="text-gray-600 dark:text-dark-300">{formatDateDDMMYYYY(info.getValue<string>())}</span>
          ),
        },
        {
          id: "actions",
          header: "Actions",
          cell: (info) => (
            <DynamicServiceRowActions
              service={info.row.original}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ),
          enableSorting: false,
          enableColumnFilter: false,
        },
      ];
    }

    return [
      {
        id: "select",
        header: SelectHeader,
        cell: SelectCell,
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: "service_name",
        header: "Service Name",
        cell: (info) => (
          <div className="font-medium text-gray-800 dark:text-dark-100">
            {globalFilter ? <Highlight query={globalFilter}>{info.getValue<string>()}</Highlight> : info.getValue<string>()}
          </div>
        ),
      },
      {
        accessorKey: "business_name",
        header: "Business Name",
        cell: (info) => (
          <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>() || "-"}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: (info) => (
          <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>() || "-"}</span>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: (info) => (
          <span className="text-gray-600 dark:text-dark-300">₹{info.getValue<number>()?.toLocaleString()}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const status = info.getValue<string>();
          const colorMap: Record<string, "success" | "warning" | "error" | "info"> = {
            'approved': 'success',
            'pending': 'warning',
            'rejected': 'error',
            'draft': 'info',
            'inactive': 'error',
          };
          return (
            <Badge
              color={colorMap[status] || 'info'}
              variant="soft"
              className="capitalize"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Active",
        cell: (info) => (
          <Badge
            color={info.getValue<boolean>() ? "success" : "error"}
            variant="soft"
          >
            {info.getValue<boolean>() ? "Yes" : "No"}
          </Badge>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created Date",
        cell: (info) => (
          <span className="text-gray-600 dark:text-dark-300">{formatDateDDMMYYYY(info.getValue<string>())}</span>
        ),
      },
      {
        accessorKey: "vendor_name",
        header: "Vendor",
        cell: (info) => (
          <span className="text-gray-600 dark:text-dark-300">{info.getValue<string>() || "-"}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <DynamicServiceRowActions
            service={info.row.original}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
    ];
  }, [globalFilter, serviceType]);

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
    if (serviceType) {
      navigate(`/services/${serviceType}/add`);
    }
  };

  const handleEdit = (service: DynamicService) => {
    if (serviceType) {
      navigate(`/services/${serviceType}/edit/${service.id}`);
    }
  };

  const handleDelete = (service: DynamicService) => {
    setDeleteTarget(service);
    setDeleteOpen(true);
    setDeleteState("pending");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !serviceType) return;
    setDeleteLoading(true);
    try {
      await DynamicServiceApi.deleteService(serviceType, deleteTarget.id);
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


  // ── Render ───────────────────────────────────────────────────────────────
  const serviceDisplayName = serviceType ? getServiceTypeDisplayName(serviceType) : "Services";

  return (
    <Page>
      <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">{serviceDisplayName}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">View and manage {serviceDisplayName.toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              onClick={() => navigate('/services')}
              className="gap-2"
            >
              <ArrowPathIcon className="size-4.5" />
              Back to All Services
            </Button>
            <Button onClick={handleAdd} color="primary" className="gap-2">
              <PlusIcon className="size-4.5" />
              <span>Add New {serviceDisplayName.split(' ')[0]}</span>
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
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden dark:border-dark-500">
              <Button
                variant="outlined"
                isIcon
                onClick={() => setViewMode("table")}
                className={clsx(
                  "h-10 w-10 rounded-none border-none bg-white text-gray-600 hover:bg-gray-50 focus:border-primary focus:text-primary dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600",
                  viewMode === "table" && "bg-gray-100 dark:bg-dark-600"
                )}
              >
                <TableCellsIcon className="size-4.5" />
              </Button>
              <Button
                variant="outlined"
                isIcon
                onClick={() => setViewMode("grid")}
                className={clsx(
                  "h-10 w-10 rounded-none border-none bg-white text-gray-600 hover:bg-gray-50 focus:border-primary focus:text-primary dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600",
                  viewMode === "grid" && "bg-gray-100 dark:bg-dark-600"
                )}
              >
                <Squares2X2Icon className="size-4.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total {serviceDisplayName.split(' ')[0]}s</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <TableCellsIcon className="size-6" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Approved</p>
                <p className="text-3xl font-bold mt-1">{stats.approved}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <PlusIcon className="size-6" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold mt-1">{stats.pending}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <FunnelIcon className="size-6" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold mt-1">{stats.rejected}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <TrashIcon className="size-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <Input
            placeholder={`Search by ${serviceType === 'hotel' ? 'hotel name, category, address...' : 'service name, category...'}`}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4.5 text-gray-400" />}
            className="w-full max-w-md"
          />
        </div>

        {/* Filter */}
        {showFilter && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-700">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                placeholder="Filter by name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              <Input
                placeholder="Filter by vendor..."
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
              />
              <Button variant="outlined" onClick={() => { setFilterName(""); setFilterVendor(""); }}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
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
                      No services found
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
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full py-12 text-center text-gray-500">Loading...</div>
            ) : filteredData.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-500">No services found</div>
            ) : (
              filteredData.map((service) => (
                <div
                  key={service.id}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-blue-300 transition-all duration-300 dark:border-dark-500 dark:bg-dark-700 dark:hover:border-blue-500"
                >
                  {/* Image Header */}
                  <div className="relative h-56 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-600 dark:to-dark-500 overflow-hidden">
                    {service.image_url || service.main_image ? (
                      <img
                        src={service.image_url || service.main_image}
                        alt={service.service_name || service.hotel_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <TableCellsIcon className="size-20 text-gray-300 dark:text-dark-400 mx-auto" />
                          <p className="text-sm text-gray-400 dark:text-dark-400 mt-2">No Image</p>
                        </div>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge
                        color={service.status === 'approved' ? 'success' : service.status === 'pending' ? 'warning' : 'error'}
                        className="capitalize shadow-md"
                      >
                        {service.status}
                      </Badge>
                    </div>
                    {/* Price/Rating Badge */}
                    <div className="absolute bottom-4 left-4">
                      {serviceType === "hotel" && service.hotel_rating ? (
                        <div className="bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md">
                          <div className="flex items-center gap-1">
                            <StarIcon className="size-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold text-gray-800 dark:text-dark-100">{service.hotel_rating}</span>
                          </div>
                        </div>
                      ) : service.price ? (
                        <div className="bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md">
                          <div className="flex items-center gap-1">
                            <CurrencyDollarIcon className="size-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-blue-600 dark:text-blue-400">{service.price?.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-dark-100 mb-1 line-clamp-1">
                      {service.hotel_name || service.service_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-400 mb-4 line-clamp-1">
                      {service.business_name || service.category || "-"}
                    </p>

                    <div className="space-y-3 text-sm">
                      {serviceType === "hotel" ? (
                        <>
                          <div className="flex items-center gap-3 text-gray-600 dark:text-dark-300">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                              <MapPinIcon className="size-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="truncate flex-1">{service.city || (service.location && !service.location.startsWith('http') ? service.location : '-')}</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-600 dark:text-dark-300">
                            <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                              <PhoneIcon className="size-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span>{service.contact_no || "-"}</span>
                          </div>
                          {service.category && (
                            <div className="flex items-center gap-3 text-gray-600 dark:text-dark-300">
                              <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                                <TagIcon className="size-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <span className="truncate flex-1">{service.category}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 text-gray-600 dark:text-dark-300">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                              <MapPinIcon className="size-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="truncate flex-1">{service.city || "-"}</span>
                          </div>
                          {service.category && (
                            <div className="flex items-center gap-3 text-gray-600 dark:text-dark-300">
                              <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                                <TagIcon className="size-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <span className="truncate flex-1">{service.category}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-dark-500">
                      <Button
                        size="sm"
                        variant="outlined"
                        className="flex-1 font-medium"
                        onClick={() => handleEdit(service)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outlined"
                        color="error"
                        className="flex-1 font-medium"
                        onClick={() => handleDelete(service)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
