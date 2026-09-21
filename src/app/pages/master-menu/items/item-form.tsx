
import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon, CheckCircleIcon, CubeIcon,
  PlusIcon, TrashIcon, XMarkIcon, TagIcon, QrCodeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Checkbox, Input } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { Get, Post, Put, Delete, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
type EntryType = "company" | "manual";

interface Opt { id: string; label: string; }
interface UnitOpt extends Opt {
  supports_fractional: boolean;
  symbol: string;
}
interface VariantRow {
  uid: number;
  serverId?: number;
  size?: string; color?: string; srno?: string; warrantydate?: string;
  purchasePrice: number; salesPrice: number; mrp: number;
  branchPrice: number; barcode: string; opStock: number;
  basicAmount: number; taxAmount: number; netValue: number;
}

const FIELD_CONFIG: Record<string, { key: string; label: string; type: string }[]> = {
  fashion: [{ key: "size", label: "Size", type: "text" }, { key: "color", label: "Color", type: "text" }],
  mart: [{ key: "size", label: "Size", type: "text" }],
  electronics: [
    { key: "size", label: "Size", type: "text" }, { key: "color", label: "Color", type: "text" },
    { key: "srno", label: "Serial No", type: "text" }, { key: "warrantydate", label: "Warranty Date", type: "date" },
  ],
};

const TAX_OPTS: Opt[] = ["5%", "12%", "18%", "28%", "Tax Free"].map(t => ({ id: t, label: t }));

const ITEM_NAME_MAX = 50;

function genBarcode(): string {
  const b12 = Date.now().toString().slice(-8) + Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  let s = 0;
  for (let i = 0; i < 12; i++) s += parseInt(b12[i]) * (i % 2 === 0 ? 1 : 3);
  return b12 + ((10 - (s % 10)) % 10);
}

// ── SectionCard ────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: {
  title: string; icon?: React.ComponentType<any>; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-500 dark:bg-dark-750">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-dark-600">
        {Icon && <Icon className="size-4 text-primary-500" />}
        <h4 className="text-sm font-semibold text-primary-600 dark:text-primary-400">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── FieldLabel ──────────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

// ── ThemedInput (plain input matching our form-input styles) ────────────────
function ThemedInput({ value, onChange, placeholder, type = "text", disabled, className, onBlur, maxLength, min }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; disabled?: boolean; className?: string; onBlur?: () => void;
  maxLength?: number; min?: number | string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      min={min}
      className={clsx(
        "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
        "disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-dark-600",
        "dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100",
        className,
      )}
    />
  );
}

