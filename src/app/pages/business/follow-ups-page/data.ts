// ── Types ───────────────────────────────────────────────────────────────
export interface FollowUp {
  id: number;
  followupId: string;
  inquiryId: string;
  customerName: string;
  followupDate: string;
  followupType: "Call" | "Email" | "Visit";
  followupNotes: string;
  nextFollowupDate?: string;
  status: "Pending" | "Completed" | "Cancelled";
  handledBy: string;
}

export interface FollowUpFormValues {
  followupId: string;
  inquiryId: string;
  customerName: string;
  followupDate: string;
  followupType: string;
  followupNotes: string;
  nextFollowupDate?: string;
  status: string;
  handledBy: string;
}

