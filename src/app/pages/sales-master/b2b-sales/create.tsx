import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon, CheckCircleIcon, CubeIcon,
  MagnifyingGlassIcon, PlusIcon, TrashIcon, XMarkIcon,
  DocumentCheckIcon, BuildingOfficeIcon, QrCodeIcon,
  CalendarDaysIcon, InformationCircleIcon, PencilIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Table, THead, TBody, Tr, Th, Td, Textarea } from "@/components/ui";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Get, Post, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface FranchiseBranch {
  id: number;
  branch_name: string;
  city: string;
  state: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  pincode?: string;
}

interface VariantOption {
  variant_id: number;
  variant_label: string;
  size: string | null;
  color: string | null;
  barcode: string | null;
  branch_price: number;
  current_stock: number;
  hsnCode?: string;
  taxSlab?: string;
  display?: string;
}

interface SourceItem {
  item_id: number;
  item_name: string;
  hsnCode?: string;
  taxSlab?: string;
  unit?: string;
  unit_name?: string;
  variants: VariantOption[];
}

interface CartRow {
  id: number;
  variantId: number;
  itemName: string;
  hsnCode: string;
  barcode: string;
  unit: string;
  quantity: number;
  rate: number;
  taxSlab: string;
  basicAmount: number;
  taxAmount: number;
  netValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

interface TaxCalculation {
  rate: number;
  basic_amount: number;
  tax_amount: number;
  net_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

// ── GST Helpers ─────────────────────────────────────────────────────────────
const safeNum = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

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

// ── Branch Details Card ─────────────────────────────────────────────────────
function BranchDetailsCard({ branch }: { branch: FranchiseBranch }) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BuildingOfficeIcon className="size-5 text-primary" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-100">Destination Branch Details</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 dark:text-dark-400">Branch Name</p>
          <p className="font-semibold text-gray-800 dark:text-dark-100">{branch.branch_name || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-dark-400">Owner</p>
          <p className="font-medium text-gray-700 dark:text-dark-200">{branch.owner_name || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-dark-400">Phone</p>
          <p className="font-medium text-gray-700 dark:text-dark-200">{branch.phone || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-dark-400">Email</p>
          <p className="font-medium text-gray-700 dark:text-dark-200 truncate">{branch.email || "-"}</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="text-xs text-gray-500 dark:text-dark-400">Address</p>
          <p className="font-medium text-gray-700 dark:text-dark-200">{branch.address || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-dark-400">City</p>
          <p className="font-medium text-gray-700 dark:text-dark-200">{branch.city || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-dark-400">State</p>
          <p className="font-medium text-gray-700 dark:text-dark-200">{branch.state || "-"} {branch.pincode ? `— ${branch.pincode}` : ""}</p>
        </div>
      </div>
    </div>
  );
}

// ── Item Pick Modal ────────────────────────────────────────────────────────
function ItemPickModal({
  isOpen, onClose, onPick, toBranchId, addedVariantIds,
}: {
  isOpen: boolean; onClose: () => void;
  onPick: (item: SourceItem, variant: VariantOption) => void;
  toBranchId: number;
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
    if (!toBranchId) return;
    setLoading(true);
    try {
      const params: any = { page: p, page_size: 50 };
      if (dq) params.search = dq;
      const res = await Get("pos/b2b-sales/my-branch-items/", params) as any;
      let rows: SourceItem[] = [];
      if (res?.data?.results?.success) rows = res.data.results.data || [];
      else if (res?.data?.success) rows = res.data.data || [];
      else if (Array.isArray(res?.data)) rows = res.data;
      setItems(rows);
      const body = res?.data ?? res;
      setTotal(body?.count ?? rows.length);
      setHasNext(!!body?.next);
      setPage(p);
    } catch { toasterrormsg("Could not load items."); }
    finally { setLoading(false); }
  }, [dq, toBranchId]);

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
                  <h3 className="text-base font-bold text-white">Select Item Variant</h3>
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
                          <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Stock</Th>
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
                              </Td>
                              <Td className="bg-white dark:bg-dark-900">
                                <Badge color="info" variant="soft" className="text-xs">{variant.variant_label}</Badge>
                              </Td>
                              <Td className="bg-white dark:bg-dark-900 text-gray-600 dark:text-dark-200">{variant.size || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900 text-gray-600 dark:text-dark-200">{variant.color || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900 text-xs text-gray-500 dark:text-dark-300">{variant.barcode || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900 text-xs text-gray-500 dark:text-dark-300">{variant.hsnCode || item.hsnCode || "—"}</Td>
                              <Td className="bg-white dark:bg-dark-900 text-center">
                                <Badge color="info" variant="soft" className="text-xs">{variant.taxSlab || item.taxSlab || "0%"}</Badge>
                              </Td>
                              <Td className="bg-white dark:bg-dark-900 tabular-nums text-gray-700 dark:text-dark-200">₹{variant.branch_price}</Td>
                              <Td className="bg-white dark:bg-dark-900 text-center">
                                <Badge color={variant.current_stock > 0 ? "success" : "error"} variant="soft" className="text-xs font-semibold">
                                  {variant.current_stock}
                                </Badge>
                              </Td>
                            </Tr>
                          );
                        }))}
                      </TBody>
                    </Table>
                  </div>
                )}
              </div>
              {total > 50 && (
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

// ── Barcode Scanner Section ─────────────────────────────────────────────────
function BarcodeScanner({
  flatItems, toBranchId, onItemSelected,
}: {
  flatItems: VariantOption[];
  toBranchId: number;
  onItemSelected: (variant: VariantOption) => void;
}) {
  const [barcodeValue, setBarcodeValue] = useState("");
  const [scanning, setScanning] = useState(false);

  const handleBarcodeSearch = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    if (!toBranchId) {
      toasterrormsg("Please select destination (franchise) branch first");
      setBarcodeValue("");
      return;
    }

    setScanning(true);
    try {
      // Local search first
      const localMatch = flatItems.find(
        (item) => item.barcode && item.barcode.toLowerCase() === trimmed.toLowerCase()
      );

      if (localMatch) {
        if (localMatch.current_stock <= 0) {
          toasterrormsg(`Item is out of stock`);
        } else {
          onItemSelected(localMatch);
          toastsuccessmsg(`✓ Item selected`);
        }
        setBarcodeValue("");
        setScanning(false);
        return;
      }

      // API search if not found locally
      const res = await Get("pos/b2b-sales/my-branch-items/", { search: trimmed }) as any;
      let items: SourceItem[] = [];
      if (res?.data?.results?.success) items = res.data.results.data || [];
      else if (res?.data?.success) items = res.data.data || [];
      else if (Array.isArray(res?.data)) items = res.data;

      const allVariants: VariantOption[] = items.flatMap(item => item.variants);
      const apiMatch = allVariants.find(
        (item) => item.barcode && item.barcode.toLowerCase() === trimmed.toLowerCase()
      );

      if (!apiMatch) {
        toasterrormsg(`No item found with barcode "${trimmed}"`);
      } else if (apiMatch.current_stock <= 0) {
        toasterrormsg(`Item is out of stock`);
      } else {
        onItemSelected(apiMatch);
        toastsuccessmsg(`✓ Item selected`);
      }
    } catch (err) {
      toasterrormsg("Barcode search failed. Please try again.");
    } finally {
      setBarcodeValue("");
      setScanning(false);
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <QrCodeIcon className="size-4 text-primary" />
        <label className="text-sm font-semibold text-gray-700 dark:text-dark-200">Barcode Scanner</label>
        {scanning && <span className="ml-2 text-xs text-primary animate-pulse">Searching...</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={barcodeValue}
          onChange={e => setBarcodeValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleBarcodeSearch(barcodeValue); } }}
          placeholder="Scan barcode here..."
          disabled={scanning}
          classNames={{ input: "h-9" }}
        />
        <Button
          color="primary"
          disabled={scanning || !barcodeValue.trim()}
          onClick={() => handleBarcodeSearch(barcodeValue)}
        >
          <QrCodeIcon className="size-4" />
        </Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-dark-400 mt-2">✓ Scan barcode to select item automatically</p>
    </div>
  );
}

// ── Main Create Page Component ─────────────────────────────────────────────
export default function CreateB2BSalesPage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [saleNo, setSaleNo] = useState("Loading…");
  const [saleDate, setSaleDate] = useState(today);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const [branches, setBranches] = useState<FranchiseBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branchDetails, setBranchDetails] = useState<FranchiseBranch | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [idCounter, setIdCounter] = useState(1);

  const [flatItems, setFlatItems] = useState<VariantOption[]>([]);

  // Current item being edited
  const [currentItem, setCurrentItem] = useState({
    variantId: 0,
    itemName: "",
    hsnCode: "",
    barcode: "",
    unit: "",
    quantity: "",
    rate: 0,
    taxSlab: "",
    availableStock: 0,
    basicAmount: "0.00",
    taxAmount: "0.00",
    netValue: "0.00",
    cgst: "0.00",
    sgst: "0.00",
    igst: "0.00",
  });
  const [currentItemErrors, setCurrentItemErrors] = useState<Record<string, string>>({});

  // ── Load next sale number ──
  useEffect(() => {
    Get("pos/b2b-sales/next-number/")
      .then((res: any) => {
        if (res?.data?.success) setSaleNo(res.data.sale_no);
      })
      .catch(() => setSaleNo("—"));
  }, []);

  // ── Load franchise branches ──
  useEffect(() => {
    setBranchesLoading(true);
    Get("pos/b2b-sales/franchise-branches/")
      .then((res: any) => {
        const data = res?.data?.data || [];
        setBranches(data);
      })
      .catch(() => toasterrormsg("Failed to load franchise branches"))
      .finally(() => setBranchesLoading(false));
  }, []);

  // ── Load items for barcode scanner ──
  useEffect(() => {
    Get("pos/b2b-sales/my-branch-items/")
      .then((res: any) => {
        let items: SourceItem[] = [];
        if (res?.data?.results?.success) items = res.data.results.data || [];
        else if (res?.data?.success) items = res.data.data || [];
        else if (Array.isArray(res?.data)) items = res.data;

        const flat: VariantOption[] = items.flatMap(item => item.variants);
        setFlatItems(flat);
      })
      .catch(() => toasterrormsg("Failed to load items"));
  }, []);

  // ── Update branch details when branch selected ──
  useEffect(() => {
    if (selectedBranch) {
      const details = branches.find(b => b.id === selectedBranch.value);
      setBranchDetails(details || null);
    } else {
      setBranchDetails(null);
    }
  }, [selectedBranch, branches]);

  // ── Calculate tax for current item ──
  useEffect(() => {
    if (!currentItem.variantId || !selectedBranch?.value || !currentItem.quantity) {
      setCurrentItem(prev => ({
        ...prev,
        basicAmount: "0.00", taxAmount: "0.00", netValue: "0.00",
        cgst: "0.00", sgst: "0.00", igst: "0.00",
      }));
      return;
    }

    const calcTax = async () => {
      try {
        const res = await Post("pos/b2b-sales/item-tax/", {
          from_variant_id: currentItem.variantId,
          to_branch_id: selectedBranch.value,
          quantity: Number(currentItem.quantity) || 0,
        }) as any;
        const d = res?.data;
        setCurrentItem(prev => ({
          ...prev,
          rate: d?.rate || 0,
          basicAmount: d?.basic_amount?.toFixed(2) || "0.00",
          taxAmount: d?.tax_amount?.toFixed(2) || "0.00",
          netValue: d?.net_amount?.toFixed(2) || "0.00",
          cgst: d?.cgst?.toFixed(2) || "0.00",
          sgst: d?.sgst?.toFixed(2) || "0.00",
          igst: d?.igst?.toFixed(2) || "0.00",
        }));
      } catch (e) {
        console.error("Tax calculation failed", e);
      }
    };
    calcTax();
  }, [currentItem.variantId, currentItem.quantity, selectedBranch?.value]);

  // ── Prepare branch options for Combobox ──
  const branchOptions = useMemo(() => 
    branches.map(b => ({ value: b.id, label: `${b.branch_name}${b.city ? ` — ${b.city}` : ""}` })),
    [branches]
  );

  // ── Calculate totals ──
  const totals = useMemo(() => {
    const totalBasic = cart.reduce((s, it) => s + safeNum(it.basicAmount), 0);
    const totalTax = cart.reduce((s, it) => s + safeNum(it.taxAmount), 0);
    const totalNet = cart.reduce((s, it) => s + safeNum(it.netValue), 0);
    const totalCgst = cart.reduce((s, it) => s + safeNum(it.cgst), 0);
    const totalSgst = cart.reduce((s, it) => s + safeNum(it.sgst), 0);
    const totalIgst = cart.reduce((s, it) => s + safeNum(it.igst), 0);
    return {
      totalBasic: round2(totalBasic),
      totalTax: round2(totalTax),
      totalNet: round2(totalNet),
      totalCgst: round2(totalCgst),
      totalSgst: round2(totalSgst),
      totalIgst: round2(totalIgst),
    };
  }, [cart]);

  // ── Apply selected item to form ──
  const applyItemToForm = (item: SourceItem, variant: VariantOption) => {
    setCurrentItem({
      variantId: variant.variant_id,
      itemName: item.item_name,
      hsnCode: item.hsnCode || "",
      barcode: variant.barcode || "",
      unit: item.unit || "pc",
      quantity: "1",
      rate: variant.branch_price,
      taxSlab: variant.taxSlab || item.taxSlab || "0",
      availableStock: variant.current_stock,
      basicAmount: "0.00",
      taxAmount: "0.00",
      netValue: "0.00",
      cgst: "0.00",
      sgst: "0.00",
      igst: "0.00",
    });
    setCurrentItemErrors({});
  };

  // ── Add item to cart ──
  const handleAddItem = () => {
    const errors: Record<string, string> = {};
    if (!selectedBranch?.value) { toasterrormsg("Please select destination branch first"); return; }
    if (!currentItem.variantId) errors.variantId = "Please select an item";
    if (!currentItem.quantity || Number(currentItem.quantity) <= 0) errors.quantity = "Please enter valid quantity";
    if (Number(currentItem.quantity) > currentItem.availableStock) errors.quantity = `Max available: ${currentItem.availableStock}`;

    if (Object.keys(errors).length > 0) {
      setCurrentItemErrors(errors);
      return;
    }
    setCurrentItemErrors({});

    setCart(prev => [
      ...prev,
      {
        id: idCounter,
        variantId: currentItem.variantId,
        itemName: currentItem.itemName,
        hsnCode: currentItem.hsnCode,
        barcode: currentItem.barcode,
        unit: currentItem.unit,
        quantity: Number(currentItem.quantity),
        rate: currentItem.rate,
        taxSlab: currentItem.taxSlab,
        basicAmount: Number(currentItem.basicAmount),
        taxAmount: Number(currentItem.taxAmount),
        netValue: Number(currentItem.netValue),
        cgst: Number(currentItem.cgst),
        sgst: Number(currentItem.sgst),
        igst: Number(currentItem.igst),
      },
    ]);
    setIdCounter(p => p + 1);
    setCurrentItem({
      variantId: 0,
      itemName: "",
      hsnCode: "",
      barcode: "",
      unit: "",
      quantity: "",
      rate: 0,
      taxSlab: "",
      availableStock: 0,
      basicAmount: "0.00",
      taxAmount: "0.00",
      netValue: "0.00",
      cgst: "0.00",
      sgst: "0.00",
      igst: "0.00",
    });
    setCurrentItemErrors({});
    toastsuccessmsg("Item added successfully!");
  };

  // ── Delete item from cart ──
  const handleDeleteItem = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // ── Clear all items ──
  const handleClearAll = () => {
    setCart([]);
    setIdCounter(1);
  };

  // ── Submit form ──
  const handleSubmit = async () => {
    if (cart.length === 0) { toasterrormsg("At least one item is required"); return; }
    if (!selectedBranch?.value) { toasterrormsg("Select destination franchise branch"); return; }

    const payload = {
      to_branch_id: selectedBranch.value,
      sale_date: saleDate,
      note: note || "",
      items: cart.map(it => ({
        from_variant_id: it.variantId,
        quantity: it.quantity,
        rate: it.rate,
      })),
    };

    setCreating(true);
    try {
      const res = await Post("pos/b2b-sales/", payload) as any;
      if (res?.data?.success) {
        toastsuccessmsg(res.data.message || "B2B Sale created successfully");
        navigate("/sales/b2b-sales");
      } else {
        toasterrormsg(res?.data?.message || "Error while saving B2B sale");
      }
    } catch (error: any) {
      const errs = error?.response?.data?.errors;
      const msg = Array.isArray(errs) ? errs.join(", ") : (error?.response?.data?.message || "Error while saving B2B sale");
      toasterrormsg(msg);
    } finally {
      setCreating(false);
    }
  };

  const addedVariantIds = useMemo(() => new Set(cart.map(c => c.variantId)), [cart]);

  return (
    <Page title="Create B2B Sale">
      <div className="transition-content w-full pb-8 space-y-4">
        {/* Header */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm" onClick={() => navigate("/sales/b2b-sales")}>
              <ArrowLeftIcon className="size-4" /> Back to Sales
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">Create B2B Sale</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">Superadmin → Franchise branch stock transfer</p>
            </div>
          </div>
        </div>

        {/* Sale Details */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="p-4">
            <SectionHeader icon={DocumentCheckIcon} title="Sale Details" />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Sale Date</label>
                <DatePicker
                  value={saleDate}
                  onChange={setSaleDate}
                  className="h-9 w-full"
                />
              </div>
              <ReadField label="Sale No." value={saleNo} />
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">To Branch (Franchise)</label>
                <Combobox
                  data={branchOptions}
                  displayField="label"
                  searchFields={["label"]}
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  placeholder="Select Franchise Branch"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Note</label>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Optional notes..."
                  rows={1}
                  className="h-9"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Branch Details Card */}
        {branchDetails && (
          <div className="px-(--margin-x)">
            <BranchDetailsCard branch={branchDetails} />
          </div>
        )}

        {/* Barcode Scanner */}
        <div className="px-(--margin-x)">
          <BarcodeScanner
            flatItems={flatItems}
            toBranchId={selectedBranch?.value || 0}
            onItemSelected={(variant) => {
              // Find the parent item for this variant
              Get("pos/b2b-sales/my-branch-items/")
                .then((res: any) => {
                  let items: SourceItem[] = [];
                  if (res?.data?.results?.success) items = res.data.results.data || [];
                  else if (res?.data?.success) items = res.data.data || [];
                  else if (Array.isArray(res?.data)) items = res.data;

                  const parentItem = items.find(item => 
                    item.variants.some(v => v.variant_id === variant.variant_id)
                  );
                  if (parentItem) {
                    applyItemToForm(parentItem, variant);
                  }
                });
            }}
          />
        </div>

        {/* Item Entry */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="p-4">
            <SectionHeader icon={CubeIcon} title="Item Entry" />
            {currentItem.itemName && (
              <div className="mt-2 text-sm text-success-600 dark:text-success-400">
                — {currentItem.itemName} (Stock: {currentItem.availableStock})
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 items-end">
              {/* Select Item */}
              <div className="lg:col-span-1">
                <Button
                  color="primary"
                  className="w-full h-9"
                  disabled={!selectedBranch?.value}
                  onClick={() => setModalOpen(true)}
                >
                  <MagnifyingGlassIcon className="size-4" /> Select Item
                </Button>
                {currentItemErrors.variantId && <p className="text-xs text-error-600 mt-1">{currentItemErrors.variantId}</p>}
              </div>

              {/* HSN */}
              <ReadField label="HSN" value={currentItem.hsnCode} />

              {/* Quantity */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Qty</label>
                <Input
                  type="number"
                  value={currentItem.quantity}
                  onChange={e => {
                    setCurrentItem(prev => ({ ...prev, quantity: e.target.value }));
                    if (currentItemErrors.quantity) setCurrentItemErrors(prev => { const n = { ...prev }; delete n.quantity; return n; });
                  }}
                  placeholder="0"
                  className={clsx("h-9", currentItemErrors.quantity && "border-error-500")}
                />
                {currentItemErrors.quantity && <p className="text-xs text-error-600 mt-1">{currentItemErrors.quantity}</p>}
              </div>

              {/* Rate */}
              <ReadField label="Rate" value={`₹${currentItem.rate.toFixed(2)}`} />

              {/* Unit */}
              <ReadField label="Unit" value={currentItem.unit} />

              {/* Tax% */}
              <ReadField label="Tax%" value={`${currentItem.taxSlab}%`} />

              {/* Net Value */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">Net</label>
                <div className="flex h-9 items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm font-bold text-primary-600 dark:border-dark-500 dark:bg-dark-800 dark:text-primary-400">
                  {currentItem.netValue}
                </div>
              </div>

              {/* Add Button */}
              <Button
                color="primary"
                className="h-9"
                onClick={handleAddItem}
              >
                <CheckCircleIcon className="size-4" /> Add
              </Button>
            </div>
          </Card>
        </div>

        {/* Items Table */}
        <div className="px-(--margin-x)">
          <Card skin="bordered" className="overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto">
              <Table hoverable className="w-full text-left">
                <THead className="sticky top-0 z-10">
                  <Tr>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">#</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Item</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">HSN</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Qty</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Rate</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Unit</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Tax%</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Basic</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Tax Amt</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Net</Th>
                    <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-100 font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">Action</Th>
                  </Tr>
                </THead>
                <TBody>
                  {cart.length === 0 ? (
                    <Tr>
                      <Td colSpan={11} className="text-center py-10 text-sm text-gray-400 dark:text-dark-400">
                        <CubeIcon className="mx-auto mb-2 size-8 opacity-30" />
                        No items added yet
                      </Td>
                    </Tr>
                  ) : cart.map((item, idx) => (
                    <Tr key={item.id} className="dark:border-b-dark-500 border-b border-gray-100">
                      <Td className="bg-white dark:bg-dark-900 text-gray-400">{idx + 1}</Td>
                      <Td className="bg-white dark:bg-dark-900 font-medium text-gray-800 dark:text-dark-100">{item.itemName}</Td>
                      <Td className="bg-white dark:bg-dark-900 text-xs text-gray-500 dark:text-dark-300">{item.hsnCode}</Td>
                      <Td className="bg-white dark:bg-dark-900">{item.quantity}</Td>
                      <Td className="bg-white dark:bg-dark-900">₹{item.rate.toFixed(2)}</Td>
                      <Td className="bg-white dark:bg-dark-900">{item.unit}</Td>
                      <Td className="bg-white dark:bg-dark-900">{item.taxSlab}%</Td>
                      <Td className="bg-white dark:bg-dark-900">₹{item.basicAmount.toFixed(2)}</Td>
                      <Td className="bg-white dark:bg-dark-900">₹{item.taxAmount.toFixed(2)}</Td>
                      <Td className="bg-white dark:bg-dark-900 font-bold">₹{item.netValue.toFixed(2)}</Td>
                      <Td className="bg-white dark:bg-dark-900">
                        <Button isIcon variant="flat" className="size-8 rounded-full" onClick={() => handleDeleteItem(item.id)}>
                          <TrashIcon className="size-4 text-error-600" />
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
            {cart.length > 0 && (
              <div className="border-t border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-800 px-4 py-2 flex justify-end gap-4 text-sm font-semibold">
                <span>Total Basic: ₹{totals.totalBasic.toFixed(2)}</span>
                <span>Total Tax: ₹{totals.totalTax.toFixed(2)}</span>
                <span className="text-primary-600 dark:text-primary-400">Total Net: ₹{totals.totalNet.toFixed(2)}</span>
              </div>
            )}
          </Card>
        </div>

        {/* GST Summary */}
        {cart.length > 0 && (
          <div className="px-(--margin-x)">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <InformationCircleIcon className="size-5 text-primary" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-100">GST Summary</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-primary/10">
                  <span className="text-gray-600 dark:text-dark-400">Total Basic Amount</span>
                  <span className="font-medium text-gray-800 dark:text-dark-100">₹ {totals.totalBasic.toFixed(2)}</span>
                </div>
                {totals.totalCgst > 0 || totals.totalSgst > 0 ? (
                  <>
                    <div className="flex justify-between py-1.5 border-b border-primary/10">
                      <span className="text-gray-600 dark:text-dark-400">CGST</span>
                      <span className="font-medium text-gray-800 dark:text-dark-100">₹ {totals.totalCgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-primary/10">
                      <span className="text-gray-600 dark:text-dark-400">SGST</span>
                      <span className="font-medium text-gray-800 dark:text-dark-100">₹ {totals.totalSgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : totals.totalIgst > 0 ? (
                  <div className="flex justify-between py-1.5 border-b border-primary/10">
                    <span className="text-gray-600 dark:text-dark-400">IGST</span>
                    <span className="font-medium text-gray-800 dark:text-dark-100">₹ {totals.totalIgst.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-2 text-base font-bold border-t-2 border-primary/20">
                  <span className="text-gray-800 dark:text-dark-100">Total Tax Amount</span>
                  <span className="text-primary">₹ {totals.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 text-base font-bold">
                  <span className="text-gray-800 dark:text-dark-100">Net Total (incl. GST)</span>
                  <span className="text-primary">₹ {totals.totalNet.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-(--margin-x) flex flex-wrap gap-3 justify-end">
          <Button variant="outlined" color="error" onClick={handleClearAll}>
            <TrashIcon className="size-4" /> Clear All
          </Button>
          <Button color="primary" onClick={handleSubmit} disabled={creating}>
            <CheckCircleIcon className="size-4" /> {creating ? "Saving..." : "Save B2B Sale"}
          </Button>
        </div>

        {/* Item Selection Modal */}
        <ItemPickModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onPick={applyItemToForm}
          toBranchId={selectedBranch?.value || 0}
          addedVariantIds={addedVariantIds}
        />
      </div>
    </Page>
  );
}
