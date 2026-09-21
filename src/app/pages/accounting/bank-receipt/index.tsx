import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon, BanknotesIcon,
  BuildingLibraryIcon, CurrencyRupeeIcon,
  DocumentTextIcon, MagnifyingGlassIcon,
  PlusIcon, PrinterIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Controller, useForm } from "react-hook-form";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Radio } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
interface BankReceiptRow {
  id: number;
  date: string;
  type: string;
  voucherNo: string;
  bankAccountName: string;
  partyName: string;
  amount: number;
  mode: string;
  chequeNo: string | null;
  chequeDate: string | null;
  chequeClearDate: string | null;
  narration: string;
}

function mapRow(raw: any): BankReceiptRow {
  return {
    id:              Number(raw.id ?? 0),
    date:            String(raw.date ?? ""),
    type:            String(raw.type ?? "BR"),
    voucherNo:       String(raw.voucher_no ?? ""),
    bankAccountName: String(raw.bank_account_name ?? ""),
    partyName:       String(raw.party_name ?? ""),
    amount:          Number(raw.amount ?? 0),
    mode:            String(raw.mode ?? ""),
    chequeNo:        raw.cheque_no ?? null,
    chequeDate:      raw.cheque_date ?? null,
    chequeClearDate: raw.cheque_clear_date ?? null,
    narration:       String(raw.narration ?? ""),
  };
}

interface AccountOption { id: number; label: string; }

interface BillResult {
  id: number;
  billNo: string;
  partyName: string;
  date: string;
  grandTotal: number;
  paidAmount: number;
  pendingAmount: number;
  partyId?: number;
}

function mapBill(raw: any): BillResult {
  return {
    id:            Number(raw.id ?? 0),
    billNo:        String(raw.billNo ?? raw.bill_no ?? ""),
    partyName:     String(raw.partyName__account_name ?? raw.party_name ?? ""),
    date:          String(raw.date ?? ""),
    grandTotal:    Number(raw.grand_total ?? 0),
    paidAmount:    Number(raw.paid_amount ?? 0),
    pendingAmount: Number(raw.pending_amount ?? 0),
    partyId:       raw.party_id ? Number(raw.party_id) : undefined,
  };
}

const today = new Date().toISOString().split("T")[0];

interface FormValues {
  receiptType: "manual" | "salesEntry" | "purchaseReturn";
  bankAccount: number | null;
  voucherNo: string;
  date: string;
  opAccount: number | null;
  amount: string;
  mode: "NEFT" | "RTGS" | "IMPS" | "UPI" | "CHEQUE";
  chequeNo: string;
  chequeDate: string;
  chequeClearDate: string;
  narration: string;
  billNo: string;
  selectedBill: BillResult | null;
}

const DEFAULT_VALUES: FormValues = {
  receiptType:     "manual",
  bankAccount:     null,
  voucherNo:       "",
  date:            today,
  opAccount:       null,
  amount:          "",
  mode:            "NEFT",
  chequeNo:        "",
  chequeDate:      "",
  chequeClearDate: "",
  narration:       "",
  billNo:          "",
  selectedBill:    null,
};

