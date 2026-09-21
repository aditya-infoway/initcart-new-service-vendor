import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  KeyIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Controller, useForm } from "react-hook-form";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Button, Input } from "@/components/ui";
import { GhostSpinner } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Post, Patch, Get, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import {
  Branch,
  BranchFormValues,
  BRANCH_STATUS_OPTIONS,
  BRANCH_TYPE_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  buildBranchFormValues,
  buildBranchPayload,
} from "./data";

interface BranchDrawerProps {
  isOpen: boolean;
  close: () => void;
  branch: Branch | null;
  onSaved: () => void;
}

function FileField({
  label,
  required,
  previewUrl,
  fileVal,
  onPick,
}: {
  label: string;
  required?: boolean;
  previewUrl?: string | null;
  fileVal?: File | null;
  onPick: (f: File) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2.5 dark:border-dark-500 dark:bg-dark-800">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/10">
          Choose File
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
        </label>
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="truncate text-sm text-gray-600 dark:text-dark-200">
            {fileVal ? fileVal.name : previewUrl ? "Existing file" : "No file chosen"}
          </span>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-primary-600 hover:underline dark:text-primary-400"
            >
              Current: View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function BranchDrawer({ isOpen, close, branch, onSaved }: BranchDrawerProps) {
  const isEdit = Boolean(branch && branch.id > 0);
  const [saving, setSaving] = useState(false);
  const [debitorAccounts, setDebitorAccounts] = useState<{ id: number; account_name: string }[]>([]);
  const [creditorAccounts, setCreditorAccounts] = useState<{ id: number; account_name: string }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const defaultValues = useMemo(() => buildBranchFormValues(branch), [branch]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<BranchFormValues>({ defaultValues, mode: "onTouched" });

  useEffect(() => {
    if (isOpen) reset(buildBranchFormValues(branch));
  }, [branch, isOpen, reset]);

  // Fetch linked accounts when drawer opens
  useEffect(() => {
    if (isOpen) {
      const fetchAccounts = async () => {
        setLoadingAccounts(true);
        try {
          const params = branch ? `?branch_id=${branch.id}` : "";
          const res = await Get(`pos/branch-linkable-accounts/${params}`);
          setDebitorAccounts((res as any)?.debitor_accounts || []);
          setCreditorAccounts((res as any)?.creditor_accounts || []);
        } catch (error) {
          console.error("Failed to fetch accounts:", error);
          setDebitorAccounts([]);
          setCreditorAccounts([]);
        } finally {
          setLoadingAccounts(false);
        }
      };
      fetchAccounts();
    }
  }, [isOpen, branch]);

  const handleClose = () => {
    reset();
    close();
  };

  // Combine accounts for combobox
  const accountOptions = useMemo(() => {
    const options: Array<{ id: string | number; label: string; type: "debitor" | "creditor" }> = [];
    debitorAccounts.forEach((acc) => {
      options.push({ id: acc.id, label: acc.account_name, type: "debitor" });
    });
    creditorAccounts.forEach((acc) => {
      options.push({ id: acc.id, label: acc.account_name, type: "creditor" });
    });
    return options;
  }, [debitorAccounts, creditorAccounts]);

  const onSubmit = async (values: BranchFormValues) => {
    setSaving(true);
    try {
      const { formData, data } = buildBranchPayload(values, isEdit);
      const payload = formData ?? (() => {
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => {
          if (v !== null && v !== undefined) fd.append(k, String(v));
        });
        return fd;
      })();
      if (isEdit) {
        await Patch(`pos/branches/${branch!.id}/`, payload, true);
      } else {
        await Post("pos/branches/", payload, true);
      }
      toastsuccessmsg(isEdit ? "Branch updated successfully." : "Branch created successfully.");
      onSaved();
      handleClose();
    } catch (e: any) {
      const errMsg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        Object.values(e?.response?.data ?? {}).flat().join(", ") ||
        (isEdit ? "Failed to update branch." : "Failed to create branch.");
      toasterrormsg(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={handleClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />

        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[65%] xl:max-w-[55%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEdit ? "Edit Branch" : "Add Branch"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEdit ? "Update branch details and documents" : "Create a new branch with all required details"}
              </p>
            </div>
            <Button
              onClick={handleClose}
              variant="flat"
              isIcon
              className="size-8 rounded-full text-white hover:bg-white/10"
            >
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">

              {/* Row 1: Branch Type + Branch Name */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="branchType"
                  rules={{ required: "Branch type is required" }}
                  render={({ field: { value, onChange, ...rest } }) => (
                    <Combobox
                      data={BRANCH_TYPE_OPTIONS}
                      displayField="label"
                      searchFields={["label"]}
                      placeholder="Select Branch Type"
                      value={BRANCH_TYPE_OPTIONS.find((o) => o.id === value) ?? null}
                      onChange={(item: any) => onChange(item?.id ?? "")}
                      label={<>Branch Type <span className="text-red-500">*</span></>}
                      {...rest}
                      inputProps={{ className: "h-9 text-sm" }}
                    />
                  )}
                />
                <Input
                  {...register("branchName", { required: "Branch name is required" })}
                  prefix={<BuildingStorefrontIcon className="size-4" />}
                  placeholder="Branch Name"
                  label={<>Branch Name <span className="text-red-500">*</span></>}
                  error={errors.branchName?.message}
                />
              </div>

              {/* Row 2: Owner + Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  {...register("ownerName", { required: "Owner name is required" })}
                  prefix={<UserIcon className="size-4" />}
                  placeholder="Owner Name"
                  label={<>Owner Name <span className="text-red-500">*</span></>}
                  error={errors.ownerName?.message}
                />
                <Input
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
                  })}
                  prefix={<EnvelopeIcon className="size-4" />}
                  placeholder="Email"
                  label={<>Email <span className="text-red-500">*</span></>}
                  error={errors.email?.message}
                  type="email"
                />
              </div>

              {/* Row 3: Phone + Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  {...register("phone", {
                    required: "Phone is required",
                    minLength: { value: 10, message: "Min 10 digits" },
                  })}
                  prefix={<PhoneIcon className="size-4" />}
                  placeholder="Phone"
                  label={<>Phone <span className="text-red-500">*</span></>}
                  error={errors.phone?.message}
                />
                <Input
                  {...register("password", isEdit ? {} : {
                    required: "Password is required",
                    minLength: { value: 8, message: "Min 8 characters" },
                  })}
                  type="password"
                  prefix={<KeyIcon className="size-4" />}
                  placeholder="Password"
                  label={
                    <>
                      Password {!isEdit && <span className="text-red-500">*</span>}
                      {isEdit && <span className="ml-1 text-xs font-normal text-gray-500 dark:text-dark-300">(Optional - leave blank to keep current)</span>}
                    </>
                  }
                  error={errors.password?.message}
                />
              </div>
              {isEdit && (
                <p className="-mt-3 text-xs text-gray-500 dark:text-dark-300">
                  Leave blank to keep current password
                </p>
              )}

              {/* Row 4: Linked Account + Business Type */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="linkedAccountId"
                  render={({ field: { value, onChange, ...rest } }) => (
                    <Combobox
                      data={accountOptions}
                      displayField="label"
                      searchFields={["label"]}
                      placeholder="Select Linked Account"
                      value={accountOptions.find((o) => o.id === value) ?? null}
                      onChange={(item: any) => {
                        if (item) {
                          onChange(item.id);
                          setValue("linkedAccount", item.label, { shouldDirty: true });
                        } else {
                          onChange("");
                          setValue("linkedAccount", "", { shouldDirty: true });
                        }
                      }}
                      label="Linked Account (Sundry Debitor / Creditor)"
                      {...rest}
                      inputProps={{ className: "h-9 text-sm" }}
                      disabled={loadingAccounts}
                    />
                  )}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-6 rounded-xl border border-gray-300 bg-white px-4 py-2.5 dark:border-dark-500 dark:bg-dark-800">
                    {BUSINESS_TYPE_OPTIONS.map((opt) => (
                      <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-dark-100">
                        <input
                          {...register("businessType", { required: true })}
                          type="radio"
                          value={opt.id}
                          className="size-4 text-primary focus:ring-primary"
                        />
                        <span className="font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                  <MapPinIcon className="size-5" />
                  Address
                </h4>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register("address", { required: "Address is required" })}
                    rows={2}
                    placeholder="Full address"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                  />
                  {errors.address && <p className="mt-1 text-xs text-error">{errors.address.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    {...register("country")}
                    prefix={<MapPinIcon className="size-4" />}
                    placeholder="Country (Optional)"
                    label="Country (Optional)"
                  />
                  <Input
                    {...register("state")}
                    prefix={<MapPinIcon className="size-4" />}
                    placeholder="State"
                    label={<>State <span className="text-red-500">*</span></>}
                    error={errors.state?.message}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    {...register("city")}
                    prefix={<MapPinIcon className="size-4" />}
                    placeholder="City"
                    label={<>City <span className="text-red-500">*</span></>}
                    error={errors.city?.message}
                  />
                  <Input
                    {...register("pincode", { required: "Pincode is required" })}
                    placeholder="Pincode"
                    label={<>Pincode <span className="text-red-500">*</span></>}
                    error={errors.pincode?.message}
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                  <BanknotesIcon className="size-5" />
                  Bank Details
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    {...register("bankName", { required: "Bank name is required" })}
                    prefix={<BuildingLibraryIcon className="size-4" />}
                    placeholder="Bank Name"
                    label={<>Bank Name <span className="text-red-500">*</span></>}
                    error={errors.bankName?.message}
                  />
                  <Input
                    {...register("accountNumber", { required: "Account number is required" })}
                    placeholder="Account Number"
                    label={<>Account Number <span className="text-red-500">*</span></>}
                    error={errors.accountNumber?.message}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    {...register("ifscCode", { required: "IFSC code is required" })}
                    placeholder="IFSC Code"
                    label={<>IFSC Code <span className="text-red-500">*</span></>}
                    error={errors.ifscCode?.message}
                  />
                  <Input
                    {...register("upiId")}
                    placeholder="UPI ID"
                    label="UPI ID"
                  />
                </div>
              </div>

              {/* Documents */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                  <ClipboardDocumentListIcon className="size-5" />
                  Documents
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FileField
                    label="License File"
                    fileVal={watch("licenseFile")}
                    previewUrl={watch("licenseUrl")}
                    onPick={(f) => setValue("licenseFile", f, { shouldDirty: true })}
                  />
                  <FileField
                    label="GST Certificate"
                    fileVal={watch("gstCertificateFile")}
                    previewUrl={watch("gstUrl")}
                    onPick={(f) => setValue("gstCertificateFile", f, { shouldDirty: true })}
                  />
                  <FileField
                    label="ID Proof"
                    fileVal={watch("idProofFile")}
                    previewUrl={watch("idProofUrl")}
                    onPick={(f) => setValue("idProofFile", f, { shouldDirty: true })}
                  />
                  <FileField
                    label="Branch Logo"
                    fileVal={watch("branchLogoFile")}
                    previewUrl={watch("logoUrl")}
                    onPick={(f) => setValue("branchLogoFile", f, { shouldDirty: true })}
                  />
                </div>
              </div>

              {/* Status (edit only) */}
              {isEdit && (
                <Controller
                  control={control}
                  name="status"
                  render={({ field: { value, onChange, ...rest } }) => (
                    <Combobox
                      data={BRANCH_STATUS_OPTIONS}
                      displayField="label"
                      searchFields={["label"]}
                      placeholder="Select Status"
                      value={BRANCH_STATUS_OPTIONS.find((o) => o.id === value) ?? null}
                      onChange={(item: any) => onChange(item?.id ?? value)}
                      label="Status"
                      {...rest}
                      inputProps={{ className: "h-9 text-sm" }}
                    />
                  )}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button type="button" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={saving || (isEdit && !isDirty)}
                className="gap-2 min-w-[10rem]"
              >
                {saving && <GhostSpinner variant="soft" className="size-4 border-2" />}
                {isEdit ? "Update Branch" : "Create Branch"}
              </Button>
            </div>
          </form>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
