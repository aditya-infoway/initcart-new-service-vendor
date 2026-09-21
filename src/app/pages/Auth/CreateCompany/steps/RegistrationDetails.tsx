import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Input } from "@/components/ui";
import { useCreateCompanyFormContext } from "../CreateCompanyFormContext";
import { registrationDetailsSchema, RegistrationDetailsType } from "../schema";
import { StepActions } from "../components/StepActions";

export function RegistrationDetails({
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
    formState: { errors },
  } = useForm<RegistrationDetailsType>({
    resolver: yupResolver(registrationDetailsSchema),
    defaultValues: state.formData.registrationDetails,
  });

  const onSubmit = (data: RegistrationDetailsType) => {
    dispatch({ type: "SET_FORM_DATA", payload: { registrationDetails: data } });
    dispatch({
      type: "SET_STEP_STATUS",
      payload: { registrationDetails: { isDone: true } },
    });
    setCurrentStep(3);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
      className="flex grow flex-col"
    >
      <div className="grow space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("gstNo")}
            label="GST No."
            placeholder="Enter GST number"
            error={errors.gstNo?.message}
          />
          <Input
            {...register("vatNo")}
            label="VAT No."
            placeholder="Enter VAT number"
            error={errors.vatNo?.message}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("panNo")}
            label="PAN No. / PIN"
            placeholder="Enter PAN number"
            error={errors.panNo?.message}
          />
          <Input
            {...register("tanNo")}
            label="TAN No."
            placeholder="Enter TAN number"
            error={errors.tanNo?.message}
          />
        </div>
      </div>
      <StepActions
        showPrevious
        onPrevious={() => setCurrentStep(1)}
        onCancel={onCancel}
        submitLabel="Next"
      />
    </form>
  );
}
