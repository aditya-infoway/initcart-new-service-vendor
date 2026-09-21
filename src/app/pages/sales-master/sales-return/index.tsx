import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon, CubeIcon, EyeIcon,
  FunnelIcon, MagnifyingGlassIcon, PlusIcon,
  PrinterIcon, TrashIcon, XMarkIcon,
  BanknotesIcon, ReceiptRefundIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input, Table, THead, TBody, Tr, Th, Td, Card } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, Delete, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import { mapApiSalesReturn, SalesReturnRecord } from "./data";

function DetailDrawer({ isOpen, onClose, rec }: { isOpen: boolean; onClose: () => void; rec: SalesReturnRecord | null }) {
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
                  Sales Return Details — {rec?.returnNo}
                </h3>
                <p className="mt-0.5 text-sm text-white/75">
                  {rec?.customerName} · {formatDateDDMMYYYY(rec?.date ?? "")}
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
                { label: "Total Items", value: rec?.items.length ?? 0, bg: "bg-gradient-to-br from-blue-500 to-blue-700", Icon: CubeIcon },
                { label: "Grand Total", value: `₹${Number(rec?.grandTotal ?? 0).toFixed(2)}`, bg: "bg-gradient-to-br from-primary-500 to-primary-700", Icon: BanknotesIcon },
                { label: "Return Type", value: rec?.returnType ?? "—", bg: "bg-gradient-to-br from-emerald-500 to-emerald-700", Icon: ReceiptRefundIcon },
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

            {/* Info cards */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-600 flex items-center gap-3 bg-gray-50 dark:bg-dark-800">
                <ReceiptRefundIcon className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">Return Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                {[
                  { label: "Return No", value: rec?.returnNo ?? "" },
                  { label: "Date", value: formatDateDDMMYYYY(rec?.date ?? "") },
                  { label: "Customer", value: rec?.customerName ?? "" },
                  { label: "Reason", value: rec?.reason ?? "" },
                  { label: "Return Type", value: rec?.returnType ?? "" },
                  { label: "Approved By", value: rec?.approvedBy || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-dark-500 dark:bg-dark-800">
                    <p className="text-xs text-gray-400 dark:text-dark-400">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-dark-100">{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Items table */}
            {(rec?.items.length ?? 0) > 0 && (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-600 flex items-center gap-3 bg-gray-50 dark:bg-dark-800">
                  <ReceiptRefundIcon className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">Returned Items</h3>
                  <Badge color="primary" variant="soft" className="text-xs font-semibold">
                    {rec?.items.length ?? 0}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table hoverable className="w-full">
                    <THead>
                      <Tr>
                        {["Item", "Qty", "Price", "Tax%", "Net Amount"].map(h => (
                          <Th key={h} className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">{h}</Th>
                        ))}
                      </Tr>
                    </THead>
                    <TBody>
                      {rec?.items.map((item, i) => (
                        <Tr key={i} className="dark:border-b-dark-500 border-b border-gray-100 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800">
                          <Td className="px-4 py-3 font-semibold text-gray-800 dark:text-dark-100">{item.item_name}</Td>
                          <Td className="px-4 py-3 text-center">
                            <Badge color="info" variant="soft" className="text-xs font-bold">
                              {item.return_quantity}
                            </Badge>
                          </Td>
                          <Td className="px-4 py-3 text-right text-xs font-mono font-semibold text-primary">
                            ₹{Number(item.price).toFixed(2)}
                          </Td>
                          <Td className="px-4 py-3 text-center">
                            <Badge color="warning" variant="soft" className="text-xs">
                              {item.tax_percent}%
                            </Badge>
                          </Td>
                          <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-primary">
                            ₹{Number(item.net_amount).toFixed(2)}
                          </Td>
                        </Tr>
                      ))}
                      <Tr className="dark:border-b-dark-500 border-t-2 border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-800">
                        <Td colSpan={4} className="px-4 py-3 text-xs font-bold uppercase text-gray-700 dark:text-dark-100">Total</Td>
                        <Td className="px-4 py-3 text-right text-xs font-mono font-bold text-primary dark:text-primary-400">
                          ₹{Number(rec?.grandTotal ?? 0).toFixed(2)}
                        </Td>
                      </Tr>
                    </TBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
            <Button variant="outlined" className="gap-2" onClick={() => window.print()}>
              <PrinterIcon className="size-4" /> Print
            </Button>
            <Button variant="outlined" onClick={onClose}>Close</Button>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

export default function SalesReturnPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SalesReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filterType, setFilterType] = useState<{ label: string; value: string } | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selected, setSelected] = useState<SalesReturnRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/sales-return-list/", { page: 1, page_size: 1000 }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body) ? body : [];
      setRecords(rows.map(mapApiSalesReturn));
    } catch {
      toasterrormsg("Failed to fetch sales returns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = useMemo(() => {
    if (!filterType?.value) return records;
    return records.filter(r => r.returnType.toLowerCase() === filterType.value.toLowerCase());
  }, [records, filterType]);

  const totals = useMemo(() => ({
    grand: filtered.reduce((s, r) => s + r.grandTotal, 0),
    full: records.filter(r => r.returnType.toLowerCase() === "full").length,
    partial: records.filter(r => r.returnType.toLowerCase() === "partial").length,
  }), [filtered, records]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this sales return?")) return;
    try {
      await Delete(`pos/sales-return-delete/${id}/`, {});
      toastsuccessmsg("Sales return deleted successfully.");
      fetchRecords();
    } catch {
      toasterrormsg("Failed to delete sales return.");
    }
  };

  const handleExport = () => {
    const headers = ["SR", "Return No", "Date", "Customer Name", "Reason", "Return Type", "Approved By", "Grand Total"];
    const rows = filtered.map((r, i) => [
      i + 1, r.returnNo, r.date, r.customerName, r.reason, r.returnType, r.approvedBy, r.grandTotal.toFixed(2),
    ]);
    const grandTotal = filtered.reduce((s, r) => s + r.grandTotal, 0);
    rows.push(["", "", "", "TOTAL", "", "", "", grandTotal.toFixed(2)]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_return_list_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastsuccessmsg(`Exported ${filtered.length} records.`);
  };

  const columns = useMemo<ColumnDef<SalesReturnRecord>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SalesReturnRecord, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "returnNo", accessorKey: "returnNo", header: "Return No",
      cell: ({ getValue, table }: CellContext<SalesReturnRecord, unknown>) => {
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
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">{formatDateDDMMYYYY(String(getValue() ?? ""))}</span>
      ),
    },
    {
      id: "customerName", accessorKey: "customerName", header: "Customer",
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
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => {
        const v = String(getValue() ?? "");
        return <Badge color={v.toLowerCase() === "full" ? "success" : "warning"} variant="soft" className="text-xs capitalize">{v || "—"}</Badge>;
      },
    },
    {
      id: "approvedBy", accessorKey: "approvedBy", header: "Approved By",
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => (
        <span className="text-gray-600 dark:text-dark-200">{String(getValue() ?? "") || "—"}</span>
      ),
    },
    {
      id: "grandTotal", accessorKey: "grandTotal", header: "Amount",
      cell: ({ getValue }: CellContext<SalesReturnRecord, unknown>) => (
        <span className="font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{Number(getValue() ?? 0).toFixed(2)}</span>
      ),
    },
    {
      id: "actions", header: "Actions", enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<SalesReturnRecord, unknown>) => (
        <div className="flex items-center gap-1.5">
          <Button isIcon variant="flat" className="size-7 rounded-full" title="View"
            onClick={() => setSelected(row.original)}>
            <EyeIcon className="size-3.5" />
          </Button>
          <Button isIcon variant="flat" className="size-7 rounded-full hover:bg-error-50 dark:hover:bg-error-900/20"
            title="Delete" onClick={() => handleDelete(row.original.id)}>
            <TrashIcon className="size-3.5 text-error-600" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    getRowId: row => String(row.id),
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
    <Page title="Sales Return & Report">
      <div className="transition-content w-full pb-8">
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">Sales Return List</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              <span className="font-semibold text-gray-800 dark:text-dark-100">{table.getFilteredRowModel().rows.length}</span> records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className={clsx("h-9 gap-2 rounded-md px-3 text-sm", showFilter && "border-primary text-primary")}
              onClick={() => setShowFilter(v => !v)}>
              <FunnelIcon className={clsx("size-4", showFilter && "text-primary")} /><span>Filters</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={handleExport}>
              <ArrowDownTrayIcon className="size-4 text-success-600" /><span>Export Excel</span>
            </Button>
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={fetchRecords} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /><span>Refresh</span>
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => navigate("/sales/sales-return-report/new")}>
              <PlusIcon className="size-4" /><span>New Return</span>
            </Button>
          </div>
        </div>

        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20"><BanknotesIcon className="size-4 text-white" /></div>
            <p className="text-xl font-bold tabular-nums">₹{totals.grand.toLocaleString()}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Total Return Value</p>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20"><ReceiptRefundIcon className="size-4 text-white" /></div>
            <p className="text-xl font-bold tabular-nums">{totals.full}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Full Returns</p>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20"><ReceiptRefundIcon className="size-4 text-white" /></div>
            <p className="text-xl font-bold tabular-nums">{totals.partial}</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">Partial Returns</p>
          </div>
        </div>

        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search Return No, Customer, Reason…" />
        </div>

        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
              <Combobox label="Return Type" value={filterType} onChange={(item: any) => setFilterType(item)}
                data={[
                  { label: "All Types", value: "" },
                  { label: "Full Return", value: "Full" },
                  { label: "Partial Return", value: "Partial" },
                ]}
                displayField="label"
                searchFields={["label"]}
                by="value"
              />
            </div>
          </div>
        )}

        <MasterTable table={table} columnCount={columns.length}
          emptyMessage={loading ? "Loading sales returns…" : "No sales returns found."} />
      </div>
      <DetailDrawer isOpen={!!selected} onClose={() => setSelected(null)} rec={selected} />
    </Page>
  );
}
