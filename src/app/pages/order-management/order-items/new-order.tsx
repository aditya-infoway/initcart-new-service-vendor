import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon,
  QrCodeIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  XMarkIcon,
  BanknotesIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input } from "@/components/ui";
import { formatDateDDMMYYYY, Get, Post, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { CartItem, CompanyItem, extractCompanyItemRows } from "./data";

const cartKey = (c: CompanyItem) => `${c.id}__${c.variantId}`;

// ── Item Selector Modal ──────────────────────────────────────────────────────
function ItemSelectorModal({
  open, onClose, cartItems, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onSelect: (item: CompanyItem) => void;
}) {
  const [items, setItems] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const openRef = useRef(false);
  const requestSeq = useRef(0);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { pageRef.current = page; }, [page]);

  const fetchItems = useCallback(async (pg: number, reset = false) => {
    if (loadingRef.current) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const res = await Get("pos/branch-orders/company-items/", { page: pg }) as any;
      if (!openRef.current || seq !== requestSeq.current) return;
      const body = res?.data ?? res;
      const { items: rows, count, hasMore: more } = extractCompanyItemRows(body);
      setItems(prev => reset ? rows : [...prev, ...rows]);
      setHasMore(more);
      setTotalCount(prevCount => (count > 0 ? count : (reset ? rows.length : prevCount)));
    } catch {
      if (openRef.current && seq === requestSeq.current) {
        toasterrormsg("Failed to load items.");
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setPage(1);
    setSearch("");
    setTotalCount(0);
    setHasMore(true);
    pageRef.current = 1;
    hasMoreRef.current = true;
    requestSeq.current++;
    fetchItems(1, true);
  }, [open, fetchItems]);

  // infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMoreRef.current && !loadingRef.current && openRef.current) {
        const next = pageRef.current + 1;
        setPage(next);
        pageRef.current = next;
        fetchItems(next);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchItems]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      i.itemName.toLowerCase().includes(q) ||
      i.barcode.toLowerCase().includes(q) ||
      i.globalItemCode.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      (i.size && i.size !== "—" && i.size.toLowerCase().includes(q)) ||
      (i.color && i.color !== "—" && i.color.toLowerCase().includes(q)) ||
      i.variant.toLowerCase().includes(q) ||
      i.hsn.includes(q),
    );
  }, [items, search]);

  const addedKeys = new Set(cartItems.map(cartKey));

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
            <TransitionChild
              as={DialogPanel}
              enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-6xl rounded-2xl bg-white dark:bg-dark-800 shadow-2xl overflow-hidden border border-gray-200 dark:border-dark-600"
            >
              {/* Modal header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-dark-600">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ShoppingBagIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-dark-100">Select Company Item</h3>
                    <p className="text-xs text-gray-500 dark:text-dark-300">Pick a variant to add to your order request</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {totalCount > 0 && (
                    <Badge color="info">{totalCount} total variants</Badge>
                  )}
                  <Badge color={filtered.length > 0 ? "success" : "warning"}>
                    {filtered.length} item{filtered.length === 1 ? "" : "s"} found
                  </Badge>
                  <button onClick={onClose} className="grid size-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700 transition">
                    <XMarkIcon className="size-5" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="bg-gray-50/70 dark:bg-dark-700/50 border-b border-gray-200 dark:border-dark-600 px-5 py-3">
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  prefix={<MagnifyingGlassIcon className="size-4" />}
                  classNames={{ input: "h-10 text-sm bg-white dark:bg-dark-800" }}
                  placeholder="Search by name, category, barcode, HSN, size, color, global code..." />
              </div>

              {/* Table */}
              <div className="max-h-[65vh] overflow-y-auto">
                {filtered.length === 0 && !loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="grid size-16 place-items-center rounded-2xl bg-gray-100 dark:bg-dark-700 text-gray-400 mb-3">
                      <InformationCircleIcon className="size-8" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-dark-200">No items match your search</p>
                    <p className="text-xs text-gray-500 dark:text-dark-300 mt-1">Try a different keyword or clear the search.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
                        {["Action", "Item Name", "Variant", "Size", "Color", "Barcode", "HSN", "GST%", "Branch ₹", "Stock"].map(h => (
                          <th key={h} className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const key = cartKey(item);
                        const added = addedKeys.has(key);
                        return (
                          <tr key={`${item.id}-${item.variantId}`} className={clsx(
                            "border-b border-gray-100 transition-colors dark:border-dark-700",
                            added ? "bg-emerald-50/70 dark:bg-emerald-500/10" : "hover:bg-gray-50 dark:hover:bg-dark-700/60",
                          )}>
                            <td className="px-3 py-2.5">
                              {added ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircleIcon className="size-3.5" /> Added
                                </span>
                              ) : (
                                <Button color="primary" className="h-7 gap-1 rounded-full px-3 text-xs"
                                  onClick={() => onSelect(item)}>
                                  <PlusIcon className="size-3" /> Select
                                </Button>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-gray-800 dark:text-dark-100">{item.itemName}</p>
                              <p className="text-[11px] text-gray-500 dark:text-dark-300">{item.category}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary dark:text-primary-400">{item.variant}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 dark:text-dark-300 text-xs">{item.size}</td>
                            <td className="px-3 py-2.5 text-gray-500 dark:text-dark-300 text-xs">{item.color}</td>
                            <td className="px-3 py-2.5  text-[11px] text-gray-500 dark:text-dark-300">{item.barcode || "—"}</td>
                            <td className="px-3 py-2.5 text-gray-600 dark:text-dark-200 text-xs">{item.hsn || "—"}</td>
                            <td className="px-3 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                              {item.gstPercent ? `${item.gstPercent}%` : "—"}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-dark-100">₹{item.price}</td>
                            <td className="px-3 py-2.5">
                              <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                item.stock > 50
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                  : item.stock > 0
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                                    : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300")}>
                                {item.stock}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr><td colSpan={10}><div ref={loaderRef} className="h-4" /></td></tr>
                      {loading && (
                        <tr><td colSpan={10} className="py-4 text-center text-xs text-gray-400">Loading more...</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/70 dark:bg-dark-700/40 dark:border-dark-600 px-5 py-3">
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  Showing <span className="font-semibold text-gray-700 dark:text-dark-100">{filtered.length}</span> of <span className="font-semibold text-gray-700 dark:text-dark-100">{totalCount || items.length}</span> variants
                </p>
                <Button variant="outlined" className="px-6" onClick={onClose}>Close</Button>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// ── New Order Page ────────────────────────────────────────────────────────────
export default function NewOrderPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CompanyItem | null>(null);
  const [qty, setQty] = useState(1);

  const today = useMemo(() => formatDateDDMMYYYY(new Date().toISOString()), []);

  const handleSelect = (item: CompanyItem) => {
    setSelectedItem(item);
    setQty(1);
    setModalOpen(false);
  };

  const handleAdd = () => {
    if (!selectedItem) return;
    if (qty < 1) { toasterrormsg("Quantity must be at least 1."); return; }
    if (qty > selectedItem.stock) { toasterrormsg(`Max available stock is ${selectedItem.stock}.`); return; }
    setCart(prev => {
      const key = cartKey(selectedItem);
      const exists = prev.find(c => cartKey(c) === key);
      if (exists) return prev.map(c => cartKey(c) === key ? { ...c, qty } : c);
      return [...prev, { ...selectedItem, qty }];
    });
    toastsuccessmsg(`${selectedItem.itemName} (${selectedItem.variant}) added.`);
    setSelectedItem(null);
    setQty(1);
  };

  const updateQty = (k: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (cartKey(c) !== k) return c;
      const nq = Math.max(1, Math.min(c.qty + delta, c.stock));
      return { ...c, qty: nq };
    }));
  };

  const setQtyDirect = (k: string, value: number) => {
    setCart(prev => prev.map(c => {
      if (cartKey(c) !== k) return c;
      const nq = Math.max(1, Math.min(Number.isFinite(value) ? value : 1, c.stock));
      return { ...c, qty: nq };
    }));
  };

  const removeItem = (k: string) => setCart(prev => prev.filter(c => cartKey(c) !== k));

  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const totalAmount = cart.reduce((s, c) => s + c.qty * parseFloat(c.price || "0"), 0);

  const handlePlaceOrder = async () => {
    if (!note.trim()) { toasterrormsg("Order note is required."); return; }
    if (cart.length === 0) { toasterrormsg("Add at least one item."); return; }
    setPlacing(true);
    try {
      const itemsPayload = cart.map(c => ({
        item_id: c.id,
        source_item_id: c.id,
        source_variant_id: c.variantId,
        variant_id: c.variantId,
        company_item_id: c.id,
        requested_quantity: c.qty,
        qty: c.qty,
        barcode: c.barcode || undefined,
        global_item_code: c.globalItemCode || undefined,
        item_name: c.itemName,
        variant_info: c.variant,
        size: c.size && c.size !== "—" ? c.size : null,
        color: c.color && c.color !== "—" ? c.color : null,
        hsnCode: c.hsn || null,
        taxSlab: c.gstPercent ? `${c.gstPercent}%` : null,
        tax_percent: c.gstPercent ? `${c.gstPercent}%` : null,
        rate: parseFloat(c.price || "0"),
        purchase_price: parseFloat(c.purchasePrice || c.price || "0"),
        branch_price: parseFloat(c.branchPrice || c.price || "0"),
        sales_price: parseFloat(c.salesPrice || "0"),
        mrp: parseFloat(c.mrp || "0"),
      }));
      const payload = {
        note: note || "",
        items: itemsPayload,
      };
      const res = await Post("pos/branch-orders/", payload) as any;
      const body = res?.data ?? res;
      const success = body?.success === true || res?.success === true;
      if (!success) {
        throw { custom: true, message: body?.message || body?.detail || body?.error || "Order submission failed." };
      }
      toastsuccessmsg(body?.message || "Order placed successfully.");
      const orderId = body?.order?.id ?? body?.id;
      if (orderId) {
        navigate(`/order-management/order-items/${orderId}`);
      } else {
        navigate("/order-management/order-items");
      }
    } catch (e: any) {
      if (e?.custom) {
        toasterrormsg(e.message);
      } else {
        const data = e?.response?.data;
        let msg: string | null = null;
        if (data) {
          if (typeof data.message === "string") msg = data.message;
          else if (typeof data.detail === "string") msg = data.detail;
          else if (typeof data.error === "string") msg = data.error;
          else {
            const parts: string[] = [];
            const pushVal = (label: string, v: unknown) => {
              if (Array.isArray(v)) v.forEach(x => parts.push(`${label}: ${x}`));
              else if (typeof v === "string" && v) parts.push(`${label}: ${v}`);
              else if (v != null) parts.push(`${label}: ${String(v)}`);
            };
            for (const [k, v] of Object.entries(data)) {
              if (Array.isArray(v) || typeof v === "string" || typeof v === "number") {
                pushVal(k, v);
              } else if (v && typeof v === "object") {
                for (const [kk, vv] of Object.entries(v as any)) pushVal(`${k}.${kk}`, vv);
              }
            }
            if (parts.length) msg = parts.slice(0, 3).join(" | ");
          }
        }
        toasterrormsg(msg || (typeof e?.message === "string" ? e.message : null) || "Failed to place order.");
      }
    } finally {
      setPlacing(false);
    }
  };

  const cartRows = (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
              {["#","Item","Variant","Size","Color","Barcode","HSN","GST%","Qty","Branch ₹","Amount","Stock",""].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cart.map((item, idx) => {
              const k = cartKey(item);
              return (
                <tr key={k} className="border-b border-gray-100 hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-700/50">
                  <td className="px-3 py-3 text-gray-500 dark:text-dark-300">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-800 dark:text-dark-100">{item.itemName}</p>
                    <p className="text-[11px] text-gray-500 dark:text-dark-300">{item.category}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary dark:text-primary-400">{item.variant}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-dark-300 text-xs">{item.size}</td>
                  <td className="px-3 py-3 text-gray-500 dark:text-dark-300 text-xs">{item.color}</td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center gap-1  text-[11px] text-gray-500 dark:text-dark-300">
                      <QrCodeIcon className="size-3.5 opacity-60" /> {item.barcode || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-600 dark:text-dark-200 text-xs">{item.hsn || "—"}</td>
                  <td className="px-3 py-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {item.gstPercent ? `${item.gstPercent}%` : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600">
                      <button onClick={() => updateQty(k, -1)}
                        className="grid size-8 place-items-center text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700 transition">
                        <MinusIcon className="size-3.5" />
                      </button>
                      <Input type="number" min={1} max={item.stock}
                        value={item.qty}
                        onChange={e => setQtyDirect(k, Number(e.target.value))}
                        classNames={{ input: "h-8 w-16 text-center !px-0 text-sm border-x-0 rounded-none bg-white dark:bg-dark-800" }} />
                      <button onClick={() => updateQty(k, 1)}
                        className="grid size-8 place-items-center text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700 transition">
                        <PlusIcon className="size-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-800 dark:text-dark-100">₹{item.price}</td>
                  <td className="px-3 py-3 font-bold text-primary">
                    ₹{(item.qty * parseFloat(item.price || "0")).toFixed(2)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold",
                      item.stock - item.qty >= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300")}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => removeItem(k)}
                      className="grid size-8 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                      <TrashIcon className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 dark:bg-dark-700/40">
              <td colSpan={8} className="px-3 py-3 text-right text-sm font-semibold text-gray-700 dark:text-dark-200">
                Order Totals
              </td>
              <td className="px-3 py-3 font-bold text-gray-800 dark:text-dark-100">{totalQty}</td>
              <td />
              <td className="px-3 py-3 font-bold text-primary text-base">₹{totalAmount.toFixed(2)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <Page title="New Order Request">
      <div className="transition-content w-full px-(--margin-x) py-5 space-y-5">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-9 gap-2 px-4 text-sm"
              onClick={() => navigate("/order-management/order-items")}>
              <ArrowLeftIcon className="size-4" /> Back to Orders
            </Button>
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
              <ShoppingBagIcon className="size-4 text-primary" />
              <span className="text-sm font-bold text-primary">NEW ORDER REQUEST</span>
            </div>
          </div>
          {cart.length > 0 && (
            <Badge color="primary" className="h-9 px-3 text-sm">{cart.length} item{cart.length === 1 ? "" : "s"} · Qty {totalQty}</Badge>
          )}
        </div>

        {/* Order Details + Info cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardDocumentListIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-dark-100">Order Details</h3>
                  <p className="text-xs text-gray-500 dark:text-dark-300">Basic information for this order</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-300">
                  <span className="inline-flex items-center gap-1"><CalendarDaysIcon className="size-3" /> Order Date</span>
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100">
                  {today}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-300">
                  <span className="inline-flex items-center gap-1"><QrCodeIcon className="size-3" /> Order ID</span>
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-dark-600 dark:bg-dark-700">
                  Auto Generated
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-300">
                  <span className="inline-flex items-center gap-1"><BuildingStorefrontIcon className="size-3" /> Ordering From</span>
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100">
                  Company / Main Branch
                </div>
              </div>
              <div className="sm:col-span-2 xl:col-span-1">
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-300">
                  <span className="inline-flex items-center gap-1"><InformationCircleIcon className="size-3" /> Order Note <span className="text-red-500 font-bold">*</span></span>
                </label>
                <Input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Enter order note (required)..."
                  classNames={{ input: clsx("h-9 text-sm", !note.trim() && "border-red-300 focus:border-red-400") }} />
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4 border-l-4 border-l-primary bg-gradient-to-br from-primary/5 via-white to-white dark:from-primary/10 dark:via-dark-800 dark:to-dark-800">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-lg bg-primary text-white">
                <BanknotesIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-100">Order Summary</h3>
                <p className="text-xs text-gray-500 dark:text-dark-300">Live totals</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Items", val: cart.length, tone: "text-gray-800 dark:text-dark-100" },
                { label: "Total Quantity", val: totalQty, tone: "text-gray-800 dark:text-dark-100" },
                { label: "GST (est.)", val: "—", tone: "text-gray-500 dark:text-dark-300" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-dark-300">{s.label}</span>
                  <span className={clsx("font-semibold", s.tone)}>{s.val}</span>
                </div>
              ))}
              <div className="my-2 h-px bg-gray-200 dark:bg-dark-600" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-dark-200">Total Amount</span>
                <span className="text-xl font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <Button color="primary" className="w-full h-10 gap-2 font-semibold"
              onClick={handlePlaceOrder} disabled={placing || cart.length === 0}>
              <ShoppingBagIcon className="size-4" />
              {placing ? "Placing Order..." : "Place Order"}
            </Button>
            {cart.length === 0 && (
              <p className="text-center text-[11px] text-gray-400">Add items to enable placement</p>
            )}
          </Card>
        </div>

        {/* Item Entry card */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <ShoppingBagIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-100">Item Entry</h3>
                <p className="text-xs text-gray-500 dark:text-dark-300">Select items from company stock</p>
              </div>
            </div>
            <Button color="primary" className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => setModalOpen(true)}>
              <MagnifyingGlassIcon className="size-4" /> Browse Items
            </Button>
          </div>

          {/* Selected item display */}
          {selectedItem ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid size-12 place-items-center rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 text-primary">
                    <CheckIcon className="size-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-gray-800 dark:text-dark-100">{selectedItem.itemName}</p>
                      <Badge color="info">{selectedItem.category}</Badge>
                      <Badge color="primary">{selectedItem.variant}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-dark-300">
                      <span>Size: <span className="font-medium text-gray-700 dark:text-dark-100">{selectedItem.size}</span></span>
                      <span>Color: <span className="font-medium text-gray-700 dark:text-dark-100">{selectedItem.color}</span></span>
                      <span>HSN: <span className="font-medium text-gray-700 dark:text-dark-100">{selectedItem.hsn || "—"}</span></span>
                      <span>GST: <span className="font-medium text-amber-600">{selectedItem.gstPercent ? `${selectedItem.gstPercent}%` : "—"}</span></span>
                      <span>Barcode: <span className=" font-medium text-gray-700 dark:text-dark-100">{selectedItem.barcode || "—"}</span></span>
                      <span>Available: <span className="font-semibold text-emerald-600">{selectedItem.stock} in stock</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-300">Qty</label>
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="grid size-9 place-items-center text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700 transition">
                        <MinusIcon className="size-4" />
                      </button>
                      <Input type="number" min={1} max={selectedItem.stock}
                        value={qty} onChange={e => setQty(Number(e.target.value))}
                        classNames={{ input: "h-9 w-20 text-center !px-0 text-sm border-x-0 rounded-none bg-white dark:bg-dark-800" }} />
                      <button onClick={() => setQty(q => Math.min(selectedItem.stock, q + 1))}
                        className="grid size-9 place-items-center text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700 transition">
                        <PlusIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-300">Amount</label>
                    <div className="h-9 rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700 px-3 flex items-center text-sm font-bold text-primary min-w-[110px] justify-end">
                      ₹{(qty * parseFloat(selectedItem.price || "0")).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outlined" className="h-9 px-4 text-sm" onClick={() => { setSelectedItem(null); setQty(1); }}>
                      Cancel
                    </Button>
                    <Button color="primary" className="h-9 gap-1.5 px-5 text-sm font-semibold"
                      onClick={handleAdd}>
                      <PlusIcon className="size-4" /> Add to Order
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-dark-600 bg-gray-50/60 dark:bg-dark-700/40 px-4 py-6 text-sm text-gray-500 dark:text-dark-300">
              <InformationCircleIcon className="size-5 opacity-60" />
              Click <span className="font-semibold text-gray-700 dark:text-dark-100">"Browse Items"</span> above to search the company stock and pick a variant.
            </div>
          )}
        </Card>

        {/* Cart table */}
        {cart.length > 0 && cartRows}

        {cart.length === 0 && (
          <Card className="p-12 text-center">
            <div className="mx-auto mb-3 grid size-16 place-items-center rounded-2xl bg-gray-100 dark:bg-dark-700 text-gray-400">
              <ShoppingBagIcon className="size-8" />
            </div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-dark-200">Your cart is empty</h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">Browse company items and add variants to build the order request.</p>
            <div className="mt-4 flex justify-center">
              <Button color="primary" className="h-9 gap-2 px-5 text-sm font-semibold"
                onClick={() => setModalOpen(true)}>
                <PlusIcon className="size-4" /> Start Adding Items
              </Button>
            </div>
          </Card>
        )}
      </div>

      <ItemSelectorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cartItems={cart}
        onSelect={handleSelect}
      />
    </Page>
  );
}