// ── Type badge ─────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, "success" | "info" | "warning" | "primary"> = {
  BR: "success", SBR: "info", PRBR: "warning",
};
function TypeBadge({ type }: { type: string }) {
  return (
    <Badge color={TYPE_COLOR[type] ?? "primary"} variant="soft">
      {type || "BR"}
    </Badge>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const color = mode === "CHEQUE" ? "warning" : mode === "UPI" ? "info" : "primary";
  return <Badge color={color} variant="soft">{mode || "—"}</Badge>;
}

// ── Add Bank Receipt Drawer ────────────────────────────────────────────────
function AddBankReceiptDrawer({
  isOpen, close, onSaved,
}: {
  isOpen: boolean;
  close: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving]               = useState(false);
  const [bankAccounts, setBankAccounts]   = useState<AccountOption[]>([]);
  const [allAccounts, setAllAccounts]     = useState<AccountOption[]>([]);
  const [salesEntryBills, setSalesEntryBills] = useState<BillResult[]>([]);
  const [purchaseReturnBills, setPurchaseReturnBills] = useState<BillResult[]>([]);
  const [loadingBills, setLoadingBills]   = useState(false);

  const {
    control, register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES, mode: "onTouched" });

  const receiptType  = watch("receiptType");
  const mode         = watch("mode");
  const selectedBill = watch("selectedBill");

  // Load accounts + voucher when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      Get("pos/account-terms-type/", { terms: "bank" }),
      Get("pos/account/"),
    ]).then(([bankRes, allRes]: any[]) => {
      const bBody = bankRes?.data ?? bankRes;
      const bRows: any[] = Array.isArray(bBody) ? bBody
        : Array.isArray(bBody?.results) ? bBody.results : [];
      setBankAccounts(bRows.map((a: any) => ({ id: a.id, label: a.account_name })));

      const aBody = allRes?.data ?? allRes;
      const aRows: any[] = Array.isArray(aBody?.results) ? aBody.results
        : Array.isArray(aBody) ? aBody : [];
      setAllAccounts(aRows.map((a: any) => ({ id: a.id, label: a.account_name })));
    }).catch(() => toasterrormsg("Failed to load accounts."));

    Get("pos/voucher/generate/", { type: "BR" }).then((res: any) => {
      const body = res?.data ?? res;
      setValue("voucherNo", body?.voucher_no ?? "");
    }).catch(() => {});

    // Load credit bills
    setLoadingBills(true);
    Promise.all([
      Get("pos/sales-credit-bills/"),
      Get("pos/purchase-return-credit-bills/"),
    ]).then(([salesRes, purchaseRes]: any[]) => {
      const sBody = salesRes?.data ?? salesRes;
      const sRows: any[] = Array.isArray(sBody?.results) ? sBody.results
        : Array.isArray(sBody?.bills) ? sBody.bills
        : Array.isArray(sBody) ? sBody : [];
      setSalesEntryBills(sRows.map(mapBill));

      const pBody = purchaseRes?.data ?? purchaseRes;
      const pRows: any[] = Array.isArray(pBody?.results) ? pBody.results
        : Array.isArray(pBody?.bills) ? pBody.bills
        : Array.isArray(pBody) ? pBody : [];
      setPurchaseReturnBills(pRows.map(mapBill));
    }).catch(() => {
      toasterrormsg("Failed to load credit bills.");
    }).finally(() => {
      setLoadingBills(false);
    });
  }, [isOpen, setValue]);

  const handleClose = () => { reset(DEFAULT_VALUES); close(); };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const cheque = values.mode === "CHEQUE";

      // ── Sales Entry Credit Bill ─────────────────────────────────────
      if (values.receiptType === "salesEntry" && values.selectedBill) {
        await Post("pos/receive-sales-credit-bill-bank/", {
          sales_bill_id:     values.selectedBill.id,
          bank_account:      values.bankAccount,
          amount:            values.amount,
          date:              values.date,
          mode:              values.mode,
          cheque_no:         cheque ? values.chequeNo       : null,
          cheque_date:       cheque ? values.chequeDate      : null,
          cheque_clear_date: cheque ? values.chequeClearDate : null,
        });
        toastsuccessmsg("Sales credit bill received successfully.");
      }
      // ── Purchase Return Credit Bill ─────────────────────────────────
      else if (values.receiptType === "purchaseReturn" && values.selectedBill) {
        await Post("pos/receive-purchase-return-credit-bill-bank/", {
          purchase_return_bill_id: values.selectedBill.id,
          bank_account:            values.bankAccount,
          amount:                  values.amount,
          date:                    values.date,
          mode:                    values.mode,
          cheque_no:               cheque ? values.chequeNo       : null,
          cheque_date:             cheque ? values.chequeDate      : null,
          cheque_clear_date:       cheque ? values.chequeClearDate : null,
        });
        toastsuccessmsg("Purchase return credit bill received successfully.");
      }
      // ── Manual Entry ────────────────────────────────────────────────
      else {
        const payload: any = {
          bank_account: values.bankAccount,
          op_account:   values.opAccount,
          date:         values.date,
          amount:       values.amount,
          mode:         values.mode,
          narration:    values.narration || "",
          type:         "BR",
        };
        if (cheque) {
          payload.cheque_no          = values.chequeNo;
          payload.cheque_date        = values.chequeDate;
          payload.cheque_clear_date  = values.chequeClearDate;
        }
        await Post("pos/bank-receipts/", payload);
        toastsuccessmsg("Bank receipt saved successfully.");
      }
      onSaved();
      handleClose();
    } catch (e: any) {
      const d = e?.response?.data;
      toasterrormsg(
        d?.detail || d?.non_field_errors?.[0] ||
        Object.values(d ?? {}).flat().join(", ") ||
        "Failed to save bank receipt.",
      );
    } finally {
      setSaving(false);
    }
  };

  const MODE_OPTIONS = ["NEFT", "RTGS", "IMPS", "UPI", "CHEQUE"] as const;

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-100" onClose={handleClose}>
          {/* Backdrop */}
          <TransitionChild as="div"
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
          />
          {/* Slide-over */}
          <TransitionChild as={DialogPanel}
            enter="ease-out transform-gpu transition-transform duration-200"
            enterFrom="translate-x-full" enterTo="translate-x-0"
            leave="ease-in transform-gpu transition-transform duration-200"
            leaveFrom="translate-x-0" leaveTo="translate-x-full"
            className="fixed top-0 right-0 flex h-full w-full lg:max-w-[62%] xl:max-w-[56%] transform-gpu flex-col bg-white dark:bg-dark-700"
          >
            {/* Header */}
            <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Add Bank Receipt</h3>
                <p className="mt-0.5 text-sm text-white/75">Create a new bank receipt entry</p>
              </div>
              <Button onClick={handleClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
                <XMarkIcon className="size-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
              <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">

                {/* ── Receipt Type ───────────────────────────────────── */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-200">Receipt Type</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {([
                      { value: "manual",        label: "Manual Entry" },
                      { value: "salesEntry",    label: "Sales Entry Credit Bill" },
                      { value: "purchaseReturn",label: "Purchase Return Credit Bill" },
                    ] as const).map(opt => (
                      <Controller key={opt.value} control={control} name="receiptType"
                        render={({ field }) => (
                          <label className="flex cursor-pointer items-center gap-2">
                            <Radio color="primary"
                              checked={field.value === opt.value}
                              onChange={() => {
                                field.onChange(opt.value);
                                setValue("billNo", "");
                                setValue("selectedBill", null);
                                setValue("opAccount", null);
                              }}
                            />
                            <span className="text-sm text-gray-700 dark:text-dark-200">{opt.label}</span>
                          </label>
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* ── Bill Search ────────────────────────────────────── */}
                {(receiptType === "salesEntry" || receiptType === "purchaseReturn") && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10 space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-400">
                      <DocumentTextIcon className="size-4" />
                      {receiptType === "salesEntry" ? "Sales Entry Credit Bill" : "Purchase Return Credit Bill"}
                    </h4>
                    <Controller
                      control={control}
                      name="selectedBill"
                      rules={{ required: `${receiptType === "salesEntry" ? "Sales Entry" : "Purchase Return"} bill is required` }}
                      render={({ field: { value, onChange } }) => (
                        <Combobox
                          data={receiptType === "salesEntry" ? salesEntryBills : purchaseReturnBills}
                          displayField="billNo"
                          searchFields={["billNo", "partyName"]}
                          placeholder="Search Bill No or Party Name..."
                          value={value}
                          onChange={(item: any) => {
                            onChange(item);
                            setValue("billNo", item?.billNo ?? "");
                            setValue("opAccount", item?.partyId ?? null);
                            setValue("amount", item?.pendingAmount ? String(item.pendingAmount) : "");
                          }}
                          renderItem={(item: BillResult, selected, query) => (
                            <div className="px-4 py-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {item.billNo}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-dark-300">
                                    {item.partyName}
                                  </div>
                                </div>
                                <div className="ml-4 text-right">
                                  <div className="text-xs text-gray-500 dark:text-dark-300">
                                    {formatDateDDMMYYYY(item.date)}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      Paid: ₹{item.paidAmount.toFixed(2)}
                                    </span>
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      Pending: ₹{item.pendingAmount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          inputProps={{ className: "h-9 text-sm" }}
                          error={(errors.selectedBill as any)?.message}
                          disabled={loadingBills}
                        />
                      )}
                    />
                    {selectedBill && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/40 dark:bg-emerald-900/20">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{selectedBill.billNo}</p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400">{selectedBill.partyName}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-xs text-gray-500 dark:text-dark-300">Pending</p>
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">₹{selectedBill.pendingAmount.toFixed(2)}</p>
                          </div>
                          <Button type="button" isIcon variant="flat"
                            className="size-6 rounded-full text-gray-400 hover:text-error-600"
                            onClick={() => { setValue("selectedBill", null); setValue("billNo", ""); setValue("opAccount", null); setValue("amount", ""); }}>
                            <XMarkIcon className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Receipt Details ────────────────────────────────── */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
                    <BuildingLibraryIcon className="size-4" />
                    Receipt Details
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Controller control={control} name="bankAccount"
                      rules={{ required: "Bank account is required" }}
                      render={({ field: { value, onChange } }) => (
                        <Listbox
                          data={bankAccounts}
                          placeholder="Select Bank Account *"
                          label={<>Bank Account <span className="text-red-500">*</span></>}
                          displayField="label"
                          value={bankAccounts.find(a => a.id === value) ?? null}
                          onChange={(item: any) => onChange(item?.id ?? null)}
                          error={(errors.bankAccount as any)?.message}
                        />
                      )}
                    />
                    <Input {...register("voucherNo")}
                      label="Voucher No"
                      prefix={<DocumentTextIcon className="size-4" />}
                      disabled
                      classNames={{ input: "h-9 text-sm" }}
                    />
                    <Controller control={control} name="date"
                      rules={{ required: "Date is required" }}
                      render={({ field }) => (
                        <DatePicker
                          label={<>Date <span className="text-red-500">*</span></>}
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.date?.message}
                        />
                      )}
                    />
                  </div>

                  <div className="border-t border-dashed border-primary/30 dark:border-primary/20" />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Controller control={control} name="opAccount"
                        rules={{ required: receiptType === "manual" ? "Party is required" : false }}
                        render={({ field: { value, onChange } }) => (
                          <Listbox
                            data={allAccounts}
                            placeholder="Select Party *"
                            label={<>Party Name {receiptType === "manual" && <span className="text-red-500">*</span>}</>}
                            displayField="label"
                            value={allAccounts.find(a => a.id === value) ?? null}
                            onChange={(item: any) => onChange(item?.id ?? null)}
                            error={(errors.opAccount as any)?.message}
                            inputProps={{ disabled: receiptType !== "manual" }}
                          />
                        )}
                      />
                    </div>
                    <Input
                      {...register("amount", { required: "Amount is required", min: { value: 0.01, message: "Must be > 0" } })}
                      label={<>Amount <span className="text-red-500">*</span></>}
                      type="number" step="0.01" min="0.01"
                      prefix={<CurrencyRupeeIcon className="size-4" />}
                      classNames={{ input: "h-9 text-sm" }}
                      error={errors.amount?.message}
                    />
                  </div>
                </div>

                {/* ── Mode ──────────────────────────────────────────── */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-200">Mode of Receipt</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {MODE_OPTIONS.map(m => (
                      <Controller key={m} control={control} name="mode"
                        render={({ field }) => (
                          <label className="flex cursor-pointer items-center gap-2">
                            <Radio color="primary"
                              checked={field.value === m}
                              onChange={() => field.onChange(m)}
                            />
                            <span className="text-sm text-gray-700 dark:text-dark-200">{m}</span>
                          </label>
                        )}
                      />
                    ))}
                  </div>

                  {/* Cheque fields */}
                  {mode === "CHEQUE" && (
                    <div className="mt-2 grid gap-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:grid-cols-3 dark:border-amber-800/30 dark:bg-amber-900/10">
                      <Input
                        {...register("chequeNo", { required: mode === "CHEQUE" ? "Cheque No required" : false })}
                        label={<>Cheque No <span className="text-red-500">*</span></>}
                        placeholder="Cheque number"
                        classNames={{ input: "h-9 text-sm" }}
                        error={errors.chequeNo?.message}
                      />
                      <Controller control={control} name="chequeDate"
                        rules={{ required: mode === "CHEQUE" ? "Cheque Date required" : false }}
                        render={({ field }) => (
                          <DatePicker
                            label={<>Cheque Date <span className="text-red-500">*</span></>}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.chequeDate?.message}
                          />
                        )}
                      />
                      <Controller control={control} name="chequeClearDate"
                        render={({ field }) => (
                          <DatePicker
                            label="Cheque Clear Date"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* ── Narration ─────────────────────────────────────── */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Narration
                  </label>
                  <textarea
                    {...register("narration")}
                    rows={2}
                    placeholder="Optional narration…"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:placeholder-dark-400"
                  />
                </div>

              </div>{/* end scrollable */}

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
                <Button type="button" variant="outlined" className="px-6" onClick={handleClose}>Cancel</Button>
                <Button type="submit" color="primary" className="gap-2 px-6" disabled={saving}>
                  {saving
                    ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                    : "Save Receipt"}
                </Button>
              </div>
            </form>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function BankReceiptPage() {
  const [rows, setRows]                 = useState<BankReceiptRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filterType, setFilterType]     = useState("all");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await Get("pos/bank-receipts/", { page: 1, page_size: 1000 }) as any;
      const body = res?.data ?? res;
      const data: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body) ? body : [];
      setRows(data.map(mapRow));
    } catch {
      toasterrormsg("Failed to fetch bank receipts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const TYPE_OPTIONS = useMemo(() =>
    ["all", ...Array.from(new Set(rows.map(r => r.type).filter(Boolean)))],
    [rows]);

  const filtered = useMemo(() => {
    if (filterType === "all") return rows;
    return rows.filter(r => r.type === filterType);
  }, [rows, filterType]);

  const grandTotal = useMemo(() =>
    filtered.reduce((s, r) => s + r.amount, 0), [filtered]);

  const handleExport = () => {
    const headers = ["#","Date","Type","Voucher No","Bank Account","Party Name","Amount","Mode","Cheque No","Cheque Date","Clear Date","Narration"];
    const csvRows = filtered.map((r, i) => [
      i + 1, r.date, r.type, r.voucherNo, r.bankAccountName,
      r.partyName, r.amount, r.mode,
      r.chequeNo ?? "—", r.chequeDate ?? "—", r.chequeClearDate ?? "—", r.narration,
    ]);
    const csv = [headers, ...csvRows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "bank_receipt_register.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnDef<BankReceiptRow>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<BankReceiptRow, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<BankReceiptRow, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "type", accessorKey: "type", header: "Type",
      cell: ({ getValue }: CellContext<BankReceiptRow, unknown>) => (
        <TypeBadge type={String(getValue() ?? "")} />
      ),
    },
    {
      id: "voucherNo", accessorKey: "voucherNo", header: "Voucher No",
      cell: ({ getValue, table }: CellContext<BankReceiptRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap  text-xs font-medium text-primary-600 dark:text-primary-400">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "bankAccountName", accessorKey: "bankAccountName", header: "Bank Account",
      cell: ({ getValue, table }: CellContext<BankReceiptRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "partyName", accessorKey: "partyName", header: "Party Name",
      cell: ({ getValue, table }: CellContext<BankReceiptRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="text-gray-700 dark:text-dark-200">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "amount", accessorKey: "amount", header: "Amount",
      cell: ({ getValue }: CellContext<BankReceiptRow, unknown>) => (
        <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "mode", accessorKey: "mode", header: "Mode",
      cell: ({ getValue }: CellContext<BankReceiptRow, unknown>) => (
        <ModeBadge mode={String(getValue() ?? "")} />
      ),
    },
    {
      id: "chequeNo", accessorKey: "chequeNo", header: "Cheque No",
      cell: ({ getValue }: CellContext<BankReceiptRow, unknown>) => (
        <span className=" text-xs text-gray-500 dark:text-dark-300">
          {String(getValue() ?? "") || "—"}
        </span>
      ),
    },
    {
      id: "chequeDate", accessorKey: "chequeDate", header: "Cheque Date",
      cell: ({ getValue }: CellContext<BankReceiptRow, unknown>) => {
        const v = getValue();
        return <span className="whitespace-nowrap text-gray-500 dark:text-dark-300">{v ? formatDateDDMMYYYY(String(v)) : "—"}</span>;
      },
    },
    {
      id: "chequeClearDate", accessorKey: "chequeClearDate", header: "Clear Date",
      cell: ({ getValue }: CellContext<BankReceiptRow, unknown>) => {
        const v = getValue();
        return <span className="whitespace-nowrap text-gray-500 dark:text-dark-300">{v ? formatDateDDMMYYYY(String(v)) : "—"}</span>;
      },
    },
    {
      id: "narration", accessorKey: "narration", header: "Narration",
      cell: ({ getValue }: CellContext<BankReceiptRow, unknown>) => (
        <span className="block max-w-[150px] truncate text-gray-500 dark:text-dark-300">
          {String(getValue() ?? "") || "—"}
        </span>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <Page title="Bank Receipt Register">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Bank Receipt Register
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}records
              {filtered.length > 0 && (
                <> · Total: <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{grandTotal.toLocaleString()}</span></>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" />
              <span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={() => window.print()}>
              <PrinterIcon className="size-4" />
              <span>Print</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={fetchRows} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm" onClick={() => setDrawerOpen(true)}>
              <PlusIcon className="size-4" />
              <span>Add Bank Receipt</span>
            </Button>
          </div>
        </div>

        {/* ── Summary cards ─────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{grandTotal.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Amount</p>
          </div>
          {["BR","SBR","PRBR"].map(t => {
            const count = rows.filter(r => r.type === t).length;
            const bgMap: Record<string, string> = {
              BR:   "bg-gradient-to-br from-primary-500 to-primary-700",
              SBR:  "bg-gradient-to-br from-sky-500 to-sky-700",
              PRBR: "bg-gradient-to-br from-amber-500 to-amber-600",
            };
            return (
              <div key={t} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bgMap[t])}>
                <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
                <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                  <CurrencyRupeeIcon className="size-4 text-white" />
                </div>
                <p className="text-xl font-bold tabular-nums">{count}</p>
                <p className="mt-0.5 text-xs font-medium text-white/80">{t} Entries</p>
              </div>
            );
          })}
        </div>

        {/* ── Search + Type filter ───────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4 flex flex-wrap items-center gap-3">
          <div className="max-w-xs flex-1">
            <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4" />}
              classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
              placeholder="Search by Voucher No, Bank Account, Party, Mode…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  filterType === t
                    ? "bg-primary text-white"
                    : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200",
                )}>
                {t === "all" ? "All Types" : t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading bank receipts…" : "No bank receipts found."}
        />
      </div>

      <AddBankReceiptDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        onSaved={fetchRows}
      />
    </Page>
  );
}
