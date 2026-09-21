import axios from "./axios";

// Backend token JWT nahi hai — plain random string hai (crypto.randomBytes).
// Isliye sirf presence check karna hai, jwt-decode/exp check nahi.
const isTokenValid = (authToken: string): boolean => {
  return typeof authToken === "string" && authToken.trim() !== "";
};

const setSession = (authToken?: string | null): void => {
  if (typeof authToken === "string" && authToken.trim() !== "") {
    sessionStorage.setItem("authToken", authToken);
    axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;
  } else {
    sessionStorage.removeItem("authToken");
    delete axios.defaults.headers.common.Authorization;
  }
};

export { isTokenValid, setSession };