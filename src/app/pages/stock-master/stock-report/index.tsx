import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDownTrayIcon, ArrowPathIcon, EyeIcon,
  FunnelIcon, MagnifyingGlassIcon,
  CubeIcon, CheckCircleIcon, XCircleIcon, CurrencyRupeeIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input } from "@/components/ui";
import { Get, toasterrormsg } from "@/ApiHelper";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import { StockItem, mapApiStockItem } from "./data";

export default function StockReportPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/stock-report/", { page: 1, page_size: 10000 }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results
        : Array.isArray(body) ? body : [];
      setItems(rows.map(mapApiStockItem));
    } catch {
      toasterrormsg("Failed to fetch stock report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const categories = useMemo(() =>
    ["all", ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))],
    [items]);

  const filteredItems = useMemo(() => {
    let d = items;
    if (filterCategory !== "all") d = d.filter(i => i.category === filterCategory);
    if (filterStock === "in_stock") d = d.filter(i => i.stock > 0);
    if (filterStock === "out_of_stock") d = d.filter(i => i.stock === 0);
    return d;
  }, [items, filterCategory, filterStock]);

  // Summary stats
  const totalVariants = items.length;
  const inStock = items.filter(i => i.stock > 0).length;
  const outOfStock = items.filter(i => i.stock === 0).length;
  const totalStockValue = items.reduce((s, i) => s + i.stock * i.purchasePrice, 0);

  const handleExport = () => {
    const headers = ["#","Item","HSN","Size","Color","Unit","Brand","Category","Sub Cat","Sub Sub Cat","P.Price","S.Price","Stock"];
    const rows = filteredItems.map((r, i) => [
      i+1, r.itemName, r.hsn, r.size||"—", r.color||"—", r.unit,
      r.brand, r.category, r.subCategory||"—", r.subSubCategory||"—",
      r.purchasePrice, r.salesPrice, r.stock,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "stock_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnDef<StockItem>[]>(() => [
    {
      id: "srNo", header: "#", size: 55, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<StockItem, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "itemName", accessorKey: "itemName", header: "Item Name",
      cell: ({ getValue, table }: CellContext<StockItem, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        return (
          <span className="font-semibold text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{String(getValue() ?? "")}</Highlight>
          </span>
        );
      },
    },
    {
      id: "size", accessorKey: "size", header: "SIZE",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => {
        const v = String(getValue() ?? "");
        return v ? <Badge color="info" variant="soft">{v}</Badge> : <span className="text-gray-400">—</span>;
      },
    },
    {
      id: "color", accessorKey: "color", header: "COLOR",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => {
        const v = String(getValue() ?? "");
        return v ? <Badge color="secondary" variant="soft">{v}</Badge> : <span className="text-gray-400">—</span>;
      },
    },
    {
      id: "hsn", accessorKey: "hsn", header: "HSN",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => (
        <span className=" text-xs text-gray-500 dark:text-dark-300">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "unit", accessorKey: "unit", header: "Unit",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "brand", accessorKey: "brand", header: "Brand",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => (
        <span className="text-gray-600 dark:text-dark-200">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      id: "category", accessorKey: "category", header: "Category",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => (
        <Badge color="primary" variant="soft">{String(getValue() ?? "—")}</Badge>
      ),
    },
    {
      id: "subCategory", accessorKey: "subCategory", header: "Sub Cat.",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{String(getValue() ?? "—") || "—"}</span>
      ),
    },
    {
      id: "subSubCategory", accessorKey: "subSubCategory", header: "Sub Sub Cat.",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => (
        <span className="text-gray-500 dark:text-dark-300">{String(getValue() ?? "—") || "—"}</span>
      ),
    },
    {
      id: "purchasePrice", accessorKey: "purchasePrice", header: "P.Price",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => (
        <span className="tabular-nums font-medium text-gray-700 dark:text-dark-200">₹{Number(getValue() ?? 0)}</span>
      ),
    },
    {
      id: "salesPrice", accessorKey: "salesPrice", header: "S.Price",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => (
        <span className="tabular-nums font-medium text-primary-600 dark:text-primary-400">₹{Number(getValue() ?? 0)}</span>
      ),
    },
    {
      id: "stock", accessorKey: "stock", header: "Stock",
      cell: ({ getValue }: CellContext<StockItem, unknown>) => {
        const v = Number(getValue() ?? 0);
        return (
          <span className={clsx(
            "rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
            v > 0
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
          )}>
            {v}
          </span>
        );
      },
    },
    {
      id: "actions", header: "Action", size: 60, enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<StockItem, unknown>) => (
        <div className="flex justify-center">
          <Button isIcon variant="flat" className="size-8 rounded-full"
            onClick={() => navigate(`/stock/stock-report/${row.original.variantId}`)}
            title="View History">
            <EyeIcon className="size-4" />
          </Button>
        </div>
      ),
    },
  ], [navigate]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    getRowId: (row) => String(row.variantId),
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
    <Page title="Stock Report">
      <div className="transition-content w-full pb-8">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">Stock Report</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Total: <span className="font-semibold text-gray-700 dark:text-dark-100">{totalVariants}</span> variants
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
              onClick={fetchItems} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="px-(--margin-x) mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Variants", value: totalVariants,  bg: "bg-gradient-to-br from-primary-500 to-primary-700",   Icon: CubeIcon },
            { label: "In Stock",       value: inStock,        bg: "bg-gradient-to-br from-emerald-500 to-emerald-700",   Icon: CheckCircleIcon },
            { label: "Out of Stock",   value: outOfStock,     bg: "bg-gradient-to-br from-red-500 to-red-700",           Icon: XCircleIcon },
            { label: "Stock Value",    value: `₹${totalStockValue.toLocaleString()}`, bg: "bg-gradient-to-br from-amber-500 to-amber-600", Icon: CurrencyRupeeIcon },
          ].map(({ label, value, bg, Icon }) => (
            <div key={label} className={clsx("relative overflow-hidden rounded-xl p-4 text-white shadow-md", bg)}>
              <div className="pointer-events-none absolute -right-2 -top-2 size-14 rounded-full bg-white/10" />
              <div className="mb-2 grid size-8 place-items-center rounded-lg bg-white/20">
                <Icon className="size-4 text-white" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="mt-0.5 text-xs font-medium text-white/80">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="px-(--margin-x) mt-4 max-w-sm">
          <Input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "h-9 text-sm focus:ring-3 ring-primary-500/50" }}
            placeholder="Search item, HSN, brand, category..."
          />
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="px-(--margin-x) mt-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600 space-y-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button key={c} onClick={() => setFilterCategory(c)}
                      className={clsx("rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
                        filterCategory === c
                          ? "bg-primary text-white"
                          : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200")}>
                      {c === "all" ? "All Categories" : c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">Stock Status</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "in_stock", label: "In Stock" },
                    { key: "out_of_stock", label: "Out of Stock" },
                  ].map(o => (
                    <button key={o.key} onClick={() => setFilterStock(o.key)}
                      className={clsx("rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        filterStock === o.key
                          ? "bg-primary text-white"
                          : "border border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200")}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Showing count */}
        <div className="px-(--margin-x) mt-3">
          <p className="text-sm text-gray-500 dark:text-dark-300">
            Showing{" "}
            <span className="font-semibold text-gray-800 dark:text-dark-100">
              {table.getRowModel().rows.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-800 dark:text-dark-100">
              {filteredItems.length}
            </span>{" "}
            items
          </p>
        </div>

        {/* Table */}
        <MasterTable
          table={table}
          columnCount={columns.length}
          emptyMessage={loading ? "Loading stock report..." : "No items found."}
        />
      </div>
    </Page>
  );
}
