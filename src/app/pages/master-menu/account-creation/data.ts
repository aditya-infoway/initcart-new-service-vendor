// Account Creation – TypeScript types & helpers

export interface Account {
  id: number;
  accountName: string;
  group: string;
  openingBalance: string;
  drcr: string;
  address: string;
  country: string;
  state: string;
  city: string;
  email: string | null;
  pincode: string;
  phone: string;
  mobile: string;
  gstNo: string;
  panCard: string;
  currentBalance: string;
  currentDrcr: string;
}

// NAYA
export interface AccountFormValues {
  accountName: string;
  group: string;
  openingBalance: string;
  drcr: string;
  address: string;
  country: string;
  state: string;
  city: string;
  email: string;
  pincode: string;
  mobile: string;
  gstNo: string;
  panCard: string;
}

export const GROUP_OPTIONS = [
  { id: "Customer", label: "Customer" },
  { id: "Supplier", label: "Supplier" },
  { id: "Bank Account", label: "Bank Account" },
  { id: "Case In Hand", label: "Case In Hand" },
  { id: "Customer - Sundry Debitor", label: "Customer - Sundry Debitor" },
  { id: "Supplier - Sundry Creditor", label: "Supplier - Sundry Creditor" },
  { id: "Sundry Debitor(Internal)", label: "Sundry Debitor(Internal)" },
  { id: "Sundry Creditor(Internal)", label: "Sundry Creditor(Internal)" },
  { id: "Sundry Creditor(Main)", label: "Sundry Creditor(Main)" },
];

export const DRCR_OPTIONS = [
  { id: "Dr", label: "Dr. (Receivable)" },
  { id: "Cr", label: "Cr. (Payable)" },
];

export function mapApiAccount(raw: Record<string, any>): Account {
  return {
    id: Number(raw.id ?? 0),
    accountName: String(raw.account_name ?? ""),
    group: String(raw.group ?? ""),
    openingBalance: String(raw.opening_balance ?? "0.00"),
    drcr: String(raw.drcr ?? "Dr"),
    address: String(raw.address ?? ""),
    country: String(raw.country ?? ""),
    state: String(raw.state ?? ""),
    city: String(raw.city ?? ""),
    email: raw.email ?? null,
    pincode: String(raw.pincode ?? ""),
    phone: String(raw.phone ?? ""),
    mobile: String(raw.mobile ?? ""),
    gstNo: String(raw.gst_no ?? ""),
    panCard: String(raw.pan_card ?? ""),
    currentBalance: String(raw.current_balance ?? "0.00"),
    currentDrcr: String(raw.current_drcr ?? "Dr"),
  };
}

// NAYA
export function buildAccountFormValues(account: Account | null): AccountFormValues {
  return {
    accountName: account?.accountName ?? "",
    group: account?.group ?? "",
    openingBalance: account?.openingBalance ?? "0.00",
    drcr: account?.drcr ?? "Dr",
    address: account?.address ?? "",
    country: account?.country ?? "",
    state: account?.state ?? "",
    city: account?.city ?? "",
    email: account?.email ?? "",
    pincode: account?.pincode ?? "",
    mobile: account?.mobile ?? "",
    gstNo: account?.gstNo ?? "",
    panCard: account?.panCard ?? "",
  };
}

// NAYA
export function buildAccountPayload(values: AccountFormValues): Record<string, any> {
  return {
    account_name: values.accountName,
    group: values.group,
    opening_balance: values.openingBalance || "0.00",
    drcr: values.drcr,
    address: values.address,
    country: values.country,
    state: values.state,
    city: values.city,
    email: values.email,
    pincode: values.pincode,
    mobile: values.mobile,
    gst_no: values.gstNo,
    pan_card: values.panCard,
  };
}

// Tab filter type
export type AccountTabKey = "all" | "Sundry Creditor(Main)" | "Customer" | "Case In Hand";

export const ACCOUNT_TABS: { key: AccountTabKey; title: string }[] = [
  { key: "all", title: "All" },
  { key: "Sundry Creditor(Main)", title: "Sundry Creditor(Main)" },
  { key: "Customer", title: "Customer" },
  { key: "Case In Hand", title: "Case In Hand" },
];
