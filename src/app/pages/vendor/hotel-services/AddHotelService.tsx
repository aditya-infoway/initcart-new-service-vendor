// src/app/pages/vendor/hotel-services/AddHotelService.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  ArrowLeftIcon, PlusIcon, TrashIcon, XMarkIcon, PhotoIcon,
  PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, LinkIcon,
  StarIcon as StarOutlineIcon, TrophyIcon, CheckCircleIcon,
  SparklesIcon, HomeModernIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { CountrySelect, StateSelect, CitySelect } from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";
import Delta from "quill-delta"; // <-- TextEditor.tsx me jo Delta import hai, wahi yahan rakho

import { Page } from "@/components/shared/Page";
import { Button, Input, Card } from "@/components/ui";
import { TextEditor } from "@/components/shared/form/TextEditor";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Dropzone } from "@/components/shared/form/Dropzone";
import { Get, Post, Put, API_URL, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";

// ── Constants ────────────────────────────────────────────────────────────
const LIST_ROUTE = "/services/hotel";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// ── Types ────────────────────────────────────────────────────────────────
interface Subcategory { id: number | string; subcategory_name: string; }
interface ExistingImage { id: number | string; image: string; }
interface RoomType { id?: number; room_type: string; person: number | string; rate: number | string; }

// ── Validation ───────────────────────────────────────────────────────────
const validationSchema = Yup.object({
  subcategory: Yup.string().required("Hotel category is required"),
  hotel_name: Yup.string()
    .min(3, "Hotel name must be at least 3 characters")
    .max(100, "Hotel name too long")
    .required("Hotel name is required"),
  address: Yup.string().min(10, "Please enter full address").required("Address is required"),
  location: Yup.string().url("Please enter a valid URL").required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string().matches(/^[0-9]{10}$/, "Must be a valid 10-digit number").required("Contact number is required"),
  whatsapp_no: Yup.string().matches(/^[0-9]{10}$/, { message: "Must be a valid 10-digit number", excludeEmptyString: true }).nullable(),
  gmail_id: Yup.string().email("Please enter a valid email address").nullable(),
  hotel_rating: Yup.number()
    .transform((value, original) => (original === "" || original === null ? null : value))
    .min(0, "Rating must be between 0 and 5")
    .max(5, "Rating must be between 0 and 5")
    .nullable(),
  description: Yup.string().min(50, "Description should be at least 50 characters").required("Description is required"),
  room_category: Yup.string().required("Room category is required"),
});

// Relative (/media/...) aur absolute dono type ke image URL ko full URL me convert karta hai
const resolveImg = (img: any): string | null => {
  if (!img) return null;
  const src = typeof img === "string" ? img : img.image || img.image_url || img.url || "";
  if (!src) return null;
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  try {
    const origin = new URL(API_URL).origin;
    return `${origin}${src.startsWith("/") ? src : `/${src}`}`;
  } catch {
    return src;
  }
};

// Dropzone File / File[] / FileList / {file} kuch bhi de, sab se File[] nikal leta hai
const toFiles = (input: any): File[] => {
  const arr: any[] = Array.isArray(input)
    ? input
    : typeof FileList !== "undefined" && input instanceof FileList
      ? Array.from(input)
      : input
        ? [input]
        : [];
  return arr
    .map((f: any) => (f instanceof File ? f : f?.file instanceof File ? f.file : null))
    .filter(Boolean) as File[];
};

// Subcategories response kisi bhi shape me aaye (Hotel key / array / first key)
const extractSubcategories = (res: any): Subcategory[] => {
  const root = res?.data ?? res;
  if (Array.isArray(root)) return root;
  if (root?.Hotel) return root.Hotel;
  if (root && typeof root === "object") {
    const firstKey = Object.keys(root)[0];
    if (firstKey && Array.isArray(root[firstKey])) return root[firstKey];
  }
  return [];
};

// ── Star Rating (decimal support) — component ke bahar define kiya hai taaki re-render pe reset na ho ──
function StarRating({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  const [hover, setHover] = useState<number>(0);

  const handleStarClick = (star: number) => {
    if (Math.floor(value) === star) {
      const decimal = value % 1;
      if (decimal === 0) onChange(star + 0.5 > 5 ? 5 : star + 0.5);
      else onChange(star - 0.5);
    } else {
      onChange(star);
    }
  };

  const fillFor = (star: number) => {
    const current = hover || value || 0;
    if (current >= star) return 100;
    if (current > star - 1) return (current - (star - 1)) * 100;
    return 0;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <div className="relative size-8">
              <StarOutlineIcon className="size-8 text-gray-300 absolute inset-0" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillFor(star)}%` }}>
                <StarSolidIcon className="size-8 text-yellow-400" />
              </div>
            </div>
          </button>
        ))}
        {(hover || value) > 0 && (
          <span className="ml-2 text-sm font-semibold text-gray-600 dark:text-dark-200 min-w-[40px]">{(hover || value || 0).toFixed(1)}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">Click a star again for half rating, or enter:</span>
        <input
          type="number" min="0" max="5" step="0.1"
          value={value || 0}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0 && val <= 5) onChange(Math.round(val * 10) / 10);
          }}
          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-dark-500 dark:bg-dark-800 rounded-lg text-center outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">/ 5</span>
      </div>
    </div>
  );
}

export default function AddHotelServicePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  // Edit me API se aayi hui category (list me na mile tab bhi dropdown me value dikhe)
  const [savedSubcategory, setSavedSubcategory] = useState<Subcategory | null>(null);
  const [countryId, setCountryId] = useState<number>(0);
  const [stateId, setStateId] = useState<number>(0);

  // ── Images State (Direct Files) ──
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [multiImageFiles, setMultiImageFiles] = useState<File[]>([]);

  // ── Images Previews & Existing ──
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [multiImagesPreviews, setMultiImagesPreviews] = useState<string[]>([]);
  const [existingMainImage, setExistingMainImage] = useState<string | null>(null);
  const [existingMultiImages, setExistingMultiImages] = useState<ExistingImage[]>([]);

  // Repeater & Editor state
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([{ room_type: "", person: "", rate: "" }]);
  const [description, setDescription] = useState("");
  const [initialDescription, setInitialDescription] = useState<any>(undefined);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<any>({
    resolver: yupResolver(validationSchema as any),
    defaultValues: {
      subcategory: "", hotel_name: "", address: "", location: "",
      country: "", state: "", city: "",
      contact_no: "", whatsapp_no: "", gmail_id: "",
      hotel_rating: null, description: "", room_category: "manual",
    },
  });

  const watchedSubcategory = watch("subcategory");
  const watchedRating = watch("hotel_rating");
  const isPremium = watch("room_category") === "premium";

  // 1. Load Subcategories
  useEffect(() => {
    Get("service-subcategories/by_service/?service=Hotel", {})
      .then((res: any) => setSubcategories(extractSubcategories(res)))
      .catch((err) => console.error("Error fetching subcategories:", err));
  }, []);

  // Gallery previews: files se hi banate hain
  useEffect(() => {
    const urls = multiImageFiles.map((f) => URL.createObjectURL(f));
    setMultiImagesPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [multiImageFiles]);

  // 2. Load Existing (Edit Mode)
  useEffect(() => {
    if (!id) return;
    setLoadingData(true);
    Get(`/hotel-services/${id}/`, {})
      .then((res: any) => {
        const d = res?.data ?? res;

        setExistingMainImage(resolveImg(d.main_image ?? d.main_image_url));
        const multiImgs: ExistingImage[] = (d.multi_images || [])
          .map((img: any, i: number) => ({ id: img?.id ?? `idx-${i}`, image: resolveImg(img) || "" }))
          .filter((x: ExistingImage) => x.image);
        setExistingMultiImages(multiImgs);

        if (d.room_types?.length) setRoomTypes(d.room_types);

        const subId = d.subcategory
          ? String(typeof d.subcategory === "object" ? d.subcategory.id : d.subcategory)
          : "";
        const subName =
          d.subcategory_name ||
          (typeof d.subcategory === "object" ? d.subcategory?.subcategory_name : "") ||
          "";
        if (subId && subName) setSavedSubcategory({ id: subId, subcategory_name: subName });

        reset({
          subcategory: subId,
          hotel_name: d.hotel_name || "",
          location: d.location || "",
          address: d.address || "",
          country: d.country || "",
          state: d.state || "",
          city: d.city || "",
          contact_no: d.contact_no || "",
          whatsapp_no: d.whatsapp_no || "",
          gmail_id: d.gmail_id || "",
          hotel_rating: d.hotel_rating ? parseFloat(d.hotel_rating) : null,
          description: d.description || "",
          room_category: d.room_category || "manual",
        });

        const rawDesc: string = d.description || "";
        setDescription(rawDesc);
        // Purane CKEditor ka HTML ho to tags hata kar plain text banao, phir asli Delta object banao
        const plainDesc = new DOMParser().parseFromString(rawDesc, "text/html").body.textContent || "";
        setInitialDescription(new Delta([{ insert: plainDesc + "\n" }]));
      })
      .catch(() => {
        toasterrormsg("Failed to load hotel data.");
        navigate(LIST_ROUTE);
      })
      .finally(() => setLoadingData(false));
  }, [id, reset, navigate]);

  // 3. Submit
  const onSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("subcategory", values.subcategory);
      formData.append("hotel_name", values.hotel_name);
      formData.append("address", values.address);
      formData.append("location", values.location);
      formData.append("country", values.country);
      formData.append("state", values.state);
      formData.append("city", values.city);
      formData.append("contact_no", values.contact_no);
      if (values.whatsapp_no) formData.append("whatsapp_no", values.whatsapp_no);
      if (values.gmail_id) formData.append("gmail_id", values.gmail_id);
      if (values.hotel_rating) formData.append("hotel_rating", String(values.hotel_rating));
      formData.append("description", description || values.description);
      formData.append("room_category", values.room_category);

      // Sirf nayi file ho tabhi bhejo (edit me purani image overwrite nahi hogi)
      if (mainImageFile) formData.append("main_image", mainImageFile);
      multiImageFiles.forEach((file) => formData.append("multi_images", file));

      const validRoomTypes = roomTypes.filter((r) => String(r.room_type).trim() && r.person && r.rate);
      formData.append("room_types", JSON.stringify(validRoomTypes));

      if (isEdit) {
        await Put(`/hotel-services/${id}/`, formData, true);
        toastsuccessmsg("Hotel service updated.");
      } else {
        await Post("/hotel-services/", formData, true);
        toastsuccessmsg("Hotel service added.");
      }
      navigate(LIST_ROUTE);
    } catch (error: any) {
      const d = error?.response?.data;
      const errMsg =
        d?.detail ||
        (d && typeof d === "object"
          ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
          : "") ||
        "Failed to save hotel.";
      toasterrormsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Main image: native input (5MB limit)
  const handleMainImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        toasterrormsg("Image size should be less than 5MB");
      } else {
        setMainImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setMainImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
    e.target.value = "";
  };

  // Gallery: Dropzone se (5MB limit)
  const handleMultiImages = (input: any) => {
    const incoming = toFiles(input);
    if (incoming.length === 0) return;
    const valid = incoming.filter((f) => f.size <= MAX_IMAGE_SIZE);
    if (valid.length !== incoming.length) toasterrormsg("Some images exceed 5MB and were skipped");
    if (valid.length === 0) return;
    setMultiImageFiles((prev) => {
      const key = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;
      const seen = new Set(prev.map(key));
      const fresh = valid.filter((f) => !seen.has(key(f)));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  };

  const removeMainImage = () => { setMainImageFile(null); setMainImagePreview(null); setExistingMainImage(null); };
  const removeMultiImage = (index: number) => setMultiImageFiles((prev) => prev.filter((_, i) => i !== index));
  const removeExistingMultiImage = (index: number) => setExistingMultiImages((prev) => prev.filter((_, i) => i !== index));

  // Room types repeater
  const addRoomType = () => setRoomTypes([...roomTypes, { room_type: "", person: "", rate: "" }]);
  const removeRoomType = (index: number) => {
    if (roomTypes.length > 1) setRoomTypes(roomTypes.filter((_, i) => i !== index));
    else toasterrormsg("At least one room type is required.");
  };
  const updateRoomType = (index: number, field: keyof RoomType, value: string | number) => {
    const updated = [...roomTypes];
    updated[index] = { ...updated[index], [field]: value };
    setRoomTypes(updated);
  };

  // Combobox
  const comboboxData = useMemo(() => {
    const list = subcategories.map((s) => ({
      label: s.subcategory_name,
      value: String(s.id),
      id: String(s.id),
    }));
    // Saved category list me na mile (ya list late aaye) tab bhi value dikhe
    if (savedSubcategory && !list.some((i) => i.value === String(savedSubcategory.id))) {
      list.unshift({
        label: savedSubcategory.subcategory_name,
        value: String(savedSubcategory.id),
        id: String(savedSubcategory.id),
      });
    }
    return list;
  }, [subcategories, savedSubcategory]);

  const selectedSubcategory = useMemo(() => {
    if (!watchedSubcategory) return null;
    return comboboxData.find((item) => item.value === String(watchedSubcategory)) || null;
  }, [comboboxData, watchedSubcategory]);

  if (loadingData) {
    return (
      <Page>
        <div className="mx-4 my-6 md:mx-6 lg:mx-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mx-4 my-6 md:mx-6 lg:mx-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">
              {isEdit ? "Edit Hotel Service" : "Add Hotel Service"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">Fill in the details for your hotel business</p>
          </div>
          <Button variant="outlined" onClick={() => navigate(LIST_ROUTE)} className="gap-2">
            <ArrowLeftIcon className="size-4.5" /> Back
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-5 pb-2 border-b border-gray-200 dark:border-dark-500">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className="md:col-span-2 lg:col-span-1">
                {/* key: options aane ke baad / value set hone ke baad Combobox dubara sync ho (edit me category dikhe) */}
                <Combobox
                  key={`${comboboxData.length}-${selectedSubcategory?.value ?? "none"}`}
                  label={<>Hotel Category <span className="text-red-500">*</span></>}
                  data={comboboxData}
                  displayField="label"
                  placeholder="Select Category"
                  value={selectedSubcategory}
                  onChange={(v: any) => setValue("subcategory", v?.value || "", { shouldValidate: true })}
                  error={errors.subcategory?.message as string}
                />
                {comboboxData.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Loading categories...</p>
                )}
              </div>

              <Input
                label={<>Hotel Name <span className="text-red-500">*</span></>}
                {...register("hotel_name")}
                placeholder="Enter hotel name"
                error={errors.hotel_name?.message as string}
              />

              <div className="md:col-span-2">
                <Input
                  label={<>Address <span className="text-red-500">*</span></>}
                  {...register("address")}
                  placeholder="Enter complete address with street, area, pincode"
                  error={errors.address?.message as string}
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Country <span className="text-red-500">*</span></label>
                {isEdit && watch("country") ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-500 rounded-lg">
                      <span className="text-sm text-gray-500">Current:</span>
                      <strong className="text-gray-800 dark:text-dark-100">{watch("country")}</strong>
                      <button type="button" onClick={() => {
                        setCountryId(0); setStateId(0);
                        setValue("country", ""); setValue("state", ""); setValue("city", "");
                      }} className="ml-auto text-xs text-red-600 hover:text-red-800">Change</button>
                    </div>
                  </div>
                ) : (
                  <CountrySelect value={countryId} onChange={(selected: any) => {
                    if (selected) {
                      setValue("country", selected.name, { shouldValidate: true });
                      setCountryId(selected.id); setStateId(0);
                      setValue("state", ""); setValue("city", "");
                    }
                  }} placeHolder="Select Country" />
                )}
                {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message as string}</p>}
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">State <span className="text-red-500">*</span></label>
                {isEdit && watch("state") && countryId === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-500 rounded-lg">
                    <span className="text-sm text-gray-500">Current:</span>
                    <strong className="text-gray-800 dark:text-dark-100">{watch("state")}</strong>
                  </div>
                ) : countryId > 0 ? (
                  <StateSelect countryid={countryId} value={stateId} onChange={(selected: any) => {
                    if (selected) {
                      setValue("state", selected.name, { shouldValidate: true });
                      setStateId(selected.id); setValue("city", "");
                    }
                  }} placeHolder="Select State" />
                ) : (
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-500 rounded-lg text-gray-400 text-sm">Select country first</div>
                )}
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message as string}</p>}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">City <span className="text-red-500">*</span></label>
                {isEdit && watch("city") && stateId === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-500 rounded-lg">
                    <span className="text-sm text-gray-500">Current:</span>
                    <strong className="text-gray-800 dark:text-dark-100">{watch("city")}</strong>
                  </div>
                ) : stateId > 0 ? (
                  <CitySelect countryid={countryId} stateid={stateId} value={watch("city") || ""} onChange={(selected: any) => {
                    if (selected) setValue("city", selected.name, { shouldValidate: true });
                  }} placeHolder="Select City" />
                ) : (
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-500 rounded-lg text-gray-400 text-sm">Select state first</div>
                )}
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message as string}</p>}
              </div>

              <div className="md:col-span-2">
                <Input
                  label={<>Google Maps Location <span className="text-red-500">*</span></>}
                  {...register("location")}
                  prefix={<LinkIcon className="size-4.5 text-gray-400" />}
                  placeholder="https://maps.google.com/..."
                  error={errors.location?.message as string}
                />
                <p className="text-xs text-gray-400 mt-1">Paste the Google Maps share link of your hotel location</p>
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-5 pb-2 border-b border-gray-200 dark:border-dark-500">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label={<>Contact Number <span className="text-red-500">*</span></>}
                type="tel"
                maxLength={10}
                {...register("contact_no")}
                prefix={<PhoneIcon className="size-4.5 text-gray-400" />}
                placeholder="9876543210"
                error={errors.contact_no?.message as string}
              />
              <Input
                label="WhatsApp Number"
                type="tel"
                maxLength={10}
                {...register("whatsapp_no")}
                prefix={<ChatBubbleLeftRightIcon className="size-4.5 text-green-500" />}
                placeholder="9876543210"
                error={errors.whatsapp_no?.message as string}
              />
              <Input
                label="Email ID"
                type="email"
                {...register("gmail_id")}
                prefix={<EnvelopeIcon className="size-4.5 text-gray-400" />}
                placeholder="hotel@gmail.com"
                error={errors.gmail_id?.message as string}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Hotel Rating</label>
                <div className="p-4 bg-gray-50 dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-500">
                  <StarRating
                    value={watchedRating ? Number(watchedRating) : 0}
                    onChange={(val) => setValue("hotel_rating", val, { shouldValidate: true })}
                  />
                </div>
                {errors.hotel_rating && <p className="text-red-500 text-xs mt-1">{errors.hotel_rating.message as string}</p>}
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4 pb-2 border-b border-gray-200 dark:border-dark-500">
              Description <span className="text-red-500">*</span>
            </h2>
            <TextEditor
              placeholder="Describe your hotel, amenities, services, location advantages, etc."
              value={initialDescription}
              onChange={(delta: any) => {
                const text = delta?.ops?.map((op: any) => (typeof op.insert === "string" ? op.insert : "")).join("") || "";
                setDescription(text);
                setValue("description", text, { shouldValidate: true });
              }}
              error={errors.description?.message as string}
            />
            <p className="text-xs text-gray-400 mt-2">Minimum 50 characters. Describe what makes your hotel unique.</p>
          </Card>

          {/* Room Details — Premium select karne par luxury gold look */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-5 pb-2 border-b border-gray-200 dark:border-dark-500 flex items-center gap-2">
              Room Details
              {isPremium && <SparklesIcon className="size-5 text-amber-500" />}
            </h2>

            {/* Room Category cards */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">
                Room Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Manual */}
                <label
                  className={`relative flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    !isPremium
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 dark:border-dark-500"
                  }`}
                >
                  <input
                    type="radio" value="manual" checked={!isPremium} className="sr-only"
                    onChange={() => setValue("room_category", "manual", { shouldValidate: true })}
                  />
                  <span className={`flex size-11 items-center justify-center rounded-full ${!isPremium ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 dark:bg-dark-600"}`}>
                    <HomeModernIcon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-800 dark:text-dark-100">Manual</span>
                    <span className="block text-xs text-gray-500">Standard listing</span>
                  </span>
                  {!isPremium && <CheckCircleIcon className="absolute top-3 right-3 size-5 text-blue-600" />}
                </label>

                {/* Premium */}
                <label
                  className={`relative flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all overflow-hidden ${
                    isPremium
                      ? "border-amber-400 bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100 dark:from-amber-500/20 dark:via-yellow-500/10 dark:to-amber-500/20 shadow-md shadow-amber-200/60"
                      : "border-gray-200 hover:border-amber-300 dark:border-dark-500"
                  }`}
                >
                  <input
                    type="radio" value="premium" checked={isPremium} className="sr-only"
                    onChange={() => setValue("room_category", "premium", { shouldValidate: true })}
                  />
                  <span className={`flex size-11 items-center justify-center rounded-full ${isPremium ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow" : "bg-gray-100 text-gray-400 dark:bg-dark-600"}`}>
                    <TrophyIcon className="size-5" />
                  </span>
                  <span>
                    <span className={`block text-sm font-semibold ${isPremium ? "text-amber-800 dark:text-amber-300" : "text-gray-800 dark:text-dark-100"}`}>Premium</span>
                    <span className="block text-xs text-gray-500">Featured &amp; priority listing</span>
                  </span>
                  {isPremium && (
                    <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <SparklesIcon className="size-3" /> Featured
                    </span>
                  )}
                </label>
              </div>
              {errors.room_category && <p className="text-red-500 text-xs mt-1">{errors.room_category.message as string}</p>}
            </div>

            {/* Room Types — panel ka look category ke hisaab se badalta hai */}
            <div
              className={`rounded-xl border p-5 transition-all ${
                isPremium
                  ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:border-amber-500/40 dark:from-amber-500/10 dark:via-dark-800 dark:to-yellow-500/10 shadow-inner"
                  : "border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-800"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isPremium && <SparklesIcon className="size-4 text-amber-500" />}
                  <label className={`text-sm font-semibold ${isPremium ? "text-amber-800 dark:text-amber-300" : "text-gray-700 dark:text-dark-200"}`}>
                    {isPremium ? "Premium Room Types" : "Room Types"}
                  </label>
                </div>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={addRoomType}
                  className={`gap-2 ${isPremium ? "!border-amber-400 !text-amber-700 hover:!bg-amber-50" : ""}`}
                >
                  <PlusIcon className="size-4" /> Add Room
                </Button>
              </div>

              <div className="space-y-3">
                {roomTypes.map((room, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-lg items-start border ${
                      isPremium
                        ? "bg-white/90 dark:bg-dark-700 border-amber-200 dark:border-amber-500/30 border-l-4 border-l-amber-400 shadow-sm"
                        : "bg-gray-50 dark:bg-dark-700 border-gray-200 dark:border-dark-500"
                    }`}
                  >
                    <div className="md:col-span-5">
                      <Input placeholder="Room type (e.g., Deluxe Room)" value={room.room_type} onChange={(e) => updateRoomType(index, "room_type", e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" min={1} placeholder="Persons" value={room.person} onChange={(e) => updateRoomType(index, "person", parseInt(e.target.value) || "")} />
                    </div>
                    <div className="md:col-span-3">
                      <Input type="number" min={0} step="any" placeholder="Rate (₹)" value={room.rate} onChange={(e) => updateRoomType(index, "rate", parseFloat(e.target.value) || "")} />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="button" variant="outlined" color="error" className="w-full" onClick={() => removeRoomType(index)} disabled={roomTypes.length === 1}>
                        <TrashIcon className="size-4" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {isPremium && (
                <div className="mt-4 flex items-start gap-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 p-4 text-white shadow">
                  <TrophyIcon className="size-5 mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    <span className="font-semibold">Premium Category:</span> Your hotel will be featured with a premium badge and priority listing.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Images */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4 pb-2 border-b border-gray-200 dark:border-dark-500">Images</h2>

            {(existingMainImage || existingMultiImages.length > 0) && (
              <div className="mb-5 p-4 bg-gray-50 dark:bg-dark-800 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Current Images</h3>
                <div className="flex flex-wrap gap-4">
                  {existingMainImage && (
                    <div className="relative group">
                      <img src={existingMainImage} alt="Main" className="w-28 h-28 object-cover rounded-lg border-2 border-blue-200" />
                      <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Main</span>
                      <button type="button" onClick={removeMainImage} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <XMarkIcon className="size-3" />
                      </button>
                    </div>
                  )}
                  {existingMultiImages.map((img, idx) => (
                    <div key={img.id} className="relative group">
                      <img src={img.image} alt={`Gallery ${idx + 1}`} className="w-28 h-28 object-cover rounded-lg border border-gray-200" />
                      <span className="absolute bottom-1 left-1 bg-teal-600 text-white text-xs px-2 py-0.5 rounded">Gallery</span>
                      <button type="button" onClick={() => removeExistingMultiImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <XMarkIcon className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Main Image {!isEdit && <span className="text-red-500">*</span>}</label>
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 dark:bg-dark-800 min-h-[200px] flex flex-col">
                  {(mainImagePreview || existingMainImage) ? (
                    <div className="flex-1 relative">
                      <img src={mainImagePreview || existingMainImage || ""} alt="Main Preview" className="w-full h-40 object-cover rounded-md" />
                      <button type="button" onClick={removeMainImage} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700">
                        <XMarkIcon className="size-4" />
                      </button>
                      <input type="file" id="main_image" className="hidden" onChange={handleMainImage} accept=".jpg,.jpeg,.png,.webp" />
                      <label htmlFor="main_image" className="mt-2 block text-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg cursor-pointer hover:bg-blue-700">Change</label>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <PhotoIcon className="size-10 text-blue-400 mb-2" />
                      <p className="text-sm text-blue-600 text-center mb-1">Main Image</p>
                      <p className="text-xs text-gray-500 text-center mb-3">JPG, PNG, WEBP up to 5MB</p>
                      <input type="file" id="main_image" className="hidden" onChange={handleMainImage} accept=".jpg,.jpeg,.png,.webp" />
                      <label htmlFor="main_image" className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg cursor-pointer hover:bg-blue-700">Upload</label>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Gallery Images</label>
                <Dropzone label="" description="Upload gallery images (up to 5MB each)" onFilesChange={handleMultiImages} />
                {multiImagesPreviews.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">New gallery images ({multiImagesPreviews.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {multiImagesPreviews.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <img src={preview} alt={`New gallery ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                          <button type="button" onClick={() => removeMultiImage(idx)}
                            className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <TrashIcon className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 flex items-center justify-between">
            <Button type="button" variant="outlined" onClick={() => navigate(LIST_ROUTE)}>Cancel</Button>
            <Button type="submit" color="primary" disabled={isLoading}>
              {isLoading ? "Saving..." : isEdit ? "Update Hotel" : "Add Hotel"}
            </Button>
          </Card>
        </form>
      </div>
    </Page>
  );
}