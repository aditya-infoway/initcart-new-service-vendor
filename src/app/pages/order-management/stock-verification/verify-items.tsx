import {
  ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon,
  ClipboardIcon, BuildingStorefrontIcon, CalendarDaysIcon,
  TruckIcon, ClockIcon, MapPinIcon, PhoneIcon, CheckBadgeIcon,
  EnvelopeIcon, HomeIcon, DocumentTextIcon, ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card } from "@/components/ui";
import { StyledSwitch } from "@/components/shared/form/StyledSwitch";
import {
  formatDateDDMMYYYY, Get, Post,
  toastsuccessmsg, toasterrormsg,
} from "@/ApiHelper";
import {
  VerifyItemRow, VerifyTransferInfo,
  extractVerifyItemsResponse, getVerifyStatusStyle,
} from "./data";

export default function StockVerifyItemsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [verifyingItemId, setVerifyingItemId] = useState<number | null>(null);
  const [info, setInfo] = useState<VerifyTransferInfo | null>(null);
  const [items, setItems] = useState<VerifyItemRow[]>([]);
  const [websiteDisplay, setWebsiteDisplay] = useState(true);

  const loadItems = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await Get(`pos/stock-transfers/${id}/items/`) as any;
      const body = res?.data ?? res;
      const { info: parsedInfo, items: parsedItems } = extractVerifyItemsResponse(body);
      setItems(parsedItems);
      if (parsedInfo) {
        setInfo(parsedInfo);
      } else {
        const raw = body?.transfer ?? body?.data ?? body;
        setInfo({
          id: Number(id),
          transferId: String(raw?.transfer_no ?? raw?.transfer_id ?? `#${id}`),
          orderId: String(raw?.source_order_no ?? raw?.order_id ?? raw?.order_no ?? "—"),
          sourceOrderNo: String(raw?.source_order_no ?? ""),
          date: String(raw?.transfer_date ?? raw?.date ?? ""),
          note: String(raw?.note ?? raw?.order_note ?? ""),
          transferType: String(raw?.transfer_type ?? "transfer"),
          status: "pending",
          fromBranch: "Main Branch",
          fromBranchId: 0,
          fromBranchPhone: "",
          fromBranchEmail: "",
          fromBranchAddress: "",
          fromBranchCity: "",
          fromBranchState: "",
          toBranch: "",
          toBranchPhone: "",
          toBranchEmail: "",
          toBranchAddress: "",
          toBranchCity: "",
          toBranchState: "",
          totalItems: parsedItems.length,
          totalVerified: parsedItems.filter(i => i.isVerified).length,
          totalPending: parsedItems.filter(i => !i.isVerified).length,
        });
      }
    } catch {
      toasterrormsg("Failed to load transfer items.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const liveTotals = useMemo(() => {
    const totalItems = items.length;
    const totalVerified = items.filter(i => i.isVerified).length;
    const totalPending = totalItems - totalVerified;
    return { totalItems, totalVerified, totalPending };
  }, [items]);

  const handleVerifyAll = async () => {
    if (!id || savingAll) return;
    setSavingAll(true);
    try {
      const res = await Post(
        `pos/stock-transfers/${id}/verify-all/`,
        { website_display: websiteDisplay },
      ) as any;
      const body = res?.data ?? res;
      const success = body?.success === true || res?.success === true || body?.id || body?.verified;
      if (!success && body?.message) {
        toasterrormsg(body.message);
        return;
      }
      toastsuccessmsg(body?.message || "All items verified successfully.");
      setItems(prev => prev.map(i => ({ ...i, isVerified: true, status: "verified" })));
    } catch (e: any) {
      const data = e?.response?.data;
      toasterrormsg(
        (data && (data.message || data.detail || (typeof data.error === "string" ? data.error : null)))
        || (typeof e?.message === "string" ? e.message : null)
        || "Verify All failed.",
      );
    } finally {
      setSavingAll(false);
    }
  };

  const handleVerifyItem = async (item: VerifyItemRow) => {
    if (!id || verifyingItemId !== null) return;
    setVerifyingItemId(item.id);
    try {
      const res = await Post(
        `pos/stock-transfers/${id}/verify-item/${item.id}/`,
        { website_display: websiteDisplay },
      ) as any;
      const body = res?.data ?? res;
      const success = body?.success === true || res?.success === true || body?.id || body?.verified || !body?.error;
      if (!success && body?.message) {
        toasterrormsg(body.message);
        return;
      }
      toastsuccessmsg(body?.message || `${item.itemName} verified.`);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isVerified: true, status: "verified" } : i));
    } catch (e: any) {
      const data = e?.response?.data;
      toasterrormsg(
        (data && (data.message || data.detail || (typeof data.error === "string" ? data.error : null)))
        || (typeof e?.message === "string" ? e.message : null)
        || `Failed to verify ${item.itemName}.`,
      );
    } finally {
      setVerifyingItemId(null);
    }
  };

  const headerStatus = useMemo(() => {
    if (liveTotals.totalItems === 0) return { key: "empty", label: "Empty", style: "bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-200" };
    if (liveTotals.totalPending === 0) return { key: "verified", label: "Verified", style: "bg-emerald-500 text-white" };
    return { key: "pending", label: `${liveTotals.totalPending} Pending`, style: "bg-amber-500 text-white" };
  }, [liveTotals]);

  const transferStatusKey = (info?.status || "pending").toLowerCase();
  const infoStatusStyle = getVerifyStatusStyle(
    transferStatusKey === "completed" ? "verified" : transferStatusKey,
  );

  return (
    <Page title="Verify Transfer Items">
      <div className="transition-content w-full px-(--margin-x) py-5 space-y-5">

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outlined" className="h-10 gap-2 px-4 text-sm font-medium"
              onClick={() => navigate("/order-management/stock-verification")}>
              <ArrowLeftIcon className="size-5" /> Back to Transfers
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-gray-800 dark:text-dark-50 tracking-tight">
                {info?.transferId || `#${id}`}
              </span>
              <Badge className={clsx("h-8 px-3 text-xs font-bold shadow-sm", headerStatus.style)}>
                {headerStatus.key === "verified" && <CheckCircleIcon className="size-4 mr-1" />}
                {headerStatus.key === "pending" && <ClockIcon className="size-4 mr-1" />}
                {headerStatus.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="h-10 gap-2 px-4 text-sm font-medium"
              onClick={loadItems} disabled={loading}>
              <ArrowPathIcon className={clsx("size-5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Transfer Header Info + From/To Branch Cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* From Branch */}
          <Card className="p-5 lg:col-span-1 overflow-hidden border border-sky-200/70 dark:border-sky-500/20 bg-gradient-to-br from-sky-50/70 via-white to-white dark:from-sky-500/10 dark:via-dark-800 dark:to-dark-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid size-11 place-items-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
                <TruckIcon className="size-5.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">
                  From Branch
                </p>
                <p className="text-base font-bold text-gray-800 dark:text-dark-50 leading-tight">
                  {info?.fromBranch || "—"}
                </p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              {info?.fromBranchPhone && (
                <div className="flex items-start gap-2.5">
                  <PhoneIcon className="size-[18px] mt-0.5 shrink-0 text-sky-500" />
                  <span className="text-gray-700 dark:text-dark-100 font-medium">{info.fromBranchPhone}</span>
                </div>
              )}
              {info?.fromBranchEmail && (
                <div className="flex items-start gap-2.5">
                  <EnvelopeIcon className="size-[18px] mt-0.5 shrink-0 text-sky-500" />
                  <span className="text-gray-700 dark:text-dark-100 font-medium break-all">{info.fromBranchEmail}</span>
                </div>
              )}
              {info?.fromBranchAddress && (
                <div className="flex items-start gap-2.5">
                  <HomeIcon className="size-[18px] mt-0.5 shrink-0 text-sky-500" />
                  <span className="text-gray-700 dark:text-dark-100 font-medium">{info.fromBranchAddress}</span>
                </div>
              )}
              {(info?.fromBranchCity || info?.fromBranchState) && (
                <div className="flex items-start gap-2.5">
                  <MapPinIcon className="size-[18px] mt-0.5 shrink-0 text-sky-500" />
                  <span className="text-gray-700 dark:text-dark-100 font-medium">
                    {[info.fromBranchCity, info.fromBranchState].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {!info?.fromBranchPhone && !info?.fromBranchEmail && !info?.fromBranchAddress && !info?.fromBranchCity && (
                <p className="text-sm text-gray-400 italic">No additional branch details</p>
              )}
            </div>
          </Card>

          {/* To Branch */}
          <Card className="p-5 lg:col-span-1 overflow-hidden border border-emerald-200/70 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/70 via-white to-white dark:from-emerald-500/10 dark:via-dark-800 dark:to-dark-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid size-11 place-items-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                <ArrowDownTrayIcon className="size-5.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                  To Branch
                </p>
                <p className="text-base font-bold text-gray-800 dark:text-dark-50 leading-tight">
                  {info?.toBranch || "Current Branch"}
                </p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              {info?.toBranchPhone && (
                <div className="flex items-start gap-2.5">
                  <PhoneIcon className="size-[18px] mt-0.5 shrink-0 text-emerald-500" />
                  <span className="text-gray-700 dark:text-dark-100 font-medium">{info.toBranchPhone}</span>
                </div>
              )}
              {info?.toBranchEmail && (
                <div className="flex items-start gap-2.5">
                  <EnvelopeIcon className="size-[18px] mt-0.5 shrink-0 text-emerald-500" />
                  <span className="text-gray-700 dark:text-dark-100 font-medium break-all">{info.toBranchEmail}</span>
                </div>
              )}
              {info?.toBranchAddress && (
                <div className="flex items-start gap-2.5">
                  <HomeIcon className="size-[18px] mt-0.5 shrink-0 text-emerald-500" />
                  <span className="text-gray-700 dark:text-dark-100 font-medium">{info.toBranchAddress}</span>
                </div>
              )}
              {(info?.toBranchCity || info?.toBranchState) && (
                <div className="flex items-start gap-2.5">
                  <MapPinIcon className="size-[18px] mt-0.5 shrink-0 text-emerald-500" />
                  <span className="text-gray-700 dark:text-dark-100 font-medium">
                    {[info.toBranchCity, info.toBranchState].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {!info?.toBranchPhone && !info?.toBranchEmail && !info?.toBranchAddress && !info?.toBranchCity && (
                <p className="text-sm text-gray-400 italic">Receiving this transfer</p>
              )}
            </div>
          </Card>

          {/* Transfer Meta Summary */}
          <Card className="p-5 lg:col-span-1 overflow-hidden border border-gray-200 dark:border-dark-600">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <ClipboardIcon className="size-5.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-dark-300">
                  Transfer Details
                </p>
                {info && (
                  <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", infoStatusStyle.bg, infoStatusStyle.label)}>
                    <span className={clsx("size-1.5 rounded-full", infoStatusStyle.dot)} />
                    {info.status}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-dark-300">
                  <CalendarDaysIcon className="size-[18px]" /> Transfer Date
                </span>
                <span className="text-[14px] font-bold text-gray-800 dark:text-dark-50">
                  {info?.date ? formatDateDDMMYYYY(info.date) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-dark-300">
                  <DocumentTextIcon className="size-[18px]" /> Source Order
                </span>
                <span className="text-[14px] font-bold text-primary-700 dark:text-primary-300 truncate max-w-[55%]">
                  {info?.orderId || "—"}
                </span>
              </div>
              <div className="h-px bg-gray-200/80 dark:bg-dark-600" />
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center rounded-xl bg-gray-50 py-2.5 dark:bg-dark-700/70">
                  <p className="text-xs font-medium text-gray-500 dark:text-dark-300">Items</p>
                  <p className="text-lg font-extrabold text-gray-800 dark:text-dark-50 mt-0.5">{liveTotals.totalItems}</p>
                </div>
                <div className="text-center rounded-xl bg-emerald-50 py-2.5 dark:bg-emerald-500/10">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Verified</p>
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{liveTotals.totalVerified}</p>
                </div>
                <div className="text-center rounded-xl bg-amber-50 py-2.5 dark:bg-amber-500/10">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</p>
                  <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{liveTotals.totalPending}</p>
                </div>
              </div>
              {(info?.note) && (
                <>
                  <div className="h-px bg-gray-200/80 dark:bg-dark-600" />
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 dark:text-dark-300 mb-1">Note</p>
                    <p className="text-[13px] font-semibold text-gray-700 dark:text-dark-100">{info.note}</p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Website Display + Verify All Bar */}
        <Card className="p-5 border border-gray-200 dark:border-dark-600">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <StyledSwitch
                checked={websiteDisplay}
                onChange={setWebsiteDisplay}
                size={7}
                srText="Website Display toggle"
              />
              <div>
                <p className="text-[15px] font-bold text-gray-800 dark:text-dark-50">Website Display</p>
                <p className="text-[12px] text-gray-500 dark:text-dark-300">
                  When enabled, verified items will be published and visible on the customer website.
                </p>
              </div>
            </div>
            <Button
              color="success"
              className="h-11 gap-2 px-6 text-sm font-bold shadow-md shadow-emerald-500/20"
              onClick={handleVerifyAll}
              disabled={savingAll || loading || liveTotals.totalPending === 0}>
              {savingAll ? (
                <ArrowPathIcon className="size-5 animate-spin" />
              ) : (
                <CheckBadgeIcon className="size-5" />
              )}
              Verify All ({liveTotals.totalPending})
            </Button>
          </div>
        </Card>

        {/* Transfer Items Table */}
        <Card className="overflow-hidden border border-gray-200 dark:border-dark-600">
          <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-dark-600 bg-gray-50/60 dark:bg-dark-800/40">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <ClipboardIcon className="size-5.5" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-gray-800 dark:text-dark-50">Transfer Items</h3>
                <p className="text-[12px] text-gray-500 dark:text-dark-300">Review and verify each item to update stock</p>
              </div>
              <Badge color="primary" className="ml-2 h-7 px-3 text-[12px] font-bold">{liveTotals.totalItems}</Badge>
              {liveTotals.totalPending > 0 && (
                <Badge color="warning" className="h-7 px-3 text-[12px] font-bold">
                  {liveTotals.totalPending} pending
                </Badge>
              )}
              {liveTotals.totalPending === 0 && liveTotals.totalItems > 0 && (
                <Badge color="success" className="h-7 px-3 text-[12px] font-bold">
                  All Verified
                </Badge>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-primary/5 dark:border-dark-600 dark:bg-primary/10">
                  {["#", "Item Name", "Variant", "Barcode", "HSN", "GST", "Qty", "Purchase ₹", "Status", "Action"].map(h => (
                    <th key={h} className="whitespace-nowrap px-5 py-4 text-[13px] font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="py-20 text-center">
                    <ArrowPathIcon className="mx-auto mb-3 size-7 animate-spin text-primary" />
                    <p className="text-[14px] text-gray-400">Loading transfer items...</p>
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={10} className="py-20 text-center">
                    <div className="mx-auto mb-4 grid size-20 place-items-center rounded-2xl bg-gray-100 dark:bg-dark-700 text-gray-400">
                      <TruckIcon className="size-10" />
                    </div>
                    <p className="text-[15px] font-bold text-gray-700 dark:text-dark-200">No items to verify</p>
                    <p className="mt-1 text-[13px] text-gray-500 dark:text-dark-300">This transfer has no items.</p>
                  </td></tr>
                ) : items.map((it, idx) => {
                  const s = getVerifyStatusStyle(it.status);
                  const isVerifying = verifyingItemId === it.id;
                  return (
                    <tr key={it.id} className={clsx(
                      "border-b border-gray-100 dark:border-dark-700 transition-colors",
                      it.isVerified ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "hover:bg-gray-50 dark:hover:bg-dark-700/50",
                    )}>
                      <td className="px-5 py-4 text-[14px] font-semibold text-gray-500">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <p className="text-[14px] font-semibold text-gray-800 dark:text-dark-50">{it.itemName}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary dark:text-primary-300">
                          {it.variant}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className=" text-[12px] font-medium text-gray-600 dark:text-dark-200 tracking-wider">
                          {it.barcode || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium text-gray-700 dark:text-dark-100">{it.hsn || "—"}</td>
                      <td className="px-5 py-4">
                        {it.gstPercent ? (
                          <Badge color="warning" className="h-6 px-2.5 text-[12px] font-bold">{it.gstPercent}%</Badge>
                        ) : <span className="text-[13px] text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center size-9 min-w-9 rounded-xl bg-primary/10 text-primary dark:text-primary-300 text-[15px] font-extrabold">
                          {it.qty}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[15px] font-bold text-primary-700 dark:text-primary-300">₹{it.purchasePrice}</td>
                      <td className="px-5 py-4">
                        <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold capitalize", s.bg)}>
                          <span className={clsx("size-2 rounded-full", s.dot)} />
                          {it.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {it.isVerified ? (
                          <Badge color="success" className="h-9 px-4 text-[13px] font-bold shadow-sm">
                            <CheckCircleIcon className="size-4.5 mr-1.5" /> Verified
                          </Badge>
                        ) : (
                          <Button
                            color="success"
                            variant="filled"
                            className="h-9 gap-1.5 px-4 text-[13px] font-bold shadow-sm shadow-emerald-500/20"
                            onClick={() => handleVerifyItem(it)}
                            disabled={isVerifying}>
                            {isVerifying ? (
                              <ArrowPathIcon className="size-4.5 animate-spin" />
                            ) : (
                              <CheckCircleIcon className="size-4.5" />
                            )}
                            Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-6 py-4 dark:border-dark-700 bg-gray-50/50 dark:bg-dark-800/30">
            <div className="flex flex-wrap items-center gap-5 text-[13px]">
              <span className="text-gray-500 dark:text-dark-300">
                Total Items: <span className="font-extrabold text-[15px] text-gray-800 dark:text-dark-50 ml-1">{liveTotals.totalItems}</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Verified: <span className="font-extrabold text-[15px] ml-1">{liveTotals.totalVerified}</span>
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                Pending: <span className="font-extrabold text-[15px] ml-1">{liveTotals.totalPending}</span>
              </span>
            </div>
          </div>
        </Card>

      </div>
    </Page>
  );
}
