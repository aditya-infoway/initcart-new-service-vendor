import {
  ArrowPathIcon, EyeIcon, XMarkIcon, BuildingOfficeIcon,
  ArrowLeftIcon, ClipboardIcon, MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Get, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface OrderListItem {
  id: number;
  order_id: string;
  requesting_branch_name: string;
  source_branch_name: string;
  status: "pending" | "sent" | "no_stock" | "cancelled";
  order_date: string;
  item_count: number;
  total_requested_qty: number;
  note: string;
  created_at: string;
}

interface TransferListItem {
  id: number;
  transfer_no: string;
  from_branch_name: string;
  to_branch_name: string;
  transfer_date: string;
  status: "pending" | "confirmed" | "packaging_start" | "packaging_ready" | "partially_received" | "received" | "cancelled";
  item_count: number;
  total_quantity: number;
  source_order_no: string | null;
  note: string;
  created_at: string;
}

type Stage =
  | "pending" | "no_stock" | "cancelled"
  | "awaiting_confirm" | "ready_to_package" | "packaging_in_progress" | "awaiting_receive"
  | "received" | "transfer_cancelled";

type BadgeColor = "primary" | "info" | "success" | "warning" | "error" | "neutral";

const STAGE_CONFIG: Record<Stage, { label: string; color: BadgeColor }> = {
  pending: { label: "Pending Verify", color: "warning" },
  no_stock: { label: "No Stock", color: "neutral" },
  cancelled: { label: "Order Cancelled", color: "error" },
  awaiting_confirm: { label: "Awaiting Confirm", color: "info" },
  ready_to_package: { label: "Ready to Package", color: "primary" },
  packaging_in_progress: { label: "Packaging Started", color: "info" },
  awaiting_receive: { label: "Awaiting Receive", color: "info" },
  received: { label: "Received", color: "success" },
  transfer_cancelled: { label: "Transfer Cancelled", color: "error" },
};

const STAGE_COLUMNS: { key: Stage; label: string }[] = [
  { key: "pending", label: "Pending Verify" },
  { key: "awaiting_confirm", label: "Awaiting Confirm" },
  { key: "ready_to_package", label: "Ready to Package" },
  { key: "packaging_in_progress", label: "Packaging Started" },
  { key: "awaiting_receive", label: "Awaiting Receive" },
  { key: "received", label: "Received" },
  { key: "no_stock", label: "No Stock" },
  { key: "cancelled", label: "Cancelled" },
];

// ── Helper functions ─────────────────────────────────────────────────────
function stageOf(order: OrderListItem, transferByOrderNo: Map<string, TransferListItem>): Stage {
  if (order.status === "pending") return "pending";
  if (order.status === "no_stock") return "no_stock";
  if (order.status === "cancelled") return "cancelled";
  const t = transferByOrderNo.get(order.order_id);
  if (!t) return "awaiting_confirm";
  switch (t.status) {
    case "pending": return "awaiting_confirm";
    case "confirmed": return "ready_to_package";
    case "packaging_start": return "packaging_in_progress";
    case "packaging_ready": return "awaiting_receive";
    case "partially_received": return "awaiting_receive";
    case "received": return "received";
    case "cancelled": return "transfer_cancelled";
    default: return "awaiting_confirm";
  }
}

function StageBadge({ stage }: { stage: Stage }) {
  const c = STAGE_CONFIG[stage];
  return <Badge color={c.color} variant="soft" className="text-xs font-semibold">{c.label}</Badge>;
}

// ── Main list page ─────────────────────────────────────────────────────────
export default function ReceivedOrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [transfers, setTransfers] = useState<TransferListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"branches" | "list">("branches");
  const [branchFilter, setBranchFilter] = useState<{ branch_name: string; status: Stage | "" } | null>(null);
  const [search, setSearch] = useState("");
  const [listPage, setListPage] = useState(1);

  const PAGE_SIZE = 15;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, tRes] = await Promise.all([
        Get("pos/b2b-orders/incoming/", { page: 1, page_size: 1000 }) as any,
        Get("pos/b2b-transfers/outgoing/", { page: 1, page_size: 1000 }) as any,
      ]);
      
      const orders: OrderListItem[] = oRes?.data?.results?.orders || oRes?.data?.orders || [];
      const transfers: TransferListItem[] = tRes?.data?.results?.data || tRes?.data?.data || [];
      
      setOrders(orders);
      setTransfers(transfers);
    } catch { toasterrormsg("Could not load B2B requests"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const transferByOrderNo = useMemo(() => {
    const m = new Map<string, TransferListItem>();
    transfers.forEach(t => { if (t.source_order_no) m.set(t.source_order_no, t); });
    return m;
  }, [transfers]);

  const rowsWithStage = useMemo(() => 
    orders.map(o => ({ order: o, stage: stageOf(o, transferByOrderNo) })), 
    [orders, transferByOrderNo]
  );

  const branchSummary = useMemo(() => {
    const map = new Map<string, any>();
    rowsWithStage.forEach(({ order, stage }) => {
      if (!map.has(order.requesting_branch_name)) {
        const row: any = { branch_name: order.requesting_branch_name, total: 0 };
        STAGE_COLUMNS.forEach(sc => (row[sc.key] = 0));
        map.set(order.requesting_branch_name, row);
      }
      const row = map.get(order.requesting_branch_name)!;
      row.total++;
      row[stage] = (row[stage] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => a.branch_name.localeCompare(b.branch_name));
  }, [rowsWithStage]);

  const filteredRows = useMemo(() => {
    if (!branchFilter) return [];
    const q = search.trim().toLowerCase();
    return rowsWithStage.filter(({ order, stage }) =>
      order.requesting_branch_name === branchFilter.branch_name &&
      (branchFilter.status === "" || stage === branchFilter.status) &&
      (q === "" || order.order_id.toLowerCase().includes(q))
    );
  }, [rowsWithStage, branchFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);

  const openBranchStatus = (branch_name: string, status: Stage | "") => {
    setBranchFilter({ branch_name, status });
    setSearch("");
    setListPage(1);
    setView("list");
  };

  const stageColKeys = STAGE_COLUMNS.map(s => s.key);

  // ── Branch summary view ─────────────────────────────────────────────────
  if (view === "branches") {
    return (
      <Page title="B2B Stock Transfer">
        <div className="transition-content w-full pb-8 space-y-4">
          {/* Header */}
          <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <BuildingOfficeIcon className="size-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-dark-100">B2B Stock Transfer</h1>
                <p className="text-xs text-gray-500 dark:text-dark-400">Verify, package & track requests from other branches</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="primary" variant="soft" className="text-sm font-semibold">
                {orders.length} Total Requests
              </Badge>
              <Button variant="outlined" className="gap-2" onClick={loadAll}>
                <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>

          {/* Branch summary table */}
          <div className="px-(--margin-x)">
            <Card skin="bordered" className="overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="text-primary size-4" />
                  <span className="font-semibold text-gray-700 dark:text-dark-200 text-sm">Requests From Branches</span>
                </div>
                <Badge color="primary" variant="soft" className="text-xs font-bold">{branchSummary.length} branches</Badge>
              </div>

              {loading ? (
                <div className="py-16 text-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                  <p className="text-gray-400 dark:text-dark-400 text-sm">Loading branches...</p>
                </div>
              ) : branchSummary.length === 0 ? (
                <div className="py-16 text-center text-gray-400 dark:text-dark-400">
                  <BuildingOfficeIcon className="mx-auto mb-2 size-8 opacity-30" />
                  <p className="text-sm">No branch data found</p>
                </div>
              ) : (
                <div className="table-wrapper min-w-full overflow-x-auto">
                  <Table hoverable className="w-full text-left">
                    <THead>
                      <Tr>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Branch</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">All</Th>
                        {STAGE_COLUMNS.map(sc => (
                          <Th key={sc.key} className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">
                            {sc.label}
                          </Th>
                        ))}
                      </Tr>
                    </THead>
                    <TBody>
                      {branchSummary.map((row) => (
                        <Tr key={row.branch_name} className="dark:border-b-dark-500 border-b border-gray-100">
                          <Td className="bg-white dark:bg-dark-900 font-medium text-gray-700 dark:text-dark-200">{row.branch_name}</Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <Button
                              variant="outlined"
                              className="h-7 px-3 text-xs font-bold min-w-[40px]"
                              onClick={() => openBranchStatus(row.branch_name, "")}
                            >
                              {row.total}
                            </Button>
                          </Td>
                          {stageColKeys.map(sc => (
                            <Td key={sc} className="bg-white dark:bg-dark-900 text-center">
                              <Button
                                variant="flat"
                                className={clsx(
                                  "h-7 px-3 text-xs font-bold min-w-[40px]",
                                  !row[sc] && "opacity-30 cursor-not-allowed"
                                )}
                                onClick={() => row[sc] && openBranchStatus(row.branch_name, sc)}
                                disabled={!row[sc]}
                              >
                                {row[sc] || 0}
                              </Button>
                            </Td>
                          ))}
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </Page>
    );
  }

  // ── Filtered list view ───────────────────────────────────────────────────
  return (
    <Page title="B2B Stock Transfer">
      <div className="transition-content w-full pb-8 space-y-4">
        {/* Header */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={() => { setView("branches"); setBranchFilter(null); }}>
              <ArrowLeftIcon className="size-4" /> Back to Branches
            </Button>
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="text-gray-400 size-4" />
              <span className="text-sm font-bold text-gray-800 dark:text-dark-100">{branchFilter?.branch_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="primary" variant="soft" className="text-sm font-semibold">
              {filteredRows.length} Requests
            </Badge>
            <Button variant="outlined" className="gap-2" onClick={loadAll}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        {/* Stage filters */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-gray-600 dark:text-dark-200">Stage:</span>
              {(["", ...STAGE_COLUMNS.map(s => s.key)] as (Stage | "")[]).map(s => {
                const active = branchFilter?.status === s;
                return (
                  <Button
                    key={s || "all"}
                    color={active ? "primary" : undefined}
                    variant={active ? "filled" : "outlined"}
                    className="h-8 px-3 text-xs font-semibold"
                    onClick={() => { setBranchFilter(f => f ? { ...f, status: s } : f); setListPage(1); }}
                  >
                    {s === "" ? "All" : STAGE_CONFIG[s].label}
                  </Button>
                );
              })}
              <div className="ml-auto max-w-xs min-w-[220px]">
                <Input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setListPage(1); }}
                  placeholder="Search order id..."
                  prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
                  suffix={search ? (
                    <button
                      onClick={() => { setSearch(""); setListPage(1); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="size-4" />
                    </button>
                  ) : undefined}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Orders table */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-800 flex items-center gap-2">
              <ClipboardIcon className="text-primary size-4" />
              <span className="font-semibold text-gray-700 dark:text-dark-200 text-sm">Requests</span>
              <Badge color="primary" variant="soft" className="text-xs font-bold">{filteredRows.length}</Badge>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                <p className="text-gray-400 dark:text-dark-400 text-sm">Loading...</p>
              </div>
            ) : pagedRows.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-dark-400">
                <ClipboardIcon className="mx-auto mb-2 size-8 opacity-30" />
                <p className="text-sm">No requests found</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper min-w-full overflow-x-auto">
                  <Table hoverable className="w-full text-left">
                    <THead>
                      <Tr>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Order ID</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Requesting Branch</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Date</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Items</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Qty</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Stage</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Action</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {pagedRows.map(({ order, stage }) => (
                        <Tr key={order.id} className="dark:border-b-dark-500 border-b border-gray-100">
                          <Td className="bg-white dark:bg-dark-900">
                            <span className="font-bold text-primary-600 dark:text-primary-400">{order.order_id}</span>
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 font-medium text-gray-700 dark:text-dark-200">{order.requesting_branch_name}</Td>
                          <Td className="bg-white dark:bg-dark-900 text-gray-500 dark:text-dark-300 text-xs">{formatDateDDMMYYYY(order.order_date)}</Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <Badge color="neutral" variant="soft" className="text-xs font-semibold">{order.item_count}</Badge>
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <Badge color="primary" variant="soft" className="text-xs font-semibold">{order.total_requested_qty}</Badge>
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <StageBadge stage={stage} />
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <Button
                              color="primary"
                              variant="soft"
                              className="h-7 px-3 text-xs font-semibold"
                              onClick={() => navigate(`/b2b-inventory/stock-transfer/received-orders/detail/${order.id}`)}
                            >
                              <EyeIcon className="inline mr-1 size-3" /> View
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-gray-200 dark:border-dark-600 flex items-center justify-between bg-gray-50/50 dark:bg-dark-800/50">
                    <span className="text-xs text-gray-500 dark:text-dark-400">
                      Showing {(listPage - 1) * PAGE_SIZE + 1}–{Math.min(listPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} requests
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outlined"
                        className="h-7 px-3 text-xs"
                        disabled={listPage <= 1}
                        onClick={() => setListPage(p => p - 1)}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outlined"
                        className="h-7 px-3 text-xs"
                        disabled={listPage >= totalPages}
                        onClick={() => setListPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}


