// src/hooks/useBranchLocationCheck.ts

import { useState } from "react";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";
import { Get } from "@/ApiHelper";

export const useBranchLocationCheck = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const checkLocation = async (): Promise<boolean> => {
    try {
      // ── Role naye theme ke pattern se: seedha localStorage se ──
      const userRole = localStorage.getItem("role") || "";

      // ── Sirf superadmin ke liye check karo ──
      if (userRole !== "superadmin") {
        return true; // Non-superadmin users ko check nahi karna
      }

      setIsLoading(true);
      const response = await Get("auth/me/") as any;
      const body = response?.data ?? response;

      if (body?.success) {
        const branch = body.data;
        const city = branch?.city?.trim();
        const state = branch?.state?.trim();
        const country = branch?.country?.trim();

        if (!city || !state || !country) {
          await Swal.fire({
            icon: "warning",
            title: "Location Incomplete!",
            html: "Please add <b>City</b>, <b>State</b>, and <b>Country</b> in your <b>Profile</b> first.",
            confirmButtonText: "Go to Profile",
            confirmButtonColor: "#2563eb",
            cancelButtonText: "Cancel",
            showCancelButton: true,
          }).then((result) => {
            if (result.isConfirmed) {
              navigate("/profile");
            }
          });
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Location check error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { checkLocation, isLoading };
};