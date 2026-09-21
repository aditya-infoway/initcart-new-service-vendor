import {
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CameraIcon,
  CheckCircleIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  FolderIcon,
  HomeIcon,
  IdentificationIcon,
  MapPinIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  HashtagIcon,
  TagIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
  formatDateDDMMYYYY,
  Get,
  Put,
  Patch,
  Post,
  toastsuccessmsg,
  toasterrormsg,
} from "@/ApiHelper";
import { Avatar, Badge, Button, Card, GhostSpinner, Input } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { GHOST_ENTRY_PATH } from "@/constants/app";
import {
  AuthMeResponse,
  getBranchFromMe,
  getUserFromMe,
} from "@/utils/authMeProfile";

interface AuthMeBranch {
  id?: number | string;
  branch_id?: number | string;
  name?: string;
  branch_name?: string;
  branch_code?: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  branch_type?: string;
  type?: string;
  status?: string;
  is_active?: boolean;
  logo?: string;
  logo_url?: string;
  image?: string;
  created_at?: string;
  created_on?: string;
  date_joined?: string;
  updated_at?: string;
  updated_on?: string;
  last_login?: string;
  owner_name?: string;
  gst_no?: string;
  pan_no?: string;
  bank_name?: string;
  bank_account?: string;
  account_number?: string;
  ifsc_code?: string;
  ifsc?: string;
  upi_id?: string;
  upi?: string;
  license?: string;
  license_url?: string;
  gst_certificate?: string;
  gst_certificate_url?: string;
  id_proof?: string;
  id_proof_url?: string;
  [k: string]: any;
}

// ── Section heading ───────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5 border-b border-gray-200 pb-3 dark:border-dark-600">
      <Icon className="size-5 text-primary" />
      <h3 className="text-[15px] font-extrabold tracking-wide text-gray-800 dark:text-dark-50">
        {title}
      </h3>
    </div>
  );
}

// ── Helper field row (static or editable Input pair) ──────────────────────
type FieldValue = string | number | null | undefined;
function FieldRow({
  left,
  right,
}: {
  left: { label: string; icon?: React.ComponentType<{ className?: string }>; value: FieldValue; placeholder?: string; accent?: "info" | "warn" | "error"; editable?: boolean; register?: any; errorMsg?: string };
  right?: { label: string; icon?: React.ComponentType<{ className?: string }>; value: FieldValue; placeholder?: string; accent?: "info" | "warn" | "error"; editable?: boolean; register?: any; errorMsg?: string };
}) {
  const renderCell = (
    label: string,
    Icon: React.ComponentType<{ className?: string }> | undefined,
    value: FieldValue,
    placeholder: string | undefined,
    accent: "info" | "warn" | "error" | undefined,
    editable: boolean | undefined,
    register: any,
    errorMsg: string | undefined,
  ) => {
    const accentBg = {
      info: "bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300",
      warn: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300",
      error: "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300",
    }[accent ?? "info"];

    if (editable) {
      return (
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-gray-600 dark:text-dark-300">
            {Icon && <Icon className="size-4 text-primary" />}
            {label}
          </label>
          <Input
            placeholder={placeholder ?? label}
            error={errorMsg}
            {...(register ?? {})}
          />
        </div>
      );
    }

    return (
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-gray-600 dark:text-dark-300">
          {Icon && <Icon className="size-4 text-primary" />}
          {label}
        </label>
        <div
          className={
            "flex min-h-[42px] items-center rounded-lg border border-gray-200 bg-white px-4 text-[14px] font-semibold text-gray-700 shadow-sm dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100 " +
            (accent ? accentBg : "")
          }
        >
          {value !== undefined && value !== null && String(value).trim() !== ""
            ? String(value)
            : <span className="text-xs text-gray-400 dark:text-dark-400">{placeholder ?? "—"}</span>}
        </div>
      </div>
    );
  };

  if (!right) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          {renderCell(left.label, left.icon, left.value, left.placeholder, left.accent, left.editable, left.register, left.errorMsg)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {renderCell(left.label, left.icon, left.value, left.placeholder, left.accent, left.editable, left.register, left.errorMsg)}
      {renderCell(right.label, right.icon, right.value, right.placeholder, right.accent, right.editable, right.register, right.errorMsg)}
    </div>
  );
}

