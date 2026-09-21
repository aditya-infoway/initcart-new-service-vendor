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
  CheckCircleIcon, CubeIcon, CurrencyRupeeIcon, EyeIcon, FunnelIcon,
  MagnifyingGlassIcon, PrinterIcon,
  ReceiptRefundIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Card, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";

// ── Types ─────────────────────────────────────────────────────────────────
interface ReturnItem {
  item: number;
  variant: number;
  itemName: string;
  hsnCode: string;
  qty: string;
  price: string;
  unit: string;
  discountPercent: string;
  taxPercent: string;
  basicAmount: string;
  discountAmount: string;
  taxAmount: string;
  netAmount: string;
}

interface SalesReturnRecord {
  id: number;
  returnNo: string;
  date: string;
  partyName: string;
  reason: string;
  returnType: "Full" | "Partial" | string;
  paymentTerms: string;
  approvedBy: string;
  amount: number;
  items: ReturnItem[];
}

function mapApiReturn(raw: any): SalesReturnRecord {
  return {
    id:           Number(raw.id ?? 0),
    returnNo:     String(raw.return_no ?? raw.bill_no ?? ""),
    date:         String(raw.date ?? ""),
    partyName:    String(raw.party_name ?? raw.customer_name ?? ""),
    reason:       String(raw.reason ?? ""),
    returnType:   String(raw.return_type ?? raw.type ?? ""),
    paymentTerms: String(raw.payment_terms ?? raw.terms ?? ""),
    approvedBy:   String(raw.approved_by ?? raw.approvedby ?? ""),
    amount:       Number(raw.amount ?? raw.grand_total ?? raw.total_amount ?? 0),
    items: Array.isArray(raw.items) ? raw.items.map((i: any) => ({
      item:            Number(i.item ?? 0),
      variant:         Number(i.variant ?? 0),
      itemName:        String(i.item_name ?? ""),
      hsnCode:         String(i.hsn_code ?? ""),
      qty:             String(i.qty ?? "0"),
      price:           String(i.price ?? "0"),
      unit:            String(i.unit ?? "pc"),
      discountPercent: String(i.discount_percent ?? "0"),
      taxPercent:      String(i.tax_percent ?? "0"),
      basicAmount:     String(i.basic_amount ?? "0"),
      discountAmount:  String(i.discount_amount ?? "0"),
      taxAmount:       String(i.tax_amount ?? "0"),
      netAmount:       String(i.net_amount ?? "0"),
    })) : [],
  };
}

// ── Type badge helper ─────────────────────────────────────────────────────
function ReturnTypeBadge({ value }: { value: string }) {
  const isFull = value.toLowerCase() === "full";
  return (
    <Badge
      color={isFull ? "success" : "warning"}
      variant="soft"
      className="capitalize"
    >
      {value || "—"}
    </Badge>
  );
}

