import { createSafeContext } from "@/utils/createSafeContext";
import { Dispatch } from "react";
import {
  BankDetailsType,
  BasicDetailsType,
  CompanyInfoType,
  FinancialYearType,
  LicensingType,
  RegistrationDetailsType,
} from "./schema";

export interface StepStatus {
  isDone: boolean;
}

export type StepKey =
  | "companyInfo"
  | "basicDetails"
  | "registrationDetails"
  | "licensing"
  | "financialYear"
  | "bankDetails";

export interface FormState {
  readonly formData: {
    companyInfo: CompanyInfoType;
    basicDetails: BasicDetailsType;
    registrationDetails: RegistrationDetailsType;
    licensing: LicensingType;
    financialYear: FinancialYearType;
    bankDetails: BankDetailsType;
  };
  readonly stepStatus: {
    [key in StepKey]: StepStatus;
  };
}

export type FormAction =
  | { type: "SET_FORM_DATA"; payload: Partial<FormState["formData"]> }
  | { type: "SET_STEP_STATUS"; payload: Partial<FormState["stepStatus"]> }
  | { type: "RESET_FORM" };

export interface CreateCompanyFormContextType {
  state: FormState;
  dispatch: Dispatch<FormAction>;
}

export const [CreateCompanyFormContextProvider, useCreateCompanyFormContext] =
  createSafeContext<CreateCompanyFormContextType>(
    "useCreateCompanyFormContext must be used within CreateCompanyFormProvider",
  );