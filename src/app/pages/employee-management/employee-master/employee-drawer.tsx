import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  EyeIcon, EyeSlashIcon, CheckIcon, XMarkIcon,
  UserIcon, DevicePhoneMobileIcon, EnvelopeIcon,
  MapPinIcon, BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import { Fragment, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

import { Button, Input } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { Get, Post, Patch, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

interface EmployeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: number;
  onSuccess: () => void;
}

interface FormData {
  full_name: string;
  mobile: string;
  email: string;
  password: string;
  city: string;
  address: string;
  department: string;
}

const DEPARTMENT_OPTIONS = [
  { id: "purchase", label: "Purchase Department" },
  { id: "sales", label: "Sales Department" },
  { id: "accounting", label: "Accounting Department" },
];

// ── Employee Drawer Component ─────────────────────────────────────────────────
export function EmployeeDrawer({ isOpen, onClose, employeeId, onSuccess }: EmployeeDrawerProps) {
  const isEditMode = Boolean(employeeId);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  const validationSchema = Yup.object({
    full_name: Yup.string().required("Full name is required"),

    mobile: Yup.string()
      .matches(/^[0-9]{10}$/, "Mobile must be 10 digits")
      .required("Mobile is required"),

    email: Yup.string()
      .email("Invalid email")
      .required("Login email is required"),

    password: isEditMode
      ? Yup.string()
        .min(6, "Password must be at least 6 characters")
        .default("")
      : Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required")
        .default(""),

    city: Yup.string().default(""),

    address: Yup.string().default(""),

    department: Yup.string().required("Department is required"),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      full_name: "",
      mobile: "",
      email: "",
      password: "",
      city: "",
      address: "",
      department: "",
    },
  });

  // Fetch employee data for edit mode
  useEffect(() => {
    if (!isEditMode) {
      reset({
        full_name: "",
        mobile: "",
        email: "",
        password: "",
        city: "",
        address: "",
        department: "",
      });
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const res = await Get(`pos/employees/${employeeId}/`) as any;
        const emp = res?.data?.data ?? res?.data ?? res;
        reset({
          full_name: emp?.full_name || "",
          mobile: emp?.mobile || "",
          email: emp?.email || "",
          password: "", // Password never pre-filled
          city: emp?.city || "",
          address: emp?.address || "",
          department: emp?.department || "",
        });
      } catch {
        toasterrormsg("Failed to load employee data");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, isEditMode, onClose, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      if (isEditMode) {
        // Edit mode: don't send email field (backend doesn't allow updating it)
        const payload: any = {
          full_name: data.full_name,
          mobile: data.mobile,
          city: data.city,
          address: data.address,
          department: data.department,
        };
        if (data.password) {
          payload.password = data.password;
        }
        await Patch(`pos/employees/${employeeId}/`, payload);
        toastsuccessmsg("Employee updated successfully");
      } else {
        await Post("pos/employees/", data);
        toastsuccessmsg("Employee created successfully");
      }
      onSuccess();
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.email?.[0] ||
        err?.response?.data?.mobile?.[0] ||
        err?.response?.data?.message ||
        (isEditMode ? "Failed to update employee" : "Failed to create employee");
      toasterrormsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={handleClose}>
        {/* Backdrop */}
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

        {/* Slide-over panel */}
        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[55%] xl:max-w-[48%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEditMode ? "Edit Employee" : "Add Employee"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEditMode ? "Update employee information" : "Fill in the details to create a new employee"}
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
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span className="text-sm text-white/75 mt-3">Loading...</span>
                </div>
              ) : (
                <>
                  {/* Basic Information */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                      <UserIcon className="size-5" />
                      Basic Information
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        {...register("full_name")}
                        prefix={<UserIcon className="size-4" />}
                        placeholder="Enter full name"
                        label={<>Full Name <span className="text-red-500">*</span></>}
                        error={errors.full_name?.message}
                      />

                      <Controller
                        control={control}
                        name="department"
                        rules={{ required: "Department is required" }}
                        render={({ field: { value, onChange, ...rest } }) => (
                          <Listbox
                            data={DEPARTMENT_OPTIONS}
                            placeholder="Select Department *"
                            value={DEPARTMENT_OPTIONS.find((o) => o.id === value) ?? null}
                            onChange={(item: any) => onChange(item?.id ?? "")}
                            label={<>Department <span className="text-red-500">*</span></>}
                            displayField="label"
                            error={errors.department?.message}
                            {...rest}
                          />
                        )}
                      />
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                      <DevicePhoneMobileIcon className="size-5" />
                      Contact Details
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        {...register("mobile")}
                        prefix={<DevicePhoneMobileIcon className="size-4" />}
                        placeholder="10 digit mobile"
                        label={<>Mobile No. <span className="text-red-500">*</span></>}
                        maxLength={10}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setValue("mobile", value);
                        }}
                        error={errors.mobile?.message}
                      />

                      <Input
                        {...register("email")}
                        prefix={<EnvelopeIcon className="size-4" />}
                        placeholder="email@gmail.com"
                        label={<>Login Email <span className="text-red-500">*</span></>}
                        type="email"
                        disabled={isEditMode}
                        error={errors.email?.message}
                        className={isEditMode ? "bg-gray-100 dark:bg-dark-800 cursor-not-allowed" : ""}
                      />
                      {isEditMode && (
                        <p className="col-span-2 text-xs text-gray-400 dark:text-dark-500">
                          Login email cannot be changed
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        {...register("city")}
                        prefix={<MapPinIcon className="size-4" />}
                        placeholder="Enter city"
                        label="City"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                        Address
                      </label>
                      <div className="flex items-start gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 dark:border-dark-500 dark:bg-dark-800 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                        <MapPinIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                        <textarea
                          {...register("address")}
                          rows={2}
                          placeholder="Enter full address"
                          className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-dark-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Login Credentials */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                      <BuildingLibraryIcon className="size-5" />
                      Login Credentials
                    </h4>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                        {isEditMode ? "New Password (optional)" : "Password"}{" "}
                        {!isEditMode && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <div className="flex items-start gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 dark:border-dark-500 dark:bg-dark-800 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                          <BuildingLibraryIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                          <input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            placeholder={isEditMode ? "Leave blank to keep current" : "Enter password"}
                            className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-dark-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-300"
                          >
                            {showPassword ? (
                              <EyeSlashIcon className="size-4" />
                            ) : (
                              <EyeIcon className="size-4" />
                            )}
                          </button>
                        </div>
                        {errors.password?.message && (
                          <p className="mt-1 text-xs text-error">{errors.password.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button
                type="submit"
                color="primary"
                className="flex-1"
                disabled={saving}
              >
                {saving
                  ? isEditMode ? "Updating..." : "Creating..."
                  : isEditMode ? "Update Employee" : "Create Employee"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                className="flex-1"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