// ── Document tile ─────────────────────────────────────────────────────────
function DocTile({
  title,
  subtitle,
  iconTile,
  viewUrl,
  variant = "empty",
}: {
  title: string;
  subtitle: string;
  iconTile: React.ComponentType<{ className?: string }>;
  viewUrl?: string;
  variant?: "empty" | "available";
}) {
  const IconComp = iconTile;
  const isAvailable = variant === "available";
  return (
    <Card className="p-4 h-full">
      <div className="flex h-full flex-col items-center gap-3 text-center">
        <div
          className={
            "grid size-14 place-items-center rounded-2xl shadow-sm " +
            (isAvailable
              ? "bg-primary/10 text-primary"
              : "bg-gray-100 text-gray-400 dark:bg-dark-700 dark:text-dark-300")
          }
        >
          <IconComp className="size-6" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-gray-700 dark:text-dark-100">{title}</p>
          <p className={"mt-0.5 text-[11px] " + (isAvailable ? "text-primary font-semibold" : "text-gray-400 dark:text-dark-400")}>
            {subtitle}
          </p>
        </div>
        {isAvailable && viewUrl && (
          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="mt-auto h-8 gap-1.5 px-3 text-xs font-bold"
            component="a"
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <EyeIcon className="size-3.5" /> View Document
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function AdminProfile() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [raw, setRaw] = useState<AuthMeResponse | null>(null);

  // ── Form states (in-mirror of editable fields on Branch Information row)
  const [branchId, setBranchId] = useState<string>("");
  const [branchCode, setBranchCode] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [branchType, setBranchType] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await Get("auth/me/")) as AuthMeResponse | any;
      const body = (res?.data ?? res) as AuthMeResponse;
      setRaw(body);
      const b = getBranchFromMe(body);
      const u = getUserFromMe(body);
      setBranchId(String(b.id ?? b.branch_id ?? ""));
      setBranchCode(String(b.branch_code ?? b.code ?? ""));
      setBranchName(String(b.name ?? b.branch_name ?? u.branch_name ?? ""));
      setOwnerName(String(b.owner_name ?? u.name ?? u.full_name ?? ""));
      setPhone(String(b.phone ?? u.phone ?? ""));
      setEmail(String(b.email ?? u.email ?? ""));
      setBranchType(String(b.branch_type ?? b.type ?? ""));
      setAddress(String(b.address ?? ""));
      setCountry(String(b.country ?? ""));
      setStateName(String(b.state ?? ""));
      setCity(String(b.city ?? ""));
      setPincode(String(b.pincode ?? ""));
      setBankName(String(b.bank_name ?? ""));
      setAccountNumber(String(b.bank_account ?? b.account_number ?? ""));
      setIfscCode(String(b.ifsc_code ?? b.ifsc ?? ""));
      setUpiId(String(b.upi_id ?? b.upi ?? ""));
    } catch {
      toasterrormsg("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const branch = getBranchFromMe(raw);
  const user = getUserFromMe(raw);

  const logoSrc: string =
    (branch?.logo_url || branch?.logo || branch?.image || user?.avatar || user?.profile_image || user?.logo || "") as string;

  const displayName: string =
    (branchName || branch?.name || branch?.branch_name || user?.branch_name || "Branch") as string;

  const statusText =
    String(branch?.status ?? (branch?.is_active ? "Active" : "")) || "Active";
  const isStatusActive = /active|true|verified/i.test(statusText);

  const displayBranchType = (branchType || branch?.branch_type || branch?.type || "") as string;
  const memberSince = (
    branch?.created_at ?? branch?.created_on ?? branch?.date_joined ?? user?.date_joined ?? raw?.created_at ?? raw?.date_joined ?? ""
  ) as string;
  const accountCreated = memberSince;
  const lastUpdated = (branch?.updated_at ?? branch?.updated_on ?? raw?.updated_at ?? user?.last_login ?? raw?.last_login ?? "") as string;

  const maskAccount = (s: string) =>
    s.length > 4 ? "**** " + s.slice(-4) : s || "";

  // ── Save profile (all editable fields + branch id in url if present)
  const handleSave = async () => {
    if (!raw) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        branch_id: Number.isFinite(Number(branch?.id ?? branch?.branch_id)) ? Number(branch?.id ?? branch?.branch_id) : undefined,
        branch_code: branchCode,
        branch_name: branchName,
        name: branchName,
        owner_name: ownerName,
        phone,
        email,
        branch_type: branchType,
        address,
        country,
        state: stateName,
        city,
        pincode,
        bank_name: bankName,
        bank_account: accountNumber,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        ifsc: ifscCode,
        upi_id: upiId,
        upi: upiId,
      };
      const bid = branch?.id ?? branch?.branch_id ?? user?.branch_id ?? raw?.id;
      let saved = false;
      const urls = bid
        ? [
            `branch/${bid}/`,
            `branches/${bid}/`,
            `auth/me/`,
          ]
        : [`auth/me/`, `branch/`, `branches/`];
      for (const url of urls) {
        try {
          const isPost = /\/$/.test(url) && !bid && url.includes("branch");
          const res = await (isPost ? Post : (Patch as any))(url, payload, false);
          const data = (res as any)?.data ?? res;
          if (data && (data?.success === true || data?.id || data?.branch_id || data?.name)) {
            saved = true;
            break;
          }
          saved = true;
          break;
        } catch { /* try next */ }
      }
      if (!saved) {
        try {
          await Put("auth/me/", payload, false);
          saved = true;
        } catch { /* noop */ }
      }
      if (saved) toastsuccessmsg("Profile updated successfully.");
      else throw new Error("failed");
      loadMe();
      window.dispatchEvent(new Event("profile-updated"));
    } catch {
      toasterrormsg("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); navigate(GHOST_ENTRY_PATH); }
    finally { setLoggingOut(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <GhostSpinner className="size-10 border-3" />
    </div>
  );

  return (
    <div className="w-full space-y-5 pb-10">

      {/* ── Hero / Banner ────────────────────────────────────────── */}
      <Card className="overflow-hidden p-0">
        <div className="relative h-44 w-full bg-gradient-to-br from-[#2563eb] via-[#2b6ef0] to-[#1d4ed8]">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute -top-10 -left-10 size-56 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-20 right-10 size-72 rounded-full bg-white/10 blur-3xl" />
          </div>
        </div>
        <div className="relative px-5 pb-6 sm:px-8">
          <div className="relative -mt-20 flex flex-col items-center gap-4 sm:-mt-28">
            <div className="relative">
              <div className="size-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl ring-1 ring-black/5 dark:border-dark-800 dark:bg-dark-800 dark:ring-white/10 sm:size-40">
                {logoSrc ? (
                  <img src={logoSrc as string} alt="Branch" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary to-primary-600 text-4xl font-extrabold text-white sm:text-5xl">
                    {String(displayName).trim().charAt(0).toUpperCase() || "B"}
                  </div>
                )}
              </div>
              <div className="absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-full border-2 border-white bg-white text-primary shadow-md dark:border-dark-800 dark:bg-dark-800">
                <CameraIcon className="size-4.5" />
              </div>
            </div>

            <div className="w-full text-center">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-dark-50 sm:text-3xl">
                {displayName}
              </h1>
              {ownerName && ownerName !== displayName && (
                <p className="mt-1 text-sm font-medium text-gray-500 dark:text-dark-300">
                  {ownerName}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Badge
                  className={
                    "gap-1.5 px-3 py-1 text-[12px] font-extrabold shadow-sm " +
                    (isStatusActive
                      ? "bg-emerald-400/95 text-white hover:bg-emerald-400"
                      : "bg-amber-400/95 text-white hover:bg-amber-400")
                  }
                >
                  <CheckCircleIcon className="size-3.5" />
                  {String(statusText || "Active").charAt(0).toUpperCase() + String(statusText || "Active").slice(1).toLowerCase()}
                </Badge>
                {displayBranchType && (
                  <Badge className="gap-1.5 bg-white/90 px-3 py-1 text-[12px] font-extrabold text-slate-700 shadow-sm">
                    <TagIcon className="size-3.5" />
                    {String(displayBranchType).charAt(0).toUpperCase() + String(displayBranchType).slice(1)}
                  </Badge>
                )}
              </div>
              {memberSince && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 dark:text-dark-400">
                  <CalendarDaysIcon className="size-4" />
                  Member since: {formatDateDDMMYYYY(String(memberSince))}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Branch Information ───────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <SectionHeader icon={BuildingStorefrontIcon} title="Branch Information" />
        <div className="space-y-4">
          <FieldRow
            left={{
              label: "Branch ID",
              icon: HashtagIcon,
              value: branchId,
              placeholder: "Branch ID",
              accent: "info",
            }}
            right={{
              label: "Branch Code",
              icon: IdentificationIcon,
              value: branchCode,
              placeholder: "e.g. D8E",
              editable: true,
              register: { value: branchCode, onChange: (e: any) => setBranchCode(e.target.value) },
            }}
          />
          {branchCode && (
            <p className="-mt-1 text-[10.5px] font-semibold text-gray-400 dark:text-dark-400">
              Will be used in Order ID /DB/{branchCode}/ DD-MM-YY / 100001
            </p>
          )}
          <FieldRow
            left={{
              label: "Branch Name",
              icon: BuildingStorefrontIcon,
              value: branchName,
              placeholder: "Branch name",
              editable: true,
              register: { value: branchName, onChange: (e: any) => setBranchName(e.target.value) },
            }}
            right={{
              label: "Owner Name",
              icon: SparklesIcon,
              value: ownerName,
              placeholder: "Owner / In-charge name",
              editable: true,
              register: { value: ownerName, onChange: (e: any) => setOwnerName(e.target.value) },
            }}
          />
          <FieldRow
            left={{
              label: "Phone",
              icon: PhoneIcon,
              value: phone,
              placeholder: "Branch contact number",
              editable: true,
              register: { value: phone, onChange: (e: any) => setPhone(e.target.value) },
            }}
            right={{
              label: "Email",
              icon: EnvelopeIcon,
              value: email,
              placeholder: "Branch email",
              editable: true,
              register: { value: email, onChange: (e: any) => setEmail(e.target.value) },
            }}
          />
          <FieldRow
            left={{
              label: "Branch Type",
              icon: FolderIcon,
              value: branchType,
              placeholder: "e.g. Fashion, Retail, etc.",
              editable: true,
              register: { value: branchType, onChange: (e: any) => setBranchType(e.target.value) },
            }}
          />
        </div>
      </Card>

      {/* ── Address Details ──────────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <SectionHeader icon={MapPinIcon} title="Address Details" />
        <div className="space-y-4">
          <FieldRow
            left={{
              label: "Complete Address",
              icon: HomeIcon,
              value: address,
              placeholder: "Street / Area / Landmark",
              editable: true,
              register: { value: address, onChange: (e: any) => setAddress(e.target.value) },
            }}
          />
          <FieldRow
            left={{
              label: "Country",
              icon: GlobeAltIcon_local,
              value: country,
              placeholder: "Country name",
              accent: !country || /not specified|not specified/i.test(country) ? "warn" : "info",
              editable: true,
              register: { value: country, onChange: (e: any) => setCountry(e.target.value) },
            }}
            right={{
              label: "State",
              icon: MapPinIcon,
              value: stateName,
              placeholder: "State",
              editable: true,
              register: { value: stateName, onChange: (e: any) => setStateName(e.target.value) },
            }}
          />
          <FieldRow
            left={{
              label: "City",
              icon: MapPinIcon,
              value: city,
              placeholder: "City",
              editable: true,
              register: { value: city, onChange: (e: any) => setCity(e.target.value) },
            }}
            right={{
              label: "Pincode",
              icon: HashtagIcon,
              value: pincode,
              placeholder: "Pincode / ZIP",
              editable: true,
              register: { value: pincode, onChange: (e: any) => setPincode(e.target.value) },
            }}
          />
        </div>
      </Card>

      {/* ── Bank Details ─────────────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <SectionHeader icon={BanknotesIcon} title="Bank Details" />
        <div className="space-y-4">
          <FieldRow
            left={{
              label: "Bank Name",
              icon: BanknotesIcon,
              value: bankName,
              placeholder: "Bank name",
              editable: true,
              register: { value: bankName, onChange: (e: any) => setBankName(e.target.value) },
            }}
            right={{
              label: "Account Number",
              icon: ClipboardIcon,
              value: accountNumber ? maskAccount(String(accountNumber)) : "",
              placeholder: "Account number",
              editable: true,
              register: { value: accountNumber, onChange: (e: any) => setAccountNumber(e.target.value) },
            }}
          />
          <FieldRow
            left={{
              label: "IFSC Code",
              icon: HashtagIcon,
              value: ifscCode,
              placeholder: "IFSC code",
              editable: true,
              register: { value: ifscCode, onChange: (e: any) => setIfscCode(e.target.value) },
            }}
            right={{
              label: "UPI ID",
              icon: SparklesIcon,
              value: upiId,
              placeholder: "e.g. branch@upi",
              editable: true,
              register: { value: upiId, onChange: (e: any) => setUpiId(e.target.value) },
            }}
          />
        </div>
      </Card>

      {/* ── Documents ────────────────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <SectionHeader icon={FolderIcon} title="Documents" />
        <div className="grid gap-4 sm:grid-cols-3">
          <DocTile
            title="License File"
            subtitle={branch?.license || branch?.license_url ? "Uploaded" : "Not uploaded"}
            iconTile={DocumentTextIcon}
            viewUrl={String(branch?.license_url || branch?.license || "") || undefined}
            variant={branch?.license || branch?.license_url ? "available" : "empty"}
          />
          <DocTile
            title="GST Certificate"
            subtitle={branch?.gst_certificate || branch?.gst_certificate_url ? "Uploaded" : "Not uploaded"}
            iconTile={DocumentDuplicateIcon}
            viewUrl={String(branch?.gst_certificate_url || branch?.gst_certificate || "") || undefined}
            variant={branch?.gst_certificate || branch?.gst_certificate_url ? "available" : "empty"}
          />
          <DocTile
            title="ID Proof"
            subtitle={branch?.id_proof || branch?.id_proof_url ? "Uploaded" : "Not uploaded"}
            iconTile={IdentificationIcon}
            viewUrl={String(branch?.id_proof_url || branch?.id_proof || "") || undefined}
            variant={branch?.id_proof || branch?.id_proof_url ? "available" : "empty"}
          />
        </div>
      </Card>

      {/* ── Account Information ──────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <SectionHeader icon={CalendarDaysIcon} title="Account Information" />
        <div className="space-y-4">
          <FieldRow
            left={{
              label: "Account Created",
              icon: CalendarDaysIcon,
              value: accountCreated ? formatDateDDMMYYYY(String(accountCreated)) : "",
              placeholder: "—",
              accent: "info",
            }}
            right={{
              label: "Last Updated",
              icon: ArrowPathIcon,
              value: lastUpdated ? formatDateDDMMYYYY(String(lastUpdated)) : "",
              placeholder: "—",
            }}
          />
        </div>
      </Card>

      {/* ── Save + Logout row ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error/5 p-4 pr-6 dark:bg-error/10">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-error/10 text-error dark:bg-error/20">
              <ArrowRightOnRectangleIcon className="size-5" />
            </div>
            <div>
              <h4 className="text-[14px] font-extrabold text-error">Logout</h4>
              <p className="mt-1 text-[12px] font-medium text-gray-500 dark:text-dark-300">
                This will securely log you out from your branch account.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outlined"
            color="error"
            className="h-10 gap-2 px-5 text-sm font-extrabold"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut
              ? <ArrowPathIcon className="size-4.5 animate-spin" />
              : <ArrowRightOnRectangleIcon className="size-4.5" />}
            Logout
          </Button>
          <Button
            color="primary"
            variant="filled"
            className="h-10 gap-2 px-6 text-sm font-extrabold shadow-md shadow-primary/20"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <ArrowPathIcon className="size-4.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="size-4.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

const GlobeAltIcon_local = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
