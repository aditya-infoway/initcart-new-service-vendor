import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowPathIcon, FunnelIcon, MagnifyingGlassIcon,
  MegaphoneIcon, PlusIcon, XMarkIcon, EyeIcon,
  PencilIcon, TrashIcon, CalendarDaysIcon, BuildingOfficeIcon,
  CurrencyDollarIcon, InformationCircleIcon, CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Checkbox } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { safeGet, Put, Post, Delete, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

interface SchemeOfferItem {
  id: number;
  offer_name: string;
  start_date: string;
  end_date: string;
  availability: string;
  branches: number[];
  branch_names: string;
  amount: string;
  scheme_type: string;
  status: string;
  created_by_branch: number;
  created_by_branch_name: string;
  created_at: string;
}

interface BranchOption {
  id: number;
  branch_name: string;
}

interface SchemeFormData {
  id?: number;
  offer_name: string;
  start_date: string;
  end_date: string;
  availability: "all" | "selected";
  branches: number[];
  amount: string | number;
  scheme_type: string;
  status: "active" | "inactive";
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  draft: "Draft",
  expired: "Expired",
};

const STATUS_COLOR: Record<string, "primary" | "info" | "success" | "warning" | "error" | "neutral"> = {
  active: "success",
  inactive: "neutral",
  draft: "info",
  expired: "warning",
};

const TYPE_LABEL: Record<string, string> = {
  per_month: "Per Month",
  per_day: "Per Day",
  per_year: "Per Year",
  one_time: "One Time",
  percentage: "Percentage",
  flat: "Flat",
};

const AVAILABILITY_LABEL: Record<string, string> = {
  all: "All Branches",
  selected: "Selected Branches",
};

function extractRows(res: any): SchemeOfferItem[] {
  const body = res?.data ?? res;
  if (body?.results?.data) return body.results.data;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body)) return body;
  return [];
}