// ── Create Group Modal ─────────────────────────────────────────────────────
function CreateGroupModal({ isOpen, onClose, onCreated }: {
  isOpen: boolean; onClose: () => void;
  onCreated: (id: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toasterrormsg("Enter group name."); return; }
    setSaving(true);
    try {
      const res = await Post("pos/groups/", { name: name.trim() }) as any;
      const b = res?.data ?? res;
      if (b?.success !== false && b?.group) {
        toastsuccessmsg(`Group "${b.group.name}" created.`);
        onCreated(String(b.group.id), b.group.name);
        setName(""); onClose();
      } else { toasterrormsg(b?.message ?? "Failed to create group."); }
    } catch (e: any) {
      toasterrormsg(e?.response?.data?.errors?.name?.[0] ?? e?.response?.data?.message ?? "Failed.");
    } finally { setSaving(false); }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[210]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm dark:bg-black/50"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as={DialogPanel}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-700"
          >
            <div className="flex items-center justify-between bg-primary px-5 py-4">
              <h3 className="text-base font-bold text-white">Create New Group</h3>
              <Button onClick={onClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
                <XMarkIcon className="size-5" />
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <Input label="Group Name *" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g., Electronics, Clothing" classNames={{ input: "h-9 text-sm" }} />
              <div className="flex gap-3 pt-2">
                <Button color="primary" className="flex-1" onClick={save} disabled={saving}>
                  {saving ? "Creating…" : "Create Group"}
                </Button>
                <Button variant="outlined" className="flex-1" onClick={onClose}>Cancel</Button>
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ItemFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

const isSuperAdmin = useMemo(() => {
    return localStorage.getItem("role") === "superadmin";
  }, []);

  // ── form fields ────────────────────────────────────────────────────────
  const [itemName, setItemName] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [entryType, setEntryType] = useState<EntryType>(isSuperAdmin ? "company" : "manual");
  const [websiteDisplay, setWebsite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Listbox selections
  const [selGroup, setSelGroup] = useState<Opt | null>(null);
  const [selUnit, setSelUnit] = useState<UnitOpt | null>(null);
  const [selTax, setSelTax] = useState<Opt | null>(null);
  const [selCat, setSelCat] = useState<Opt | null>(null);
  const [selBrand, setSelBrand] = useState<Opt | null>(null);
  const [selSubCat, setSelSubCat] = useState<Opt | null>(null);
  const [selSubSubCat, setSelSubSubCat] = useState<Opt | null>(null);

  // Manual entry fields
  const [manBrand, setManBrand] = useState("");
  const [manCat, setManCat] = useState("");
  const [manSubCat, setManSubCat] = useState("");
  const [manSubSubCat, setManSubSubCat] = useState("");

  // ── dropdowns data ─────────────────────────────────────────────────────
  const [groups, setGroups] = useState<Opt[]>([]);
  const [units, setUnits] = useState<UnitOpt[]>([]);
  const [cats, setCats] = useState<Opt[]>([]);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [subCats, setSubCats] = useState<Opt[]>([]);
  const [subSubCats, setSubSubCats] = useState<Opt[]>([]);
  const [branchFields, setBranchFields] = useState<{ key: string; label: string; type: string }[]>([]);

  // ── loading gates (mirrors old screen's branchLoaded / groupsAndUnitsLoaded / dataFetchComplete) ──
  const [branchLoaded, setBranchLoaded] = useState(false);
  const [groupsUnitsLoaded, setGroupsUnitsLoaded] = useState(false);
  const [itemDataLoaded, setItemDataLoaded] = useState(!isEdit);
  const pageLoading = !(branchLoaded && groupsUnitsLoaded && itemDataLoaded);

  // ── variant row inputs ─────────────────────────────────────────────────
  const EMPTY = {
    size: "", color: "", srno: "", warrantydate: "",
    purchasePrice: "", salesPrice: "", mrp: "", branchPrice: "", barcode: "", opStock: ""
  };
  const [cur, setCur] = useState<any>({ ...EMPTY });
  const [barcodeError, setBarcodeError] = useState("");
  const [checkingBarcode, setCheckingBarcode] = useState(false);
  const currentBarcodeRef = useRef("");
  const barcodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── added variants ─────────────────────────────────────────────────────
  const [addedItems, setAddedItems] = useState<VariantRow[]>([]);
  const [uid, setUid] = useState(1);
  const [editingUid, setEditingUid] = useState<number | null>(null); 

  // ── ui ─────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [groupModal, setGroupModal] = useState(false);

  // live calc
  const liveBasic = (Number(cur.opStock) || 0) * (Number(cur.purchasePrice) || 0);
  const taxRate = selTax ? (parseFloat(selTax.id) || 0) : 0;
  const liveNet = liveBasic * (1 + taxRate / 100);

  // ── load reference data ────────────────────────────────────────────────
  useEffect(() => {
    Get("pos/user-branch/").then((res: any) => {
      const b = (res?.data ?? res)?.branch_type?.toLowerCase() ?? "fashion";
      setBranchFields(FIELD_CONFIG[b] ?? []);
    }).catch(() => {
      setBranchFields([]);
    }).finally(() => setBranchLoaded(true));

    Promise.all([Get("pos/all-groups/"), Get("pos/all-units/")]).then(([gR, uR]: any[]) => {
      const g = gR?.data ?? gR;
      setGroups((g?.groups ?? (Array.isArray(g) ? g : [])).map((x: any) => ({ id: String(x.id), label: x.name })));
      const u = uR?.data ?? uR;
      setUnits((u?.units ?? (Array.isArray(u) ? u : [])).map((x: any) => ({
        id: String(x.id), label: `${x.name}${x.symbol ? ` (${x.symbol})` : ""}`,
        supports_fractional: x.supports_fractional ?? false, symbol: x.symbol ?? "",
      })));
    }).catch(() => { }).finally(() => setGroupsUnitsLoaded(true));
  }, []);

  useEffect(() => {
    if (entryType !== "company") return;
    Promise.all([Get("pos/categories/"), Get("pos/brands/")]).then(([cR, bR]: any[]) => {
      const cr = cR?.data ?? cR;
      setCats((Array.isArray(cr) ? cr : cr?.results ?? []).map((c: any) => ({ id: String(c.id), label: c.name })));
      const br = bR?.data ?? bR;
      setBrands((Array.isArray(br) ? br : br?.results ?? []).map((b: any) => ({ id: String(b.id), label: b.brand_name ?? b.name })));
    }).catch(() => { });
  }, [entryType]);

  useEffect(() => {
    if (!isSuperAdmin) setEntryType("manual");
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!selCat?.id) { setSubCats([]); setSelSubCat(null); return; }
    Get("pos/subcategories/", { category: selCat.id }).then((res: any) => {
      const r = res?.data ?? res;
      setSubCats((Array.isArray(r) ? r : r?.results ?? []).map((s: any) => ({ id: String(s.id), label: s.name })));
    }).catch(() => { });
  }, [selCat]);

  useEffect(() => {
    if (!selSubCat?.id) { setSubSubCats([]); setSelSubSubCat(null); return; }
    Get("pos/subsubcategories/", { subcategory: selSubCat.id }).then((res: any) => {
      const r = res?.data ?? res;
      setSubSubCats((Array.isArray(r) ? r : r?.results ?? []).map((s: any) => ({ id: String(s.id), label: s.name })));
    }).catch(() => { });
  }, [selSubCat]);

  // ── edit mode load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    Get(`pos/items/${id}/with-variants/`).then((res: any) => {
      const b = res?.data ?? res;
      if (b?.item) {
        const item = b.item;
        setItemName(item.itemName ?? "");
        setHsnCode(item.hsnCode ?? "");
        setWebsite(item.website_display ?? false);
        setEntryType(item.entry_type ?? "company");
        if (item.group) setSelGroup({ id: String(item.group.id), label: item.group.name });
        if (item.unit) setSelUnit({ id: String(item.unit.id), label: item.unit.name, supports_fractional: item.unit.supports_fractional ?? false, symbol: item.unit.symbol ?? "" });
        if (item.taxSlab) setSelTax(TAX_OPTS.find(t => t.id === item.taxSlab) ?? null);
        if (item.category) setSelCat({ id: String(item.category.id), label: item.category.name });
        if (item.brand) setSelBrand({ id: String(item.brand.id), label: item.brand.brand_name ?? item.brand.name });
        if (item.subCategory) setSelSubCat({ id: String(item.subCategory.id), label: item.subCategory.name });
        if (item.subsubCategory) setSelSubSubCat({ id: String(item.subsubCategory.id), label: item.subsubCategory.name });
        if (item.entry_type === "manual") {
          setManBrand(item.manual_brand ?? ""); setManCat(item.manual_category ?? "");
          setManSubCat(item.manual_subCategory ?? ""); setManSubSubCat(item.manual_subSubCategory ?? "");
        }
        const vars: VariantRow[] = (b.variants ?? []).map((v: any, i: number) => ({
          uid: i + 1, serverId: v.id,
          size: v.size ?? "", color: v.color ?? "", srno: v.srno ?? "", warrantydate: v.warrantydate ?? "",
          purchasePrice: v.purchasePrice ?? 0, salesPrice: v.salesPrice ?? 0,
          mrp: v.mrp ?? 0, branchPrice: v.branchPrice ?? 0, barcode: v.barcode ?? "",
          opStock: v.opStock ?? 0, basicAmount: v.basicAmount ?? 0, taxAmount: v.taxAmount ?? 0, netValue: v.netValue ?? 0,
        }));
        setAddedItems(vars); setUid(vars.length + 1);
      }
    }).catch(() => toasterrormsg("Failed to load item."))
      .finally(() => setItemDataLoaded(true));
  }, [id, isEdit]);

  // ── barcode check (debounced, matches old screen's 500ms behaviour) ────
