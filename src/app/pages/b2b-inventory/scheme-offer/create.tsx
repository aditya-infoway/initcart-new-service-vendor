import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon, CheckCircleIcon, MegaphoneIcon,
  CalendarDaysIcon, BuildingOfficeIcon, CurrencyDollarIcon,
  XMarkIcon, InformationCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Textarea, Checkbox } from "@/components/ui";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, Post, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface BranchOption {
  id: number;
  branch_name: string;
}

interface SchemeOffer {
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

// ── Validation ───────────────────────────────────────────────────────────────
const validateForm = (values: SchemeOffer): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!values.offer_name?.trim()) errors.offer_name = "Offer name is required";
  if (!values.start_date) errors.start_date = "Start date is required";
  if (!values.end_date) errors.end_date = "End date is required";
  if (values.start_date && values.end_date && new Date(values.end_date) < new Date(values.start_date)) {
    errors.end_date = "End date must be on or after start date";
  }
  if (!values.availability) errors.availability = "Availability is required";
  if (values.availability === "selected" && (!values.branches || values.branches.length === 0)) {
    errors.branches = "Select at least one branch";
  }
  if (!values.amount || Number(values.amount) <= 0) errors.amount = "Amount must be greater than 0";
  if (!values.scheme_type) errors.scheme_type = "Scheme type is required";
  if (!values.status) errors.status = "Status is required";
  
  return errors;
};

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
        className={clsx(
          "flex h-9 items-center rounded-lg border px-3 cursor-pointer",
          error ? "border-error-500 bg-error-50" : "border-gray-300 bg-white hover:border-gray-400 dark:border-dark-500 dark:bg-dark-800"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex-1 truncate text-sm text-gray-700 dark:text-dark-200">
          {getSelectedNames()}
        </span>
        <span className={clsx("transition-transform", isOpen && "rotate-180")}>▼</span>
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

// ── Section Header Helper ────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
      <Icon className="size-4" /> {title}
    </div>
  );
}

// ── Main Create Page Component ───────────────────────────────────────────────
export default function SchemeOfferCreatePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState<SchemeOffer>({
    offer_name: "",
    start_date: today,
    end_date: today,
    availability: "all",
    branches: [],
    amount: "",
    scheme_type: "per_month",
    status: "active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load Branches ──
  useEffect(() => {
    setBranchesLoading(true);
    Get("pos/branches/")
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

  // ── Handle Form Changes ──
  const handleChange = (field: keyof SchemeOffer, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // ── Handle Submit ──
  const handleSubmit = async () => {
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setCreating(true);
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

      const res = await Post("pos/scheme-offers/", payload) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message || "Scheme offer created successfully");
        navigate("/b2b-inventory/scheme-offer");
      } else {
        toasterrormsg(res?.data?.message || "Failed to create scheme offer");
      }
    } catch (error: any) {
      const err = error?.response?.data;
      const msg = err?.message || err?.error || err?.non_field_errors?.[0] || "Failed to create scheme offer";
      toasterrormsg(msg);
    } finally {
      setCreating(false);
    }
  };

  // ── Options for Combobox ──
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
    <Page title="Create Scheme Offer">
      <div className="transition-content w-full pb-8 space-y-4">
        {/* Header */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={() => navigate("/b2b-inventory/scheme-offer")}>
              <ArrowLeftIcon className="size-4" /> Back to Schemes
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">Create Scheme Offer</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Create promotional schemes and offers</p>
            </div>
          </div>
        </div>

        {/* Scheme Details */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="p-4">
            <SectionHeader icon={MegaphoneIcon} title="Scheme Details" />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Offer Name</label>
                <Input
                  value={formData.offer_name}
                  onChange={e => handleChange("offer_name", e.target.value)}
                  placeholder="e.g. Diwali Bonanza"
                  className={clsx(errors.offer_name && "border-error-500")}
                />
                {errors.offer_name && <p className="text-xs text-error-600 mt-1">{errors.offer_name}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Start Date</label>
                <DatePicker
                  value={formData.start_date}
                  onChange={(v: string) => handleChange("start_date", v || today)}
                  className={clsx(errors.start_date && "border-error-500")}
                />
                {errors.start_date && <p className="text-xs text-error-600 mt-1">{errors.start_date}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">End Date</label>
                <DatePicker
                  value={formData.end_date}
                  onChange={(v: string) => handleChange("end_date", v || today)}
                  className={clsx(errors.end_date && "border-error-500")}
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

              {formData.availability === "selected" && (
                <div className="lg:col-span-3">
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
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Amount (₹)</label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={e => handleChange("amount", e.target.value)}
                  placeholder="e.g. 1000"
                  className={clsx(errors.amount && "border-error-500")}
                />
                {errors.amount && <p className="text-xs text-error-600 mt-1">{errors.amount}</p>}
              </div>

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
          </Card>
        </div>

        {/* Info Banner */}
        <div className="px-(--margin-x)">
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

        {/* Action Buttons */}
        <div className="px-(--margin-x) flex flex-wrap gap-3 justify-end">
          <Button variant="outlined" onClick={() => navigate("/b2b-inventory/scheme-offer")}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSubmit} disabled={creating}>
            <CheckCircleIcon className="size-4" /> {creating ? "Creating..." : "Create Scheme"}
          </Button>
        </div>
      </div>
    </Page>
  );
}
