import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { Input } from "@/components/ui";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { useCreateCompanyFormContext } from "../CreateCompanyFormContext";
import { taxSystems } from "../constants";
import { companyInfoSchema, CompanyInfoType } from "../schema";
import { StepActions } from "../components/StepActions";

export function CompanyInformation({
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
    formState: { errors },
  } = useForm<CompanyInfoType>({
    resolver: yupResolver(companyInfoSchema),
    defaultValues: state.formData.companyInfo,
  });

  const onSubmit = (data: CompanyInfoType) => {
    dispatch({ type: "SET_FORM_DATA", payload: { companyInfo: data } });
    dispatch({
      type: "SET_STEP_STATUS",
      payload: { companyInfo: { isDone: true } },
    });
    setCurrentStep(1);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
      className="flex grow flex-col"
    >
      <div className="grow space-y-4">
        <Input
          {...register("companyName")}
          label="Company / Firm / Organization Name"
          placeholder="Enter company name"
          prefix={<BuildingOffice2Icon className="size-5" strokeWidth="1" />}
          error={errors.companyName?.message}
        />
        <Input
          {...register("natureOfBusiness")}
          label="Nature of Business"
          placeholder="Enter nature of business"
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
      <StepActions onCancel={onCancel} submitLabel="Next" />
    </form>
  );
}
