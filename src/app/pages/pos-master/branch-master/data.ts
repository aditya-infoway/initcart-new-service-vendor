// Branch Master – TypeScript types & helpers

export type BranchStatus = "active" | "inactive";

export interface Branch {
  id: number;
  branchName: string;
  branchType: string;
  ownerName: string;
  email: string;
  phone: string;
  status: BranchStatus;
  address: string;
  city: string;
  state: string;
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
}

export const BRANCH_TYPE_OPTIONS = [
  { id: "fashion", label: "Fashion" },
  { id: "electronics", label: "Electronics" },
  { id: "grocery", label: "Grocery" },
  { id: "restaurant", label: "Restaurant" },
  { id: "salon", label: "Salon" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "other", label: "Other" },
];

export const BRANCH_STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export function mapApiBranch(raw: Record<string, any>): Branch {
  const status = String(raw.status ?? "active").toLowerCase() as BranchStatus;
  return {
    id: Number(raw.id ?? 0),
    branchName: String(raw.branch_name ?? raw.branchName ?? ""),
    branchType: String(raw.branch_type ?? raw.branchType ?? ""),
    ownerName: String(raw.owner_name ?? raw.ownerName ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? raw.phone_number ?? ""),
    status: ["active", "inactive"].includes(status) ? status : "active",
    address: String(raw.address ?? ""),
    city: String(raw.city ?? ""),
    state: String(raw.state ?? ""),
    pincode: String(raw.pincode ?? raw.pin_code ?? ""),
    bankName: String(raw.bank_name ?? raw.bankName ?? ""),
    accountNumber: String(raw.account_number ?? raw.accountNumber ?? ""),
    ifscCode: String(raw.ifsc_code ?? raw.ifscCode ?? ""),
    upiId: String(raw.upi_id ?? raw.upiId ?? ""),
    licenseFile: raw.license_file ?? raw.licenseFile ?? null,
    gstCertificate: raw.gst_certificate ?? raw.gstCertificate ?? null,
    idProof: raw.id_proof ?? raw.idProof ?? null,
    branchLogo: raw.branch_logo ?? raw.branchLogo ?? raw.logo ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? "",
  };
}

export interface BranchFormValues {
  branchType: string;
  branchName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  status: BranchStatus;
  // file fields
  licenseFile: File | null;
  gstCertificateFile: File | null;
  idProofFile: File | null;
  branchLogoFile: File | null;
  // preview urls (edit mode)
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
    address: branch?.address ?? "",
    city: branch?.city ?? "",
    state: branch?.state ?? "",
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
    address: values.address,
    city: values.city,
    state: values.state,
    pincode: values.pincode,
    bank_name: values.bankName,
    account_number: values.accountNumber,
    ifsc_code: values.ifscCode,
    upi_id: values.upiId,
    status: values.status,
  };
  if (!isEdit && values.password) json.password = values.password;

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