// ── Branch Multi-Select Component ────────────────────────────────────────────
function BranchMultiSelect({
  branchOptions,
  selectedIds,
  onChange,
  error,
}: {
  branchOptions: BranchOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleBranch = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(b => b !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === branchOptions.length) {
      onChange([]);
    } else {
      onChange(branchOptions.map(b => b.id));
    }
  };

  const getSelectedNames = () => {
    if (selectedIds.length === 0) return "Select branches...";
    if (selectedIds.length === branchOptions.length) return "All branches selected";
    const names = branchOptions
      .filter(b => selectedIds.includes(b.id))
      .map(b => b.branch_name);
    return names.join(", ");
  };

  return (
    <div className="space-y-1 relative">
      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
        Select Branches
      </label>
      <div
        className={`flex h-9 items-center rounded-lg border px-3 cursor-pointer ${
          error ? "border-error-500 bg-error-50" : "border-gray-300 bg-white hover:border-gray-400 dark:border-dark-500 dark:bg-dark-800"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex-1 truncate text-sm text-gray-700 dark:text-dark-200">
          {getSelectedNames()}
        </span>
        <span className={`transition-transform ${isOpen && "rotate-180"}`}>▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto dark:bg-dark-800 dark:border-dark-500">
          <div className="p-2 border-b border-gray-200 dark:border-dark-600">
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700 p-2 rounded">
              <Checkbox
                checked={selectedIds.length === branchOptions.length && branchOptions.length > 0}
                onChange={toggleAll}
              />
              <span className="font-medium">Select All</span>
            </label>
          </div>
          <div className="p-2">
            {branchOptions.length === 0 ? (
              <span className="text-xs text-gray-400 dark:text-dark-400 block p-2">No branches found</span>
            ) : (
              branchOptions.map((b) => (
                <label
                  key={b.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700 p-2 rounded transition"
                >
                  <Checkbox
                    checked={selectedIds.includes(b.id)}
                    onChange={() => toggleBranch(b.id)}
                  />
                  {b.branch_name}
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-error-600">{error}</p>}
    </div>
  );
}

// ── Create/Edit Modal Component ───────────────────────────────────────────────
function SchemeFormModal({
  isOpen,
  onClose,
  editingScheme,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingScheme: SchemeOfferItem | null;
  onSaved: () => void;
}) {
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SchemeFormData>({
    offer_name: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    availability: "all",
    branches: [],
    amount: "",
    scheme_type: "per_month",
    status: "active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load branches
  useEffect(() => {
    setBranchesLoading(true);
    safeGet("pos/branches/")
      .then((res: any) => {
        let branchData: any[] = [];
        if (res?.data?.data && Array.isArray(res.data.data)) {
          branchData = res.data.data;
        } else if (res?.data?.results && Array.isArray(res.data.results)) {
          branchData = res.data.results;
        } else if (Array.isArray(res?.data)) {
          branchData = res.data;
        } else if (Array.isArray(res)) {
          branchData = res;
        }
        
        setBranchOptions(
          branchData.map((b: any) => ({
            id: b.id,
            branch_name: b.branch_name,
          }))
        );
      })
      .catch(() => {
        toasterrormsg("Failed to load branches");
        setBranchOptions([]);
      })
      .finally(() => setBranchesLoading(false));
  }, []);

  // Set form data when editing
  useEffect(() => {
    if (editingScheme) {
      setFormData({
        id: editingScheme.id,
        offer_name: editingScheme.offer_name,
        start_date: editingScheme.start_date,
        end_date: editingScheme.end_date,
        availability: editingScheme.availability as "all" | "selected",
        branches: editingScheme.branches || [],
        amount: editingScheme.amount,
        scheme_type: editingScheme.scheme_type,
        status: editingScheme.status as "active" | "inactive",
      });
    } else {
      setFormData({
        offer_name: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        availability: "all",
        branches: [],
        amount: "",
        scheme_type: "per_month",
        status: "active",
      });
    }
    setErrors({});
  }, [editingScheme, isOpen]);

  const validateForm = (values: SchemeFormData): Record<string, string> => {
    const errs: Record<string, string> = {};
    
    if (!values.offer_name?.trim()) errs.offer_name = "Offer name is required";
    if (!values.start_date) errs.start_date = "Start date is required";
    if (!values.end_date) errs.end_date = "End date is required";
    if (values.start_date && values.end_date && new Date(values.end_date) < new Date(values.start_date)) {
      errs.end_date = "End date must be on or after start date";
    }
    if (!values.availability) errs.availability = "Availability is required";
    if (values.availability === "selected" && (!values.branches || values.branches.length === 0)) {
      errs.branches = "Select at least one branch";
    }
    if (!values.amount || Number(values.amount) <= 0) errs.amount = "Amount must be greater than 0";
    if (!values.scheme_type) errs.scheme_type = "Scheme type is required";
    if (!values.status) errs.status = "Status is required";
    
    return errs;
  };

  const handleChange = (field: keyof SchemeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        offer_name: formData.offer_name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        availability: formData.availability,
        branches: formData.availability === "selected" ? formData.branches : [],
        amount: Number(formData.amount),
        scheme_type: formData.scheme_type,
        status: formData.status,
      };

      if (editingScheme?.id) {
        await Put(`pos/scheme-offers/${editingScheme.id}/`, payload);
        toastsuccessmsg("Scheme offer updated successfully");
      } else {
        await Post("pos/scheme-offers/", payload);
        toastsuccessmsg("Scheme offer created successfully");
      }
      onSaved();
      onClose();
    } catch (error: any) {
      const err = error?.response?.data;
      const msg = err?.message || err?.error || err?.non_field_errors?.[0] || "Failed to save scheme offer";
      toasterrormsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const availabilityOptions = [
    { value: "all", label: "All Branches" },
    { value: "selected", label: "Selected Branches" },
  ];

  const schemeTypeOptions = [
    { value: "per_month", label: "Per Month" },
    { value: "per_day", label: "Per Day" },
    { value: "per_year", label: "Per Year" },
    { value: "one_time", label: "One Time" },
    { value: "percentage", label: "Percentage" },
    { value: "flat", label: "Flat" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[210]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm dark:bg-black/50"
        />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={DialogPanel}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-700"
            >
              <div className="flex items-center justify-between bg-primary px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingScheme ? "Edit Scheme Offer" : "Create Scheme Offer"}
                  </h3>
                  <p className="mt-0.5 text-xs text-white/70">
                    {editingScheme ? "Update scheme details" : "Create a new promotional scheme"}
                  </p>
                </div>
                <Button onClick={onClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
                  <XMarkIcon className="size-5" />
                </Button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Offer Name</label>
                    <Input
                      value={formData.offer_name}
                      onChange={e => handleChange("offer_name", e.target.value)}
                      placeholder="e.g. Diwali Bonanza"
                      className={errors.offer_name ? "border-error-500" : ""}
                    />
                    {errors.offer_name && <p className="text-xs text-error-600 mt-1">{errors.offer_name}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Start Date</label>
                    <DatePicker
                      value={formData.start_date}
                      onChange={(v: string) => handleChange("start_date", v || new Date().toISOString().split("T")[0])}
                      className={errors.start_date ? "border-error-500" : ""}
                    />
                    {errors.start_date && <p className="text-xs text-error-600 mt-1">{errors.start_date}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">End Date</label>
                    <DatePicker
                      value={formData.end_date}
                      onChange={(v: string) => handleChange("end_date", v || new Date().toISOString().split("T")[0])}
                      className={errors.end_date ? "border-error-500" : ""}
                    />
                    {errors.end_date && <p className="text-xs text-error-600 mt-1">{errors.end_date}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Availability</label>
                    <Combobox
                      data={availabilityOptions}
                      displayField="label"
                      searchFields={["label"]}
                      value={availabilityOptions.find(o => o.value === formData.availability)}
                      onChange={(val: any) => handleChange("availability", val?.value || "all")}
                      placeholder="Select availability"
                    />
                    {errors.availability && <p className="text-xs text-error-600 mt-1">{errors.availability}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Amount (₹)</label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={e => handleChange("amount", e.target.value)}
                      placeholder="e.g. 1000"
                      className={errors.amount ? "border-error-500" : ""}
                    />
                    {errors.amount && <p className="text-xs text-error-600 mt-1">{errors.amount}</p>}
                  </div>

                  {formData.availability === "selected" && (
                    <div className="sm:col-span-2">
                      {branchesLoading ? (
                        <p className="text-xs text-gray-400 dark:text-dark-400">Loading branches...</p>
                      ) : (
                        <BranchMultiSelect
                          branchOptions={branchOptions}
                          selectedIds={formData.branches}
                          onChange={(ids) => handleChange("branches", ids)}
                          error={errors.branches}
                        />
                      )}
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Scheme Type</label>
                    <Combobox
                      data={schemeTypeOptions}
                      displayField="label"
                      searchFields={["label"]}
                      value={schemeTypeOptions.find(o => o.value === formData.scheme_type)}
                      onChange={(val: any) => handleChange("scheme_type", val?.value || "per_month")}
                      placeholder="Select type"
                    />
                    {errors.scheme_type && <p className="text-xs text-error-600 mt-1">{errors.scheme_type}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Status</label>
                    <Combobox
                      data={statusOptions}
                      displayField="label"
                      searchFields={["label"]}
                      value={statusOptions.find(o => o.value === formData.status)}
                      onChange={(val: any) => handleChange("status", val?.value || "active")}
                      placeholder="Select status"
                    />
                    {errors.status && <p className="text-xs text-error-600 mt-1">{errors.status}</p>}
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                  <InformationCircleIcon className="size-5 text-primary mt-0.5" />
                  <div className="text-sm text-gray-700 dark:text-dark-200">
                    <p className="font-semibold">Scheme Details</p>
                    <p className="mt-1 text-gray-600 dark:text-dark-400">
                      • Select "All Branches" to apply scheme to all branches<br />
                      • Select "Selected Branches" to choose specific branches<br />
                      • Amount represents the scheme value in rupees
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
                <Button variant="outlined" onClick={onClose}>Cancel</Button>
                <Button color="primary" onClick={handleSubmit} disabled={saving}>
                  <CheckCircleIcon className="size-4" /> {saving ? "Saving..." : (editingScheme ? "Update Scheme" : "Create Scheme")}
                </Button>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default function SchemeOfferListPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<SchemeOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState<SchemeOfferItem | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await safeGet("pos/scheme-offers/", { page: 1, page_size: 1000 }) as any;
      setRows(extractRows(res));
    } catch (e: any) {
      setRows([]);
      const status = e?.response?.status ?? 0;
      if (status >= 500) toasterrormsg("Could not load scheme offers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!statusFilter) return rows;
    return rows.filter(r => r.status === statusFilter);
  }, [rows, statusFilter]);

  const handleDelete = useCallback(async (row: SchemeOfferItem) => {
    if (!window.confirm(`Delete scheme offer "${row.offer_name}"?`)) return;
    setDeletingId(row.id);
    try {
      await Delete(`pos/scheme-offers/${row.id}/`, {});
      toastsuccessmsg("Scheme offer deleted");
      setRows(prev => prev.filter(r => r.id !== row.id));
    } catch (e: any) {
      toasterrormsg("Could not delete scheme offer");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleCreate = () => {
    setEditingScheme(null);
    setShowModal(true);
  };

  const columns = useMemo<ColumnDef<SchemeOfferItem>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SchemeOfferItem, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "offer_name", accessorKey: "offer_name", header: "Offer Name",
      cell: ({ getValue, table }: CellContext<SchemeOfferItem, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "period", header: "Period",
      enableGlobalFilter: false, enableSorting: false,
      cell: ({ row }: CellContext<SchemeOfferItem, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200 text-xs">
          {formatDateDDMMYYYY(row.original.start_date)} - {formatDateDDMMYYYY(row.original.end_date)}
        </span>
      ),
    },
    {
      id: "availability", accessorKey: "availability", header: "Availability",
      enableGlobalFilter: false,
      cell: ({ row }: CellContext<SchemeOfferItem, unknown>) => {
        const v = row.original.availability;
        if (v === "all") {
          return (
            <Badge color="primary" variant="soft" className="whitespace-nowrap text-xs">
              All Branches
            </Badge>
          );
        }
        return (
          <div className="max-w-[220px]">
            <Badge color="info" variant="soft" className="whitespace-nowrap text-xs mb-1">
              {AVAILABILITY_LABEL[v] ?? v} ({row.original.branches?.length ?? 0})
            </Badge>
            <p className="truncate text-xs text-gray-500 dark:text-dark-400" title={row.original.branch_names}>
              {row.original.branch_names}
            </p>
          </div>
        );
      },
    },
    {
      id: "amount", accessorKey: "amount", header: "Amount",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<SchemeOfferItem, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className="whitespace-nowrap font-semibold text-gray-800 dark:text-dark-100">
            ₹{v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      id: "scheme_type", accessorKey: "scheme_type", header: "Type",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<SchemeOfferItem, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <Badge color="neutral" variant="soft" className="whitespace-nowrap text-xs">
            {TYPE_LABEL[v] ?? (v || "—")}
          </Badge>
        );
      },
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      enableGlobalFilter: false,
      cell: ({ getValue }: CellContext<SchemeOfferItem, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <Badge color={STATUS_COLOR[v] ?? "primary"} variant="soft" className="whitespace-nowrap text-xs">
            {STATUS_LABEL[v] ?? (v || "—")}
          </Badge>
        );
      },
    },
    {
      id: "actions", header: "Actions", size: 120,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SchemeOfferItem, unknown>) => (
        <div className="flex items-center gap-1.5">
          <button
            title="View"
            onClick={() => navigate(`/b2b-inventory/scheme-offer/${row.original.id}`)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-primary/10 hover:text-primary transition-colors dark:text-dark-300"
          >
            <EyeIcon className="size-4" />
          </button>
          <button
            title="Edit"
            onClick={() => { setEditingScheme(row.original); setShowModal(true); }}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-warning/10 hover:text-warning transition-colors dark:text-dark-300"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            title="Delete"
            disabled={deletingId === row.original.id}
            onClick={() => handleDelete(row.original)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-error/10 hover:text-error transition-colors disabled:opacity-40 dark:text-dark-300"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      ),
    },
  ], [deletingId, navigate]);

  const table = useReactTable({
    data: filtered,
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
  });

  return (
    <Page title="Scheme Offers">
      <div className="transition-content w-full pb-8">
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <MegaphoneIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-dark-100">Scheme Offers</h1>
              <p className="text-xs text-gray-500 dark:text-dark-400">Manage promotional schemes and offers</p>
            </div>
          </div>
          <Button color="primary" className="gap-2" onClick={handleCreate}>
            <PlusIcon className="size-4" /> New Scheme
          </Button>
        </div>

        <div className="px-(--margin-x) flex flex-wrap gap-3 items-center mt-2">
          <div className="relative flex-1 min-w-[250px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <Input
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search schemes..."
              className="pl-10"
            />
          </div>
          <Button variant="outlined" className="gap-2" onClick={fetchRows}>
            <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
          </Button>
          <Button variant="outlined" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
            <FunnelIcon className="size-4" /> Filters
          </Button>
        </div>

        {showFilters && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-800">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Status</label>
                  <Combobox
                    data={[
                      { value: "", label: "All Status" },
                      ...Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v })),
                    ]}
                    displayField="label"
                    searchFields={["label"]}
                    value={statusFilter ? { value: statusFilter, label: STATUS_LABEL[statusFilter] } : null}
                    onChange={(val: any) => setStatusFilter(val?.value || "")}
                    placeholder="All Status"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading schemes…" : "No scheme offers found"}
        />
      </div>

      <SchemeFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingScheme={editingScheme}
        onSaved={fetchRows}
      />
    </Page>
  );
}
