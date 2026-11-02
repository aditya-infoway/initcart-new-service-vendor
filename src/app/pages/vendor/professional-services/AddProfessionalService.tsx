// src/app/pages/vendor/professional-services/AddProfessionalService.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  ArrowLeftIcon, TrashIcon, XMarkIcon, PhotoIcon,
  PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, LinkIcon,
} from "@heroicons/react/24/outline";
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
const LIST_ROUTE = "/services/professional";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// ── Types ────────────────────────────────────────────────────────────────
interface Subcategory { id: number | string; subcategory_name: string; service_category?: string; }
interface ExistingImage { id: number | string; image: string; }

// ── Validation ───────────────────────────────────────────────────────────
const validationSchema = Yup.object({
  subcategory: Yup.string().required("Service category is required"),
  business_name: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .max(100, "Business name too long")
    .required("Business name is required"),
  address: Yup.string().min(10, "Please enter full address").required("Address is required"),
  location: Yup.string().url("Please enter a valid URL").required("Google Maps location is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  contact_no: Yup.string().matches(/^[0-9]{10}$/, "Must be a valid 10-digit number").required("Contact number is required"),
  whatsapp_no: Yup.string().matches(/^[0-9]{10}$/, { message: "Must be a valid 10-digit number", excludeEmptyString: true }).nullable(),
  gmail_id: Yup.string().email("Please enter a valid email address").nullable(),
  description: Yup.string().min(50, "Description should be at least 50 characters").required("Description is required"),
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

export default function AddProfessionalServicePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
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

  // Editor state
  const [description, setDescription] = useState("");
  const [initialDescription, setInitialDescription] = useState<any>(undefined);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<any>({
    resolver: yupResolver(validationSchema as any),
    defaultValues: {
      subcategory: "", business_name: "", address: "", location: "",
      country: "", state: "", city: "",
      contact_no: "", whatsapp_no: "", gmail_id: "", description: "",
    },
  });

  const watchedSubcategory = watch("subcategory");

  // 1. Load Subcategories
  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await Get("service-subcategories/by_service/?service=Professional", {});
        const payload = res?.data ?? res;
        if (payload?.Professional) setSubcategories(payload.Professional);
        else if (Array.isArray(payload)) setSubcategories(payload);
        else if (payload && typeof payload === "object") {
          const firstKey = Object.keys(payload)[0];
          if (firstKey && Array.isArray(payload[firstKey])) setSubcategories(payload[firstKey]);
        }
      } catch (error) {
        console.error("Error fetching subcategories:", error);
        try {
          const fb: any = await Get("service-subcategories/", {});
          const payload = fb?.data ?? fb;
          if (Array.isArray(payload)) setSubcategories(payload);
          else if (payload && typeof payload === "object") {
            const all: Subcategory[] = [];
            Object.values(payload).forEach((v: any) => { if (Array.isArray(v)) all.push(...v); });
            setSubcategories(all);
          }
        } catch (fallbackError) {
          console.error("Fallback error:", fallbackError);
        }
      }
    };
    load();
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
    Get(`/professional-services/${id}/`, {})
      .then((res: any) => {
        const d = res?.data ?? res;

        setExistingMainImage(resolveImg(d.main_image ?? d.main_image_url));
        const multiImgs: ExistingImage[] = (d.multi_images || [])
          .map((img: any, i: number) => ({ id: img?.id ?? `idx-${i}`, image: resolveImg(img) || "" }))
          .filter((x: ExistingImage) => x.image);
        setExistingMultiImages(multiImgs);

        reset({
          subcategory: d.subcategory
            ? String(typeof d.subcategory === "object" ? d.subcategory.id : d.subcategory)
            : "",
          business_name: d.business_name || "",
          location: d.location || "",
          address: d.address || "",
          country: d.country || "",
          state: d.state || "",
          city: d.city || "",
          contact_no: d.contact_no || "",
          whatsapp_no: d.whatsapp_no || "",
          gmail_id: d.gmail_id || "",
          description: d.description || "",
        });

        const rawDesc: string = d.description || "";
        setDescription(rawDesc);
        // Purane CKEditor ka HTML ho to tags hata kar plain text banao, phir asli Delta object banao
        const plainDesc = new DOMParser().parseFromString(rawDesc, "text/html").body.textContent || "";
        setInitialDescription(new Delta([{ insert: plainDesc + "\n" }]));
      })
      .catch(() => {
        toasterrormsg("Failed to load service data.");
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
      formData.append("business_name", values.business_name);
      formData.append("address", values.address);
      formData.append("location", values.location);
      formData.append("country", values.country);
      formData.append("state", values.state);
      formData.append("city", values.city);
      formData.append("contact_no", values.contact_no);
      if (values.whatsapp_no) formData.append("whatsapp_no", values.whatsapp_no);
      if (values.gmail_id) formData.append("gmail_id", values.gmail_id);
      formData.append("description", description || values.description);

      // Sirf nayi file ho tabhi bhejo (edit me purani image overwrite nahi hogi)
      if (mainImageFile) formData.append("main_image", mainImageFile);
      multiImageFiles.forEach((file) => formData.append("multi_images", file));

      if (isEdit) {
        await Put(`/professional-services/${id}/`, formData, true);
        toastsuccessmsg("Professional service updated.");
      } else {
        await Post("/professional-services/", formData, true);
        toastsuccessmsg("Professional service added.");
      }
      navigate(LIST_ROUTE);
    } catch (error: any) {
      const d = error?.response?.data;
      const errMsg =
        d?.detail ||
        d?.message ||
        (d && typeof d === "object"
          ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
          : "") ||
        "Failed to save service. Please check all fields.";
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

  // Combobox
  const comboboxData = useMemo(() => {
    return subcategories.map((s) => ({
      label: s.subcategory_name,
      value: String(s.id),
      id: String(s.id),
    }));
  }, [subcategories]);

  const selectedSubcategory = useMemo(() => {
    if (!watchedSubcategory) return null;
    return comboboxData.find((item) => item.value === String(watchedSubcategory)) || null;
  }, [comboboxData, watchedSubcategory]);

  if (loadingData) {
    return (
      <Page>
        <div className="mx-4 my-6 md:mx-6 lg:mx-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
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
              {isEdit ? "Edit Professional Service" : "Add Professional Service"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">Fill in the details for your professional service business</p>
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
                <Combobox
                  label={<>Service Category <span className="text-red-500">*</span></>}
                  data={comboboxData}
                  displayField="label"
                  placeholder="Select Category"
                  value={selectedSubcategory}
                  onChange={(v: any) => setValue("subcategory", v?.value || "", { shouldValidate: true })}
                  error={errors.subcategory?.message as string}
                />
              </div>

              <Input
                label={<>Business Name <span className="text-red-500">*</span></>}
                {...register("business_name")}
                placeholder="Enter business name"
                error={errors.business_name?.message as string}
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
                <p className="text-xs text-gray-400 mt-1">Paste the Google Maps share link of your business location</p>
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
              <div className="md:col-span-2">
                <Input
                  label="Email ID"
                  type="email"
                  {...register("gmail_id")}
                  prefix={<EnvelopeIcon className="size-4.5 text-red-400" />}
                  placeholder="business@gmail.com"
                  error={errors.gmail_id?.message as string}
                />
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4 pb-2 border-b border-gray-200 dark:border-dark-500">
              Description <span className="text-red-500">*</span>
            </h2>
            <TextEditor
              placeholder="Describe your services, experience, specialties, etc."
              value={initialDescription}
              onChange={(delta: any) => {
                const text = delta?.ops?.map((op: any) => (typeof op.insert === "string" ? op.insert : "")).join("") || "";
                setDescription(text);
                setValue("description", text, { shouldValidate: true });
              }}
              error={errors.description?.message as string}
            />
            <p className="text-xs text-gray-400 mt-2">Minimum 50 characters. Describe what makes your service unique.</p>
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
                      <img src={existingMainImage} alt="Main" className="w-28 h-28 object-cover rounded-lg border-2 border-indigo-200" />
                      <span className="absolute bottom-1 left-1 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded">Main</span>
                      <button type="button" onClick={removeMainImage} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <XMarkIcon className="size-3" />
                      </button>
                    </div>
                  )}
                  {existingMultiImages.map((img, idx) => (
                    <div key={img.id} className="relative group">
                      <img src={img.image} alt={`Gallery ${idx + 1}`} className="w-28 h-28 object-cover rounded-lg border border-gray-200" />
                      <span className="absolute bottom-1 left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded">Gallery</span>
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
                <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 bg-indigo-50 dark:bg-dark-800 min-h-[200px] flex flex-col">
                  {(mainImagePreview || existingMainImage) ? (
                    <div className="flex-1 relative">
                      <img src={mainImagePreview || existingMainImage || ""} alt="Main Preview" className="w-full h-40 object-cover rounded-md" />
                      <button type="button" onClick={removeMainImage} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700">
                        <XMarkIcon className="size-4" />
                      </button>
                      <input type="file" id="main_image" className="hidden" onChange={handleMainImage} accept=".jpg,.jpeg,.png,.webp" />
                      <label htmlFor="main_image" className="mt-2 block text-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg cursor-pointer hover:bg-indigo-700">Change</label>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <PhotoIcon className="size-10 text-indigo-400 mb-2" />
                      <p className="text-sm text-indigo-600 text-center mb-1">Main Image</p>
                      <p className="text-xs text-gray-500 text-center mb-3">JPG, PNG, WEBP up to 5MB</p>
                      <input type="file" id="main_image" className="hidden" onChange={handleMainImage} accept=".jpg,.jpeg,.png,.webp" />
                      <label htmlFor="main_image" className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg cursor-pointer hover:bg-indigo-700">Upload</label>
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
              {isLoading ? "Saving..." : isEdit ? "Update Service" : "Add Service"}
            </Button>
          </Card>
        </form>
      </div>
    </Page>
  );
}