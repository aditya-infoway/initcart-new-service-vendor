import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon, CheckCircleIcon, CubeIcon,
  MagnifyingGlassIcon, PlusIcon, TrashIcon, XMarkIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Table, THead, TBody, Tr, Th, Td, Textarea } from "@/components/ui";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Get, Post, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface TransferHop {
  hop_type: string;
  hop_label: string;
  transfer_no: string;
  from_branch_name: string;
  to_branch_name: string;
  transfer_date: string;
  quantity: number;
  status: string;
}

interface EligibleItem {
  id: number;
  item_name: string;
  variant_info: string;
  barcode: string;
  size: string;
  color: string;
  hsnCode: string;
  taxSlab: string;
  quantity: number;
  original_quantity: number;
  returned_quantity: number;
  rate: number;
  branch_variant_id: number;
  company_variant_id: number | null;
  transfer_no: string;
  transfer_id: number;
  from_branch_name: string;
  transfer_date: string;
  transfer_chain: TransferHop[];
}

interface AddedItem {
  uid: number;
  eligibleItemId: number;
  item_name: string;
  variant_info: string;
  barcode: string;
  hsnCode: string;
  taxSlab: string;
  rate: number;
  maxQty: number;
  quantity: number;
  transfer_no: string;
  from_branch_name: string;
  transfer_chain: TransferHop[];
}

// ── GST Helpers ─────────────────────────────────────────────────────────────
const safeNum = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function calcGstSplitInclusive(
  rate: number,
  quantity: number,
  taxPercent: number,
  sameState: boolean | null
) {
  const netAmount = round2(rate * quantity);
  let basicAmount = netAmount;
  let tax = 0, cgst = 0, sgst = 0, igst = 0;

  if (taxPercent > 0) {
    tax = round2((netAmount * taxPercent) / 100);
    basicAmount = round2(netAmount - tax);
    if (sameState === true) {
      const half = round2(tax / 2);
      cgst = half;
      sgst = round2(tax - half);
    } else if (sameState === false) {
      igst = tax;
    }
  }
  return { basic: basicAmount, tax, cgst, sgst, igst, net: netAmount };
}

// ── Transfer Chain Trail Component ───────────────────────────────────────────
function TransferChainTrail({ chain, compact = false }: { chain: TransferHop[]; compact?: boolean }) {
  if (!chain || chain.length === 0) {
    return <Badge color="neutral" variant="soft" className="text-[10px] italic">Chain info unavailable</Badge>;
  }
  return (
    <div className={`flex items-center flex-wrap gap-1 ${compact ? "text-[10px]" : "text-xs"}`}>
      {chain.map((hop, idx) => (
        <Badge key={idx} color="primary" variant="soft" className={clsx("inline-flex items-center gap-1", compact && "text-[10px]")}>
          <BuildingOfficeIcon className={clsx("text-primary/60", compact ? "size-2" : "size-2.5")} />
          <span className="font-semibold whitespace-nowrap">{hop.from_branch_name}</span>
        </Badge>
      ))}
      <span className="text-primary/60">→</span>
      <Badge color="success" variant="soft" className={clsx("inline-flex items-center gap-1", compact && "text-[10px]")}>
        <BuildingOfficeIcon className={clsx("text-success", compact ? "size-2" : "size-2.5")} />
        <span className="font-semibold whitespace-nowrap">
          {chain[chain.length - 1].to_branch_name}
        </span>
      </Badge>
    </div>
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

// ── Section header helper ─────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
      <Icon className="size-4" /> {title}
    </div>
  );
}

