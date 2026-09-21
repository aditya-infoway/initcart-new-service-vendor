// src/utils/session.ts

const TOKEN_KEY = "authToken";
const COMPANY_ID_KEY = "companyId";

export const setCompanySession = (
  token: string | null,
  companyId: string | number | null,
) => {
  if (token && companyId !== null && companyId !== undefined) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(COMPANY_ID_KEY, String(companyId));
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(COMPANY_ID_KEY);
  }
};

export const getCompanySession = () => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const companyId = sessionStorage.getItem(COMPANY_ID_KEY);
  return { token, companyId };
};

export const isCompanySessionValid = () => {
  const { token, companyId } = getCompanySession();
  return Boolean(token && companyId);
};