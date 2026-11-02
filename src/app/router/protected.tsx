// src/app/pages/routes/protected.tsx
import { Navigate, RouteObject } from "react-router";

import AuthGuard from "@/middleware/AuthGuard";
import { DynamicLayout } from "../layouts/DynamicLayout";
import { AppLayout } from "../layouts/AppLayout";

/**
 * Protected routes — all under /servicevendor2 prefix.
 */
const protectedRoutes: RouteObject = {
  id: "protected",
  path: "",
  Component: AuthGuard,
  children: [
    {
      path: "",
      Component: DynamicLayout,
      children: [
        {
          index: true,
          element: <Navigate to="/dashboard" replace />,
        },

        // ── Dashboard ──────────────────────────────────────────────────
        {
          path: "dashboard",
          lazy: async () => ({
            Component: (await import("@/app/pages/dashboards/home/crm-analytics")).default,
          }),
        },

        // ── BUSINESS ──────────────────────────────────────────────────
        {
          path: "business",
          children: [
            { index: true, element: <Navigate to="/business/approved-services" replace /> },
            {
              path: "approved-services",
              lazy: async () => ({
                Component: (await import("@/app/pages/business/approved-services/index")).default,
              }),
            },
            {
              path: "pending-services",
              lazy: async () => ({
                Component: (await import("@/app/pages/business/pending-services/index")).default,
              }),
            },
            {
              path: "rejected-services",
              lazy: async () => ({
                Component: (await import("@/app/pages/business/rejected-services/index")).default,
              }),
            },
            {
              path: "inquiry-page",
              lazy: async () => ({
                Component: (await import("@/app/pages/business/inquiry-page/index")).default,
              }),
            },
            {
              path: "follow-ups-page",
              lazy: async () => ({
                Component: (await import("@/app/pages/business/follow-ups-page/index")).default,
              }),
            },
          ],
        },

        // ── FINANCE ───────────────────────────────────────────────────
        {
          path: "finance",
          children: [
            { index: true, element: <Navigate to="/finance/withdraws" replace /> },
            {
              path: "withdraws",
              lazy: async () => ({
                Component: (await import("@/app/pages/finance/withdraws/index")).default,
              }),
            },
          ],
        },

        // ── Settings ───────────────────────────────────────────────────
        {
          path: "settings",
          Component: AppLayout,
          lazy: async () => ({
            Component: (await import("@/app/pages/settings/Layout")).default,
          }),
          children: [
            { index: true, element: <Navigate to="/settings/profile" replace /> },
            {
              path: "profile",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/AdminProfile")).default,
              }),
            },
            {
              path: "general",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/General")).default,
              }),
            },
            {
              path: "appearance",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/Appearance")).default,
              }),
            },
          ],
        },

        // ── SALON (custom pages — old-style with country dropdowns) ─────
        // NOTE: These must be ABOVE "services/:serviceType" so the
        // dynamic route doesn't swallow them.
        {
          path: "services/salon",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/salon-services/index")).default,
          }),
        },
        {
          path: "services/salon/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/salon-services/AddSalonService")).default,
          }),
        },
        {
          path: "services/salon/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/salon-services/AddSalonService")).default,
          }),
        },
        // ── GYM 
        {
          path: "services/gym",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/gym-services/index")).default,
          }),
        },
        {
          path: "services/gym/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/gym-services/AddGymService")).default,
          }),
        },
        {
          path: "services/gym/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/gym-services/AddGymService")).default,
          }),
        },

         // ── TECH - INDUSTRY 
        {
          path: "services/tech",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/tech-services/index")).default,
          }),
        },
        {
          path: "services/tech/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/tech-services/AddTechService")).default,
          }),
        },
        {
          path: "services/tech/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/tech-services/AddTechService")).default,
          }),
        },

                 // ── TRAVEL - AGENCY
        {
          path: "services/travel",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/travel-packages/index")).default,
          }),
        },
        {
          path: "services/travel/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/travel-packages/AddTravelService")).default,
          }),
        },
        {
          path: "services/travel/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/travel-packages/AddTravelService")).default,
          }),
        },

        // ── PROFESSIONAL
        {
          path: "services/professional",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/professional-services/index")).default,
          }),
        },
        {
          path: "services/professional/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/professional-services/AddProfessionalService")).default,
          }),
        },
        {
          path: "services/professional/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/professional-services/AddProfessionalService")).default,
          }),
        },


        // ── HOTEL SERVICES
        {
          path: "services/hotel",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/hotel-services/index")).default,
          }),
        },
        {
          path: "services/hotel/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/hotel-services/AddHotelService")).default,
          }),
        },
        {
          path: "services/hotel/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/hotel-services/AddHotelService")).default,
          }),
        },


        // ── RESTAURANT SERVICES
        {
          path: "services/restaurant",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/restaurant-services/index")).default,
          }),
        },
        {
          path: "services/restaurant/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/restaurant-services/AddrestaurantService")).default,
          }),
        },
        {
          path: "services/restaurant/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/restaurant-services/AddrestaurantService")).default,
          }),
        },

        // ── HEALTHCARE -SERVICES
        {
          path: "services/healthcare",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/healthcare-services/index")).default,
          }),
        },
        {
          path: "services/healthcare/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/healthcare-services/AddHealthcareService")).default,
          }),
        },
        {
          path: "services/healthcare/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/healthcare-services/AddHealthcareService")).default,
          }),
        },
         

        // ── Dynamic Services Route (all other service types) ──────────
        {
          path: "services/:serviceType",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/dynamic-services/index")).default,
          }),
        },
        {
          path: "services/:serviceType/add",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/dynamic-services/AddService")).default,
          }),
        },
        {
          path: "services/:serviceType/edit/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/dynamic-services/AddService")).default,
          }),
        },

        // ── Vendor-Specific Routes (Legacy - kept for backward compatibility) ───────
        {
          path: "properties",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/properties/index")).default,
          }),
        },
        {
          path: "gym-services",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/gym-services/index")).default,
          }),
        },
        {
          path: "salon-services",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/salon-services/index")).default,
          }),
        },
        {
          path: "travel-packages",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/travel-packages/index")).default,
          }),
        },
        {
          path: "loan-offers",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/loan-offers/index")).default,
          }),
        },
        {
          path: "tech-services",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/tech-services/index")).default,
          }),
        },
        {
          path: "hotel-services",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/hotel-services/index")).default,
          }),
        },
        {
          path: "healthcare-services",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/healthcare-services/index")).default,
          }),
        },
        {
          path: "education-services",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/education-services/index")).default,
          }),
        },
        {
          path: "professional-services",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/professional-services/index")).default,
          }),
        },
        {
          path: "restaurant-services",
          lazy: async () => ({
            Component: (await import("@/app/pages/vendor/restaurant-services/index")).default,
          }),
        },
      ],
    },
  ],
};

export { protectedRoutes };