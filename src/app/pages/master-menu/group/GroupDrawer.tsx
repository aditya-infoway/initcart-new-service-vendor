import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Button, Input } from "@/components/ui";
import { Post, Put, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { Group, GroupFormValues, buildGroupPayload } from "./data";

interface GroupDrawerProps {
  isOpen: boolean;
  close: () => void;
  group: Group | null;
  onSaved: () => void;
}

export function GroupDrawer({ isOpen, close, group, onSaved }: GroupDrawerProps) {
  const isEdit = Boolean(group && group.id > 0);
  const [saving, setSaving] = useState(false);

  const defaultValues = useMemo<GroupFormValues>(
    () => ({ name: group?.name ?? "", description: group?.description ?? "" }),
    [group],
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupFormValues>({
    defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    if (isOpen) reset({ name: group?.name ?? "", description: group?.description ?? "" });
  }, [group, isOpen, reset]);

  const handleClose = () => { reset(); close(); };

  const onSubmit = async (values: GroupFormValues) => {
    setSaving(true);
    try {
      const payload = buildGroupPayload(values);
      if (isEdit) {
        await Put(`pos/groups/${group!.id}/`, payload);
        toastsuccessmsg("Group updated successfully.");
      } else {
        await Post("pos/groups/", payload);
        toastsuccessmsg("Group created successfully.");
      }
      onSaved();
      handleClose();
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        Object.values(e?.response?.data ?? {}).flat().join(", ") ||
        (isEdit ? "Failed to update group." : "Failed to create group."),
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
                {isEdit ? "Edit Group" : "Create New Group"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEdit ? "Update group details" : "Add a new item group"}
              </p>
            </div>
            <Button onClick={handleClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">
                <Input
                  {...register("name", { required: "Group name is required" })}
                  label={<>Group Name <span className="text-red-500">*</span></>}
                  placeholder="e.g., Electronics, Clothing, Grocery"
                  error={errors.name?.message}
                />

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Description
                  </label>
                  <textarea
                    {...register("description")}
                    rows={4}
                    placeholder="Optional description"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:placeholder-dark-400"
                  />
                </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button type="submit" color="primary" className="flex-1" disabled={saving}>
                {saving ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Group" : "Create Group")}
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
