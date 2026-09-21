import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
  CellContext,
} from "@tanstack/react-table";
import { WithIcon, type TabItem } from "@/components/ui/Tab";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CubeIcon,
  PhotoIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  ListBulletIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, Checkbox } from "@/components/ui";
import { Get, Patch, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
type WebsiteStatus = "pending" | "approved" | "rejected" | "draft";

interface Variant {
  id: number;
  purchasePrice: number;
  salesPrice: number;
  mrp: number;
  barcode: string;
  opStock: number;
  current_stock: number;
  size?: string;
  color?: string;
  srno?: string;
  warrantydate?: string;
  variant_image?: string | null;
}

interface WebsiteItem {
  id: number;
  itemName: string;
  entry_type: string;
  branch_name: string;
  brand: { id: number | null; name: string } | null;
  category: { id: number | null; name: string } | null;
  subCategory: { id: number | null; name: string } | null;
  unit: { id: number; name: string; symbol: string } | string | null;
  hsnCode: string;
  taxSlab: string;
  variants: Variant[];
  gallery?: string[];
  short_description: string;
  full_description: string;
  keywords: string;
  main_image: string | null;
  thumbnail_image: string | null;
  product_condition: string;
  return_policy: string;
  estimated_delivery_time: string;
  free_shipping: boolean;
  warranty_available: boolean;
  warranty_period: string;
  warranty_type: string;
  warranty_description: string;
  description_features: { id: number; value: string }[];
  specifications: { id: number; title: string; value: string }[];
  website_status: WebsiteStatus;
  linked_product: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace("/api/", "") ?? "http://localhost:8000";

function getFullUrl(mediaPath: string | null | undefined): string | null {
  if (!mediaPath) return null;
  if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) return mediaPath;
  if (mediaPath.startsWith("/media/")) return `${API_BASE_URL}${mediaPath}`;
  return `${API_BASE_URL}/media/${mediaPath}`;
}

function getUnitDisplay(unit: { id: number; name: string; symbol: string } | string | null | undefined): string {
  if (!unit) return "—";
  if (typeof unit === "object" && unit.name) return unit.name;
  if (typeof unit === "string") return unit;
  return "—";
}

const STATUS_CONFIG: Record<WebsiteStatus, {
  label: string; color: "warning" | "success" | "error" | "neutral";
}> = {
  pending:  { label: "Pending Approval", color: "warning" },
  approved: { label: "Approved & Live",  color: "success" },
  rejected: { label: "Rejected",         color: "error"   },
  draft:    { label: "Draft",            color: "neutral"  },
};

// ── Reusable sub-components ────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ComponentType<any>; children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-dark-600 dark:bg-dark-800">
        <Icon className="size-4 text-primary-500" />
        <h4 className="text-sm font-semibold text-primary-600 dark:text-primary-400">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
      {children}{required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

function ReadonlyField({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200">
      {value || "—"}
    </div>
  );
}

function ThemedTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
    />
  );
}

function ThemedInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
    />
  );
}

function ThemedSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
    >
      {children}
    </select>
  );
}

// ── Image Upload Box ───────────────────────────────────────────────────────
function ImageUploadBox({
  label, preview, onUpload, hint, required,
}: {
  label: string; preview: string | null; onUpload: (file: File) => void;
  hint?: string; required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className={clsx(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition",
          "border-gray-300 hover:border-primary-400 dark:border-dark-500 dark:hover:border-primary-500",
        )}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt={label}
              className="mx-auto max-h-44 rounded-lg object-contain"
              onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400/f0f4f8/94a3b8?text=No+Image"; }}
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white shadow hover:bg-primary-700"
            >
              <ArrowUpTrayIcon className="size-3" /> Replace
            </button>
          </div>
        ) : (
          <div className="py-4">
            <PhotoIcon className="mx-auto size-10 text-gray-300 dark:text-dark-500" />
            <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">Click to upload</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400 dark:text-dark-500">{hint}</p>}
    </div>
  );
}

// ── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: "basic",          title: "Basic Info",             icon: InformationCircleIcon, content: null },
  { id: "images",         title: "Images",                 icon: PhotoIcon,            content: null },
  { id: "description",    title: "Description & Features", icon: ListBulletIcon,      content: null },
  { id: "specifications", title: "Specifications",         icon: Squares2X2Icon,      content: null },
  { id: "warranty",       title: "Warranty & Shipping",    icon: ShieldCheckIcon,     content: null },
  { id: "variants",       title: "Variants",               icon: CubeIcon,            content: null },
];

