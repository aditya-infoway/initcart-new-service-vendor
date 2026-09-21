import * as Yup from "yup";

const optionalString = Yup.string().trim().default("");

export const companyInfoSchema = Yup.object().shape({
  companyName: Yup.string().trim().required("Company name is required"),
  natureOfBusiness: Yup.string().trim().required("Nature of business is required"),
  taxSystem: Yup.string().required("Please select tax system"),
});

export const basicDetailsSchema = Yup.object().shape({
  addressLine1: Yup.string().trim().required("Address line 1 is required"),
  addressLine2: optionalString,
  city: Yup.string().trim().required("City is required"),
  pinCode: Yup.string()
    .trim()
    .matches(/^\d{6}$/, "Enter a valid 6-digit pin code")
    .required("Pin code is required"),
  country: Yup.string().required("Please select country"),
  state: Yup.string().required("Please select state"),
  stateCode: Yup.string().trim().required("State code is required"),
  district: Yup.string().required("Please select district"),
  mobile: Yup.string()
    .trim()
    .matches(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .required("Mobile is required"),
  phone: optionalString,
  email: Yup.string().trim().email("Enter a valid email").required("Email is required"),
  website: optionalString,
  dateFormat: Yup.string().required("Please select date format"),
});

export const registrationDetailsSchema = Yup.object().shape({
  gstNo: optionalString,
  vatNo: optionalString,
  panNo: optionalString,
  tanNo: optionalString,
});

export const licensingSchema = Yup.object().shape({
  dlNo1: optionalString,
  dlNo2: optionalString,
  dealsIn: optionalString,
});

// Financial year strictly runs 01-April to 31-March.
// Only the year part is allowed to change.
export const financialYearSchema = Yup.object().shape({
  startDate: Yup.string()
    .required("Start date is required")
    .test("is-april-first", "Start date must always be 1st April", (value) => {
      if (!value) return false;
      const d = new Date(value);
      return d.getMonth() === 3 && d.getDate() === 1;
    }),
  endDate: Yup.string()
    .required("End date is required")
    .test("is-march-last", "End date must always be 31st March", (value) => {
      if (!value) return false;
      const d = new Date(value);
      return d.getMonth() === 2 && d.getDate() === 31;
    })
    .test(
      "is-next-year",
      "End year must be exactly one year after start year",
      function (value) {
        const { startDate } = this.parent;
        if (!value || !startDate) return true;
        const startYear = new Date(startDate).getFullYear();
        const endYear = new Date(value).getFullYear();
        return endYear === startYear + 1;
      },
    ),
});

// Matches the actual fields used in BankDetails.tsx
// All fields optional — but format validation applies if a value is entered.
export const bankDetailsSchema = Yup.object().shape({
  bankHolderName: optionalString,
  bankAccountNo: Yup.string()
    .trim()
    .matches(/^\d{9,18}$/, {
      message: "Enter a valid bank account number",
      excludeEmptyString: true,
    })
    .default(""),
  branchName: optionalString,
  ifscCode: Yup.string()
    .trim()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
      message: "Enter a valid IFSC code",
      excludeEmptyString: true,
    })
    .default(""),
});

export type CompanyInfoType = Yup.InferType<typeof companyInfoSchema>;
export type BasicDetailsType = Yup.InferType<typeof basicDetailsSchema>;
export type RegistrationDetailsType = Yup.InferType<typeof registrationDetailsSchema>;
export type LicensingType = Yup.InferType<typeof licensingSchema>;
export type FinancialYearType = Yup.InferType<typeof financialYearSchema>;
export type BankDetailsType = Yup.InferType<typeof bankDetailsSchema>;

// Combined schema for the one-time Company Profile edit page (General settings)
export const companyProfileSchema = companyInfoSchema
  .concat(basicDetailsSchema)
  .concat(registrationDetailsSchema)
  .concat(licensingSchema)
  .concat(bankDetailsSchema);

export type CompanyProfileType = Yup.InferType<typeof companyProfileSchema>;