/**
 * Purchase Return Form
 * Route: /purchase/purchase-return/new
 * APIs:
 *   GET  pos/purchase-return-voucher/
 *   GET  pos/original-bill-search/?type=purchase&query=
 *   GET  pos/purchase-bill-details/:billNo/?return_type=Partial|Full
 *   GET  pos/account-terms-type/?terms=cash|bank
 *   POST pos/purchase-return-create/
 */
import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon, CheckCircleIcon, DocumentTextIcon,
  MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon,
  XMarkIcon, TrashIcon, BanknotesIcon, BuildingLibraryIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Checkbox } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface AccountOption { id: number; label: string; }
interface SupplierOption { id: number; label: string; mobile?: string; state?: string; terms?: string; }

interface ReturnItem {
  id: number;
  purchase_item_id: number;
  item_id: number;
  variant_id: number | null;
  item_name: string;
  hsn_code: string;
  return_quantity: number;
  max_quantity: number;
  original_quantity: number;
  already_returned: number;
  price: number;
  tax_percent: number;
  basic_amount: number;
  tax_amount: number;
  net_amount: number;
  unit: string;
}

interface CreditSummary {
  grand_total: number;
  total_paid: number;
  total_returned: number;
  pending_amount: number;
  payment_history: {
    entry_type: string; type: string; voucher_no: string;
    date: string; amount: number; mode: string; narration: string;
  }[];
}

interface FormValues {
  returnDate:      string;
  originalBillNo:  string;
  partyId:         number | null;
  reason:          string;
  approvedBy:      string;
  returnType:      string;
  paymentTerms:    AccountOption | null;
  cashAccount:     AccountOption | null;
  bankAccount:     AccountOption | null;
  narration:       string;
  dueDate:         string;
}

const TERMS_OPTIONS: AccountOption[] = [
  { id: 1, label: "Credit" },
  { id: 2, label: "Cash"   },
  { id: 3, label: "Bank"   },
];

const REASON_OPTIONS = [
  { id: "",                label: "Select Reason"  },
  { id: "Damaged",         label: "Damaged"         },
  { id: "Expired",         label: "Expired"         },
  { id: "Wrong Item",      label: "Wrong Item"      },
  { id: "Defective",       label: "Defective"       },
  { id: "Quality Issue",   label: "Quality Issue"   },
  { id: "Other",           label: "Other"           },
];
const today = new Date().toISOString().split("T")[0];

