import {
  CurrencyRupeeIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ArrowDownOnSquareIcon,
  QrCodeIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
  TrashIcon,
  TruckIcon,
  PrinterIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
   XMarkIcon, 
} from "@heroicons/react/24/outline";
import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import { Fragment } from "react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Button, Card, Input, Table, THead, TBody, Th, Tr, Td, Textarea } from "@/components/ui";
import { Get, Post, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import {
  CartLine,
  Customer,
  SaleItem,
  buildCartLine,
  calcSummary,
  mapApiCustomer,
  mapApiSaleItem,
  mapTaxResponse,
} from "./data";
import { ItemSelectorModal } from "./ItemSelectorModal";
import { CustomerModal } from "./CustomerModal";
import { SaleReceiptModal } from "./SaleReceiptModal";

// ── Field label helper ────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

// ── Read-only display field ───────────────────────────────────────────────────
function ReadField({ value, className }: { value: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(
      "flex h-10 items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-200",
      className,
    )}>
      {value || <span className="text-gray-400">—</span>}
    </div>
  );
}

// ── Section card header ───────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color = "text-primary" }: {
  icon: React.ComponentType<any>; title: string; color?: string;
}) {
  return (
    <div className={clsx("mb-4 flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-dark-600", color)}>
      <Icon className="size-4" />
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NewSalePage() {
  const navigate = useNavigate();
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Bill details
  interface PaymentTerm { id: string; label: string; }

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [billNo, setBillNo] = useState("");
  const [narration, setNarration] = useState("");
  const [terms, setTerms] = useState<PaymentTerm>({ id: "Cash", label: "Cash" });
  const [termOptions] = useState<PaymentTerm[]>([
    { id: "Cash", label: "Cash" },
    { id: "Bank", label: "Bank" },
    { id: "Credit", label: "Credit" },
  ]);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; label: string } | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; label: string }[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Item entry
  const [selectedItem, setSelectedItem] = useState<SaleItem | null>(null);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [discPercent, setDiscPercent] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartIdCounter, setCartIdCounter] = useState(1);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [allItems, setAllItems] = useState<SaleItem[]>([]);
  const [currentNetValue, setCurrentNetValue] = useState("0.00");

  // Additional charges
  const [freight, setFreight] = useState(0);
  const [otherExpense, setOtherExpense] = useState(0);
  const [roundAmt, setRoundAmt] = useState(0);

  // Modals & state
  const [itemModal, setItemModal] = useState(false);
  const [customerModal, setCustomerModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountError, setAccountError] = useState(false);
  const [savedSaleId, setSavedSaleId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // ── Load initial data ───────────────────────────────────────────────────────
  useEffect(() => {
    Get("pos/voucher/generate/?type=SI").then((res: any) => {
      setBillNo(res?.data?.voucher_no ?? res?.data ?? "");
    }).catch(() => {});

    Get("pos/default-customer/").then((res: any) => {
      const d = res?.data?.customer ?? res?.data;
      if (d) setCustomer(mapApiCustomer(d));
    }).catch(() => {});

    Get("pos/customers/").then((res: any) => {
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results : Array.isArray(body) ? body : [];
      setCustomers(rows.map(mapApiCustomer));
    }).catch(() => {});

    Get("pos/account-terms-type/?terms=Cash").then((res: any) => {
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body) ? body : Array.isArray(body?.results) ? body.results : [];
      const mapped = rows.map((r: any) => ({ id: String(r.id), label: r.account_name ?? r.name ?? "" }));
      setAccounts(mapped);
    }).catch(() => {});

    Get("pos/sale-search-item/").then((res: any) => {
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results : Array.isArray(body) ? body : [];
      setAllItems(rows.map(mapApiSaleItem));
    }).catch(() => {});
  }, []);

  // ── Item handlers ───────────────────────────────────────────────────────────
  const handleSelectItem = (item: SaleItem) => {
    setSelectedItem(item);
    setPrice(item.salesPrice);
    setQty(1);
    setDiscPercent(0);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const fetchItemTax = async (itemId: number, customerId: number, quantity: number, itemPrice: number, discount: number) => {
    const res = await Post("pos/sale-item-tax/", {
      item_id: itemId,
      customer_id: customerId,
      qty: quantity,
      price: itemPrice,
      discount_percent: discount,
    }) as any;
    return mapTaxResponse(res?.data ?? res);
  };

  useEffect(() => {
    if (!selectedItem?.itemId || !customer?.id || qty <= 0 || price <= 0) {
      setCurrentNetValue("0.00");
      return;
    }
    let cancelled = false;
    fetchItemTax(selectedItem.itemId, customer.id, qty, price, discPercent)
      .then(tax => { if (!cancelled) setCurrentNetValue(tax.net.toFixed(2)); })
      .catch(() => { if (!cancelled) setCurrentNetValue("0.00"); });
    return () => { cancelled = true; };
  }, [selectedItem?.itemId, customer?.id, qty, price, discPercent]);

  useEffect(() => {
    if (!terms || terms.id === "Credit") {
      setAccounts([]);
      setSelectedAccount(null);
      return;
    }

    setAccountLoading(true);
    Get(`pos/account-terms-type/?terms=${terms.id}`)
      .then((res: any) => {
        const body = res?.data ?? res;
        const rows: any[] = Array.isArray(body) ? body
          : Array.isArray(body?.results) ? body.results
          : [];
        const mapped = rows.map((r: any) => ({ id: String(r.id), label: r.account_name ?? r.name ?? "" }));
        setAccounts(mapped);
        setSelectedAccount(null);
      })
      .catch(() => toasterrormsg("Failed to load accounts."))
      .finally(() => setAccountLoading(false));
  }, [terms]);

  const handleBarcodeSearch = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    if (!customer?.id) {
      toasterrormsg("Please select a customer first.");
      setBarcodeInput("");
      return;
    }

    setBarcodeScanning(true);
    try {
      const localMatch = allItems.find(
        i => i.barcode && i.barcode.toLowerCase() === trimmed.toLowerCase(),
      );
      if (localMatch) {
        if (localMatch.stock <= 0) {
          toasterrormsg(`Item "${localMatch.itemName}" is out of stock.`);
          return;
        }
        handleSelectItem(localMatch);
        toastsuccessmsg(`Item selected: ${localMatch.itemName}`);
        return;
      }

      const res = await Get(`pos/sale-search-item/`, { query: trimmed }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results) ? body.results : Array.isArray(body) ? body : [];
      const apiMatch = rows
        .map(mapApiSaleItem)
        .find(i => i.barcode && i.barcode.toLowerCase() === trimmed.toLowerCase());

      if (!apiMatch) {
        toasterrormsg(`No item found with barcode "${trimmed}".`);
        return;
      }
      if (apiMatch.stock <= 0) {
        toasterrormsg(`Item "${apiMatch.itemName}" is out of stock.`);
        return;
      }
      handleSelectItem(apiMatch);
      toastsuccessmsg(`Item selected: ${apiMatch.itemName}`);
    } catch {
      toasterrormsg("Barcode search failed. Please try again.");
    } finally {
      setBarcodeInput("");
      setBarcodeScanning(false);
      barcodeRef.current?.focus();
    }
  };

  const handleBarcodeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleBarcodeSearch(barcodeInput);
  };

  const handleAdd = async () => {
    if (!customer?.id) { toasterrormsg("Select customer first."); return; }
    if (!selectedItem) { toasterrormsg("Please select an item first."); return; }
    if (qty <= 0) { toasterrormsg("Qty must be at least 1."); return; }
    if (price <= 0) { toasterrormsg("Enter a valid price."); return; }

    try {
      const tax = await fetchItemTax(selectedItem.itemId, customer.id, qty, price, discPercent);
      const line = buildCartLine(cartIdCounter, selectedItem, qty, price, discPercent, tax);
      setCart(prev => [...prev, line]);
      setCartIdCounter(p => p + 1);
      setSelectedItem(null);
      setQty(1);
      setPrice(0);
      setDiscPercent(0);
      setCurrentNetValue("0.00");
      toastsuccessmsg("Item added!");
    } catch {
      toasterrormsg("Failed to calculate item values. Please try again.");
    }
  };

  const removeCartLine = (id: number) => setCart(prev => prev.filter(l => l.id !== id));

  const updateCartQty = async (line: CartLine, newQty: number) => {
    if (!customer?.id || newQty < 1) return;
    try {
      const tax = await fetchItemTax(line.itemId, customer.id, newQty, line.price, line.discPercent);
      setCart(prev => prev.map(l => l.id === line.id
        ? buildCartLine(l.id, {
            id: l.variantId,
            itemId: l.itemId,
            itemName: l.itemName,
            hsn: l.hsn,
            barcode: l.barcode,
            size: l.size,
            color: l.color,
            salesPrice: l.price,
            perUnitPrice: l.price,
            stock: 999,
            unit: l.unit,
            unitSupportsFractional: false,
            taxPercent: l.taxPercent,
          }, newQty, line.price, line.discPercent, tax)
        : l));
    } catch {
      toasterrormsg("Failed to update quantity.");
    }
  };

  const handleClearAll = () => {
    setCart([]);
    setCartIdCounter(1);
    setSelectedItem(null);
    setQty(1);
    setPrice(0);
    setDiscPercent(0);
  };

  const summary = calcSummary(cart, freight, otherExpense, roundAmt);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;
    if (cart.length === 0) { toasterrormsg("Add at least one item."); return; }
    if (!customer?.id) { toasterrormsg("Please select a customer."); return; }
    if (terms.id !== "Credit" && !selectedAccount) {
      setAccountError(true);
      toasterrormsg("Please select an account for Cash or Bank payment.");
      return;
    }
    if (terms.id === "Credit" && !dueDate) {
      toasterrormsg("Please choose a due date for credit sales.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        date,
        customer: Number(customer.id),
        payment_terms: terms.id,
        narration,
        cash_account: null,
        bank_account: null,
        dueDate: terms.id === "Credit" ? dueDate : "",
        total_basic: summary.totalBasic,
        total_discount: summary.totalDiscount,
        total_tax: summary.totalTax,
        grand_total: summary.grandTotal,
        frightcharge: freight,
        otherexpnse: otherExpense,
        roundamount: roundAmt,
        items: cart.map(l => ({
          item_id: l.itemId,
          variant_id: l.variantId,
          hsn_code: l.hsn,
          qty: l.qty,
          price: l.price,
          unit: l.unit,
          discount_percent: l.discPercent,
          tax_percent: l.taxPercent || 0,
          basic_amount: l.basic,
          discount_amount: l.discAmt,
          tax_amount: l.taxAmt,
          net_amount: l.net,
          cgst: l.cgst,
          sgst: l.sgst,
          igst: l.igst,
        })),
      };

      if (terms.id === "Cash") payload.cash_account = Number(selectedAccount?.id);
      if (terms.id === "Bank") payload.bank_account = Number(selectedAccount?.id);

      const res = await Post("pos/salesentry-create/", payload) as any;
      const body = res?.data ?? res;
      if (body?.stock_alerts?.length) {
        body.stock_alerts.forEach((msg: string) => toasterrormsg(msg));
      }
      toastsuccessmsg("Sale saved successfully.");
      setSavedSaleId(Number(body?.id ?? 0));
      handleClearAll();
      setShowConfirmModal(true);
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.error ?? e?.response?.data?.message ?? e?.response?.data?.detail ?? "Failed to save sale.");
    } finally {
      setSaving(false);
    }
  };

  const customerOptions = customers.map(c => ({ id: String(c.id), label: c.name }));
  const selectedCustomerOption = customer
    ? { id: String(customer.id), label: customer.name }
    : null;

  return (
    <Page title="Sales Entry Form">
      <div className="transition-content w-full px-(--margin-x) py-5 space-y-5 pb-10">

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="outlined" className="h-9 gap-2 px-4 text-sm"
            onClick={() => navigate("/sales/sales-entry-report")}>
            <ChevronLeftIcon className="size-4" />
            Back
          </Button>
          <div className="flex items-center gap-2.5 rounded-full bg-primary px-6 py-2">
            <ShoppingCartIcon className="size-4 text-white" />
            <span className="text-sm font-bold uppercase tracking-widest text-white">Sales Entry Form</span>
          </div>
          <Button color="primary" className="h-9 gap-2 px-5 text-sm font-semibold" onClick={handleSave} disabled={saving}>
            <ArrowDownOnSquareIcon className="size-4" />
            {saving ? "Saving..." : "Save Sale"}
          </Button>
        </div>

        {/* ── Bill Details ─────────────────────────────────────────────────── */}
        <Card className="p-5">
          <SectionHeader icon={DocumentTextIcon} title="Bill Details" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

            {/* Date */}
            <div>
              <FieldLabel>Date</FieldLabel>
              <DatePicker
                value={date}
                onChange={(value: any) => setDate(value)}
                placeholder="Select date"
              />
            </div>
            {/* Bill No */}
            <div>
              <FieldLabel>Bill No.</FieldLabel>
              <Input
                value={billNo || "Auto Generated"}
                readOnly
                prefix={<DocumentTextIcon className="size-4" />}
                classNames={{ input: "bg-gray-50 dark:bg-dark-800 cursor-default" }}
              />
            </div>

            {/* Customer */}
            <div>
              <FieldLabel required>Customer</FieldLabel>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Listbox
                    data={customerOptions}
                    placeholder="Select Customer"
                    value={selectedCustomerOption}
                    onChange={(item: any) => {
                      const found = customers.find(c => String(c.id) === item.id);
                      if (found) setCustomer(found);
                    }}
                    displayField="label"
                  />
                </div>
                <Button color="primary" className="h-10 shrink-0 gap-1 px-3 text-sm"
                  onClick={() => setCustomerModal(true)}>
                  <PlusIcon className="size-3.5" /> Add
                </Button>
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <FieldLabel>Payment Terms</FieldLabel>
              <Listbox
                data={termOptions}
                placeholder="Select Terms"
                value={terms}
                onChange={(item: any) => {
                  setTerms(item);
                  setDueDate("");
                  setSelectedAccount(null);
                  setAccountError(false);
                }}
                displayField="label"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(terms.id === "Cash" || terms.id === "Bank") && (
              <div>
                <FieldLabel required>Account</FieldLabel>
                <Listbox
                  data={accounts}
                  placeholder={`Select ${terms.label} Account`}
                  value={selectedAccount}
                  onChange={(item: any) => { setSelectedAccount(item); setAccountError(false); }}
                  displayField="label"
                  error={accountError}
                  disabled={accountLoading}
                />
                {accountError && (
                  <p className="mt-1 text-xs text-error">Account is required</p>
                )}
              </div>
            )}

            {terms.id === "Credit" && (
              <div>
                <FieldLabel required>Due Date</FieldLabel>
                <DatePicker
                  value={dueDate}
                  onChange={(value: any) => setDueDate(value)}
                  placeholder="Select due date"
                />
              </div>
            )}

            {/* Narration */}
            <div>
              <FieldLabel>Narration</FieldLabel>
              <Textarea
                value={narration}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNarration(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>
        </Card>


{/* ── Item Entry ────────────────────────────────────────────────────── */}
<Card className="p-5">
  <div className="flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-dark-600">
    <ShoppingCartIcon className="size-4 text-primary-500" />
    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">Item Entry</span>
       <div className="ml-auto flex items-center  gap-3">
      <div className="max-w-[300px] min-w-[200px]">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 relative">
            <QrCodeIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-primary-400" />
            <input
              ref={barcodeRef}
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              placeholder="Scan barcode here — keep cursor in this field"
              disabled={barcodeScanning}
              className="h-7 w-full rounded-lg border border-primary/30 bg-white pl-8 pr-2.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:bg-dark-800 dark:text-dark-100 dark:disabled:bg-dark-600"
            />
          </div>
          <Button type="button" color="primary" className="h-7 gap-0.5 rounded px-2 text-xs shrink-0"
            onClick={() => handleBarcodeSearch(barcodeInput)}
            disabled={barcodeScanning || !barcodeInput.trim()}>
            {barcodeScanning ? (
              <span className="size-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <QrCodeIcon className="size-3" />
            )}
          </Button>
        </div>
      </div>
      <Button type="button" color="primary" variant="soft" className="h-8 gap-2 rounded-lg px-3 text-xs shrink-0"
        onClick={() => setItemModal(true)}>
        <MagnifyingGlassIcon className="size-3.5" /> Select Item
      </Button>
    </div>
  </div>

  <div className="mt-4 space-y-4">
    {/* Item Details - Only when item is selected */}
    {selectedItem && (
      <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">Item</label>
          <input
            value={selectedItem.itemName}
            disabled
            className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
          />
        </div>
        
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">Barcode</label>
          <input
            value={selectedItem.barcode || "—"}
            disabled
            className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm font-mono text-gray-700 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
          />
        </div>
        
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">HSN</label>
          <input
            value={selectedItem.hsn || "—"}
            disabled
            className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
          />
        </div>
        
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">Unit</label>
          <input
            value={selectedItem.unit || "—"}
            disabled
            className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
          />
        </div>
        
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">Tax</label>
          <input
            value={`${selectedItem.taxPercent || 0}%`}
            disabled
            className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
          />
        </div>
        
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">Stock</label>
          <input
            value={selectedItem.stock}
            disabled
            className="h-9 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
          />
        </div>
        
        <Button type="button" isIcon variant="flat" className="absolute -top-1 -right-1 size-6 rounded-full text-gray-400 hover:text-error-600"
          onClick={() => { setSelectedItem(null); setQty(1); setPrice(0); setDiscPercent(0); }}>
          <XMarkIcon className="size-4" />
        </Button>
      </div>
    )}

    {/* Input Fields - Always visible */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">Price ₹</label>
        <input
          type="number" step="0.01" min="0"
          value={price}
          onChange={e => setPrice(Number(e.target.value))}
          disabled={!selectedItem}
          placeholder="0.00"
          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:disabled:bg-dark-600"
        />
      </div>
      
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">Qty <span className="text-red-500">*</span></label>
        <input
          type="number" step="1" min="1"
          value={qty}
          onChange={e => setQty(Number(e.target.value))}
          disabled={!selectedItem}
          placeholder="0"
          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:disabled:bg-dark-600"
        />
      </div>
      
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-dark-200">Disc %</label>
        <input
          type="number" step="0.01" min="0" max="100"
          value={discPercent}
          onChange={e => setDiscPercent(Number(e.target.value))}
          disabled={!selectedItem}
          placeholder="0"
          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:disabled:bg-dark-600"
        />
      </div>
      
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-dark-500 dark:bg-dark-800">
        <p className="text-xs text-gray-400 dark:text-dark-400">Net Value</p>
        <p className="text-sm font-bold text-primary-600 dark:text-primary-400">
          ₹{currentNetValue}
        </p>
      </div>
      
      <Button type="button" color="primary" className="h-9 w-9 gap-0 rounded-lg px-0 text-sm"
        onClick={handleAdd} disabled={!selectedItem}>
        <PlusIcon className="size-5" />
      </Button>
    </div>

    {/* Fractional-unit per-unit price breakdown */}
    {selectedItem?.unitSupportsFractional && qty > 0 && price > 0 && (
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-2 dark:border-sky-800/60 dark:bg-sky-900/10">
        <p className="text-sm text-sky-700 dark:text-sky-300">
          <span className="font-semibold">Per Unit Price:</span>{" "}
          ₹{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} per {selectedItem.unit}
        </p>
        <p className="mt-0.5 text-sm text-sky-600 dark:text-sky-400">
          {qty} {selectedItem.unit} × ₹{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ={" "}
          <span className="font-bold">₹{(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </p>
      </div>
    )}
  </div>
</Card>

        {/* ── Cart Table ────────────────────────────────────────────────────── */}
        {cart.length > 0 && (
          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 px-5 py-3 dark:border-dark-600">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                Cart — {cart.length} item{cart.length > 1 ? "s" : ""}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table hoverable zebra className="min-w-full text-left">
                <THead>
                  <Tr className="bg-primary text-white">
                    {["#","Item","HSN","Qty","Price","Unit","Tax%","Disc%","Basic","Disc Amt","Tax Amt","Net","Del"].map(h => (
                      <Th key={h} className="whitespace-nowrap px-3 py-3 text-xs font-semibold">{h}</Th>
                    ))}
                  </Tr>
                </THead>
                <TBody>
                  {cart.map((l, i) => (
                    <Tr key={l.id} className="border-b border-gray-100 transition-colors hover:bg-primary/[0.03] dark:border-dark-700 dark:hover:bg-primary/10">
                      <Td className="px-3 py-3 text-gray-400">{i + 1}</Td>
                      <Td className="px-3 py-3 font-medium text-gray-800 dark:text-dark-100">{l.itemName}</Td>
                      <Td className="px-3 py-3  text-xs text-gray-500">{l.hsn}</Td>
                      <Td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateCartQty(l, l.qty - 1)}
                            className="grid size-6 place-items-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-primary hover:text-primary dark:border-dark-500">
                            <MinusIcon className="size-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-dark-100">{l.qty}</span>
                          <button onClick={() => updateCartQty(l, l.qty + 1)}
                            className="grid size-6 place-items-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-primary hover:text-primary dark:border-dark-500">
                            <PlusIcon className="size-3" />
                          </button>
                        </div>
                      </Td>
                      <Td className="px-3 py-3 font-semibold text-gray-800 dark:text-dark-100">₹{l.price}</Td>
                      <Td className="px-3 py-3 text-gray-500">{l.unit}</Td>
                      <Td className="px-3 py-3">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{l.taxPercent}%</span>
                      </Td>
                      <Td className="px-3 py-3 text-gray-500">{l.discPercent}%</Td>
                      <Td className="px-3 py-3 text-gray-700 dark:text-dark-200">₹{l.basic.toFixed(2)}</Td>
                      <Td className="px-3 py-3 text-gray-500">₹{l.discAmt.toFixed(2)}</Td>
                      <Td className="px-3 py-3 text-gray-500">₹{l.taxAmt.toFixed(2)}</Td>
                      <Td className="px-3 py-3 font-bold text-primary-600 dark:text-primary-400">₹{l.net.toFixed(2)}</Td>
                      <Td className="px-3 py-3">
                        <button onClick={() => removeCartLine(l.id)}
                          className="grid size-7 place-items-center rounded-full text-error transition-colors hover:bg-error/10">
                          <TrashIcon className="size-4" />
                        </button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
                <TBody>
                  <Tr className="bg-gray-50 dark:bg-dark-800">
                    <Td colSpan={8} className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-dark-300">Total:</Td>
                    <Td className="px-3 py-3 font-bold text-gray-800 dark:text-dark-100">₹{summary.totalBasic.toFixed(2)}</Td>
                    <Td className="px-3 py-3 font-bold text-gray-500">₹{summary.totalDiscount.toFixed(2)}</Td>
                    <Td className="px-3 py-3 font-bold text-gray-500">₹{summary.totalTax.toFixed(2)}</Td>
                    <Td className="px-3 py-3 font-bold text-primary-600 dark:text-primary-400">
                      ₹{cart.reduce((s, l) => s + l.net, 0).toFixed(2)}
                    </Td>
                    <Td />
                  </Tr>
                </TBody>
              </Table>
            </div>
          </Card>
        )}

        {/* ── Additional Charges + Payment Summary ─────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Additional Charges */}
          <Card className="p-5">
            <SectionHeader icon={TruckIcon} title="Additional Charges" color="text-indigo-600 dark:text-indigo-400" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel>Freight Charge</FieldLabel>
                <Input type="number" value={freight}
                  onChange={e => setFreight(Number(e.target.value))}
                  prefix={<CurrencyRupeeIcon className="size-4" />} />
              </div>
              <div>
                <FieldLabel>Other Expense</FieldLabel>
                <Input type="number" value={otherExpense}
                  onChange={e => setOtherExpense(Number(e.target.value))}
                  prefix={<CurrencyRupeeIcon className="size-4" />} />
              </div>
              <div>
                <FieldLabel>Round Amount</FieldLabel>
                <Input type="number" value={roundAmt}
                  onChange={e => setRoundAmt(Number(e.target.value))}
                  prefix={<CurrencyRupeeIcon className="size-4" />} />
              </div>
            </div>
          </Card>

          {/* Payment Summary */}
          <Card className="p-5">
            <SectionHeader icon={ClipboardDocumentListIcon} title="Payment Summary" color="text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-2">
              {[
                { label: "Total Basic", val: summary.totalBasic, muted: false },
                ...(summary.cgst > 0 || summary.sgst > 0
                  ? [
                      { label: "CGST", val: summary.cgst, muted: true },
                      { label: "SGST", val: summary.sgst, muted: true },
                    ]
                  : summary.igst > 0
                    ? [{ label: "IGST", val: summary.igst, muted: true }]
                    : []),
                { label: "Total Tax", val: summary.totalTax, muted: false },
                { label: "Total Discount", val: summary.totalDiscount, muted: true },
                { label: "Freight", val: summary.freight, muted: true },
                { label: "Other Expense", val: summary.otherExpense, muted: true },
                { label: "Round Off", val: summary.roundAmt, muted: true },
              ].map(({ label, val, muted }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className={clsx("text-sm", muted ? "text-gray-400 dark:text-dark-400" : "text-gray-600 dark:text-dark-200")}>
                    {label}
                  </span>
                  <span className={clsx("text-sm font-medium tabular-nums", muted ? "text-gray-500 dark:text-dark-300" : "text-gray-700 dark:text-dark-100")}>
                    ₹ {val.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3 dark:bg-primary/10">
                <span className="text-base font-bold text-gray-800 dark:text-dark-50">Grand Total</span>
                <span className="text-2xl font-black text-primary tabular-nums">₹ {summary.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Bottom Actions ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-3 pb-4">
          <Button variant="outlined" color="error" className="gap-2" onClick={handleClearAll} disabled={saving || cart.length === 0}>
            <TrashIcon className="size-4" /> Clear All
          </Button>
          <Button color="primary" className="h-11 gap-2 px-8 text-base font-bold shadow-lg shadow-primary/30"
            onClick={handleSave} disabled={saving || cart.length === 0}>
            <ArrowDownOnSquareIcon className="size-5" />
            {saving ? "Saving Sale..." : "Save Entry"}
          </Button>
          <Button variant="outlined" onClick={() => navigate("/sales/sales-entry-report")} disabled={saving}>
            List
          </Button>
        </div>
      </div>

      <ItemSelectorModal open={itemModal} onClose={() => setItemModal(false)} onSelect={handleSelectItem} />
      <CustomerModal
        open={customerModal}
        onClose={() => setCustomerModal(false)}
        onSelect={(c) => {
          setCustomer(c);
          setCustomers(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c]);
        }}
      />

      {/* Print confirmation after save */}
      <Transition appear show={showConfirmModal} as={Fragment}>
        <Dialog as="div" className="relative z-[210]" onClose={() => setShowConfirmModal(false)}>
          <TransitionChild as="div"
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild as={DialogPanel}
                enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-dark-700"
              >
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <CheckCircleIcon className="size-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-dark-100">Print Receipt?</h3>
                <p className="mt-2 text-sm text-gray-500">Do you want to print the sales receipt?</p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button color="primary" className="gap-2"
                    onClick={() => { setShowConfirmModal(false); setShowReceiptModal(true); }}>
                    <PrinterIcon className="size-4" /> Yes, Print
                  </Button>
                  <Button variant="outlined"
                    onClick={() => { setShowConfirmModal(false); navigate("/sales/sales-entry-report"); }}>
                    No, Close
                  </Button>
                </div>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <SaleReceiptModal
        saleId={savedSaleId}
        open={showReceiptModal}
        onClose={() => { setShowReceiptModal(false); navigate("/sales/sales-entry-report"); }}
      />
    </Page>
  );
}
