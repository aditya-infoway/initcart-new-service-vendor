import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  BuildingLibraryIcon,
  CurrencyRupeeIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  IdentificationIcon,
  MapPinIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Controller, useForm } from "react-hook-form";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Country, State, City } from "country-state-city";

import { Button, Input } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { Post, Patch, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import {
  Account,
  AccountFormValues,
  GROUP_OPTIONS,
  DRCR_OPTIONS,
  buildAccountFormValues,
  buildAccountPayload,
} from "./data";

interface AccountDrawerProps {
  isOpen: boolean;
  close: () => void;
  account: Account | null;
  onSaved: () => void;
}

export function AccountDrawer({ isOpen, close, account, onSaved }: AccountDrawerProps) {
  const isEdit = Boolean(account && account.id > 0);
  const [saving, setSaving] = useState(false);

  // ── Country / State / City dropdown data ──
  const [countries, setCountries] = useState<{ id: string; label: string }[]>([]);
  const [states, setStates] = useState<{ id: string; label: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; label: string }[]>([]);

  const defaultValues = useMemo(() => buildAccountFormValues(account), [account]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccountFormValues>({ defaultValues, mode: "onTouched" });

  const watchedCountry = watch("country");
  const watchedState = watch("state");

  // Saare countries ek baar load karo (component mount pe)
  useEffect(() => {
    setCountries(
      Country.getAllCountries().map((c) => ({ id: c.isoCode, label: c.name })),
    );
  }, []);

  // Drawer khulte hi form reset karo, aur agar edit mode hai to
  // uske saved country/state ke hisaab se states/cities dropdown bhi bhar do
  useEffect(() => {
    if (!isOpen) return;
    reset(buildAccountFormValues(account));

    if (account?.country) {
      setStates(
        State.getStatesOfCountry(account.country).map((s) => ({ id: s.isoCode, label: s.name })),
      );
    } else {
      setStates([]);
    }

    if (account?.country && account?.state) {
      setCities(
        City.getCitiesOfState(account.country, account.state).map((c) => ({ id: c.name, label: c.name })),
      );
    } else {
      setCities([]);
    }
  }, [account, isOpen, reset]);

  // Country badalne pe: state/city reset karo, naye states load karo
  const handleCountryChange = (countryCode: string) => {
    setValue("country", countryCode, { shouldValidate: true });
    setValue("state", "");
    setValue("city", "");
    setStates(
      countryCode
        ? State.getStatesOfCountry(countryCode).map((s) => ({ id: s.isoCode, label: s.name }))
        : [],
    );
    setCities([]);
  };

  // State badalne pe: city reset karo, nayi cities load karo
  const handleStateChange = (stateCode: string) => {
    setValue("state", stateCode, { shouldValidate: true });
    setValue("city", "");
    setCities(
      watchedCountry && stateCode
        ? City.getCitiesOfState(watchedCountry, stateCode).map((c) => ({ id: c.name, label: c.name }))
        : [],
    );
  };

  const handleClose = () => {
    reset();
    close();
  };

  const onSubmit = async (values: AccountFormValues) => {
    setSaving(true);
    try {
      const payload = buildAccountPayload(values);
      if (isEdit) {
        await Patch(`pos/account/${account!.id}/`, payload);
        toastsuccessmsg("Account updated successfully.");
      } else {
        await Post("pos/account-create/", payload);
        toastsuccessmsg("Account created successfully.");
      }
      onSaved();
      handleClose();
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          Object.values(e?.response?.data ?? {}).flat().join(", ") ||
          (isEdit ? "Failed to update account." : "Failed to create account."),
      );
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
                {isEdit ? "Edit Account" : "Add Account"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEdit ? "Update account details" : "Fill in the details to create a new account"}
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

              {/* Basic Information */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                  <BuildingLibraryIcon className="size-5" />
                  Basic Information
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    {...register("accountName", { required: "Account name is required" })}
                    prefix={<UserIcon className="size-4" />}
                    placeholder="Enter account name"
                    label={<>Account Name <span className="text-red-500">*</span></>}
                    error={errors.accountName?.message}
                  />

                  <Controller
                    control={control}
                    name="group"
                    rules={{ required: "Group is required" }}
                    render={({ field: { value, onChange, ...rest } }) => (
                      <Listbox
                        data={GROUP_OPTIONS}
                        placeholder="Select Group *"
                        value={GROUP_OPTIONS.find((o) => o.id === value) ?? null}
                        onChange={(item: any) => {
                          const selectedGroup = item?.id ?? "";
                          onChange(selectedGroup);
                          if (selectedGroup === "Customer") setValue("drcr", "Dr");
                          else if (selectedGroup === "Supplier") setValue("drcr", "Cr");
                        }}
                        label={<>Group <span className="text-red-500">*</span></>}
                        displayField="label"
                        error={(errors.group as any)?.message}
                        {...rest}
                      />
                    )}
                  />
                </div>

                <div className="sm:max-w-xs">
                  <Input
                    {...register("openingBalance")}
                    prefix={<CurrencyRupeeIcon className="size-4" />}
                    placeholder="0.00"
                    label="Opening Balance"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>

                {/* DR / CR Radio */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    DR./CR. <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="drcr"
                    rules={{ required: "Please select Dr or Cr" }}
                    render={({ field }) => (
                      <div className="flex items-center gap-6">
                        {DRCR_OPTIONS.map((opt) => (
                          <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value={opt.id}
                              checked={field.value === opt.id}
                              onChange={() => field.onChange(opt.id)}
                              className="accent-primary size-4"
                            />
                            <span className="text-sm text-gray-700 dark:text-dark-200">
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  />
                  {errors.drcr && (
                    <p className="mt-1 text-xs text-error">{errors.drcr.message}</p>
                  )}
                </div>
              </div>

              {/* Contact Details */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                  <MapPinIcon className="size-5" />
                  Contact Details
                </h4>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Address
                  </label>
                  <div className="flex items-start gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 dark:border-dark-500 dark:bg-dark-800 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                    <GlobeAltIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                    <textarea
                      {...register("address")}
                      rows={2}
                      placeholder="Enter full address"
                      className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-dark-100"
                    />
                  </div>
                </div>

                {/* Country / State / City — cascading dropdowns */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Controller
                    control={control}
                    name="country"
                    render={({ field: { value } }) => (
                      <Listbox
                        data={countries}
                        placeholder="Select Country"
                        value={countries.find((c) => c.id === value) ?? null}
                        onChange={(item: any) => handleCountryChange(item?.id ?? "")}
                        label="Country"
                        displayField="label"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="state"
                    render={({ field: { value } }) => (
                      <Listbox
                        data={states}
                        placeholder="Select State"
                        value={states.find((s) => s.id === value) ?? null}
                        onChange={(item: any) => handleStateChange(item?.id ?? "")}
                        label="State"
                        displayField="label"
                        disabled={!watchedCountry}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="city"
                    render={({ field: { value, onChange } }) => (
                      <Listbox
                        data={cities}
                        placeholder="Select City"
                        value={cities.find((c) => c.id === value) ?? null}
                        onChange={(item: any) => onChange(item?.id ?? "")}
                        label="City"
                        displayField="label"
                        disabled={!watchedState}
                      />
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    {...register("pincode", {
                      pattern: { value: /^\d{6}$/, message: "Enter valid 6-digit pincode" },
                    })}
                    prefix={<MapPinIcon className="size-4" />}
                    placeholder="6-digit pincode"
                    label="Pincode"
                    error={errors.pincode?.message}
                  />
                  <Input
                    {...register("mobile", {
                      pattern: { value: /^\d{10}$/, message: "Enter valid 10-digit mobile" },
                    })}
                    prefix={<DevicePhoneMobileIcon className="size-4" />}
                    placeholder="10-digit mobile"
                    label="Mobile"
                    error={errors.mobile?.message}
                  />
                  <Input
                    {...register("email", {
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter valid email" },
                    })}
                    prefix={<EnvelopeIcon className="size-4" />}
                    placeholder="customer@example.com"
                    label="Email"
                    type="email"
                    error={errors.email?.message}
                  />
                </div>
              </div>

              {/* Legal & Financial */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-base font-semibold text-primary-600 dark:text-primary-400">
                  <DocumentTextIcon className="size-5" />
                  Legal &amp; Financial
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    {...register("gstNo", {
                      pattern: {
                        value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                        message: "Enter valid GST number",
                      },
                    })}
                    prefix={<IdentificationIcon className="size-4" />}
                    placeholder="22AAAAA0000A1Z5"
                    label="GST No."
                    error={errors.gstNo?.message}
                  />
                  <Input
                    {...register("panCard", {
                      pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: "Enter valid PAN" },
                    })}
                    prefix={<IdentificationIcon className="size-4" />}
                    placeholder="AAAAA0000A"
                    label="PAN Card"
                    error={errors.panCard?.message}
                  />
                </div>
              </div>
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
                  ? isEdit ? "Updating..." : "Creating..."
                  : isEdit ? "Update Account" : "Create Account"}
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