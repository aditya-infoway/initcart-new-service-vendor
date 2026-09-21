// ── Types ───────────────────────────────────────────────────────────────
export interface Inquiry {
  id: number;
  inquiry_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  service_category: string;
  sub_category?: string;
  created_at: string;
  preferred_date?: string;
  preferred_time?: string;
  customer_city?: string;
  message?: string;
  subject?: string;
  status?: string;
  is_read?: boolean;
  service_url?: string;
}

export interface InquiryFormValues {
  customer_name: string;
  email: string;
  phone: string;
  service_interest: string;
  message: string;
  status: string;
  created_date: string;
}

export function buildInquiryPayload(values: InquiryFormValues) {
  return {
    customer_name: values.customer_name,
    customer_email: values.email,
    customer_phone: values.phone,
    service_name: values.service_interest,
    message: values.message,
    status: values.status,
    created_at: values.created_date,
  };
}
