// src/app/pages/vendor/healthcare-services/AddHealthcareService.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  ArrowLeftIcon, TrashIcon, XMarkIcon, PhotoIcon,
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

// ── Types ────────────────────────────────────────────────────────────────
interface Subcategory { id: string; subcategory_name: string; }
interface ExistingGalleryImage { id?: number | string; url: string; }

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB (old healthcare page wali limit)

// ── Validation (old healthcare page wali rules) ──────────────────────────
const validationSchema = Yup.object({
  subcategory: Yup.string().required("Service category is required"),
  businessName: Yup.string()
    .min(3, "Business name must be at least 3 characters")
    .max(100, "Business name too long")
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
  contactNo: Yup.string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact number is required"),
  whatsappNo: Yup.string()
    .matches(/^[0-9]{10}$/, { message: "Must be a valid 10-digit number", excludeEmptyString: true })
    .nullable(),
  gmailId: Yup.string().email("Please enter a valid email address").nullable(),
  description: Yup.string()
    .min(50, "Description should be at least 50 characters")
    .required("Description is required"),
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

// Subcategories response kisi bhi shape me aaye (Healthcare key / array / first key)
const extractSubcategories = (res: any): Subcategory[] => {
  const root = res?.data ?? res;
  if (Array.isArray(root)) return root;
  if (root?.Healthcare) return root.Healthcare;
  if (root && typeof root === "object") {
    const firstKey = Object.keys(root)[0];
    if (firstKey && Array.isArray(root[firstKey])) return root[firstKey];
  }
  return [];
};

export default function AddHealthcareServicePage() {
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
  const [secondImageFile, setSecondImageFile] = useState<File | null>(null);
  const [multiImageFiles, setMultiImageFiles] = useState<File[]>([]);

  // ── Images Previews & Existing ──
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [secondImagePreview, setSecondImagePreview] = useState<string | null>(null);
  const [multiImagesPreviews, setMultiImagesPreviews] = useState<string[]>([]);
  const [existingMainImage, setExistingMainImage] = useState<string | null>(null);
  const [existingSecondImage, setExistingSecondImage] = useState<string | null>(null);
  const [existingMultiImages, setExistingMultiImages] = useState<ExistingGalleryImage[]>([]);

  // Editor state
  const [description, setDescription] = useState("");
  const [initialDescription, setInitialDescription] = useState<any>(undefined);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<any>({
    resolver: yupResolver(validationSchema as any),
    defaultValues: {
      subcategory: "", businessName: "", address: "", location: "",
      country: "", state: "", city: "",
      contactNo: "", whatsappNo: "", gmailId: "", description: "",
    },
  });

  const watchedSubcategory = watch("subcategory");

  // 1. Load Subcategories
  useEffect(() => {
    Get("service-subcategories/by_service/?service=Healthcare", {})
      .then((res: any) => setSubcategories(extractSubcategories(res)))
      .catch(async (err) => {
        console.error("Error fetching subcategories:", err);
        // Fallback (old page jaisa): saari subcategories lekar flat list bana lo
        try {
          const fb: any = await Get("service-subcategories/", {});
          const root = fb?.data ?? fb;
          if (Array.isArray(root)) setSubcategories(root);
          else if (root && typeof root === "object") {
            setSubcategories(Object.values(root).flatMap((v: any) => (Array.isArray(v) ? v : [])) as Subcategory[]);
          }
        } catch (fbErr) {
          console.error("Fallback error:", fbErr);
        }
      });
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
    Get(`/healthcare-services/${id}/`, {})
      .then((res: any) => {
        const d = res?.data ?? res;

        setExistingMainImage(resolveImg(d.main_image ?? d.main_image_url));
        setExistingSecondImage(resolveImg(d.second_image ?? d.second_image_url));
        const multiImgs = (d.multi_images || [])
          .map((img: any) => ({ id: img?.id, url: resolveImg(img) }))
          .filter((i: any) => i.url) as ExistingGalleryImage[];
        setExistingMultiImages(multiImgs);

        reset({
          subcategory: d.subcategory
            ? String(typeof d.subcategory === "object" ? d.subcategory.id : d.subcategory)
            : "",
          businessName: d.business_name || "",
          location: d.location || "",
          country: d.country || "",
          state: d.state || "",
          city: d.city || "",
          address: d.address || "",
          contactNo: d.contact_no || "",
          whatsappNo: d.whatsapp_no || "",
          gmailId: d.gmail_id || "",
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
        navigate("/services/healthcare");
      })
      .finally(() => setLoadingData(false));
  }, [id, reset, navigate]);

  // 3. Submit
  const onSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("subcategory", values.subcategory);
      formData.append("business_name", values.businessName);
      formData.append("address", values.address);
      formData.append("location", values.location);
      formData.append("country", values.country);
      formData.append("state", values.state);
      formData.append("city", values.city);
      formData.append("contact_no", values.contactNo);
      if (values.whatsappNo) formData.append("whatsapp_no", values.whatsappNo);
      if (values.gmailId) formData.append("gmail_id", values.gmailId);
      formData.append("description", description || values.description);

      // Sirf nayi file ho tabhi bhejo (edit me purani image overwrite nahi hogi)
      if (mainImageFile) formData.append("main_image", mainImageFile);
      if (secondImageFile) formData.append("second_image", secondImageFile);
      multiImageFiles.forEach((file) => formData.append("multi_images", file));

      if (isEdit) {
        await Put(`/healthcare-services/${id}/`, formData, true);
        toastsuccessmsg("Healthcare service updated successfully!");
      } else {
        await Post("/healthcare-services/", formData, true);
        toastsuccessmsg("Healthcare service added successfully!");
      }
      navigate("/services/healthcare");
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

  // Main / Second image: native input (5MB limit)
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

  const handleSecondImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        toasterrormsg("Image size should be less than 5MB");
      } else {
        setSecondImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setSecondImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
    e.target.value = "";
  };

  // Gallery: Dropzone se (5MB se badi files skip)
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

  const removeMainImage = () => { setMainImageFile(null); setMainImagePreview(null); };
  const removeSecondImage = () => { setSecondImageFile(null); setSecondImagePreview(null); };
  const removeMultiImage = (index: number) => setMultiImageFiles((prev) => prev.filter((_, i) => i !== index));

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
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
              {isEdit ? "Edit Healthcare Service" : "Add Healthcare Service"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">Fill in the details for your healthcare service business</p>
          </div>
          <Button variant="outlined" onClick={() => navigate("/services/healthcare")} className="gap-2">
            <ArrowLeftIcon className="size-4.5" /> Back
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-5 pb-2 border-b border-gray-200 dark:border-dark-500">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className="md:col-span-2 lg:col-span-1">
                {/* key: options aane ke baad / value set hone ke baad Combobox dubara sync ho jaye (edit me value dikhe) */}
                <Combobox
                  key={`${comboboxData.length}-${selectedSubcategory?.value ?? "none"}`}
                  label={<>Healthcare Category <span className="text-red-500">*</span></>}
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
                label={<>Business Name <span className="text-red-500">*</span></>}
                {...register("businessName")}
                placeholder="Enter business name"
                error={errors.businessName?.message as string}
              />

              <div className="md:col-span-2">
                <Input
                  label={<>Address <span className="text-red-500">*</span></>}
                  {...register("address")}
                  placeholder="Enter complete address with street, area, pincode"
                  error={errors.address?.message as string}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label={<>Location / Map Link <span className="text-red-500">*</span></>}
                  {...register("location")}
                  placeholder="Paste the Google Maps share link (https://maps.google.com/...)"
                  error={errors.location?.message as string}
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
                  <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 text-sm">Select country first</div>
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
                  <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 text-sm">Select state first</div>
                )}
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message as string}</p>}
              </div>

              <Input label={<>Contact Number <span className="text-red-500">*</span></>} maxLength={10} {...register("contactNo")} placeholder="Enter 10-digit number" error={errors.contactNo?.message as string} />
              <Input label="WhatsApp Number" maxLength={10} {...register("whatsappNo")} placeholder="Enter WhatsApp number" error={errors.whatsappNo?.message as string} />
              <div className="md:col-span-2">
                <Input label="Email ID" type="email" {...register("gmailId")} placeholder="business@gmail.com" error={errors.gmailId?.message as string} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4 pb-2 border-b border-gray-200 dark:border-dark-500">
              Description <span className="text-red-500">*</span>
            </h2>
            <TextEditor
              placeholder="Describe your healthcare services, specialties, facilities, etc."
              value={initialDescription}
              onChange={(delta: any) => {
                const text = delta?.ops?.map((op: any) => (typeof op.insert === "string" ? op.insert : "")).join("") || "";
                setDescription(text);
                setValue("description", text, { shouldValidate: true });
              }}
              error={errors.description?.message as string}
            />
            <p className="text-xs text-gray-400 mt-2">
              Minimum 50 characters. Describe what makes your healthcare service unique.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-4 pb-2 border-b border-gray-200 dark:border-dark-500">Images</h2>

            {(existingMainImage || existingSecondImage || existingMultiImages.length > 0) && (
              <div className="mb-5 p-4 bg-gray-50 dark:bg-dark-800 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Current Images</h3>
                <div className="flex flex-wrap gap-4">
                  {existingMainImage && (
                    <div className="relative group">
                      <img src={existingMainImage} alt="Main" className="w-32 h-32 object-cover rounded-lg" />
                      <span className="absolute bottom-1 left-1 bg-teal-600 text-white text-xs px-2 py-0.5 rounded">Main</span>
                      <button type="button" onClick={() => setExistingMainImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <XMarkIcon className="size-3" />
                      </button>
                    </div>
                  )}
                  {existingSecondImage && (
                    <div className="relative group">
                      <img src={existingSecondImage} alt="Second" className="w-32 h-32 object-cover rounded-lg" />
                      <span className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded">Second</span>
                      <button type="button" onClick={() => setExistingSecondImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <XMarkIcon className="size-3" />
                      </button>
                    </div>
                  )}
                  {existingMultiImages.map((img, idx) => (
                    <div key={img.id ?? idx} className="relative group">
                      <img src={img.url} alt={`Gallery ${idx + 1}`} className="w-32 h-32 object-cover rounded-lg" />
                      <span className="absolute bottom-1 left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded">Gallery</span>
                      <button type="button" onClick={() => setExistingMultiImages((prev) => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <XMarkIcon className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Main Image {!isEdit && <span className="text-red-500">*</span>}</label>
                <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50 dark:bg-dark-800 min-h-[200px] flex flex-col">
                  {(mainImagePreview || existingMainImage) ? (
                    <div className="flex-1 relative">
                      <img src={mainImagePreview || existingMainImage || ""} alt="Main Preview" className="w-full h-40 object-cover rounded-md" />
                      {mainImagePreview && (
                        <button type="button" onClick={removeMainImage} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700">
                          <XMarkIcon className="size-4" />
                        </button>
                      )}
                      <input type="file" id="main_image" className="hidden" onChange={handleMainImage} accept=".jpg,.jpeg,.png,.webp" />
                      <label htmlFor="main_image" className="mt-2 block text-center px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg cursor-pointer hover:bg-orange-700">Change</label>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <PhotoIcon className="size-10 text-orange-400 mb-2" />
                      <p className="text-sm text-orange-600 text-center mb-1">Main Image</p>
                      <p className="text-xs text-gray-500 text-center mb-3">JPG, PNG, WEBP up to 5MB</p>
                      <input type="file" id="main_image" className="hidden" onChange={handleMainImage} accept=".jpg,.jpeg,.png,.webp" />
                      <label htmlFor="main_image" className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg cursor-pointer hover:bg-orange-700">Upload</label>
                    </div>
                  )}
                </div>
              </div>

              {/* Second Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Second Image</label>
                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50 dark:bg-dark-800 min-h-[200px] flex flex-col">
                  {(secondImagePreview || existingSecondImage) ? (
                    <div className="flex-1 relative">
                      <img src={secondImagePreview || existingSecondImage || ""} alt="Second Preview" className="w-full h-40 object-cover rounded-md" />
                      {secondImagePreview && (
                        <button type="button" onClick={removeSecondImage} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700">
                          <XMarkIcon className="size-4" />
                        </button>
                      )}
                      <input type="file" id="second_image" className="hidden" onChange={handleSecondImage} accept=".jpg,.jpeg,.png,.webp" />
                      <label htmlFor="second_image" className="mt-2 block text-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg cursor-pointer hover:bg-green-700">Change</label>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <PhotoIcon className="size-10 text-green-400 mb-2" />
                      <p className="text-sm text-green-600 text-center mb-1">Second Image</p>
                      <p className="text-xs text-gray-500 text-center mb-3">JPG, PNG, WEBP up to 5MB</p>
                      <input type="file" id="second_image" className="hidden" onChange={handleSecondImage} accept=".jpg,.jpeg,.png,.webp" />
                      <label htmlFor="second_image" className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg cursor-pointer hover:bg-green-700">Upload</label>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Gallery Images</label>
                <Dropzone label="" description="Upload gallery images" onFilesChange={handleMultiImages} />
                {multiImagesPreviews.length > 0 && (
                  <>
                    <p className="mt-3 text-xs text-gray-500">{multiImagesPreviews.length} new file(s) selected</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
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
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 flex items-center justify-between">
            <Button type="button" variant="outlined" onClick={() => navigate("/services/healthcare")}>Cancel</Button>
            <Button type="submit" color="primary" disabled={isLoading}>
              {isLoading
                ? (mainImageFile || secondImageFile || multiImageFiles.length > 0 ? "Uploading..." : "Saving...")
                : isEdit ? "Update Service" : "Add Service"}
            </Button>
          </Card>
        </form>
      </div>
    </Page>
  );
}