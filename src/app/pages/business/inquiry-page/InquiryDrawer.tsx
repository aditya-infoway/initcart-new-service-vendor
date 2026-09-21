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
import { Inquiry, InquiryFormValues, buildInquiryPayload } from "./data";

interface InquiryDrawerProps {
  isOpen: boolean;
  close: () => void;
  inquiry: Inquiry | null;
  onSaved: () => void;
}

export function InquiryDrawer({ isOpen, close, inquiry, onSaved }: InquiryDrawerProps) {
  const isEdit = Boolean(inquiry && inquiry.id > 0);
  const [saving, setSaving] = useState(false);

  const defaultValues = useMemo<InquiryFormValues>(
    () => ({
      customer_name: inquiry?.customer_name || "",
      email: inquiry?.customer_email || "",
      phone: inquiry?.customer_phone || "",
      service_interest: inquiry?.service_name || "",
      message: inquiry?.message || "",
      status: inquiry?.status || "New",
      created_date: inquiry?.created_at || new Date().toISOString().split("T")[0],
    }),
    [inquiry],
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InquiryFormValues>({
    defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    if (isOpen) reset(defaultValues);
  }, [defaultValues, isOpen, reset]);

  const handleClose = () => { reset(); close(); };

  const onSubmit = async (values: InquiryFormValues) => {
    setSaving(true);
    try {
      const payload = buildInquiryPayload(values);
      if (isEdit) {
        await Put(`service-inquiries/${inquiry!.id}/`, payload);
        toastsuccessmsg("Inquiry updated successfully.");
      } else {
        await Post("service-inquiries/", payload);
        toastsuccessmsg("Inquiry added successfully.");
      }
      onSaved();
      handleClose();
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        Object.values(e?.response?.data ?? {}).flat().join(", ") ||
        (isEdit ? "Failed to update inquiry." : "Failed to add inquiry."),
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
                {isEdit ? "Edit Inquiry" : "Add New Inquiry"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEdit ? "Update inquiry details" : "Add a new service inquiry"}
              </p>
            </div>
            <Button onClick={handleClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">
                {/* Customer Name */}
                <Input
                  {...register("customer_name", { required: "Customer name is required" })}
                  label={<>Customer Name <span className="text-red-500">*</span></>}
                  placeholder="Enter customer name"
                  error={errors.customer_name?.message}
                />

                {/* Email */}
                <Input
                  {...register("email", { 
                    required: "Email is required",
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" }
                  })}
                  label={<>Email <span className="text-red-500">*</span></>}
                  type="email"
                  placeholder="Enter email address"
                  error={errors.email?.message}
                />

                {/* Phone */}
                <Input
                  {...register("phone", { required: "Phone number is required" })}
                  label={<>Phone <span className="text-red-500">*</span></>}
                  placeholder="Enter phone number"
                  error={errors.phone?.message}
                />

                {/* Service Interest */}
                <Input
                  {...register("service_interest", { required: "Service interest is required" })}
                  label={<>Service Interest <span className="text-red-500">*</span></>}
                  placeholder="Enter service of interest"
                  error={errors.service_interest?.message}
                />

                {/* Message */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register("message", { required: "Message is required" })}
                    rows={4}
                    placeholder="Enter inquiry message"
                    className={clsx(
                      "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:placeholder-dark-400",
                      errors.message?.message && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {errors.message?.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Created Date */}
                <Input
                  {...register("created_date")}
                  label="Created Date"
                  type="date"
                  disabled
                  className="bg-gray-100 dark:bg-dark-600"
                />
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button type="submit" color="primary" className="flex-1" disabled={saving}>
                {saving ? (isEdit ? "Updating..." : "Adding...") : (isEdit ? "Update Inquiry" : "Add Inquiry")}
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
