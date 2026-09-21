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
  ArrowsRightLeftIcon, BuildingLibraryIcon,
  CurrencyRupeeIcon, DocumentTextIcon,
  MagnifyingGlassIcon, PlusIcon, PrinterIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Controller, useForm } from "react-hook-form";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Radio } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
type ContraType = "Cash Deposit" | "Cash Withdrawal" | "Bank Transfer";

interface ContraRow {
  id: number;
  voucherNo: string;
  date: string;
  type: ContraType | string;
  cashAccountName: string;
  partyName: string;
  amount: number;
}

function mapRow(raw: any): ContraRow {
  return {
    id:              Number(raw.id ?? 0),
    voucherNo:       String(raw.voucher_no ?? ""),
    date:            String(raw.date ?? ""),
    type:            String(raw.type ?? ""),
    cashAccountName: String(raw.cash_account_name ?? ""),
    partyName:       String(raw.party_name ?? ""),
    amount:          Number(raw.amount ?? 0),
  };
}

interface AccountOption { id: number; label: string; }

const today = new Date().toISOString().split("T")[0];

interface FormValues {
  type: ContraType;
  account:   number | null;   // "from" / cash / bank account
  opaccount: number | null;   // "to" / opposite account
  voucherNo: string;
  date: string;
  amount: string;
  narration: string;
}

const DEFAULT_VALUES: FormValues = {
  type:      "Cash Deposit",
  account:   null,
  opaccount: null,
  voucherNo: "",
  date:      today,
  amount:    "",
  narration: "",
};

// ── Type badge ─────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, "success" | "warning" | "info"> = {
  "Cash Deposit":    "success",
  "Cash Withdrawal": "warning",
  "Bank Transfer":   "info",
};
function TypeBadge({ type }: { type: string }) {
  return (
    <Badge color={TYPE_COLOR[type] ?? "primary"} variant="soft" className="whitespace-nowrap">
      {type || "—"}
    </Badge>
  );
}

