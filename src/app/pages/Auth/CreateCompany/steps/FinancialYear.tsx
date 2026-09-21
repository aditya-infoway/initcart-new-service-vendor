import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { DatePicker } from "@/components/shared/form/DatePicker";
import { useCreateCompanyFormContext } from "../CreateCompanyFormContext";
import { financialYearSchema, FinancialYearType } from "../schema";
import { StepActions } from "../components/StepActions";

function getCurrentFinancialYearStart(): number {
  const today = new Date();
  const month = today.getMonth(); // April = 3 (0-indexed)
  const year = today.getFullYear();
  return month >= 3 ? year : year - 1;
}

function buildFinancialYearDates(startYear: number) {
  return {
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
}

export function FinancialYear({
  setCurrentStep,
  onCancel,
}: {
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { state, dispatch } = useCreateCompanyFormContext();
  const currentFyStart = getCurrentFinancialYearStart();

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FinancialYearType>({
    resolver: yupResolver(financialYearSchema),
    defaultValues:
      state.formData.financialYear.startDate && state.formData.financialYear.endDate
        ? state.formData.financialYear
        : buildFinancialYearDates(currentFyStart),
  });

  const onSubmit = (data: FinancialYearType) => {
    dispatch({ type: "SET_FORM_DATA", payload: { financialYear: data } });
    dispatch({
      type: "SET_STEP_STATUS",
      payload: { financialYear: { isDone: true } },
    });
    setCurrentStep(5);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
      className="flex grow flex-col"
    >
      <div className="grow space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="startDate"
            render={({ field: { value, onChange, ...rest } }) => (
              <DatePicker
                value={value || ""}
                onChange={(selectedDates: Date[]) => {
                  // Only the year from user's pick is used —
                  // month/day are always forced to 1st April.
                  const pickedYear = selectedDates?.[0]?.getFullYear();
                  if (!pickedYear) return;
                  const { startDate, endDate } = buildFinancialYearDates(pickedYear);
                  setValue("startDate", startDate, { shouldValidate: true });
                  setValue("endDate", endDate, { shouldValidate: true });
                }}
                options={{
                  dateFormat: "Y-m-d",
                }}
                label="Financial Year Start"
                placeholder="Select financial year"
                error={errors.startDate?.message}
                {...rest}
              />
            )}
          />
          <Controller
            control={control}
            name="endDate"
            render={({ field: { value, onChange, ...rest } }) => (
              <DatePicker
                value={value || ""}
                onChange={() => {}}
                options={{
                  dateFormat: "Y-m-d",
                  clickOpens: false,
                }}
                label="Financial Year End"
                placeholder="Auto-set"
                error={errors.endDate?.message}
                {...rest}
              />
            )}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-dark-200">
          Financial year hamesha 1st April se 31st March tak hota hai — sirf year change hoga.
        </p>
      </div>
      <StepActions
        showPrevious
        onPrevious={() => setCurrentStep(3)}
        onCancel={onCancel}
        submitLabel="Next"
      />
    </form>
  );
}