// ── Bill Search Modal ──────────────────────────────────────────────────────
function BillSearchModal({ isOpen, onClose, onSelect }: {
  isOpen: boolean; onClose: () => void;
  onSelect: (bill: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await Get("pos/original-bill-search/", { type: "purchase", query: q }) as any;
      const body = res?.data ?? res;
      setBills(body?.bills ?? body?.results ?? (Array.isArray(body) ? body : []));
    } catch { toasterrormsg("Failed to search bills."); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { if (isOpen) { setQuery(""); load(""); } }, [isOpen, load]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[210]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm dark:bg-black/50"
        />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={DialogPanel}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-700"
            >
              <div className="flex items-center justify-between bg-primary px-5 py-4">
                <h3 className="text-base font-bold text-white">Search Purchase Bill</h3>
                <Button onClick={onClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
                  <XMarkIcon className="size-5" />
                </Button>
              </div>
              <div className="border-b border-gray-200 px-5 py-3 dark:border-dark-500">
                <Input value={query} onChange={e => { setQuery(e.target.value); load(e.target.value); }}
                  prefix={<MagnifyingGlassIcon className="size-4" />}
                  placeholder="Search by Bill No or Party Name…"
                  classNames={{ input: "h-9 text-sm" }} autoFocus />
              </div>
              <div className="max-h-[55vh] overflow-y-auto overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : bills.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">No bills found.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-dark-800">
                      <tr>
                        {["Bill No","Supplier","Date","Amount",""].map(h => (
                          <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-600 dark:text-dark-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((b, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-600">
                          <td className="px-4 py-2.5 font-medium text-primary-600 dark:text-primary-400">{b.billNo ?? b.bill_no}</td>
                          <td className="px-4 py-2.5 text-gray-700 dark:text-dark-200">{b.partyName__account_name ?? b.party_name}</td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-dark-200 whitespace-nowrap">{formatDateDDMMYYYY(b.date)}</td>
                          <td className="px-4 py-2.5 tabular-nums font-medium text-gray-700 dark:text-dark-200">₹{Number(b.grand_total).toFixed(2)}</td>
                          <td className="px-4 py-2.5">
                            <Button color="primary" className="h-7 rounded-md px-3 text-xs"
                              onClick={() => { onSelect(b); onClose(); }}>Select</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="flex justify-end border-t border-gray-200 px-5 py-3 dark:border-dark-500">
                <Button variant="outlined" className="px-6" onClick={onClose}>Close</Button>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// ── Credit Summary Panel ───────────────────────────────────────────────────
function CreditSummaryPanel({ summary }: { summary: CreditSummary }) {
  const [showHistory, setShowHistory] = useState(false);
  const settled = summary.total_paid + summary.total_returned;
  const pct     = summary.grand_total > 0 ? Math.min(100, (settled / summary.grand_total) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 dark:border-primary/20 dark:bg-primary/10">
      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-primary/10 sm:grid-cols-4">
        {[
          { label: "Bill Total",  value: `₹${summary.grand_total.toFixed(2)}`,   color: "text-primary-700 dark:text-primary-300"  },
          { label: "Paid",        value: `₹${summary.total_paid.toFixed(2)}`,     color: "text-emerald-600 dark:text-emerald-400"  },
          { label: "Returned",    value: `₹${summary.total_returned.toFixed(2)}`, color: "text-amber-600 dark:text-amber-400"      },
          { label: "Pending",     value: summary.pending_amount <= 0 ? "✓ Settled" : `₹${summary.pending_amount.toFixed(2)}`,
            color: summary.pending_amount <= 0 ? "text-emerald-600" : "text-error-600 dark:text-error-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-dark-400">{label}</p>
            <p className={clsx("mt-0.5 text-base font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-500">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-0.5 text-right text-xs text-gray-400">{pct.toFixed(0)}% settled</p>
      </div>
      {/* History toggle */}
      {summary.payment_history.length > 0 && (
        <>
          <button type="button"
            onClick={() => setShowHistory(v => !v)}
            className="flex w-full items-center justify-between border-t border-primary/10 px-4 py-2 text-xs font-semibold text-primary-700 hover:bg-primary/10 dark:text-primary-300">
            <span>Payment & Return History ({summary.payment_history.length} entries)</span>
            {showHistory ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </button>
          {showHistory && (
            <div className="overflow-x-auto border-t border-primary/10">
              <table className="w-full text-xs">
                <thead className="bg-primary/10">
                  <tr>
                    {["Date","Voucher","Type","Mode","Amount","Narration"].map(h => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-primary-700 dark:text-primary-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.payment_history.map((e, i) => (
                    <tr key={i} className={clsx(
                      "border-t border-primary/10",
                      e.entry_type === "Purchase" ? "bg-primary/5" : e.entry_type === "Return" ? "bg-amber-50 dark:bg-amber-900/10" : "",
                    )}>
                      <td className="px-3 py-2 text-gray-600 dark:text-dark-200">{formatDateDDMMYYYY(e.date)}</td>
                      <td className="px-3 py-2  text-primary-600 dark:text-primary-400">{e.voucher_no}</td>
                      <td className="px-3 py-2">
                        <Badge color={e.entry_type === "Purchase" ? "primary" : e.entry_type === "Return" ? "warning" : "success"} variant="soft" className="text-[10px]">{e.type}</Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-dark-300">{e.mode}</td>
                      <td className={clsx("px-3 py-2 font-semibold tabular-nums",
                        e.entry_type === "Purchase" ? "text-primary-600" : e.entry_type === "Return" ? "text-amber-600" : "text-emerald-600")}>
                        {e.entry_type === "Purchase" ? "+" : "−"}₹{e.amount.toFixed(2)}
                      </td>
                      <td className="max-w-[150px] truncate px-3 py-2 text-gray-500 dark:text-dark-300">{e.narration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Form Page ─────────────────────────────────────────────────────────
export default function NewPurchaseReturnPage() {
  const navigate = useNavigate();

  const [returnNo, setReturnNo]           = useState("Loading…");
  const [billItems, setBillItems]         = useState<ReturnItem[]>([]);
  const [selectedBill, setSelectedBill]   = useState<any>(null);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [partyDetails, setPartyDetails]   = useState<any>(null);
  const [loadingBill, setLoadingBill]     = useState(false);
  const [billModal, setBillModal]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [cashAccounts, setCashAccounts]   = useState<AccountOption[]>([]);
  const [bankAccounts, setBankAccounts]   = useState<AccountOption[]>([]);
  const [reasonObj, setReasonObj]         = useState(REASON_OPTIONS[0]);

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        returnDate: today, originalBillNo: "", partyId: null,
        reason: "", approvedBy: "", returnType: "Partial",
        paymentTerms: TERMS_OPTIONS[0], cashAccount: null, bankAccount: null,
        narration: "", dueDate: "",
      },
      mode: "onTouched",
    });

  // register reason for validation
  useEffect(() => {
    register("reason", { required: "Required" });
  }, [register]);

  const termsVal   = watch("paymentTerms");
  const returnType = watch("returnType");
  const termsLabel = termsVal?.label ?? "Credit";

  // fetch voucher + accounts
  useEffect(() => {
    Get("pos/purchase-return-voucher/").then((res: any) => {
      const b = res?.data ?? res;
      setReturnNo(b?.voucher_no ?? "Auto");
    }).catch(() => {});
    Get("pos/account-terms-type/", { terms: "cash" }).then((res: any) => {
      const b = res?.data ?? res;
      setCashAccounts((Array.isArray(b) ? b : b?.results ?? []).map((a: any) => ({ id: a.id, label: a.account_name })));
    }).catch(() => {});
    Get("pos/account-terms-type/", { terms: "bank" }).then((res: any) => {
      const b = res?.data ?? res;
      setBankAccounts((Array.isArray(b) ? b : b?.results ?? []).map((a: any) => ({ id: a.id, label: a.account_name })));
    }).catch(() => {});
  }, []);

  // fetch bill details
  const fetchBillDetails = useCallback(async (billNo: string, type = "Partial") => {
    setLoadingBill(true);
    try {
      const res  = await Get(`pos/purchase-bill-details/${encodeURIComponent(billNo)}/`, { return_type: type }) as any;
      const data = res?.data ?? res;
      const items: ReturnItem[] = (data.items ?? []).map((i: any) => ({
        id:               Number(i.id ?? 0),
        purchase_item_id: Number(i.purchase_item_id ?? 0),
        item_id:          Number(i.item_id ?? 0),
        variant_id:       i.variant_id ?? null,
        item_name:        String(i.item_name ?? ""),
        hsn_code:         String(i.hsn_code ?? ""),
        return_quantity:  type === "Full" ? Number(i.available_quantity ?? 0) : 0,
        max_quantity:     Number(i.available_quantity ?? 0),
        original_quantity: Number(i.quantity ?? 0),
        already_returned: Number(i.already_returned ?? 0),
        price:            Number(i.price ?? 0),
        tax_percent:      Number(i.tax_percent ?? 0),
        basic_amount:     Number(i.basic_amount ?? 0),
        tax_amount:       Number(i.tax_amount ?? 0),
        net_amount:       Number(i.net_amount ?? 0),
        unit:             String(i.unit ?? "Pcs"),
      }));
      setBillItems(items);
      setSelectedBill(data);
      setPartyDetails({ name: data.party_name, mobile: data.party_mobile, state: data.party_state, terms: data.payment_terms });
      setCreditSummary({
        grand_total:       Number(data.grand_total ?? 0),
        total_paid:        Number(data.total_paid ?? 0),
        total_returned:    Number(data.total_returned ?? 0),
        pending_amount:    Number(data.pending_amount ?? 0),
        payment_history:   data.payment_history ?? [],
      });
      setValue("originalBillNo", data.bill_no ?? billNo);
      setValue("partyId", Number(data.party_id ?? 0));
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.error ?? "Failed to load bill details.");
    } finally { setLoadingBill(false); }
  }, [setValue]);

  // return type change
  const handleReturnTypeChange = useCallback(async (type: string) => {
    setValue("returnType", type);
    if (!selectedBill?.bill_no) return;
    if (type === "Full") {
      setBillItems(prev => prev.map(i => ({ ...i, return_quantity: i.max_quantity })));
    } else {
      await fetchBillDetails(selectedBill.bill_no, "Partial");
    }
  }, [selectedBill, fetchBillDetails, setValue]);

  const updateQty = (id: number, qty: number) => {
    setBillItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, return_quantity: Math.max(0, Math.min(qty, i.max_quantity)) } : i);
      // auto-detect full
      const allFull = updated.every(i => i.return_quantity === i.max_quantity);
      if (allFull && returnType !== "Full") { setValue("returnType", "Full"); }
      else if (!allFull && returnType === "Full") { setValue("returnType", "Partial"); }
      return updated;
    });
  };

  const selectAll = (checked: boolean) =>
    setBillItems(prev => prev.map(i => ({ ...i, return_quantity: checked ? i.max_quantity : 0 })));

  const totals = useMemo(() => {
    const sel = billItems.filter(i => i.return_quantity > 0);
    const ratio = (i: ReturnItem) => i.max_quantity > 0 ? i.return_quantity / i.max_quantity : 0;
    return {
      qty:   sel.reduce((s, i) => s + i.return_quantity, 0),
      basic: sel.reduce((s, i) => s + i.basic_amount * ratio(i), 0),
      tax:   sel.reduce((s, i) => s + i.tax_amount   * ratio(i), 0),
      net:   sel.reduce((s, i) => s + i.net_amount   * ratio(i), 0),
    };
  }, [billItems]);

  const allSelected = billItems.length > 0 && billItems.every(i => i.return_quantity === i.max_quantity);

  const onSubmit = async (values: FormValues) => {
    const selItems = billItems.filter(i => i.return_quantity > 0);
    if (!selectedBill) { toasterrormsg("Select a purchase bill first."); return; }
    if (selItems.length === 0) { toasterrormsg("Select at least one item to return."); return; }
    setSaving(true);
    try {
      const r = (i: ReturnItem) => i.max_quantity > 0 ? i.return_quantity / i.max_quantity : 0;
      await Post("pos/purchase-return-create/", {
        date:              values.returnDate,
        original_bill_no:  values.originalBillNo,
        party:             values.partyId,
        reason_for_return: values.reason,
        approved_by:       values.approvedBy,
        return_type:       values.returnType,
        payment_terms:     termsLabel,
        cash_account:      termsLabel === "Cash" ? values.cashAccount?.id : null,
        bank_account:      termsLabel === "Bank" ? values.bankAccount?.id : null,
        narration:         values.narration || "",
        total_basic:       totals.basic.toFixed(2),
        total_tax:         totals.tax.toFixed(2),
        grand_total:       totals.net.toFixed(2),
        items: selItems.map(i => ({
          purchase_item_id: i.purchase_item_id,
          item_id:          i.item_id,
          variant_id:       i.variant_id,
          hsn_code:         i.hsn_code,
          return_quantity:  i.return_quantity,
          price:            i.price,
          discount_percent: 0,
          tax_percent:      i.tax_percent,
          basic_amount:     (i.basic_amount * r(i)).toFixed(2),
          discount_amount:  "0.00",
          tax_amount:       (i.tax_amount   * r(i)).toFixed(2),
          net_amount:       (i.net_amount   * r(i)).toFixed(2),
          cgst: 0, sgst: 0, igst: 0,
        })),
      });
      toastsuccessmsg("Purchase Return created successfully.");
      navigate("/purchase/purchase-return");
    } catch (e: any) {
      const d = e?.response?.data;
      toasterrormsg(d?.message ?? d?.error ?? d?.detail ?? Object.values(d ?? {}).flat().join(", ") ?? "Failed to save.");
    } finally { setSaving(false); }
  };

  return (
    <Page title="New Purchase Return">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="transition-content w-full pb-32 space-y-5">

          {/* Header */}
          <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-1">
            <div className="flex items-center gap-3">
              <Button type="button" variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
                onClick={() => navigate("/purchase/purchase-return")}>
                <ArrowLeftIcon className="size-4" /> Back
              </Button>
              <div>
                <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">New Purchase Return</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Create a return against a purchase bill</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 dark:bg-primary/10">
              <DocumentTextIcon className="size-4 text-primary-600 dark:text-primary-400" />
              <span className="text-xs text-gray-500 dark:text-dark-300">Return No:</span>
              <span className=" text-sm font-semibold text-primary-600 dark:text-primary-400">{returnNo}</span>
            </div>
          </div>

          {/* Form details card */}
          <div className="px-(--margin-x)">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-500 dark:bg-dark-750">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-dark-600">
                <h4 className="text-sm font-semibold text-primary-600 dark:text-primary-400">Return Details</h4>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Controller control={control} name="returnDate" rules={{ required: "Required" }}
                    render={({ field }) => (
                      <DatePicker label={<>Return Date <span className="text-red-500">*</span></>}
                        value={field.value} onChange={field.onChange} error={errors.returnDate?.message} />
                    )}
                  />
                  {/* Bill search */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                      Original Bill No <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input {...register("originalBillNo", { required: "Required" })}
                        readOnly placeholder="Search bill…"
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-dark-500 dark:bg-dark-800 dark:text-dark-200" />
                      <Button type="button" color="primary" variant="soft" className="h-9 shrink-0 rounded-lg px-3 text-sm"
                        onClick={() => setBillModal(true)}>
                        <MagnifyingGlassIcon className="size-4" />
                      </Button>
                    </div>
                    {errors.originalBillNo && <p className="mt-1 text-xs text-error-600">{errors.originalBillNo.message}</p>}
                  </div>
                  {/* Return type */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Return Type</label>
                    <div className="flex gap-2">
                      {["Partial","Full"].map(t => (
                        <button key={t} type="button"
                          onClick={() => handleReturnTypeChange(t)}
                          className={clsx(
                            "flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors",
                            returnType === t
                              ? "border-primary bg-primary text-white"
                              : "border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200",
                          )}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Terms */}
                  <Controller control={control} name="paymentTerms"
                    render={({ field: { value, onChange } }) => (
                      <Listbox data={TERMS_OPTIONS} displayField="label" placeholder="Payment Terms"
                        label="Return Payment Terms"
                        value={value ?? null} onChange={item => { onChange(item); setValue("cashAccount", null); setValue("bankAccount", null); }} />
                    )}
                  />
                  {termsLabel === "Cash" && (
                    <Controller control={control} name="cashAccount" rules={{ required: "Required" }}
                      render={({ field: { value, onChange } }) => (
                        <Listbox data={cashAccounts} displayField="label" placeholder="Select Cash Account *"
                          label={<><BanknotesIcon className="mr-1 inline size-3.5 text-emerald-500" />Cash Account <span className="text-red-500">*</span></>}
                          value={value ?? null} onChange={onChange} error={(errors.cashAccount as any)?.message} />
                      )}
                    />
                  )}
                  {termsLabel === "Bank" && (
                    <Controller control={control} name="bankAccount" rules={{ required: "Required" }}
                      render={({ field: { value, onChange } }) => (
                        <Listbox data={bankAccounts} displayField="label" placeholder="Select Bank Account *"
                          label={<><BuildingLibraryIcon className="mr-1 inline size-3.5 text-sky-500" />Bank Account <span className="text-red-500">*</span></>}
                          value={value ?? null} onChange={onChange} error={(errors.bankAccount as any)?.message} />
                      )}
                    />
                  )}
                  {termsLabel === "Credit" && (
                    <Controller control={control} name="dueDate"
                      render={({ field }) => (
                        <DatePicker label="Due Date" value={field.value} onChange={field.onChange} />
                      )}
                    />
                  )}
                  <Combobox
                    label={<>Reason <span className="text-red-500">*</span></>}
                    data={REASON_OPTIONS.filter(r => r.id !== "")}
                    displayField="label"
                    searchFields={["label"]}
                    value={reasonObj.id ? reasonObj : null}
                    onChange={(item: any) => {
                      const selected = item ?? REASON_OPTIONS[0];
                      setReasonObj(selected);
                      setValue("reason", selected.id, { shouldValidate: true });
                    }}
                    placeholder="Select Reason *"
                    error={errors.reason?.message}
                  />
                  <Input {...register("approvedBy", { required: "Required" })}
                    label={<>Approved By <span className="text-red-500">*</span></>}
                    placeholder="Manager name"
                    classNames={{ input: "h-9 text-sm" }}
                    error={errors.approvedBy?.message} />
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Narration</label>
                    <textarea {...register("narration")} rows={1} placeholder="Additional notes…"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Party details */}
          {partyDetails && (
            <div className="px-(--margin-x)">
              <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm dark:border-dark-500 dark:bg-dark-750 text-sm">
                <span className="font-semibold text-gray-800 dark:text-dark-100">{partyDetails.name}</span>
                {partyDetails.mobile && <span className="text-gray-500 dark:text-dark-300">📞 {partyDetails.mobile}</span>}
                {partyDetails.state  && <span className="text-gray-500 dark:text-dark-300">📍 {partyDetails.state}</span>}
                {partyDetails.terms  && (
                  <Badge color={partyDetails.terms.toLowerCase() === "credit" ? "warning" : partyDetails.terms.toLowerCase() === "cash" ? "success" : "info"} variant="soft" className="text-xs">
                    {partyDetails.terms}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Credit summary */}
          {creditSummary && (
            <div className="px-(--margin-x)">
              <CreditSummaryPanel summary={creditSummary} />
            </div>
          )}

          {/* Items table */}
          <div className="px-(--margin-x)">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-500 dark:bg-dark-750">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-dark-600">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-200">
                    {selectedBill ? `Bill Items — ${selectedBill.bill_no}` : "Bill Items"}
                  </h4>
                  {billItems.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-600 dark:bg-primary/20 dark:text-primary-400">
                      {billItems.length} items
                    </span>
                  )}
                </div>
                {billItems.length > 0 && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-dark-200">
                    <Checkbox checked={allSelected} onChange={e => selectAll(e.target.checked)} />
                    Select All
                  </label>
                )}
              </div>
              {loadingBill ? (
                <div className="flex items-center justify-center py-16">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : !selectedBill ? (
                <div className="py-14 text-center">
                  <MagnifyingGlassIcon className="mx-auto mb-3 size-10 text-gray-200 dark:text-dark-600" />
                  <p className="text-sm text-gray-400">No bill selected</p>
                  <p className="mt-1 text-xs text-gray-300">Click the search icon next to Original Bill No</p>
                </div>
              ) : (
                <div className="overflow-x-auto" style={{ maxHeight: "380px" }}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-primary">
                      <tr>
                        {["","Item Name","HSN","Purchased","Returned","Available","Unit","Return Qty","Price","Tax%","Net Value"].map(h => (
                          <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-white">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {billItems.map(item => (
                        <tr key={item.id} className="border-t border-gray-100 hover:bg-primary/5 dark:border-dark-600 dark:hover:bg-primary/10">
                          <td className="px-4 py-2.5">
                            <Checkbox checked={item.return_quantity > 0}
                              onChange={e => updateQty(item.id, e.target.checked ? item.max_quantity : 0)} />
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-dark-100">{item.item_name}</td>
                          <td className="px-4 py-2.5  text-xs text-gray-500">{item.hsn_code || "—"}</td>
                          <td className="px-4 py-2.5 text-center tabular-nums text-gray-600 dark:text-dark-200">{item.original_quantity}</td>
                          <td className="px-4 py-2.5 text-center tabular-nums text-amber-600 dark:text-amber-400">{item.already_returned}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge color="success" variant="soft" className="text-xs">{item.max_quantity}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-dark-300">{item.unit}</td>
                          <td className="px-4 py-2.5">
                            <input type="number" min={0} max={item.max_quantity} step={1}
                              value={item.return_quantity || ""}
                              onChange={e => updateQty(item.id, e.target.value === "" ? 0 : Number(e.target.value))}
                              className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-center text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100" />
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-gray-600 dark:text-dark-200">₹{item.price.toFixed(2)}</td>
                          <td className="px-4 py-2.5">
                            <Badge color="warning" variant="soft" className="text-xs">{item.tax_percent}%</Badge>
                          </td>
                          <td className="px-4 py-2.5 font-bold tabular-nums text-primary-600 dark:text-primary-400">
                            ₹{(item.max_quantity > 0 ? item.net_amount * (item.return_quantity / item.max_quantity) : 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {billItems.length > 0 && (
                      <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-dark-800">
                        <tr className="border-t-2 border-gray-200 dark:border-dark-500">
                          <td colSpan={7} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-dark-300">Totals</td>
                          <td className="px-4 py-2.5 font-bold tabular-nums text-gray-700 dark:text-dark-200">{totals.qty}</td>
                          <td />
                          <td />
                          <td className="px-4 py-2.5 font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{totals.net.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Grand total bar */}
          {totals.net > 0 && (
            <div className="px-(--margin-x)">
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-50 to-sky-50 p-5 sm:grid-cols-4 dark:border-primary/20 dark:from-primary/10 dark:to-sky-900/10">
                {[
                  { label: "Return Qty",  value: String(totals.qty) },
                  { label: "Total Basic", value: `₹${totals.basic.toFixed(2)}` },
                  { label: "Total Tax",   value: `₹${totals.tax.toFixed(2)}`   },
                  { label: "Grand Total", value: `₹${totals.net.toFixed(2)}`, big: true },
                ].map(({ label, value, big }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-gray-400 dark:text-dark-400">{label}</p>
                    <p className={clsx("mt-0.5 font-bold tabular-nums", big ? "text-2xl text-primary-700 dark:text-primary-300" : "text-lg text-gray-700 dark:text-dark-100")}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-dark-500 dark:bg-dark-700/95">
          <Button type="button" variant="outlined"
            className="h-9 gap-2 rounded-lg px-4 text-sm text-error-600 border-error-300 hover:bg-error-50 dark:border-error-700 dark:hover:bg-error-900/20"
            onClick={() => { setBillItems([]); setSelectedBill(null); setCreditSummary(null); setPartyDetails(null); setValue("originalBillNo",""); }}>
            <TrashIcon className="size-4" /> Clear
          </Button>
          <Button type="button" variant="outlined" className="h-9 gap-2 rounded-lg px-4 text-sm"
            onClick={() => navigate("/purchase/purchase-return")}>
            <ArrowLeftIcon className="size-4" /> Cancel
          </Button>
          <Button type="submit" color="primary" className="h-9 gap-2 rounded-lg px-8 text-sm font-semibold"
            disabled={saving || !selectedBill || totals.qty === 0}>
            {saving
              ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
              : <><CheckCircleIcon className="size-4" />Save Return</>}
          </Button>
        </div>
      </form>

      <BillSearchModal isOpen={billModal} onClose={() => setBillModal(false)}
        onSelect={async bill => {
          const billNo = bill.billNo ?? bill.bill_no;
          setValue("originalBillNo", billNo);
          await fetchBillDetails(billNo, returnType || "Partial");
        }} />
    </Page>
  );
}
