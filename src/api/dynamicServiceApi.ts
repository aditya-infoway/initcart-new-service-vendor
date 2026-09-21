import { Get, Post, Patch, Delete } from "@/ApiHelper";

// ==================== INTERFACES ====================

export interface DynamicService {
  id: number;
  service_name: string;
  short_description: string;
  full_description: string;
  price: number;
  offer_price?: number;
  gst_percentage: string;
  contact_person: string;
  contact_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  video_url?: string;
  batch_timings?: string;
  terms_conditions: string;

  // Vendor-specific fields (dynamic based on service type)
  service_type?: string;
  category?: string;
  subcategory_name?: string;
  business_name?: string;

  // Hotel specific
  hotel_name?: string;
  hotel_rating?: number;
  room_category?: string;
  location?: string;
  contact_no?: string;
  whatsapp_no?: string;
  gmail_id?: string;
  open_time?: string;
  close_time?: string;
  main_image?: string;
  multi_images?: string[];

  // Real Estate specific
  propertyTitle?: string;
  transactionType?: string;
  totalAreaSize?: string;
  carpetArea?: string;
  bedrooms?: string;
  bathrooms?: string;
  balconies?: string;
  furnishingStatus?: string;
  floorNumber?: string;
  totalFloors?: string;
  facingDirection?: string;
  propertyAge?: string;
  ownershipType?: string;
  thumbnail_image?: string;
  additional_images?: string[];

  // Gym specific
  facilities?: string[];
  second_image?: string;

  // Salon specific
  services?: string[];

  // Education specific
  education_type?: string;
  subjects_courses?: string;
  mode_of_class?: string;
  class_duration?: string;
  faculty_details?: string;
  eligibility_criteria?: string;

  // Status
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive';
  is_active: boolean;
  is_featured: boolean;
  views_count: number;

  // Dates
  created_at: string;
  updated_at: string;
  submitted_for_approval_at?: string;
  approved_at?: string;
  rejected_at?: string;

  // Rejection info
  rejection_reason?: string;

  // Image
  image?: string;
  image_url?: string;

  // Vendor info
  vendor?: number;
  vendor_name?: string;

  // Helper properties
  final_price?: number;
  can_be_edited?: boolean;
  can_be_submitted?: boolean;

  // Additional fields for display
  total_bookings?: number;
  rating?: number;
  approved_by?: string;
}

export interface CreateDynamicServiceData {
  service_name: string;
  short_description: string;
  full_description: string;
  price: number;
  offer_price?: number;
  gst_percentage: string;
  contact_person: string;
  contact_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  video_url?: string;
  batch_timings?: string;
  terms_conditions: string;
  service_type?: string;
  category?: string;
  subcategory_name?: string;
  business_name?: string;
  
  // Education specific
  education_type?: string;
  subjects_courses?: string;
  mode_of_class?: string;
  class_duration?: string;
  faculty_details?: string;
  facilities?: string;
  eligibility_criteria?: string;
  
  // Image file
  image?: File;
}

export interface DynamicServiceResponse {
  success: boolean;
  message?: string;
  data?: any;
  errors?: Record<string, string[]>;
  count?: number;
  services?: DynamicService[];
  service?: DynamicService;
}

export interface PaginatedResponse {
  success: boolean;
  count: number;
  next: string | null;
  previous: string | null;
  results: DynamicService[];
}

// ==================== API ENDPOINTS ====================

const getServiceEndpoint = (serviceType: string) => {
  const endpointMap: Record<string, string> = {
    education: "ecommerce/services/education/education-services",
    gym: "gym-services",
    salon: "saloon-services",
    travel: "travel-services",
    hotel: "hotel-services",
    healthcare: "healthcare-services",
    tech: "tech-services",
    finance: "finance-services",
    professional: "professional-services",
    restaurant: "restaurant-services",
    real_estate: "services/real-estate/vendor/properties",
    travel_agency: "travel-services",
    tech_industry: "tech-services",
  };
  
  return endpointMap[serviceType] || "general-services";
};

// ==================== DYNAMIC SERVICE API CLASS ====================

