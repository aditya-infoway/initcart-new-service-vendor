export const COMPANIES_STORAGE_KEY = "amaar_companies";
export const SELECTED_COMPANY_STORAGE_KEY = "amaar_selected_company";

export interface StoredCompany {
  id: string;
  companyName: string;
  natureOfBusiness: string;
  taxSystem: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pinCode: string;
  country: string;
  state: string;
  stateCode: string;
  district: string;
  mobile: string;
  phone: string;
  email: string;
  website: string;
  dateFormat: string;
  gstNo: string;
  vatNo: string;
  panNo: string;
  tanNo: string;
  dlNo1: string;
  dlNo2: string;
  dealsIn: string;
  startDate: string;
  endDate: string;
  bankDetails: string;
  username: string;
  password: string;
  createdAt: string;
}

export function getCompanies(): StoredCompany[] {
  try {
    const raw = window.localStorage.getItem(COMPANIES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCompany[]) : [];
  } catch {
    return [];
  }
}

export function saveCompany(company: StoredCompany): void {
  const companies = getCompanies();
  companies.push(company);
  window.localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  window.dispatchEvent(new StorageEvent("local-storage", { key: COMPANIES_STORAGE_KEY }));
}

export function getSelectedCompany(): StoredCompany | null {
  try {
    const raw = window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCompany) : null;
  } catch {
    return null;
  }
}

export function setSelectedCompany(company: StoredCompany): void {
  window.localStorage.setItem(
    SELECTED_COMPANY_STORAGE_KEY,
    JSON.stringify(company),
  );
}

export function clearSelectedCompany(): void {
  window.localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
}

export function clearCompanyData(): void {
  window.localStorage.removeItem(COMPANIES_STORAGE_KEY);
  window.localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
}

export function formatCompanyDateRange(startDate: string, endDate: string): string {
  const format = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  return `${format(startDate)} To ${format(endDate)}`;
}
