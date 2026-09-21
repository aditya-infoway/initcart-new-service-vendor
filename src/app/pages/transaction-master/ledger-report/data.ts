export interface LedgerAccount {
  id: number;
  accountName: string;
  group: string;
  address: string;
  city: string;
  state: string;
  openingBalance: string;
  drcr: string;
  currentBalance: string;
  currentDrcr: string;
}

export interface LedgerEntry {
  id?: number;
  date: string;
  type: string;
  voucherNo: string;
  debit: number;
  credit: number;
  balance: number;
  balanceDrcr: string;
  narration: string;
}

export interface LedgerDetail {
  accountId: number;
  account: string;
  group: string;
  openingBalance: number;
  openingDrCr: string;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingDrCr: string;
  ledger: LedgerEntry[];
}

export function mapApiLedgerAccount(raw: any): LedgerAccount {
  return {
    id: Number(raw.id ?? 0),
    accountName: String(raw.account_name ?? ""),
    group: String(raw.group ?? ""),
    address: String(raw.address ?? ""),
    city: String(raw.city ?? ""),
    state: String(raw.state ?? ""),
    openingBalance: String(raw.opening_balance ?? "0.00"),
    drcr: String(raw.drcr ?? ""),
    currentBalance: String(raw.current_balance ?? "0.00"),
    currentDrcr: String(raw.current_drcr ?? ""),
  };
}

export function mapApiLedgerDetail(raw: any): LedgerDetail {
  return {
    accountId: Number(raw.account_id ?? 0),
    account: String(raw.account ?? ""),
    group: String(raw.group ?? ""),
    openingBalance: Number(raw.opening_balance ?? 0),
    openingDrCr: String(raw.opening_dr_cr ?? "Dr"),
    totalDebit: Number(raw.total_debit ?? 0),
    totalCredit: Number(raw.total_credit ?? 0),
    closingBalance: Number(raw.closing_balance ?? 0),
    closingDrCr: String(raw.closing_dr_cr ?? "Dr"),
    ledger: Array.isArray(raw.ledger) ? raw.ledger.map(mapApiLedgerEntry) : [],
  };
}

export function mapApiLedgerEntry(raw: any): LedgerEntry {
  return {
    id: Number(raw.id ?? 0),
    date: String(raw.date ?? raw.created_at ?? ""),
    type: String(raw.type ?? raw.transaction_type ?? ""),
    voucherNo: String(raw.voucher_no ?? raw.bill_no ?? ""),
    debit: Number(raw.debit ?? 0),
    credit: Number(raw.credit ?? 0),
    balance: Number(raw.balance ?? 0),
    balanceDrcr: String(raw.balance_dr_cr ?? raw.dr_cr ?? "Dr"),
    narration: String(raw.narration ?? raw.note ?? ""),
  };
}

export const GROUP_TABS = [
  { key: "all",                   label: "All Groups" },
  { key: "Customer",              label: "Customer" },
  { key: "Sundry Creditor(Main)", label: "Supplier" },
  { key: "Bank Account",          label: "Bank Account" },
  { key: "Case In Hand",          label: "Cash In Hand" },
];

export function getDrCrColor(drcr: string) {
  return drcr === "Cr"
    ? "text-red-600 dark:text-red-400"
    : "text-emerald-600 dark:text-emerald-400";
}
