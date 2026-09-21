export const APP_NAME = "Service Vendor Panel";
export const APP_KEY = "tailux";
export const APP_BASE_URL = import.meta.env.BASE_URL || "/";
export const APP_LOGO = `${APP_BASE_URL}images/initcart/fav.png`;
export const APP_FAVICON = `${APP_BASE_URL}images/initcart/fav.png`;
export const APP_LOGIN_BANNER = `${APP_BASE_URL}images/login.png`;
export const APP_SELECT_COMPANY_BANNER = `${APP_BASE_URL}images/initcart/login.jpeg`;

// Redirect Paths
export const REDIRECT_URL_KEY = "redirect";
export const HOME_PATH = "/dashboard";
export const GHOST_ENTRY_PATH = "/login";
export const SELECT_COMPANY_PATH = "/select-company";

// Navigation Types
export type NavigationType = "root" | "group" | "collapse" | "item" | "divider";

export const COLORS = [
  "neutral",
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "error",
] as const;

export type ColorType = (typeof COLORS)[number];