// ── Item Pick Modal ────────────────────────────────────────────────────────
function ItemPickModal({
  isOpen, onClose, onPick, addedItems,
}: {
  isOpen: boolean; onClose: () => void;
  onPick: (item: EligibleItem) => void;
  addedItems: AddedItem[];
}) {
  const [query, setQuery] = useState("");
  const [dq, setDq] = useState("");
  const [items, setItems] = useState<EligibleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
      const res = await Get("pos/b2b-stock-returns/eligible-items/", params) as any;
      let rows: EligibleItem[] = [];
      if (res?.data?.results?.success) rows = res.data.results.data || [];
      else if (res?.data?.success) rows = res.data.data || [];
      setItems(rows);
      const body = res?.data ?? res;
      setTotal(body?.count ?? rows.length);
      setHasNext(!!body?.next);
      setPage(p);
    } catch { toasterrormsg("Could not load eligible items."); }
    finally { setLoading(false); }
  }, [dq]);

  useEffect(() => { if (isOpen) { setQuery(""); load(1); } }, [isOpen, load]);
  useEffect(() => { if (isOpen) load(1); }, [dq, load]);

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
              className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-700"
            >
              <div className="flex items-center justify-between bg-primary px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-white">Select B2B-Received Item to Return</h3>
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
                  <div className="py-16 text-center text-sm text-gray-400 dark:text-dark-400">No eligible B2B items available.</div>
                ) : (
                  <div className="min-w-full overflow-x-auto">
                    <Table hoverable className="w-full text-left">
                      <THead>
                        <Tr>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Action</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Item Name</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Variant</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Barcode</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Origin Trail</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">GST</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Remaining Qty</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Rate</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {items.map(item => {
                          const already = addedItems.find(a => a.eligibleItemId === item.id);
                          const remaining = item.quantity - (already?.quantity ?? 0);
                          const disabled = remaining <= 0;
                          return (
                            <Tr key={item.id} className={clsx("dark:border-b-dark-500 border-b border-gray-100", disabled && "opacity-40")}>
                              <Td className="bg-white dark:bg-dark-900">
                                <Button color="primary" className="h-7 rounded-md px-3 text-xs"
                                  disabled={disabled}
                                  onClick={() => { if (!disabled) { onPick(item); onClose(); } }}>
                                  Select
                                </Button>
                              </Td>
                              <Td className="bg-white dark:bg-dark-900 font-medium text-gray-800 dark:text-dark-100">{item.item_name}</Td>
                              <Td className="bg-white dark:bg-dark-900 text-gray-600 dark:text-dark-200">{item.variant_info || "Default"}</Td>
                              <Td className="bg-white dark:bg-dark-900  text-xs text-gray-500 dark:text-dark-300">{item.barcode || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900"><TransferChainTrail chain={item.transfer_chain} compact /></Td>
                              <Td className="bg-white dark:bg-dark-900 text-center"><Badge color="info" variant="soft" className="text-xs">{item.taxSlab || "0%"}</Badge></Td>
                              <Td className="bg-white dark:bg-dark-900 text-center font-semibold text-gray-700 dark:text-dark-200">{remaining}</Td>
                              <Td className="bg-white dark:bg-dark-900 tabular-nums text-gray-700 dark:text-dark-200">₹{(item.rate ?? 0).toFixed(2)}</Td>
                            </Tr>
                          );
                        })}
                      </TBody>
                    </Table>
                  </div>
                )}
              </div>
              {total > 15 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-dark-500 text-sm text-gray-500 dark:text-dark-400">
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

// ── Create Page ────────────────────────────────────────────────────────────
export default function CreateB2BStockReturnPage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [returnNo, setReturnNo] = useState("Loading…");
  const [toBranch, setToBranch] = useState("Company (Superadmin)");
  const [returnDate, setReturnDate] = useState(today);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [sameState, setSameState] = useState<boolean | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [uidCounter, setUidCounter] = useState(1);

  const EMPTY_CUR = {
    eligibleItemId: null as number | null,
    item_name: "", variant_info: "", barcode: "",
    hsnCode: "", taxSlab: "", rate: 0,
    maxQty: 0, quantity: "",
    transfer_no: "", from_branch_name: "", transfer_chain: [] as TransferHop[],
  };
  const [cur, setCur] = useState(EMPTY_CUR);

  const fetchReturnNo = useCallback(async () => {
    try {
      const res = await Get("pos/b2b-stock-returns/next-number-preview/") as any;
      if (res?.data?.success) {
        setReturnNo(res.data.next_return_no);
        setSameState(typeof res.data.same_state === "boolean" ? res.data.same_state : null);
      } else {
        setReturnNo("Will be generated on save");
      }
    } catch {
      setReturnNo("Will be generated on save");
    }
  }, []);

  useEffect(() => { fetchReturnNo(); }, [fetchReturnNo]);

  const pickItem = (item: EligibleItem) => {
    const alreadyAdded = addedItems.find((a) => a.eligibleItemId === item.id);
    const remaining = item.quantity - (alreadyAdded ? alreadyAdded.quantity : 0);
    if (remaining <= 0) {
      toasterrormsg("This item's full quantity is already added");
      return;
    }
    setCur({
      eligibleItemId: item.id,
      item_name: item.item_name,
      variant_info: item.variant_info || "Default",
      barcode: item.barcode || "-",
      hsnCode: item.hsnCode || "-",
      taxSlab: item.taxSlab || "0%",
      rate: item.rate || 0,
      maxQty: remaining,
      quantity: "1",
      transfer_no: item.transfer_no,
      from_branch_name: item.from_branch_name,
      transfer_chain: item.transfer_chain || [],
    });
  };

  const handleAddItem = () => {
    if (!cur.eligibleItemId) {
      toasterrormsg("Please select an item first");
      return;
    }
    const qty = Number(cur.quantity);
    if (!qty || qty <= 0) {
      toasterrormsg("Please enter a valid quantity");
      return;
    }
    if (qty > cur.maxQty) {
      toasterrormsg(`Max returnable quantity: ${cur.maxQty}`);
      return;
    }

    setAddedItems((prev) => {
      const existingIdx = prev.findIndex((a) => a.eligibleItemId === cur.eligibleItemId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + qty };
        return next;
      }
      return [
        ...prev,
        {
          uid: uidCounter,
          eligibleItemId: cur.eligibleItemId!,
          item_name: cur.item_name,
          variant_info: cur.variant_info,
          barcode: cur.barcode,
          hsnCode: cur.hsnCode,
          taxSlab: cur.taxSlab,
          rate: cur.rate,
          maxQty: cur.maxQty,
          quantity: qty,
          transfer_no: cur.transfer_no,
          from_branch_name: cur.from_branch_name,
          transfer_chain: cur.transfer_chain,
        },
      ];
    });
    setUidCounter((p) => p + 1);
    setCur(EMPTY_CUR);
  };

  const removeAddedItem = (uid: number) => {
    setAddedItems((prev) => prev.filter((i) => i.uid !== uid));
  };

  const totals = {
    totalQty: addedItems.reduce((s, i) => s + i.quantity, 0),
    totalAmount: addedItems.reduce((s, i) => s + i.quantity * i.rate, 0),
  };

  const gstTotals = addedItems.reduce(
    (acc, i) => {
      const taxPercent = safeNum(String(i.taxSlab).replace("%", ""));
      const g = calcGstSplitInclusive(i.rate, i.quantity, taxPercent, sameState);
      return {
        basic: acc.basic + g.basic, tax: acc.tax + g.tax,
        cgst: acc.cgst + g.cgst, sgst: acc.sgst + g.sgst,
        igst: acc.igst + g.igst, net: acc.net + g.net,
      };
    },
    { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 }
  );

  const createReturn = async () => {
    if (addedItems.length === 0) {
      toasterrormsg("Please add at least one item");
      return;
    }
    setCreating(true);
    try {
      const res = await Post("pos/b2b-stock-returns/create/", {
        return_date: returnDate,
        note: note,
        items: addedItems.map((i) => ({ item_id: i.eligibleItemId, quantity: i.quantity })),
      }) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message || "Return created successfully");
        navigate("/b2b-inventory/stock-return");
      } else {
        toasterrormsg(res?.data?.message || "Failed to create return");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Error creating return");
    } finally {
      setCreating(false);
    }
  };

  const handleClearAll = () => {
    setAddedItems([]);
    setUidCounter(1);
    setCur(EMPTY_CUR);
  };

  const itemsColSpan = 9;

  return (
    <Page title="New B2B Stock Return">
      <div className="transition-content w-full pb-8 space-y-4">

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={() => navigate("/b2b-inventory/stock-return")}>
              <ArrowLeftIcon className="size-4" /> Back
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">New B2B Stock Return</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Return B2B-received items to company</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={handleClearAll}>
              <TrashIcon className="size-4 text-error-600" /> Clear All
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={createReturn} disabled={creating || addedItems.length === 0}>
              {creating
                ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                : <><CheckCircleIcon className="size-4" />Submit Return</>}
            </Button>
          </div>
        </div>

        {/* ── Return header fields ──────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="p-4 space-y-4">
            <SectionHeader icon={CheckCircleIcon} title="Return Details" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DatePicker
                label="Return Date"
                value={returnDate}
                onChange={(v: any) => setReturnDate(v || new Date().toISOString().split("T")[0])}
              />
              <ReadField label="Return No."  value={returnNo} />
              <ReadField label="To Branch"   value={toBranch} />
              <div>
                <Textarea
                  label="Note (Optional)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Reason for return…"
                  rows={2}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Item entry row ────────────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="p-4 space-y-4">
            <SectionHeader icon={CubeIcon} title="Item Entry" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9 items-end">
              <Button color="primary" variant="soft" className="h-9 gap-2 rounded-md px-3 text-sm"
                onClick={() => setModalOpen(true)}>
                <MagnifyingGlassIcon className="size-4" /> Select Item
              </Button>
              <ReadField label="Item Name" value={cur.item_name} />
              <ReadField label="Variant" value={cur.variant_info} />
              <ReadField label="HSN" value={cur.hsnCode} />
              <ReadField label="GST" value={cur.taxSlab} />
              <ReadField label="Rate ₹" value={cur.rate ? cur.rate.toFixed(2) : ""} />
              <div>
                <Input
                  type="number" min={0} max={cur.maxQty}
                  label={<>Qty <span className="text-xs font-normal text-gray-400">(max {cur.maxQty})</span></>}
                  value={cur.quantity}
                  disabled={!cur.eligibleItemId}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === "") { setCur(p => ({ ...p, quantity: "" })); return; }
                    setCur(p => ({ ...p, quantity: String(Math.max(0, Math.min(Number(v), p.maxQty))) }));
                  }}
                />
              </div>
              <ReadField label="Amount ₹" value={cur.eligibleItemId ? (Number(cur.quantity || 0) * cur.rate).toFixed(2) : ""} />
              <Button color="primary" className="h-9 gap-2 rounded-md px-3 text-sm"
                disabled={!cur.eligibleItemId}
                onClick={handleAddItem}>
                <PlusIcon className="size-4" /> Add
              </Button>
          </div>

            {cur.eligibleItemId && (
              <p className="text-xs text-gray-400 dark:text-dark-400">
                From transfer <span className="font-semibold text-gray-600 dark:text-dark-200">{cur.transfer_no}</span>
                {" "}· Branch: <span className="font-semibold text-gray-600 dark:text-dark-200">{cur.from_branch_name}</span>
              </p>
            )}
          </Card>
        </div>

        {/* ── Added items table ─────────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="overflow-hidden">
            <div className="overflow-x-auto max-h-80">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    {["#","Item","Variant","HSN","GST","Qty","Rate","Amount",""].map(h => (
                      <Th key={h} className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">{h}</Th>
                    ))}
                  </Tr>
                </THead>
                <TBody>
                  {addedItems.length === 0 ? (
                    <Tr>
                      <Td colSpan={itemsColSpan} className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">
                        <CubeIcon className="mx-auto mb-2 size-8 opacity-30" />
                        No items added yet — click "Select Item" to get started
                      </Td>
                    </Tr>
                  ) : addedItems.map((item, idx) => (
                    <Tr key={item.uid} className="dark:border-b-dark-500 border-b border-gray-100">
                      <Td className="bg-white dark:bg-dark-900 text-gray-400 dark:text-dark-400">{idx + 1}</Td>
                      <Td className="bg-white dark:bg-dark-900 font-medium text-gray-800 dark:text-dark-100">{item.item_name}</Td>
                      <Td className="bg-white dark:bg-dark-900">
                        <Badge color="info" variant="soft" className="text-xs">{item.variant_info}</Badge>
                      </Td>
                      <Td className="bg-white dark:bg-dark-900  text-xs text-gray-500 dark:text-dark-300">{item.hsnCode || "—"}</Td>
                      <Td className="bg-white dark:bg-dark-900">
                        <Badge color="info" variant="soft" className="text-xs">{item.taxSlab}</Badge>
                      </Td>
                      <Td className="bg-white dark:bg-dark-900 font-semibold text-gray-700 dark:text-dark-200">{item.quantity}</Td>
                      <Td className="bg-white dark:bg-dark-900 tabular-nums text-gray-700 dark:text-dark-200">₹{item.rate.toFixed(2)}</Td>
                      <Td className="bg-white dark:bg-dark-900 font-bold tabular-nums text-primary-600 dark:text-primary-400">
                        ₹{(item.quantity * item.rate).toFixed(2)}
                      </Td>
                      <Td className="bg-white dark:bg-dark-900">
                        <Button isIcon variant="flat" className="size-7 rounded-full text-error-600"
                          onClick={() => removeAddedItem(item.uid)}>
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
                {addedItems.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-dark-800">
                    <tr className="border-t-2 border-gray-200 dark:border-dark-500">
                      <td colSpan={5} className="px-4 py-2.5 text-xs font-bold uppercase text-gray-600 dark:text-dark-200">Total</td>
                      <td className="px-4 py-2.5 font-bold text-gray-700 dark:text-dark-200">{totals.totalQty}</td>
                      <td />
                      <td className="px-4 py-2.5 font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{totals.totalAmount.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>
          </Card>
        </div>

        {/* Info banner */}
        <div className="px-(--margin-x)">
          {addedItems.length > 0 ? (
            <Card skin="bordered" className="p-4 border-primary/20 bg-primary/5 dark:bg-primary/10 text-sm text-primary-700 dark:text-primary-300">
              <span className="font-semibold">{addedItems.length}</span> items · Total Qty:{" "}
              <span className="font-semibold">{totals.totalQty}</span> · Amount:{" "}
              <span className="font-semibold">₹{totals.totalAmount.toFixed(2)}</span>
            </Card>
          ) : (
            <Card skin="bordered" className="p-4 border-warning/30 bg-warning/5 dark:bg-warning/10 text-sm text-warning-700 dark:text-warning-400">
              No items added yet. Click "Select Item", set quantity, then click "Add".
            </Card>
          )}
        </div>


        {/* Item Selection Modal */}
        <ItemPickModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onPick={pickItem}
          addedItems={addedItems}
        />
      </div>
    </Page>
  );
}
