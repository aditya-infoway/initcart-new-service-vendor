import {
  getCoreRowModel, useReactTable,
  ColumnDef, CellContext,
} from "@tanstack/react-table";
import {
  ArrowLeftIcon, ArrowPathIcon,
  CalendarDaysIcon, ClipboardDocumentListIcon,
  CubeIcon, TruckIcon, DocumentTextIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button } from "@/components/ui";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { OrderDetail, OrderItem, mapApiOrderDetail, getOrderStatusStyle } from "./data";

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await Get(`pos/branch-orders/${id}/`) as any;
      const body = res?.data ?? res;
      const raw  = body?.order ?? body?.data ?? body;
      setOrder(mapApiOrderDetail(raw));
    } catch { toasterrormsg("Failed to load order details."); }
    finally  { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<OrderItem>[]>(() => [
    {
      id: "idx", header: "#", size: 50, enableSorting: false,
      cell: ({ row }: CellContext<OrderItem, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "itemName", accessorKey: "itemName", header: "Item Name",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <span className="font-medium text-gray-800 dark:text-dark-100">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "variant", accessorKey: "variant", header: "Variant",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <Badge color="info" variant="soft" className="text-xs">{String(getValue() ?? "—")}</Badge>
      ),
    },
    {
      id: "size", accessorKey: "size", header: "Size",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "color", accessorKey: "color", header: "Color",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "barcode", accessorKey: "barcode", header: "Barcode",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <span className=" text-xs text-gray-500 dark:text-dark-300">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "hsn", accessorKey: "hsn", header: "HSN",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <span className=" text-xs text-gray-600 dark:text-dark-200">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "gstPercent", accessorKey: "gstPercent", header: "GST%",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <Badge color="warning" variant="soft" className="text-xs">{String(getValue() ?? 0)}%</Badge>
      ),
    },
    {
      id: "requestedQty", accessorKey: "requestedQty", header: "Requested",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <span className="font-semibold tabular-nums text-gray-800 dark:text-dark-100">{String(getValue() ?? 0)}</span>
      ),
    },
    {
      id: "approvedQty", accessorKey: "approvedQty", header: "Approved",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => {
        const v = getValue();
        return v != null
          ? <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{String(v)}</span>
          : <Badge color="warning" variant="soft" className="text-xs">Pending</Badge>;
      },
    },
    {
      id: "purchasePrice", accessorKey: "purchasePrice", header: "Purchase ₹",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <span className="font-semibold tabular-nums text-primary-600 dark:text-primary-400">₹{String(getValue() ?? 0)}</span>
      ),
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => {
        const v   = String(getValue() ?? "");
        const s   = getOrderStatusStyle(v);
        return (
          <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.bg, s.text)}>{v}</span>
        );
      },
    },
    {
      id: "adminNote", accessorKey: "adminNote", header: "Admin Note",
      cell: ({ getValue }: CellContext<OrderItem, unknown>) => (
        <span className="text-xs text-gray-500 dark:text-dark-300">{String(getValue() ?? "") || "—"}</span>
      ),
    },
  ], []);

  const table = useReactTable({
    data:            order?.items ?? [],
    columns,
    getRowId:        row => String(row.id),
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Loading / not-found ───────────────────────────────────────────────────
  if (loading) return (
    <Page title="Order Detail">
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </Page>
  );
  if (!order) return (
    <Page title="Order Detail">
      <div className="px-(--margin-x) pt-10 text-center text-sm text-gray-400">Order not found.</div>
    </Page>
  );

  const statusStyle = getOrderStatusStyle(order.status);

  return (
    <Page title={`Order ${order.orderId}`}>
      <div className="transition-content w-full pb-8 space-y-5">

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center gap-3 pt-4 pb-1">
          <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
            onClick={() => navigate("/order-management/order-items")}>
            <ArrowLeftIcon className="size-4" /> Back to Orders
          </Button>
          <div className="h-5 w-px bg-gray-300 dark:bg-dark-500" />
          <span className="text-lg font-bold text-gray-800 dark:text-dark-50">{order.orderId}</span>
          <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", statusStyle.bg, statusStyle.text)}>
            {order.status}
          </span>
          {order.statusNote && (
            <span className="text-sm text-gray-500 dark:text-dark-300">{order.statusNote}</span>
          )}
          <div className="ml-auto">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={fetchDetail} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        {/* ── Gradient summary cards ────────────────────────────────── */}
        <div className="px-(--margin-x) grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Order Date",     value: formatDateDDMMYYYY(order.orderDate), bg: "from-primary-500 to-primary-700",  Icon: CalendarDaysIcon },
            { label: "Total Items",    value: String(order.totalItems),             bg: "from-sky-500 to-sky-700",          Icon: ClipboardDocumentListIcon },
            { label: "Requested Qty",  value: String(order.requestedQty),          bg: "from-amber-500 to-amber-600",      Icon: CubeIcon },
            {
              label: "Approved Qty",
              value: order.approvedQty != null ? String(order.approvedQty) : "Pending",
              bg: order.approvedQty != null ? "from-emerald-500 to-emerald-700" : "from-rose-500 to-rose-700",
              Icon: TruckIcon,
            },
          ].map(({ label, value, bg, Icon }) => (
            <div key={label} className={clsx("relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-md", bg)}>
              <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
              <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                <Icon className="size-4 text-white" />
              </div>
              <p className="text-sm font-bold">{value}</p>
              <p className="mt-0.5 text-xs font-medium text-white/70">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Transfer summary bar ──────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-dark-500 dark:bg-dark-750">
            <div className="flex items-center gap-8">
              {[
                { label: "Transferred", val: order.transferred, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Pending",     val: order.pending,     color: "text-amber-600 dark:text-amber-400" },
                { label: "Removed",     val: order.removed,     color: "text-error-600 dark:text-error-400" },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <p className="text-xs font-medium text-gray-500 dark:text-dark-300">{label}</p>
                  <p className={clsx("text-2xl font-bold tabular-nums", color)}>{val}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-dark-600 dark:bg-dark-700">
                <DocumentTextIcon className="size-4 text-gray-400" />
                Transfer No: <span className="ml-1 font-semibold text-gray-800 dark:text-dark-100">{order.transferNo ?? "—"}</span>
              </div>
              {order.statusNote && (
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  {order.statusNote}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Items section header ──────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-200">Order Items</h3>
        </div>

        {/* ── MasterTable ───────────────────────────────────────────── */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage="No items in this order."
        />

      </div>
    </Page>
  );
}
