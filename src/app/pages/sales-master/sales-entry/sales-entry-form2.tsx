import {
  CurrencyRupeeIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  DocumentCheckIcon,
  QrCodeIcon,
  ShoppingCartIcon,
  TrashIcon,
  PrinterIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  XMarkIcon,
  UserPlusIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TagIcon,
  UserIcon,
  LinkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import { Fragment } from "react";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { Button, Card, Input, Table, THead, TBody, Th, Tr, Td, Textarea, Badge } from "@/components/ui";
import { Get, Post, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { useBranchLocationCheck } from "@/hooks/useBranchLocationCheck";

// ─── Constants ────────────────────────────────────────────────────────────────

const VARIANT_BY_BRANCH: Record<string, string[]> = {
  fashion: ["size", "color"],
  electronics: ["size", "color", "srno", "warrantydate"],
  mart: ["size"],
};

const paymentTermsOptions = [
  { id: "Cash", label: "Cash" },
  { id: "Bank", label: "Bank" },
  { id: "Credit", label: "Credit" },
];

const today = new Date().toISOString().split("T")[0];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id: number;
  itemId: number;
  variantId: number | null;
  itemName: string;
  hsnCode: string;
  quantity: number;
  price: number;
  per: string;
  taxSlab: string;
  discountPercent: number;
  basicAmount: string;
  discountAmount: string;
  taxAmount: string;
  netValue: string;
  cgst: string;
  sgst: string;
  igst: string;
}

interface Account {
  id: number;
  account_name: string;
}

interface Customer {
  id: number;
  account_name: string;
  mobile: string;
  email: string;
  address: string;
  state: string;
}

interface ReferralLookupResult {
  found: boolean;
  agent_id?: number;
  full_name?: string;
  contact_number?: string;
  agent_type?: string;
  referral_code?: string;
  message?: string;
}

interface SaleItem {
  id: number;
  itemId: number;
  itemName: string;
  hsnCode: string;
  barcode: string;
  size: string;
  color: string;
  srno: string;
  warrantydate: string;
  salesPrice: number;
  perUnitPrice: number;
  unitSupportsFractional: boolean;
  unit: string;
  unit_name: string;
  taxSlab: string;
  current_stock: number;
  categoryId: number | null;
  categoryName: string;
}
// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

// ─── CustomerAddModal ─────────────────────────────────────────────────────────

const CustomerAddModal = ({ isOpen, onClose, onCustomerAdded }: any) => {
  const [fd, setFd] = useState({ account_name: "", state: "", mobile: "", email: "", address: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!fd.account_name) { toasterrormsg("Name required"); return; }
    if (!fd.state) { toasterrormsg("State required"); return; }
    setLoading(true);
    try {
      const r = await Post("pos/customer-create/", fd);
      toastsuccessmsg("Customer added");
      onCustomerAdded(r.data.customer);
      onClose();
      setFd({ account_name: "", state: "", mobile: "", email: "", address: "" });
    } catch (e: any) {
      toasterrormsg(e.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={DialogPanel}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl transition-all dark:bg-dark-700"
            >
              <div className="flex items-center justify-between bg-primary px-5 py-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlusIcon className="size-4" /> Add New Customer
                </h3>
                <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-1 text-white">
                  <XMarkIcon className="size-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: "Customer Name *", key: "account_name", type: "text" },
                  { label: "State *", key: "state", type: "text" },
                  { label: "Mobile", key: "mobile", type: "tel" },
                  { label: "Email", key: "email", type: "email" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <Input
                      type={type}
                      value={(fd as any)[key]}
                      onChange={e => setFd({ ...fd, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <FieldLabel>Address</FieldLabel>
                  <Textarea
                    value={fd.address}
                    onChange={e => setFd({ ...fd, address: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 pb-5">
                <Button onClick={onClose} variant="outlined">Cancel</Button>
                <Button onClick={submit} disabled={loading} color="primary">
                  {loading ? "Adding..." : "Add Customer"}
                </Button>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// ─── ReferralCodeInput ──────────────────────────────────────────────────────────

const ReferralCodeInput: React.FC<{ value: string; onChange: (val: string) => void; onVerified: (data: any) => void }> = ({ value, onChange, onVerified }) => {
  const [loading, setLoading] = useState(false);
  const [agentInfo, setAgentInfo] = useState<ReferralLookupResult | null>(null);
  const [toggleStatus, setToggleStatus] = useState<{ walk_in_toggle: boolean; mode: string; description: string } | null>(null);
  const lookupCalledByEnter = useRef(false);
  const isVerifying = useRef(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchToggle = async () => {
      try {
        const r = await Get("pos/pos-profit-settings/");
        setToggleStatus(r.data);
      } catch {
        // Silent fail
      }
    };
    fetchToggle();
  }, []);

  const lookupReferral = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setAgentInfo(null);
      onVerified(null);
      return;
    }

    setLoading(true);
    try {
      const r = await Get(`pos/referral-lookup/?referral_code=${encodeURIComponent(trimmed)}`);
      const data = r.data;

      if (data.found) {
        setAgentInfo({
          found: true,
          agent_id: data.agent_id,
          full_name: data.full_name,
          contact_number: data.contact_number,
          agent_type: data.agent_type,
          referral_code: data.referral_code,
        });
        onVerified({
          agent_id: data.agent_id,
          full_name: data.full_name,
          agent_type: data.agent_type,
        });
        toastsuccessmsg(`✓ Agent found: ${data.full_name}`);
      } else {
        setAgentInfo({ found: false, message: data.message || "Invalid referral code or mobile number" });
        onVerified(null);
        toasterrormsg(data.message || "Invalid referral code or mobile number");
      }
    } catch (error) {
      setAgentInfo({ found: false, message: "Error validating code" });
      onVerified(null);
      toasterrormsg("Error validating referral code");
    } finally {
      setLoading(false);
      isVerifying.current = false;
    }
  };

  const handleBlur = () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }

    blurTimeout.current = setTimeout(() => {
      if (value && !lookupCalledByEnter.current && !isVerifying.current) {
        lookupReferral(value);
      }
      lookupCalledByEnter.current = false;
      blurTimeout.current = null;
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      lookupCalledByEnter.current = true;
      lookupReferral(value);
    }
  };

  const getModeInfo = () => {
    if (!toggleStatus) return null;
    if (toggleStatus.walk_in_toggle) {
      return {
        label: "Walk-in Mode ON",
        color: "text-success-600",
        bg: "bg-success-50",
        border: "border-success-200",
      };
    }
    return {
      label: "Walk-in Mode OFF",
      color: "text-info-600",
      bg: "bg-info-50",
      border: "border-info-200",
    };
  };

  const modeInfo = getModeInfo();

  return (
    <div className="space-y-2">
      <div>
        <FieldLabel>
          <span className="flex items-center gap-1">
            <LinkIcon className="size-3" /> Referral Code / Mobile
          </span>
          <span className="font-normal text-gray-400 text-[10px]">(optional)</span>
        </FieldLabel>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <Input
              placeholder="Enter agent referral code or mobile number"
              value={value}
              onChange={e => {
                onChange(e.target.value);
                if (!e.target.value) {
                  setAgentInfo(null);
                  onVerified(null);
                }
              }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="pl-9"
              classNames={{
                input: clsx(
                  agentInfo?.found ? "border-success-400 focus:ring-success-400" : 
                  agentInfo?.found === false ? "border-red-400 focus:ring-red-400" : ""
                )
              }}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {agentInfo?.found && !loading && (
              <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-success size-5" />
            )}
            {agentInfo?.found === false && !loading && value && (
              <XMarkIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 size-5" />
            )}
          </div>
          <Button
            onClick={() => {
              isVerifying.current = true;
              if (blurTimeout.current) {
                clearTimeout(blurTimeout.current);
                blurTimeout.current = null;
              }
              lookupReferral(value);
            }}
            disabled={!value}
            color="primary"
          >
            Verify
          </Button>
        </div>
      </div>

      {/* Agent Info Display */}
      {agentInfo?.found && (
        <div className="p-3 bg-success-50 border border-success-200 rounded-xl dark:bg-success-500/10 dark:border-success-500/30">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-success flex items-center justify-center text-white">
              <UserIcon className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-success-700 dark:text-success-400">{agentInfo.full_name}</p>
              <div className="flex gap-3 text-xs text-success-600 dark:text-success-500">
                <span>{agentInfo.contact_number}</span>
                <span>{agentInfo.referral_code}</span>
                <Badge color="success" variant="soft" className="text-[10px]">
                  {agentInfo.agent_type === "pos" ? "POS Agent" : 
                   agentInfo.agent_type === "society" ? "Society Agent" : "Agent"}
                </Badge>
              </div>
            </div>
            <Badge color="success" variant="soft" className="text-xs font-bold">
              Verified
            </Badge>
          </div>
        </div>
      )}

      {agentInfo?.found === false && value && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <XMarkIcon className="size-3" /> {agentInfo.message || "Invalid referral code or mobile number"}
        </p>
      )}


    </div>
  );
};

// ─── ReceiptComponent ─────────────────────────────────────────────────────────

const ReceiptComponent = ({ savedSaleId, showReceiptModal, handleCloseReceipt }: any) => {
  const [saleData, setSaleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (savedSaleId && showReceiptModal) {
      setLoading(true);
      Get(`pos/sale-receipt/${savedSaleId}`)
        .then(r => setSaleData(r.data))
        .catch(() => toasterrormsg("Failed to load receipt"))
        .finally(() => setLoading(false));
    }
  }, [savedSaleId, showReceiptModal]);

  

  const handlePrint = () => {
    const content = document.getElementById("receipt-print")?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Receipt</title>
      <style>@page{margin:0}body{margin:0;padding:0;display:flex;justify-content:center}
      .rc{width:80mm;padding:6px;font-size:11px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #000;padding:2px;font-size:11px}hr{border:none;border-top:1px dashed #000;margin:6px 0}
      .tc{text-align:center}.tr{text-align:right}</style>
      </head><body><div class="rc">${content}</div></body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 500);
  };

  if (!showReceiptModal) return null;

  return (
    <Transition appear show={showReceiptModal} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={handleCloseReceipt}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={DialogPanel}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-hidden rounded-2xl bg-white shadow-xl transition-all dark:bg-dark-700"
            >
              <div className="sticky top-0 flex items-center justify-between bg-white px-5 py-4 border-b dark:bg-dark-700 dark:border-dark-600">
                <h2 className="text-base font-bold text-gray-800 dark:text-dark-100 flex items-center gap-2">
                  <DocumentTextIcon className="text-primary" /> Sales Receipt
                </h2>
                <button onClick={handleCloseReceipt} className="text-red-500 hover:text-red-700">
                  <XMarkIcon className="size-5" />
                </button>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-10 text-gray-400">Loading...</div>
                ) : saleData ? (
                  <div id="receipt-print">
                    <div className="text-center mb-4">
                      <h2 className="text-xl font-bold">{saleData.branch_name ?? "Branch"}</h2>
                      <p className="text-gray-500 text-sm">{saleData.address ?? ""}</p>
                      <hr className="my-3" />
                    </div>
                    <div className="text-sm space-y-1 mb-4">
                      <p><strong>Bill No:</strong> {saleData.bill_no} &nbsp; <strong>Date:</strong> {saleData.date}</p>
                      <p><strong>Customer:</strong> {saleData.customer_name} &nbsp; <strong>Time:</strong> {saleData.time}</p>
                      <p><strong>Mobile:</strong> {saleData.mobile} &nbsp; <strong>Payment:</strong> {saleData.payment_mode}</p>
                      {saleData.referral_agent && (
                        <p><strong>Referral Agent:</strong> {saleData.referral_agent}</p>
                      )}
                    </div>
                    <hr className="my-3" />
                    <Table className="w-full text-sm border-collapse border">
                      <THead>
                        <Tr className="bg-gray-100 dark:bg-dark-800">
                          <Th className="border p-2 text-left">#</Th>
                          <Th className="border p-2 text-left">Item</Th>
                          <Th className="border p-2 text-right">Qty</Th>
                          <Th className="border p-2 text-right">Price</Th>
                          <Th className="border p-2 text-right">Amount</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {saleData.items?.map((v: any, i: number) => (
                          <Tr key={i} className="border-b dark:border-dark-700">
                            <Td className="border p-2">{i + 1}</Td>
                            <Td className="border p-2">{v.name}</Td>
                            <Td className="border p-2 text-right">{v.qty}</Td>
                            <Td className="border p-2 text-right">₹{(v.price || 0).toFixed(2)}</Td>
                            <Td className="border p-2 text-right">₹{(v.amount || 0).toFixed(2)}</Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                    <hr className="my-3" />
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span><strong>Taxable Amount:</strong></span>
                        <span>₹{(saleData.total_basic ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Discount:</strong></span>
                        <span>-₹{(saleData.total_discount ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Tax (GST):</strong></span>
                        <span>₹{(saleData.tax_amount ?? 0).toFixed(2)}</span>
                      </div>
                      {(saleData.freight ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span><strong>Freight:</strong></span>
                          <span>₹{(saleData.freight ?? 0).toFixed(2)}</span>
                        </div>
                      )}
                      {(saleData.other_expense ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span><strong>Other Expense:</strong></span>
                          <span>₹{(saleData.other_expense ?? 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span><strong>Round Off:</strong></span>
                        <span>₹{(saleData.round_off ?? 0).toFixed(2)}</span>
                      </div>
                      <hr className="my-2 border-dashed" />
                      <div className="flex justify-between text-base font-bold">
                        <span>NET PAYABLE:</span>
                        <span>₹{(saleData.grand_total ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <hr className="my-3" />
                    <p className="text-center font-bold">THANKS FOR SHOPPING {saleData.customer_name}</p>
                  </div>
                ) : (
                  <div className="text-center py-10 text-red-500">Data not found</div>
                )}
              </div>
              <div className="sticky bottom-0 flex justify-end gap-3 p-5 border-t bg-white dark:bg-dark-700 dark:border-dark-600">
                <Button onClick={handleCloseReceipt} variant="outlined">Close</Button>
                <Button onClick={handlePrint} color="primary">
                  <PrinterIcon className="size-4" /> Print Receipt
                </Button>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// ─── ProductCard ──────────────────────────────────────────────────────────────

const ProductCard = ({ item, onAdd, branchType }: { item: SaleItem; onAdd: (item: SaleItem) => void; branchType: string | null }) => {
  const outOfStock = item.current_stock <= 0;
  const variantFields = VARIANT_BY_BRANCH[branchType || ""] || [];

  return (
    <Card
      className={clsx(
        "relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-0.5",
        outOfStock ? "opacity-50 cursor-not-allowed grayscale" : ""
      )}
      onClick={() => !outOfStock && onAdd(item)}
    >
      {/* Top colored band */}
      <div className={clsx(
        "h-2 w-full",
        outOfStock ? "bg-gray-300" : 
        item.current_stock <= 5 ? "bg-warning" : 
        "bg-primary"
      )} />

      <div className="p-3 space-y-2">
        {/* Item name */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-gray-800 dark:text-dark-100 leading-tight line-clamp-2 flex-1" title={item.itemName}>
            {item.itemName}
          </p>
          {!outOfStock && (
            <div className="shrink-0 size-8 rounded-full bg-primary flex items-center justify-center text-white shadow-lg hover:bg-primary/80 transition-colors">
              <PlusIcon className="size-4" />
            </div>
          )}
        </div>

        {/* HSN + Barcode */}
        <div className="flex flex-wrap gap-1.5">
          {item.hsnCode && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full dark:bg-dark-800 dark:text-dark-400">
              HSN: {item.hsnCode}
            </span>
          )}
          {item.barcode && item.barcode !== "-" && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1 dark:bg-primary/20">
              <QrCodeIcon className="size-3" /> {item.barcode}
            </span>
          )}
        </div>

        {/* Variant details */}
        {variantFields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {variantFields.map(f => item[f as keyof SaleItem] && item[f as keyof SaleItem] !== "-" && (
              <span key={f} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize font-medium dark:bg-primary/20 dark:text-primary-300">
                {f}: {item[f as keyof SaleItem]}
              </span>
            ))}
          </div>
        )}

        {/* Unit + Tax */}
        <div className="flex gap-1.5 flex-wrap">
          {item.unit_name && item.unit_name !== "-" && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full dark:bg-dark-800 dark:text-dark-400">
              Unit: {item.unit_name}
            </span>
          )}
          {item.taxSlab && item.taxSlab !== "0" && (
            <Badge color="info" variant="soft" className="text-[10px] font-semibold">
              GST {item.taxSlab}
            </Badge>
          )}
        </div>

        {/* Price + Stock */}
        <div className="flex items-end justify-between pt-2 border-t border-gray-100 dark:border-dark-700">
          <div>
            <p className="text-lg font-black text-primary">₹{Number(item.salesPrice).toFixed(2)}</p>
            {item.unitSupportsFractional && item.perUnitPrice > 0 && (
              <p className="text-[10px] text-gray-400 dark:text-dark-400">per {item.unit_name}</p>
            )}
          </div>
          <Badge
            color={item.current_stock > 10 ? "success" : item.current_stock > 0 ? "warning" : "error"}
            variant="soft"
            className="text-[10px] font-semibold"
          >
            {item.current_stock > 0 ? `${item.current_stock} left` : "Out of stock"}
          </Badge>
        </div>
      </div>

      {outOfStock && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center dark:bg-dark-800/70 backdrop-blur-sm">
          <Badge color="error" className="text-xs font-bold px-3 py-1">Out of Stock</Badge>
        </div>
      )}
    </Card>
  );
};

// ─── CartItemRow ──────────────────────────────────────────────────────────────

const CartItemRow = ({
  item, onQtyChange, onPriceChange, onDiscountChange, onDelete,
}: {
  item: CartItem;
  onQtyChange: (id: number, qty: number) => void;
  onPriceChange: (id: number, price: number) => void;
  onDiscountChange: (id: number, disc: number) => void;
  onDelete: (id: number) => void;
}) => (
  <div className="py-2.5 border-b border-gray-100 dark:border-dark-700 last:border-0">
    {/* Row 1: Name + delete */}
    <div className="flex items-start justify-between gap-1">
      <p className="text-xs font-bold text-gray-800 dark:text-dark-100 leading-tight flex-1 truncate">{item.itemName}</p>
      <button type="button" onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-600 shrink-0 p-0.5">
        <TrashIcon className="size-4" />
      </button>
    </div>

    {/* Row 2: HSN + tax + disc badges */}
    <div className="flex flex-wrap gap-1 mt-0.5">
      {item.hsnCode && <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded dark:bg-dark-800 dark:text-dark-400">HSN: {item.hsnCode}</span>}
      {item.taxSlab && item.taxSlab !== "0" && (
        <Badge color="info" variant="soft" className="text-[9px]">GST {item.taxSlab}</Badge>
      )}
      {Number(item.discountPercent) > 0 && (
        <Badge color="success" variant="soft" className="text-[9px]">{item.discountPercent}% off</Badge>
      )}
    </div>

    {/* Row 3: Qty control + Price input */}
    <div className="flex items-center gap-2 mt-1.5">
      {/* Qty */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onQtyChange(item.id, Math.max(1, item.quantity - 1))}
          className="size-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition dark:bg-dark-700 dark:text-dark-300">
          <MinusIcon className="size-3" />
        </button>
<Input
  type="number"
  value={item.quantity}
  onChange={e => onQtyChange(item.id, Math.max(1, Number(e.target.value) || 1))}
  className="w-12 text-center text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  min={1}
/>
        <button type="button" onClick={() => onQtyChange(item.id, item.quantity + 1)}
          className="size-5 rounded-full bg-primary hover:bg-primary/700 flex items-center justify-center text-white transition">
          <PlusIcon className="size-3" />
        </button>
      </div>

      {/* Price */}
      <div className="flex items-center gap-1 flex-1">
        <span className="text-[9px] text-gray-400 shrink-0">₹</span>

<Input
  type="number"
  value={item.price}
  onChange={e => onPriceChange(item.id, Number(e.target.value) || 0)}
  className="text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  placeholder="Price"
/>
      </div>

      {/* Discount % */}
      <div className="flex items-center gap-1">
<Input
  type="number"
  value={item.discountPercent}
  onChange={e => onDiscountChange(item.id, Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
  className="w-12 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  placeholder="0"
  min={0}
  max={100}
/>
        <span className="text-[9px] text-gray-400">%</span>
      </div>
    </div>

    {/* Row 4: Amounts */}
    <div className="flex items-center justify-between mt-1.5 bg-primary/5 rounded-lg px-2 py-1 dark:bg-primary/10">
      <div className="flex gap-3">
        <div className="text-center">
          <p className="text-[9px] text-gray-400 dark:text-dark-400">Basic</p>
          <p className="text-[10px] font-semibold text-gray-700 dark:text-dark-200">₹{Number(item.basicAmount).toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-400 dark:text-dark-400">Disc</p>
          <p className="text-[10px] font-semibold text-success-600 dark:text-success-400">-₹{Number(item.discountAmount).toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-400 dark:text-dark-400">Tax</p>
          <p className="text-[10px] font-semibold text-info-600 dark:text-info-400">₹{Number(item.taxAmount).toFixed(2)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[9px] text-gray-400 dark:text-dark-400">Net</p>
        <p className="text-sm font-black text-primary dark:text-primary-400">₹{Number(item.netValue).toFixed(2)}</p>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesEntryForm2() {
  const navigate = useNavigate();
    const { checkLocation, isLoading: locationLoading } = useBranchLocationCheck();

  const [addedItems, setAddedItems] = useState<CartItem[]>([]);
  const [idCounter, setIdCounter] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState(0);

  const [itemsData, setItemsData] = useState<SaleItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchType, setBranchType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

// ── Category filter ──
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; label: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; label: string } | null>(null);

  // ── Grid view: lazy loading (infinite scroll) ──
  const GRID_PAGE_SIZE = 24;
  const [visibleGridCount, setVisibleGridCount] = useState(GRID_PAGE_SIZE);
  const gridSentinelRef = useRef<HTMLDivElement | null>(null);

  // ── List view: pagination ──
  const LIST_PAGE_SIZE = 15;
  const [listPage, setListPage] = useState(1);

  const [barcodeValue, setBarcodeValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [savedSaleId, setSavedSaleId] = useState<number | null>(null);
  
  // Referral agent state
  const [referralAgentData, setReferralAgentData] = useState<any>(null);

  // Prevents duplicate submissions
  const [submitAction, setSubmitAction] = useState<null | "save" | "print">(null);
  const isSubmitting = submitAction !== null;

  // Form values
  const [date, setDate] = useState(today);
  const [billNo, setBillNo] = useState("");
  const [customerName, setCustomerName] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [account, setAccount] = useState<number>(0);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [paymentTerms, setPaymentTerms] = useState("Cash");
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState<any>(paymentTermsOptions[0]);
  const [narration, setNarration] = useState("");
  const [freightCharge, setFreightCharge] = useState("");
  const [otherExpense, setOtherExpense] = useState("");
  const [roundAmount, setRoundAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // ── recalc a cart item via API ──
  const recalcItem = async (item: CartItem, patches: Partial<CartItem>): Promise<CartItem> => {
    const merged = { ...item, ...patches };
    try {
      const r = await Post("pos/sale-item-tax/", {
        item_id: merged.itemId, customer_id: selectedCustomerId,
        qty: Number(merged.quantity), price: Number(merged.price),
        discount_percent: Number(merged.discountPercent) || 0,
      });
      const d = r.data;
      return {
        ...merged,
        basicAmount: d.basic_amount.toFixed(2),
        discountAmount: d.discount_amount.toFixed(2),
        taxAmount: d.total_tax.toFixed(2),
        netValue: d.net_amount.toFixed(2),
        cgst: d.cgst.toFixed(2), sgst: d.sgst.toFixed(2), igst: d.igst.toFixed(2),
      };
    } catch { return merged; }
  };

  const updateItem = async (id: number, patches: Partial<CartItem>) => {
    const item = addedItems.find(i => i.id === id);
    if (!item) return;
    const updated = await recalcItem(item, patches);
    setAddedItems(prev => prev.map(i => i.id === id ? updated : i));
  };

  // ── add to cart ──
  const addItemToCart = async (row: SaleItem) => {
    if (!selectedCustomerId) { toasterrormsg("Select a customer first"); return; }
    if (row.current_stock <= 0) { toasterrormsg(`"${row.itemName}" out of stock`); return; }

    let price = row.salesPrice;
    if (row.unitSupportsFractional && row.perUnitPrice > 0) price = row.perUnitPrice;

    const existing = addedItems.find(i => i.itemId === row.itemId && i.variantId === row.id);
    if (existing) { 
      await updateItem(existing.id, { quantity: existing.quantity + 1 }); 
      toastsuccessmsg(`+1 ${row.itemName}`); 
      return; 
    }

    try {
      const r = await Post("pos/sale-item-tax/", {
        item_id: row.itemId, customer_id: selectedCustomerId, qty: 1, price, discount_percent: 0,
      });
      const d = r.data;
      setAddedItems(prev => [...prev, {
        id: idCounter, itemId: row.itemId, variantId: row.id,
        itemName: row.itemName, hsnCode: row.hsnCode, quantity: 1,
        price, per: row.unit, taxSlab: row.taxSlab, discountPercent: 0,
        basicAmount: d.basic_amount.toFixed(2), discountAmount: d.discount_amount.toFixed(2),
        taxAmount: d.total_tax.toFixed(2), netValue: d.net_amount.toFixed(2),
        cgst: d.cgst.toFixed(2), sgst: d.sgst.toFixed(2), igst: d.igst.toFixed(2),
      }]);
      setIdCounter(p => p + 1);
      toastsuccessmsg(`✓ ${row.itemName}`);
    } catch { toasterrormsg("Failed to add item"); }
  };

  // ── barcode ──
  const handleBarcodeSearch = async (barcode: string) => {
    const b = barcode.trim();
    if (!b) return;
    if (!selectedCustomerId) { toasterrormsg("Select customer first"); setBarcodeValue(""); return; }
    setScanning(true);
    try {
      const local = itemsData.find(i => i.barcode && i.barcode.toLowerCase() === b.toLowerCase());
      if (local) { await addItemToCart(local); setBarcodeValue(""); setScanning(false); barcodeRef.current?.focus(); return; }
      
      const r = await Get(`pos/sale-search-item/?query=${encodeURIComponent(b)}`);
      if (r.data?.length > 0) {
        const match = r.data.find((i: any) => i.barcode && i.barcode.toLowerCase() === b.toLowerCase());
if (match) {
          await addItemToCart({
            id: match.id, itemId: match.itemId, itemName: match.itemName, hsnCode: match.hsnCode || "",
            salesPrice: match.salesPrice || 0, perUnitPrice: match.per_unit_price || match.salesPrice || 0,
            unit: match.unit || "", unitSupportsFractional: match.unit_supports_fractional || false,
            unit_name: match.unit_name || match.unit, taxSlab: match.taxSlab || "0",
            current_stock: match.current_stock || 0, barcode: match.barcode || "",
            size: match.size || "-", color: match.color || "-", srno: match.srno || "-", warrantydate: match.warrantydate || "-",
            categoryId: match.category_id ?? null,
            categoryName: match.category_name || "",
          });
        } else { toasterrormsg(`No item with barcode "${b}"`); }
      } else { toasterrormsg(`No item found`); }
    } catch { toasterrormsg("Barcode search failed"); }
    finally { setBarcodeValue(""); setScanning(false); barcodeRef.current?.focus(); }
  };

  // ── fetch initial data ──
  useEffect(() => {
    const fetchBT = async () => {
      try {
        const r = await Get("pos/user-branch/");
        setBranchType(r.data.branch_type);
      } catch { console.error("branch fetch failed"); }
    };
    fetchBT();
  }, []);

  useEffect(() => {
    if (!branchType) return;
    const fetch = async () => {
      try {
        const r = await Get("pos/sale-search-item/");
const mapped = r.data.map((item: any) => ({
          id: item.id, itemId: item.itemId, itemName: item.itemName,
          hsnCode: item.hsnCode, salesPrice: item.salesPrice || 0,
          perUnitPrice: item.per_unit_price || item.salesPrice,
          unit: item.unit || "", unitSupportsFractional: item.unit_supports_fractional || false,
          unit_name: item.unit_name || item.unit, taxSlab: item.taxSlab || "0",
          current_stock: item.current_stock || 0, size: item.size || "-",
          color: item.color || "-", srno: item.srno || "-",
          warrantydate: item.warrantydate || "-", barcode: item.barcode || "",
          categoryId: item.category_id ?? null,
          categoryName: item.category_name || "",
        }));
        setItemsData(mapped); setFilteredItems(mapped);
        if (mapped.length === 0) toastsuccessmsg("No items in stock");

        // Unique categories nikaal ke dropdown options banao
        const uniqueCats = Array.from(
          new Map(
            mapped
              .filter((m: any) => m.categoryId)
              .map((m: any) => [String(m.categoryId), { id: String(m.categoryId), label: m.categoryName }]),
          ).values(),
        ) as { id: string; label: string }[];
        setCategoryOptions([{ id: "", label: "All Categories" }, ...uniqueCats]);
      } catch { toasterrormsg("Failed to load items"); }
    };
    fetch();
  }, [branchType]);

  // ── Grid lazy-load: neeche scroll hote hi aur items dikhao ──
  const handleGridSentinel = useCallback((node: HTMLDivElement | null) => {
    gridSentinelRef.current = node;
  }, []);
  useEffect(() => {
  setSelectedCustomerId(customerName || 0);
}, [customerName]);

  useEffect(() => {
    if (viewMode !== "grid") return;
    const el = gridSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleGridCount(prev => Math.min(prev + GRID_PAGE_SIZE, filteredItems.length));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode, filteredItems.length]);

  useEffect(() => {
    Get("pos/customers/").then(r => { setCustomers(r.data); }).catch(() => {});
  }, []);

  // Sync selectedCustomer when customerName changes
  useEffect(() => {
    if (customerName && customers.length > 0) {
      const found = customers.find(c => c.id === customerName);
      if (found) setSelectedCustomer({ id: String(found.id), label: found.account_name });
    }
  }, [customerName, customers]);

  useEffect(() => {
    Get("pos/voucher/generate/?type=SI").then(r => setBillNo(r.data.voucher_no)).catch(() => toasterrormsg("Voucher no failed"));
  }, []);

  useEffect(() => {
    Get("pos/default-customer/").then(r => { if (r.data?.id) { setCustomerName(r.data.id); setSelectedCustomer({ id: String(r.data.id), label: r.data.account_name || r.data.name }); } }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!paymentTerms || paymentTerms === "Credit") { setAccounts([]); setAccount(0); setSelectedAccount(null); return; }
    setAccountLoading(true);
    Get(`pos/account-terms-type/?terms=${paymentTerms}`)
      .then(r => { setAccounts(r.data); setAccount(0); setSelectedAccount(null); })
      .catch(() => {})
      .finally(() => setAccountLoading(false));
  }, [paymentTerms]);

  // Sync selectedPaymentTerm when paymentTerms changes
  useEffect(() => {
    const found = paymentTermsOptions.find(t => t.id === paymentTerms);
    if (found) setSelectedPaymentTerm(found);
  }, [paymentTerms]);

  // Sync selectedAccount when account changes
  useEffect(() => {
    if (account && accounts.length > 0) {
      const found = accounts.find(a => a.id === account);
      if (found) setSelectedAccount({ id: String(found.id), label: found.account_name });
    }
  }, [account, accounts]);

// ── search + category filter ──
  useEffect(() => {
    let result = itemsData;

    if (selectedCategory?.id) {
      result = result.filter(i => String(i.categoryId) === selectedCategory.id);
    }

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.itemName?.toLowerCase().includes(t) || i.hsnCode?.toLowerCase().includes(t) ||
        (i.barcode && i.barcode.toLowerCase().includes(t)) ||
        (i.size && i.size.toLowerCase().includes(t)) || (i.color && i.color.toLowerCase().includes(t))
      );
    }

    setFilteredItems(result);
    setVisibleGridCount(GRID_PAGE_SIZE);   // filter badalte hi lazy-load reset
    setListPage(1);                        // filter badalte hi pagination reset
  }, [searchTerm, itemsData, selectedCategory]);

  // ── totals ──
  const calculateTotals = (items: CartItem[]) => ({
    totalBasic: items.reduce((s, i) => s + Number(i.basicAmount || 0), 0),
    totalDiscount: items.reduce((s, i) => s + Number(i.discountAmount || 0), 0),
    totalTax: items.reduce((s, i) => s + Number(i.taxAmount || 0), 0),
    totalNet: items.reduce((s, i) => s + Number(i.netValue || 0), 0),
    totalCgst: items.reduce((s, i) => s + Number(i.cgst || 0), 0),
    totalSgst: items.reduce((s, i) => s + Number(i.sgst || 0), 0),
    totalIgst: items.reduce((s, i) => s + Number(i.igst || 0), 0),
  });

  // ── build payload ──
  const buildPayload = () => {
    const totals = calculateTotals(addedItems);
    const freight = Number(freightCharge || 0);
    const other = Number(otherExpense || 0);
    const round = Number(roundAmount || 0);
    const grandTotal = totals.totalNet + freight + other + round;
    const payload: any = {
      date, customer: Number(customerName),
      payment_terms: paymentTerms, narration: narration || "",
      cash_account: null, bank_account: null, dueDate: dueDate,
      total_basic: totals.totalBasic, total_discount: totals.totalDiscount,
      total_tax: totals.totalTax, grand_total: grandTotal,
      frightcharge: freight, otherexpnse: other, roundamount: round,
      referral_code: referralCode || null,
      items: addedItems.map(it => ({
        item_id: it.itemId, variant_id: it.variantId, hsn_code: it.hsnCode,
        qty: Number(it.quantity), price: Number(it.price), unit: it.per,
        discount_percent: Number(it.discountPercent), tax_percent: Number(it.taxSlab) || 0,
        basic_amount: Number(it.basicAmount), discount_amount: Number(it.discountAmount),
        tax_amount: Number(it.taxAmount), net_amount: Number(it.netValue),
        cgst: it.cgst, sgst: it.sgst, igst: it.igst,
      })),
    };
    if (paymentTerms === "Cash") payload.cash_account = Number(account);
    if (paymentTerms === "Bank") payload.bank_account = Number(account);
    return payload;
  };

  // ── validate before submit ──
  const validateCart = (): string | null => {
    if (addedItems.length === 0) return "Add at least one item";
    if ((paymentTerms === "Cash" || paymentTerms === "Bank") && !account) return "Select account";
    return null;
  };

  // ── FINISH: save only, redirect ──
  const handleFinish = async () => {
    if (isSubmitting) return;

    const locationOk = await checkLocation();
    if (!locationOk) return;

    const err = validateCart();
    if (err) { toasterrormsg(err); return; }

    setSubmitAction("save");
    toastsuccessmsg("Saving sale & sending receipt email... please wait, don't click again.");
    try {
      const r = await Post("pos/salesentry-create/", buildPayload());
      toastsuccessmsg("Sale saved successfully!");
      if (r.data.stock_alerts) r.data.stock_alerts.forEach((m: any) => toasterrormsg(m));
      setAddedItems([]); setIdCounter(1);
      navigate("/sales/sales-entry-report");
    } catch {
      toasterrormsg("Error saving sale");
    } finally {
      setSubmitAction(null);
    }
  };

  // ── PRINT: save + show receipt ──
const handlePrint = async () => {
    if (isSubmitting) return;

    const locationOk = await checkLocation();
    if (!locationOk) return;

    const err = validateCart();
    if (err) { toasterrormsg(err); return; }

    setSubmitAction("print");
    toastsuccessmsg("Saving sale & sending receipt email... please wait, don't click again.");
    try {
      const r = await Post("pos/salesentry-create/", buildPayload());
      toastsuccessmsg("Sale saved successfully!");
      if (r.data.stock_alerts) r.data.stock_alerts.forEach((m: any) => toasterrormsg(m));
      setSavedSaleId(r.data.id);
      setAddedItems([]); setIdCounter(1);
      setShowReceiptModal(true);
    } catch {
      toasterrormsg("Error saving sale");
    } finally {
      setSubmitAction(null);
    }
  };

  const handleCustomerAdded = (c: Customer) => {
    setCustomers(prev => [...prev, c]);
    setCustomerName(c.id);
  };

  const totals = calculateTotals(addedItems);
  const grandTotal = totals.totalNet + Number(freightCharge || 0) + Number(otherExpense || 0) + Number(roundAmount || 0);

  const customerOptions = customers.map(c => ({ id: String(c.id), label: c.account_name }));
  const accountOptions = accounts.map(a => ({ id: String(a.id), label: a.account_name }));

  return (
    <Page title="Sales Entry Form 2">
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex flex-col">

        {/* ── Top Header ── */}
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm dark:bg-dark-800/80 dark:border-dark-700">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <Button variant="outlined"
                onClick={() => navigate("/sales/sales-entry-report")}>
                <ChevronLeftIcon className="size-4" /> Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingCartIcon className="text-white size-5" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base font-black text-gray-800 dark:text-dark-100 leading-none">Sales Entry</h1>
                  <p className="text-xs text-gray-500 dark:text-dark-400 mt-0.5 font-medium">Point of Sale</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-dark-400 font-medium hidden md:block">
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

          {/* ══════════════════════════════════════
              LEFT — Items Panel
          ══════════════════════════════════════ */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">

            {/* Search + Barcode */}
            <div className="px-4 py-4 bg-gray-50 border-b border-gray-200 space-y-3 shrink-0 dark:bg-dark-800 dark:border-dark-600">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="relative flex-1 w-full">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                  <Input
                    placeholder="Search by name, HSN, barcode, size, color..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 dark:bg-dark-700">
                    <button type="button" onClick={() => setViewMode("grid")}
                      className={clsx("p-2 rounded-md transition", viewMode === "grid" ? "bg-white shadow text-primary dark:bg-dark-600" : "text-gray-400 dark:text-dark-400")}>
                      <Squares2X2Icon className="size-4" />
                    </button>
                    <button type="button" onClick={() => setViewMode("list")}
                      className={clsx("p-2 rounded-md transition", viewMode === "list" ? "bg-white shadow text-primary dark:bg-dark-600" : "text-gray-400 dark:text-dark-400")}>
                      <ListBulletIcon className="size-4" />
                    </button>
                  </div>
                  <Badge variant="soft" color="primary" className="text-xs font-semibold">
                    {filteredItems.length} items
                  </Badge>
                </div>
              </div>

{/* Barcode + Category filter — 50/50 split */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <QrCodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary size-4" />
                    {scanning && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    <Input
                      ref={barcodeRef}
                      value={barcodeValue}
                      onChange={e => setBarcodeValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleBarcodeSearch(barcodeValue); } }}
                      placeholder="Scan barcode here (Enter to confirm)"
                      className="pl-9 h-10"
                      disabled={scanning}
                    />
                  </div>
                  <Button
                    onClick={() => handleBarcodeSearch(barcodeValue)}
                    disabled={scanning || !barcodeValue.trim()}
                    color="primary"
                  >
                    <QrCodeIcon className="size-4" /> Scan
                  </Button>
                </div>

                <Listbox
                  data={categoryOptions}
                  displayField="label"
                  placeholder="Filter by Category"
                  value={selectedCategory ?? categoryOptions[0] ?? null}
                  onChange={(item: any) => setSelectedCategory(item?.id ? item : null)}
                />
              </div>
            </div>

            {/* Grid / List */}
            <div className="flex-1 overflow-y-auto p-4">
{viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredItems.slice(0, visibleGridCount).map((item, i) => (
                    <ProductCard key={i} item={item} onAdd={addItemToCart} branchType={branchType} />
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="col-span-full flex flex-col items-center py-20 text-gray-300 dark:text-dark-500">
                      <TagIcon className="size-12" />
                      <p className="mt-3 text-sm font-medium">No items found</p>
                      <p className="text-xs text-gray-400 dark:text-dark-400 mt-1">Try adjusting your search</p>
                    </div>
                  )}
                  {/* Lazy-load sentinel — jab yeh screen pe aaye, aur items load ho jaate hain */}
                  {visibleGridCount < filteredItems.length && (
                    <div ref={handleGridSentinel} className="col-span-full flex items-center justify-center py-6">
                      <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
              ) : (
/* LIST VIEW */
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table hoverable className="w-full text-sm">
                      <THead>
                        <Tr className="bg-primary text-white">
                          {["Item Name", "HSN", "Barcode", ...(VARIANT_BY_BRANCH[branchType || ""] || []).map(f => f.charAt(0).toUpperCase() + f.slice(1)), "Unit", "Price", "Tax%", "Stock", "Add"].map((h, i) => (
                            <Th key={i} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide border-r border-primary/500 last:border-r-0 last:text-center whitespace-nowrap">
                              {h}
                            </Th>
                          ))}
                        </Tr>
                      </THead>
                      <TBody>
                        {filteredItems.slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE).map((item, idx) => (
                          <Tr key={idx} className={clsx("border-b border-gray-100 hover:bg-primary/[0.03] transition dark:border-dark-700", item.current_stock <= 0 && "opacity-40")}>
                            <Td className="px-3 py-3 font-semibold text-gray-800 dark:text-dark-100 border-r border-gray-100 dark:border-dark-700 max-w-[200px] truncate">{item.itemName}</Td>
                            <Td className="px-3 py-3 text-xs text-gray-500 border-r border-gray-100 dark:border-dark-700">{item.hsnCode}</Td>
                            <Td className="px-3 py-3 text-xs text-primary border-r border-gray-100 dark:border-dark-700">{item.barcode || "-"}</Td>
                            {(VARIANT_BY_BRANCH[branchType || ""] || []).map((f, fi) => (
                              <Td key={fi} className="px-3 py-3 text-xs text-gray-600 border-r border-gray-100 dark:border-dark-700">{item[f as keyof SaleItem] ?? "-"}</Td>
                            ))}
                            <Td className="px-3 py-3 text-xs text-gray-500 border-r border-gray-100 dark:border-dark-700">{item.unit_name}</Td>
                            <Td className="px-3 py-3 text-right font-bold text-primary border-r border-gray-100 dark:border-dark-700">₹{Number(item.salesPrice).toFixed(2)}</Td>
                            <Td className="px-3 py-3 text-center text-xs text-info-600 font-semibold border-r border-gray-100 dark:border-dark-700">{item.taxSlab}</Td>
                            <Td className="px-3 py-3 text-center border-r border-gray-100 dark:border-dark-700">
                              <Badge
                                color={item.current_stock > 5 ? "success" : item.current_stock > 0 ? "warning" : "error"}
                                variant="soft"
                                className="text-xs font-bold"
                              >
                                {item.current_stock}
                              </Badge>
                            </Td>
                            <Td className="px-3 py-3 text-center">
                              <Button
                                type="button"
                                onClick={() => addItemToCart(item)}
                                disabled={item.current_stock <= 0}
                                color="primary"
                              >
                                <PlusIcon className="size-3" /> Add
                              </Button>
                            </Td>
                          </Tr>
                        ))}
{filteredItems.length === 0 && (
                          <Tr><Td colSpan={10} className="text-center py-10 text-gray-400 dark:text-dark-500">No items found</Td></Tr>
                        )}
                      </TBody>
                    </Table>
                  </div>

                  {/* Pagination controls */}
                  {filteredItems.length > LIST_PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5 dark:border-dark-700">
                      <span className="text-xs text-gray-500 dark:text-dark-300">
                        Showing {(listPage - 1) * LIST_PAGE_SIZE + 1}–{Math.min(listPage * LIST_PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outlined" className="h-7 px-3 text-xs" disabled={listPage <= 1}
                          onClick={() => setListPage(p => p - 1)}>Prev</Button>
                        <Button variant="outlined" className="h-7 px-3 text-xs"
                          disabled={listPage >= Math.ceil(filteredItems.length / LIST_PAGE_SIZE)}
                          onClick={() => setListPage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════
              RIGHT — Billing Panel
          ══════════════════════════════════════ */}
          <div className="w-full lg:w-[450px] xl:w-[500px] 2xl:w-[550px] shrink-0 relative overflow-hidden bg-primary/5 dark:bg-dark-800 flex flex-col lg:border-l lg:border-gray-200 dark:lg:border-dark-700">

            {/* Scrollable billing content */}
            <div className="flex-1 overflow-y-auto">

              {/* Panel header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/90 backdrop-blur-sm shrink-0 dark:bg-dark-800/90 dark:border-dark-700">
                <h2 className="text-sm font-black text-primary flex items-center gap-2">
                  <DocumentTextIcon className="size-4" /> Billing
                </h2>
                <button type="button" onClick={() => { setAddedItems([]); setIdCounter(1); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-bold transition px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">
                  <XMarkIcon className="size-3" /> RESET
                </button>
              </div>

              {/* Bill details */}
              <div className="px-4 py-4 border-b border-gray-200 bg-white/50 space-y-3 shrink-0 dark:bg-dark-800/50 dark:border-dark-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="size-3" /> Date
                      </span>
                    </FieldLabel>
                    <DatePicker value={date} onChange={setDate} placeholder="Select date" />
                  </div>
                  <div>
                    <FieldLabel>
                      <span className="flex items-center gap-1">
                        <DocumentTextIcon className="size-3" /> Invoice No
                      </span>
                    </FieldLabel>
                    <div className="flex h-10 items-center rounded-xl border border-gray-200 bg-primary/5 px-3.5 text-xs text-primary dark:border-dark-500 dark:bg-dark-800 dark:text-primary-400">
                      {billNo || "Auto Generated"}
                    </div>
                  </div>
                </div>

                {/* Customer */}
                <div>
                  <FieldLabel required>Customer</FieldLabel>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Listbox
                        data={customerOptions}
                        placeholder="Select Customer"
                        value={selectedCustomer}
                        onChange={(item: any) => { setSelectedCustomer(item); setCustomerName(Number(item.id)); }}
                        displayField="label"
                      />
                    </div>
                    <Button color="primary"
                      onClick={() => setShowAddCustomer(true)}>
                      <PlusIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Payment</FieldLabel>
                    <Listbox
                      data={paymentTermsOptions}
                      placeholder="Select Terms"
                      value={selectedPaymentTerm}
                      onChange={(item: any) => { setSelectedPaymentTerm(item); setPaymentTerms(item.id); }}
                      displayField="label"
                    />
                  </div>
                  {paymentTerms?.toLowerCase() === "credit" ? (
                    <div>
                      <FieldLabel>Due Date</FieldLabel>
                      <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select due date" />
                    </div>
                  ) : (
                    <div>
                      <FieldLabel required>Account</FieldLabel>
                      <Listbox
                        data={accountOptions}
                        placeholder={`Select ${paymentTerms} Account`}
                        value={selectedAccount}
                        onChange={(item: any) => { setSelectedAccount(item); setAccount(Number(item.id)); }}
                        displayField="label"
                        disabled={accountLoading}
                      />
                    </div>
                  )}
                </div>
                {paymentTerms?.toLowerCase() === "credit" && (
                  <div>
                    <FieldLabel required>Account</FieldLabel>
                    <Listbox
                      data={accountOptions}
                      placeholder="Select Account"
                      value={selectedAccount}
                      onChange={(item: any) => { setSelectedAccount(item); setAccount(Number(item.id)); }}
                      displayField="label"
                      disabled={accountLoading}
                    />
                  </div>
                )}
                
                {/* Referral Code Input */}
                <ReferralCodeInput 
                  value={referralCode}
                  onChange={setReferralCode}
                  onVerified={(data) => setReferralAgentData(data)}
                />
              </div>

              {/* Cart column headers */}
              <div className="flex items-center px-4 py-2 border-b border-gray-200 bg-primary/5 shrink-0 dark:bg-dark-800/60 dark:border-dark-700">
                <span className="flex-1 text-xs font-bold text-primary uppercase tracking-wide">ITEM</span>
                <span className="text-xs font-bold text-primary uppercase tracking-wide mr-8">QTY</span>
                <span className="text-xs font-bold text-primary uppercase tracking-wide">AMOUNT</span>
              </div>

              {/* Cart */}
              <div className="px-4">
                {addedItems.map(item => (
                  <CartItemRow key={item.id} item={item}
                    onQtyChange={(id, qty) => updateItem(id, { quantity: qty })}
                    onPriceChange={(id, price) => updateItem(id, { price })}
                    onDiscountChange={(id, disc) => updateItem(id, { discountPercent: disc })}
                    onDelete={id => setAddedItems(p => p.filter(i => i.id !== id))}
                  />
                ))}
                {addedItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-primary/20 dark:text-primary/10">
                    <ShoppingCartIcon className="size-12" />
                    <p className="mt-3 text-sm font-medium text-primary/40 dark:text-primary/30">Cart is empty</p>
                    <p className="text-xs text-primary/30 dark:text-primary/20 mt-1">Click items to add them</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="shrink-0 border-t border-gray-200 bg-white/80 dark:bg-dark-800/80 dark:border-dark-700">
                {/* Extra charges */}
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Additional Charges</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: "freightCharge", ph: "Freight", value: freightCharge, onChange: setFreightCharge },
                      { name: "otherExpense", ph: "Other Exp", value: otherExpense, onChange: setOtherExpense },
                      { name: "roundAmount", ph: "Round Off", value: roundAmount, onChange: setRoundAmount },
                    ].map(({ name, ph, value, onChange }) => (
                      <div key={name}>
                        <label className="text-xs text-gray-500 dark:text-dark-400 block mb-1 font-medium">{ph}</label>
                        <Input
                          type="number"
                          value={value}
                          onChange={e => onChange(e.target.value)}
                          placeholder="0"
                          className="text-xs text-center h-9"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary rows */}
                <div className="px-4 py-3 space-y-2 border-t border-gray-100 dark:border-dark-700">
                  {[
                    { label: "Subtotal (Taxable)", value: `₹${totals.totalBasic.toFixed(2)}`, cls: "" },
                    { label: "Total Discount", value: `-₹${totals.totalDiscount.toFixed(2)}`, cls: "text-success-600 dark:text-success-400" },
                    ...(totals.totalCgst > 0 || totals.totalSgst > 0
                      ? [{ label: "CGST + SGST", value: `₹${(totals.totalCgst + totals.totalSgst).toFixed(2)}`, cls: "text-info-600 dark:text-info-400" }]
                      : totals.totalIgst > 0
                      ? [{ label: "IGST", value: `₹${totals.totalIgst.toFixed(2)}`, cls: "text-info-600 dark:text-info-400" }]
                      : []),
                    { label: "Estimated Tax", value: `₹${totals.totalTax.toFixed(2)}`, cls: "text-info-600 dark:text-info-400" },
                    ...(Number(freightCharge || 0) > 0 ? [{ label: "Freight", value: `₹${Number(freightCharge).toFixed(2)}`, cls: "" }] : []),
                    ...(Number(otherExpense || 0) > 0 ? [{ label: "Other Expense", value: `₹${Number(otherExpense).toFixed(2)}`, cls: "" }] : []),
                    ...(Number(roundAmount || 0) !== 0 ? [{ label: "Round Off", value: `₹${Number(roundAmount).toFixed(2)}`, cls: "" }] : []),
                  ].map((row: any) => (
                    <div key={row.label} className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-dark-400 font-medium">{row.label}</span>
                      <span className={clsx("font-semibold", row.cls || "text-gray-700 dark:text-dark-200")}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Grand Total band */}
                <div className="mx-4 mb-3 flex items-center justify-between bg-primary rounded-xl px-4 py-3 shadow-lg">
                  <span className="text-xs font-bold text-white/90 uppercase tracking-wide">Grand Total</span>
                  <span className="text-2xl font-black text-white">₹{grandTotal.toFixed(2)}</span>
                </div>

                {/* Narration */}
                <div className="px-4 pb-4">
                  <Textarea
                    value={narration}
                    onChange={e => setNarration(e.target.value)}
                    placeholder="Narration (optional)"
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Fixed Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-4 grid grid-cols-2 gap-3 dark:bg-dark-800/95 dark:border-dark-700 lg:left-auto lg:right-0 lg:w-[450px] xl:w-[500px] 2xl:w-[550px] lg:border-l lg:border-gray-200 lg:dark:border-dark-700">
<Button
                onClick={handleFinish}
                disabled={isSubmitting || locationLoading}
                className="flex items-center justify-center gap-2"
              >
                {submitAction === "save" ? (
                  <>
                    <span className="size-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <DocumentCheckIcon className="size-5" /> SAVE
                  </>
                )}
              </Button>
              <Button
                onClick={handlePrint}
                disabled={isSubmitting}
                color="primary"
                className="flex items-center justify-center gap-2"
              >
                {submitAction === "print" ? (
                  <>
                    <span className="size-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <PrinterIcon className="size-5" /> FINISH & PRINT
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Customer Add Modal */}
        <CustomerAddModal
          isOpen={showAddCustomer}
          onClose={() => setShowAddCustomer(false)}
          onCustomerAdded={handleCustomerAdded}
        />

        {/* Receipt Modal */}
        {showReceiptModal && savedSaleId && (
          <ReceiptComponent
            savedSaleId={savedSaleId}
            showReceiptModal={showReceiptModal}
            handleCloseReceipt={() => { setShowReceiptModal(false); navigate("/sales/sales-entry-report"); }}
          />
        )}
      </div>
    </Page>
  );
}
