import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { Fragment, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import { Button, Input } from "@/components/ui";
import { Post, Put, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { Service, ServiceFormValues, buildServicePayload } from "./data";

interface ServiceDrawerProps {
  isOpen: boolean;
  close: () => void;
  service: Service | null;
  onSaved: () => void;
}

export function ServiceDrawer({ isOpen, close, service, onSaved }: ServiceDrawerProps) {
  const isEdit = Boolean(service && service.id > 0);
  const [saving, setSaving] = useState(false);

  const defaultValues = useMemo<ServiceFormValues>(
    () => ({
      serviceId: service?.serviceId || `SRV-${Math.floor(10000 + Math.random() * 90000)}`,
      serviceName: service?.serviceName || "",
      category: service?.category || "",
      subcategory_name: service?.subcategory_name || "",
      price: service?.price || 0,
      description: service?.description || "",
      added_date: service?.added_date || new Date().toISOString().split("T")[0],
      approved_date: service?.approved_date || new Date().toISOString().split("T")[0],
      approved_by: service?.approved_by || "Super Admin",
      status: service?.status || "Approved",
      rating: service?.rating || 0,
      total_bookings: service?.total_bookings || 0,
    }),
    [service],
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceFormValues>({
    defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    if (isOpen) reset(defaultValues);
  }, [defaultValues, isOpen, reset]);

  const handleClose = () => { reset(); close(); };

  const onSubmit = async (values: ServiceFormValues) => {
    setSaving(true);
    try {
      const payload = buildServicePayload(values);
      if (isEdit) {
        await Put(`gym-services/${service!.id}/`, payload);
        toastsuccessmsg("Service updated successfully.");
      } else {
        await Post("gym-services/", payload);
        toastsuccessmsg("Service added successfully.");
      }
      onSaved();
      handleClose();
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        Object.values(e?.response?.data ?? {}).flat().join(", ") ||
        (isEdit ? "Failed to update service." : "Failed to add service."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={handleClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />
        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full" enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0" leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[40%] xl:max-w-[35%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEdit ? "Edit Service" : "Add New Service"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEdit ? "Update service details" : "Add a new service to the platform"}
              </p>
            </div>
            <Button onClick={handleClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">
                {/* Service ID */}
                <Input
                  {...register("serviceId")}
                  label="Service ID"
                  disabled
                  className="bg-gray-100 dark:bg-dark-600"
                />

                {/* Service Name */}
                <Input
                  {...register("serviceName", { required: "Service name is required" })}
                  label={<>Service Name <span className="text-red-500">*</span></>}
                  placeholder="Enter service name"
                  error={errors.serviceName?.message}
                />

                {/* Category */}
                <Input
                  {...register("category", { required: "Category is required" })}
                  label={<>Category <span className="text-red-500">*</span></>}
                  placeholder="Enter category"
                  error={errors.category?.message}
                />

                {/* SubCategory */}
                <Input
                  {...register("subcategory_name")}
                  label="Sub Category"
                  placeholder="Optional subcategory"
                />

                {/* Price */}
                <Input
                  {...register("price", { 
                    required: "Price is required",
                    min: { value: 1, message: "Price must be at least 1" },
                    valueAsNumber: true
                  })}
                  label={<>Price (₹) <span className="text-red-500">*</span></>}
                  type="number"
                  placeholder="Enter price"
                  error={errors.price?.message}
                />

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register("description", { required: "Description is required" })}
                    rows={4}
                    placeholder="Enter service description"
                    className={clsx(
                      "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:placeholder-dark-400",
                      errors.description?.message && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {errors.description?.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>

                {/* Read-only fields */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    {...register("added_date")}
                    label="Added Date"
                    type="date"
                    disabled
                    className="bg-gray-100 dark:bg-dark-600"
                  />
                  <Input
                    {...register("approved_date")}
                    label="Approved Date"
                    type="date"
                    disabled
                    className="bg-gray-100 dark:bg-dark-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    {...register("approved_by")}
                    label="Approved By"
                    disabled
                    className="bg-gray-100 dark:bg-dark-600"
                  />
                  <Input
                    {...register("status")}
                    label="Status"
                    disabled
                    className="bg-gray-100 dark:bg-dark-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    {...register("rating")}
                    label="Rating"
                    type="number"
                    disabled
                    className="bg-gray-100 dark:bg-dark-600"
                  />
                  <Input
                    {...register("total_bookings")}
                    label="Total Bookings"
                    type="number"
                    disabled
                    className="bg-gray-100 dark:bg-dark-600"
                  />
                </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button type="submit" color="primary" className="flex-1" disabled={saving}>
                {saving ? (isEdit ? "Updating..." : "Adding...") : (isEdit ? "Update Service" : "Add Service")}
              </Button>
              <Button type="button" variant="outlined" className="flex-1" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
