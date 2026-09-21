import {
  getCoreRowModel, useReactTable,
  ColumnDef, CellContext,
} from "@tanstack/react-table";
import {
  ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon,
  CubeIcon, BuildingStorefrontIcon, CalendarDaysIcon,
  DocumentTextIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckSolid } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button } from "@/components/ui";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { STATUS_LABEL, STATUS_COLOR, ReturnDetail, ReturnItem } from "./data";

export default function StockReturnDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const [detail, setDetail]           = useState<ReturnDetail | null>(null);
  const [loading, setLoading]          = useState(true);
  const [processing, setProcessing]    = useState(false);
  const [selectedIds, setSelectedIds]  = useState<Set<number>>(new Set());

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await Get(`pos/stock-returns/${id}/`) as any;
      const body = res?.data ?? res;
      setDetail(body?.data ?? body);
    } catch { toasterrormsg("Could not load return detail."); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const canPackage  = detail?.status === "approved";
  const canCancel   = detail ? !["received","rejected","approved","cancelled"].includes(detail.status) : false;
  const allPackaged = detail?.items.every(i => i.is_packaging_ready) ?? false;
  const packedCount = detail?.items.filter(i => i.is_packaging_ready).length ?? 0;

  const toggleId = (itemId: number) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n; });

  const updatePackaging = async (ids: number[], ready: boolean) => {
    if (!detail) return;
    setProcessing(true);
    try {
      const res  = await Post(`pos/stock-returns/${detail.id}/packaging/`, { item_ids: ids, is_packaging_ready: ready }) as any;
      const body = res?.data ?? res;
      body?.success !== false
        ? (toastsuccessmsg(body?.message ?? "Packaging updated."), setSelectedIds(new Set()), await load())
        : toasterrormsg(body?.message ?? "Failed.");
    } catch (e: any) { toasterrormsg(e?.response?.data?.message ?? "Error."); }
    finally { setProcessing(false); }
  };

  const cancelReturn = async () => {
    if (!detail || !confirm("Cancel this return request?")) return;
    try {
      const res  = await Post(`pos/stock-returns/${detail.id}/cancel/`, {}) as any;
      const body = res?.data ?? res;
      body?.success !== false
        ? (toastsuccessmsg(body?.message ?? "Return cancelled."), navigate("/order-management/stock-return"))
        : toasterrormsg(body?.message ?? "Failed.");
    } catch (e: any) { toasterrormsg(e?.response?.data?.message ?? "Error."); }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<ReturnItem>[]>(() => [
    {
      id: "check", header: () => canPackage ? <span className="sr-only">Select</span> : null,
      size: 48, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<ReturnItem, unknown>) => {
        if (!canPackage) return null;
        const item     = row.original;
        const returned = item.is_returned_to_company;
        const sel      = selectedIds.has(item.id);
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
      id: "status", header: "Status", enableSorting: false,
      cell: ({ row }: CellContext<ReturnItem, unknown>) => {
        const item = row.original;
        if (item.is_returned_to_company) return <Badge color="success" variant="soft" className="text-xs">Returned</Badge>;
        if (item.is_packaging_ready)     return <Badge color="info"    variant="soft" className="text-xs">Packaged</Badge>;
        return                                   <Badge color="warning" variant="soft" className="text-xs">Pending</Badge>;
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canPackage, selectedIds]);

  const table = useReactTable({
    data:               detail?.items ?? [],
    columns,
    getRowId:           (row: any) => String(row.id),
    getCoreRowModel:    getCoreRowModel(),
    // `getRowProps` is a runtime helper used by our MasterTable wrapper; cast to `any` to satisfy TS
  } as any);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <Page title="Stock Return Detail">
      <div className="flex items-center justify-center py-32">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </Page>
  );

  if (!detail) return (
    <Page title="Stock Return Detail">
      <div className="px-(--margin-x) pt-8 text-center text-sm text-gray-500 dark:text-dark-300">Return not found.</div>
    </Page>
  );

  return (
    <Page title={`Return — ${detail.return_no}`}>
      <div className="transition-content w-full pb-8 space-y-5">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-1">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={() => navigate("/order-management/stock-return")}>
              <ArrowLeftIcon className="size-4" /> Back
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
                {detail.return_no}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Stock Return Detail</p>
            </div>
            <Badge color={STATUS_COLOR[detail.status] ?? "primary"} variant="soft">
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
        <div className="px-(--margin-x) grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Branch",          value: detail.branch_name,                     bg: "from-primary-500 to-primary-700",   Icon: BuildingStorefrontIcon },
            { label: "To Branch",       value: detail.to_branch_name,                  bg: "from-sky-500 to-sky-700",           Icon: BuildingStorefrontIcon },
            { label: "Return Date",     value: formatDateDDMMYYYY(detail.return_date),  bg: "from-amber-500 to-amber-600",       Icon: CalendarDaysIcon },
            { label: "Source Transfer", value: detail.source_transfer_no || "—",       bg: "from-emerald-500 to-emerald-700",   Icon: DocumentTextIcon },
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

        {/* Note */}
        {detail.note && (
          <div className="px-(--margin-x)">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary-700 dark:bg-primary/10 dark:text-primary-300">
              📝 {detail.note}
            </div>
          </div>
        )}

        {/* ── Stats + packaging actions ─────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-3">
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
        {{
          pending:         <div className="px-(--margin-x)"><div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20">Awaiting approval. Packaging can only be done after approval.</div></div>,
          packaging_ready: <div className="px-(--margin-x)"><div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-700 dark:border-sky-800/30 dark:bg-sky-900/20">All items packaged. Awaiting company to receive stock.</div></div>,
          approved:        <div className="px-(--margin-x)"><div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20">Return approved. Please mark items as packaged.</div></div>,
          received:        <div className="px-(--margin-x)"><div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20"><CheckCircleIcon className="size-5 shrink-0" /> Return fully received. Stock updated.</div></div>,
          rejected:        <div className="px-(--margin-x)"><div className="rounded-xl border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-800/30 dark:bg-error-900/20">Return was rejected.</div></div>,
        }[detail.status] ?? null}

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
