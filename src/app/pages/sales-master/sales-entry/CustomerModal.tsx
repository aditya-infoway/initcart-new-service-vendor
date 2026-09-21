import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import { MagnifyingGlassIcon, PlusIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button, Input } from "@/components/ui";
import { Get, Post, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { Customer, mapApiCustomer } from "./data";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (c: Customer) => void;
}

interface CustomerForm {
  account_name: string; state: string; mobile: string; address: string;
}

export function CustomerModal({ open, onClose, onSelect }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>();

  const fetchCustomers = () => {
    setLoading(true);
    Get("pos/customers/")
      .then((res: any) => {
        const body = res?.data ?? res;
        const rows: any[] = Array.isArray(body?.results) ? body.results
          : Array.isArray(body) ? body : [];
        setCustomers(rows.map(mapApiCustomer));
      })
      .catch(() => toasterrormsg("Failed to load customers."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open) { setSearch(""); setShowAdd(false); reset(); fetchCustomers(); } }, [open]);

  const filtered = search.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.mobile.includes(search))
    : customers;

  const onAddSubmit = async (data: CustomerForm) => {
    if (!data.account_name.trim()) { toasterrormsg("Customer name is required."); return; }
    if (!data.state.trim()) { toasterrormsg("State is required for GST calculation."); return; }
    setSaving(true);
    try {
      const res = await Post("pos/customer-create/", {
        account_name: data.account_name,
        state: data.state,
        mobile: data.mobile,
        address: data.address,
      }) as any;
      const newC = mapApiCustomer(res?.data?.customer ?? res?.data ?? { ...data, id: 0 });
      toastsuccessmsg("Customer created.");
      onSelect(newC);
      onClose();
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Failed to create customer.");
    } finally { setSaving(false); }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={DialogPanel}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-700 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-primary flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-5 text-white" />
                  <h3 className="text-base font-semibold text-white">
                    {showAdd ? "Add New Customer" : "Select Customer"}
                  </h3>
                </div>
                <button onClick={onClose} className="grid size-7 place-items-center rounded-full text-white hover:bg-white/20">
                  <XMarkIcon className="size-4" />
                </button>
              </div>

              {!showAdd ? (
                <>
                  <div className="border-b border-gray-200 px-5 py-3 dark:border-dark-600 flex gap-2">
                    <Input value={search} onChange={e => setSearch(e.target.value)}
                      prefix={<MagnifyingGlassIcon className="size-4" />}
                      classNames={{ input: "h-9 text-sm" }} placeholder="Search name or mobile..." />
                    <Button color="primary" className="h-9 gap-1.5 shrink-0 px-3 text-sm"
                      onClick={() => setShowAdd(true)}>
                      <PlusIcon className="size-4" /> New
                    </Button>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto">
                    {loading ? (
                      <p className="py-10 text-center text-sm text-gray-400">Loading...</p>
                    ) : filtered.map(c => (
                      <button key={c.id} onClick={() => { onSelect(c); onClose(); }}
                        className="flex w-full items-center gap-3 border-b border-gray-100 px-5 py-3 text-left transition-colors hover:bg-primary/5 dark:border-dark-700 dark:hover:bg-primary/10">
                        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-dark-100">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.mobile || "No mobile"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end border-t border-gray-200 px-5 py-3 dark:border-dark-600">
                    <Button variant="outlined" className="px-6" onClick={onClose}>Close</Button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit(onAddSubmit)} className="p-5 space-y-4">
                  <Input {...register("account_name", { required: "Name is required" })}
                    label={<>Customer Name <span className="text-red-500">*</span></>}
                    placeholder="Enter customer name" error={errors.account_name?.message} />
                  <Input {...register("state", { required: "State is required" })}
                    label={<>State <span className="text-red-500">*</span></>}
                    placeholder="e.g. Maharashtra" error={errors.state?.message} />
                  <Input {...register("mobile")} label="Mobile" placeholder="Mobile number" />
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Address</label>
                    <textarea {...register("address")} rows={2} placeholder="Address"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" color="primary" className="flex-1" disabled={saving}>
                      {saving ? "Saving..." : "Create Customer"}
                    </Button>
                    <Button type="button" variant="outlined" className="flex-1"
                      onClick={() => setShowAdd(false)}>Back</Button>
                  </div>
                </form>
              )}
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
