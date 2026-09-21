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
import { Withdraw, WithdrawFormValues, buildWithdrawPayload } from "./data";

interface WithdrawDrawerProps {
  isOpen: boolean;
  close: () => void;
  withdraw: Withdraw | null;
  onSaved: () => void;
}

export function WithdrawDrawer({ isOpen, close, withdraw, onSaved }: WithdrawDrawerProps) {
  const isEdit = Boolean(withdraw && withdraw.id > 0);
  const [saving, setSaving] = useState(false);

  const defaultValues = useMemo<WithdrawFormValues>(
    () => ({
      vendor_name: withdraw?.vendor_name || "",
      amount: withdraw?.amount || 0,
      bank_name: withdraw?.bank_name || "",
      account_number: withdraw?.account_number || "",
      ifsc_code: withdraw?.ifsc_code || "",
      status: withdraw?.status || "Pending",
      request_date: withdraw?.request_date || new Date().toISOString().split("T")[0],
      processed_date: withdraw?.processed_date || "",
    }),
    [withdraw],
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<WithdrawFormValues>({
    defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    if (isOpen) reset(defaultValues);
  }, [defaultValues, isOpen, reset]);

  const handleClose = () => { reset(); close(); };

  const onSubmit = async (values: WithdrawFormValues) => {
    setSaving(true);
    try {
      const payload = buildWithdrawPayload(values);
      if (isEdit) {
        await Put(`vendor-withdrawals/${withdraw!.id}/`, payload);
        toastsuccessmsg("Withdraw request updated successfully.");
      } else {
        await Post("vendor-withdrawals/", payload);
        toastsuccessmsg("Withdraw request added successfully.");
      }
      onSaved();
      handleClose();
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        Object.values(e?.response?.data ?? {}).flat().join(", ") ||
        (isEdit ? "Failed to update withdraw request." : "Failed to add withdraw request."),
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
                {isEdit ? "Edit Withdraw Request" : "Add New Withdraw Request"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEdit ? "Update withdraw request details" : "Add a new vendor withdraw request"}
              </p>
            </div>
            <Button onClick={handleClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">
                {/* Vendor Name */}
                <Input
                  {...register("vendor_name", { required: "Vendor name is required" })}
                  label={<>Vendor Name <span className="text-red-500">*</span></>}
                  placeholder="Enter vendor name"
                  error={errors.vendor_name?.message}
                />

                {/* Amount */}
                <Input
                  {...register("amount", { 
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    valueAsNumber: true
                  })}
                  label={<>Amount (₹) <span className="text-red-500">*</span></>}
                  type="number"
                  placeholder="Enter amount"
                  error={errors.amount?.message}
                />

                {/* Bank Name */}
                <Input
                  {...register("bank_name", { required: "Bank name is required" })}
                  label={<>Bank Name <span className="text-red-500">*</span></>}
                  placeholder="Enter bank name"
                  error={errors.bank_name?.message}
                />

                {/* Account Number */}
                <Input
                  {...register("account_number", { required: "Account number is required" })}
                  label={<>Account Number <span className="text-red-500">*</span></>}
                  placeholder="Enter account number"
                  error={errors.account_number?.message}
                />

                {/* IFSC Code */}
                <Input
                  {...register("ifsc_code", { required: "IFSC code is required" })}
                  label={<>IFSC Code <span className="text-red-500">*</span></>}
                  placeholder="Enter IFSC code"
                  error={errors.ifsc_code?.message}
                />

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Request Date */}
                <Input
                  {...register("request_date")}
                  label="Request Date"
                  type="date"
                  disabled
                  className="bg-gray-100 dark:bg-dark-600"
                />

                {/* Processed Date */}
                <Input
                  {...register("processed_date")}
                  label="Processed Date"
                  type="date"
                  disabled
                  className="bg-gray-100 dark:bg-dark-600"
                />
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button type="submit" color="primary" className="flex-1" disabled={saving}>
                {saving ? (isEdit ? "Updating..." : "Adding...") : (isEdit ? "Update Request" : "Add Request")}
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
