import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * Stock Transfer Detail — detail view is now handled inline as a drawer
 * on the main Stock Transfer page. This route redirects back there.
 */
export default function StockTransferDetail() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/order-management/stock-transfer", { replace: true }); }, [navigate]);
  return null;
}