type TabId = typeof TABS[number]["id"];

// ── Main Detail Component ──────────────────────────────────────────────────
export default function WebsiteItemDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item,              setItem]              = useState<WebsiteItem | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [activeTab,         setActiveTab]         = useState<TabId>("basic");
  const [newFeature,        setNewFeature]        = useState("");
  const [newSpecTitle,      setNewSpecTitle]      = useState("");
  const [newSpecValue,      setNewSpecValue]      = useState("");
  const [mainPreview,       setMainPreview]       = useState<string | null>(null);
  const [thumbPreview,      setThumbPreview]      = useState<string | null>(null);
  const [galleryFiles,      setGalleryFiles]      = useState<File[]>([]);
  const [galleryPreviews,   setGalleryPreviews]   = useState<string[]>([]);
  const [existingGallery,   setExistingGallery]   = useState<string[]>([]);

  const isVariantProduct = !!(item && item.variants && item.variants.length > 1);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchItem = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await Get(`pos/website-items/${id}/`) as any;
      const body = res?.data ?? res;
      const data: WebsiteItem = body?.item ?? body;

      data.description_features = data.description_features || [];
      data.specifications        = data.specifications        || [];
      data.gallery               = data.gallery               || [];

      setItem(data);
      if (data.main_image)      setMainPreview(getFullUrl(data.main_image));
      if (data.thumbnail_image) setThumbPreview(getFullUrl(data.thumbnail_image));

      if (data.gallery?.length) {
        setExistingGallery(data.gallery.map(p => getFullUrl(p) ?? "").filter(Boolean));
      }
    } catch {
      toasterrormsg("Failed to load item details.");
      navigate("/master-menu/website-items");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  // cleanup blob URLs
  useEffect(() => {
    return () => { galleryPreviews.forEach(u => URL.revokeObjectURL(u)); };
  }, [galleryPreviews]);

  // ── Field helpers ────────────────────────────────────────────────────────
  const set = (field: string, value: any) => {
    if (item) setItem({ ...item, [field]: value });
  };

  const addFeature = () => {
    if (!item || !newFeature.trim()) return;
    const newId = Math.max(0, ...item.description_features.map(f => f.id), 0) + 1;
    setItem({ ...item, description_features: [...item.description_features, { id: newId, value: newFeature.trim() }] });
    setNewFeature("");
  };

  const removeFeature = (fid: number) => {
    if (!item) return;
    setItem({ ...item, description_features: item.description_features.filter(f => f.id !== fid) });
  };

  const updateFeature = (fid: number, value: string) => {
    if (!item) return;
    setItem({ ...item, description_features: item.description_features.map(f => f.id === fid ? { ...f, value } : f) });
  };

  const addSpec = () => {
    if (!item || !newSpecTitle.trim() || !newSpecValue.trim()) return;
    const newId = Math.max(0, ...item.specifications.map(s => s.id), 0) + 1;
    setItem({ ...item, specifications: [...item.specifications, { id: newId, title: newSpecTitle.trim(), value: newSpecValue.trim() }] });
    setNewSpecTitle(""); setNewSpecValue("");
  };

  const removeSpec = (sid: number) => {
    if (!item) return;
    setItem({ ...item, specifications: item.specifications.filter(s => s.id !== sid) });
  };

  const updateSpec = (sid: number, field: "title" | "value", value: string) => {
    if (!item) return;
    setItem({ ...item, specifications: item.specifications.map(s => s.id === sid ? { ...s, [field]: value } : s) });
  };

  // ── Build gallery paths helper ───────────────────────────────────────────
  const buildGalleryPaths = (urls: string[]): string[] =>
    urls.map(url => url.replace(API_BASE_URL, ""));

  // ── Build FormData with all fields preserved ─────────────────────────────
  function buildFormData(extra?: Record<string, string | File>): FormData {
    const fd = new FormData();
    if (!item) return fd;
    fd.append("short_description",     item.short_description    || "");
    fd.append("full_description",      item.full_description     || "");
    fd.append("keywords",              item.keywords             || "");
    fd.append("product_condition",     item.product_condition    || "New");
    fd.append("return_policy",         item.return_policy        || "");
    fd.append("estimated_delivery_time", item.estimated_delivery_time || "");
    fd.append("free_shipping",         item.free_shipping        ? "true" : "false");
    fd.append("warranty_available",    item.warranty_available   ? "true" : "false");
    fd.append("warranty_period",       item.warranty_period      || "");
    fd.append("warranty_type",         item.warranty_type        || "");
    fd.append("warranty_description",  item.warranty_description || "");
    fd.append("description_features",  JSON.stringify(item.description_features || []));
    fd.append("specifications",        JSON.stringify(item.specifications        || []));
    if (existingGallery.length) {
      fd.append("existing_gallery_urls", JSON.stringify(buildGalleryPaths(existingGallery)));
    }
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v instanceof File) fd.append(k, v);
        else fd.append(k, v);
      }
    }
    return fd;
  }

  // ── Upload single image (main/thumbnail) ─────────────────────────────────
  const uploadImage = async (type: "main" | "thumbnail", file: File) => {
    try {
      const fd = buildFormData({ [`${type}_image`]: file });
      await Patch(`pos/website-items/${id}/update/`, fd, true);
      if (type === "main") setMainPreview(URL.createObjectURL(file));
      else setThumbPreview(URL.createObjectURL(file));
      toastsuccessmsg("Image uploaded successfully.");
      await fetchItem();
    } catch {
      toasterrormsg("Failed to upload image.");
    }
  };

  // ── Upload variant image ──────────────────────────────────────────────────
  const uploadVariantImage = async (idx: number, file: File) => {
    try {
      const fd = buildFormData();
      fd.append(`variant_images_${idx}`, file);
      await Patch(`pos/website-items/${id}/update/`, fd, true);
      toastsuccessmsg("Variant image uploaded.");
      await fetchItem();
    } catch {
      toasterrormsg("Failed to upload variant image.");
    }
  };

  // ── Add gallery images ─────────────────────────────────────────────────────
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setGalleryFiles(files);
    galleryPreviews.forEach(u => URL.revokeObjectURL(u));
    setGalleryPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const removeGalleryPreview = (idx: number) => {
    const nf = [...galleryFiles];
    nf.splice(idx, 1);
    setGalleryFiles(nf);
    URL.revokeObjectURL(galleryPreviews[idx]);
    const np = [...galleryPreviews];
    np.splice(idx, 1);
    setGalleryPreviews(np);
  };

  const removeExistingGallery = (idx: number) => {
    const ng = [...existingGallery];
    ng.splice(idx, 1);
    setExistingGallery(ng);
  };

  // ── Save all (text fields + gallery files) ────────────────────────────────
  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const fd = buildFormData();
      galleryFiles.forEach(f => fd.append("gallery_images", f));
      await Patch(`pos/website-items/${id}/update/`, fd, true);
      toastsuccessmsg("Item details saved successfully.");
      await fetchItem();
      setGalleryFiles([]);
      galleryPreviews.forEach(u => URL.revokeObjectURL(u));
      setGalleryPreviews([]);
    } catch {
      toasterrormsg("Failed to save item details.");
    } finally {
      setSaving(false);
    }
  };

  // ── Submit for approval ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await Patch(`pos/website-items/${id}/update/`, { website_status: "pending" }, false);
      toastsuccessmsg("Item submitted for admin approval.");
      await fetchItem();
    } catch {
      toasterrormsg("Failed to submit item.");
    } finally {
      setSaving(false);
    }
  };

  // ── Variants table ─────────────────────────────────────────────────────────
  const variantColumns: ColumnDef<Variant>[] = [
    {
      id: "idx", header: "#", size: 48,
      cell: ({ row }: CellContext<Variant, unknown>) => (
        <span className="text-gray-400 dark:text-dark-400">{row.index + 1}</span>
      ),
    },
    {
      id: "img", header: "Image",
      cell: ({ row }: CellContext<Variant, unknown>) => {
        const src = getFullUrl(row.original.variant_image);
        return src ? (
          <img src={src} alt="variant"
            className="size-10 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-dark-500"
            onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100/f0f4f8/94a3b8?text=No"; }} />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-dark-700">
            <PhotoIcon className="size-4 text-gray-400" />
          </div>
        );
      },
    },
    { id: "size",  accessorKey: "size",       header: "Size",
      cell: ({ getValue }: CellContext<Variant, unknown>) => <span className="text-gray-700 dark:text-dark-200">{String(getValue() ?? "") || "—"}</span> },
    { id: "color", accessorKey: "color",      header: "Color",
      cell: ({ getValue }: CellContext<Variant, unknown>) => <span className="text-gray-700 dark:text-dark-200">{String(getValue() ?? "") || "—"}</span> },
    { id: "mrp",   accessorKey: "mrp",        header: "MRP",
      cell: ({ getValue }: CellContext<Variant, unknown>) => <span className="font-medium text-gray-800 dark:text-dark-100">₹{Number(getValue() ?? 0)}</span> },
    { id: "sales", accessorKey: "salesPrice", header: "Sale Price",
      cell: ({ getValue }: CellContext<Variant, unknown>) => <span className="font-medium text-gray-800 dark:text-dark-100">₹{Number(getValue() ?? 0)}</span> },
    { id: "stock", header: "Stock",
      cell: ({ row }: CellContext<Variant, unknown>) => {
        const v = row.original.current_stock ?? row.original.opStock ?? 0;
        return <span className={clsx("font-medium", v === 0 ? "text-error-600" : "text-success-600")}>{v}</span>;
      },
    },
    { id: "barcode", accessorKey: "barcode", header: "Barcode",
      cell: ({ getValue }: CellContext<Variant, unknown>) => (
        <span className=" text-xs text-gray-500 dark:text-dark-300">{String(getValue() ?? "") || "—"}</span>
      ),
    },
  ];

  const variantTable = useReactTable({
    data:            item?.variants ?? [],
    columns:         variantColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Loading / not-found ─────────────────────────────────────────────────
  if (loading) {
    return (
      <Page title="Website Item">
        <div className="flex h-64 items-center justify-center">
          <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Page>
    );
  }

  if (!item) {
    return (
      <Page title="Website Item">
        <div className="px-(--margin-x) py-16 text-center">
          <p className="text-gray-500 dark:text-dark-400">Item not found.</p>
          <Button variant="outlined" className="mt-4" onClick={() => navigate("/master-menu/website-items")}>
            Go Back
          </Button>
        </div>
      </Page>
    );
  }

  const statusCfg = STATUS_CONFIG[item.website_status] ?? STATUS_CONFIG.draft;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Page title={`${item.itemName} — Website Item`}>
      <div className="transition-content w-full px-(--margin-x) py-5 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              className="h-8 gap-2 rounded-md px-3 text-sm"
              onClick={() => navigate("/master-menu/website-items")}
            >
              <ArrowLeftIcon className="size-4" /> Back to Website Items
            </Button>
            <div className="h-5 w-px bg-gray-300 dark:bg-dark-500" />
            <div>
              <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">{item.itemName}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge color={statusCfg.color} variant="soft" className="text-xs">{statusCfg.label}</Badge>
                {item.linked_product && (
                  <span className="text-xs text-primary-600 dark:text-primary-400">Product ID: {item.linked_product}</span>
                )}
                {isVariantProduct && (
                  <Badge color="info" variant="soft" className="text-xs">{item.variants.length} Variants</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {item.website_status === "draft" && (
              <Button
                color="success"
                variant="outlined"
                className="h-9 gap-2 px-4 text-sm"
                disabled={saving}
                onClick={handleSubmit}
              >
                <CheckBadgeIcon className="size-4" /> Submit for Approval
              </Button>
            )}
            <Button
              color="primary"
              className="h-9 gap-2 px-4 text-sm"
              disabled={saving}
              onClick={handleSave}
            >
              <CheckCircleIcon className="size-4" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

      {/* Variant product info banner */}
      {isVariantProduct && (
        <div className="px-(--margin-x) mb-4">
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-900/40 dark:bg-purple-900/10">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="mt-0.5 size-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <p className="text-xs text-purple-700 dark:text-purple-300">
                <span className="font-semibold">Variant Product</span> — this item has{" "}
                {item.variants.length} variants. Upload variant-specific images in the{" "}
                <strong>Images</strong> tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="px-(--margin-x)">
        <WithIcon
          tabs={TABS}
          selectedIndex={TABS.findIndex(t => t.id === activeTab)}
          onChange={(idx) => setActiveTab(TABS[idx].id)}
          hidePanels={true}
        />
      </div>

      {/* Tab content */}
      <div className="px-(--margin-x)">
        <Card className="overflow-hidden">
          <div className="p-6">

              {/* ── Basic Info ── */}
              {activeTab === "basic" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      ["Item Name", item.itemName],
                      ["Branch",    item.branch_name],
                      ["Category",  item.category?.name ?? "—"],
                      ["Sub Category", item.subCategory?.name ?? "—"],
                      ["Brand",     item.brand?.name ?? "—"],
                      ["Unit",      getUnitDisplay(item.unit)],
                      ["HSN Code",  item.hsnCode || "—"],
                      ["Tax Slab",  item.taxSlab || "—"],
                    ].map(([lbl, val]) => (
                      <div key={lbl}>
                        <FieldLabel>{lbl}</FieldLabel>
                        <ReadonlyField value={String(val)} />
                      </div>
                    ))}
                  </div>

                  <div>
                    <FieldLabel>Short Description</FieldLabel>
                    <ThemedTextarea
                      rows={3}
                      value={item.short_description || ""}
                      onChange={v => set("short_description", v)}
                      placeholder="Enter a short description for the product"
                    />
                  </div>

                  <div>
                    <FieldLabel>Full Description</FieldLabel>
                    <ThemedTextarea
                      rows={6}
                      value={item.full_description || ""}
                      onChange={v => set("full_description", v)}
                      placeholder="Enter detailed product description"
                    />
                  </div>

                  <div>
                    <FieldLabel>Keywords (comma separated)</FieldLabel>
                    <ThemedInput
                      value={item.keywords || ""}
                      onChange={v => set("keywords", v)}
                      placeholder="e.g. shoes, running, sports"
                    />
                  </div>
                </div>
              )}

              {/* ── Images ── */}
              {activeTab === "images" && (
                <div className="space-y-8">
                  {isVariantProduct ? (
                    <>
                      {/* Thumbnail only for variant products */}
                      <ImageUploadBox
                        label="Thumbnail Image (Optional)"
                        preview={thumbPreview}
                        onUpload={f => uploadImage("thumbnail", f)}
                        hint="Recommended: 400×400 px, JPG/PNG"
                      />

                      {/* Per-variant images */}
                      <div>
                        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-dark-200">Variant Images</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {item.variants.map((v, idx) => {
                            const src = getFullUrl(v.variant_image);
                            return (
                              <div key={v.id} className="rounded-xl border border-gray-200 p-4 dark:border-dark-600">
                                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-dark-300">
                                  Variant {idx + 1}: {v.color || "—"} / {v.size || "—"}
                                </p>
                                <div
                                  className="relative cursor-pointer rounded-lg border-2 border-dashed border-purple-300 p-3 text-center hover:border-purple-500 dark:border-purple-700"
                                  onClick={() => {
                                    const el = document.getElementById(`vi-${idx}`);
                                    if (el) el.click();
                                  }}
                                >
                                  {src ? (
                                    <>
                                      <img src={src} alt={`v${idx + 1}`}
                                        className="mx-auto max-h-28 rounded object-contain"
                                        onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100/f0f4f8/94a3b8?text=No"; }} />
                                      <span className="mt-1 block text-xs text-purple-500 dark:text-purple-400">
                                        <PencilSquareIcon className="mr-1 inline size-3" />Click to change
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUpTrayIcon className="mx-auto size-6 text-purple-400" />
                                      <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">Upload image</p>
                                    </>
                                  )}
                                  <input id={`vi-${idx}`} type="file" accept="image/*" className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) uploadVariantImage(idx, e.target.files[0]); }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Simple product: main + thumbnail */}
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <ImageUploadBox
                          label="Main Image"
                          preview={mainPreview}
                          onUpload={f => uploadImage("main", f)}
                          hint="Recommended: 800×800 px, JPG/PNG"
                          required
                        />
                        <ImageUploadBox
                          label="Thumbnail Image (Optional)"
                          preview={thumbPreview}
                          onUpload={f => uploadImage("thumbnail", f)}
                          hint="Recommended: 400×400 px, JPG/PNG"
                        />
                      </div>
                      {!item.main_image && (
                        <p className="text-xs text-error-600">Main image is required for simple products.</p>
                      )}
                    </>
                  )}

                  {/* Gallery */}
                  <div>
                    <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-dark-200">
                      Gallery Images <span className="font-normal text-gray-400">(Optional)</span>
                    </p>
                    <label className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-primary-400 dark:border-dark-500 dark:hover:border-primary-500">
                      <PhotoIcon className="mx-auto size-10 text-gray-300 dark:text-dark-500" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">Click to upload gallery images</p>
                      <p className="text-xs text-gray-400 dark:text-dark-500">Max 5 images, JPG/PNG, up to 5 MB each</p>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                    </label>

                    {(existingGallery.length > 0 || galleryPreviews.length > 0) && (
                      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                        {existingGallery.map((url, idx) => (
                          <div key={`eg-${idx}`} className="group relative">
                            <img src={url} alt={`gallery ${idx + 1}`}
                              className="h-24 w-full rounded-lg border object-cover dark:border-dark-600"
                              onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100/f0f4f8/94a3b8?text=No"; }} />
                            <button type="button"
                              onClick={() => removeExistingGallery(idx)}
                              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-error-500 text-white opacity-0 transition group-hover:opacity-100">
                              <TrashIcon className="size-3" />
                            </button>
                          </div>
                        ))}
                        {galleryPreviews.map((url, idx) => (
                          <div key={`ng-${idx}`} className="group relative">
                            <img src={url} alt={`new gallery ${idx + 1}`}
                              className="h-24 w-full rounded-lg border object-cover dark:border-dark-600" />
                            <button type="button"
                              onClick={() => removeGalleryPreview(idx)}
                              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-error-500 text-white opacity-0 transition group-hover:opacity-100">
                              <TrashIcon className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Description & Features ── */}
              {activeTab === "description" && (
                <div className="space-y-4">
                  <FieldLabel>Product Features</FieldLabel>
                  <div className="space-y-3">
                    {item.description_features.map((f, i) => (
                      <div key={f.id} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-xs text-gray-400 dark:text-dark-500">Feature {i + 1}</span>
                        <ThemedInput value={f.value} onChange={v => updateFeature(f.id, v)} placeholder="Enter product feature" />
                        <Button isIcon variant="flat" color="error" className="size-8 shrink-0 rounded-full"
                          onClick={() => removeFeature(f.id)}>
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <ThemedInput value={newFeature} onChange={setNewFeature} placeholder="Add new feature…" />
                    <Button color="success" className="h-9 shrink-0 gap-2 px-4 text-sm" onClick={addFeature}>
                      <PlusIcon className="size-4" /> Add
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Specifications ── */}
              {activeTab === "specifications" && (
                <div className="space-y-3">
                  <FieldLabel>Product Specifications</FieldLabel>
                  {item.specifications.map(s => (
                    <div key={s.id} className="grid grid-cols-2 gap-3">
                      <ThemedInput value={s.title} onChange={v => updateSpec(s.id, "title", v)} placeholder="Specification title" />
                      <div className="flex gap-2">
                        <ThemedInput value={s.value} onChange={v => updateSpec(s.id, "value", v)} placeholder="Specification value" />
                        <Button isIcon variant="flat" color="error" className="size-9 shrink-0 rounded-full"
                          onClick={() => removeSpec(s.id)}>
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <ThemedInput value={newSpecTitle} onChange={setNewSpecTitle} placeholder="Specification title" />
                    <div className="flex gap-2">
                      <ThemedInput value={newSpecValue} onChange={setNewSpecValue} placeholder="Specification value" />
                      <Button color="success" className="h-9 shrink-0 gap-1.5 px-3 text-sm" onClick={addSpec}>
                        <PlusIcon className="size-4" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Warranty & Shipping ── */}
              {activeTab === "warranty" && (
                <div className="space-y-6">
                  {/* Warranty toggle */}
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-600 dark:bg-dark-800">
                    <Checkbox
                      checked={item.warranty_available}
                      onChange={e => set("warranty_available", e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-200">Warranty Available</span>
                  </label>

                  {item.warranty_available && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel>Warranty Type</FieldLabel>
                        <ThemedSelect value={item.warranty_type || ""} onChange={v => set("warranty_type", v)}>
                          <option value="">Select Warranty Type</option>
                          <option value="Manufacturer Warranty">Manufacturer Warranty</option>
                          <option value="Seller Warranty">Seller Warranty</option>
                          <option value="Extended Warranty">Extended Warranty</option>
                        </ThemedSelect>
                      </div>
                      <div>
                        <FieldLabel>Warranty Period</FieldLabel>
                        <ThemedSelect value={item.warranty_period || ""} onChange={v => set("warranty_period", v)}>
                          <option value="">Select Period</option>
                          {["3 Months","6 Months","1 Year","2 Years","3 Years","Lifetime"].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </ThemedSelect>
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel>Warranty Description</FieldLabel>
                        <ThemedTextarea rows={3} value={item.warranty_description || ""}
                          onChange={v => set("warranty_description", v)} placeholder="Describe warranty coverage" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel>Return Policy</FieldLabel>
                      <ThemedSelect value={item.return_policy || ""} onChange={v => set("return_policy", v)}>
                        <option value="">Select Return Policy</option>
                        {["7 Days Return","15 Days Return","30 Days Return","No Return","Exchange Only"].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </ThemedSelect>
                    </div>
                    <div>
                      <FieldLabel>Estimated Delivery Time</FieldLabel>
                      <ThemedInput value={item.estimated_delivery_time || ""} onChange={v => set("estimated_delivery_time", v)} placeholder="e.g. 3-5 business days" />
                    </div>
                    <div>
                      <FieldLabel>Product Condition</FieldLabel>
                      <ThemedSelect value={item.product_condition || "New"} onChange={v => set("product_condition", v)}>
                        {["New","Refurbished","Used","Like New"].map(c => <option key={c} value={c}>{c}</option>)}
                      </ThemedSelect>
                    </div>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-600 dark:bg-dark-800">
                      <Checkbox
                        checked={item.free_shipping}
                        onChange={e => set("free_shipping", e.target.checked)}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-dark-200">Free Shipping</p>
                        <p className="text-xs text-gray-400 dark:text-dark-500">Offer free shipping on this product</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ── Variants ── */}
              {activeTab === "variants" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-dark-800">
                        <tr>
                          {variantTable.getHeaderGroups().map(hg =>
                            hg.headers.map(h => (
                              <th key={h.id}
                                className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-600 dark:text-dark-300">
                                {flexRender(h.column.columnDef.header, h.getContext())}
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {variantTable.getRowModel().rows.map(row => (
                          <tr key={row.id}
                            className="border-t border-gray-100 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-700">
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className="px-4 py-2.5">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {item.variants.length === 0 && (
                          <tr><td colSpan={8} className="py-8 text-center text-sm text-gray-400 dark:text-dark-500">No variants found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-info-200 bg-info-50 p-3 dark:border-info-900/40 dark:bg-info-900/10">
                    <div className="flex items-start gap-2">
                      <InformationCircleIcon className="mt-0.5 size-4 shrink-0 text-info-600 dark:text-info-400" />
                      <p className="text-xs text-info-700 dark:text-info-300">
                        Total <strong>{item.variants.length}</strong> variant(s).{" "}
                        {isVariantProduct
                          ? "Each variant appears as a separate option in the product."
                          : "This is a simple product with one variant."}
                        {" "}To upload variant images, go to the <strong>Images</strong> tab.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>{/* /p-6 */}
          </Card>
        </div>{/* /px-(--margin-x) */}

        {/* Draft submission prompt */}
        {item.website_status === "draft" && (
          <div className="px-(--margin-x) mt-4">
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-900/40 dark:bg-warning-900/10">
              <div className="flex items-start gap-3">
                <ClockIcon className="mt-0.5 size-5 shrink-0 text-warning-600 dark:text-warning-400" />
                <div>
                  <p className="text-sm font-semibold text-warning-800 dark:text-warning-300">Ready for Submission</p>
                  <p className="mt-1 text-xs text-warning-700 dark:text-warning-400">
                    Fill in all the product details above, save your changes, then click{" "}
                    <strong>Submit for Approval</strong>. Once approved by admin, the item will appear on the website.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Page>
  );
}
