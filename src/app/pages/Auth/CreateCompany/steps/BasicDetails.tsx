import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  EnvelopeIcon,
  GlobeAltIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { useCreateCompanyFormContext } from "../CreateCompanyFormContext";
import { dateFormats } from "../constants";

import { Country, State, City } from "country-state-city";
import { useMemo } from "react";
import { basicDetailsSchema, BasicDetailsType } from "../schema";
import { StepActions } from "../components/StepActions";

export function BasicDetails({
  setCurrentStep,
  onCancel,
}: {
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { state, dispatch } = useCreateCompanyFormContext();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BasicDetailsType>({
    resolver: yupResolver(basicDetailsSchema),
    defaultValues: state.formData.basicDetails,
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

  return State.getStatesOfCountry(selectedCountryObj.isoCode).map((state) => ({
    id: state.name,
    label: state.name,
    isoCode: state.isoCode,
  }));
}, [selectedCountry]);

const selectedStateObj = State.getStatesOfCountry(
  selectedCountryObj?.isoCode || ""
).find((state) => state.name === selectedState);

const districtList = useMemo(() => {
  if (!selectedCountryObj || !selectedStateObj) return [];

  return City.getCitiesOfState(
    selectedCountryObj.isoCode,
    selectedStateObj.isoCode
  ).map((city) => ({
    id: city.name,
    label: city.name,
  }));
}, [selectedCountry, selectedState]);

  const onSubmit = (data: BasicDetailsType) => {
    dispatch({ type: "SET_FORM_DATA", payload: { basicDetails: data } });
    dispatch({
      type: "SET_STEP_STATUS",
      payload: { basicDetails: { isDone: true } },
    });
    setCurrentStep(2);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
      className="flex grow flex-col"
    >
      <div className="max-h-[50vh] grow space-y-4 overflow-y-auto pr-1">
        <Input
          {...register("addressLine1")}
          label="Address Line 1"
          placeholder="Enter address line 1"
          error={errors.addressLine1?.message}
        />
        <Input
          {...register("addressLine2")}
          label="Address Line 2"
          placeholder="Enter address line 2"
          error={errors.addressLine2?.message}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("city")}
            label="City"
            placeholder="Enter city"
            error={errors.city?.message}
          />
          <Input
            {...register("pinCode")}
            label="Pin Code"
            placeholder="Enter pin code"
            error={errors.pinCode?.message}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("stateCode")}
            label="State Code"
            placeholder="Enter state code"
            error={errors.stateCode?.message}
            readOnly
          />
          <Controller
            control={control}
            name="district"
            render={({ field: { value, onChange, ...rest } }) => (
              <Listbox
                data={districtList}
                value={districtList.find((item)=>item.id===value)||null}
                onChange={(item)=>{
                    onChange(item.label);
                }}
                label="District"
                placeholder="Select district"
                displayField="label"
                error={errors.district?.message}
                inputProps={{ disabled: !selectedState }}
                {...rest}
              />
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("mobile")}
            label="Mobile"
            type="tel"
            placeholder="Enter mobile number"
            prefix={<PhoneIcon className="size-5" strokeWidth="1" />}
            error={errors.mobile?.message}
          />
          <Input
            {...register("phone")}
            label="Phone"
            type="tel"
            placeholder="Enter phone number"
            prefix={<PhoneIcon className="size-5" strokeWidth="1" />}
            error={errors.phone?.message}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("email")}
            label="Email"
            type="email"
            placeholder="Enter email"
            prefix={<EnvelopeIcon className="size-5" strokeWidth="1" />}
            error={errors.email?.message}
          />
          <Input
            {...register("website")}
            label="Website"
            placeholder="Enter website"
            prefix={<GlobeAltIcon className="size-5" strokeWidth="1" />}
            error={errors.website?.message}
          />
        </div>
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
      <StepActions
        showPrevious
        onPrevious={() => setCurrentStep(0)}
        onCancel={onCancel}
        submitLabel="Next"
      />
    </form>
  );
}
