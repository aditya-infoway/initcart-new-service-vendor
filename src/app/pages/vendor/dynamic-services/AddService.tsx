import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  ArrowLeftIcon, PlusIcon, TrashIcon, XMarkIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Button, Input, Card } from "@/components/ui";
import { Upload } from "@/components/ui/Form/Upload";
import { TextEditor } from "@/components/shared/form/TextEditor";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Dropzone } from "@/components/shared/form/Dropzone";
import { WithIcon } from "@/components/ui/Tab";
import { toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import DynamicServiceApi from "@/api/dynamicServiceApi";
import { 
  HomeIcon, 
  Cog6ToothIcon, 
  CurrencyDollarIcon, 
  UserIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";

// ── Types ───────────────────────────────────────────────────────────────
interface Subcategory {
  id: number;
  subcategory_name: string;
}

interface RoomType {
  id?: number;
  room_type: string;
  person: number | string;
  rate: number | string;
}

// ── Validation Schemas ───────────────────────────────────────────────────
const hotelValidationSchema = Yup.object({
  subcategory: Yup.string().required("Hotel category is required"),
  hotel_name: Yup.string()
    .min(3, "Hotel name must be at least 3 characters")
    .max(100, "Hotel name too long")
    .required("Hotel name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  gmail_id: Yup.string()
    .email("Please enter a valid email address")
    .nullable(),
  hotel_rating: Yup.number()
    .min(0, "Rating must be between 0 and 5")
    .max(5, "Rating must be between 0 and 5")
    .nullable(),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  room_category: Yup.string().required("Room category is required"),
  main_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const gymValidationSchema = Yup.object({
  subcategory: Yup.string().required("Gym category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .required("Business name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  open_time: Yup.string().required("Opening time is required"),
  close_time: Yup.string().required("Closing time is required"),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  main_image: Yup.mixed().nullable(),
  second_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const salonValidationSchema = Yup.object({
  subcategory: Yup.string().required("Salon category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .required("Business name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  open_time: Yup.string().required("Opening time is required"),
  close_time: Yup.string().required("Closing time is required"),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  main_image: Yup.mixed().nullable(),
  second_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const travelValidationSchema = Yup.object({
  subcategory: Yup.string().required("Travel category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .required("Business name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  open_time: Yup.string().required("Opening time is required"),
  close_time: Yup.string().required("Closing time is required"),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  main_image: Yup.mixed().nullable(),
  second_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const financeValidationSchema = Yup.object({
  subcategory: Yup.string().required("Finance category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .required("Business name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  open_time: Yup.string().required("Opening time is required"),
  close_time: Yup.string().required("Closing time is required"),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  main_image: Yup.mixed().nullable(),
  second_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const techValidationSchema = Yup.object({
  subcategory: Yup.string().required("Tech category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .required("Business name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  open_time: Yup.string().required("Opening time is required"),
  close_time: Yup.string().required("Closing time is required"),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  main_image: Yup.mixed().nullable(),
  second_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const healthcareValidationSchema = Yup.object({
  subcategory: Yup.string().required("Healthcare category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .required("Business name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  open_time: Yup.string().required("Opening time is required"),
  close_time: Yup.string().required("Closing time is required"),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  main_image: Yup.mixed().nullable(),
  second_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const professionalValidationSchema = Yup.object({
  subcategory: Yup.string().required("Professional category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .required("Business name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  open_time: Yup.string().required("Opening time is required"),
  close_time: Yup.string().required("Closing time is required"),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  main_image: Yup.mixed().nullable(),
  second_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const workplaceValidationSchema = Yup.object({
  subcategory: Yup.string().required("Workplace category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .required("Business name is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  location: Yup.string()
    .url("Please enter a valid URL")
    .required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsapp_no: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .nullable(),
  open_time: Yup.string().required("Opening time is required"),
  close_time: Yup.string().required("Closing time is required"),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
  main_image: Yup.mixed().nullable(),
  second_image: Yup.mixed().nullable(),
  multi_images: Yup.array().of(Yup.mixed()).nullable(),
});

const realEstateValidationSchema = Yup.object({
  subcategory: Yup.string().required("Property type is required"),
  propertyTitle: Yup.string()
    .min(3, "Property title must be at least 3 characters")
    .required("Property title is required"),
  description: Yup.string()
    .min(20, "Description should be at least 20 characters")
    .required("Description is required"),
  transactionType: Yup.string().required("Transaction type is required"),
  address: Yup.string()
    .min(10, "Please enter full address")
    .required("Address is required"),
  city: Yup.string().required("City is required"),
  state: Yup.string().required("State is required"),
  pincode: Yup.string()
    .matches(/^[0-9]{6}$/, "Must be a valid 6-digit pincode")
    .required("Pincode is required"),
  totalAreaSize: Yup.string().required("Total area size is required"),
  carpetArea: Yup.string().required("Carpet area is required"),
  bedrooms: Yup.string().required("Number of bedrooms is required"),
  bathrooms: Yup.string().required("Number of bathrooms is required"),
  balconies: Yup.string().required("Number of balconies is required"),
  furnishingStatus: Yup.string().required("Furnishing status is required"),
  floorNumber: Yup.string().required("Floor number is required"),
  totalFloors: Yup.string().required("Total floors is required"),
  facingDirection: Yup.string().required("Facing direction is required"),
  propertyAge: Yup.string().required("Property age is required"),
  ownershipType: Yup.string().required("Ownership type is required"),
  price: Yup.string().required("Price is required"),
  contact_person: Yup.string().required("Contact person is required"),
  contact_number: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  email: Yup.string()
    .email("Please enter a valid email")
    .required("Email is required"),
  main_image: Yup.mixed().required("Main image is required"),
  thumbnail_image: Yup.mixed().required("Thumbnail image is required"),
});

const educationValidationSchema = Yup.object({
  service_name: Yup.string()
    .min(3, "Service name must be at least 3 characters")
    .required("Service name is required"),
  short_description: Yup.string()
    .min(10, "Short description must be at least 10 characters")
    .required("Short description is required"),
  full_description: Yup.string()
    .min(20, "Full description must be at least 20 characters")
    .required("Full description is required"),
  price: Yup.number()
    .min(0, "Price must be positive")
    .required("Price is required"),
  gst_percentage: Yup.string().required("GST percentage is required"),
  contact_person: Yup.string().required("Contact person is required"),
  contact_number: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  email: Yup.string()
    .email("Please enter a valid email")
    .required("Email is required"),
  address: Yup.string().required("Address is required"),
  city: Yup.string().required("City is required"),
  state: Yup.string().required("State is required"),
  pincode: Yup.string()
    .matches(/^[0-9]{6}$/, "Must be a valid 6-digit pincode")
    .required("Pincode is required"),
  terms_conditions: Yup.string().required("Terms and conditions are required"),
  education_type: Yup.string().required("Education type is required"),
  subjects_courses: Yup.string().required("Subjects/Courses are required"),
  mode_of_class: Yup.string().required("Mode of class is required"),
  class_duration: Yup.string().required("Class duration is required"),
  image: Yup.mixed().nullable(),
});

const defaultValidationSchema = Yup.object({
  service_name: Yup.string()
    .min(3, "Service name must be at least 3 characters")
    .required("Service name is required"),
  short_description: Yup.string()
    .min(10, "Short description must be at least 10 characters")
    .required("Short description is required"),
  full_description: Yup.string()
    .min(20, "Full description must be at least 20 characters")
    .required("Full description is required"),
  price: Yup.number()
    .min(0, "Price must be positive")
    .required("Price is required"),
  gst_percentage: Yup.string().required("GST percentage is required"),
  contact_person: Yup.string().required("Contact person is required"),
  contact_number: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  email: Yup.string()
    .email("Please enter a valid email")
    .required("Email is required"),
  address: Yup.string().required("Address is required"),
  city: Yup.string().required("City is required"),
  state: Yup.string().required("State is required"),
  pincode: Yup.string()
    .matches(/^[0-9]{6}$/, "Must be a valid 6-digit pincode")
    .required("Pincode is required"),
  terms_conditions: Yup.string().required("Terms and conditions are required"),
  image: Yup.mixed().nullable(),
});

// ── Component ─────────────────────────────────────────────────────────────
export default function AddService() {
  const { serviceType, id } = useParams<{ serviceType: string; id?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [multiImagesPreviews, setMultiImagesPreviews] = useState<string[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([
    { room_type: "", person: "", rate: "" }
  ]);
  const [description, setDescription] = useState<string>("");
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [multiImageFiles, setMultiImageFiles] = useState<File[]>([]);
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  
  // Real Estate specific state
  const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);
  const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
  const [additionalImagesPreviews, setAdditionalImagesPreviews] = useState<string[]>([]);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [capturedLocation, setCapturedLocation] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [nearbyFacilities, setNearbyFacilities] = useState<string[]>([]);
  const [facilityDistances, setFacilityDistances] = useState<Record<string, string>>({});

  // Gym specific state
  const [secondImagePreview, setSecondImagePreview] = useState<string | null>(null);
  const [secondImageFile, setSecondImageFile] = useState<File | null>(null);
  const [gymServices, setGymServices] = useState<{ name: string; description: string; price: number }[]>([{ name: "", description: "", price: 0 }]);

  // Salon specific state
  const [salonSecondImagePreview, setSalonSecondImagePreview] = useState<string | null>(null);
  const [salonSecondImageFile, setSalonSecondImageFile] = useState<File | null>(null);
  const [salonServices, setSalonServices] = useState<{ name: string; description: string; price: number }[]>([{ name: "", description: "", price: 0 }]);

  // Common service state for Travel, Finance, Tech, Healthcare, Professional, Workplace
  const [commonSecondImagePreview, setCommonSecondImagePreview] = useState<string | null>(null);
  const [commonSecondImageFile, setCommonSecondImageFile] = useState<File | null>(null);
  const [commonServices, setCommonServices] = useState<{ name: string; description: string; price: number }[]>([{ name: "", description: "", price: 0 }]);

  const isEditMode = !!id;
  const isHotel = serviceType === "hotel";
  const isRealEstate = serviceType === "real_estate";
  const isGym = serviceType === "gym";
  const isSalon = serviceType === "salon";
  const isTravel = serviceType === "travel_agency";
  const isFinance = serviceType === "finance";
  const isTech = serviceType === "tech_industry";
  const isHealthcare = serviceType === "healthcare";
  const isProfessional = serviceType === "professional";
  const isWorkplace = serviceType === "workplace";
  const isEducation = serviceType === "education";

  // Get validation schema based on service type
  const validationSchema = isHotel
    ? hotelValidationSchema
    : isRealEstate
    ? realEstateValidationSchema
    : isGym
    ? gymValidationSchema
    : isSalon
    ? salonValidationSchema
    : serviceType === "travel_agency"
    ? travelValidationSchema
    : serviceType === "finance"
    ? financeValidationSchema
    : serviceType === "tech_industry"
    ? techValidationSchema
    : serviceType === "healthcare"
    ? healthcareValidationSchema
    : serviceType === "professional"
    ? professionalValidationSchema
    : serviceType === "workplace"
    ? workplaceValidationSchema
    : isEducation
    ? educationValidationSchema
    : defaultValidationSchema;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<any>({
    resolver: yupResolver(validationSchema as any),
    defaultValues: isHotel ? {
      subcategory: "",
      hotel_name: "",
      location: "",
      address: "",
      country: "",
      state: "",
      city: "",
      contact_no: "",
      whatsapp_no: "",
      gmail_id: "",
      hotel_rating: "",
      description: "",
      room_category: "",
      main_image: null,
      multi_images: [],
    } : isRealEstate ? {
      subcategory: "",
      propertyTitle: "",
      description: "",
      transactionType: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      googleMapPin: "",
      totalAreaSize: "",
      carpetArea: "",
      bedrooms: "",
      bathrooms: "",
      balconies: "",
      furnishingStatus: "unfurnished",
      floorNumber: "",
      totalFloors: "",
      facingDirection: "east",
      propertyAge: "",
      ownershipType: "freehold",
      encumbranceCertificate: "",
      reaNumber: "",
      loanAvailability: "",
      documentsAvailable: "",
      negotiable: "",
      price: "",
      maintenanceCharges: "0",
      bookingAmount: "0",
      contactType: "user",
      contact_person: "",
      contact_number: "",
      whatsappNumber: "",
      email: "",
      preferredTime: "",
      main_image: null,
      thumbnail_image: null,
      additional_images: [],
    } : isGym ? {
      subcategory: "",
      business_name: "",
      address: "",
      location: "",
      country: "",
      state: "",
      city: "",
      contact_no: "",
      whatsapp_no: "",
      gmail_id: "",
      open_time: "",
      close_time: "",
      description: "",
      main_image: null,
      second_image: null,
      multi_images: [],
    } : isSalon ? {
      subcategory: "",
      business_name: "",
      address: "",
      location: "",
      country: "",
      state: "",
      city: "",
      contact_no: "",
      whatsapp_no: "",
      gmail_id: "",
      open_time: "",
      close_time: "",
      description: "",
      main_image: null,
      second_image: null,
      multi_images: [],
    } : isTravel || isFinance || isTech || isHealthcare || isProfessional || isWorkplace ? {
      subcategory: "",
      business_name: "",
      address: "",
      location: "",
      country: "",
      state: "",
      city: "",
      contact_no: "",
      whatsapp_no: "",
      gmail_id: "",
      open_time: "",
      close_time: "",
      description: "",
      main_image: null,
      second_image: null,
      multi_images: [],
    } : isEducation ? {
      service_name: "",
      short_description: "",
      full_description: "",
      price: "",
      offer_price: "",
      gst_percentage: "",
      contact_person: "",
      contact_number: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      video_url: "",
      batch_timings: "",
      terms_conditions: "",
      education_type: "",
      subjects_courses: "",
      mode_of_class: "",
      class_duration: "",
      faculty_details: "",
      facilities: "",
      eligibility_criteria: "",
      image: null,
    } : {
      service_name: "",
      short_description: "",
      full_description: "",
      price: "",
      offer_price: "",
      gst_percentage: "",
      contact_person: "",
      contact_number: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      video_url: "",
      batch_timings: "",
      terms_conditions: "",
      image: null,
    },
  });

  // Fetch subcategories for hotel and real estate
  useEffect(() => {
    if (isHotel) {
      const fetchSubcategories = async () => {
        try {
          const response = await DynamicServiceApi.getSubcategories("Hotel");
          if (response.success && response.data) {
            // Handle different response formats
            if (response.data["Hotel"]) {
              setSubcategories(response.data["Hotel"]);
            } else if (Array.isArray(response.data)) {
              setSubcategories(response.data);
            }
          }
        } catch (error) {
          console.error("Error fetching subcategories:", error);
        }
      };
      fetchSubcategories();
    }
  }, [isHotel]);

  // Fetch subcategories for real estate
  useEffect(() => {
    if (isRealEstate) {
      const fetchSubcategories = async () => {
        try {
          const response = await DynamicServiceApi.getSubcategories("Real-Estate");
          if (response.success && response.data) {
            // Handle different response formats
            if (response.data["Real-Estate"]) {
              setSubcategories(response.data["Real-Estate"]);
            } else if (Array.isArray(response.data)) {
              setSubcategories(response.data);
            }
          }
        } catch (error) {
          console.error("Error fetching real estate subcategories:", error);
        }
      };
      fetchSubcategories();
    }
  }, [isRealEstate]);

  // Fetch subcategories for gym
  useEffect(() => {
    if (isGym) {
      const fetchSubcategories = async () => {
        try {
          const response = await DynamicServiceApi.getSubcategories("Gym");
          if (response.success && response.data) {
            if (response.data["Gym"]) {
              setSubcategories(response.data["Gym"]);
            } else if (Array.isArray(response.data)) {
              setSubcategories(response.data);
            }
          }
        } catch (error) {
          console.error("Error fetching gym subcategories:", error);
        }
      };
      fetchSubcategories();
    }
  }, [isGym]);

  // Fetch subcategories for salon
  useEffect(() => {
    if (isSalon) {
      const fetchSubcategories = async () => {
        try {
          const response = await DynamicServiceApi.getSubcategories("Salon");
          if (response.success && response.data) {
            if (response.data["Salon"]) {
              setSubcategories(response.data["Salon"]);
            } else if (Array.isArray(response.data)) {
              setSubcategories(response.data);
            }
          }
        } catch (error) {
          console.error("Error fetching salon subcategories:", error);
        }
      };
      fetchSubcategories();
    }
  }, [isSalon]);

  // Fetch subcategories for travel, finance, tech, healthcare, professional, workplace
  useEffect(() => {
    if (isTravel || isFinance || isTech || isHealthcare || isProfessional || isWorkplace) {
      const fetchSubcategories = async () => {
        try {
          const response = await DynamicServiceApi.getSubcategories(serviceType!);
          if (response.success && response.data) {
            if (response.data[serviceType]) {
              setSubcategories(response.data[serviceType]);
            } else if (Array.isArray(response.data)) {
              setSubcategories(response.data);
            }
          }
        } catch (error) {
          console.error(`Error fetching ${serviceType} subcategories:`, error);
        }
      };
      fetchSubcategories();
    }
  }, [isTravel, isFinance, isTech, isHealthcare, isProfessional, isWorkplace, serviceType]);

  // Handle main image upload
  const handleMainImage = (files: File[]) => {
    const file = files[0] || null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toasterrormsg("Image size should be less than 5MB");
        return;
      }
      setMainImageFile(file);
      setValue("main_image", file);
      const reader = new FileReader();
      reader.onloadend = () => setMainImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle multi images upload
  const handleMultiImages = (files: File[]) => {
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    if (validFiles.length > 0) {
      setMultiImageFiles([...multiImageFiles, ...validFiles]);
      setValue("multi_images", [...multiImageFiles, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setMultiImagesPreviews(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  // Handle single image upload for non-hotel services
  const handleImage = (files: File[]) => {
    const file = files[0] || null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toasterrormsg("Image size should be less than 5MB");
        return;
      }
      setServiceImageFile(file);
      setValue("image", file);
    }
  };

  // Real Estate specific handlers
  const handleThumbnailImage = (files: File[]) => {
    const file = files[0] || null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toasterrormsg("Image size should be less than 5MB");
        return;
      }
      setThumbnailImageFile(file);
      setValue("thumbnail_image", file);
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImages = (files: File[]) => {
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    if (validFiles.length > 0) {
      setAdditionalImageFiles([...additionalImageFiles, ...validFiles]);
      setValue("additional_images", [...additionalImageFiles, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setAdditionalImagesPreviews(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const url = `https://www.google.com/maps?q=${lat},${lng}`;
          setCapturedLocation({ lat, lng });
          setValue("googleMapPin", url);
          toastsuccessmsg("Location captured successfully!");
        },
        (error) => {
          toasterrormsg("Failed to get location. Please allow location access.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toasterrormsg("Geolocation is not supported by your browser.");
    }
  };

  const clearCapturedLocation = () => {
    setCapturedLocation({ lat: null, lng: null });
    setValue("googleMapPin", "");
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const toggleNearbyFacility = (facility: string) => {
    setNearbyFacilities(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    );
    // Clear distance if facility is removed
    if (!nearbyFacilities.includes(facility)) {
      setFacilityDistances(prev => {
        const newDistances = { ...prev };
        delete newDistances[facility];
        return newDistances;
      });
    }
  };

  const updateFacilityDistance = (facility: string, distance: string) => {
    setFacilityDistances(prev => ({ ...prev, [facility]: distance }));
  };

  // Add room type
  const addRoomType = () => {
    setRoomTypes([...roomTypes, { room_type: "", person: "", rate: "" }]);
  };

  // Remove room type
  const removeRoomType = (index: number) => {
    if (roomTypes.length > 1) {
      setRoomTypes(roomTypes.filter((_, i) => i !== index));
    }
  };

  // Update room type
  const updateRoomType = (index: number, field: keyof RoomType, value: string | number) => {
    const updated = [...roomTypes];
    updated[index] = { ...updated[index], [field]: value };
    setRoomTypes(updated);
  };

  // Submit form
  const onSubmit = async (data: any) => {
    if (!serviceType) return;
    
    setLoading(true);
    try {
      const formData = new FormData();

      if (isHotel) {
        formData.append("subcategory", data.subcategory);
        formData.append("hotel_name", data.hotel_name);
        formData.append("address", data.address);
        formData.append("location", data.location);
        formData.append("country", data.country);
        formData.append("state", data.state);
        formData.append("city", data.city);
        formData.append("contact_no", data.contact_no);
        if (data.whatsapp_no) formData.append("whatsapp_no", data.whatsapp_no);
        if (data.gmail_id) formData.append("gmail_id", data.gmail_id);
        if (data.hotel_rating) formData.append("hotel_rating", data.hotel_rating);
        formData.append("description", data.description);
        formData.append("room_category", data.room_category);
        if (data.main_image) formData.append("main_image", data.main_image);
        if (data.multi_images) {
          data.multi_images.forEach((img: File) => formData.append("multi_images", img));
        }

        const validRoomTypes = roomTypes.filter(r => r.room_type.trim() && r.person && r.rate);
        formData.append("room_types", JSON.stringify(validRoomTypes));

        if (isEditMode) {
          await DynamicServiceApi.updateService(serviceType, parseInt(id!), formData);
        } else {
          await DynamicServiceApi.createService(serviceType, formData);
        }
      } else if (isGym) {
        // Gym Service Fields
        formData.append("subcategory", data.subcategory);
        formData.append("business_name", data.business_name);
        formData.append("address", data.address);
        formData.append("location", data.location);
        formData.append("country", data.country);
        formData.append("state", data.state);
        formData.append("city", data.city);
        formData.append("contact_no", data.contact_no);
        if (data.whatsapp_no) formData.append("whatsapp_no", data.whatsapp_no);
        if (data.gmail_id) formData.append("gmail_id", data.gmail_id);
        formData.append("open_time", data.open_time);
        formData.append("close_time", data.close_time);
        formData.append("description", data.description);
        if (data.main_image) formData.append("main_image", data.main_image);
        if (data.second_image) formData.append("second_image", data.second_image);
        if (data.multi_images) {
          data.multi_images.forEach((img: File) => formData.append("multi_images", img));
        }

        const validServices = gymServices.filter(s => s.name.trim() !== "");
        formData.append("items", JSON.stringify(validServices));

        if (isEditMode) {
          await DynamicServiceApi.updateService(serviceType, parseInt(id!), formData);
        } else {
          await DynamicServiceApi.createService(serviceType, formData);
        }
      } else if (isSalon) {
        // Salon Service Fields
        formData.append("subcategory", data.subcategory);
        formData.append("business_name", data.business_name);
        formData.append("address", data.address);
        formData.append("location", data.location);
        formData.append("country", data.country);
        formData.append("state", data.state);
        formData.append("city", data.city);
        formData.append("contact_no", data.contact_no);
        if (data.whatsapp_no) formData.append("whatsapp_no", data.whatsapp_no);
        if (data.gmail_id) formData.append("gmail_id", data.gmail_id);
        formData.append("open_time", data.open_time);
        formData.append("close_time", data.close_time);
        formData.append("description", data.description);
        if (data.main_image) formData.append("main_image", data.main_image);
        if (data.second_image) formData.append("second_image", data.second_image);
        if (data.multi_images) {
          data.multi_images.forEach((img: File) => formData.append("multi_images", img));
        }

        const validServices = salonServices.filter(s => s.name.trim() !== "");
        formData.append("items", JSON.stringify(validServices));

        if (isEditMode) {
          await DynamicServiceApi.updateService(serviceType, parseInt(id!), formData);
        } else {
          await DynamicServiceApi.createService(serviceType, formData);
        }
      } else if (isTravel || isFinance || isTech || isHealthcare || isProfessional || isWorkplace) {
        // Common Service Fields for Travel, Finance, Tech, Healthcare, Professional, Workplace
        formData.append("subcategory", data.subcategory);
        formData.append("business_name", data.business_name);
        formData.append("address", data.address);
        formData.append("location", data.location);
        formData.append("country", data.country);
        formData.append("state", data.state);
        formData.append("city", data.city);
        formData.append("contact_no", data.contact_no);
        if (data.whatsapp_no) formData.append("whatsapp_no", data.whatsapp_no);
        if (data.gmail_id) formData.append("gmail_id", data.gmail_id);
        formData.append("open_time", data.open_time);
        formData.append("close_time", data.close_time);
        formData.append("description", data.description);
        if (data.main_image) formData.append("main_image", data.main_image);
        if (data.second_image) formData.append("second_image", data.second_image);
        if (data.multi_images) {
          data.multi_images.forEach((img: File) => formData.append("multi_images", img));
        }

        const validServices = commonServices.filter(s => s.name.trim() !== "");
        formData.append("items", JSON.stringify(validServices));

        if (isEditMode) {
          await DynamicServiceApi.updateService(serviceType, parseInt(id!), formData);
        } else {
          await DynamicServiceApi.createService(serviceType, formData);
        }
      } else if (isRealEstate) {
        // Real Estate Service Fields
        formData.append("subcategory", data.subcategory);
        formData.append("title", data.propertyTitle);
        formData.append("description", data.description);
        formData.append("transaction_type", data.transactionType);
        formData.append("address", data.address);
        formData.append("city", data.city);
        formData.append("state", data.state);
        formData.append("pincode", data.pincode);
        formData.append("google_map_url", data.googleMapPin || "");
        
        // Add captured location coordinates
        if (capturedLocation.lat && capturedLocation.lng) {
          formData.append("latitude", capturedLocation.lat.toString());
          formData.append("longitude", capturedLocation.lng.toString());
        }
        
        // Specifications
        formData.append("total_area_size", data.totalAreaSize);
        formData.append("carpet_area", data.carpetArea);
        formData.append("bedrooms", data.bedrooms);
        formData.append("bathrooms", data.bathrooms);
        formData.append("balconies", data.balconies);
        formData.append("furnishing_status", data.furnishingStatus);
        formData.append("floor_number", data.floorNumber);
        formData.append("total_floors", data.totalFloors);
        formData.append("facing_direction", data.facingDirection);
        formData.append("property_age", data.propertyAge);
        
        // Legal & Ownership
        formData.append("ownership_type", data.ownershipType);
        if (data.encumbranceCertificate) formData.append("encumbrance_certificate", data.encumbranceCertificate);
        if (data.reaNumber) formData.append("rea_number", data.reaNumber);
        if (data.loanAvailability) formData.append("loan_availability", data.loanAvailability === "Yes" ? "true" : "false");
        if (data.documentsAvailable) formData.append("documents_available", data.documentsAvailable.toLowerCase());
        if (data.negotiable) formData.append("negotiable", data.negotiable === "Yes" ? "true" : "false");
        
        // Price
        formData.append("price", data.price);
        if (data.maintenanceCharges) formData.append("maintenance_charges", data.maintenanceCharges);
        if (data.bookingAmount) formData.append("booking_amount", data.bookingAmount);
        
        // Amenities
        formData.append("amenities", JSON.stringify(amenities));
        
        // Nearby Facilities with distances
        const nearbyFacilitiesDict: Record<string, string> = {};
        nearbyFacilities.forEach(facility => {
          const distance = facilityDistances[facility] || "";
          if (distance && !isNaN(parseFloat(distance))) {
            nearbyFacilitiesDict[facility] = parseFloat(distance).toString();
          }
        });
        formData.append("nearby_facilities", JSON.stringify(nearbyFacilitiesDict));
        
        // Contact Information
        formData.append("use_vendor_info", (data.contactType === "user").toString());
        formData.append("contact_name", data.contact_person);
        formData.append("contact_mobile", data.contact_number);
        if (data.whatsappNumber) formData.append("contact_whatsapp", data.whatsappNumber);
        formData.append("contact_email", data.email);
        if (data.preferredTime) formData.append("contact_preferred_time", data.preferredTime);
        
        // Images
        if (data.main_image) formData.append("main_image", data.main_image);
        if (data.thumbnail_image) formData.append("thumbnail_image", data.thumbnail_image);
        if (additionalImageFiles.length > 0) {
          additionalImageFiles.forEach((img: File) => formData.append("additional_images", img));
        }
        
        // Set status to pending
        formData.append("status", "pending");

        if (isEditMode) {
          await DynamicServiceApi.updateService(serviceType, parseInt(id!), formData);
        } else {
          await DynamicServiceApi.createService(serviceType, formData);
        }
      } else {
        // General service fields
        formData.append("service_name", data.service_name);
        formData.append("short_description", data.short_description);
        formData.append("full_description", data.full_description);
        formData.append("price", data.price);
        if (data.offer_price) formData.append("offer_price", data.offer_price);
        formData.append("gst_percentage", data.gst_percentage);
        formData.append("contact_person", data.contact_person);
        formData.append("contact_number", data.contact_number);
        formData.append("email", data.email);
        formData.append("address", data.address);
        formData.append("city", data.city);
        formData.append("state", data.state);
        formData.append("pincode", data.pincode);
        if (data.landmark) formData.append("landmark", data.landmark);
        if (data.video_url) formData.append("video_url", data.video_url);
        if (data.batch_timings) formData.append("batch_timings", data.batch_timings);
        formData.append("terms_conditions", data.terms_conditions);
        if (data.image) formData.append("image", data.image);

        // Education specific fields
        if (isEducation) {
          formData.append("education_type", data.education_type);
          formData.append("subjects_courses", data.subjects_courses);
          formData.append("mode_of_class", data.mode_of_class);
          formData.append("class_duration", data.class_duration);
          if (data.faculty_details) formData.append("faculty_details", data.faculty_details);
          if (data.facilities) formData.append("facilities", data.facilities);
          if (data.eligibility_criteria) formData.append("eligibility_criteria", data.eligibility_criteria);
        }

        if (isEditMode) {
          await DynamicServiceApi.updateService(serviceType, parseInt(id!), formData);
        } else {
          await DynamicServiceApi.createService(serviceType, formData);
        }
      }

      toastsuccessmsg(isEditMode ? "Service updated successfully!" : "Service added successfully!");
      navigate(`/services/${serviceType}`);
    } catch (error: any) {
      toasterrormsg(error.message || "Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  const getServiceDisplayName = () => {
    const displayMap: Record<string, string> = {
      'real_estate': 'Real Estate',
      'gym': 'Gym & Fitness',
      'salon': 'Salon & Beauty',
      'travel_agency': 'Travel Agency',
      'finance': 'Finance',
      'tech_industry': 'Technology Services',
      'hotel': 'Hotel',
      'healthcare': 'Healthcare',
      'education': 'Education',
      'professional': 'Professional Services',
      'workplace': 'Work Place',
    };
    return displayMap[serviceType || ""] || "Service";
  };

  return (
    <Page>
      <div className="mx-4 my-6 space-y-6 md:mx-6 lg:mx-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">
              {isEditMode ? 'Edit' : 'Add'} {getServiceDisplayName()} Service
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
              {isEditMode ? 'Update service details' : 'Fill in the details to add a new service'}
            </p>
          </div>
          <Button
            variant="outlined"
            onClick={() => navigate(`/services/${serviceType}`)}
            className="gap-2"
          >
            <ArrowLeftIcon className="size-4.5" />
            Back
          </Button>
        </div>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {isHotel ? (
              // Hotel Service Form
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Combobox
                      label="Hotel Category"
                      data={subcategories.map(s => ({ label: s.subcategory_name, value: s.id, id: s.id }))}
                      displayField="subcategory_name"
                      placeholder="Select Hotel Category"
                      value={subcategories.find(s => s.id === (watch as any)("subcategory")) || null}
                      onChange={(value: Subcategory | null) => (setValue as any)("subcategory", value?.id || "")}
                      error={errors.subcategory?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Hotel Name"
                      {...register("hotel_name")}
                      placeholder="Enter hotel name"
                      error={errors.hotel_name?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      {...register("address")}
                      placeholder="Enter complete address with street, area, pincode"
                      error={errors.address?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Country"
                      {...register("country")}
                      placeholder="Enter country"
                      error={errors.country?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="State"
                      {...register("state")}
                      placeholder="Enter state"
                      error={errors.state?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="City"
                      {...register("city")}
                      placeholder="Enter city"
                      error={errors.city?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Google Maps Location"
                      {...register("location")}
                      placeholder="https://maps.google.com/..."
                      error={errors.location?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Contact Number"
                      {...register("contact_no")}
                      placeholder="9876543210"
                      maxLength={10}
                      error={errors.contact_no?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="WhatsApp Number"
                      {...register("whatsapp_no")}
                      placeholder="9876543210"
                      maxLength={10}
                      error={errors.whatsapp_no?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Email ID"
                      {...register("gmail_id")}
                      placeholder="hotel@gmail.com"
                      error={errors.gmail_id?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Hotel Rating"
                      {...register("hotel_rating")}
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      placeholder="0.0 - 5.0"
                      error={errors.hotel_rating?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <TextEditor
                      placeholder="Describe your hotel, amenities, services, location advantages, etc."
                      onChange={(delta) => {
                        const text = delta.ops?.map((op: any) => op.insert || '').join('') || '';
                        setValue("description", text);
                      }}
                      error={errors.description?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Combobox
                      label="Room Category"
                      data={[
                        { label: "Manual", value: "manual" },
                        { label: "Premium", value: "premium" }
                      ]}
                      placeholder="Select Room Category"
                      value={(watch as any)("room_category") ? { label: (watch as any)("room_category"), value: (watch as any)("room_category") } : null}
                      onChange={(value: any) => (setValue as any)("room_category", value?.value || "")}
                      error={errors.room_category?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-dark-200">
                        Room Types
                      </label>
                      <Button
                        type="button"
                        variant="outlined"
                        size="sm"
                        onClick={addRoomType}
                        className="gap-2"
                      >
                        <PlusIcon className="size-4" />
                        Add Room Type
                      </Button>
                    </div>
                    <div className="border border-gray-200 dark:border-dark-500 rounded-lg p-4 space-y-3">
                      {roomTypes.map((room, index) => (
                        <div key={index} className="flex gap-3 items-center">
                          <Input
                            placeholder="Room Type"
                            value={room.room_type}
                            onChange={(e) => updateRoomType(index, "room_type", e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Person"
                            value={room.person}
                            onChange={(e) => updateRoomType(index, "person", e.target.value)}
                            className="w-28"
                          />
                          <Input
                            placeholder="Rate"
                            value={room.rate}
                            onChange={(e) => updateRoomType(index, "rate", e.target.value)}
                            className="w-28"
                          />
                          {roomTypes.length > 1 && (
                            <Button
                              type="button"
                              variant="outlined"
                              color="error"
                              isIcon
                              onClick={() => removeRoomType(index)}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Dropzone
                      label="Main Image"
                      description="Upload the main hotel image (max 5MB)"
                      maxFiles={1}
                      onFilesChange={(files) => {
                        if (files.length > 0) {
                          setMainImageFile(files[0]);
                          setValue("main_image", files[0]);
                          const reader = new FileReader();
                          reader.onloadend = () => setMainImagePreview(reader.result as string);
                          reader.readAsDataURL(files[0]);
                        }
                      }}
                    />
                    {mainImagePreview && (
                      <div className="mt-3">
                        <img src={mainImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                      </div>
                    )}
                  </div>

                  <div>
                    <Dropzone
                      label="Multiple Images"
                      description="Upload additional hotel images (max 5MB each)"
                      onFilesChange={(files) => {
                        setMultiImageFiles(files);
                        setValue("multi_images", files);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onloadend = () => setMultiImagesPreviews(prev => [...prev, reader.result as string]);
                          reader.readAsDataURL(file);
                        });
                      }}
                    />
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {multiImagesPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img src={preview} alt={`Preview ${index}`} className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                          <button
                            type="button"
                            onClick={() => {
                              const newPreviews = multiImagesPreviews.filter((_, i) => i !== index);
                              setMultiImagesPreviews(newPreviews);
                              const newFiles = multiImageFiles.filter((_, i) => i !== index);
                              setMultiImageFiles(newFiles);
                              setValue("multi_images", newFiles);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <XMarkIcon className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : isRealEstate ? (
              // Real Estate Service Form with Tabs
              <div className="space-y-6">
                <WithIcon
                  tabs={[
                    {
                      id: "property",
                      title: "Property Info",
                      icon: HomeIcon,
                      content: (
                        <div className="space-y-6 pt-4">
                          {/* Property Images */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <Dropzone
                                label="Main Image"
                                description="Upload main property image (max 5MB)"
                                maxFiles={1}
                                onFilesChange={(files) => {
                                  if (files.length > 0) {
                                    setMainImageFile(files[0]);
                                    setValue("main_image", files[0]);
                                    const reader = new FileReader();
                                    reader.onloadend = () => setMainImagePreview(reader.result as string);
                                    reader.readAsDataURL(files[0]);
                                  }
                                }}
                              />
                              {mainImagePreview && (
                                <div className="mt-3">
                                  <img src={mainImagePreview} alt="Main Preview" className="h-32 w-full object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                                </div>
                              )}
                            </div>

                            <div>
                              <Dropzone
                                label="Thumbnail Image"
                                description="Upload thumbnail image (max 5MB)"
                                maxFiles={1}
                                onFilesChange={(files) => {
                                  if (files.length > 0) {
                                    setThumbnailImageFile(files[0]);
                                    setValue("thumbnail_image", files[0]);
                                    const reader = new FileReader();
                                    reader.onloadend = () => setThumbnailImagePreview(reader.result as string);
                                    reader.readAsDataURL(files[0]);
                                  }
                                }}
                              />
                              {thumbnailImagePreview && (
                                <div className="mt-3">
                                  <img src={thumbnailImagePreview} alt="Thumbnail Preview" className="h-32 w-full object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                                </div>
                              )}
                            </div>

                            <div>
                              <Dropzone
                                label="Additional Images"
                                description="Upload additional property images"
                                onFilesChange={handleAdditionalImages}
                              />
                              <div className="mt-3 flex gap-2 flex-wrap">
                                {additionalImagesPreviews.map((preview, index) => (
                                  <div key={index} className="relative">
                                    <img src={preview} alt={`Additional ${index}`} className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newPreviews = additionalImagesPreviews.filter((_, i) => i !== index);
                                        setAdditionalImagesPreviews(newPreviews);
                                        const newFiles = additionalImageFiles.filter((_, i) => i !== index);
                                        setAdditionalImageFiles(newFiles);
                                        setValue("additional_images", newFiles);
                                      }}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                    >
                                      <XMarkIcon className="size-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Basic Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                              <Combobox
                                label="Property Type"
                                data={subcategories.map(s => ({ label: s.subcategory_name, value: s.id, id: s.id }))}
                                displayField="subcategory_name"
                                placeholder="Select Property Type"
                                value={subcategories.find(s => s.id === (watch as any)("subcategory")) || null}
                                onChange={(value: Subcategory | null) => (setValue as any)("subcategory", value?.id || "")}
                                error={errors.subcategory?.message as string}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Input
                                label="Property Title"
                                {...register("propertyTitle")}
                                placeholder="Enter property title"
                                error={errors.propertyTitle?.message as string}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                                Description <span className="text-red-500">*</span>
                              </label>
                              <TextEditor
                                placeholder="Describe your property, amenities, location advantages, etc."
                                onChange={(delta) => {
                                  const text = delta.ops?.map((op: any) => op.insert || '').join('') || '';
                                  setValue("description", text);
                                }}
                                error={errors.description?.message as string}
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Transaction Type"
                                data={[
                                  { label: "For Sale", value: "sale" },
                                  { label: "For Rent", value: "rent" },
                                  { label: "For Lease", value: "lease" }
                                ]}
                                placeholder="Select Transaction Type"
                                value={(watch as any)("transactionType") ? { label: (watch as any)("transactionType"), value: (watch as any)("transactionType") } : null}
                                onChange={(value: any) => (setValue as any)("transactionType", value?.value || "")}
                                error={errors.transactionType?.message as string}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Input
                                label="Address"
                                {...register("address")}
                                placeholder="Enter complete address"
                                error={errors.address?.message as string}
                              />
                            </div>

                            <div>
                              <Input
                                label="City"
                                {...register("city")}
                                placeholder="Enter city"
                                error={errors.city?.message as string}
                              />
                            </div>

                            <div>
                              <Input
                                label="State"
                                {...register("state")}
                                placeholder="Enter state"
                                error={errors.state?.message as string}
                              />
                            </div>

                            <div>
                              <Input
                                label="Pincode"
                                {...register("pincode")}
                                placeholder="Enter 6-digit pincode"
                                maxLength={6}
                                error={errors.pincode?.message as string}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                                Google Maps Location
                              </label>
                              <Card className="p-4 border border-gray-200 dark:border-dark-500">
                                <div className="space-y-4">
                                  <Input
                                    {...register("googleMapPin")}
                                    placeholder="Click 'Use Current Location' to auto-fill"
                                    readOnly
                                    error={errors.googleMapPin?.message as string}
                                    className="bg-gray-50 dark:bg-dark-600"
                                  />
                                  
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outlined"
                                      size="sm"
                                      onClick={getCurrentLocation}
                                      className="gap-2"
                                    >
                                      <MapPinIcon className="size-4" />
                                      Use Current Location
                                    </Button>
                                    {capturedLocation.lat && capturedLocation.lng && (
                                      <Button
                                        type="button"
                                        variant="outlined"
                                        size="sm"
                                        color="error"
                                        onClick={clearCapturedLocation}
                                      >
                                        Clear Location
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {capturedLocation.lat && capturedLocation.lng && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                      <div className="flex items-start gap-3">
                                        <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                                          <MapPinIcon className="size-4 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-green-800 dark:text-green-200">Location Captured Successfully</p>
                                          <div className="mt-1 text-xs text-green-600 dark:text-green-400 space-y-1">
                                            <p>Latitude: <span className="font-mono">{capturedLocation.lat.toFixed(6)}</span></p>
                                            <p>Longitude: <span className="font-mono">{capturedLocation.lng.toFixed(6)}</span></p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {!capturedLocation.lat && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                      <div className="flex items-start gap-3">
                                        <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
                                          <MapPinIcon className="size-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Location Not Captured</p>
                                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                                            Click "Use Current Location" to automatically capture your current coordinates
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            </div>
                          </div>
                        </div>
                      )
                    },
                    {
                      id: "specifications",
                      title: "Specifications",
                      icon: Cog6ToothIcon,
                      content: (
                        <div className="space-y-6 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                              <Input
                                label="Total Area Size (SqFt)"
                                {...register("totalAreaSize")}
                                placeholder="Enter total area"
                                error={errors.totalAreaSize?.message as string}
                              />
                            </div>

                            <div>
                              <Input
                                label="Carpet Area (SqFt)"
                                {...register("carpetArea")}
                                placeholder="Enter carpet area"
                                error={errors.carpetArea?.message as string}
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Bedrooms (BHK)"
                                data={[
                                  { label: "1 BHK", value: "1" },
                                  { label: "2 BHK", value: "2" },
                                  { label: "3 BHK", value: "3" },
                                  { label: "4 BHK", value: "4" },
                                  { label: "4+ BHK", value: "5" }
                                ]}
                                placeholder="Select bedrooms"
                                value={(watch as any)("bedrooms") ? { label: `${(watch as any)("bedrooms")} BHK`, value: (watch as any)("bedrooms") } : null}
                                onChange={(value: any) => (setValue as any)("bedrooms", value?.value || "")}
                                error={errors.bedrooms?.message as string}
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Bathrooms"
                                data={[
                                  { label: "1", value: "1" },
                                  { label: "2", value: "2" },
                                  { label: "3", value: "3" },
                                  { label: "4", value: "4" },
                                  { label: "4+", value: "5" }
                                ]}
                                placeholder="Select bathrooms"
                                value={(watch as any)("bathrooms") ? { label: (watch as any)("bathrooms"), value: (watch as any)("bathrooms") } : null}
                                onChange={(value: any) => (setValue as any)("bathrooms", value?.value || "")}
                                error={errors.bathrooms?.message as string}
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Balconies"
                                data={[
                                  { label: "1", value: "1" },
                                  { label: "2", value: "2" },
                                  { label: "3", value: "3" },
                                  { label: "4", value: "4" }
                                ]}
                                placeholder="Select balconies"
                                value={(watch as any)("balconies") ? { label: (watch as any)("balconies"), value: (watch as any)("balconies") } : null}
                                onChange={(value: any) => (setValue as any)("balconies", value?.value || "")}
                                error={errors.balconies?.message as string}
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Furnishing Status"
                                data={[
                                  { label: "Fully Furnished", value: "fully_furnished" },
                                  { label: "Semi Furnished", value: "semi_furnished" },
                                  { label: "Unfurnished", value: "unfurnished" }
                                ]}
                                placeholder="Select furnishing status"
                                value={(watch as any)("furnishingStatus") ? { label: (watch as any)("furnishingStatus").replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), value: (watch as any)("furnishingStatus") } : null}
                                onChange={(value: any) => (setValue as any)("furnishingStatus", value?.value || "")}
                                error={errors.furnishingStatus?.message as string}
                              />
                            </div>

                            <div>
                              <Input
                                label="Floor Number"
                                {...register("floorNumber")}
                                placeholder="Enter floor number"
                                error={errors.floorNumber?.message as string}
                              />
                            </div>

                            <div>
                              <Input
                                label="Total Floors"
                                {...register("totalFloors")}
                                placeholder="Enter total floors"
                                error={errors.totalFloors?.message as string}
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Facing Direction"
                                data={[
                                  { label: "East", value: "east" },
                                  { label: "West", value: "west" },
                                  { label: "North", value: "north" },
                                  { label: "South", value: "south" },
                                  { label: "North-East", value: "north_east" },
                                  { label: "North-West", value: "north_west" },
                                  { label: "South-East", value: "south_east" },
                                  { label: "South-West", value: "south_west" }
                                ]}
                                placeholder="Select facing direction"
                                value={(watch as any)("facingDirection") ? { label: (watch as any)("facingDirection").replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), value: (watch as any)("facingDirection") } : null}
                                onChange={(value: any) => (setValue as any)("facingDirection", value?.value || "")}
                                error={errors.facingDirection?.message as string}
                              />
                            </div>

                            <div>
                              <Input
                                label="Property Age"
                                {...register("propertyAge")}
                                placeholder="e.g., 5 years or 2018"
                                error={errors.propertyAge?.message as string}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    },
                    {
                      id: "legal",
                      title: "Legal & Info",
                      icon: Cog6ToothIcon,
                      content: (
                        <div className="space-y-6 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                                Ownership Type <span className="text-red-500">*</span>
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                  { label: "Freehold", value: "freehold" },
                                  { label: "Leasehold", value: "leasehold" },
                                  { label: "Co-operative", value: "cooperative" }
                                ].map((type) => (
                                  <label
                                    key={type.value}
                                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${(watch as any)("ownershipType") === type.value
                                      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                                      : "border-gray-300 dark:border-dark-500 hover:border-primary-400"
                                      }`}
                                  >
                                    <input
                                      type="radio"
                                      {...register("ownershipType")}
                                      value={type.value}
                                      className="w-5 h-5 text-primary-600"
                                    />
                                    <span className="font-medium">{type.label}</span>
                                  </label>
                                ))}
                              </div>
                              {errors.ownershipType && (
                                <p className="text-red-500 text-xs mt-1">{errors.ownershipType.message as string}</p>
                              )}
                            </div>

                            <div>
                              <Input
                                label="Encumbrance Certificate"
                                {...register("encumbranceCertificate")}
                                placeholder="Enter certificate details"
                              />
                            </div>

                            <div>
                              <Input
                                label="REA Number"
                                {...register("reaNumber")}
                                placeholder="Enter REA number"
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Loan Availability"
                                data={[
                                  { label: "Yes", value: "Yes" },
                                  { label: "No", value: "No" }
                                ]}
                                placeholder="Select option"
                                value={(watch as any)("loanAvailability") ? { label: (watch as any)("loanAvailability"), value: (watch as any)("loanAvailability") } : null}
                                onChange={(value: any) => (setValue as any)("loanAvailability", value?.value || "")}
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Documents Available"
                                data={[
                                  { label: "All", value: "All" },
                                  { label: "Partial", value: "Partial" },
                                  { label: "None", value: "None" }
                                ]}
                                placeholder="Select option"
                                value={(watch as any)("documentsAvailable") ? { label: (watch as any)("documentsAvailable"), value: (watch as any)("documentsAvailable") } : null}
                                onChange={(value: any) => (setValue as any)("documentsAvailable", value?.value || "")}
                              />
                            </div>

                            <div>
                              <Combobox
                                label="Negotiable"
                                data={[
                                  { label: "Yes", value: "Yes" },
                                  { label: "No", value: "No" }
                                ]}
                                placeholder="Select option"
                                value={(watch as any)("negotiable") ? { label: (watch as any)("negotiable"), value: (watch as any)("negotiable") } : null}
                                onChange={(value: any) => (setValue as any)("negotiable", value?.value || "")}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    },
                    {
                      id: "price",
                      title: "Price & Contact",
                      icon: CurrencyDollarIcon,
                      content: (
                        <div className="space-y-6 pt-4">
                          {/* Price Information */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4">Price Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div>
                                <Input
                                  label="Price"
                                  {...register("price")}
                                  placeholder="Enter price"
                                  prefix="₹"
                                  error={errors.price?.message as string}
                                />
                              </div>

                              <div>
                                <Input
                                  label="Maintenance Charges"
                                  {...register("maintenanceCharges")}
                                  placeholder="Enter maintenance charges"
                                  prefix="₹"
                                />
                              </div>

                              <div>
                                <Input
                                  label="Booking Amount"
                                  {...register("bookingAmount")}
                                  placeholder="Enter booking amount"
                                  prefix="₹"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Amenities */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4">Amenities</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {[
                                "Reserved Parking",
                                "Security / Guard",
                                "Garden / Park",
                                "Power Backup",
                                "CCTV",
                                "Clubhouse / Gym / Swimming Pool",
                                "Lift",
                                "Water Supply (24x7)",
                                "Gated Community"
                              ].map((amenity) => (
                                <label
                                  key={amenity}
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${amenities.includes(amenity)
                                    ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                                    : "border-gray-300 dark:border-dark-500 hover:border-primary-400"
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={amenities.includes(amenity)}
                                    onChange={() => toggleAmenity(amenity)}
                                    className="w-5 h-5 text-primary-600 rounded"
                                  />
                                  <span className="text-sm">{amenity}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Nearby Facilities */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4">Nearby Facilities</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[
                                "Schools / Colleges",
                                "Railway Station / Bus Stop",
                                "Hospitals",
                                "Temples / Parks",
                                "Markets / Shopping Malls"
                              ].map((facility) => (
                                <div
                                  key={facility}
                                  className={`p-4 rounded-lg border transition-all ${nearbyFacilities.includes(facility)
                                    ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                                    : "border-gray-300 dark:border-dark-500 hover:border-green-100"
                                    }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                      <input
                                        type="checkbox"
                                        checked={nearbyFacilities.includes(facility)}
                                        onChange={() => toggleNearbyFacility(facility)}
                                        className="w-5 h-5 text-green-600 rounded"
                                      />
                                      <span className="font-medium text-gray-700 dark:text-dark-200">{facility}</span>
                                    </label>
                                  </div>

                                  {nearbyFacilities.includes(facility) && (
                                    <div className="mt-3 pl-8">
                                      <Input
                                        label="Distance (in kilometers)"
                                        placeholder="e.g., 2.5"
                                        value={facilityDistances[facility] || ""}
                                        onChange={(e) => updateFacilityDistance(facility, e.target.value)}
                                        suffix="km"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div className="border-t border-gray-200 dark:border-dark-500 pt-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4">Contact Information</h3>
                            
                            <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                                Choose type of contact information
                              </label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    {...register("contactType")}
                                    value="user"
                                    className="w-4 h-4 text-primary-600"
                                  />
                                  <span>Your current user information</span>
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    {...register("contactType")}
                                    value="other"
                                    className="w-4 h-4 text-primary-600"
                                  />
                                  <span>Other contact</span>
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <Input
                                  label="Contact Person"
                                  {...register("contact_person")}
                                  placeholder="Enter contact person name"
                                  disabled={(watch as any)("contactType") === "user"}
                                  error={errors.contact_person?.message as string}
                                />
                              </div>

                              <div>
                                <Input
                                  label="Contact Number"
                                  {...register("contact_number")}
                                  placeholder="Enter contact number"
                                  maxLength={10}
                                  disabled={(watch as any)("contactType") === "user"}
                                  error={errors.contact_number?.message as string}
                                />
                              </div>

                              <div>
                                <Input
                                  label="WhatsApp Number"
                                  {...register("whatsappNumber")}
                                  placeholder="Enter WhatsApp number"
                                  maxLength={10}
                                  disabled={(watch as any)("contactType") === "user"}
                                />
                              </div>

                              <div>
                                <Input
                                  label="Email"
                                  {...register("email")}
                                  placeholder="Enter email"
                                  type="email"
                                  disabled={(watch as any)("contactType") === "user"}
                                  error={errors.email?.message as string}
                                />
                              </div>

                              <div className="md:col-span-2">
                                <Input
                                  label="Preferred Time to Contact"
                                  {...register("preferredTime")}
                                  placeholder="e.g., 10 AM - 6 PM"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            ) : isGym ? (
              // Gym Service Form
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Combobox
                      label="Gym Category"
                      data={subcategories.map(s => ({ label: s.subcategory_name, value: s.id, id: s.id }))}
                      displayField="subcategory_name"
                      placeholder="Select Gym Category"
                      value={subcategories.find(s => s.id === (watch as any)("subcategory")) || null}
                      onChange={(value: Subcategory | null) => (setValue as any)("subcategory", value?.id || "")}
                      error={errors.subcategory?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Business Name"
                      {...register("business_name")}
                      placeholder="Enter gym business name"
                      error={errors.business_name?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      {...register("address")}
                      placeholder="Enter complete address with street, area, pincode"
                      error={errors.address?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Google Maps Location"
                      {...register("location")}
                      placeholder="Enter Google Maps URL"
                      error={errors.location?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Country"
                      {...register("country")}
                      placeholder="Enter country"
                      error={errors.country?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="State"
                      {...register("state")}
                      placeholder="Enter state"
                      error={errors.state?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="City"
                      {...register("city")}
                      placeholder="Enter city"
                      error={errors.city?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Contact Number"
                      {...register("contact_no")}
                      placeholder="Enter 10-digit contact number"
                      error={errors.contact_no?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="WhatsApp Number"
                      {...register("whatsapp_no")}
                      placeholder="Enter WhatsApp number (optional)"
                      error={errors.whatsapp_no?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Email"
                      {...register("gmail_id")}
                      placeholder="Enter email address"
                      error={errors.gmail_id?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Opening Time"
                      {...register("open_time")}
                      placeholder="e.g., 6:00 AM"
                      error={errors.open_time?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Closing Time"
                      {...register("close_time")}
                      placeholder="e.g., 10:00 PM"
                      error={errors.close_time?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                      Services / Packages
                    </label>
                    <div className="border border-gray-200 dark:border-dark-500 rounded-lg p-4 space-y-3">
                      {gymServices.map((service, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          <div className="md:col-span-3">
                            <Input
                              placeholder="Service name"
                              value={service.name}
                              onChange={(e) => {
                                const newServices = [...gymServices];
                                newServices[index].name = e.target.value;
                                setGymServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-5">
                            <Input
                              placeholder="Description"
                              value={service.description}
                              onChange={(e) => {
                                const newServices = [...gymServices];
                                newServices[index].description = e.target.value;
                                setGymServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              placeholder="Price (₹)"
                              type="number"
                              value={service.price}
                              onChange={(e) => {
                                const newServices = [...gymServices];
                                newServices[index].price = Number(e.target.value);
                                setGymServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-2">
                            {gymServices.length > 1 && (
                              <Button
                                type="button"
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                  const newServices = gymServices.filter((_, i) => i !== index);
                                  setGymServices(newServices);
                                }}
                                className="w-full"
                              >
                                <TrashIcon className="size-4" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setGymServices([...gymServices, { name: "", description: "", price: 0 }])}
                        className="gap-2"
                      >
                        <PlusIcon className="size-4" />
                        Add Service
                      </Button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                      Description
                    </label>
                    <textarea
                      {...register("description")}
                      placeholder="Enter detailed description about your gym (min 50 characters)"
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-dark-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-colors"
                    />
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1">{errors.description.message as string}</p>
                    )}
                  </div>

                  <div>
                    <Dropzone
                      label="Main Image"
                      description="Upload the main gym image (max 5MB)"
                      maxFiles={1}
                      onFilesChange={(files) => {
                        if (files.length > 0) {
                          setMainImageFile(files[0]);
                          setValue("main_image", files[0]);
                          const reader = new FileReader();
                          reader.onloadend = () => setMainImagePreview(reader.result as string);
                          reader.readAsDataURL(files[0]);
                        }
                      }}
                    />
                    {mainImagePreview && (
                      <div className="mt-3">
                        <img src={mainImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                      </div>
                    )}
                  </div>

                  <div>
                    <Dropzone
                      label="Second Image"
                      description="Upload second gym image (max 5MB)"
                      maxFiles={1}
                      onFilesChange={(files) => {
                        if (files.length > 0) {
                          setSecondImageFile(files[0]);
                          setValue("second_image", files[0]);
                          const reader = new FileReader();
                          reader.onloadend = () => setSecondImagePreview(reader.result as string);
                          reader.readAsDataURL(files[0]);
                        }
                      }}
                    />
                    {secondImagePreview && (
                      <div className="mt-3">
                        <img src={secondImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Dropzone
                      label="Multiple Images"
                      description="Upload additional gym images (max 5MB each)"
                      onFilesChange={(files) => {
                        setMultiImageFiles(files);
                        setValue("multi_images", files);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onloadend = () => setMultiImagesPreviews(prev => [...prev, reader.result as string]);
                          reader.readAsDataURL(file);
                        });
                      }}
                    />
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {multiImagesPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img src={preview} alt={`Preview ${index}`} className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                          <button
                            type="button"
                            onClick={() => {
                              const newPreviews = multiImagesPreviews.filter((_, i) => i !== index);
                              setMultiImagesPreviews(newPreviews);
                              const newFiles = multiImageFiles.filter((_, i) => i !== index);
                              setMultiImageFiles(newFiles);
                              setValue("multi_images", newFiles);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <XMarkIcon className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : isSalon ? (
              // Salon Service Form
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Combobox
                      label="Salon Category"
                      data={subcategories.map(s => ({ label: s.subcategory_name, value: s.id, id: s.id }))}
                      displayField="subcategory_name"
                      placeholder="Select Salon Category"
                      value={subcategories.find(s => s.id === (watch as any)("subcategory")) || null}
                      onChange={(value: Subcategory | null) => (setValue as any)("subcategory", value?.id || "")}
                      error={errors.subcategory?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Business Name"
                      {...register("business_name")}
                      placeholder="Enter salon business name"
                      error={errors.business_name?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      {...register("address")}
                      placeholder="Enter complete address with street, area, pincode"
                      error={errors.address?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Google Maps Location"
                      {...register("location")}
                      placeholder="Enter Google Maps URL"
                      error={errors.location?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Country"
                      {...register("country")}
                      placeholder="Enter country"
                      error={errors.country?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="State"
                      {...register("state")}
                      placeholder="Enter state"
                      error={errors.state?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="City"
                      {...register("city")}
                      placeholder="Enter city"
                      error={errors.city?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Contact Number"
                      {...register("contact_no")}
                      placeholder="Enter 10-digit contact number"
                      error={errors.contact_no?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="WhatsApp Number"
                      {...register("whatsapp_no")}
                      placeholder="Enter WhatsApp number (optional)"
                      error={errors.whatsapp_no?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Email"
                      {...register("gmail_id")}
                      placeholder="Enter email address"
                      error={errors.gmail_id?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Opening Time"
                      {...register("open_time")}
                      placeholder="e.g., 9:00 AM"
                      error={errors.open_time?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Closing Time"
                      {...register("close_time")}
                      placeholder="e.g., 9:00 PM"
                      error={errors.close_time?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                      Services / Packages
                    </label>
                    <div className="border border-gray-200 dark:border-dark-500 rounded-lg p-4 space-y-3">
                      {salonServices.map((service, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          <div className="md:col-span-3">
                            <Input
                              placeholder="Service name"
                              value={service.name}
                              onChange={(e) => {
                                const newServices = [...salonServices];
                                newServices[index].name = e.target.value;
                                setSalonServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-5">
                            <Input
                              placeholder="Description"
                              value={service.description}
                              onChange={(e) => {
                                const newServices = [...salonServices];
                                newServices[index].description = e.target.value;
                                setSalonServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              placeholder="Price (₹)"
                              type="number"
                              value={service.price}
                              onChange={(e) => {
                                const newServices = [...salonServices];
                                newServices[index].price = Number(e.target.value);
                                setSalonServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-2">
                            {salonServices.length > 1 && (
                              <Button
                                type="button"
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                  const newServices = salonServices.filter((_, i) => i !== index);
                                  setSalonServices(newServices);
                                }}
                                className="w-full"
                              >
                                <TrashIcon className="size-4" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setSalonServices([...salonServices, { name: "", description: "", price: 0 }])}
                        className="gap-2"
                      >
                        <PlusIcon className="size-4" />
                        Add Service
                      </Button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                      Description
                    </label>
                    <textarea
                      {...register("description")}
                      placeholder="Enter detailed description about your salon (min 50 characters)"
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-dark-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-colors"
                    />
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1">{errors.description.message as string}</p>
                    )}
                  </div>

                  <div>
                    <Dropzone
                      label="Main Image"
                      description="Upload the main salon image (max 5MB)"
                      maxFiles={1}
                      onFilesChange={(files) => {
                        if (files.length > 0) {
                          setMainImageFile(files[0]);
                          setValue("main_image", files[0]);
                          const reader = new FileReader();
                          reader.onloadend = () => setMainImagePreview(reader.result as string);
                          reader.readAsDataURL(files[0]);
                        }
                      }}
                    />
                    {mainImagePreview && (
                      <div className="mt-3">
                        <img src={mainImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                      </div>
                    )}
                  </div>

                  <div>
                    <Dropzone
                      label="Second Image"
                      description="Upload second salon image (max 5MB)"
                      maxFiles={1}
                      onFilesChange={(files) => {
                        if (files.length > 0) {
                          setSalonSecondImageFile(files[0]);
                          setValue("second_image", files[0]);
                          const reader = new FileReader();
                          reader.onloadend = () => setSalonSecondImagePreview(reader.result as string);
                          reader.readAsDataURL(files[0]);
                        }
                      }}
                    />
                    {salonSecondImagePreview && (
                      <div className="mt-3">
                        <img src={salonSecondImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Dropzone
                      label="Multiple Images"
                      description="Upload additional salon images (max 5MB each)"
                      onFilesChange={(files) => {
                        setMultiImageFiles(files);
                        setValue("multi_images", files);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onloadend = () => setMultiImagesPreviews(prev => [...prev, reader.result as string]);
                          reader.readAsDataURL(file);
                        });
                      }}
                    />
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {multiImagesPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img src={preview} alt={`Preview ${index}`} className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                          <button
                            type="button"
                            onClick={() => {
                              const newPreviews = multiImagesPreviews.filter((_, i) => i !== index);
                              setMultiImagesPreviews(newPreviews);
                              const newFiles = multiImageFiles.filter((_, i) => i !== index);
                              setMultiImageFiles(newFiles);
                              setValue("multi_images", newFiles);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <XMarkIcon className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : isTravel || isFinance || isTech || isHealthcare || isProfessional || isWorkplace ? (
              // Common Service Form for Travel, Finance, Tech, Healthcare, Professional, Workplace
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Combobox
                      label={`${getServiceDisplayName()} Category`}
                      data={subcategories.map(s => ({ label: s.subcategory_name, value: s.id, id: s.id }))}
                      displayField="subcategory_name"
                      placeholder={`Select ${getServiceDisplayName()} Category`}
                      value={subcategories.find(s => s.id === (watch as any)("subcategory")) || null}
                      onChange={(value: Subcategory | null) => (setValue as any)("subcategory", value?.id || "")}
                      error={errors.subcategory?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Business Name"
                      {...register("business_name")}
                      placeholder={`Enter ${getServiceDisplayName().toLowerCase()} business name`}
                      error={errors.business_name?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      {...register("address")}
                      placeholder="Enter complete address with street, area, pincode"
                      error={errors.address?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Google Maps Location"
                      {...register("location")}
                      placeholder="Enter Google Maps URL"
                      error={errors.location?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Country"
                      {...register("country")}
                      placeholder="Enter country"
                      error={errors.country?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="State"
                      {...register("state")}
                      placeholder="Enter state"
                      error={errors.state?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="City"
                      {...register("city")}
                      placeholder="Enter city"
                      error={errors.city?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Contact Number"
                      {...register("contact_no")}
                      placeholder="Enter 10-digit contact number"
                      error={errors.contact_no?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="WhatsApp Number"
                      {...register("whatsapp_no")}
                      placeholder="Enter WhatsApp number (optional)"
                      error={errors.whatsapp_no?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Email"
                      {...register("gmail_id")}
                      placeholder="Enter email address"
                      error={errors.gmail_id?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Opening Time"
                      {...register("open_time")}
                      placeholder="e.g., 9:00 AM"
                      error={errors.open_time?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Closing Time"
                      {...register("close_time")}
                      placeholder="e.g., 9:00 PM"
                      error={errors.close_time?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                      Services / Packages
                    </label>
                    <div className="border border-gray-200 dark:border-dark-500 rounded-lg p-4 space-y-3">
                      {commonServices.map((service, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          <div className="md:col-span-3">
                            <Input
                              placeholder="Service name"
                              value={service.name}
                              onChange={(e) => {
                                const newServices = [...commonServices];
                                newServices[index].name = e.target.value;
                                setCommonServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-5">
                            <Input
                              placeholder="Description"
                              value={service.description}
                              onChange={(e) => {
                                const newServices = [...commonServices];
                                newServices[index].description = e.target.value;
                                setCommonServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              placeholder="Price (₹)"
                              type="number"
                              value={service.price}
                              onChange={(e) => {
                                const newServices = [...commonServices];
                                newServices[index].price = Number(e.target.value);
                                setCommonServices(newServices);
                              }}
                              className="w-full"
                            />
                          </div>
                          <div className="md:col-span-2">
                            {commonServices.length > 1 && (
                              <Button
                                type="button"
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                  const newServices = commonServices.filter((_, i) => i !== index);
                                  setCommonServices(newServices);
                                }}
                                className="w-full"
                              >
                                <TrashIcon className="size-4" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setCommonServices([...commonServices, { name: "", description: "", price: 0 }])}
                        className="gap-2"
                      >
                        <PlusIcon className="size-4" />
                        Add Service
                      </Button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                      Description
                    </label>
                    <textarea
                      {...register("description")}
                      placeholder={`Enter detailed description about your ${getServiceDisplayName().toLowerCase()} (min 50 characters)`}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-dark-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-colors"
                    />
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1">{errors.description.message as string}</p>
                    )}
                  </div>

                  <div>
                    <Dropzone
                      label="Main Image"
                      description={`Upload the main ${getServiceDisplayName().toLowerCase()} image (max 5MB)`}
                      maxFiles={1}
                      onFilesChange={(files) => {
                        if (files.length > 0) {
                          setMainImageFile(files[0]);
                          setValue("main_image", files[0]);
                          const reader = new FileReader();
                          reader.onloadend = () => setMainImagePreview(reader.result as string);
                          reader.readAsDataURL(files[0]);
                        }
                      }}
                    />
                    {mainImagePreview && (
                      <div className="mt-3">
                        <img src={mainImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                      </div>
                    )}
                  </div>

                  <div>
                    <Dropzone
                      label="Second Image"
                      description={`Upload second ${getServiceDisplayName().toLowerCase()} image (max 5MB)`}
                      maxFiles={1}
                      onFilesChange={(files) => {
                        if (files.length > 0) {
                          setCommonSecondImageFile(files[0]);
                          setValue("second_image", files[0]);
                          const reader = new FileReader();
                          reader.onloadend = () => setCommonSecondImagePreview(reader.result as string);
                          reader.readAsDataURL(files[0]);
                        }
                      }}
                    />
                    {commonSecondImagePreview && (
                      <div className="mt-3">
                        <img src={commonSecondImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Dropzone
                      label="Multiple Images"
                      description={`Upload additional ${getServiceDisplayName().toLowerCase()} images (max 5MB each)`}
                      onFilesChange={(files) => {
                        setMultiImageFiles(files);
                        setValue("multi_images", files);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onloadend = () => setMultiImagesPreviews(prev => [...prev, reader.result as string]);
                          reader.readAsDataURL(file);
                        });
                      }}
                    />
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {multiImagesPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img src={preview} alt={`Preview ${index}`} className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-dark-500" />
                          <button
                            type="button"
                            onClick={() => {
                              const newPreviews = multiImagesPreviews.filter((_, i) => i !== index);
                              setMultiImagesPreviews(newPreviews);
                              const newFiles = multiImageFiles.filter((_, i) => i !== index);
                              setMultiImageFiles(newFiles);
                              setValue("multi_images", newFiles);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <XMarkIcon className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // General Service Form
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input
                      label="Service Name"
                      {...register("service_name")}
                      placeholder="Enter service name"
                      error={errors.service_name?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Short Description"
                      {...register("short_description")}
                      placeholder="Brief description of the service"
                      error={errors.short_description?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                      Full Description <span className="text-red-500">*</span>
                    </label>
                    <TextEditor
                      placeholder="Detailed description of the service"
                      onChange={(delta) => {
                        const text = delta.ops?.map((op: any) => op.insert || '').join('') || '';
                        setValue("full_description", text);
                      }}
                      error={errors.full_description?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Price"
                      {...register("price")}
                      type="number"
                      placeholder="Enter price"
                      error={errors.price?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Offer Price"
                      {...register("offer_price")}
                      type="number"
                      placeholder="Enter offer price"
                    />
                  </div>

                  <div>
                    <Input
                      label="GST Percentage"
                      {...register("gst_percentage")}
                      placeholder="Enter GST percentage"
                      error={errors.gst_percentage?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Contact Person"
                      {...register("contact_person")}
                      placeholder="Enter contact person name"
                      error={errors.contact_person?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Contact Number"
                      {...register("contact_number")}
                      placeholder="9876543210"
                      maxLength={10}
                      error={errors.contact_number?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Email"
                      {...register("email")}
                      type="email"
                      placeholder="Enter email"
                      error={errors.email?.message as string}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      {...register("address")}
                      placeholder="Enter complete address"
                      error={errors.address?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="City"
                      {...register("city")}
                      placeholder="Enter city"
                      error={errors.city?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="State"
                      {...register("state")}
                      placeholder="Enter state"
                      error={errors.state?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Pincode"
                      {...register("pincode")}
                      placeholder="Enter pincode"
                      error={errors.pincode?.message as string}
                    />
                  </div>

                  <div>
                    <Input
                      label="Landmark"
                      {...register("landmark")}
                      placeholder="Enter landmark"
                    />
                  </div>

                  <div>
                    <Input
                      label="Video URL"
                      {...register("video_url")}
                      placeholder="Enter video URL"
                    />
                  </div>

                  <div>
                    <Input
                      label="Batch Timings"
                      {...register("batch_timings")}
                      placeholder="Enter batch timings"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Terms & Conditions"
                      {...register("terms_conditions")}
                      placeholder="Enter terms and conditions"
                      error={errors.terms_conditions?.message as string}
                    />
                  </div>

                  {isEducation && (
                    <>
                      <div>
                        <Input
                          label="Education Type"
                          {...register("education_type")}
                          placeholder="Enter education type"
                          error={errors.education_type?.message as string}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Input
                          label="Subjects/Courses"
                          {...register("subjects_courses")}
                          placeholder="Enter subjects or courses"
                          error={errors.subjects_courses?.message as string}
                        />
                      </div>

                      <div>
                        <Combobox
                          label="Mode of Class"
                          data={[
                            { label: "Online", value: "online" },
                            { label: "Offline", value: "offline" },
                            { label: "Hybrid", value: "hybrid" }
                          ]}
                          placeholder="Select Mode of Class"
                          value={(watch as any)("mode_of_class") ? { label: (watch as any)("mode_of_class"), value: (watch as any)("mode_of_class") } : null}
                          onChange={(value: any) => (setValue as any)("mode_of_class", value?.value || "")}
                          error={(errors as any).mode_of_class?.message as string}
                        />
                      </div>

                      <div>
                        <Input
                          label="Class Duration"
                          {...register("class_duration")}
                          placeholder="Enter class duration"
                          error={errors.class_duration?.message as string}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Input
                          label="Faculty Details"
                          {...register("faculty_details")}
                          placeholder="Enter faculty details"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Input
                          label="Facilities"
                          {...register("facilities")}
                          placeholder="Enter facilities"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Input
                          label="Eligibility Criteria"
                          {...register("eligibility_criteria")}
                          placeholder="Enter eligibility criteria"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Dropzone
                      label="Service Image"
                      description="Upload the service image (max 5MB)"
                      maxFiles={1}
                      onFilesChange={(files) => {
                        if (files.length > 0) {
                          setServiceImageFile(files[0]);
                          setValue("image", files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-dark-500">
              <Button
                type="button"
                variant="outlined"
                onClick={() => navigate(`/services/${serviceType}`)}
              >
                Cancel
              </Button>
              <Button type="submit" color="primary" disabled={loading}>
                {loading ? "Saving..." : isEditMode ? "Update Service" : "Add Service"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Page>
  );
}
