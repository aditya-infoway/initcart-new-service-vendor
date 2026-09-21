import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon,
  DocumentTextIcon, MagnifyingGlassIcon,
  PlusIcon, PrinterIcon, TrashIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Button, Input } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ──────────────────────────────────────────────────────────────────
interface JournalEntry {
  accountId: number;
  accountName: string;
  debit: string;
  credit: string;
  narration: string;
}

interface JournalVoucher {
  id: number;
  date: string;
  voucherNo: string;
  referenceNo: string;
  entries: JournalEntry[];
}

function mapVoucher(raw: any): JournalVoucher {
  return {
    id:          Number(raw.id ?? 0),
    date:        String(raw.date ?? ""),
    voucherNo:   String(raw.voucher_no ?? ""),
    referenceNo: String(raw.reference_no ?? ""),
    entries: Array.isArray(raw.entries) ? raw.entries.map((e: any) => ({
      accountId:   Number(e.account ?? 0),
      accountName: String(e.account_name ?? ""),
      debit:       String(e.debit ?? ""),
      credit:      String(e.credit ?? ""),
      narration:   String(e.narration ?? ""),
    })) : [],
  };
}

interface AccountOption { id: number; label: string; }

const today = new Date().toISOString().split("T")[0];

interface EntryInput {
  accountId: number | null;
  accountName: string;
  debit: string;
  credit: string;
  narration: string;
}

interface FormValues {
  date:        string;
  voucherNo:   string;
  referenceNo: string;
  // staged entry (not yet added to the list)
  stageAccount:   AccountOption | null;
  stageDebit:     string;
  stageCredit:    string;
  stageNarration: string;
  // confirmed entry rows
  entries: EntryInput[];
}

const DEFAULT_VALUES: FormValues = {
  date:           today,
  voucherNo:      "",
  referenceNo:    "",
  stageAccount:   null,
  stageDebit:     "",
  stageCredit:    "",
  stageNarration: "",
  entries:        [],
};

