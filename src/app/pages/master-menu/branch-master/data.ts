export type BranchStatus = "active" | "inactive";
export type BusinessType = "branch" | "franchise";

export interface Branch {
  id: number;
  branchName: string;
  branchCode?: string;
  branchType: string;
  ownerName: string;
  email: string;
  phone: string;
  password?: string;
  businessType: BusinessType;
  linkedAccount?: string;
  linkedAccountId?: number | string;
  status: BranchStatus;
  isActive: boolean;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  licenseFile: string | null;
  gstCertificate: string | null;
  idProof: string | null;
  branchLogo: string | null;
  createdAt: string;
  updatedAt: string;
  country_id?: number | string;
  state_id?: number | string;
  city_id?: number | string;
}

export const BRANCH_TYPE_OPTIONS = [
  { id: "fashion", label: "Fashion" },
  { id: "electronics", label: "Electronics" },
  { id: "grocery", label: "Grocery" },
  { id: "restaurant", label: "Restaurant" },
  { id: "salon", label: "Salon" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "retail", label: "Retail" },
  { id: "wholesale", label: "Wholesale" },
  { id: "other", label: "Other" },
];

export const STATUS_OPTIONS = [
  { id: "all", label: "All Status" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export const BRANCH_STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export const BUSINESS_TYPE_OPTIONS: { id: BusinessType; label: string }[] = [
  { id: "branch", label: "Branch" },
  { id: "franchise", label: "Franchise" },
];

export function mapApiBranch(raw: Record<string, any>): Branch {
  const statusRaw = String(raw.status ?? raw.is_active ?? "active").toLowerCase();
  const status: BranchStatus = statusRaw.includes("inactive") || statusRaw === "false" ? "inactive" : "active";
  const businessRaw = String(raw.business_type ?? raw.businessType ?? "branch").toLowerCase() as BusinessType;
  const businessType: BusinessType = businessRaw === "franchise" ? "franchise" : "branch";

  return {
    id: Number(raw.id ?? 0),
    branchName: String(raw.branch_name ?? raw.name ?? raw.branchName ?? ""),
    branchCode: String(raw.branch_code ?? raw.code ?? raw.branchCode ?? ""),
    branchType: String(raw.branch_type ?? raw.branchType ?? ""),
    ownerName: String(raw.owner_name ?? raw.ownerName ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? raw.phone_number ?? raw.contact ?? ""),
    businessType,
    linkedAccount: String(raw.linked_account ?? raw.linkedAccount ?? (raw as any).account?.name ?? ""),
    linkedAccountId: raw.linked_account_id ?? raw.account_id ?? (raw as any).account?.id,
    status,
    isActive: status === "active",
    address: String(raw.address ?? ""),
    city: String(raw.city ?? ""),
    state: String(raw.state ?? ""),
    country: String(raw.country ?? "India"),
    pincode: String(raw.pincode ?? raw.pin_code ?? ""),
    bankName: String(raw.bank_name ?? raw.bankName ?? ""),
    accountNumber: String(raw.account_number ?? raw.accountNumber ?? ""),
    ifscCode: String(raw.ifsc_code ?? raw.ifscCode ?? ""),
    upiId: String(raw.upi_id ?? raw.upiId ?? ""),
    licenseFile: raw.license_file ?? raw.license_url ?? raw.licenseFile ?? raw.license ?? null,
    gstCertificate: raw.gst_certificate ?? raw.gst_certificate_url ?? raw.gstCertificate ?? null,
    idProof: raw.id_proof ?? raw.id_proof_url ?? raw.idProof ?? null,
    branchLogo: raw.branch_logo ?? raw.logo ?? raw.branchLogo ?? raw.logo_url ?? null,
    createdAt: String(raw.created_at ?? raw.createdAt ?? raw.created_on ?? ""),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? raw.updated_on ?? ""),
    country_id: raw.country_id,
    state_id: raw.state_id,
    city_id: raw.city_id,
  };
}

export interface BranchFormValues {
  branchType: string;
  branchName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  businessType: BusinessType;
  linkedAccount: string;
  linkedAccountId: number | string | "";
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  status: BranchStatus;
  licenseFile: File | null;
  gstCertificateFile: File | null;
  idProofFile: File | null;
  branchLogoFile: File | null;
  licenseUrl: string | null;
  gstUrl: string | null;
  idProofUrl: string | null;
  logoUrl: string | null;
}

export function buildBranchFormValues(branch: Branch | null): BranchFormValues {
  return {
    branchType: branch?.branchType ?? "",
    branchName: branch?.branchName ?? "",
    ownerName: branch?.ownerName ?? "",
    email: branch?.email ?? "",
    phone: branch?.phone ?? "",
    password: "",
    businessType: branch?.businessType ?? "branch",
    linkedAccount: branch?.linkedAccount ?? "",
    linkedAccountId: branch?.linkedAccountId ?? "",
    address: branch?.address ?? "",
    city: branch?.city ?? "",
    state: branch?.state ?? "",
    country: branch?.country ?? "India",
    pincode: branch?.pincode ?? "",
    bankName: branch?.bankName ?? "",
    accountNumber: branch?.accountNumber ?? "",
    ifscCode: branch?.ifscCode ?? "",
    upiId: branch?.upiId ?? "",
    status: branch?.status ?? "active",
    licenseFile: null,
    gstCertificateFile: null,
    idProofFile: null,
    branchLogoFile: null,
    licenseUrl: branch?.licenseFile ?? null,
    gstUrl: branch?.gstCertificate ?? null,
    idProofUrl: branch?.idProof ?? null,
    logoUrl: branch?.branchLogo ?? null,
  };
}

export function buildBranchPayload(
  values: BranchFormValues,
  isEdit: boolean,
): { hasFiles: boolean; data: Record<string, any>; formData: FormData | null } {
  const json: Record<string, any> = {
    branch_name: values.branchName,
    branch_type: values.branchType,
    owner_name: values.ownerName,
    email: values.email,
    phone: values.phone,
    business_type: values.businessType,
    address: values.address,
    city: values.city,
    state: values.state,
    country: values.country,
    pincode: values.pincode,
    bank_name: values.bankName,
    account_number: values.accountNumber,
    ifsc_code: values.ifscCode,
    upi_id: values.upiId,
    status: values.status,
  };
  // Handle linked account
  if (values.linkedAccountId && values.linkedAccountId !== "") {
    json.linked_account_id = values.linkedAccountId;
  }
  if (values.linkedAccount && values.linkedAccount !== "") {
    json.linked_account = values.linkedAccount;
  }
  if (!isEdit && values.password) json.password = values.password;
  if (isEdit && values.password) json.password = values.password;

  const fileFields: Array<[keyof BranchFormValues, string]> = [
    ["licenseFile", "license_file"],
    ["gstCertificateFile", "gst_certificate"],
    ["idProofFile", "id_proof"],
    ["branchLogoFile", "branch_logo"],
  ];
  const hasFiles = fileFields.some(([k]) => Boolean(values[k]));
  if (!hasFiles) return { hasFiles, data: json, formData: null };

  const form = new FormData();
  Object.entries(json).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    form.append(k, String(v));
  });
  fileFields.forEach(([k, fk]) => {
    const f = values[k];
    if (f instanceof File) form.append(fk, f);
  });
  return { hasFiles, data: json, formData: form };
}
