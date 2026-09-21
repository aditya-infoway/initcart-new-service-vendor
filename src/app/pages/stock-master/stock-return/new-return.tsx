import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon, CheckCircleIcon, CubeIcon,
  MagnifyingGlassIcon, PlusIcon, TrashIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, Post, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";
import { VerifiedItem, AddedItem, extractVerifiedRows } from "./data";

// ── Item Pick Modal ────────────────────────────────────────────────────────
function ItemPickModal({
  isOpen, onClose, onPick, addedItems,
}: {
  isOpen: boolean; onClose: () => void;
  onPick: (item: VerifiedItem) => void;
  addedItems: AddedItem[];
}) {
  const [query, setQuery]     = useState("");
  const [dq, setDq]           = useState("");
  const [items, setItems]     = useState<VerifiedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDq(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p };
      if (dq) params.search = dq;
      const res  = await Get("pos/stock-returns/verified-items/", params) as any;
      const rows = extractVerifiedRows(res);
      setItems(rows);
      const body = res?.data ?? res;
      setTotal(body?.count ?? rows.length);
      setHasNext(!!body?.next);
      setPage(p);
    } catch { toasterrormsg("Could not load verified items."); }
    finally   { setLoading(false); }
  }, [dq]);

  useEffect(() => { if (isOpen) { setQuery(""); load(1); } }, [isOpen]);
  useEffect(() => { if (isOpen) load(1); }, [dq]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[210]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm dark:bg-black/50"
        />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={DialogPanel}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-700"
            >
              <div className="flex items-center justify-between bg-primary px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-white">Select Verified Item</h3>
                  <p className="mt-0.5 text-xs text-white/70">{total} items available</p>
                </div>
                <Button onClick={onClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
                  <XMarkIcon className="size-5" />
                </Button>
              </div>
              <div className="border-b border-gray-200 px-5 py-3 dark:border-dark-500">
                <Input value={query} onChange={e => setQuery(e.target.value)}
                  prefix={<MagnifyingGlassIcon className="size-4" />}
                  placeholder="Search item, barcode, transfer no…"
                  classNames={{ input: "h-9 text-sm" }} autoFocus
                />
              </div>
              <div className="max-h-[55vh] overflow-y-auto overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400 dark:text-dark-400">No verified items available.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-dark-800">
                      <tr>
                        {["Item Name","Variant","Barcode","Transfer No","From Branch","GST","Rem. Qty","Rate",""].map(h => (
                          <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-600 dark:text-dark-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const already   = addedItems.find(a => a.verifiedItemId === item.id);
                        const remaining = item.quantity - (already?.quantity ?? 0);
                        const disabled  = remaining <= 0;
                        return (
                          <tr key={item.id}
                            className={clsx(
                              "border-t border-gray-100 dark:border-dark-600",
                              disabled ? "opacity-40" : "hover:bg-gray-50 dark:hover:bg-dark-600",
                            )}>
                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-dark-100">{item.item_name}</td>
                            <td className="px-4 py-2.5 text-gray-600 dark:text-dark-200">{item.variant_info || "Default"}</td>
                            <td className="px-4 py-2.5  text-xs text-gray-500">{item.barcode || "—"}</td>
                            <td className="px-4 py-2.5 font-medium text-primary-600 dark:text-primary-400">{item.transfer_no}</td>
                            <td className="px-4 py-2.5 text-gray-600 dark:text-dark-200">{item.from_branch_name}</td>
                            <td className="px-4 py-2.5 text-center"><Badge color="info" variant="soft" className="text-xs">{item.taxSlab || "0%"}</Badge></td>
                            <td className="px-4 py-2.5 text-center font-semibold text-gray-700 dark:text-dark-200">{remaining}</td>
                            <td className="px-4 py-2.5 tabular-nums text-gray-700 dark:text-dark-200">₹{(item.rate ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-2.5">
                              <Button color="primary" className="h-7 rounded-md px-3 text-xs"
                                disabled={disabled}
                                onClick={() => { if (!disabled) { onPick(item); onClose(); } }}>
                                Select
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {total > 15 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-dark-500 text-sm text-gray-500">
                  <span>{total} items</span>
                  <div className="flex gap-2">
                    <Button variant="outlined" className="h-7 px-3 text-xs" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
                    <Button variant="outlined" className="h-7 px-3 text-xs" disabled={!hasNext} onClick={() => load(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
              <div className="flex justify-end border-t border-gray-200 px-5 py-3 dark:border-dark-500">
                <Button variant="outlined" className="px-6" onClick={onClose}>Close</Button>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// ── Display-only field (read-only styled box) ──────────────────────────────
function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">{label}</label>
      <div className="flex h-9 items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-200">
        {value || "—"}
      </div>
    </div>
  );
}

// ── Create Page ────────────────────────────────────────────────────────────
export default function NewStockReturnPage() {
  const navigate = useNavigate();

  const [returnNo, setReturnNo]         = useState("Loading…");
  const [toBranch, setToBranch]         = useState("Company");
  const [returnDate, setReturnDate]     = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote]                 = useState("");
  const [creating, setCreating]         = useState(false);

  const [modalOpen, setModalOpen]       = useState(false);
  const [addedItems, setAddedItems]     = useState<AddedItem[]>([]);
  const [uidCounter, setUidCounter]     = useState(1);

  // current entry row
  const EMPTY_CUR = {
    verifiedItemId: null as number | null,
    item_name: "", variant_info: "", barcode: "",
    hsnCode: "", taxSlab: "", rate: 0,
    maxQty: 0, quantity: "",
    transfer_no: "", from_branch_name: "",
  };
  const [cur, setCur] = useState(EMPTY_CUR);

  // Fetch voucher number + to-branch on mount
  useEffect(() => {
    Get("pos/stock-returns/", { page: 1, page_size: 1 }).then((res: any) => {
      const body = res?.data ?? res;
      const list = extractVerifiedRows(res) as any[];
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      const fyStart = m >= 4 ? y : y - 1;
      const fy = `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
      if (list.length > 0 && list[0]?.return_no) {
        const parts = list[0].return_no.split("/");
        if (parts.length === 3) {
          const [pfx, rfy, num] = parts;
          const n = parseInt(num, 10) || 0;
          setReturnNo(rfy === fy ? `${pfx}/${fy}/${String(n + 1).padStart(4, "0")}` : `SR/${fy}/0001`);
          return;
        }
      }
      setReturnNo(`SR/${fy}/0001`);
    }).catch(() => setReturnNo("Auto-generated"));

    Get("pos/user-branch/").then((res: any) => {
      const b = res?.data ?? res;
      setToBranch(b?.company_branch_name ?? b?.to_branch_name ?? "Company");
    }).catch(() => {});
  }, []);

  const pickItem = (item: VerifiedItem) => {
    const already   = addedItems.find(a => a.verifiedItemId === item.id);
    const remaining = item.quantity - (already?.quantity ?? 0);
    if (remaining <= 0) { toasterrormsg("Full quantity already added."); return; }
    setCur({
      verifiedItemId: item.id, item_name: item.item_name,
      variant_info: item.variant_info || "Default", barcode: item.barcode || "",
      hsnCode: item.hsnCode || "", taxSlab: item.taxSlab || "0%",
      rate: item.rate ?? 0, maxQty: remaining, quantity: "1",
      transfer_no: item.transfer_no, from_branch_name: item.from_branch_name,
    });
  };

  const handleAdd = () => {
    if (!cur.verifiedItemId) { toasterrormsg("Select an item first."); return; }
    const qty = Number(cur.quantity);
    if (!qty || qty <= 0) { toasterrormsg("Enter a valid quantity."); return; }
    if (qty > cur.maxQty) { toasterrormsg(`Max returnable: ${cur.maxQty}`); return; }
    setAddedItems(prev => {
      const idx = prev.findIndex(a => a.verifiedItemId === cur.verifiedItemId!);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, {
        uid: uidCounter, verifiedItemId: cur.verifiedItemId!,
        item_name: cur.item_name, variant_info: cur.variant_info,
        barcode: cur.barcode, hsnCode: cur.hsnCode, taxSlab: cur.taxSlab,
        rate: cur.rate, maxQty: cur.maxQty, quantity: qty,
        transfer_no: cur.transfer_no, from_branch_name: cur.from_branch_name,
      }];
    });
    setUidCounter(p => p + 1);
    setCur(EMPTY_CUR);
  };

  const handleSubmit = async () => {
    if (addedItems.length === 0) { toasterrormsg("Add at least one item."); return; }
    setCreating(true);
    try {
      const res = await Post("pos/stock-returns/create-from-items/", {
        return_date: returnDate,
        note,
        items: addedItems.map(i => ({ item_id: i.verifiedItemId, quantity: i.quantity })),
      }) as any;
      const body = res?.data ?? res;
      if (body?.success !== false) {
        toastsuccessmsg(body?.message ?? "Return created successfully.");
        navigate("/order-management/stock-return");
      } else {
        toasterrormsg(body?.message ?? "Failed to create return.");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message ?? "Error creating return.");
    } finally {
      setCreating(false);
    }
  };

  const totalQty    = addedItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = addedItems.reduce((s, i) => s + i.quantity * i.rate, 0);

  return (
    <Page title="New Stock Return">
      <div className="transition-content w-full pb-8">

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={() => navigate("/order-management/stock-return")}>
              <ArrowLeftIcon className="size-4" /> Back
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">New Stock Return</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Return verified items to company</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => { setAddedItems([]); setUidCounter(1); setCur(EMPTY_CUR); }}>
              <TrashIcon className="size-4 text-error-600" /> Clear All
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={handleSubmit} disabled={creating || addedItems.length === 0}>
              {creating
                ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                : <><CheckCircleIcon className="size-4" />Submit Return</>}
            </Button>
          </div>
        </div>

        {/* ── Return header fields ──────────────────────────────────── */}
        <div className="px-(--margin-x) mt-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-4">
            <h4 className="text-sm font-semibold text-primary-600 dark:text-primary-400">Return Details</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DatePicker
                label="Return Date"
                value={returnDate}
                onChange={(v: any) => setReturnDate(v || new Date().toISOString().split("T")[0])}
              />
              <ReadField label="Return No."  value={returnNo} />
              <ReadField label="To Branch"   value={toBranch} />
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Note (Optional)</label>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Reason for return…"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Item entry row ────────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-500 dark:bg-dark-750 space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
              <CubeIcon className="size-4" /> Item Entry
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9 items-end">
              <Button color="primary" variant="soft" className="h-9 gap-2 rounded-md px-3 text-sm"
                onClick={() => setModalOpen(true)}>
                <MagnifyingGlassIcon className="size-4" /> Select Item
              </Button>
              <ReadField label="Item Name"  value={cur.item_name} />
              <ReadField label="Variant"    value={cur.variant_info} />
              <ReadField label="HSN"        value={cur.hsnCode} />
              <ReadField label="GST"        value={cur.taxSlab} />
              <ReadField label="Rate ₹"     value={cur.rate ? cur.rate.toFixed(2) : ""} />
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                  Qty <span className="text-xs font-normal text-gray-400">(max {cur.maxQty})</span>
                </label>
                <input
                  type="number" min={0} max={cur.maxQty}
                  value={cur.quantity}
                  disabled={!cur.verifiedItemId}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === "") { setCur(p => ({ ...p, quantity: "" })); return; }
                    setCur(p => ({ ...p, quantity: String(Math.max(0, Math.min(Number(v), p.maxQty))) }));
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:disabled:bg-dark-600"
                />
              </div>
              <ReadField label="Amount ₹"
                value={cur.verifiedItemId ? (Number(cur.quantity || 0) * cur.rate).toFixed(2) : ""} />
              <Button color="primary" className="h-9 gap-2 rounded-md px-3 text-sm"
                disabled={!cur.verifiedItemId}
                onClick={handleAdd}>
                <PlusIcon className="size-4" /> Add
              </Button>
            </div>
            {cur.verifiedItemId && (
              <p className="text-xs text-gray-400 dark:text-dark-400">
                From transfer <span className="font-semibold text-gray-600 dark:text-dark-200">{cur.transfer_no}</span>
                {" "}· Branch: <span className="font-semibold text-gray-600 dark:text-dark-200">{cur.from_branch_name}</span>
              </p>
            )}
          </div>
        </div>

        {/* ── Added items table ─────────────────────────────────────── */}
        <div className="px-(--margin-x) mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-primary">
                <tr>
                  {["#","Item","Variant","HSN","GST","Qty","Rate","Amount",""].map(h => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {addedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">
                      <CubeIcon className="mx-auto mb-2 size-8 opacity-30" />
                      No items added yet — click "Select Item" to get started
                    </td>
                  </tr>
                ) : addedItems.map((item, idx) => (
                  <tr key={item.uid}
                    className="border-t border-gray-100 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-600">
                    <td className="px-4 py-2.5 text-gray-400 dark:text-dark-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-dark-100">{item.item_name}</td>
                    <td className="px-4 py-2.5">
                      <Badge color="info" variant="soft" className="text-xs">{item.variant_info}</Badge>
                    </td>
                    <td className="px-4 py-2.5  text-xs text-gray-500 dark:text-dark-300">{item.hsnCode || "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge color="info" variant="soft" className="text-xs">{item.taxSlab}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700 dark:text-dark-200">{item.quantity}</td>
                    <td className="px-4 py-2.5 tabular-nums text-gray-700 dark:text-dark-200">₹{item.rate.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-bold tabular-nums text-primary-600 dark:text-primary-400">
                      ₹{(item.quantity * item.rate).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Button isIcon variant="flat" className="size-7 rounded-full text-error-600"
                        onClick={() => setAddedItems(prev => prev.filter(i => i.uid !== item.uid))}>
                        <TrashIcon className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {addedItems.length > 0 && (
                <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-dark-800">
                  <tr className="border-t-2 border-gray-200 dark:border-dark-500">
                    <td colSpan={5} className="px-4 py-2.5 text-xs font-bold uppercase text-gray-600 dark:text-dark-200">Total</td>
                    <td className="px-4 py-2.5 font-bold text-gray-700 dark:text-dark-200">{totalQty}</td>
                    <td />
                    <td className="px-4 py-2.5 font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{totalAmount.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Info banner */}
        <div className="px-(--margin-x) mt-4">
          {addedItems.length > 0 ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary-700 dark:bg-primary/10 dark:text-primary-300">
              <span className="font-semibold">{addedItems.length}</span> items · Total Qty:{" "}
              <span className="font-semibold">{totalQty}</span> · Amount:{" "}
              <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20">
              No items added yet. Click "Select Item", set quantity, then click "Add".
            </div>
          )}
        </div>

      </div>

      {/* Item pick modal */}
      <ItemPickModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPick={pickItem}
        addedItems={addedItems}
      />
    </Page>
  );
}