// ── Add Journal Entry Drawer ───────────────────────────────────────────────
function AddJournalDrawer({
  isOpen, close, onSaved,
}: {
  isOpen: boolean;
  close: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving]         = useState(false);
  const [accounts, setAccounts]     = useState<AccountOption[]>([]);
  const [lockSide, setLockSide]     = useState<"debit" | "credit" | null>(null);
  const [stageError, setStageError] = useState("");

  const {
    control, register, handleSubmit, reset, setValue, watch, getValues,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES, mode: "onTouched" });

  const { fields, append, remove } = useFieldArray({ control, name: "entries" });

  const entries      = watch("entries");
  const stageAccount = watch("stageAccount");
  const stageDebit   = watch("stageDebit");
  const stageCredit  = watch("stageCredit");

  const totalDebit  = entries.reduce((s, e) => s + Number(e.debit  || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit || 0), 0);
  const balanced    = entries.length >= 2 && totalDebit === totalCredit && totalDebit > 0;

  // Fetch all accounts + voucher on open
  useEffect(() => {
    if (!isOpen) return;
    Get("pos/all-account/").then((res: any) => {
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body) ? body : [];
      setAccounts(rows.map((a: any) => ({ id: a.id, label: a.account_name })));
    }).catch(() => toasterrormsg("Failed to load accounts."));

    Get("pos/voucher/generate/", { type: "JE" }).then((res: any) => {
      setValue("voucherNo", (res?.data ?? res)?.voucher_no ?? "");
    }).catch(() => {});
  }, [isOpen, setValue]);

  const handleClose = () => {
    reset(DEFAULT_VALUES);
    setLockSide(null);
    setStageError("");
    close();
  };

  // Add staged entry to the list
  const addEntry = () => {
    const acc = getValues("stageAccount");
    const dr  = getValues("stageDebit");
    const cr  = getValues("stageCredit");
    const nar = getValues("stageNarration");

    if (!acc) { setStageError("Select an account."); return; }
    if (!dr && !cr) { setStageError("Enter debit or credit amount."); return; }

    // Check duplicate
    if (entries.some(e => e.accountId === acc.id)) {
      setStageError("This account is already added."); return;
    }

    setStageError("");
    append({
      accountId:   acc.id,
      accountName: acc.label,
      debit:       dr || "",
      credit:      cr || "",
      narration:   nar,
    });

    // Reset staged fields
    setValue("stageAccount", null);
    setValue("stageDebit", "");
    setValue("stageCredit", "");
    setValue("stageNarration", "");
    setLockSide(null);
  };

  const onSubmit = async (values: FormValues) => {
    if (!balanced) {
      toasterrormsg("Debit and Credit totals must be equal and ≥ 2 entries required.");
      return;
    }
    setSaving(true);
    try {
      await Post("pos/journal-entries/", {
        date:          values.date,
        voucher_no:    values.voucherNo,
        reference_no:  values.referenceNo || "",
        total_debit:   totalDebit,
        total_credit:  totalCredit,
        entries: values.entries.map(e => ({
          account:  e.accountId,
          debit:    e.debit  || 0,
          credit:   e.credit || 0,
          narration: e.narration || "",
        })),
      });
      toastsuccessmsg("Journal entry saved successfully.");
      onSaved();
      handleClose();
    } catch (e: any) {
      const d = e?.response?.data;
      toasterrormsg(
        d?.detail || d?.non_field_errors?.[0] ||
        Object.values(d ?? {}).flat().join(", ") ||
        "Failed to save journal entry.",
      );
    } finally {
      setSaving(false);
    }
  };

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
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[72%] xl:max-w-[65%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Add Journal Entry</h3>
              <p className="mt-0.5 text-sm text-white/75">Add debit and credit lines — they must balance</p>
            </div>
            <Button onClick={handleClose} variant="flat" isIcon
              className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">

              {/* ── Voucher header ─────────────────────────────────── */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
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
                  <Input {...register("voucherNo")}
                    label="Voucher No"
                    prefix={<DocumentTextIcon className="size-4" />}
                    disabled
                    classNames={{ input: "h-9 text-sm" }}
                  />
                  <Input {...register("referenceNo")}
                    label="Reference No"
                    placeholder="Optional"
                    classNames={{ input: "h-9 text-sm" }}
                  />
                </div>
              </div>

              {/* ── Entry input row ────────────────────────────────── */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-4">
                <h4 className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  Add Entry Line
                </h4>
                <div className="grid gap-3 sm:grid-cols-5 items-end">
                  {/* Account */}
                  <div className="sm:col-span-2">
                    <Controller control={control} name="stageAccount"
                      render={({ field: { value, onChange } }) => (
                        <Listbox
                          data={accounts}
                          placeholder="Select Account"
                          label="Account"
                          displayField="label"
                          value={value ?? null}
                          onChange={(item: any) => onChange(item ?? null)}
                        />
                      )}
                    />
                  </div>
                  {/* Debit */}
                  <Input
                    {...register("stageDebit")}
                    label="Debit (Dr)"
                    type="number" step="0.01" min="0"
                    placeholder="0.00"
                    disabled={lockSide === "credit"}
                    classNames={{ input: clsx("h-9 text-sm", lockSide === "credit" && "cursor-not-allowed") }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setValue("stageDebit", e.target.value);
                      if (e.target.value && lockSide === null) {
                        setLockSide("debit");
                        setValue("stageCredit", "");
                      }
                      if (!e.target.value) setLockSide(null);
                    }}
                  />
                  {/* Credit */}
                  <Input
                    {...register("stageCredit")}
                    label="Credit (Cr)"
                    type="number" step="0.01" min="0"
                    placeholder="0.00"
                    disabled={lockSide === "debit"}
                    classNames={{ input: clsx("h-9 text-sm", lockSide === "debit" && "cursor-not-allowed") }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setValue("stageCredit", e.target.value);
                      if (e.target.value && lockSide === null) {
                        setLockSide("credit");
                        setValue("stageDebit", "");
                      }
                      if (!e.target.value) setLockSide(null);
                    }}
                  />
                  {/* Narration */}
                  <Input {...register("stageNarration")}
                    label="Narration"
                    placeholder="Optional"
                    classNames={{ input: "h-9 text-sm" }}
                  />
                </div>

                {stageError && (
                  <p className="text-xs text-error-600 dark:text-error-400">{stageError}</p>
                )}

                <Button type="button" color="primary" variant="soft"
                  className="h-9 gap-2 rounded-md px-4 text-sm"
                  onClick={addEntry}
                  disabled={!stageAccount || (!stageDebit && !stageCredit)}>
                  <PlusIcon className="size-4" />
                  Add Line
                </Button>
              </div>

              {/* ── Entries table ──────────────────────────────────── */}
              {fields.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-dark-800">
                          {["#","Party / Account","Debit (Dr)","Credit (Cr)","Narration",""].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-600 dark:text-dark-200 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((f, i) => (
                          <tr key={f.id} className="border-t border-gray-100 dark:border-dark-600">
                            <td className="px-4 py-2.5 text-gray-400 dark:text-dark-400">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-dark-100">{f.accountName}</td>
                            <td className="px-4 py-2.5 tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                              {f.debit ? `₹${Number(f.debit).toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                              {f.credit ? `₹${Number(f.credit).toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-dark-300 max-w-[120px] truncate">
                              {f.narration || "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <Button type="button" isIcon variant="flat"
                                className="size-7 rounded-full text-gray-400 hover:text-error-600"
                                onClick={() => remove(i)}>
                                <TrashIcon className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Totals row */}
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-800">
                          <td colSpan={2} className="px-4 py-2.5 text-xs font-bold uppercase text-gray-600 dark:text-dark-200">
                            TOTAL
                          </td>
                          <td className={clsx("px-4 py-2.5 font-bold tabular-nums",
                            balanced ? "text-emerald-600 dark:text-emerald-400" : "text-gray-800 dark:text-dark-100")}>
                            ₹{totalDebit.toFixed(2)}
                          </td>
                          <td className={clsx("px-4 py-2.5 font-bold tabular-nums",
                            balanced ? "text-emerald-600 dark:text-emerald-400" : "text-gray-800 dark:text-dark-100")}>
                            ₹{totalCredit.toFixed(2)}
                          </td>
                          <td colSpan={2} className="px-4 py-2.5">
                            {fields.length >= 2 && totalDebit !== totalCredit && (
                              <span className="text-xs text-error-600 dark:text-error-400 font-medium">
                                Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}
                              </span>
                            )}
                            {balanced && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                ✓ Balanced
                              </span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <p className="text-xs text-gray-500 dark:text-dark-300">
                {fields.length < 2 && "Add at least 2 entries."}
                {fields.length >= 2 && !balanced && "Debit and Credit must be equal."}
                {balanced && <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready to submit.</span>}
              </p>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outlined" className="px-6" onClick={handleClose}>Cancel</Button>
                <Button type="submit" color="primary" className="gap-2 px-6"
                  disabled={saving || !balanced}>
                  {saving
                    ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                    : "Submit Journal"}
                </Button>
              </div>
            </div>
          </form>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function JournalEntriesPage() {
  const [vouchers, setVouchers]         = useState<JournalVoucher[]>([]);
  const [loading, setLoading]           = useState(true);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await Get("pos/journal-entries/") as any;
      const body = res?.data ?? res;
      const data: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body) ? body : [];
      setVouchers(data.map(mapVoucher));
    } catch {
      toasterrormsg("Failed to fetch journal entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // Flatten vouchers → display rows (one per entry line, voucher fields on first line only)
  interface FlatRow {
    id: string;
    voucherIndex: number;
    entryIndex: number;
    isFirst: boolean;
    voucherId: number;
    date: string;
    voucherNo: string;
    referenceNo: string;
    accountName: string;
    debit: string;
    credit: string;
    narration: string;
  }

  const flatRows = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = [];
    vouchers.forEach((v, vi) => {
      v.entries.forEach((e, ei) => {
        out.push({
          id:           `${v.id}-${ei}`,
          voucherIndex: vi,
          entryIndex:   ei,
          isFirst:      ei === 0,
          voucherId:    v.id,
          date:         v.date,
          voucherNo:    v.voucherNo,
          referenceNo:  v.referenceNo,
          accountName:  e.accountName,
          debit:        e.debit,
          credit:       e.credit,
          narration:    e.narration,
        });
      });
    });
    return out;
  }, [vouchers]);

  // Filter flat rows
  const filtered = useMemo(() => {
    if (!globalFilter) return flatRows;
    const q = globalFilter.toLowerCase();
    return flatRows.filter(r =>
      r.voucherNo.toLowerCase().includes(q) ||
      r.accountName.toLowerCase().includes(q) ||
      r.referenceNo.toLowerCase().includes(q) ||
      r.narration.toLowerCase().includes(q),
    );
  }, [flatRows, globalFilter]);

  const handleExport = () => {
    const headers = ["#","Date","Voucher No","Reference","Party","Debit","Credit","Narration"];
    const csvRows = filtered.map((r, i) => [
      i + 1, r.isFirst ? r.date : "", r.isFirst ? r.voucherNo : "",
      r.isFirst ? r.referenceNo : "",
      r.accountName, r.debit || "—", r.credit || "—", r.narration,
    ]);
    const csv = [headers, ...csvRows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "journal_entries.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnDef<FlatRow>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<FlatRow, unknown>) => (
        row.original.isFirst
          ? <span className="text-gray-400 dark:text-dark-400">{row.original.voucherIndex + 1}</span>
          : null
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue, row }: CellContext<FlatRow, unknown>) =>
        row.original.isFirst ? (
          <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
            {formatDateDDMMYYYY(String(getValue() ?? ""))}
          </span>
        ) : null,
    },
    {
      id: "voucherNo", accessorKey: "voucherNo", header: "Voucher No",
      cell: ({ getValue, table, row }: CellContext<FlatRow, unknown>) => {
        if (!row.original.isFirst) return null;
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap  text-xs font-medium text-primary-600 dark:text-primary-400">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "referenceNo", accessorKey: "referenceNo", header: "Reference",
      cell: ({ getValue, row }: CellContext<FlatRow, unknown>) =>
        row.original.isFirst ? (
          <span className="text-xs text-gray-500 dark:text-dark-300">
            {String(getValue() ?? "") || "—"}
          </span>
        ) : null,
    },
    {
      id: "accountName", accessorKey: "accountName", header: "Party",
      cell: ({ getValue, table }: CellContext<FlatRow, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "debit", accessorKey: "debit", header: "Debit",
      cell: ({ getValue }: CellContext<FlatRow, unknown>) => {
        const v = String(getValue() ?? "");
        return v && v !== "0" ? (
          <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
            ₹{Number(v).toFixed(2)}
          </span>
        ) : <span className="text-gray-400">—</span>;
      },
    },
    {
      id: "credit", accessorKey: "credit", header: "Credit",
      cell: ({ getValue }: CellContext<FlatRow, unknown>) => {
        const v = String(getValue() ?? "");
        return v && v !== "0" ? (
          <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
            ₹{Number(v).toFixed(2)}
          </span>
        ) : <span className="text-gray-400">—</span>;
      },
    },
    {
      id: "narration", accessorKey: "narration", header: "Narration",
      cell: ({ getValue }: CellContext<FlatRow, unknown>) => (
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
    getRowId: (row) => row.id,
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <Page title="Journal Entries">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">Journal Entries</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">{vouchers.length}</span>{" "}vouchers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" /><span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={() => window.print()}>
              <PrinterIcon className="size-4" /><span>Print</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={fetchRows} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /><span>Refresh</span>
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm" onClick={() => setDrawerOpen(true)}>
              <PlusIcon className="size-4" /><span>Add Journal</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search by Voucher No, Party, Reference…"
          />
        </div>

        {/* Table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading journal entries…" : "No journal entries found."}
        />
      </div>

      <AddJournalDrawer isOpen={drawerOpen} close={() => setDrawerOpen(false)} onSaved={fetchRows} />
    </Page>
  );
}