const checkBarcode = async (barcode: string): Promise<boolean> => {
    if (!isSuperAdmin || !barcode || barcode.length < 3) { setBarcodeError(""); return true; }
    setCheckingBarcode(true);
    try {
      // jis row ko edit kar rahe hain uska apna barcode dobara conflict na dikhaye
      const editingRow = editingUid !== null ? addedItems.find(v => v.uid === editingUid) : null;
      const params: any = { barcode };
      if (editingRow?.serverId) params.exclude_variant = editingRow.serverId;

      const res = await Get("pos/barcodes/check-branch-barcode/", params) as any;
      if ((res?.data ?? res)?.exists) {
        setBarcodeError(`Barcode "${barcode}" already exists in this branch.`); return false;
      }
      setBarcodeError(""); return true;
    } catch { setBarcodeError(""); return true; }
    finally { setCheckingBarcode(false); }
  };

  const handleBarcodeChange = (raw: string) => {
    const val = raw.replace(/[^a-zA-Z0-9]/g, "");
    setCur((p: any) => ({ ...p, barcode: val }));
    currentBarcodeRef.current = val;

    if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);

    if (val.length >= 3) {
      barcodeDebounceRef.current = setTimeout(() => {
        if (currentBarcodeRef.current === val) checkBarcode(val);
      }, 500);
    } else {
      setBarcodeError("");
    }
  };

  useEffect(() => () => {
    if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);
  }, []);

  // ── add variant ────────────────────────────────────────────────────────
