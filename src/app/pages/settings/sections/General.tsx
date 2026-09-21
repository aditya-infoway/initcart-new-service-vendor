import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  BuildingOffice2Icon,
  EnvelopeIcon,
  GlobeAltIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { HiPencil } from "react-icons/hi";
import { Country, State, City } from "country-state-city";

import { PreviewImg } from "@/components/shared/PreviewImg";
import { Avatar, Button, Input, Upload } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { Get, Post, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { dateFormats, taxSystems } from "@/app/pages/Auth/CreateCompany/constants";
import {
  companyProfileSchema,
  CompanyProfileType,
} from "@/app/pages/Auth/CreateCompany/schema";

// ----------------------------------------------------------------------

export default function General() {
  const [logo, setLogo] = useState<File | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CompanyProfileType>({
    resolver: yupResolver(companyProfileSchema),
  });

  const selectedCountry = watch("country");
  const selectedState = watch("state");

  const countryList = useMemo(() => {
    return Country.getAllCountries().map((country) => ({
      id: country.name,
      label: country.name,
      isoCode: country.isoCode,
    }));
  }, []);

  const selectedCountryObj = Country.getAllCountries().find(
    (country) => country.name === selectedCountry
  );

  const stateList = useMemo(() => {
    if (!selectedCountryObj) return [];
    return State.getStatesOfCountry(selectedCountryObj.isoCode).map((s) => ({
      id: s.name,
      label: s.name,
      isoCode: s.isoCode,
    }));
  }, [selectedCountry]);

  const selectedStateObj = State.getStatesOfCountry(
    selectedCountryObj?.isoCode || ""
  ).find((s) => s.name === selectedState);

  const districtList = useMemo(() => {
    if (!selectedCountryObj || !selectedStateObj) return [];
    return City.getCitiesOfState(
      selectedCountryObj.isoCode,
      selectedStateObj.isoCode
    ).map((city) => ({ id: city.name, label: city.name }));
  }, [selectedCountry, selectedState]);

  // ---- Fetch existing company details and prefill form ----
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      setFetching(true);
      try {
        const companyDetailsId = sessionStorage.getItem("companyDetailsId");

        if (!companyDetailsId) {
          toasterrormsg("No company selected.");
          setFetching(false);
          return;
        }

        const response = await Get(
          "superadmin/company-details",
          { companyDetailsId },
          false
        );

        if (response.data?.success) {
          const d = response.data.data;
          reset({
            companyName: d.companyName || "",
            natureOfBusiness: d.natureOfBusiness || "",
            taxSystem: d.taxSystem || "",
            addressLine1: d.addressLine1 || "",
            addressLine2: d.addressLine2 || "",
            city: d.city || "",
            pinCode: d.pinCode || "",
            country: d.country || "",
            state: d.state || "",
            stateCode: d.stateCode || "",
            district: d.district || "",
            mobile: d.mobile || "",
            phone: d.phone || "",
            email: d.email || "",
            website: d.website || "",
            dateFormat: d.dateFormat || "",
            gstNo: d.gstNo || "",
            vatNo: d.vatNo || "",
            panNo: d.panNo || "",
            tanNo: d.tanNo || "",
            dlNo1: d.dlNo1 || "",
            dlNo2: d.dlNo2 || "",
            dealsIn: d.dealsIn || "",
            bankHolderName: d.bankHolderName || "",
            bankAccountNo: d.bankAccountNo || "",
            branchName: d.branchName || "",
            ifscCode: d.ifscCode || "",
          });

          if (d.logo) {
            setExistingLogoUrl(d.logo);
          }
        } else {
          toasterrormsg(response.data?.message || "Failed to fetch company details.");
        }
      } catch (error) {
        toasterrormsg("Something went wrong while fetching company details.");
      } finally {
        setFetching(false);
      }
    };

    fetchCompanyDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: CompanyProfileType) => {
    setLoading(true);
    try {
      const companyDetailsId = sessionStorage.getItem("companyDetailsId");
      const formPayload = new FormData();

      formPayload.append("companyDetailsId", companyDetailsId || "");
      Object.entries(data).forEach(([key, value]) => {
        formPayload.append(key, (value ?? "") as string);
      });
      if (logo) {
        formPayload.append("logo", logo);
      }

      const response = await Post(
        "superadmin/company-details/update",
        formPayload,
        true
      );

      if (response.data?.success) {
        toastsuccessmsg(response.data?.message || "Company details updated successfully.");
      } else {
        toasterrormsg(response.data?.message || "Failed to update company details.");
      }
    } catch (error) {
      toasterrormsg("Something went wrong while updating company details.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full max-w-3xl 2xl:max-w-5xl">
        <p className="dark:text-dark-200 text-sm text-gray-500">Loading company details...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl 2xl:max-w-5xl">
      <h5 className="dark:text-dark-50 text-lg font-medium text-gray-800">
        General
      </h5>
      <p className="dark:text-dark-200 mt-0.5 text-sm text-balance text-gray-500">
        Update your company profile.
      </p>
      <div className="dark:bg-dark-500 my-5 h-px bg-gray-200" />

      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        {/* Logo */}
        <div className="mt-4 flex flex-col space-y-1.5">
          <span className="dark:text-dark-100 text-base font-medium text-gray-800">
            Company Logo
          </span>
          <Avatar
            size={20}
            imgComponent={PreviewImg}
            imgProps={{ file: logo } as any}
            src={existingLogoUrl || "/images/logos/company-placeholder.svg"}
            classNames={{
              root: "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 rounded-xl ring-offset-[3px] ring-offset-white transition-all hover:ring-3",
              display: "rounded-xl",
            }}
            indicator={
              <div className="dark:bg-dark-700 absolute right-0 bottom-0 -m-1 flex items-center justify-center rounded-full bg-white">
                {logo ? (
                  <Button
                    type="button"
                    onClick={() => setLogo(null)}
                    isIcon
                    className="size-6 rounded-full"
                  >
                    <XMarkIcon className="size-4" />
                  </Button>
                ) : (
                  <Upload
                    name="logo"
                    onChange={(files) => setLogo(files[0])}
                    accept="image/*"
                  >
                    {({ ...props }) => (
                      <Button
                        type="button"
                        isIcon
                        className="size-6 rounded-full"
                        {...props}
                      >
                        <HiPencil className="size-3.5" />
                      </Button>
                    )}
                  </Upload>
                )}
              </div>
            }
          />
        </div>

        <div className="dark:bg-dark-500 my-7 h-px bg-gray-200" />

        {/* Company Information */}
        <div>
          <p className="dark:text-dark-100 text-base font-medium text-gray-800">
            Company Information
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 [&_.prefix]:pointer-events-none">
            <Input
              {...register("companyName")}
              label="Company / Firm / Organization Name"
              placeholder="Enter company name"
              className="rounded-xl"
              prefix={<BuildingOffice2Icon className="size-4.5" />}
              error={errors.companyName?.message}
            />
            <Input
              {...register("natureOfBusiness")}
              label="Nature of Business"
              placeholder="Enter nature of business"
              className="rounded-xl"
              error={errors.natureOfBusiness?.message}
            />
            <Controller
              control={control}
              name="taxSystem"
              render={({ field: { value, onChange, ...rest } }) => (
                <Listbox
                  data={taxSystems}
                  value={taxSystems.find((item) => item.id === value) || null}
                  onChange={(item) => onChange(item.id)}
                  label="Tax System"
                  placeholder="Select tax system"
                  displayField="label"
                  error={errors.taxSystem?.message}
                  {...rest}
                />
              )}
            />
          </div>
        </div>

        <div className="dark:bg-dark-500 my-7 h-px bg-gray-200" />

        {/* Basic Details */}
        <div>
          <p className="dark:text-dark-100 text-base font-medium text-gray-800">
            Basic Details
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 [&_.prefix]:pointer-events-none">
            <Input
              {...register("addressLine1")}
              label="Address Line 1"
              placeholder="Enter address line 1"
              className="rounded-xl"
              error={errors.addressLine1?.message}
            />
            <Input
              {...register("addressLine2")}
              label="Address Line 2"
              placeholder="Enter address line 2"
              className="rounded-xl"
              error={errors.addressLine2?.message}
            />
            <Input
              {...register("city")}
              label="City"
              placeholder="Enter city"
              className="rounded-xl"
              error={errors.city?.message}
            />
            <Input
              {...register("pinCode")}
              label="Pin Code"
              placeholder="Enter pin code"
              className="rounded-xl"
              error={errors.pinCode?.message}
            />
            <Controller
              control={control}
              name="country"
              render={({ field: { value, onChange, ...rest } }) => (
                <Listbox
                  data={countryList}
                  value={countryList.find((item) => item.id === value) || null}
                  onChange={(item) => {
                    onChange(item.id);
                    setValue("state", "");
                    setValue("district", "");
                  }}
                  label="Country"
                  placeholder="Select country"
                  displayField="label"
                  error={errors.country?.message}
                  {...rest}
                />
              )}
            />
            <Controller
              control={control}
              name="state"
              render={({ field: { value, onChange, ...rest } }) => (
                <Listbox
                  data={stateList}
                  value={stateList.find((item) => item.id === value) || null}
                  onChange={(item) => {
                    onChange(item.label);
                    setValue("district", "");
                    setValue("stateCode", item.isoCode);
                  }}
                  label="State"
                  placeholder="Select state"
                  displayField="label"
                  error={errors.state?.message}
                  inputProps={{ disabled: !selectedCountry }}
                  {...rest}
                />
              )}
            />
            <Input
              {...register("stateCode")}
              label="State Code"
              placeholder="Enter state code"
              className="rounded-xl"
              error={errors.stateCode?.message}
              readOnly
            />
            <Controller
              control={control}
              name="district"
              render={({ field: { value, onChange, ...rest } }) => (
                <Listbox
                  data={districtList}
                  value={districtList.find((item) => item.id === value) || null}
                  onChange={(item) => onChange(item.label)}
                  label="District"
                  placeholder="Select district"
                  displayField="label"
                  error={errors.district?.message}
                  inputProps={{ disabled: !selectedState }}
                  {...rest}
                />
              )}
            />
            <Input
              {...register("mobile")}
              label="Mobile"
              type="tel"
              placeholder="Enter mobile number"
              className="rounded-xl"
              prefix={<PhoneIcon className="size-4.5" />}
              error={errors.mobile?.message}
            />
            <Input
              {...register("phone")}
              label="Phone"
              type="tel"
              placeholder="Enter phone number"
              className="rounded-xl"
              prefix={<PhoneIcon className="size-4.5" />}
              error={errors.phone?.message}
            />
            <Input
              {...register("email")}
              label="Email"
              type="email"
              placeholder="Enter email"
              className="rounded-xl"
              prefix={<EnvelopeIcon className="size-4.5" />}
              error={errors.email?.message}
            />
            <Input
              {...register("website")}
              label="Website"
              placeholder="Enter website"
              className="rounded-xl"
              prefix={<GlobeAltIcon className="size-4.5" />}
              error={errors.website?.message}
            />
            <Controller
              control={control}
              name="dateFormat"
              render={({ field: { value, onChange, ...rest } }) => (
                <Listbox
                  data={dateFormats}
                  value={dateFormats.find((item) => item.id === value) || null}
                  onChange={(item) => onChange(item.id)}
                  label="Date Format"
                  placeholder="Select date format"
                  displayField="label"
                  error={errors.dateFormat?.message}
                  {...rest}
                />
              )}
            />
          </div>
        </div>

        <div className="dark:bg-dark-500 my-7 h-px bg-gray-200" />

        {/* Registration Details */}
        <div>
          <p className="dark:text-dark-100 text-base font-medium text-gray-800">
            Registration Details
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              {...register("gstNo")}
              label="GST No."
              placeholder="Enter GST number"
              className="rounded-xl"
              error={errors.gstNo?.message}
            />
            <Input
              {...register("vatNo")}
              label="VAT No."
              placeholder="Enter VAT number"
              className="rounded-xl"
              error={errors.vatNo?.message}
            />
            <Input
              {...register("panNo")}
              label="PAN No. / PIN"
              placeholder="Enter PAN number"
              className="rounded-xl"
              error={errors.panNo?.message}
            />
            <Input
              {...register("tanNo")}
              label="TAN No."
              placeholder="Enter TAN number"
              className="rounded-xl"
              error={errors.tanNo?.message}
            />
          </div>
        </div>

        <div className="dark:bg-dark-500 my-7 h-px bg-gray-200" />

        {/* Licensing */}
        <div>
          <p className="dark:text-dark-100 text-base font-medium text-gray-800">
            Licensing
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              {...register("dlNo1")}
              label="DL No. 1"
              placeholder="Enter DL number 1"
              className="rounded-xl"
              error={errors.dlNo1?.message}
            />
            <Input
              {...register("dlNo2")}
              label="DL No. 2"
              placeholder="Enter DL number 2"
              className="rounded-xl"
              error={errors.dlNo2?.message}
            />
            <Input
              {...register("dealsIn")}
              label="Deals In"
              placeholder="Enter deals in"
              className="rounded-xl sm:col-span-2"
              error={errors.dealsIn?.message}
            />
          </div>
        </div>

        <div className="dark:bg-dark-500 my-7 h-px bg-gray-200" />

        {/* Bank Details */}
        <div>
          <p className="dark:text-dark-100 text-base font-medium text-gray-800">
            Bank Details
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              {...register("bankHolderName")}
              label="Bank Holder Name"
              placeholder="Enter Bank Holder Name"
              className="rounded-xl"
              error={errors.bankHolderName?.message}
            />
            <Input
              {...register("bankAccountNo")}
              label="Bank Account No"
              placeholder="Enter Bank Account No"
              className="rounded-xl"
              error={errors.bankAccountNo?.message}
            />
            <Input
              {...register("branchName")}
              label="Branch Name"
              placeholder="Enter Branch Name"
              className="rounded-xl"
              error={errors.branchName?.message}
            />
            <Input
              {...register("ifscCode")}
              label="Bank IFSC Code"
              placeholder="Enter IFSC Code"
              className="rounded-xl"
              error={errors.ifscCode?.message}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <Button type="button" className="min-w-[7rem]" disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="min-w-[7rem]"
            color="primary"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}