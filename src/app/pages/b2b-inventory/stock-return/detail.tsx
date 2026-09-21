import {
  getCoreRowModel, useReactTable,
  ColumnDef, CellContext,
} from "@tanstack/react-table";
import {
  ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon,
  CubeIcon, BuildingOfficeIcon, CalendarDaysIcon,
  DocumentCheckIcon, XMarkIcon, InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckSolid } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button } from "@/components/ui";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface TransferHop {
  hop_type: string;
  hop_label: string;
  transfer_no: string;
  from_branch_name: string;
  to_branch_name: string;
  transfer_date: string;
  quantity: number;
  status: string;
}

interface ReturnItem {
  id: number;
  item_name: string;
  variant_info: string;
  barcode: string;
  hsnCode: string;
  taxSlab: string;
  quantity: number;
  rate: number;
  is_packaging_ready: boolean;
  is_returned_to_company: boolean;
  transfer_no: string;
  from_branch_name: string;
  transfer_chain: TransferHop[];
}

interface ReturnDetail {
  id: number;
  return_no: string;
  branch_name: string;
  to_branch_name: string;
  return_date: string;
  status: string;
  note: string;
  source_b2b_transfer_no: string;
  items: ReturnItem[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  packaging_ready: "Packaging Ready",
  approved: "Approved",
  received: "Received",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "info",
  packaging_ready: "primary",
  approved: "success",
  received: "success",
  rejected: "error",
  cancelled: "neutral",
};

// ── Transfer Chain Trail Component ───────────────────────────────────────────
function TransferChainTrail({ chain, compact = false }: { chain: TransferHop[]; compact?: boolean }) {
  if (!chain || chain.length === 0) {
    return <span className="text-xs text-gray-400 italic">Chain info unavailable</span>;
  }
  return (
    <div className={`flex items-center flex-wrap gap-1 ${compact ? "text-[10px]" : "text-xs"}`}>
      {chain.map((hop, idx) => (
        <span key={idx} className="inline-flex items-center gap-1 bg-white border border-primary/20 rounded-lg px-2 py-1 dark:bg-dark-700 dark:border-dark-600">
          <BuildingOfficeIcon className={`text-primary/60 ${compact ? 'size-2' : 'size-2.5'}`} />
          <span className="font-semibold text-gray-700 dark:text-dark-300 whitespace-nowrap">{hop.from_branch_name}</span>
        </span>
      ))}
      <span className="text-primary/60">→</span>
      <span className="inline-flex items-center gap-1 bg-success/10 border border-success/20 rounded-lg px-2 py-1">
        <BuildingOfficeIcon className={`text-success ${compact ? 'size-2' : 'size-2.5'}`} />
        <span className="font-semibold text-success-700 dark:text-success-400 whitespace-nowrap">
          {chain[chain.length - 1].to_branch_name}
        </span>
      </span>
    </div>
  );
}

// ── GST Summary Card ─────────────────────────────────────────────────────────
interface GstTotals { basic: number; tax: number; cgst: number; sgst: number; igst: number; net: number; }

const GstSummaryCard = ({ totals, title = "GST Summary" }: { totals: GstTotals; title?: string }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
    <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-100 mb-4">{title}</h3>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between py-1.5 border-b border-primary/10">
        <span className="text-gray-600 dark:text-dark-400">Total Basic Amount</span>
        <span className="font-medium text-gray-800 dark:text-dark-100">₹ {totals.basic.toFixed(2)}</span>
      </div>
      {totals.cgst > 0 || totals.sgst > 0 ? (
        <>
          <div className="flex justify-between py-1.5 border-b border-primary/10">
            <span className="text-gray-600 dark:text-dark-400">CGST</span>
            <span className="font-medium text-gray-800 dark:text-dark-100">₹ {totals.cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-primary/10">
            <span className="text-gray-600 dark:text-dark-400">SGST</span>
            <span className="font-medium text-gray-800 dark:text-dark-100">₹ {totals.sgst.toFixed(2)}</span>
          </div>
        </>
      ) : totals.igst > 0 ? (
        <div className="flex justify-between py-1.5 border-b border-primary/10">
          <span className="text-gray-600 dark:text-dark-400">IGST</span>
          <span className="font-medium text-gray-800 dark:text-dark-100">₹ {totals.igst.toFixed(2)}</span>
        </div>
      ) : null}
      <div className="flex justify-between pt-2 text-base font-bold">
        <span className="text-gray-800 dark:text-dark-100">Total Tax Amount</span>
        <span className="text-primary">₹ {totals.tax.toFixed(2)}</span>
      </div>
      <div className="flex justify-between pt-2 text-base font-bold border-t-2 border-primary/20">
        <span className="text-gray-800 dark:text-dark-100">Net Total (incl. GST)</span>
        <span className="text-primary">₹ {totals.net.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function B2BStockReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await Get(`pos/b2b-stock-returns/${id}/`) as any;
      const body = res?.data ?? res;
      setDetail(body?.data ?? body);
    } catch { toasterrormsg("Could not load return detail."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const canPackage = detail?.status === "approved";
  const canCancel = detail ? !["received", "rejected", "approved", "cancelled"].includes(detail.status) : false;
  const allPackaged = detail?.items.every(i => i.is_packaging_ready) ?? false;
  const packedCount = detail?.items.filter(i => i.is_packaging_ready).length ?? 0;

  const toggleId = (itemId: number) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n; });

  const updatePackaging = async (ids: number[], ready: boolean) => {
    if (!detail) return;
    setProcessing(true);
    try {
      const res = await Post(`pos/b2b-stock-returns/${detail.id}/packaging/`, { item_ids: ids, is_packaging_ready: ready }) as any;
      const body = res?.data ?? res;
      body?.success !== false
        ? (toastsuccessmsg(body?.message ?? "Packaging updated."), setSelectedIds(new Set()), await load())
        : toasterrormsg(body?.message ?? "Failed.");
    } catch (e: any) { toasterrormsg(e?.response?.data?.message ?? "Error."); }
    finally { setProcessing(false); }
  };

  const cancelReturn = async () => {
    if (!detail) return;
    try {
      const res = await Post(`pos/b2b-stock-returns/${detail.id}/cancel/`, {}) as any;
      const body = res?.data ?? res;
      body?.success !== false
        ? (toastsuccessmsg(body?.message ?? "Return cancelled."), navigate("/b2b-inventory/stock-return"))
        : toasterrormsg(body?.message ?? "Failed.");
    } catch (e: any) { toasterrormsg(e?.response?.data?.message ?? "Error."); }
  };

  // ── GST Calculation ───────────────────────────────────────────────────────
  const safeNum = (val: any): number => {
    if (val === null || val === undefined || val === "") return 0;
    const n = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(n) ? 0 : n;
  };

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const gstTotals = useMemo(() => {
    if (!detail) return { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 };
    return detail.items.reduce(
      (acc, i) => {
        const taxPercent = safeNum(String(i.taxSlab).replace("%", ""));
        const netAmount = round2(i.rate * i.quantity);
        let tax = 0, cgst = 0, sgst = 0, igst = 0;
        if (taxPercent > 0) {
          tax = round2((netAmount * taxPercent) / 100);
          const basic = round2(netAmount - tax);
          // Assume same state for B2B returns (can be refined if API provides state info)
          const half = round2(tax / 2);
          cgst = half;
          sgst = round2(tax - half);
        }
        return {
          basic: acc.basic + round2(netAmount - tax),
          tax: acc.tax + tax,
          cgst: acc.cgst + cgst,
          sgst: acc.sgst + sgst,
          igst: acc.igst + igst,
          net: acc.net + netAmount,
        };
      },
      { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 }
    );
  }, [detail]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<ReturnItem>[]>(() => [
    {
      id: "check", header: () => canPackage ? <span className="sr-only">Select</span> : null,
      size: 48, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<ReturnItem, unknown>) => {
        if (!canPackage) return null;
        const item = row.original;
        const returned = item.is_returned_to_company;
        const sel = selectedIds.has(item.id);
        if (returned) return <span className="text-xs text-gray-400">✓</span>;
        return (
          <button onClick={() => toggleId(item.id)}
            className={clsx(
              "size-6 rounded-md flex items-center justify-center transition-colors",
              sel ? "bg-primary text-white" : "border border-gray-300 bg-white hover:border-primary dark:border-dark-500 dark:bg-dark-700",
            )}>
            {sel && <CheckSolid className="size-3.5" />}
          </button>
        );
      },
    },
    {
      id: "idx", header: "#", size: 50, enableSorting: false,
      cell: ({ row }: CellContext<ReturnItem, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "item_name", accessorKey: "item_name", header: "Item Name",
      cell: ({ getValue }: CellContext<ReturnItem, unknown>) => (
        <span className="font-semibold text-gray-800 dark:text-dark-100">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "variant_info", accessorKey: "variant_info", header: "Variant",
      cell: ({ getValue }: CellContext<ReturnItem, unknown>) => (
        <Badge color="info" variant="soft" className="text-xs">{String(getValue() ?? "Default")}</Badge>
      ),
    },
    {
      id: "barcode", accessorKey: "barcode", header: "Barcode",
      cell: ({ getValue }: CellContext<ReturnItem, unknown>) => (
        <span className=" text-xs text-gray-500 dark:text-dark-300">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "hsnCode", accessorKey: "hsnCode", header: "HSN",
      cell: ({ getValue }: CellContext<ReturnItem, unknown>) => (
        <span className=" text-xs text-gray-500 dark:text-dark-300">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "taxSlab", accessorKey: "taxSlab", header: "GST",
      cell: ({ getValue }: CellContext<ReturnItem, unknown>) => (
        <Badge color="info" variant="soft" className="text-xs">{String(getValue() ?? "0%")}</Badge>
      ),
    },
    {
      id: "quantity", accessorKey: "quantity", header: "Qty",
      cell: ({ getValue }: CellContext<ReturnItem, unknown>) => (
        <Badge color="primary" variant="soft" className="text-xs">{String(getValue() ?? 0)}</Badge>
      ),
    },
    {
      id: "rate", accessorKey: "rate", header: "Rate ₹",
      cell: ({ getValue }: CellContext<ReturnItem, unknown>) => (
        <span className="tabular-nums font-semibold text-primary-600 dark:text-primary-400">
          ₹{Number(getValue() ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "amount", header: "Amount ₹",
      cell: ({ row }: CellContext<ReturnItem, unknown>) => {
        const item = row.original;
        return (
          <span className="tabular-nums font-bold text-primary">
            ₹{(item.quantity * item.rate).toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "origin", header: "Origin Trail",
      cell: ({ row }: CellContext<ReturnItem, unknown>) => (
        <TransferChainTrail chain={row.original.transfer_chain} compact />
      ),
    },
    {
      id: "status", header: "Status", enableSorting: false,
      cell: ({ row }: CellContext<ReturnItem, unknown>) => {
        const item = row.original;
        if (item.is_returned_to_company) return <Badge color="success" variant="soft" className="text-xs">Returned</Badge>;
        if (item.is_packaging_ready) return <Badge color="info" variant="soft" className="text-xs">Packaged</Badge>;
        return <Badge color="warning" variant="soft" className="text-xs flex items-center gap-1 justify-center">
          <InformationCircleIcon className="size-3" /> Pending
        </Badge>;
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canPackage, selectedIds]);

  const table = useReactTable({
    data: detail?.items ?? [],
    columns,
    getRowId: row => String(row.id),
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <Page title="B2B Stock Return Detail">
      <div className="transition-content w-full pb-8">
        <div className="px-(--margin-x) flex items-center justify-center py-32">
          <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    </Page>
  );

  if (!detail) return (
    <Page title="B2B Stock Return Detail">
      <div className="transition-content w-full pb-8">
        <div className="px-(--margin-x) text-center py-8 text-sm text-gray-500 dark:text-dark-300">Return not found.</div>
      </div>
    </Page>
  );

  return (
    <Page title={`Return — ${detail.return_no}`}>
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-1">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={() => navigate("/b2b-inventory/stock-return")}>
              <ArrowLeftIcon className="size-4" /> Back
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
                {detail.return_no}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">B2B Stock Return Detail</p>
            </div>
            <Badge color={(STATUS_COLOR[detail.status] as any) ?? "primary"} variant="soft">
              {STATUS_LABEL[detail.status] ?? detail.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={load} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
            </Button>
            {canCancel && (
              <Button variant="outlined"
                className="h-8 gap-1.5 rounded-md px-3 text-xs text-error-600 border-error-300 hover:bg-error-50 dark:border-error-800 dark:hover:bg-error-900/20"
                onClick={cancelReturn}>
                <XMarkIcon className="size-3.5" /> Cancel Return
              </Button>
            )}
          </div>
        </div>

        {/* ── Summary gradient cards ────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Branch", value: detail.branch_name, bg: "from-primary-500 to-primary-700", Icon: BuildingOfficeIcon },
              { label: "To Branch", value: detail.to_branch_name, bg: "from-sky-500 to-sky-700", Icon: BuildingOfficeIcon },
              { label: "Return Date", value: formatDateDDMMYYYY(detail.return_date), bg: "from-amber-500 to-amber-600", Icon: CalendarDaysIcon },
              { label: "Source Transfer", value: detail.source_b2b_transfer_no || "—", bg: "from-emerald-500 to-emerald-700", Icon: DocumentCheckIcon },
            ].map(({ label, value, bg, Icon }) => (
              <div key={label} className={clsx("relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-md", bg)}>
                <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
                <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                  <Icon className="size-4 text-white" />
                </div>
                <p className="text-sm font-bold leading-snug">{value}</p>
                <p className="mt-0.5 text-xs font-medium text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        {detail.note && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary-700 dark:bg-primary/10 dark:text-primary-300">
              📝 {detail.note}
            </div>
          </div>
        )}

        {/* ── Stats + packaging actions ─────────────────────────────────── */}
        <div className="px-(--margin-x) mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary/20 dark:text-primary-300">
              <CubeIcon className="size-3.5" /> Total Items: {detail.items.length}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckSolid className="size-3.5" /> Packaged: {packedCount}
            </span>
            {detail.items.length - packedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Pending: {detail.items.length - packedCount}
              </span>
            )}
          </div>
          {canPackage && (
            <div className="flex flex-wrap gap-2">
              {!allPackaged && (
                <Button color="primary" className="h-8 gap-2 rounded-md px-4 text-xs"
                  disabled={processing}
                  onClick={() => updatePackaging(detail.items.map(i => i.id), true)}>
                  <CheckSolid className="size-3.5" /> Mark All Ready
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button color="success" className="h-8 gap-2 rounded-md px-4 text-xs"
                  disabled={processing}
                  onClick={() => updatePackaging(Array.from(selectedIds), true)}>
                  <CheckCircleIcon className="size-3.5" /> Mark Selected ({selectedIds.size})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Status banners */}
        {(detail.status === 'pending' && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20">Awaiting approval. Packaging can only be done after approval.</div>
          </div>
        )) ||
        (detail.status === 'packaging_ready' && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-700 dark:border-sky-800/30 dark:bg-sky-900/20">All items packaged. Awaiting company to receive stock.</div>
          </div>
        )) ||
        (detail.status === 'approved' && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20">Return approved. Please mark items as packaged.</div>
          </div>
        )) ||
        (detail.status === 'received' && (
          <div className="px-(--margin-x) mt-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20"><CheckCircleIcon className="size-5 shrink-0" /> Return fully received. Stock updated.</div>
          </div>
        )) ||
        (detail.status === 'rejected' && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-800/30 dark:bg-error-900/20">Return was rejected.</div>
          </div>
        ))}

        {/* ── GST Summary Card ──────────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-3">
          <GstSummaryCard totals={gstTotals} />
        </div>

        {/* ── Items table via MasterTable ───────────────────────────────── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage="No items in this return."
        />

      </div>
    </Page>
  );
}
