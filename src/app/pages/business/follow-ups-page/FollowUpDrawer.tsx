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
import { toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { FollowUp, FollowUpFormValues } from "./data";

interface FollowUpDrawerProps {
  isOpen: boolean;
  close: () => void;
  followUp: FollowUp | null;
  onSaved: (followUp: FollowUp) => void;
}

export function FollowUpDrawer({ isOpen, close, followUp, onSaved }: FollowUpDrawerProps) {
  const isEdit = Boolean(followUp && followUp.id > 0);
  const [saving, setSaving] = useState(false);

  const defaultValues = useMemo<FollowUpFormValues>(
    () => ({
      followupId: followUp?.followupId || `FUP-${Math.floor(10000 + Math.random() * 90000)}`,
      inquiryId: followUp?.inquiryId || "",
      customerName: followUp?.customerName || "Auto fetched",
      followupDate: followUp?.followupDate || new Date().toISOString().split("T")[0],
      followupType: followUp?.followupType || "Call",
      followupNotes: followUp?.followupNotes || "",
      nextFollowupDate: followUp?.nextFollowupDate || "",
      status: followUp?.status || "Pending",
      handledBy: followUp?.handledBy || "Vendor Name",
    }),
    [followUp],
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FollowUpFormValues>({
    defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    if (isOpen) reset(defaultValues);
  }, [defaultValues, isOpen, reset]);

  const handleClose = () => { reset(); close(); };

  const onSubmit = async (values: FollowUpFormValues) => {
    setSaving(true);
    try {
      // Local state management (same as old admin)
      const newFollowUp: FollowUp = {
        id: isEdit ? followUp!.id : Date.now(),
        followupId: values.followupId,
        inquiryId: values.inquiryId,
        customerName: values.customerName,
        followupDate: values.followupDate,
        followupType: values.followupType as "Call" | "Email" | "Visit",
        followupNotes: values.followupNotes,
        nextFollowupDate: values.nextFollowupDate,
        status: values.status as "Pending" | "Completed" | "Cancelled",
        handledBy: values.handledBy,
      };

      onSaved(newFollowUp);
      handleClose();
    } catch (e: any) {
      toasterrormsg(isEdit ? "Failed to update follow-up." : "Failed to add follow-up.");
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
                {isEdit ? "Edit Follow-up" : "Add New Follow-up"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEdit ? "Update follow-up details" : "Add a new service follow-up"}
              </p>
            </div>
            <Button onClick={handleClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">
                {/* Follow-up ID */}
                <Input
                  {...register("followupId")}
                  label="Follow-up ID"
                  disabled
                  className="bg-gray-100 dark:bg-dark-600"
                />

                {/* Inquiry ID */}
                <Input
                  {...register("inquiryId", { required: "Inquiry ID is required" })}
                  label={<>Inquiry ID <span className="text-red-500">*</span></>}
                  placeholder="Enter Inquiry ID"
                  error={errors.inquiryId?.message}
                />

                {/* Customer Name */}
                <Input
                  {...register("customerName")}
                  label="Customer Name"
                  disabled
                  className="bg-gray-100 dark:bg-dark-600"
                />

                {/* Follow-up Date */}
                <Input
                  {...register("followupDate", { required: "Follow-up Date is required" })}
                  label={<>Follow-up Date <span className="text-red-500">*</span></>}
                  type="date"
                  error={errors.followupDate?.message}
                />

                {/* Follow-up Type */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Follow-up Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("followupType", { required: "Follow-up Type is required" })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Visit">Visit</option>
                  </select>
                  {errors.followupType?.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.followupType.message}</p>
                  )}
                </div>

                {/* Follow-up Notes */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Follow-up Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register("followupNotes", { required: "Follow-up Notes are required" })}
                    rows={4}
                    placeholder="Enter follow-up notes"
                    className={clsx(
                      "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:placeholder-dark-400",
                      errors.followupNotes?.message && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {errors.followupNotes?.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.followupNotes.message}</p>
                  )}
                </div>

                {/* Next Follow-up Date */}
                <Input
                  {...register("nextFollowupDate")}
                  label="Next Follow-up Date"
                  type="date"
                />

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("status", { required: "Status is required" })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  {errors.status?.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.status.message}</p>
                  )}
                </div>

                {/* Handled By */}
                <Input
                  {...register("handledBy")}
                  label="Handled By"
                  disabled
                  className="bg-gray-100 dark:bg-dark-600"
                />
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button type="submit" color="primary" className="flex-1" disabled={saving}>
                {saving ? (isEdit ? "Updating..." : "Adding...") : (isEdit ? "Update Follow-up" : "Add Follow-up")}
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
