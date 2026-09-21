import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { Fragment, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import { Button, Input, Select } from "@/components/ui";
import { Post, Patch, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import type { DynamicService } from "@/api/dynamicServiceApi";
import DynamicServiceApi from "@/api/dynamicServiceApi";

interface DynamicServiceDrawerProps {
  isOpen: boolean;
  close: () => void;
  service: DynamicService | null;
  serviceType?: string;
  onSaved: () => void;
}

export function DynamicServiceDrawer({ isOpen, close, service, serviceType, onSaved }: DynamicServiceDrawerProps) {
  const isEdit = Boolean(service && service.id > 0);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const defaultValues = useMemo(() => ({
    service_name: service?.service_name || "",
    short_description: service?.short_description || "",
    full_description: service?.full_description || "",
    price: service?.price || 0,
    offer_price: service?.offer_price || 0,
    gst_percentage: service?.gst_percentage || "18",
    contact_person: service?.contact_person || "",
    contact_number: service?.contact_number || "",
    email: service?.email || "",
    address: service?.address || "",
    city: service?.city || "",
    state: service?.state || "",
    pincode: service?.pincode || "",
    landmark: service?.landmark || "",
    video_url: service?.video_url || "",
    batch_timings: service?.batch_timings || "",
    terms_conditions: service?.terms_conditions || "",
    category: service?.category || "",
    subcategory_name: service?.subcategory_name || "",
    business_name: service?.business_name || "",
    
    // Education specific
    education_type: service?.education_type || "",
    subjects_courses: service?.subjects_courses || "",
    mode_of_class: service?.mode_of_class || "",
    class_duration: service?.class_duration || "",
    faculty_details: service?.faculty_details || "",
    facilities: service?.facilities || "",
    eligibility_criteria: service?.eligibility_criteria || "",
  }), [service]);

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm({
    defaultValues,
    mode: "onTouched",
  });

  const watchedValues = watch();

  useEffect(() => {
    if (isOpen) reset(defaultValues);
    if (service?.image_url) {
      setImagePreview(service.image_url);
    } else {
      setImagePreview("");
    }
  }, [defaultValues, isOpen, reset, service]);

  useEffect(() => {
    if (imageFile) {
      const preview = URL.createObjectURL(imageFile);
      setImagePreview(preview);
      return () => URL.revokeObjectURL(preview);
    }
  }, [imageFile]);

  const handleClose = () => { 
    reset(); 
    setImageFile(null);
    setImagePreview("");
    close(); 
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const onSubmit = async (values: any) => {
    if (!serviceType) return;
    
    setSaving(true);
    try {
      const formData = new FormData();
      
      // Basic fields
      formData.append("service_name", values.service_name);
      formData.append("short_description", values.short_description);
      formData.append("full_description", values.full_description);
      formData.append("price", String(values.price));
      if (values.offer_price) formData.append("offer_price", String(values.offer_price));
      formData.append("gst_percentage", values.gst_percentage);
      formData.append("contact_person", values.contact_person);
      formData.append("contact_number", values.contact_number);
      formData.append("email", values.email);
      formData.append("address", values.address);
      formData.append("city", values.city);
      formData.append("state", values.state);
      formData.append("pincode", values.pincode);
      if (values.landmark) formData.append("landmark", values.landmark);
      if (values.video_url) formData.append("video_url", values.video_url);
      if (values.batch_timings) formData.append("batch_timings", values.batch_timings);
      formData.append("terms_conditions", values.terms_conditions);
      
      // Category fields
      if (values.category) formData.append("category", values.category);
      if (values.subcategory_name) formData.append("subcategory_name", values.subcategory_name);
      if (values.business_name) formData.append("business_name", values.business_name);
      
      // Education specific fields (if education type)
      if (serviceType === "education") {
        if (values.education_type) formData.append("education_type", values.education_type);
        if (values.subjects_courses) formData.append("subjects_courses", values.subjects_courses);
        if (values.mode_of_class) formData.append("mode_of_class", values.mode_of_class);
        if (values.class_duration) formData.append("class_duration", values.class_duration);
        if (values.faculty_details) formData.append("faculty_details", values.faculty_details);
        if (values.facilities) formData.append("facilities", values.facilities);
        if (values.eligibility_criteria) formData.append("eligibility_criteria", values.eligibility_criteria);
      }
      
      // Image
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (isEdit) {
        await DynamicServiceApi.updateService(serviceType, service!.id, formData);
        toastsuccessmsg("Service updated successfully.");
      } else {
        await DynamicServiceApi.createService(serviceType, formData);
        toastsuccessmsg("Service added successfully.");
      }
      onSaved();
      handleClose();
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        Object.values(e?.response?.data ?? {}).flat().join(", ") ||
        (isEdit ? "Failed to update service." : "Failed to add service."),
      );
    } finally {
      setSaving(false);
    }
  };

  const isEducation = serviceType === "education";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={handleClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />
        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full" enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0" leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[50%] xl:max-w-[45%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEdit ? "Edit Service" : "Add New Service"}
              </h3>
              <p className="mt-0.5 text-sm text-white/75">
                {isEdit ? "Update service details" : "Add a new service to the platform"}
              </p>
            </div>
            <Button onClick={handleClose} variant="flat" isIcon className="size-8 rounded-full text-white hover:bg-white/10">
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex grow flex-col overflow-hidden">
            <div className="hide-scrollbar grow space-y-5 overflow-y-auto px-5 py-5">
                {/* Service Name */}
                <Input
                  {...register("service_name", { required: "Service name is required" })}
                  label={<>Service Name <span className="text-red-500">*</span></>}
                  placeholder="Enter service name"
                  error={errors.service_name?.message}
                />

                {/* Short Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Short Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register("short_description", { required: "Short description is required" })}
                    rows={2}
                    placeholder="Enter short description"
                    className={clsx(
                      "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:placeholder-dark-400",
                      errors.short_description?.message && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {errors.short_description?.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.short_description.message}</p>
                  )}
                </div>

                {/* Full Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Full Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register("full_description", { required: "Full description is required" })}
                    rows={4}
                    placeholder="Enter full description"
                    className={clsx(
                      "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:placeholder-dark-400",
                      errors.full_description?.message && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                  {errors.full_description?.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.full_description.message}</p>
                  )}
                </div>

                {/* Price and Offer Price */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    {...register("price", { 
                      required: "Price is required",
                      min: { value: 1, message: "Price must be at least 1" },
                      valueAsNumber: true
                    })}
                    label={<>Price (₹) <span className="text-red-500">*</span></>}
                    type="number"
                    placeholder="Enter price"
                    error={errors.price?.message}
                  />
                  <Input
                    {...register("offer_price", { 
                      valueAsNumber: true
                    })}
                    label="Offer Price (₹)"
                    type="number"
                    placeholder="Optional offer price"
                  />
                </div>

                {/* GST Percentage */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    GST Percentage
                  </label>
                  <select
                    {...register("gst_percentage")}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                {/* Category and Subcategory */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    {...register("category")}
                    label="Category"
                    placeholder="Enter category"
                  />
                  <Input
                    {...register("subcategory_name")}
                    label="Sub Category"
                    placeholder="Optional subcategory"
                  />
                </div>

                {/* Business Name */}
                <Input
                  {...register("business_name")}
                  label="Business Name"
                  placeholder="Enter business name"
                />

                {/* Contact Information */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-800">
                  <h4 className="mb-3 font-semibold text-gray-800 dark:text-dark-100">Contact Information</h4>
                  <div className="space-y-3">
                    <Input
                      {...register("contact_person", { required: "Contact person is required" })}
                      label={<>Contact Person <span className="text-red-500">*</span></>}
                      placeholder="Enter contact person name"
                      error={errors.contact_person?.message}
                    />
                    <Input
                      {...register("contact_number", { required: "Contact number is required" })}
                      label={<>Contact Number <span className="text-red-500">*</span></>}
                      placeholder="Enter contact number"
                      error={errors.contact_number?.message}
                    />
                    <Input
                      {...register("email", { 
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address"
                        }
                      })}
                      label={<>Email <span className="text-red-500">*</span></>}
                      type="email"
                      placeholder="Enter email address"
                      error={errors.email?.message}
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-800">
                  <h4 className="mb-3 font-semibold text-gray-800 dark:text-dark-100">Address Information</h4>
                  <div className="space-y-3">
                    <Input
                      {...register("address", { required: "Address is required" })}
                      label={<>Address <span className="text-red-500">*</span></>}
                      placeholder="Enter address"
                      error={errors.address?.message}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        {...register("city", { required: "City is required" })}
                        label={<>City <span className="text-red-500">*</span></>}
                        placeholder="Enter city"
                        error={errors.city?.message}
                      />
                      <Input
                        {...register("state", { required: "State is required" })}
                        label={<>State <span className="text-red-500">*</span></>}
                        placeholder="Enter state"
                        error={errors.state?.message}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        {...register("pincode", { required: "Pincode is required" })}
                        label={<>Pincode <span className="text-red-500">*</span></>}
                        placeholder="Enter pincode"
                        error={errors.pincode?.message}
                      />
                      <Input
                        {...register("landmark")}
                        label="Landmark"
                        placeholder="Optional landmark"
                      />
                    </div>
                  </div>
                </div>

                {/* Education Specific Fields */}
                {isEducation && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-800">
                    <h4 className="mb-3 font-semibold text-gray-800 dark:text-dark-100">Education Specific Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                          Education Type
                        </label>
                        <select
                          {...register("education_type")}
                          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                        >
                          <option value="">Select type</option>
                          <option value="school">School</option>
                          <option value="college">College</option>
                          <option value="university">University</option>
                          <option value="coaching">Coaching Center</option>
                          <option value="online">Online Course</option>
                        </select>
                      </div>
                      <Input
                        {...register("subjects_courses")}
                        label="Subjects/Courses"
                        placeholder="Enter subjects or courses"
                      />
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                          Mode of Class
                        </label>
                        <select
                          {...register("mode_of_class")}
                          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                        >
                          <option value="">Select mode</option>
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>
                      <Input
                        {...register("class_duration")}
                        label="Class Duration"
                        placeholder="e.g., 3 months, 6 months"
                      />
                      <Input
                        {...register("faculty_details")}
                        label="Faculty Details"
                        placeholder="Enter faculty information"
                      />
                      <Input
                        {...register("facilities")}
                        label="Facilities"
                        placeholder="Enter available facilities"
                      />
                      <Input
                        {...register("eligibility_criteria")}
                        label="Eligibility Criteria"
                        placeholder="Enter eligibility requirements"
                      />
                      <Input
                        {...register("batch_timings")}
                        label="Batch Timings"
                        placeholder="Enter batch timings"
                      />
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="space-y-3">
                  <Input
                    {...register("video_url")}
                    label="Video URL"
                    placeholder="Enter video URL (optional)"
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                      Terms & Conditions <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register("terms_conditions", { required: "Terms & conditions are required" })}
                      rows={3}
                      placeholder="Enter terms and conditions"
                      className={clsx(
                        "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100 dark:placeholder-dark-400",
                        errors.terms_conditions?.message && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      )}
                    />
                    {errors.terms_conditions?.message && (
                      <p className="mt-1 text-sm text-red-500">{errors.terms_conditions.message}</p>
                    )}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-200">
                    Service Image
                  </label>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Service preview"
                          className="size-24 rounded-lg object-cover border border-gray-300 dark:border-dark-500"
                        />
                      ) : (
                        <div className="flex size-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-dark-500 dark:bg-dark-800">
                          <span className="text-xs text-gray-400 dark:text-dark-400">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-dark-600 dark:file:text-dark-100 dark:hover:file:bg-dark-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
                        Upload an image for your service (JPG, PNG)
                      </p>
                    </div>
                  </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
              <Button type="submit" color="primary" className="flex-1" disabled={saving}>
                {saving ? (isEdit ? "Updating..." : "Adding...") : (isEdit ? "Update Service" : "Add Service")}
              </Button>
              <Button type="button" variant="outlined" className="flex-1" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
