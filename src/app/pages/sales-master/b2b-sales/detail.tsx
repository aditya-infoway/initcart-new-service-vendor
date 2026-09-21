import {
  ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon,
  CubeIcon, BuildingOfficeIcon, CalendarDaysIcon,
  DocumentCheckIcon, XMarkIcon, InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface B2BSaleItem {
  id: number;
  from_item_name: string;
  from_variant_info: string;
  from_barcode: string;
  quantity: number;
  rate: number;
  is_stock_updated: boolean;
  tax_percent?: string;
  basic_amount?: number;
  tax_amount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  net_amount?: number;
}

interface B2BSale {
  id: number;
  sale_no: string;
  from_branch_name: string;
  to_branch_name: string;
  sale_date: string;
  status: "pending" | "completed" | "cancelled";
  item_count: number;
  created_at: string;
  items?: B2BSaleItem[];
  note?: string;
  created_by_name?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "warning",
  completed: "success",
  cancelled: "error",
};

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

// ── Main Detail Page Component ─────────────────────────────────────────────
export default function B2BSaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<B2BSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await Get(`pos/b2b-sales/${id}/`) as any;
      const body = res?.data ?? res;
      if (body?.success) {
        setSale(body.data);
      }
    } catch { toasterrormsg("Could not load sale detail"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  // ── Cancel Sale ──
  const handleCancelSale = async () => {
    if (!sale) return;
    if (!confirm("Do you want to cancel this B2B Sale? Unverified items stock will be recovered.")) return;

    setProcessing(true);
    try {
      const res = await Post(`pos/b2b-sales/${sale.id}/cancel/`, {}) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message || "Sale cancelled successfully");
        navigate("/sales/b2b-sales");
      } else {
        toasterrormsg(res?.data?.message || "Failed to cancel sale");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Error cancelling sale");
    }
    setProcessing(false);
  };

  // ── Derived State ─────────────────────────────────────────────────────────
  const canCancel = sale?.status === "pending";
  const totalItems = sale?.items?.length || 0;
  const verifiedItems = sale?.items?.filter(i => i.is_stock_updated).length || 0;

  const gstTotals: GstTotals = useMemo(() => {
    const items = sale?.items || [];
    return items.reduce(
      (acc, i) => ({
        basic: acc.basic + (Number(i.basic_amount) || 0),
        tax: acc.tax + (Number(i.tax_amount) || 0),
        cgst: acc.cgst + (Number(i.cgst) || 0),
        sgst: acc.sgst + (Number(i.sgst) || 0),
        igst: acc.igst + (Number(i.igst) || 0),
        net: acc.net + (Number(i.net_amount) || 0),
      }),
      { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 }
    );
  }, [sale?.items]);
  const hasGst = gstTotals.basic > 0 || gstTotals.tax > 0;

  if (loading && !sale) {
    return (
      <Page title="B2B Sale Detail">
        <div className="transition-content w-full pb-8">
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </Page>
    );
  }

  if (!sale) {
    return (
      <Page title="B2B Sale Detail">
        <div className="transition-content w-full pb-8">
          <div className="text-center py-16 text-gray-400 dark:text-dark-400">
            Sale not found
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title="B2B Sale Detail">
      <div className="transition-content w-full pb-8 space-y-4">
        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={() => navigate("/sales/b2b-sales")}>
              <ArrowLeftIcon className="size-4" /> Back to Sales
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">{sale.sale_no}</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">B2B Sale Detail</p>
            </div>
          </div>
          <Badge color={STATUS_COLOR[sale.status] as any} variant="soft" className="text-xs font-semibold">
            {STATUS_LABEL[sale.status]}
          </Badge>
        </div>

        {/* Sale Header */}
        <div className="px-(--margin-x)">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-gray-50 rounded-xl p-3 dark:bg-dark-800">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">From Branch</div>
                <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{sale.from_branch_name}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 dark:bg-dark-800">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">To Branch</div>
                <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{sale.to_branch_name}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 dark:bg-dark-800">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sale Date</div>
                <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{formatDateDDMMYYYY(sale.sale_date)}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 dark:bg-dark-800">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Created By</div>
                <div className="font-semibold text-sm text-gray-800 dark:text-dark-100">{sale.created_by_name || "—"}</div>
              </div>
            </div>

            {sale.note && (
              <div className="mt-3 p-2.5 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-xs text-primary-700 dark:text-primary-300">📝 {sale.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-(--margin-x)">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-800 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge color="neutral" variant="soft" className="text-xs font-semibold flex items-center gap-1.5">
                <CubeIcon className="size-3" /> Total Items: {totalItems}
              </Badge>
              <Badge color="success" variant="soft" className="text-xs font-semibold flex items-center gap-1.5">
                <CheckCircleIcon className="size-3" /> Verified: {verifiedItems}
              </Badge>
              <Badge color="warning" variant="soft" className="text-xs font-semibold flex items-center gap-1.5">
                <InformationCircleIcon className="size-3" /> Pending: {totalItems - verifiedItems}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canCancel && (
          <div className="px-(--margin-x)">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-800 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-dark-200">Actions:</span>
                <Button
                  color="error"
                  className="gap-1.5"
                  disabled={processing}
                  onClick={handleCancelSale}
                >
                  {processing ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Cancelling...</>
                  ) : (
                    <><XMarkIcon className="size-4" />Cancel Sale</>
                  )}
                </Button>
              </div>
              <span className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1.5">
                <ExclamationTriangleIcon className="text-amber-500 size-4" /> Unverified items stock will be recovered
              </span>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="px-(--margin-x)">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750 overflow-hidden">
            <div className="overflow-x-auto">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">#</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Item Name</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Variant</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Barcode</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Qty</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Rate ₹</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Status</Th>
                  </Tr>
                </THead>
                <TBody>
                  {sale.items && sale.items.length > 0 ? (
                    sale.items.map((item, idx) => (
                      <Tr key={item.id} className="dark:border-b-dark-500 border-b border-gray-100">
                        <Td className="bg-white dark:bg-dark-900 text-gray-400 dark:text-dark-400 text-xs">{idx + 1}</Td>
                        <Td className="bg-white dark:bg-dark-900 font-semibold text-gray-800 dark:text-dark-100">{item.from_item_name}</Td>
                        <Td className="bg-white dark:bg-dark-900">
                          <Badge color="info" variant="soft" className="text-xs">{item.from_variant_info || "Default"}</Badge>
                        </Td>
                        <Td className="bg-white dark:bg-dark-900 font-mono text-xs text-gray-500 dark:text-dark-300">{item.from_barcode || "—"}</Td>
                        <Td className="bg-white dark:bg-dark-900">
                          <Badge color="primary" variant="soft" className="text-xs font-semibold">{item.quantity}</Badge>
                        </Td>
                        <Td className="bg-white dark:bg-dark-900 font-mono text-xs text-gray-700 dark:text-dark-200">₹{Number(item.rate).toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-dark-900">
                          {item.is_stock_updated ? (
                            <Badge color="success" variant="soft" className="text-xs font-semibold flex items-center gap-1">
                              <CheckCircleIcon className="size-3" /> Verified
                            </Badge>
                          ) : (
                            <Badge color="warning" variant="soft" className="text-xs font-semibold flex items-center gap-1">
                              <InformationCircleIcon className="size-3" /> Pending
                            </Badge>
                          )}
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={7} className="text-center py-10 text-sm text-gray-400 dark:text-dark-400">No items found</Td>
                    </Tr>
                  )}
                </TBody>
              </Table>
            </div>
          </div>
        </div>

        {/* GST Summary */}
        {hasGst && (
          <div className="px-(--margin-x)">
            <GstSummaryCard totals={gstTotals} />
          </div>
        )}

        {/* Footer Status Messages */}
        {sale.status === "completed" && (
          <div className="px-(--margin-x)">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center gap-2 text-sm">
              <CheckCircleIcon className="size-4" /> Sale completed successfully.
            </div>
          </div>
        )}
        {sale.status === "cancelled" && (
          <div className="px-(--margin-x)">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-600 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2 text-sm">
              <XMarkIcon className="size-4" /> Sale has been cancelled.
            </div>
          </div>
        )}
        {sale.status === "pending" && (
          <div className="px-(--margin-x)">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-400 flex items-center gap-2 text-sm">
              <InformationCircleIcon className="size-4" /> Sale is pending verification.
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
