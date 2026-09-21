import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Input } from "@/components/ui";
import { useCreateCompanyFormContext } from "../CreateCompanyFormContext";
import { licensingSchema, LicensingType } from "../schema";
import { StepActions } from "../components/StepActions";

export function Licensing({
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
  } = useForm<LicensingType>({
    resolver: yupResolver(licensingSchema),
    defaultValues: state.formData.licensing,
  });

  const onSubmit = (data: LicensingType) => {
    dispatch({ type: "SET_FORM_DATA", payload: { licensing: data } });
    dispatch({
      type: "SET_STEP_STATUS",
      payload: { licensing: { isDone: true } },
    });
    setCurrentStep(4);
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
            {...register("dlNo1")}
            label="DL No. 1"
            placeholder="Enter DL number 1"
            error={errors.dlNo1?.message}
          />
          <Input
            {...register("dlNo2")}
            label="DL No. 2"
            placeholder="Enter DL number 2"
            error={errors.dlNo2?.message}
          />
        </div>
        <Input
          {...register("dealsIn")}
          label="Deals In"
          placeholder="Enter deals in"
          error={errors.dealsIn?.message}
        />
      </div>
      <StepActions
        showPrevious
        onPrevious={() => setCurrentStep(2)}
        onCancel={onCancel}
        submitLabel="Next"
      />
    </form>
  );
}