// ── add / update variant ──────────────────────────────────────────────
  const handleAddVariant = async () => {
    const pp = Number(cur.purchasePrice), sp = Number(cur.salesPrice), mrp = Number(cur.mrp);

    if (!cur.purchasePrice || !cur.salesPrice || !cur.mrp) {
      toasterrormsg("Fill Purchase Price, Sales Price and MRP."); return;
    }
    if (pp < 0 || sp < 0 || mrp < 0 || (cur.opStock && Number(cur.opStock) < 0)) {
      toasterrormsg("Price and stock values cannot be negative."); return;
    }
    if (sp > mrp) {
      toasterrormsg("Sales Price cannot be greater than MRP."); return;
    }
    if (cur.barcode && !(await checkBarcode(cur.barcode))) {
      toasterrormsg(`Barcode "${cur.barcode}" already exists in this branch. Please use a different barcode.`);
      return;
    }

    const basic = (Number(cur.opStock) || 0) * pp;
    const taxAmt = basic * (taxRate / 100);
    const variantPayload = {
      ...branchFields.reduce((a, f) => ({ ...a, [f.key]: cur[f.key] ?? "" }), {}),
      purchasePrice: pp, salesPrice: sp,
      mrp, branchPrice: Number(cur.branchPrice) || pp,
      barcode: cur.barcode ?? "", opStock: Number(cur.opStock) || 0,
      basicAmount: basic, taxAmount: taxAmt, netValue: basic + taxAmt,
    };

    if (editingUid !== null) {
      // pehle se list mein maujood row ko update karo (serverId preserve rehta hai)
      setAddedItems(prev => prev.map(v => (v.uid === editingUid ? { ...v, ...variantPayload } : v)));
      toastsuccessmsg("Variant updated successfully.");
      setEditingUid(null);
    } else {
      setAddedItems(prev => [...prev, { uid, ...variantPayload }]);
      setUid(p => p + 1);
      toastsuccessmsg("Variant added successfully.");
    }

    setCur({ ...EMPTY }); setBarcodeError(""); currentBarcodeRef.current = "";
  };

  // table ke Edit icon se click hone par row ke values wapas form mein bhar do
  const handleEditVariant = (v: VariantRow) => {
    setCur({
      size: v.size ?? "", color: v.color ?? "", srno: v.srno ?? "", warrantydate: v.warrantydate ?? "",
      purchasePrice: String(v.purchasePrice ?? ""), salesPrice: String(v.salesPrice ?? ""),
      mrp: String(v.mrp ?? ""), branchPrice: String(v.branchPrice ?? ""),
      barcode: v.barcode ?? "", opStock: String(v.opStock ?? ""),
    });
    setEditingUid(v.uid);
    setBarcodeError("");
  };

  const handleCancelEditVariant = () => {
    setEditingUid(null);
    setCur({ ...EMPTY });
    setBarcodeError("");
  };

  const removeVariant = async (v: VariantRow) => {
    if (!confirm("Delete this variant?")) return;
    if (v.serverId && v.serverId > 0) {
      try { await Delete(`pos/variant-delete/${v.serverId}/`, {}); }
      catch { toasterrormsg("Failed to delete variant."); return; }
    }
    setAddedItems(p => p.filter(x => x.uid !== v.uid));
    toastsuccessmsg("Variant deleted successfully.");
  };

  const totals = useMemo(() => ({
    qty: addedItems.reduce((s, i) => s + i.opStock, 0),
    net: addedItems.reduce((s, i) => s + i.netValue, 0),
    tax: addedItems.reduce((s, i) => s + i.taxAmount, 0),
  }), [addedItems]);

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!itemName.trim()) errs.itemName = "Item name is required";
    else if (itemName.trim().length > ITEM_NAME_MAX) errs.itemName = `Max ${ITEM_NAME_MAX} characters`;
    if (addedItems.length === 0) errs.variants = "Add at least one variant";
    if (Object.keys(errs).length) { setErrors(errs); toasterrormsg("Please fix the errors."); return; }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        itemName: itemName.trim(), entry_type: entryType,
        hsnCode: hsnCode || "", taxSlab: selTax?.id || "",
        group_id: selGroup?.id ? Number(selGroup.id) : null,
        unit_id: selUnit?.id ? Number(selUnit.id) : null,
        website_display: websiteDisplay,
        brand: entryType === "company" ? (selBrand?.id ? Number(selBrand.id) : null) : manBrand,
        category: entryType === "company" ? (selCat?.id ? Number(selCat.id) : null) : manCat,
        subCategory: entryType === "company" ? (selSubCat?.id ? Number(selSubCat.id) : null) : manSubCat,
        subSubCategory: entryType === "company" ? (selSubSubCat?.id ? Number(selSubSubCat.id) : null) : manSubSubCat,
        variants: addedItems.map(v => {
          const vp: any = {
            purchasePrice: v.purchasePrice, salesPrice: v.salesPrice, mrp: v.mrp,
            branchPrice: v.branchPrice, barcode: v.barcode, opStock: v.opStock,
            basicAmount: v.basicAmount, discountAmount: 0,
            taxAmount: v.taxAmount, netValue: v.netValue,
          };
          if (v.serverId && v.serverId > 0) vp.id = v.serverId;
          branchFields.forEach(f => { vp[f.key] = (v as any)[f.key] ?? null; });
          return vp;
        }),
      };
      if (isEdit) { await Put(`pos/item-update/${id}/`, payload); toastsuccessmsg("Item updated successfully."); }
      else { await Post("pos/item-create/", payload); toastsuccessmsg("Item & Variants saved successfully."); }
      navigate("/master-menu/add-items");
    } catch (e: any) {
      const d = e?.response?.data;
      if (d && typeof d === "object") Object.entries(d).forEach(([k, v]) => toasterrormsg(`${k}: ${(v as any[]).join?.(", ") ?? v}`));
      else toasterrormsg("Failed to save item.");
    } finally { setSaving(false); }
  };

  if (pageLoading) return (
    <Page title={isEdit ? "Edit Item" : "Add Item"}>
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-dark-300">Loading…</p>
      </div>
    </Page>
  );

