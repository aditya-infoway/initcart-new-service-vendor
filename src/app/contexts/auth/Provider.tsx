import { useEffect, useReducer, ReactNode } from "react";
import { Post, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { setSession } from "@/utils/jwt";
import { AuthProvider as AuthContext, AuthContextType } from "./context";
import { User } from "@/@types/user";

interface AuthAction {
  type: "INITIALIZE" | "LOGIN_REQUEST" | "LOGIN_SUCCESS" | "LOGIN_ERROR" | "LOGOUT" | "SESSION_ESTABLISHED";
  payload?: Partial<AuthContextType>;
}

const initialState: AuthContextType = {
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  errorMessage: null,
  user: null,
  pendingToken: null,
  pendingEmail: null,
  vendor: null,
  login: async () => {},
  completeAuth: () => {},
  logout: async () => {},
};

const reducerHandlers: Record<
  AuthAction["type"],
  (state: AuthContextType, action: AuthAction) => AuthContextType
> = {
  INITIALIZE: (state, action) => ({
    ...state,
    isAuthenticated: action.payload?.isAuthenticated ?? false,
    isInitialized: true,
    user: action.payload?.user ?? null,
  }),

  LOGIN_REQUEST: (state) => ({
    ...state,
    isLoading: true,
    errorMessage: null,
  }),

  LOGIN_SUCCESS: (state, action) => ({
    ...state,
    isAuthenticated: true,
    isLoading: false,
    errorMessage: null,
    pendingToken: action.payload?.pendingToken ?? null,
    pendingEmail: action.payload?.pendingEmail ?? null,
    user: action.payload?.user ?? null,
    vendor: action.payload?.vendor ?? null,
  }),

  LOGIN_ERROR: (state, action) => ({
    ...state,
    errorMessage: action.payload?.errorMessage ?? "An error occurred",
    isLoading: false,
  }),

  LOGOUT: (state) => ({
    ...state,
    isAuthenticated: false,
    user: null,
    pendingToken: null,
    pendingEmail: null,
  }),

  SESSION_ESTABLISHED: (state, action) => ({
    ...state,
    isAuthenticated: true,
    isLoading: false,
    errorMessage: null,
    user: action.payload?.user ?? state.user,
    pendingToken: null,
  }),
};

const reducer = (state: AuthContextType, action: AuthAction): AuthContextType => {
  const handler = reducerHandlers[action.type];
  return handler ? handler(state, action) : state;
};

const PENDING_TOKEN_KEY = "pendingToken";
const PENDING_EMAIL_KEY = "pendingEmail";
const COMPANY_ID_KEY = "companyId";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const init = async () => {
      try {
        const access = localStorage.getItem("access");
        const refresh = localStorage.getItem("refresh");
        const email = localStorage.getItem("email");
        const role = localStorage.getItem("role");
        const vendorStr = localStorage.getItem("vendor");

        if (access && email) {
          setSession(access);
          let vendor = null;
          if (vendorStr) {
            try {
              vendor = JSON.parse(vendorStr);
            } catch (e) {
              console.error("Failed to parse vendor:", e);
            }
          }
          dispatch({
            type: "INITIALIZE",
            payload: { isAuthenticated: true, user: { email, access, refresh, role } as unknown as User, vendor },
          });
        } else {
          dispatch({ type: "INITIALIZE", payload: { isAuthenticated: false, user: null, vendor: null } });
        }
      } catch (err) {
        console.error(err);
        dispatch({ type: "INITIALIZE", payload: { isAuthenticated: false, user: null, vendor: null } });
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleForceLogout = () => {
      logout();
    };
    window.addEventListener("force-logout", handleForceLogout);
    return () => {
      window.removeEventListener("force-logout", handleForceLogout);
    };
  }, []);

  const login = async (credentials: { identifier: string; password: string }) => {
    dispatch({ type: "LOGIN_REQUEST" });
    try {
      const response = await Post(
        "ecommerce/auth/service-login/",
        { identifier: credentials.identifier, password: credentials.password },
        false,
      );
      // API returns: { success, message, vendor: { id, email, business_name, vendor_type, vendor_subtype, ... }, access, refresh }
      const { access, refresh, vendor, message } = response.data;
      const email = vendor?.email;
      const role = "vendor"; // Service vendor role

      if (!access || !email) {
        throw new Error(message || "Login response did not include an access token.");
      }

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);
      localStorage.setItem("email", email);
      localStorage.setItem("role", role);
      localStorage.setItem("vendor", JSON.stringify(vendor || {}));

      setSession(access);

      toastsuccessmsg(message || "Login successful");

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: { email, access, refresh, role } as unknown as User,
        },
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || "Login failed";
      toasterrormsg(message);
      dispatch({ type: "LOGIN_ERROR", payload: { errorMessage: message } });
      throw err;
    }
  };

  const completeAuth = (companyId: string) => {
    const token = state.pendingToken || window.sessionStorage.getItem(PENDING_TOKEN_KEY);

    if (!token) {
      toasterrormsg("Session expired. Please login again.");
      return;
    }

    setSession(token);
    window.sessionStorage.setItem("authToken", token);
    window.sessionStorage.setItem(COMPANY_ID_KEY, companyId);
    window.sessionStorage.setItem("user", JSON.stringify(state.user));
    window.sessionStorage.removeItem(PENDING_TOKEN_KEY);
    window.sessionStorage.removeItem(PENDING_EMAIL_KEY);

    dispatch({ type: "SESSION_ESTABLISHED", payload: { user: state.user } });
  };

  async function logout() {
    setSession(null);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("vendor");
    dispatch({ type: "LOGOUT" });
  }

  if (!children) return null;

  return (
    <AuthContext value={{ ...state, login, completeAuth, logout }}>
      {children}
    </AuthContext>
  );
}
