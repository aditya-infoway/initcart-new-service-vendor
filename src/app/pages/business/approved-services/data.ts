// ── Types ───────────────────────────────────────────────────────────────
export interface Service {
  id: number;
  serviceId: string;
  serviceName: string;
  business_name: string;
  category: string;
  subcategory_name?: string;
  price: number;
  description: string;
  added_date: string;
  approved_date: string;
  approved_by: string;
  status: "Approved" | "Pending";
  rating: number;
  total_bookings: number;
}

export interface ServiceFormValues {
  serviceId: string;
  serviceName: string;
  category: string;
  subcategory_name?: string;
  price: number;
  description: string;
  added_date: string;
  approved_date: string;
  approved_by: string;
  status: string;
  rating: number;
  total_bookings: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────
export function buildServicePayload(values: ServiceFormValues) {
  return {
    serviceId: values.serviceId,
    serviceName: values.serviceName,
    category: values.category,
    subcategory_name: values.subcategory_name,
    price: Number(values.price),
    description: values.description,
    added_date: values.added_date,
    approved_date: values.approved_date,
    approved_by: values.approved_by,
    status: values.status,
    rating: Number(values.rating),
    total_bookings: Number(values.total_bookings),
  };
}
