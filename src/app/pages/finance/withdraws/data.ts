// ── Types ───────────────────────────────────────────────────────────────
export interface Withdraw {
  id: number;
  vendor_name: string;
  amount: number;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  status: "Pending" | "Approved" | "Rejected";
  request_date: string;
  processed_date?: string;
}

export interface WithdrawFormValues {
  vendor_name: string;
  amount: number;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  status: string;
  request_date: string;
  processed_date?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────
export function buildWithdrawPayload(values: WithdrawFormValues) {
  return {
    vendor_name: values.vendor_name,
    amount: Number(values.amount),
    bank_name: values.bank_name,
    account_number: values.account_number,
    ifsc_code: values.ifsc_code,
    status: values.status,
    request_date: values.request_date,
    processed_date: values.processed_date,
  };
}
