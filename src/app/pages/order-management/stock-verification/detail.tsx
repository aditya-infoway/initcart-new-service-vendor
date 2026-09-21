import {
  ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon,
  ClipboardIcon, DocumentTextIcon, InformationCircleIcon,
  MinusIcon, PlusIcon, BuildingStorefrontIcon,
  CalendarDaysIcon, TruckIcon, QrCodeIcon, XCircleIcon,
  CheckBadgeIcon, NoSymbolIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input } from "@/components/ui";
import { StyledSwitch } from "@/components/shared/form/StyledSwitch";
import {
  formatDateDDMMYYYY, Get, Patch, Post, Put,
  toastsuccessmsg, toasterrormsg,
} from "@/ApiHelper";
import {
  StockVerificationItem, mapApiStockVerificationRow,
  getVerifyStatusStyle,
} from "./data";

function buildItemUrl(id: string | number) {
  return `pos/stock-transfers/pending-verification/${id}/`;
}

type VerifyState = Record<number, { accepted: number; rejected: number; remark: string }>;

export default function StockVerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [verifyingItemId, setVerifyingItemId] = useState<number | null>(null);
  const [verifiedItemIds, setVerifiedItemIds] = useState<Set<number>>(new Set());
  const [websiteDisplay, setWebsiteDisplay] = useState(true);
  const [row, setRow] = useState<ReturnType<typeof mapApiStockVerificationRow> | null>(null);
  const [state, setState] = useState<VerifyState>({});

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await Get(buildItemUrl(id)) as any;
      const body = res?.data ?? res;
      const data = mapApiStockVerificationRow(body?.results?.data ?? body?.data ?? body?.results ?? body);
      setRow(data);
      const init: VerifyState = {};
      data.items.forEach(it => {
        init[it.id] = {
          accepted: it.acceptedQty ?? it.sentQty ?? 0,
          rejected: it.rejectedQty ?? 0,
          remark: it.remark ?? "",
        };
      });
      setState(init);
      setVerifiedItemIds(new Set(data.items.filter(i =>
        (i.acceptedQty > 0 && i.acceptedQty >= i.sentQty)
      ).map(i => i.id)));
    } catch {
      toasterrormsg("Failed to load transfer detail.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const totals = useMemo(() => {
    const items = row?.items ?? [];
    const sent = items.reduce((s, i) => s + i.sentQty, 0);
    const accepted = items.reduce((s, i) => s + (state[i.id]?.accepted ?? 0), 0);
    const rejected = items.reduce((s, i) => s + (state[i.id]?.rejected ?? 0), 0);
    return { sent, accepted, rejected };
  }, [row, state]);

  const isVerified = row?.status === "verified";

  const setItemQty = (itemId: number, field: "accepted" | "rejected", delta: number) => {
    const item = row?.items.find(i => i.id === itemId);
    if (!item) return;
    setState(prev => {
      const cur = prev[itemId] ?? { accepted: item.acceptedQty ?? 0, rejected: item.rejectedQty ?? 0, remark: "" };
      const val = Math.max(0, (cur[field] ?? 0) + delta);
      const newVal = field === "accepted"
        ? Math.min(val, item.sentQty)
        : Math.min(val, Math.max(0, item.sentQty - (field === "rejected" ? cur.accepted : 0)));
      return { ...prev, [itemId]: { ...cur, [field]: newVal } };
    });
  };

  const setItemQtyDirect = (itemId: number, field: "accepted" | "rejected", v: number) => {
    const item = row?.items.find(i => i.id === itemId);
    if (!item) return;
    setState(prev => {
      const cur = prev[itemId] ?? { accepted: item.acceptedQty ?? 0, rejected: item.rejectedQty ?? 0, remark: "" };
      let val = Number.isFinite(v) ? v : 0;
      val = Math.max(0, val);
      if (field === "accepted") val = Math.min(val, item.sentQty);
      else val = Math.min(val, Math.max(0, item.sentQty - cur.accepted));
      return { ...prev, [itemId]: { ...cur, [field]: val } };
    });
  };

  const setItemRemark = (itemId: number, remark: string) => {
    setState(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? { accepted: 0, rejected: 0, remark: "" }), remark },
    }));
  };

  const quickSetAllFull = () => {
    if (!row) return;
    const next: VerifyState = {};
    row.items.forEach(i => {
      next[i.id] = { accepted: i.sentQty, rejected: 0, remark: state[i.id]?.remark ?? "" };
    });
    setState(next);
  };

  const quickSetAllZero = () => {
    if (!row) return;
    const next: VerifyState = {};
    row.items.forEach(i => {
      next[i.id] = { accepted: 0, rejected: i.sentQty, remark: state[i.id]?.remark ?? "" };
    });
    setState(next);
  };

  const handleVerifyAllApi = async () => {
    if (!id || verifyingAll || isVerified) return;
    setVerifyingAll(true);
    try {
      const res = await Post(
        `pos/stock-transfers/${id}/verify-all/`,
        { website_display: websiteDisplay },
      ) as any;
      const body = res?.data ?? res;
      const success =
        body?.success === true || res?.success === true || body?.verified || body?.status || !body?.error;
      if (!success && body?.message) {
        toasterrormsg(body.message);
        return;
      }
      toastsuccessmsg(body?.message || "All items verified successfully.");
      if (row) {
        const next: VerifyState = { ...state };
        row.items.forEach(i => { next[i.id] = { ...(next[i.id] ?? { accepted: 0, rejected: 0, remark: "" }), accepted: i.sentQty, rejected: 0 }; });
        setState(next);
        setVerifiedItemIds(new Set(row.items.map(i => i.id)));
        setRow({ ...row, status: "verified", totalAcceptedQty: row.totalQty, totalPendingQty: 0 });
      }
    } catch (e: any) {
        const data = e?.response?.data;
        toasterrormsg(
          (data && (data.message || data.detail || (typeof data.error === "string" ? data.error : null)))
          || (typeof e?.message === "string" ? e.message : null)
          || "Verify All failed.",
        );
    } finally {
      setVerifyingAll(false);
    }
  };

  const handleVerifyItemApi = async (item: StockVerificationItem) => {
    if (!id || verifyingItemId !== null || isVerified) return;
    setVerifyingItemId(item.id);
    try {
      const res = await Post(
        `pos/stock-transfers/${id}/verify-item/${item.id}/`,
        { website_display: websiteDisplay },
      ) as any;
      const body = res?.data ?? res;
      const success =
        body?.success === true || res?.success === true || body?.verified || body?.status || !body?.error;
      if (!success && body?.message) {
        toasterrormsg(body.message);
        return;
      }
      toastsuccessmsg(body?.message || `${item.itemName} verified.`);
      setVerifiedItemIds(prev => new Set(prev).add(item.id));
      setState(prev => {
        const cur = prev[item.id] ?? { accepted: 0, rejected: 0, remark: "" };
        return { ...prev, [item.id]: { ...cur, accepted: item.sentQty, rejected: 0 } };
      });
      if (row) {
        const nextIdSet = new Set(verifiedItemIds);
        nextIdSet.add(item.id);
        const nextStatus = nextIdSet.size >= row.items.length && row.items.length > 0 ? "verified" : (nextIdSet.size > 0 ? "partial" : row.status);
        setRow({ ...row, status: nextStatus });
      }
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

  const handleSubmit = async (markAll?: "accept" | "reject") => {
    if (!row) return;
    setSaving(true);
    try {
      const itemsPayload = row.items.map(i => {
        const s = state[i.id] ?? { accepted: 0, rejected: 0, remark: "" };
        const accepted = markAll === "accept" ? i.sentQty : markAll === "reject" ? 0 : s.accepted;
        const rejected = markAll === "reject" ? i.sentQty : markAll === "accept" ? 0 : s.rejected;
        return {
          id: i.id,
          item_id: i.id,
          source_item_id: i.id,
          source_variant_id: i.id,
          item_name: i.itemName,
          variant_info: i.variant,
          barcode: i.barcode || undefined,
          size: i.size && i.size !== "—" ? i.size : null,
          color: i.color && i.color !== "—" ? i.color : null,
          hsnCode: i.hsn || null,
          taxSlab: i.gstPercent ? `${i.gstPercent}%` : null,
          sent_quantity: i.sentQty,
          accepted_quantity: accepted,
          rejected_quantity: rejected,
          verified_quantity: accepted,
          received_quantity: accepted + rejected,
          requested_quantity: i.requestedQty,
          remark: s.remark || null,
          rate: parseFloat(i.rate || "0"),
          purchase_price: parseFloat(i.purchasePrice || "0"),
          branch_price: parseFloat(i.branchPrice || "0"),
          sales_price: parseFloat(i.salesPrice || "0"),
          mrp: parseFloat(i.mrp || "0"),
          status: accepted >= i.sentQty && i.sentQty > 0 ? "verified" : (accepted > 0 ? "partial" : "pending"),
        };
      });
      const payload = {
        transfer_id: row.id,
        transfer_no: row.transferId,
        order_id: row.orderId,
        from_branch_id: row.fromBranchId,
        note: row.note || "",
        items: itemsPayload,
        status: markAll === "accept" || totals.accepted >= totals.sent ? "verified" : "partial",
      };
      let res: any;
      try {
        res = await Patch(buildItemUrl(row.id), payload) as any;
      } catch {
        try { res = await Put(buildItemUrl(row.id), payload) as any; }
        catch { res = await Post("pos/stock-transfers/verify/", payload) as any; }
      }
      const body = res?.data ?? res;
      const success = body?.success === true || res?.success === true || body?.id || body?.data?.id;
      if (!success) throw { custom: true, message: body?.message || body?.detail || "Verification failed." };
      toastsuccessmsg(body?.message || "Stock verified successfully.");
      loadDetail();
    } catch (e: any) {
      if (e?.custom) { toasterrormsg(e.message); }
      else {
        const data = e?.response?.data;
        toasterrormsg(
          (data && (data.message || data.detail || (typeof data.error === "string" ? data.error : null)))
          || (typeof e?.message === "string" ? e.message : null)
          || "Failed to verify stock.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const statusStyle = row ? getVerifyStatusStyle(row.status) : null;

  return (
    <Page title="Verify Stock Transfer">
      <div className="transition-content w-full px-(--margin-x) py-5 space-y-5">

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={() => navigate("/order-management/stock-verification")}>
              <ArrowLeftIcon className="size-4" /> Back to Verifications
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="primary" className="h-9 px-4 text-[13px] font-bold shadow-sm">
                <ClipboardIcon className="size-4.5 mr-1.5" />
                Stock Verification
              </Badge>
              {row && statusStyle && (
                <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold capitalize shadow-sm", statusStyle.bg, statusStyle.label)}>
                  <span className={clsx("size-2 rounded-full", statusStyle.dot)} />
                  {row.status}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="h-10 gap-2 px-4 text-sm font-medium"
              onClick={loadDetail} disabled={loading}>
              <ArrowPathIcon className={clsx("size-5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Info + Summary */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Transfer Info */}
          <Card className="p-6 lg:col-span-2 space-y-5 border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-white dark:from-primary/10 dark:via-dark-800 dark:to-dark-800">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary shadow-sm">
                <TruckIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-gray-800 dark:text-dark-50">Incoming Transfer</h3>
                <p className="text-[12px] text-gray-500 dark:text-dark-300">
                  Verify received items against the shipment
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-gray-500 dark:text-dark-300">
                  <QrCodeIcon className="size-4" /> Transfer No.
                </label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-4 py-3 text-[15px] font-bold text-gray-800 dark:text-dark-50">
                  {row?.transferId || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-gray-500 dark:text-dark-300">
                  <DocumentTextIcon className="size-4" /> Order ID
                </label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-4 py-3 text-[15px] font-bold text-primary-700 dark:text-primary-300">
                  {row?.orderId || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-gray-500 dark:text-dark-300">
                  <BuildingStorefrontIcon className="size-4" /> From Branch
                </label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-4 py-3 text-[15px] font-bold text-gray-800 dark:text-dark-50">
                  {row?.fromBranch || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-gray-500 dark:text-dark-300">
                  <CalendarDaysIcon className="size-4" /> Transfer Date
                </label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-4 py-3 text-[15px] font-bold text-gray-800 dark:text-dark-50">
                  {row?.date ? formatDateDDMMYYYY(row.date) : "—"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-gray-500 dark:text-dark-300">
                  <InformationCircleIcon className="size-4" /> Order Note
                </label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-4 py-3 text-[14px] font-semibold text-gray-700 dark:text-dark-100 min-h-[44px]">
                  {row?.note || row?.orderNote || "—"}
                </div>
              </div>
            </div>
          </Card>

          {/* Summary card */}
          <Card className="p-6 space-y-5 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-500/10 dark:via-dark-800 dark:to-dark-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                <ClipboardIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-800 dark:text-dark-50">Verification Totals</h3>
                <p className="text-[12px] text-gray-500 dark:text-dark-300">Live counts</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-gray-500 dark:text-dark-300">
                  <TruckIcon className="size-[18px]" /> Sent Qty
                </span>
                <span className="text-[17px] font-extrabold text-gray-800 dark:text-dark-50">{totals.sent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircleIcon className="size-[18px]" /> Accepted
                </span>
                <span className="text-[17px] font-extrabold text-emerald-600 dark:text-emerald-400">{totals.accepted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-rose-600 dark:text-rose-400">
                  <XCircleIcon className="size-[18px]" /> Rejected
                </span>
                <span className="text-[17px] font-extrabold text-rose-600 dark:text-rose-400">{totals.rejected}</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-dark-600" />
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-gray-700 dark:text-dark-200">
                  Received (Acc. + Rej.)
                </span>
                <span className="text-[20px] font-extrabold text-gray-800 dark:text-dark-50">
                  {totals.accepted + totals.rejected} / {totals.sent}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Verify All & Quick actions bar */}
        {row && (
          <Card className="p-5 border border-gray-200 dark:border-dark-600">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4 flex-wrap">
                <StyledSwitch
                  checked={websiteDisplay}
                  onChange={setWebsiteDisplay}
                  size={6}
                  srText="Website Display toggle"
                />
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-dark-100">Website Display</p>
                  <p className="text-[11px] text-gray-500 dark:text-dark-300">
                    Verified items will be visible on the customer website when enabled.
                  </p>
                </div>
                <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-dark-600">
                  <div className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <CheckBadgeIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-800 dark:text-dark-50">Quick actions</p>
                    <p className="text-[11px] text-gray-500 dark:text-dark-300">Qty presets</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Button variant="outlined" color="success" className="h-10 gap-2 px-5 text-[12px] font-bold shadow-sm"
                    onClick={quickSetAllFull}>
                    <CheckBadgeIcon className="size-4.5" /> Accept All Full Qty
                  </Button>
                  <Button variant="outlined" color="error" className="h-10 gap-2 px-5 text-[12px] font-bold shadow-sm"
                    onClick={quickSetAllZero}>
                    <NoSymbolIcon className="size-4.5" /> Reject All
                  </Button>
                </div>
              </div>
              <Button
                color="success"
                className="h-11 gap-2 px-6 text-sm font-bold shadow-md shadow-emerald-500/20"
                onClick={handleVerifyAllApi}
                disabled={isVerified || verifyingAll}>
                {verifyingAll ? (
                  <ArrowPathIcon className="size-5 animate-spin" />
                ) : (
                  <CheckBadgeIcon className="size-5" />
                )}
                Verify All
              </Button>
            </div>
          </Card>
        )}

        {/* Items table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
                  {["SR","Item","Variant","Size","Color","Barcode","HSN","GST%","Sent","Accepted","Rejected","Rate ₹","Status","Remark","Action"].map(h => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={15} className="py-16 text-center">
                    <ArrowPathIcon className="mx-auto mb-2 size-6 animate-spin text-primary" />
                    <p className="text-sm text-gray-400">Loading transfer items...</p>
                  </td></tr>
                ) : !row?.items.length ? (
                  <tr><td colSpan={15} className="py-20 text-center">
                    <div className="mx-auto mb-3 grid size-16 place-items-center rounded-2xl bg-gray-100 dark:bg-dark-700 text-gray-400">
                      <ClipboardIcon className="size-8" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-dark-200">No items in this transfer</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">This transfer appears to be empty.</p>
                  </td></tr>
                ) : row.items.map((it: StockVerificationItem, idx: number) => {
                  const st = state[it.id] ?? { accepted: it.acceptedQty ?? 0, rejected: it.rejectedQty ?? 0, remark: "" };
                  const fullAccepted = st.accepted === it.sentQty && it.sentQty > 0;
                  const rowStatus = fullAccepted ? "verified" : st.accepted > 0 || st.rejected > 0 ? "partial" : "pending";
                  const s = getVerifyStatusStyle(rowStatus);
                  return (
                    <tr key={it.id}
                      className="border-b border-gray-100 transition-colors hover:bg-primary/[0.03] dark:border-dark-700 dark:hover:bg-primary/10">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 dark:text-dark-100">{it.itemName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-dark-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-dark-100">
                          {it.variant}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-dark-200">{it.size}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-dark-200">{it.color}</td>
                      <td className="px-4 py-3">
                        <span className=" text-[11px] text-gray-500 dark:text-dark-300">
                          {it.barcode || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-dark-200">{it.hsn || "—"}</td>
                      <td className="px-4 py-3">
                        {it.gstPercent ? (
                          <Badge color="warning" className="h-6 px-2.5 text-xs font-semibold">{it.gstPercent}%</Badge>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-dark-100">{it.sentQty}</td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600">
                          <button onClick={() => setItemQty(it.id, "accepted", -1)}
                            disabled={isVerified}
                            className="grid size-7 place-items-center text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 disabled:opacity-40 transition">
                            <MinusIcon className="size-3.5" />
                          </button>
                          <Input type="number" min={0} max={it.sentQty} disabled={isVerified}
                            value={st.accepted}
                            onChange={e => setItemQtyDirect(it.id, "accepted", Number(e.target.value))}
                            classNames={{ input: "h-7 w-16 text-center !px-0 text-xs font-semibold border-x-0 rounded-none bg-white dark:bg-dark-800 disabled:bg-gray-50 disabled:text-gray-500" }} />
                          <button onClick={() => setItemQty(it.id, "accepted", 1)}
                            disabled={isVerified || st.accepted >= it.sentQty}
                            className="grid size-7 place-items-center text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 disabled:opacity-40 transition">
                            <PlusIcon className="size-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600">
                          <button onClick={() => setItemQty(it.id, "rejected", -1)}
                            disabled={isVerified}
                            className="grid size-7 place-items-center text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 disabled:opacity-40 transition">
                            <MinusIcon className="size-3.5" />
                          </button>
                          <Input type="number" min={0} max={Math.max(0, it.sentQty - st.accepted)} disabled={isVerified}
                            value={st.rejected}
                            onChange={e => setItemQtyDirect(it.id, "rejected", Number(e.target.value))}
                            classNames={{ input: "h-7 w-16 text-center !px-0 text-xs font-semibold border-x-0 rounded-none bg-white dark:bg-dark-800 disabled:bg-gray-50 disabled:text-gray-500" }} />
                          <button onClick={() => setItemQty(it.id, "rejected", 1)}
                            disabled={isVerified || st.accepted + st.rejected >= it.sentQty}
                            className="grid size-7 place-items-center text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 disabled:opacity-40 transition">
                            <PlusIcon className="size-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary-600 dark:text-primary-400">₹{it.rate}</td>
                      <td className="px-4 py-3">
                        <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize", s.bg)}>
                          <span className={clsx("size-1.5 rounded-full", s.dot)} />
                          {rowStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Input value={st.remark} disabled={isVerified}
                          onChange={e => setItemRemark(it.id, e.target.value)}
                          placeholder="Shortage / Damage / Note..."
                          classNames={{ input: "h-8 text-xs w-44 bg-white dark:bg-dark-800" }} />
                      </td>
                      <td className="px-4 py-3">
                        {isVerified || verifiedItemIds.has(it.id) ? (
                          <Badge color="success" className="h-8 px-3 text-xs font-bold">
                            <CheckBadgeIcon className="size-4 mr-1" /> Done
                          </Badge>
                        ) : (
                          <Button
                            color="success"
                            variant="filled"
                            className="h-8 gap-1 px-3 text-xs font-bold rounded-md shadow-sm shadow-emerald-500/20"
                            onClick={() => handleVerifyItemApi(it)}
                            disabled={verifyingItemId === it.id}>
                            {verifyingItemId === it.id ? (
                              <ArrowPathIcon className="size-4 animate-spin" />
                            ) : (
                              <CheckCircleIcon className="size-4" />
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
        </Card>

        {/* Submit actions */}
        {row && (
          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {isVerified ? (
              <Badge color="success" className="h-10 px-5 text-[14px] font-bold shadow-sm">
                <CheckCircleIcon className="size-5 mr-1.5" />
                Transfer already verified
              </Badge>
            ) : (
              <>
                <Button variant="outlined" color="error" className="h-11 gap-2 px-5 text-[13px] font-bold shadow-sm"
                  onClick={() => handleSubmit("reject")} disabled={saving}>
                  <XCircleIcon className="size-[18px]" /> Reject Entire Shipment
                </Button>
                <Button variant="outlined" color="success" className="h-11 gap-2 px-5 text-[13px] font-bold shadow-sm"
                  onClick={() => handleSubmit("accept")} disabled={saving}>
                  <CheckBadgeIcon className="size-[18px]" /> Accept Entire Shipment
                </Button>
                <Button color="primary" className="h-11 gap-2 px-6 text-[13px] font-bold shadow-md shadow-primary/20"
                  onClick={() => handleSubmit()} disabled={saving}>
                  <ClipboardIcon className="size-[18px]" />
                  {saving ? "Saving..." : "Save Verification"}
                </Button>
              </>
            )}
          </div>
        )}

      </div>
    </Page>
  );
}
