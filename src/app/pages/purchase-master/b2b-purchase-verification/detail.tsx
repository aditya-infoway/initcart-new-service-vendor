import {
  ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon,
  CubeIcon, BuildingOfficeIcon, CalendarDaysIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon, CheckIcon, QrCodeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { StyledSwitch } from "@/components/shared/form/StyledSwitch";
import { Get, Post, toasterrormsg, toastsuccessmsg, formatDateDDMMYYYY } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface B2BPurchaseItem {
  id: number;
  from_item_name: string;
  from_variant_info: string;
  from_barcode: string;
  from_size: string;
  from_color: string;
  quantity: number;
  rate: number;
  is_stock_updated: boolean;
  status: "Verified" | "Pending";
  hsnCode: string;
  taxSlab: string;
  purchase_price: number;
  branch_price: number;
  sales_price: number;
  mrp: number;
  tax_percent?: string;
  basic_amount?: number;
  tax_amount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  net_amount?: number;
}

interface B2BPurchase {
  sale_no: string;
  sale_date: string;
  from_branch: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
  };
  to_branch: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  status: string;
  note: string;
  items: B2BPurchaseItem[];
}

interface GstTotals { basic: number; tax: number; cgst: number; sgst: number; igst: number; net: number; }

// ── GST Summary Card ─────────────────────────────────────────────────────────
const GstSummaryCard = ({ totals, title = "GST Summary" }: { totals: GstTotals; title?: string }) => (
  <Card className="p-6 space-y-5 border-l-4 border-l-primary bg-gradient-to-br from-primary/5 via-white to-white dark:from-primary/10 dark:via-dark-800 dark:to-dark-800 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20">
        <DocumentTextIcon className="size-6" />
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-gray-800 dark:text-dark-50">{title}</h3>
        <p className="text-[12px] text-gray-500 dark:text-dark-300">Tax breakdown</p>
      </div>
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-gray-500 dark:text-dark-300">Total Basic Amount</span>
        <span className="text-[17px] font-extrabold text-gray-800 dark:text-dark-50">₹ {totals.basic.toFixed(2)}</span>
      </div>
      {totals.cgst > 0 || totals.sgst > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-gray-500 dark:text-dark-300">CGST</span>
            <span className="text-[17px] font-extrabold text-gray-800 dark:text-dark-50">₹ {totals.cgst.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-gray-500 dark:text-dark-300">SGST</span>
            <span className="text-[17px] font-extrabold text-gray-800 dark:text-dark-50">₹ {totals.sgst.toFixed(2)}</span>
          </div>
        </>
      ) : totals.igst > 0 ? (
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-gray-500 dark:text-dark-300">IGST</span>
          <span className="text-[17px] font-extrabold text-gray-800 dark:text-dark-50">₹ {totals.igst.toFixed(2)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-dark-600">
        <span className="text-[14px] font-bold text-gray-700 dark:text-dark-200">Total Tax Amount</span>
        <span className="text-[17px] font-extrabold text-primary">₹ {totals.tax.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between pt-2 border-t-2 border-primary/20">
        <span className="text-[14px] font-bold text-gray-700 dark:text-dark-200">Net Total (incl. GST)</span>
        <span className="text-[17px] font-extrabold text-primary">₹ {totals.net.toFixed(2)}</span>
      </div>
    </div>
  </Card>
);

// ── Safe number helper ─────────────────────────────────────────────────────
const safeNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === "number") return val;
  return 0;
};

// ── Main Detail Page Component ─────────────────────────────────────────────
export default function B2BPurchaseVerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState<B2BPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingItem, setVerifyingItem] = useState<number | null>(null);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [websiteDisplay, setWebsiteDisplay] = useState(false);
  const [showCreditorPopup, setShowCreditorPopup] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await Get(`pos/b2b-sales/${id}/items/`) as any;
      const body = res?.data ?? res;
      if (body?.success) {
        setPurchase(body);
      }
    } catch { toasterrormsg("Could not load purchase detail"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  // ── Verify Single Item ──
  const handleVerifyItem = async (itemId: number) => {
    if (!id) return;
    setVerifyingItem(itemId);
    try {
      const res = await Post(`pos/b2b-sales/${id}/verify-item/${itemId}/`, { website_display: websiteDisplay }) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message || "Item verified!");
        await load();
      } else {
        toasterrormsg(res?.data?.message || "Verification failed");
      }
    } catch (e: any) {
      if (e.response?.data?.error_code === "NO_SUNDRY_CREDITOR_ACCOUNT") {
        setShowCreditorPopup(true);
      } else {
        toasterrormsg(e.response?.data?.message || "Error verifying item");
      }
    }
    setVerifyingItem(null);
  };

  // ── Verify All Items ──
  const handleVerifyAll = async () => {
    if (!id || !purchase) return;
    if (!confirm("Verify all items?")) return;
    setVerifyingAll(true);
    try {
      const res = await Post(`pos/b2b-sales/${id}/verify-all/`, { website_display: websiteDisplay }) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message || "All items verified!");
        navigate("/purchase/b2b-purchase-verification");
      } else {
        toasterrormsg(res?.data?.message || "Verification failed");
      }
    } catch (e: any) {
      if (e.response?.data?.error_code === "NO_SUNDRY_CREDITOR_ACCOUNT") {
        setShowCreditorPopup(true);
      } else {
        toasterrormsg(e.response?.data?.message || "Error verifying items");
      }
    }
    setVerifyingAll(false);
  };

  // ── Derived State ─────────────────────────────────────────────────────────
  const pendingItems = purchase?.items?.filter(i => !i.is_stock_updated) || [];
  const verifiedItems = purchase?.items?.filter(i => i.is_stock_updated) || [];
  const allVerified = pendingItems.length === 0;

  const gstTotals: GstTotals = useMemo(() => {
    const items = purchase?.items || [];
    return items.reduce(
      (acc, i) => ({
        basic: acc.basic + safeNumber(i.basic_amount),
        tax: acc.tax + safeNumber(i.tax_amount),
        cgst: acc.cgst + safeNumber(i.cgst),
        sgst: acc.sgst + safeNumber(i.sgst),
        igst: acc.igst + safeNumber(i.igst),
        net: acc.net + safeNumber(i.net_amount),
      }),
      { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 }
    );
  }, [purchase?.items]);
  const hasGst = gstTotals.basic > 0 || gstTotals.tax > 0;

  if (loading && !purchase) {
    return (
      <Page title="B2B Purchase Verification Detail">
        <div className="transition-content w-full pb-8">
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </Page>
    );
  }

  if (!purchase) {
    return (
      <Page title="B2B Purchase Verification Detail">
        <div className="transition-content w-full pb-8">
          <div className="text-center py-16 text-gray-400 dark:text-dark-400">
            Purchase not found
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title="B2B Purchase Verification Detail">
      <div className="transition-content w-full pb-8 space-y-4">
        {/* Creditor Popup */}
        {showCreditorPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Card className="max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-dark-100 mb-2">Account Required</h3>
              <p className="text-sm text-gray-600 dark:text-dark-400 mb-5">
                Before verifying stock, you need to create a "Sundry Creditor(Main)" account.
                Click OK to go to the account creation page.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outlined"
                  onClick={() => setShowCreditorPopup(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowCreditorPopup(false);
                    navigate("/accounts", {
                      state: { presetGroup: "Sundry Creditor(Main)" },
                    });
                  }}
                >
                  OK, Create Account
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={() => navigate("/purchase/b2b-purchase-verification")}>
              <ArrowLeftIcon className="size-4" /> Back to Verifications
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">{purchase.sale_no}</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">B2B Purchase Verification Detail</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={load} disabled={loading}>
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              Refresh
            </Button>
            {allVerified ? (
              <Badge color="success" variant="soft" className="text-xs font-semibold">
                <CheckIcon className="size-3 mr-1" /> Fully Verified
              </Badge>
            ) : (
              <Badge color="warning" variant="soft" className="text-xs font-semibold">
                {pendingItems.length} Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Purchase Header */}
        <div className="px-(--margin-x)">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-dark-300">
                  <QrCodeIcon className="size-3.5" /> Sale No.
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {purchase.sale_no || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-dark-300">
                  <CalendarDaysIcon className="size-3.5" /> Sale Date
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {purchase.sale_date ? formatDateDDMMYYYY(purchase.sale_date) : "—"}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-dark-300">
                  <BuildingOfficeIcon className="size-3.5" /> From Branch
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {purchase.from_branch.name || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-dark-300">
                  <BuildingOfficeIcon className="size-3.5" /> To Branch
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {purchase.to_branch.name || "—"}
                </div>
              </div>
            </div>
            {purchase.note && (
              <div className="mt-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-dark-300">
                  <InformationCircleIcon className="size-3.5" /> Note
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-3 py-2 text-sm text-gray-700 dark:text-dark-100">
                  {purchase.note}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="px-(--margin-x) grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Total Items", value: purchase.items.length, bg: "bg-gradient-to-br from-primary-500 to-primary-700", Icon: CubeIcon },
            { label: "Verified", value: verifiedItems.length, bg: "bg-gradient-to-br from-emerald-500 to-emerald-700", Icon: CheckCircleIcon },
            { label: "Pending", value: pendingItems.length, bg: "bg-gradient-to-br from-amber-500 to-amber-600", Icon: ExclamationTriangleIcon },
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

        {/* Website Display Toggle + Verify All */}
        {!allVerified && (
          <div className="px-(--margin-x)">
            <Card className="p-4 flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <StyledSwitch
                    checked={websiteDisplay}
                    onChange={setWebsiteDisplay}
                    size={6}
                    srText="Website Display"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-dark-200">Website Display</div>
                    <div className="text-xs text-gray-500 dark:text-dark-400">Show verified items on website</div>
                  </div>
                </label>
              </div>
              <Button
                color="primary"
                className="gap-2 h-9 px-4 text-sm"
                disabled={verifyingAll || pendingItems.length === 0}
                onClick={handleVerifyAll}
              >
                <CheckCircleIcon className="size-4" />
                {verifyingAll ? "Verifying..." : `Verify All (${pendingItems.length})`}
              </Button>
            </Card>
          </div>
        )}

        {/* Items Table */}
        <div className="px-(--margin-x)">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-600 flex items-center gap-3 bg-gray-50 dark:bg-dark-800">
              <CubeIcon className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">Purchase Items</h3>
              <Badge color="primary" variant="soft" className="text-xs font-semibold">
                {purchase.items.length}
              </Badge>
              {pendingItems.length > 0 && (
                <Badge color="warning" variant="soft" className="text-xs font-semibold">
                  {pendingItems.length} pending
                </Badge>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">#</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Item Name</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Variant</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Barcode</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">HSN</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">GST</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Qty</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-right">Rate</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Status</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap text-center">Action</Th>
                  </Tr>
                </THead>
                <TBody>
                  {purchase.items.map((item, idx) => (
                    <Tr
                      key={item.id}
                      className={clsx(
                        "dark:border-b-dark-500 border-b border-gray-100 transition-colors",
                        item.is_stock_updated
                          ? "bg-success-50/40 dark:bg-success-900/10"
                          : "hover:bg-gray-50 dark:hover:bg-dark-800"
                      )}
                    >
                      <Td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</Td>
                      <Td className="px-4 py-3 font-semibold text-gray-800 dark:text-dark-100">
                        {item.from_item_name}
                      </Td>
                      <Td className="px-4 py-3 text-center">
                        <Badge color="neutral" variant="soft" className="text-xs">
                          {item.from_variant_info || "Default"}
                        </Badge>
                      </Td>
                      <Td className="px-4 py-3 text-center font-mono text-xs text-gray-500 dark:text-dark-400">
                        {item.from_barcode || "—"}
                      </Td>
                      <Td className="px-4 py-3 text-center font-mono text-xs text-gray-500 dark:text-dark-400">
                        {item.hsnCode || "—"}
                      </Td>
                      <Td className="px-4 py-3 text-center">
                        <Badge color="warning" variant="soft" className="text-xs">
                          {item.taxSlab || "0%"}
                        </Badge>
                      </Td>
                      <Td className="px-4 py-3 text-center">
                        <Badge color="info" variant="soft" className="text-xs font-bold">
                          {item.quantity}
                        </Badge>
                      </Td>
                      <Td className="px-4 py-3 text-right text-xs font-mono font-semibold text-primary">
                        ₹{item.branch_price?.toFixed(2) || "0.00"}
                      </Td>
                      <Td className="px-4 py-3 text-center">
                        {item.is_stock_updated ? (
                          <Badge color="success" variant="soft" className="text-xs font-semibold">
                            <CheckIcon className="size-3 mr-1" /> Verified
                          </Badge>
                        ) : (
                          <Badge color="warning" variant="soft" className="text-xs font-semibold">
                            <ExclamationTriangleIcon className="size-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </Td>
                      <Td className="px-4 py-3 text-center">
                        {item.is_stock_updated ? (
                          <span className="text-gray-400 text-xs">✓ Done</span>
                        ) : (
                          <Button
                            variant="soft"
                            color="primary"
                            className="h-7 px-3 text-xs gap-1.5 rounded-lg"
                            disabled={verifyingItem === item.id || verifyingAll}
                            onClick={() => handleVerifyItem(item.id)}
                          >
                            {verifyingItem === item.id ? (
                              <>
                                <div className="size-3 border border-white border-t-transparent rounded-full animate-spin" />
                                ...
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="size-3.5" /> Verify
                              </>
                            )}
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>

            {/* Summary Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 dark:text-dark-400">
                  Total Items: <b className="text-gray-700 dark:text-dark-200">{purchase.items.length}</b>
                </span>
                <span className="text-success-600 dark:text-success-400">
                  Verified: <b>{verifiedItems.length}</b>
                </span>
                <span className="text-warning-600 dark:text-warning-400">
                  Pending: <b>{pendingItems.length}</b>
                </span>
              </div>
              {allVerified && (
                <div className="flex items-center gap-2 bg-success-100 text-success-700 px-4 py-2 rounded-xl text-sm font-semibold dark:bg-success-900/20 dark:text-success-400">
                  <CheckIcon />
                  B2B Purchase Fully Verified!
                </div>
              )}
            </div>
          </Card>
        </div> 

        {/* GST Summary card */}
        {hasGst && (
          <div className="px-(--margin-x)">
            <GstSummaryCard totals={gstTotals} />
          </div>
        )}
      </div>
    </Page>
  );
}