const barcodeRequired = false;   // purani screen ki tarah barcode kabhi mandatory nahi
  const barcodeMissing = false;
  return (
    <Page title={isEdit ? "Edit Item" : "Add Item"}>
      <div className="transition-content w-full pb-32 space-y-5">

        {/* ── Toolbar ──────────────────────────────────────────────── */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-1">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={() => navigate("/master-menu/add-items")}>
              <ArrowLeftIcon className="size-4" /> Back
            </Button>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
                {isEdit ? "Edit Item" : "Add New Item"}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
                {isEdit ? "Update item details and variants" : "Fill in details and add variants"}
              </p>
            </div>
          </div>

          <Button type="button" variant="soft" color="primary"
            className="h-8 gap-2 rounded-md px-3 text-sm"
            onClick={() => navigate("/master-menu/pending-barcodes")}>
            <QrCodeIcon className="size-4" /> Pending Barcodes
          </Button>
        </div>

        {/* ── Entry Type radio ──────────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-dark-500 dark:bg-dark-750">
            <span className="text-sm font-semibold text-gray-700 dark:text-dark-200">Entry Type:</span>
            {isSuperAdmin && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" className="accent-primary size-4" checked={entryType === "company"}
                  onChange={() => setEntryType("company")} disabled={isEdit} />
                Company
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" className="accent-primary size-4" checked={entryType === "manual"}
                onChange={() => setEntryType("manual")} disabled={isEdit} />
              Manual
            </label>
          </div>
        </div>

        {/* ── Item Details card ─────────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <SectionCard title="Item Details" icon={TagIcon}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <FieldLabel required>Item Name</FieldLabel>
                <ThemedInput value={itemName} onChange={setItemName} placeholder="Enter item name" maxLength={ITEM_NAME_MAX} />
                <div className="mt-1 flex items-center justify-between">
                  {errors.itemName
                    ? <p className="text-xs text-error-600">{errors.itemName}</p>
                    : <span />}
                  <span className="text-[10px] text-gray-400">{itemName.length}/{ITEM_NAME_MAX}</span>
                </div>
              </div>

              {entryType === "company" ? (
                <>
                  <Listbox data={brands} displayField="label" placeholder="Select Brand"
                    label="Brand" value={selBrand ?? null} onChange={(v: any) => setSelBrand(v ?? null)} />
                  <Listbox data={cats} displayField="label" placeholder="Select Category"
                    label="Category" value={selCat ?? null} onChange={(v: any) => { setSelCat(v ?? null); setSelSubCat(null); setSelSubSubCat(null); }} />
                  <Listbox data={subCats} displayField="label" placeholder="Select Sub Category"
                    label="Sub Category" value={selSubCat ?? null} onChange={(v: any) => { setSelSubCat(v ?? null); setSelSubSubCat(null); }} />
                  <Listbox data={subSubCats} displayField="label" placeholder="Select Sub Sub Category"
                    label="Sub Sub Category" value={selSubSubCat ?? null} onChange={(v: any) => setSelSubSubCat(v ?? null)} />
                </>
              ) : (
                <>
                  <div><FieldLabel>Brand</FieldLabel><ThemedInput value={manBrand} onChange={setManBrand} placeholder="Brand name" /></div>
                  <div><FieldLabel>Category</FieldLabel><ThemedInput value={manCat} onChange={setManCat} placeholder="Category" /></div>
                  <div><FieldLabel>Sub Category</FieldLabel><ThemedInput value={manSubCat} onChange={setManSubCat} placeholder="Sub Category" /></div>
                  <div><FieldLabel>Sub Sub Category</FieldLabel><ThemedInput value={manSubSubCat} onChange={setManSubSubCat} placeholder="Sub Sub Category" /></div>
                </>
              )}

              {/* Group + New button */}
              <div>
                <FieldLabel>Group</FieldLabel>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Listbox data={groups} displayField="label" placeholder="Select Group"
                      value={selGroup ?? null} onChange={(v: any) => setSelGroup(v ?? null)} />
                  </div>
                  <Button type="button" variant="soft" color="primary"
                    className="h-9 shrink-0 gap-1 rounded-lg px-3 text-xs"
                    onClick={() => setGroupModal(true)}>
                    <PlusIcon className="size-3.5" /> New
                  </Button>
                </div>
              </div>

              <Listbox data={units} displayField="label" placeholder="Select Unit"
                label="Unit" value={selUnit ?? null}
                onChange={(v: any) => setSelUnit(v ?? null)} />

              <div>
                <FieldLabel>HSN Code</FieldLabel>
                <ThemedInput value={hsnCode} onChange={setHsnCode} placeholder="HSN Code" />
              </div>

              <Listbox data={TAX_OPTS} displayField="label" placeholder="Select Tax Slab"
                label="Tax Slab" value={selTax ?? null} onChange={(v: any) => setSelTax(v ?? null)} />


              {entryType === "company" && (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-500 dark:bg-dark-800 sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Website Display
                  </label>

                  <Checkbox
                    checked={websiteDisplay}
                    onChange={() => setWebsite((v) => !v)}
                  />

                  {websiteDisplay ? (
                    <Badge color="success" variant="soft" className="text-xs">
                      Ok
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-400">
                      Hidden from website
                    </span>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Variant entry card ────────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <SectionCard title="Add Variant" icon={CubeIcon}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
              {/* Branch-specific fields */}
              {branchFields.map(f => (
                <div key={f.key}>
                  <FieldLabel>{f.label}</FieldLabel>
                  <ThemedInput value={cur[f.key] ?? ""} onChange={v => setCur((p: any) => ({ ...p, [f.key]: v }))}
                    type={f.type === "date" ? "date" : "text"} placeholder={f.label} />
                </div>
              ))}

              {isSuperAdmin && (
                <div>
                  <FieldLabel>Branch Price</FieldLabel>
                  <ThemedInput value={cur.branchPrice} onChange={v => setCur((p: any) => ({ ...p, branchPrice: v }))} type="number" min={0} placeholder="0" />
                </div>
              )}

              <div>
                <FieldLabel required>Purchase Price</FieldLabel>
                <ThemedInput value={cur.purchasePrice} onChange={v => setCur((p: any) => ({ ...p, purchasePrice: v }))} type="number" min={0} placeholder="0.00" />
              </div>
              <div>
                <FieldLabel required>Sales Price</FieldLabel>
                <ThemedInput value={cur.salesPrice} onChange={v => setCur((p: any) => ({ ...p, salesPrice: v }))} type="number" min={0} placeholder="0.00" />
              </div>
              <div>
                <FieldLabel required>M.R.P</FieldLabel>
                <ThemedInput value={cur.mrp} onChange={v => setCur((p: any) => ({ ...p, mrp: v }))} type="number" min={0} placeholder="0.00" />
                {cur.salesPrice && cur.mrp && Number(cur.salesPrice) > Number(cur.mrp) && (
                  <p className="mt-1 text-[10px] text-error-600">Sales Price cannot be greater than MRP</p>
                )}
              </div>

              {/* Barcode */}
              <div>
                <FieldLabel required={barcodeRequired}>
                  Barcode
                  {checkingBarcode && <span className="ml-2 text-xs text-primary-500">checking…</span>}
                </FieldLabel>
                <div className="flex gap-1.5">
                  <ThemedInput value={cur.barcode}
                    onChange={handleBarcodeChange}
                    onBlur={() => { if (cur.barcode?.length >= 3) checkBarcode(cur.barcode); }}
                    placeholder={barcodeRequired ? "Barcode required" : "Optional"}
                    className={clsx(
                      barcodeError && "border-error-500",
                      barcodeMissing && "border-amber-300 bg-amber-50",
                    )} />

                </div>
                {barcodeError && <p className="mt-1 text-xs text-error-600">{barcodeError}</p>}
                {!isSuperAdmin && entryType === "company" && !cur.barcode && !barcodeError && (
                  <p className="mt-1 text-[10px] text-gray-400">Optional — you can leave it empty</p>
                )}
              </div>

              <div>
                <FieldLabel>Op. Stock</FieldLabel>
                <ThemedInput value={cur.opStock} onChange={v => setCur((p: any) => ({ ...p, opStock: v }))} type="number" min={0} placeholder="0" />
              </div>

              {/* Live calc display */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-dark-500 dark:bg-dark-800">
                <p className="text-xs text-gray-400">Basic Amt</p>
                <p className="mt-0.5 font-bold tabular-nums text-primary-600 dark:text-primary-400">
                  ₹{liveBasic > 0 ? liveBasic.toFixed(2) : "0.00"}
                </p>
                {liveNet > liveBasic && <p className="text-xs text-gray-400">Net: ₹{liveNet.toFixed(2)}</p>}
              </div>

<div className="flex gap-2">
                <Button type="button" color="primary" className="h-9 flex-1 gap-2 rounded-lg px-4 text-sm"
                  onClick={handleAddVariant}>
                  <CheckCircleIcon className="size-4" /> {editingUid !== null ? "Update" : "Add"}
                </Button>
                {editingUid !== null && (
                  <Button type="button" variant="outlined" className="h-9 rounded-lg px-3 text-sm"
                    onClick={handleCancelEditVariant}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {selUnit?.supports_fractional && (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary-700 dark:bg-primary/10 dark:text-primary-300">
                <span className="font-semibold">{selUnit.symbol}</span> — proportional pricing active.
                {Number(cur.opStock) > 0 && Number(cur.purchasePrice) > 0 &&
                  ` Total: ₹${(Number(cur.opStock) * Number(cur.purchasePrice)).toFixed(4)}`}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Variants table ────────────────────────────────────────── */}
        <div className="px-(--margin-x)">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-500 dark:bg-dark-750">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-dark-600">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-200">Variants</h4>
                {addedItems.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-600 dark:bg-primary/20 dark:text-primary-400">
                    {addedItems.length}
                  </span>
                )}
              </div>
              {addedItems.length > 0 && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Net: ₹{totals.net.toFixed(2)}
                </span>
              )}
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: "320px" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-primary">
                  <tr>
                    {["#", ...branchFields.map(f => f.label),
                      ...(isSuperAdmin ? ["Branch ₹"] : []),
                      "Purchase ₹", "Sales ₹", "MRP", "Barcode", "Op.Stock", "Net Value", ""].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-white">{h}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {addedItems.length === 0 ? (
                    <tr><td colSpan={20} className="py-12 text-center">
                      <CubeIcon className="mx-auto mb-2 size-8 text-gray-200 dark:text-dark-600" />
                      <p className="text-sm text-gray-400">No variants added yet</p>
                    </td></tr>
                  ) : addedItems.map((v, i) => (
                    <tr key={v.uid} className="border-t border-gray-100 hover:bg-primary/5 dark:border-dark-600">
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      {branchFields.map(f => (
                        <td key={f.key} className="px-4 py-2.5 text-gray-700 dark:text-dark-200">{(v as any)[f.key] || "—"}</td>
                      ))}
                      {isSuperAdmin && <td className="px-4 py-2.5 tabular-nums text-gray-600 dark:text-dark-200">₹{v.branchPrice}</td>}
                      <td className="px-4 py-2.5 tabular-nums font-medium text-gray-800 dark:text-dark-100">₹{v.purchasePrice}</td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-600 dark:text-dark-200">₹{v.salesPrice}</td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-600 dark:text-dark-200">₹{v.mrp}</td>
                      <td className="px-4 py-2.5  text-xs text-gray-500 dark:text-dark-300">{v.barcode || "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-700 dark:text-dark-200">{v.opStock}</td>
                      <td className="px-4 py-2.5 font-bold tabular-nums text-primary-600 dark:text-primary-400">₹{v.netValue.toFixed(2)}</td>
<td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <Button type="button" isIcon variant="flat" className="size-7 rounded-full hover:bg-primary/10"
                            title="Edit" onClick={() => handleEditVariant(v)}>
                            <PencilSquareIcon className="size-3.5 text-primary-600" />
                          </Button>
                          <Button type="button" isIcon variant="flat" className="size-7 rounded-full hover:bg-error-50 dark:hover:bg-error-900/20"
                            title="Delete" onClick={() => removeVariant(v)}>
                            <TrashIcon className="size-3.5 text-error-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {addedItems.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-dark-800">
                    <tr className="border-t-2 border-gray-200 dark:border-dark-500">
                      <td colSpan={branchFields.length + (isSuperAdmin ? 5 : 4) + 1}
                        className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500">
                        Total — Qty: {totals.qty} · Tax: ₹{totals.tax.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 font-bold tabular-nums text-primary-600 dark:text-primary-400">
                        ₹{totals.net.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          {errors.variants && <p className="mt-1 text-xs text-error-600">{errors.variants}</p>}
        </div>

      </div>

      {/* ── Sticky footer ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-50 flex flex-wrap items-center justify-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-dark-500 dark:bg-dark-700/95">
<Button type="button" variant="outlined"
          className="h-9 gap-2 rounded-lg px-4 text-sm text-error-600 border-error-300 hover:bg-error-50 dark:border-error-700 dark:hover:bg-error-900/20"
          onClick={() => { setAddedItems([]); setCur({ ...EMPTY }); setEditingUid(null); }}>
          <TrashIcon className="size-4" /> Clear Variants
        </Button>
        <Button type="button" variant="outlined" className="h-9 gap-2 rounded-lg px-4 text-sm"
          onClick={() => navigate("/master-menu/add-items")}>
          <ArrowLeftIcon className="size-4" /> Cancel
        </Button>
        <Button type="button" variant="soft" color="primary" className="h-9 gap-2 rounded-lg px-4 text-sm"
          onClick={() => navigate("/master-menu/pending-barcodes")}>
          <QrCodeIcon className="size-4" /> Pending Barcodes
        </Button>
        <Button type="button" color="primary"
          className="h-9 gap-2 rounded-lg px-8 text-sm font-semibold"
          disabled={saving} onClick={handleSave}>
          {saving
            ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
            : <><CheckCircleIcon className="size-4" />{isEdit ? "Update Item" : "Save Item"}</>}
        </Button>
      </div>

      <CreateGroupModal isOpen={groupModal} onClose={() => setGroupModal(false)}
        onCreated={(id, name) => {
          setGroups(prev => [...prev, { id, label: name }]);
          setSelGroup({ id, label: name });
          toastsuccessmsg(`Group "${name}" created and selected.`);
        }} />
    </Page>
  );
}