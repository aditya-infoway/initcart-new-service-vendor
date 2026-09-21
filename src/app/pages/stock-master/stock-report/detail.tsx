import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import {
  getCoreRowModel, getPaginationRowModel, getSortedRowModel,
  SortingState, useReactTable, ColumnDef, CellContext,
  useReactTable as _,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card } from "@/components/ui";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { StockItem, StockHistoryEntry, mapApiStockItem, mapApiStockHistory } from "./data";

function InfoCard({ icon: Icon, label, value, colorClass, bgClass }: {
  icon: React.ComponentType<any>;
  label: string;
  value: React.ReactNode;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bgClass)}>
      <div className="pointer-events-none absolute -right-2 -top-2 size-12 rounded-full bg-white/10" />
      <div className={clsx("mb-2 grid size-8 place-items-center rounded-lg bg-white/20")}>
        <Icon className="size-4 text-white" />
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
    </div>
  );
}

export default function StockDetailPage() {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<StockItem | null>(null);
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);

  const fetchData = useCallback(async () => {
    if (!variantId) return;
    setLoading(true);
    try {
      // Fetch stock list to find this variant's info
      const listRes = await Get("pos/stock-report/", { page: 1, page_size: 10000 }) as any;
      const listBody = listRes?.data ?? listRes;
      const rows: any[] = Array.isArray(listBody?.results) ? listBody.results : [];
      const found = rows.find((r: any) => String(r.variantId) === String(variantId));
      if (found) setItem(mapApiStockItem(found));

      // Fetch history
      const histRes = await Get(`pos/stock-history/${variantId}/`, { variant_id: variantId }) as any;
      const histBody = histRes?.data ?? histRes;
      const histRows: any[] = Array.isArray(histBody?.results) ? histBody.results
        : Array.isArray(histBody?.history) ? histBody.history
        : Array.isArray(histBody) ? histBody : [];
      setHistory(histRows.map(mapApiStockHistory));
    } catch {
      toasterrormsg("Failed to load stock details.");
    } finally {
      setLoading(false);
    }
  }, [variantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = useMemo<ColumnDef<StockHistoryEntry>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false,
      cell: ({ row }: CellContext<StockHistoryEntry, unknown>) => (
        <span className="text-gray-400">{row.index + 1}</span>
      ),
    },
    {
      id: "date", accessorKey: "date", header: "Date",
      cell: ({ getValue }: CellContext<StockHistoryEntry, unknown>) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-dark-200">
          {formatDateDDMMYYYY(String(getValue() ?? ""))}
        </span>
      ),
    },
    {
      id: "type", accessorKey: "type", header: "Type",
      cell: ({ getValue }: CellContext<StockHistoryEntry, unknown>) => {
        const v = String(getValue() ?? "");
        const isIn = ["purchase","received","in","stock in","opening"].some(t => v.toLowerCase().includes(t));
        return (
          <Badge color={isIn ? "success" : "error"} variant="soft" className="capitalize">
            {v || "—"}
          </Badge>
        );
      },
    },
    {
      id: "qty", accessorKey: "qty", header: "Qty",
      cell: ({ getValue }: CellContext<StockHistoryEntry, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className={clsx("font-bold tabular-nums", v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {v >= 0 ? `+${v}` : v}
          </span>
        );
      },
    },
    {
      id: "balance", accessorKey: "balance", header: "Balance",
      cell: ({ getValue }: CellContext<StockHistoryEntry, unknown>) => (
        <span className="font-semibold tabular-nums text-gray-800 dark:text-dark-100">
          {Number(getValue() ?? 0)}
        </span>
      ),
    },
    {
      id: "reference", accessorKey: "reference", header: "Reference",
      cell: ({ getValue }: CellContext<StockHistoryEntry, unknown>) => (
        <span className=" text-xs text-primary-600 dark:text-primary-400">
          {String(getValue() ?? "—") || "—"}
        </span>
      ),
    },
    {
      id: "note", accessorKey: "note", header: "Note",
      cell: ({ getValue }: CellContext<StockHistoryEntry, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{String(getValue() ?? "—") || "—"}</span>
      ),
    },
  ], []);

  const table = useReactTable({
    data: history,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <Page title="Stock Detail">
      <div className="transition-content w-full px-(--margin-x) py-5 pb-10 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
            onClick={() => navigate("/stock/stock-report")}>
            <ArrowLeftIcon className="size-4" /> Back to Stock
          </Button>
          {item && (
            <>
              <div className="h-5 w-px bg-gray-300 dark:bg-dark-500" />
              <h1 className="text-lg font-bold text-gray-800 dark:text-dark-50">{item.itemName}</h1>
              {item.size && <Badge color="info" variant="soft">{item.size}</Badge>}
              {item.color && <Badge color="secondary" variant="soft">{item.color}</Badge>}
              <Badge color="primary" variant="soft">{item.category}</Badge>
            </>
          )}
          <div className="ml-auto">
            <Button variant="outlined" className="h-9 gap-2 px-3 text-sm"
              onClick={fetchData} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Info cards */}
        {item && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCard icon={CubeIcon} label="Current Stock"
              value={item.stock}
              bgClass={item.stock > 0 ? "bg-gradient-to-br from-emerald-500 to-emerald-700" : "bg-gradient-to-br from-red-500 to-red-700"}
              colorClass="text-white" />
            <InfoCard icon={CurrencyRupeeIcon} label="Purchase Price"
              value={`₹${item.purchasePrice}`}
              bgClass="bg-gradient-to-br from-primary-500 to-primary-700"
              colorClass="text-white" />
            <InfoCard icon={CurrencyRupeeIcon} label="Sales Price"
              value={`₹${item.salesPrice}`}
              bgClass="bg-gradient-to-br from-amber-500 to-amber-600"
              colorClass="text-white" />
            <InfoCard icon={TagIcon} label="Unit"
              value={item.unit}
              bgClass="bg-gradient-to-br from-purple-500 to-purple-700"
              colorClass="text-white" />
          </div>
        )}

        {/* Item details card */}
        {item && (
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-dark-100 border-b border-gray-200 pb-3 dark:border-dark-600">
              Item Details
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              {[
                { label: "HSN Code",     value: item.hsn || "—" },
                { label: "Brand",        value: item.brand || "—" },
                { label: "Category",     value: item.category || "—" },
                { label: "Sub Category", value: item.subCategory || "—" },
                { label: "Sub Sub Cat.", value: item.subSubCategory || "—" },
                { label: "Variant ID",   value: `#${item.variantId}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-400 dark:text-dark-400 uppercase tracking-wide">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-700 dark:text-dark-100">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* History table */}
        <div>
          <div className="px-0 mb-2">
            <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              Stock History
              {history.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-dark-300">
                  ({history.length} transactions)
                </span>
              )}
            </h3>
          </div>
          <MasterTable
            table={table}
            columnCount={columns.length}
            emptyMessage={loading ? "Loading history..." : "No stock history found for this variant."}
          />
        </div>
      </div>
    </Page>
  );
}
