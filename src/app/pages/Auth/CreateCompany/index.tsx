import { useState } from "react";
import clsx from "clsx";
import { Card } from "@/components/ui";
import { CreateCompanyFormProvider } from "./CreateCompanyFormProvider";
import { Stepper } from "./Stepper";
import { CompanyInformation } from "./steps/CompanyInformation";
import { BasicDetails } from "./steps/BasicDetails";
import { RegistrationDetails } from "./steps/RegistrationDetails";
import { Licensing } from "./steps/Licensing";
import { FinancialYear } from "./steps/FinancialYear";
import { BankDetails } from "./steps/BankDetails";
import { StepKey } from "./CreateCompanyFormContext";

export interface CreateCompanyStep {
  key: StepKey;
  component: React.ComponentType<{
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    onCancel: () => void;
    onSuccess: () => void;
  }>;
  label: string;
  description: string;
}

const steps: CreateCompanyStep[] = [
  {
    key: "companyInfo",
    component: CompanyInformation,
    label: "Company Information",
    description: "Company name, nature of business and tax system",
  },
  {
    key: "basicDetails",
    component: BasicDetails,
    label: "Basic Details",
    description: "Address, contact and date format details",
  },
  {
    key: "registrationDetails",
    component: RegistrationDetails,
    label: "Registration Details",
    description: "GST, VAT, PAN and TAN numbers",
  },
  {
    key: "licensing",
    component: Licensing,
    label: "Licensing",
    description: "DL numbers and deals in",
  },
  {
    key: "financialYear",
    component: FinancialYear,
    label: "Financial Year",
    description: "Financial year (1st April to 31st March)",
  },
  {
    key: "bankDetails",
    component: BankDetails,
    label: "Bank Details",
    description: "Bank account information",
  },
];

interface CreateCompanyFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function CreateCompanyForm({ onCancel, onSuccess }: CreateCompanyFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const ActiveForm = steps[currentStep].component;

  return (
    <CreateCompanyFormProvider>
      <div className="w-full">
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-dark-50">
          Create Company
        </h2>

        <div className="mb-4 flex items-center sm:hidden">
          {steps.map((step, index) => (
            <div key={step.key} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(index)}
                className={clsx(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  index === currentStep
                    ? "border-primary-500 bg-primary-500 text-white"
                    : index < currentStep
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-gray-300 bg-white text-gray-400 dark:border-dark-400 dark:bg-dark-700 dark:text-dark-300",
                )}
              >
                {index + 1}
              </button>

              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    "h-0.5 flex-1",
                    index < currentStep ? "bg-primary-500" : "bg-gray-300 dark:bg-dark-400",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mb-4 sm:hidden">
          <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].label}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-300">
            {steps[currentStep].description}
          </p>
        </div>

        <div
          className={clsx(
            "grid grid-cols-12 gap-4",
            "grid-rows-[auto_1fr] sm:grid-rows-none",
          )}
        >
          <div className="hidden sm:col-span-4 sm:block lg:col-span-3">
            <Stepper
              steps={steps}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
            />
          </div>

          <div className="col-span-12 sm:col-span-8 lg:col-span-9">
            <Card className="flex h-full flex-col p-4 sm:p-5">
              <h5 className="text-lg font-medium text-gray-800 dark:text-dark-100">
                {steps[currentStep].label}
              </h5>
              <p className="text-sm text-gray-500 dark:text-dark-200">
                {steps[currentStep].description}
              </p>
              <div className="mt-4 flex grow flex-col">
                <ActiveForm
                  setCurrentStep={setCurrentStep}
                  onCancel={onCancel}
                  onSuccess={onSuccess}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </CreateCompanyFormProvider>
  );
}