import {
  ArrowPathIcon, EyeIcon, XMarkIcon, BuildingOfficeIcon,
  ArrowLeftIcon, ClipboardIcon, MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { safeGet, toasterrormsg, formatDateDDMMYYYY } from "@/ApiHelper";

interface ReturnListItem {
  id: number;
  return_no: string;
  branch_name: string;
  to_branch_name: string;
  return_date: string;
  status: string;
  item_count: number;
  total_quantity: number;
  note: string;
  created_at: string;
  source_transfer_no: string;
}

type Stage = "pending" | "packaging_ready" | "approved" | "received" | "rejected" | "cancelled";
type BadgeColor = "primary" | "info" | "success" | "warning" | "error" | "neutral";

const STAGE_CONFIG: Record<Stage, { label: string; color: BadgeColor }> = {
  pending: { label: "Pending", color: "warning" },
  packaging_ready: { label: "Packaging Ready", color: "primary" },
  approved: { label: "Approved", color: "success" },
  received: { label: "Received", color: "success" },
  rejected: { label: "Rejected", color: "error" },
  cancelled: { label: "Cancelled", color: "neutral" },
};

const STAGE_COLUMNS: { key: Stage; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "packaging_ready", label: "Packaging Ready" },
  { key: "approved", label: "Approved" },
  { key: "received", label: "Received" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

function StageBadge({ stage }: { stage: Stage }) {
  const c = STAGE_CONFIG[stage];
  return <Badge color={c.color} variant="soft" className="text-xs font-semibold">{c.label}</Badge>;
}

export default function StockReturnManagementPage() {
  const navigate = useNavigate();

  const [returns, setReturns] = useState<ReturnListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"branches" | "list">("branches");
  const [branchFilter, setBranchFilter] = useState<{ branch_name: string; status: Stage | "" } | null>(null);
  const [search, setSearch] = useState("");
  const [listPage, setListPage] = useState(1);

  const PAGE_SIZE = 15;

  const loadAllReturns = useCallback(async () => {
    setLoading(true);
    try {
      let page = 1;
      let all: ReturnListItem[] = [];
      while (true) {
        const res = await safeGet("pos/admin/stock-returns/", { page, page_size: 1000 }) as any;
        const results = res?.data?.results ?? res?.data ?? res;
        const arr: ReturnListItem[] = results.data || results || [];
        all = all.concat(arr);
        const hasNext = res?.data?.next;
        if (!hasNext || arr.length === 0) break;
        page++;
        if (page > 200) break;
      }
      setReturns(all);
    } catch (e: any) {
      setReturns([]);
      const status = e?.response?.status ?? 0;
      if (status >= 500) toasterrormsg("Could not load returns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllReturns(); }, [loadAllReturns]);

  const branchSummary = useMemo(() => {
    const map = new Map<string, any>();
    returns.forEach(r => {
      if (!map.has(r.branch_name)) {
        const row: any = { branch_name: r.branch_name, total: 0 };
        STAGE_COLUMNS.forEach(sc => (row[sc.key] = 0));
        map.set(r.branch_name, row);
      }
      const row = map.get(r.branch_name)!;
      row.total++;
      if (r.status in row) row[r.status] += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.branch_name.localeCompare(b.branch_name));
  }, [returns]);

  const filteredReturns = useMemo(() => {
    if (!branchFilter) return [];
    const q = search.trim().toLowerCase();
    return returns.filter(r =>
      r.branch_name === branchFilter.branch_name &&
      (branchFilter.status === "" || r.status === branchFilter.status) &&
      (q === "" || r.return_no.toLowerCase().includes(q) || r.branch_name.toLowerCase().includes(q))
    );
  }, [returns, branchFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / PAGE_SIZE));
  const pagedReturns = filteredReturns.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);

  const openBranchStatus = (branch_name: string, status: Stage | "") => {
    setBranchFilter({ branch_name, status });
    setSearch("");
    setListPage(1);
    setView("list");
  };

  const stageColKeys = STAGE_COLUMNS.map(s => s.key);

  if (view === "branches") {
    return (
      <Page title="Stock Return Management">
        <div className="transition-content w-full pb-8 space-y-4">
          <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <BuildingOfficeIcon className="size-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-dark-100">Stock Return Management</h1>
                <p className="text-xs text-gray-500 dark:text-dark-400">Track & manage returns from all branches</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="primary" variant="soft" className="text-sm font-semibold">
                {returns.length} Total Returns
              </Badge>
              <Button variant="outlined" className="gap-2" onClick={loadAllReturns}>
                <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>

          <div className="px-(--margin-x)">
            <Card skin="bordered" className="overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="text-primary size-4" />
                  <span className="font-semibold text-gray-700 dark:text-dark-200 text-sm">Returns From Branches</span>
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

  return (
    <Page title="Stock Return Management">
      <div className="transition-content w-full pb-8 space-y-4">
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
              {filteredReturns.length} Returns
            </Badge>
            <Button variant="outlined" className="gap-2" onClick={loadAllReturns}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

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
                  placeholder="Search return no..."
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

        <div className="px-(--margin-x)">
          <Card skin="bordered" className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-800 flex items-center gap-2">
              <ClipboardIcon className="text-primary size-4" />
              <span className="font-semibold text-gray-700 dark:text-dark-200 text-sm">Return Requests</span>
              <Badge color="primary" variant="soft" className="text-xs font-bold">{filteredReturns.length}</Badge>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                <p className="text-gray-400 dark:text-dark-400 text-sm">Loading...</p>
              </div>
            ) : pagedReturns.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-dark-400">
                <ClipboardIcon className="mx-auto mb-2 size-8 opacity-30" />
                <p className="text-sm">No returns found</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper min-w-full overflow-x-auto">
                  <Table hoverable className="w-full text-left">
                    <THead>
                      <Tr>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Return No</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Branch</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">To Branch</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Date</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Items</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Qty</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Stage</Th>
                        <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Action</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {pagedReturns.map((r) => (
                        <Tr key={r.id} className="dark:border-b-dark-500 border-b border-gray-100">
                          <Td className="bg-white dark:bg-dark-900">
                            <span className="font-bold text-primary-600 dark:text-primary-400">{r.return_no}</span>
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 font-medium text-gray-700 dark:text-dark-200">{r.branch_name}</Td>
                          <Td className="bg-white dark:bg-dark-900 text-gray-600 dark:text-dark-300">{r.to_branch_name || "—"}</Td>
                          <Td className="bg-white dark:bg-dark-900 text-gray-500 dark:text-dark-300 text-xs">{formatDateDDMMYYYY(r.return_date)}</Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <Badge color="neutral" variant="soft" className="text-xs font-semibold">{r.item_count}</Badge>
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <Badge color="primary" variant="soft" className="text-xs font-semibold">{r.total_quantity}</Badge>
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <StageBadge stage={r.status as Stage} />
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 text-center">
                            <Button
                              color="primary"
                              variant="soft"
                              className="h-7 px-3 text-xs font-semibold"
                              onClick={() => navigate(`/order-management/stock-return/${r.id}`)}
                            >
                              <EyeIcon className="inline mr-1 size-3" /> View
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-gray-200 dark:border-dark-600 flex items-center justify-between bg-gray-50/50 dark:bg-dark-800/50">
                    <span className="text-xs text-gray-500 dark:text-dark-400">
                      Showing {(listPage - 1) * PAGE_SIZE + 1}–{Math.min(listPage * PAGE_SIZE, filteredReturns.length)} of {filteredReturns.length} returns
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
