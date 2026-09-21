import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Input } from "@/components/ui";
import { useCreateCompanyFormContext } from "../CreateCompanyFormContext";
import { Post, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { bankDetailsSchema, BankDetailsType } from "../schema";
import { StepActions } from "../components/StepActions";

export function BankDetails({
  setCurrentStep,
  onCancel,
  onSuccess,
}: {
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { state, dispatch } = useCreateCompanyFormContext();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankDetailsType>({
    resolver: yupResolver(bankDetailsSchema),
    defaultValues: state.formData.bankDetails,
  });

  const onSubmit = async (data: BankDetailsType) => {
    setLoading(true);
    dispatch({ type: "SET_FORM_DATA", payload: { bankDetails: data } });
    dispatch({
      type: "SET_STEP_STATUS",
      payload: { bankDetails: { isDone: true } },
    });

    const { formData } = state;

    const payload = {
      // Company Information
      companyName: formData.companyInfo.companyName,
      natureOfBusiness: formData.companyInfo.natureOfBusiness,
      taxSystem: formData.companyInfo.taxSystem,

      // Basic Details
      addressLine1: formData.basicDetails.addressLine1,
      addressLine2: formData.basicDetails.addressLine2 ?? "",
      city: formData.basicDetails.city,
      pinCode: formData.basicDetails.pinCode,
      country: formData.basicDetails.country,
      state: formData.basicDetails.state,
      stateCode: formData.basicDetails.stateCode,
      district: formData.basicDetails.district,
      mobile: formData.basicDetails.mobile,
      phone: formData.basicDetails.phone ?? "",
      email: formData.basicDetails.email,
      website: formData.basicDetails.website ?? "",
      dateFormat: formData.basicDetails.dateFormat,

      // Registration Details
      gstNo: formData.registrationDetails.gstNo ?? "",
      vatNo: formData.registrationDetails.vatNo ?? "",
      panNo: formData.registrationDetails.panNo ?? "",
      tanNo: formData.registrationDetails.tanNo ?? "",

      // Licensing
      dlNo1: formData.licensing.dlNo1 ?? "",
      dlNo2: formData.licensing.dlNo2 ?? "",
      dealsIn: formData.licensing.dealsIn ?? "",

      // Bank Details
      bankHolderName: data.bankHolderName ?? "",
      bankAccountNo: data.bankAccountNo ?? "",
      branchName: data.branchName ?? "",
      ifscCode: data.ifscCode ?? "",

      // Financial Year (nested, matches backend Joi schema)
      financialYear: {
        startDate: formData.financialYear.startDate,
        endDate: formData.financialYear.endDate,
      },
    };

    try {
      const response = await Post("superadmin/company-details/create", payload, false);

      if (response.data?.success) {
        toastsuccessmsg(response.data?.message || "Company created successfully.");
        dispatch({ type: "RESET_FORM" });
        onSuccess();
      } else {
        toasterrormsg(response.data?.message || "Failed to create company.");
      }
    } catch (error) {
      toasterrormsg("Something went wrong while saving company details.");
    } finally {
      setLoading(false);
    }
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
            {...register("bankHolderName")}
            label="Bank Holder Name"
            placeholder="Enter Bank Holder Name"
            error={errors.bankHolderName?.message}
          />
          <Input
            {...register("bankAccountNo")}
            label="Bank Account No"
            placeholder="Enter Bank Account No"
            error={errors.bankAccountNo?.message}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register("branchName")}
            label="Branch Name"
            placeholder="Enter Branch Name"
            error={errors.branchName?.message}
          />
          <Input
            {...register("ifscCode")}
            label="Bank IFSC Code"
            placeholder="Enter IFSC Code"
            error={errors.ifscCode?.message}
          />
        </div>
      </div>
      <StepActions
        showPrevious
        onPrevious={() => setCurrentStep(4)}
        onCancel={onCancel}
        submitLabel="Create Company"
        loading={loading}
      />
    </form>
  );
}