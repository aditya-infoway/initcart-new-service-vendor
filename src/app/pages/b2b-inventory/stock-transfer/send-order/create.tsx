import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon, CheckCircleIcon, CubeIcon,
  MagnifyingGlassIcon, PlusIcon, TrashIcon, XMarkIcon,
  DocumentCheckIcon, BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, SetStateAction, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Table, THead, TBody, Tr, Th, Td, Textarea } from "@/components/ui";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, Post, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface SourceBranch {
  branch_id: number;
  branch_name: string;
  city: string;
  state: string;
  credit_term: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface VariantOption {
  variant_id: number;
  variant_label: string;
  size: string | null;
  color: string | null;
  barcode: string | null;
  branch_price: number;
  hsnCode?: string;
  taxSlab?: string;
}

interface SourceItem {
  item_id: number;
  item_name: string;
  category: string | null;
  hsnCode?: string;
  taxSlab?: string;
  variant_count: number;
  variants: VariantOption[];
}

interface CartRow {
  source_variant_id: number;
  item_name: string;
  variant_label: string;
  requested_quantity: number;
  size: string | null;
  color: string | null;
  barcode: string | null;
  hsnCode: string | null;
  taxSlab: string | null;
  branch_price: number;
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
  isOpen, onClose, onPick, sourceBranchId, addedVariantIds,
}: {
  isOpen: boolean; onClose: () => void;
  onPick: (item: SourceItem, variant: VariantOption) => void;
  sourceBranchId: string;
  addedVariantIds: Set<number>;
}) {
  const [query, setQuery] = useState("");
  const [dq, setDq] = useState("");
  const [items, setItems] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDq(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (p = 1) => {
    if (!sourceBranchId) return;
    setLoading(true);
    try {
      const params: any = { page: p };
      if (dq) params.search = dq;
      const res = await Get(`pos/b2b-source-branch-items/${sourceBranchId}/`, params) as any;
      let rows: SourceItem[] = [];
      if (res?.data?.results?.success) rows = res.data.results.data || [];
      else if (res?.data?.success) rows = res.data.data || [];
      setItems(rows);
      const body = res?.data ?? res;
      setTotal(body?.count ?? rows.length);
      setHasNext(!!body?.next);
      setPage(p);
    } catch { toasterrormsg("Could not load items."); }
    finally { setLoading(false); }
  }, [dq, sourceBranchId]);

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
                  <h3 className="text-base font-bold text-white">Select Item from Source Branch</h3>
                  <p className="mt-0.5 text-xs text-white/70">{total} items available</p>
                </div>
                <Button onClick={onClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
                  <XMarkIcon className="size-5" />
                </Button>
              </div>
              <div className="border-b border-gray-200 px-5 py-3 dark:border-dark-500">
                <Input value={query} onChange={e => setQuery(e.target.value)}
                  prefix={<MagnifyingGlassIcon className="size-4" />}
                  placeholder="Search item, barcode, size, color…"
                  classNames={{ input: "h-9 text-sm" }} autoFocus
                />
              </div>
              <div className="max-h-[55vh] overflow-y-auto overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400 dark:text-dark-400">No items available.</div>
                ) : (
                  <div className="min-w-full overflow-x-auto">
                    <Table hoverable className="w-full text-left">
                      <THead>
                        <Tr>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Action</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Item Name</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Variant</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Size</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Color</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Barcode</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">HSN</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">GST%</Th>
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Price ₹</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {items.flatMap(item => item.variants.map(variant => {
                          const inCart = addedVariantIds.has(variant.variant_id);
                          return (
                            <Tr key={`${item.item_id}-${variant.variant_id}`} className={clsx("dark:border-b-dark-500 border-b border-gray-100", inCart && "opacity-40")}>
                              <Td className="bg-white dark:bg-dark-900">
                                {inCart ? (
                                  <Badge color="primary" variant="soft" className="text-xs font-semibold">✓ Added</Badge>
                                ) : (
                                  <Button color="primary" className="h-7 rounded-md px-3 text-xs"
                                    onClick={() => { onPick(item, variant); onClose(); }}>
                                    Select
                                  </Button>
                                )}
                              </Td>
                              <Td className="bg-white dark:bg-dark-900 font-medium text-gray-800 dark:text-dark-100">
                                {item.item_name}
                                {item.category && <div className="text-xs text-gray-400">{item.category}</div>}
                              </Td>
                              <Td className="bg-white dark:bg-dark-900">
                                <Badge color="info" variant="soft" className="text-xs">{variant.variant_label}</Badge>
                              </Td>
                              <Td className="bg-white dark:bg-dark-900 text-gray-600 dark:text-dark-200">{variant.size || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900 text-gray-600 dark:text-dark-200">{variant.color || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900  text-xs text-gray-500 dark:text-dark-300">{variant.barcode || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900  text-xs text-gray-500 dark:text-dark-300">{variant.hsnCode || item.hsnCode || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900 text-center">
                                <Badge color="info" variant="soft" className="text-xs">{variant.taxSlab || item.taxSlab || "0%"}</Badge>
                              </Td>
                              <Td className="bg-white dark:bg-dark-900 tabular-nums text-gray-700 dark:text-dark-200">₹{variant.branch_price}</Td>
                            </Tr>
                          );
                        }))}
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

// ── Main Create Page Component ─────────────────────────────────────────────
export default function CreateB2BOrderPage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [orderNo, setOrderNo] = useState("Loading…");
  const [orderDate, setOrderDate] = useState(today);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [sameState, setSameState] = useState<boolean | null>(null);

  const [branches, setBranches] = useState<SourceBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<(SourceBranch & { label: string; value: string }) | null>(null);
  const [creditTerm, setCreditTerm] = useState("");
  const [destBranchDetails, setDestBranchDetails] = useState<SourceBranch | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [cart, setCart] = useState<CartRow[]>([]);

  const EMPTY_CUR = {
    source_variant_id: null as number | null,
    item_name: "", variant_label: "", size: null as string | null, color: null as string | null,
    barcode: null as string | null, hsnCode: null as string | null, taxSlab: null as string | null,
    branch_price: 0, quantity: "",
  };
  const [cur, setCur] = useState(EMPTY_CUR);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const res = await Get("pos/b2b-source-branches/", {}) as any;
      if (res?.data?.success) setBranches(res.data.data || []);
    } catch { toasterrormsg("Could not load branches"); }
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  // Update dest branch details
  useEffect(() => {
    if (selectedBranch) {
      setDestBranchDetails(selectedBranch);
      setCreditTerm(selectedBranch.credit_term || "");
    } else {
      setDestBranchDetails(null);
      setCreditTerm("");
    }
  }, [selectedBranch]);

  // Fetch order number preview
  const fetchOrderNo = useCallback(async () => {
    try {
      const res = await Get("pos/b2b-orders/next-number-preview/", {}) as any;
      if (res?.data?.success) {
        setOrderNo(res.data.next_order_id);
        setSameState(typeof res.data.same_state === "boolean" ? res.data.same_state : null);
      } else {
        setOrderNo("Will be generated on save");
      }
    } catch {
      setOrderNo("Will be generated on save");
    }
  }, []);

  useEffect(() => { fetchOrderNo(); }, [fetchOrderNo]);

  const pickItem = (item: SourceItem, variant: VariantOption) => {
    if (cart.find((c) => c.source_variant_id === variant.variant_id)) {
      toasterrormsg("Already added — adjust quantity below");
      return;
    }
    setCur({
      source_variant_id: variant.variant_id,
      item_name: item.item_name,
      variant_label: variant.variant_label,
      size: variant.size,
      color: variant.color,
      barcode: variant.barcode,
      hsnCode: variant.hsnCode || item.hsnCode || null,
      taxSlab: variant.taxSlab || item.taxSlab || null,
      branch_price: variant.branch_price,
      quantity: "1",
    });
  };

  const handleAddItem = () => {
    if (!cur.source_variant_id) {
      toasterrormsg("Please select an item first");
      return;
    }
    const qty = Number(cur.quantity);
    if (!qty || qty <= 0) {
      toasterrormsg("Please enter a valid quantity");
      return;
    }
    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.source_variant_id === cur.source_variant_id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], requested_quantity: next[existingIdx].requested_quantity + qty };
        return next;
      }
      return [
        ...prev,
        {
          source_variant_id: cur.source_variant_id!,
          item_name: cur.item_name,
          variant_label: cur.variant_label,
          requested_quantity: qty,
          size: cur.size,
          color: cur.color,
          barcode: cur.barcode,
          hsnCode: cur.hsnCode,
          taxSlab: cur.taxSlab,
          branch_price: cur.branch_price,
        },
      ];
    });
    setCur(EMPTY_CUR);
  };

  const removeCartItem = (source_variant_id: number) => {
    setCart((prev) => prev.filter((c) => c.source_variant_id !== source_variant_id));
  };

  const updateCartQty = (source_variant_id: number, qty: number) => {
    setCart((prev) => prev.map((c) => c.source_variant_id === source_variant_id ? { ...c, requested_quantity: Math.max(1, qty) } : c));
  };

  const totals = {
    totalQty: cart.reduce((s, c) => s + c.requested_quantity, 0),
    totalAmount: cart.reduce((s, c) => s + c.requested_quantity * c.branch_price, 0),
  };

  const gstTotals = cart.reduce(
    (acc, i) => {
      const taxPercent = safeNum(String(i.taxSlab).replace("%", ""));
      const g = calcGstSplitInclusive(i.branch_price, i.requested_quantity, taxPercent, sameState);
      return {
        basic: acc.basic + g.basic, tax: acc.tax + g.tax,
        cgst: acc.cgst + g.cgst, sgst: acc.sgst + g.sgst,
        igst: acc.igst + g.igst, net: acc.net + g.net,
      };
    },
    { basic: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, net: 0 }
  );

  const createOrder = async () => {
    if (!selectedBranch) {
      toasterrormsg("Select To Branch");
      return;
    }
    if (cart.length === 0) {
      toasterrormsg("Please add at least one item");
      return;
    }
    setCreating(true);
    try {
      const res = await Post("pos/b2b-orders/", {
        source_branch_id: selectedBranch.branch_id,
        note: note,
        items: cart.map((c) => ({ source_variant_id: c.source_variant_id, requested_quantity: c.requested_quantity })),
      }) as any;
      if (res?.data?.success) {
        toastsuccessmsg(`Order ${res.data.order_id} placed!`);
        navigate("/b2b-inventory/stock-transfer/send-order");
      } else {
        toasterrormsg(res?.data?.message || "Failed to place order");
      }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.message || "Error placing order");
    }
    setCreating(false);
  };

  const handleClearAll = () => {
    setCart([]);
    setCur(EMPTY_CUR);
    setSelectedBranch(null);
  };

  const addedVariantIds = new Set(cart.map((c) => c.source_variant_id));
  const cartColSpan = 13;

  return (
    <Page title="New B2B Order Request">
      <div className="transition-content w-full pb-8 space-y-4">
        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={() => navigate("/b2b-inventory/stock-transfer/send-order")}>
              <ArrowLeftIcon className="size-4" /> Back
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">New B2B Order Request</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Order stock directly from another branch</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outlined" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={handleClearAll}>
              <TrashIcon className="size-4 text-error-600" /> Clear All
            </Button>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm" onClick={createOrder} disabled={creating || cart.length === 0 || !selectedBranch}>
              {creating ? (
                <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Placing...</>
              ) : (
                <><CheckCircleIcon className="size-4" />Place Order</>
              )}
            </Button>
          </div>
        </div>

        {/* Order Details */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="p-4 space-y-4">
            <SectionHeader icon={DocumentCheckIcon} title="Order Details" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReadField label="From Branch" value={getMyBranchName()} />
              <div>
                <Combobox
                  value={selectedBranch}
                  onChange={(value: SetStateAction<(SourceBranch & { label: string; value: string; }) | null>) => { setSelectedBranch(value); setCart([]); }}
                  label="To Branch *"
                  data={branches.map((b) => ({
                    ...b,
                    label: b.branch_name,
                    value: String(b.branch_id),
                  }))}
                  searchFields={["label"]}
                  placeholder="Select branch..."
                />
              </div>
              <ReadField label="Order No." value={orderNo} />
              <DatePicker
                label="Order Date"
                value={orderDate}
                onChange={(v: any) => setOrderDate(v || new Date().toISOString().split("T")[0])}
              />
              <ReadField label="Term" value={creditTerm || "Credit"} />
              <div className="lg:col-span-2">
                <Textarea
                  label="Note (Optional)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Optional note..."
                  rows={2}
                />
              </div>
            </div>

            {selectedBranch && destBranchDetails && (
              <Card skin="bordered" className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-blue-900/10">
                <div className="flex items-center gap-2 mb-3">
                  <BuildingOfficeIcon className="size-4 text-primary" />
                  <span className="text-xs font-bold text-primary-800 dark:text-primary-300 uppercase tracking-wide">To Branch: {destBranchDetails.branch_name}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-500 text-xs dark:text-dark-400">Owner:</span><div className="font-medium text-gray-700 dark:text-dark-200">{destBranchDetails.owner_name || "—"}</div></div>
                  <div><span className="text-gray-500 text-xs dark:text-dark-400">Phone:</span><div className="font-medium text-gray-700 dark:text-dark-200">{destBranchDetails.phone || "—"}</div></div>
                  <div><span className="text-gray-500 text-xs dark:text-dark-400">Email:</span><div className="font-medium text-gray-700 dark:text-dark-200 text-xs truncate">{destBranchDetails.email || "—"}</div></div>
                  <div><span className="text-gray-500 text-xs dark:text-dark-400">Address:</span><div className="font-medium text-gray-700 dark:text-dark-200 text-xs">{destBranchDetails.address || "—"}</div></div>
                </div>
              </Card>
            )}
          </Card>
        </div>

        {/* Item Entry */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="p-4 space-y-4">
            <SectionHeader icon={CubeIcon} title="Item Entry" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9 items-end">
                <Button color="primary" variant="soft" className="h-9 gap-2 rounded-md px-3 text-sm" onClick={() => setModalOpen(true)} disabled={!selectedBranch}>
                <MagnifyingGlassIcon className="size-4" /> Select Item
              </Button>
              <ReadField label="Item Name" value={cur.item_name} />
              <ReadField label="Variant" value={cur.variant_label} />
              <ReadField label="Size / Color" value={[cur.size, cur.color].filter(Boolean).join(" / ") || ""} />
              <ReadField label="HSN" value={cur.hsnCode || ""} />
              <ReadField label="GST" value={cur.taxSlab || ""} />
              <ReadField label="Price ₹" value={cur.branch_price ? cur.branch_price.toFixed(2) : ""} />
              <div>
                <Input
                  type="number" min={1}
                  label="Qty"
                  value={cur.quantity}
                  disabled={!cur.source_variant_id}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === "") { setCur(p => ({ ...p, quantity: "" })); return; }
                    setCur(p => ({ ...p, quantity: String(Math.max(0, Number(v))) }));
                  }}
                />
              </div>
              <Button color="primary" className="h-9 gap-2 rounded-md px-3 text-sm" disabled={!cur.source_variant_id} onClick={handleAddItem}>
                <CheckCircleIcon className="size-4" /> Add
              </Button>
            </div>
            {cur.source_variant_id && (
              <p className="text-xs text-gray-400 dark:text-dark-400">
                Barcode: <span className="font-semibold text-gray-600 dark:text-dark-200">{cur.barcode || "—"}</span>
              </p>
            )}
          </Card>
        </div>

        {/* Cart Table */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="overflow-hidden">
            <div className="overflow-x-auto max-h-80">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    {["#","Item","Variant","Size","Color","Barcode","HSN","GST","Qty","Price","Amount",""].map(h => (
                      <Th key={h} className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">{h}</Th>
                    ))}
                  </Tr>
                </THead>
                <TBody>
                  {cart.length === 0 ? (
                    <Tr>
                      <Td colSpan={cartColSpan} className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">
                        <CubeIcon className="mx-auto mb-2 size-8 opacity-30" />
                        No items added yet — click "Select Item" to get started
                      </Td>
                    </Tr>
                  ) : cart.map((item, idx) => (
                    <Tr key={item.source_variant_id} className="dark:border-b-dark-500 border-b border-gray-100">
                      <Td className="bg-white dark:bg-dark-900 text-gray-400 dark:text-dark-400">{idx + 1}</Td>
                      <Td className="bg-white dark:bg-dark-900 font-medium text-gray-800 dark:text-dark-100">{item.item_name}</Td>
                      <Td className="bg-white dark:bg-dark-900">
                        <Badge color="info" variant="soft" className="text-xs">{item.variant_label}</Badge>
                      </Td>
                      <Td className="bg-white dark:bg-dark-900 text-xs text-gray-500 dark:text-dark-300">{item.size || "—"}</Td>
                      <Td className="bg-white dark:bg-dark-900 text-xs text-gray-500 dark:text-dark-300">{item.color || "—"}</Td>
                      <Td className="bg-white dark:bg-dark-900  text-xs text-gray-500 dark:text-dark-300">{item.barcode || "—"}</Td>
                      <Td className="bg-white dark:bg-dark-900  text-xs text-gray-500 dark:text-dark-300">{item.hsnCode || "—"}</Td>
                      <Td className="bg-white dark:bg-dark-900">
                        <Badge color="info" variant="soft" className="text-xs">{item.taxSlab || "0%"}</Badge>
                      </Td>
                      <Td className="bg-white dark:bg-dark-900">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button isIcon variant="flat" className="size-6 rounded-full text-gray-500" disabled={item.requested_quantity <= 1} onClick={() => updateCartQty(item.source_variant_id, item.requested_quantity - 1)}>
                            <XMarkIcon className="size-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{item.requested_quantity}</span>
                          <Button isIcon variant="flat" className="size-6 rounded-full text-gray-500" onClick={() => updateCartQty(item.source_variant_id, item.requested_quantity + 1)}>
                            <PlusIcon className="size-3" />
                          </Button>
                        </div>
                      </Td>
                      <Td className="bg-white dark:bg-dark-900 tabular-nums text-gray-700 dark:text-dark-200">₹{item.branch_price.toFixed(2)}</Td>
                      <Td className="bg-white dark:bg-dark-900 font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{(item.requested_quantity * item.branch_price).toFixed(2)}</Td>
                      <Td className="bg-white dark:bg-dark-900">
                        <Button isIcon variant="flat" className="size-7 rounded-full text-error-600" onClick={() => removeCartItem(item.source_variant_id)}>
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
                {cart.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-dark-800">
                    <tr className="border-t-2 border-gray-200 dark:border-dark-500">
                      <td colSpan={8} className="px-4 py-2.5 text-xs font-bold uppercase text-gray-600 dark:text-dark-200">Total</td>
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
          {cart.length > 0 ? (
            <Card skin="bordered" className="p-4 border-primary/20 bg-primary/5 dark:bg-primary/10 text-sm text-primary-700 dark:text-primary-300">
              <span className="font-semibold">{cart.length}</span> items · Total Qty:{" "}
              <span className="font-semibold">{totals.totalQty}</span> · Amount:{" "}
              <span className="font-semibold">₹{totals.totalAmount.toFixed(2)}</span>
            </Card>
          ) : (
            <Card skin="bordered" className="p-4 border-warning/30 bg-warning/5 dark:bg-warning/10 text-sm text-warning-700 dark:text-warning-400">
              No items added yet. Select a branch, click "Select Item", enter quantity, then click "Add".
            </Card>
          )}
        </div>

        {/* Item Selection Modal */}
        <ItemPickModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onPick={pickItem}
          sourceBranchId={selectedBranch ? String(selectedBranch.branch_id) : ""}
          addedVariantIds={addedVariantIds}
        />
      </div>
    </Page>
  );
}

// Helper function to get my branch name
function getMyBranchName(): string {
  try {
    const b = sessionStorage.getItem("branch");
    return b ? JSON.parse(b).branch_name || "" : "";
  } catch { return ""; }
}
