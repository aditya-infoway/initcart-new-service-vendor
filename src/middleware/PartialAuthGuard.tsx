import { Navigate, useOutlet } from "react-router";
import { useAuthContext } from "@/app/contexts/auth/context";
import { GHOST_ENTRY_PATH } from "@/constants/app";

export default function PartialAuthGuard() {
  const outlet = useOutlet();
  const { isAuthenticated, pendingToken } = useAuthContext();

  const hasPendingSession =
    pendingToken || window.sessionStorage.getItem("pendingToken");

  // na pending login hai na full login — login page pe bhej do
  if (!hasPendingSession && !isAuthenticated) {
    return <Navigate to={GHOST_ENTRY_PATH} replace />;
  }

  // agar already fully authenticated hai (company selected), dashboard bhej do
  if (isAuthenticated) {
    return <Navigate to="/dashboards/home" replace />;
  }

  return <>{outlet}</>;
}