class DynamicServiceApi {
  /**
   * Get vendor's own services by service type
   */
  static async getMyServices(serviceType: string, status?: string): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const params = status ? { status } : {};
      // For education, use the my-services endpoint
      const finalEndpoint = serviceType === "education" ? `${endpoint}/my-services/` : `${endpoint}/`;
      const res = await Get(finalEndpoint, params);
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error fetching services:", error);
      return {
        success: false,
        message: "Failed to fetch services",
        errors: error,
      };
    }
  }
  
  /**
   * Get all services (admin view) with vendor filtering
   */
  static async getAdminList(serviceType: string, status?: string, vendor_id?: number): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const params: any = {};
      if (status) params.status = status;
      if (vendor_id) params.vendor_id = vendor_id;
      
      const res = await Get(`${endpoint}/admin-list/`, params);
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error fetching admin list:", error);
      return {
        success: false,
        message: "Failed to fetch services",
        errors: error,
      };
    }
  }
  
  /**
   * Get all services (general list)
   */
  static async getAllServices(serviceType?: string, params: any = {}): Promise<DynamicServiceResponse> {
    try {
      const endpoint = serviceType ? getServiceEndpoint(serviceType) : "/all-services/";
      const res = await Get(endpoint, params);
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error fetching all services:", error);
      return {
        success: false,
        message: "Failed to fetch services",
        errors: error,
      };
    }
  }
  
  /**
   * Create new service
   */
  static async createService(serviceType: string, formData: FormData): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Post(`${endpoint}/`, formData, true);
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error creating service:", error);
      return {
        success: false,
        message: "Failed to create service",
        errors: error,
      };
    }
  }
  
  /**
   * Update service
   */
  static async updateService(serviceType: string, id: number, formData: FormData): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Patch(`${endpoint}/${id}/`, formData, true);
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error updating service:", error);
      return {
        success: false,
        message: "Failed to update service",
        errors: error,
      };
    }
  }
  
  /**
   * Delete service
   */
  static async deleteService(serviceType: string, id: number): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Delete(`${endpoint}/${id}/`, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error deleting service:", error);
      return {
        success: false,
        message: "Failed to delete service",
        errors: error,
      };
    }
  }
  
  /**
   * Submit service for approval
   */
  static async submitForApproval(serviceType: string, id: number): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      // For real estate, use the old admin's endpoint format
      const approvalEndpoint = serviceType === "real_estate" 
        ? `services/real-estate/vendor/properties/${id}/submit_for_approval/`
        : serviceType === "education"
        ? `${endpoint}/${id}/submit-for-approval/`
        : `${endpoint}/${id}/submit_for_approval/`;
      const res = await Post(approvalEndpoint, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error submitting for approval:", error);
      return {
        success: false,
        message: "Failed to submit for approval",
        errors: error,
      };
    }
  }
  
  /**
   * Toggle service active status
   */
  static async toggleActive(serviceType: string, id: number): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Post(`${endpoint}/${id}/toggle_active/`, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error toggling active status:", error);
      return {
        success: false,
        message: "Failed to toggle active status",
        errors: error,
      };
    }
  }
  
  /**
   * Approve service (admin)
   */
  static async approveService(serviceType: string, id: number): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Post(`${endpoint}/${id}/approve/`, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error approving service:", error);
      return {
        success: false,
        message: "Failed to approve service",
        errors: error,
      };
    }
  }
  
  /**
   * Reject service (admin)
   */
  static async rejectService(serviceType: string, id: number, rejection_reason: string): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Post(`${endpoint}/${id}/reject/`, { rejection_reason });
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error rejecting service:", error);
      return {
        success: false,
        message: "Failed to reject service",
        errors: error,
      };
    }
  }
  
  /**
   * Get service details
   */
  static async getServiceDetails(serviceType: string, id: number): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Get(`${endpoint}/${id}/`, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error fetching service details:", error);
      return {
        success: false,
        message: "Failed to fetch service details",
        errors: error,
      };
    }
  }
  
  /**
   * Get pending approvals (admin)
   */
  static async getPendingApprovals(serviceType: string): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      // For education, use the old admin's endpoint format
      const pendingEndpoint = serviceType === "education"
        ? `${endpoint}/pending-approvals/`
        : `${endpoint}/pending_approvals/`;
      const res = await Get(pendingEndpoint, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error fetching pending approvals:", error);
      return {
        success: false,
        message: "Failed to fetch pending approvals",
        errors: error,
      };
    }
  }
  
  /**
   * Get vendor dashboard
   */
  static async getVendorDashboard(serviceType: string): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Get(`${endpoint}/vendor_dashboard/`, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error fetching vendor dashboard:", error);
      return {
        success: false,
        message: "Failed to fetch dashboard",
        errors: error,
      };
    }
  }
  
  /**
   * Get admin dashboard
   */
  static async getAdminDashboard(serviceType: string): Promise<DynamicServiceResponse> {
    try {
      const endpoint = getServiceEndpoint(serviceType);
      const res = await Get(`${endpoint}/admin_dashboard/`, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error fetching admin dashboard:", error);
      return {
        success: false,
        message: "Failed to fetch admin dashboard",
        errors: error,
      };
    }
  }

  /**
   * Get subcategories for a service type
   */
  static async getSubcategories(serviceType: string): Promise<DynamicServiceResponse> {
    try {
      const res = await Get(`service-subcategories/by_service/?service=${serviceType}`, {});
      return (res as any) as DynamicServiceResponse;
    } catch (error: any) {
      console.error("Error fetching subcategories:", error);
      return {
        success: false,
        message: "Failed to fetch subcategories",
        errors: error,
      };
    }
  }
}

export default DynamicServiceApi;