// ── Items Detail Drawer ────────────────────────────────────────────────────
function ItemsDrawer({ isOpen, onClose, record }: { isOpen: boolean; onClose: () => void; record: SalesReturnRecord | null }) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={onClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />

        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[65%] xl:max-w-[55%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-white/20 text-white">
                <ReceiptRefundIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Returned Items — {record?.returnNo}
                </h3>
                <p className="mt-0.5 text-sm text-white/75">
                  {record?.partyName} · {formatDateDDMMYYYY(record?.date ?? "")}
                  {record?.returnType ? ` · ${record.returnType} Return` : ""}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="flat"
              isIcon
              className="size-8 rounded-full text-white hover:bg-white/10"
            >
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="hide-scrollbar grow space-y-4 overflow-y-auto px-5 py-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Total Items", value: record?.items.length ?? 0, bg: "bg-gradient-to-br from-blue-500 to-blue-700", Icon: CubeIcon },
                { label: "Amount", value: `₹${Number(record?.amount ?? 0).toFixed(2)}`, bg: "bg-gradient-to-br from-primary-500 to-primary-700", Icon: BanknotesIcon },
                { label: "Return Type", value: record?.returnType ?? "—", bg: "bg-gradient-to-br from-emerald-500 to-emerald-700", Icon: CurrencyRupeeIcon },
              ].map(({ label, value, bg, Icon }) => (
                <div key={label} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bg)}>
                  <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
                  <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                    <Icon className="size-4 text-white" />
                  </div>
                  <p className="text-xl font-bold tabular-nums">{value}</p>
                  <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
                </div>
              ))}
            </div>

            {/* Items table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-600 flex items-center gap-3 bg-gray-50 dark:bg-dark-800">
                <ReceiptRefundIcon className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">Returned Items</h3>
                <Badge color="primary" variant="soft" className="text-xs font-semibold">
                  {record?.items.length ?? 0}
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <Table hoverable className="w-full text-left">
                  <THead>
                    <Tr>
                      {["SR","Item Name","HSN","Qty","Price","Per","Disc%","Basic Amt","Disc Amt","Tax Amt","Net Value"].map(h => (
                        <Th key={h} className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">
                          {h}
                        </Th>
                      ))}
                    </Tr>
                  </THead>
                  <TBody>
                    {!record?.items.length ? (
                      <Tr>
                        <Td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-400">
                          No items found.
                        </Td>
                      </Tr>
                    ) : record.items.map((item, i) => (
                      <Tr key={i} className="dark:border-b-dark-500 border-b border-gray-100 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800">
                        <Td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</Td>
                        <Td className="px-4 py-3 font-semibold text-gray-800 dark:text-dark-100">{item.itemName}</Td>
                        <Td className="px-4 py-3 text-xs text-gray-500">{item.hsnCode}</Td>
                        <Td className="px-4 py-3 text-center">
                          <Badge color="info" variant="soft" className="text-xs font-bold">
                            {item.qty}
                          </Badge>
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-semibold text-primary">
                          ₹{Number(item.price).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-center text-xs text-gray-500">{item.unit}</Td>
                        <Td className="px-4 py-3 text-center">
                          <Badge color="warning" variant="soft" className="text-xs">
                            {Number(item.discountPercent).toFixed(2)}%
                          </Badge>
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-semibold text-primary">
                          ₹{Number(item.basicAmount).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono text-gray-500">
                          ₹{Number(item.discountAmount).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-semibold text-amber-600">
                          ₹{Number(item.taxAmount).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-primary">
                          ₹{Number(item.netAmount).toFixed(2)}
                        </Td>
                      </Tr>
                    ))}
                    {(record?.items.length ?? 0) > 0 && (
                      <Tr className="dark:border-b-dark-500 border-t-2 border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-800">
                        <Td colSpan={7} className="px-4 py-3 text-xs font-bold uppercase text-gray-700 dark:text-dark-100">Total</Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-primary dark:text-primary-400">
                          ₹{record?.items.reduce((s, i) => s + Number(i.basicAmount), 0).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-gray-500">
                          ₹{record?.items.reduce((s, i) => s + Number(i.discountAmount), 0).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-amber-600">
                          ₹{record?.items.reduce((s, i) => s + Number(i.taxAmount), 0).toFixed(2)}
                        </Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-primary dark:text-primary-400">
                          ₹{record?.items.reduce((s, i) => s + Number(i.netAmount), 0).toFixed(2)}
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end border-t border-gray-200 px-5 py-4 dark:border-dark-500">
            <Button variant="outlined" onClick={onClose}>Close</Button>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function SalesReturnRegisterPage() {
  const [records, setRecords] = useState<SalesReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<SalesReturnRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/sales-return-list/", { page: 1, page_size: 1000 }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body) ? body : [];
      setRecords(rows.map(mapApiReturn));
    } catch {
      toasterrormsg("Failed to fetch sales return records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Derived data ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filterType === "all") return records;
    return records.filter(r => r.returnType.toLowerCase() === filterType.toLowerCase());
  }, [records, filterType]);

  const fullReturns    = useMemo(() => records.filter(r => r.returnType.toLowerCase() === "full").length,    [records]);
  const partialReturns = useMemo(() => records.filter(r => r.returnType.toLowerCase() === "partial").length, [records]);
  const grandTotal     = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const pageTotal      = useMemo(() => {
    // Sum only the rows currently visible on the active page
    return filtered.reduce((s, r) => s + r.amount, 0);
  }, [filtered]);

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["SR","Return No","Date","Party Name","Reason","Type","Payment Terms","Approved By","Amount","Items"];
    const rows = filtered.map((r, i) => [
      i + 1,
      r.returnNo,
      r.date,
      r.partyName,
      r.reason,
      r.returnType,
      r.paymentTerms,
      r.approvedBy,
      r.amount,
      r.items.length,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales_return_register.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<SalesReturnRecord>[]>(() => [
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SalesReturnRecord, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "returnNo", accessorKey: "returnNo", header: "Return No",
      cell: ({ getValue, table }: CellContext<SalesReturnRecord, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="whitespace-nowrap font-medium text-primary-600 dark:text-primary-400">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "partyName", accessorKey: "partyName", header: "Party Name",
      cell: ({ getValue, table }: CellContext<SalesReturnRecord, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "reason", accessorKey: "reason", header: "Reason",
      cell: ({ getValue, table }: CellContext<SalesReturnRecord, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="block max-w-[140px] truncate text-gray-500 dark:text-dark-300">
            <Highlight query={q}>{String(getValue() ?? "") || "—"}</Highlight>
          </span>
        );
      },
    },
    {
      id: "returnType", accessorKey: "returnType", header: "Type",
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => (
        <ReturnTypeBadge value={String(getValue() ?? "")} />
      ),
    },
    {
      id: "paymentTerms", accessorKey: "paymentTerms", header: "Payment Terms",
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => {
        const v = String(getValue() ?? "");
        return (
          <Badge color={v === "Cash" ? "success" : "info"} variant="soft">{v || "—"}</Badge>
        );
      },
    },
    {
      id: "approvedBy", accessorKey: "approvedBy", header: "Approved By",
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => (
        <span className="text-gray-600 dark:text-dark-200">
          {String(getValue() ?? "") || "—"}
        </span>
      ),
    },
    {
      id: "amount", accessorKey: "amount", header: "Amount",
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => (
        <span className="font-bold tabular-nums text-primary-600 dark:text-primary-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "items", header: "Items", size: 80,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SalesReturnRecord, unknown>) => (
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200">
            {row.original.items.length}
          </span>
          {row.original.items.length > 0 && (
            <Button isIcon variant="flat" className="size-7 rounded-full"
              onClick={() => setSelectedRecord(row.original)} title="View Items">
              <EyeIcon className="size-3.5" />
            </Button>
          )}
        </div>
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

  const pageRows = table.getPaginationRowModel().rows;
  const currentPageTotal = pageRows.reduce((s, r) => s + r.original.amount, 0);

  return (
    <Page title="Sales Return Register">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Sales Return Report
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => setShowFilter(v => !v)}>
              <FunnelIcon className={clsx("size-4", showFilter && "text-primary")} />
              <span>Filters</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" />
              <span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={handlePrint}>
              <PrinterIcon className="size-4" />
              <span>Print</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchRecords} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ── Summary cards ────────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Grand Total */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <BanknotesIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{grandTotal.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Grand Total</p>
          </div>

          {/* Page Total */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <ReceiptRefundIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">₹{currentPageTotal.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">
              Page Total
              <span className="ml-1 font-normal opacity-70">({pageRows.length} on this page)</span>
            </p>
          </div>

          {/* Full Returns */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <CheckCircleIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">{fullReturns}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">
              Full Returns
              <span className="ml-1 block font-normal opacity-70">Complete return</span>
            </p>
          </div>

          {/* Partial Returns */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
              <ReceiptRefundIcon className="size-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums">{partialReturns}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">
              Partial Returns
              <span className="ml-1 block font-normal opacity-70">Partial return</span>
            </p>
          </div>
        </div>

        {/* ── Search ───────────────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search by Return No, Party, Reason…"
          />
        </div>

        {/* ── Filter panel ─────────────────────────────────────────────── */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Return Type
              </p>
              <div className="flex flex-wrap gap-2">
                {["all", "Full", "Partial"].map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                      filterType === t
                        ? "bg-primary text-white"
                        : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200",
                    )}
                  >
                    {t === "all" ? "All Types" : `${t} Return`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────────── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading sales return records…" : "No sales return records found."}
        />
      </div>

      {/* ── Items Detail Drawer ────────────────────────────────────────── */}
      <ItemsDrawer isOpen={!!selectedRecord} record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </Page>
  );
}