// ── Add Contra Drawer ──────────────────────────────────────────────────────
function AddContraDrawer({
  isOpen, close, onSaved,
}: {
  isOpen: boolean;
  close: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving]             = useState(false);
  const [cashAccounts, setCashAccounts] = useState<AccountOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<AccountOption[]>([]);

  const {
    control, register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES, mode: "onTouched" });

  const contraType = watch("type");
  const accountVal = watch("account");
  const opAccountVal = watch("opaccount");

  // Load accounts + voucher on open
  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      Get("pos/account-terms-type/", { terms: "cash" }),
      Get("pos/account-terms-type/", { terms: "bank" }),
    ]).then(([cashRes, bankRes]: any[]) => {
      const mapOpts = (res: any) => {
        const body = res?.data ?? res;
        const rows: any[] = Array.isArray(body) ? body
          : Array.isArray(body?.results) ? body.results : [];
        return rows.map((a: any) => ({ id: a.id, label: a.account_name }));
      };
      setCashAccounts(mapOpts(cashRes));
      setBankAccounts(mapOpts(bankRes));
    }).catch(() => toasterrormsg("Failed to load accounts."));

    Get("pos/voucher/generate/", { type: "CT" }).then((res: any) => {
      setValue("voucherNo", (res?.data ?? res)?.voucher_no ?? "");
    }).catch(() => {});
  }, [isOpen, setValue]);

  // Reset account selections when type changes
  const handleTypeChange = (t: ContraType) => {
    setValue("type", t);
    setValue("account", null);
    setValue("opaccount", null);
  };

  const handleClose = () => { reset(DEFAULT_VALUES); close(); };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await Post("pos/contra/", {
        type:        values.type,
        cash_account: values.account,
        op_account:   values.opaccount,
        voucher_no:   values.voucherNo,
        date:         values.date,
        amount:       values.amount,
        narration:    values.narration || "",
      });
      toastsuccessmsg("Contra entry saved successfully.");
      onSaved();
      handleClose();
    } catch (e: any) {
      const d = e?.response?.data;
      toasterrormsg(
        d?.detail || d?.non_field_errors?.[0] ||
        Object.values(d ?? {}).flat().join(", ") ||
        "Failed to save contra entry.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Determine labels + which dropdowns show which account list
  const labels = useMemo(() => {
    if (contraType === "Cash Deposit")
      return { top: "Cash Account", bottom: "Bank Account" };
    if (contraType === "Cash Withdrawal")
      return { top: "Bank Account", bottom: "Cash Account" };
    return { top: "Bank Account (From)", bottom: "Bank Account (To)" };
  }, [contraType]);

  // For bank transfer: filter out the already-selected bank from the other dropdown
  const topBankOptions    = useMemo(() =>
    bankAccounts.filter(a => a.id !== opAccountVal),
    [bankAccounts, opAccountVal]);
  const bottomBankOptions = useMemo(() =>
    bankAccounts.filter(a => a.id !== accountVal),
    [bankAccounts, accountVal]);

  const topOptions    = contraType === "Cash Deposit"     ? cashAccounts
                      : contraType === "Cash Withdrawal"  ? topBankOptions
                      : topBankOptions;
  const bottomOptions = contraType === "Cash Deposit"     ? bankAccounts
                      : contraType === "Cash Withdrawal"  ? cashAccounts
                      : bottomBankOptions;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={handleClose}>
        <TransitionChild as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />
        <TransitionChild as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full" enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0" leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[58%] xl:max-w-[50%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Add Contra Entry</h3>
              <p className="mt-0.5 text-sm text-white/75">Cash deposit, withdrawal or bank transfer</p>
            </div>
            <Button onClick={handleClose} variant="flat" isIcon
              className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">

              {/* ── Transaction Type ───────────────────────────────── */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-200">Transaction Type</h4>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {(["Cash Deposit", "Cash Withdrawal", "Bank Transfer"] as ContraType[]).map(t => (
                    <Controller key={t} control={control} name="type"
                      render={({ field }) => (
                        <label className="flex cursor-pointer items-center gap-2">
                          <Radio color="primary"
                            checked={field.value === t}
                            onChange={() => handleTypeChange(t)}
                          />
                          <span className="text-sm text-gray-700 dark:text-dark-200">{t}</span>
                        </label>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* ── Voucher / Date ─────────────────────────────────── */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
                  <ArrowsRightLeftIcon className="size-4" />
                  Entry Details
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
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

                {/* Top account */}
                <Controller control={control} name="account"
                  rules={{ required: `${labels.top} is required` }}
                  render={({ field: { value, onChange } }) => (
                    <Listbox
                      data={topOptions}
                      placeholder={`Select ${labels.top} *`}
                      label={<>{labels.top} <span className="text-red-500">*</span></>}
                      displayField="label"
                      value={topOptions.find(a => a.id === value) ?? null}
                      onChange={(item: any) => onChange(item?.id ?? null)}
                      error={(errors.account as any)?.message}
                    />
                  )}
                />

                {/* Arrow between accounts */}
                <div className="flex items-center gap-2 text-gray-400 dark:text-dark-400">
                  <div className="h-px flex-1 border-t border-dashed border-gray-300 dark:border-dark-500" />
                  <ArrowsRightLeftIcon className="size-4 shrink-0" />
                  <div className="h-px flex-1 border-t border-dashed border-gray-300 dark:border-dark-500" />
                </div>

                {/* Bottom account */}
                <Controller control={control} name="opaccount"
                  rules={{ required: `${labels.bottom} is required` }}
                  render={({ field: { value, onChange } }) => (
                    <Listbox
                      data={bottomOptions}
                      placeholder={`Select ${labels.bottom} *`}
                      label={<>{labels.bottom} <span className="text-red-500">*</span></>}
                      displayField="label"
                      value={bottomOptions.find(a => a.id === value) ?? null}
                      onChange={(item: any) => onChange(item?.id ?? null)}
                      error={(errors.opaccount as any)?.message}
                    />
                  )}
                />

                {/* Amount */}
                <Input
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 0.01, message: "Must be > 0" },
                  })}
                  label={<>Amount <span className="text-red-500">*</span></>}
                  type="number" step="0.01" min="0.01"
                  prefix={<CurrencyRupeeIcon className="size-4" />}
                  classNames={{ input: "h-9 text-sm" }}
                  error={errors.amount?.message}
                />
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

            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button type="button" variant="outlined" className="px-6" onClick={handleClose}>Cancel</Button>
              <Button type="submit" color="primary" className="gap-2 px-6" disabled={saving}>
                {saving
                  ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                  : "Save Entry"}
              </Button>
            </div>
          </form>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ContraPage() {
  const [rows, setRows]                 = useState<ContraRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filterType, setFilterType]     = useState("all");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await Get("pos/contra/", { page: 1, page_size: 1000 }) as any;
      const body = res?.data ?? res;
      const data: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body) ? body : [];
      setRows(data.map(mapRow));
    } catch {
      toasterrormsg("Failed to fetch contra entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const TYPES = ["Cash Deposit", "Cash Withdrawal", "Bank Transfer"];
  const TYPE_OPTIONS = useMemo(() =>
    ["all", ...TYPES],
    []);

  const filtered = useMemo(() => {
    if (filterType === "all") return rows;
    return rows.filter(r => r.type === filterType);
  }, [rows, filterType]);

  const grandTotal = useMemo(() =>
    filtered.reduce((s, r) => s + r.amount, 0), [filtered]);

  const handleExport = () => {
    const headers = ["#","Voucher No","Date","Type","Cash/Bank Account","Opp. Account","Amount"];
    const csvRows = filtered.map((r, i) => [
      i + 1, r.voucherNo, r.date, r.type,
      r.cashAccountName, r.partyName, r.amount,
    ]);
    const csv = [headers, ...csvRows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "contra_register.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnDef<ContraRow>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<ContraRow, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "voucherNo", accessorKey: "voucherNo", header: "Voucher No",
      cell: ({ getValue, table }: CellContext<ContraRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap  text-xs font-medium text-primary-600 dark:text-primary-400">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<ContraRow, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "type", accessorKey: "type", header: "Type",
      cell: ({ getValue }: CellContext<ContraRow, unknown>) => (
        <TypeBadge type={String(getValue() ?? "")} />
      ),
    },
    {
      id: "cashAccountName", accessorKey: "cashAccountName", header: "Cash/Bank Account",
      cell: ({ getValue, table }: CellContext<ContraRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "partyName", accessorKey: "partyName", header: "Opp. Account",
      cell: ({ getValue, table }: CellContext<ContraRow, unknown>) => {
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
      cell: ({ getValue }: CellContext<ContraRow, unknown>) => (
        <span className="font-bold tabular-nums text-primary-600 dark:text-primary-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
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
    <Page title="Contra">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">Contra</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}records
              {filtered.length > 0 && (
                <> · Total: <span className="font-semibold text-primary-600 dark:text-primary-400">₹{grandTotal.toLocaleString()}</span></>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" />
              <span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={() => window.print()}>
              <PrinterIcon className="size-4" /><span>Print</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={fetchRows} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /><span>Refresh</span>
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm" onClick={() => setDrawerOpen(true)}>
              <PlusIcon className="size-4" /><span>Add Contra</span>
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{grandTotal.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Amount</p>
          </div>
          {[
            { label: "Cash Deposits",     type: "Cash Deposit",    bg: "from-emerald-500 to-emerald-700" },
            { label: "Cash Withdrawals",  type: "Cash Withdrawal", bg: "from-amber-500 to-amber-600" },
            { label: "Bank Transfers",    type: "Bank Transfer",   bg: "from-sky-500 to-sky-700" },
          ].map(({ label, type, bg }) => {
            const count = rows.filter(r => r.type === type).length;
            return (
              <div key={type} className={clsx("relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-md", bg)}>
                <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
                <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                  <ArrowsRightLeftIcon className="size-4 text-white" />
                </div>
                <p className="text-xl font-bold tabular-nums">{count}</p>
                <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
              </div>
            );
          })}
        </div>

        {/* Search + type filter */}
        <div className="px-(--margin-x) mt-4 flex flex-wrap items-center gap-3">
          <div className="max-w-xs flex-1">
            <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4" />}
              classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
              placeholder="Search by Voucher No, Account…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filterType === t
                    ? "bg-primary text-white"
                    : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200",
                )}>
                {t === "all" ? "All Types" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading contra entries…" : "No contra entries found."}
        />
      </div>

      <AddContraDrawer isOpen={drawerOpen} close={() => setDrawerOpen(false)} onSaved={fetchRows} />
    </Page>
  );
}
