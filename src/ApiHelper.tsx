import axios, { type AxiosRequestConfig } from "axios";
import { toast } from "sonner";

export function toasterrormsg(message: unknown) {
  toast.error(String(message));
}

export function toastsuccessmsg(message: unknown) {
  toast.success(String(message));
}

const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/";
export const API_URL = rawApiUrl.endsWith("/") ? rawApiUrl : `${rawApiUrl}/`;

// Kept for existing imports. All calls now use the Vite environment value.
export const URL = { uaturl: "", productionurl: "", localurl: API_URL };

function getToken() {
  return localStorage.getItem("access") || "";
}

function requestConfig(isMultipart = false): AxiosRequestConfig {
  const token = getToken();
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": isMultipart ? "multipart/form-data" : "application/json",
    },
  };
}

function endpoint(path: string) {
  return `${API_URL}${path.replace(/^\/+/, "")}`;
}

function clearSessionAndRedirect() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("email");
  localStorage.removeItem("role");
  window.location.href = "/login";
}

function handleUnauthorized(error: unknown) {
  if (!axios.isAxiosError(error) || ![401, 403].includes(error.response?.status ?? 0)) return;
  // Login failures must stay on this page, rather than causing a full reload.
  if (getToken()) clearSessionAndRedirect();
}

async function execute<T>(request: Promise<T>, clearSessionOnUnauthorized = true): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (clearSessionOnUnauthorized) handleUnauthorized(error);
    throw error;
  }
}

export const Post = (fileName: string, data: unknown, useHeader = false) =>
  execute(
    axios.post(endpoint(fileName), data, requestConfig(useHeader)),
    !fileName.replace(/^\/+/, "").startsWith("auth/"),
  );
export const Delete = (fileName: string, data: unknown, useHeader = false) =>
  execute(axios.delete(endpoint(fileName), { data, ...requestConfig(useHeader) }));
export const Patch = (fileName: string, data: unknown, useHeader = false) =>
  execute(axios.patch(endpoint(fileName), data, requestConfig(useHeader)));
export const Get = (fileName: string, data: unknown = {}, useHeader = false) =>
  execute(axios.get(endpoint(fileName), { params: data, ...requestConfig(useHeader) }));
export const Put = (fileName: string, data: unknown, useHeader = false) =>
  execute(axios.put(endpoint(fileName), data, requestConfig(useHeader)));

/** GET without clearing session on 401/403/404 — use for pages that should show empty state instead of logging out. */
export async function safeGet<T = unknown>(
  path: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = await axios.get(endpoint(path), { params, ...requestConfig() });
  return res.data as T;
}

export const formatDateDDMMYYYY = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
};
