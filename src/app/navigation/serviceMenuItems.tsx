// src/app/navigation/serviceMenuItems.tsx
import {
  HomeIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ClockIcon as UserClockIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import {
  BuildingOfficeIcon,
  FireIcon as FitnessCenterIcon,
  ScissorsIcon,
  PaperAirplaneIcon as AirplaneIcon,
  BanknotesIcon,
  UserIcon,
  DevicePhoneMobileIcon,
  HomeModernIcon,
  HeartIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import React from "react";

// ==================== INTERFACES ====================
export interface SubMenu {
  name: string;
  to: string;
  submenu?: SubMenu[];
}

export interface MenuItem {
  title: string;
  icon: React.ReactNode;
  to?: string;
  submenu?: SubMenu[];
}

export interface MenuCategory {
  category?: string;
  items: MenuItem[];
}

// ==================== COMMON MENUS (ALL VENDORS) ====================
const commonMenus: MenuCategory[] = [
  {
    category: "Main",
    items: [
      {
        title: "Dashboard",
        icon: <HomeIcon className="size-5" />,
        to: "/dashboard",
        submenu: [],
      },
    ],
  },
  {
    category: "Business",
    items: [
      {
        title: "Approved Services",
        icon: <CheckCircleIcon className="size-5" />,
        to: "/business/approved-services",
        submenu: [],
      },
      {
        title: "Pending Services",
        icon: <ClockIcon className="size-5" />,
        to: "/business/pending-services",
        submenu: [],
      },
      {
        title: "Rejected Services",
        icon: <ClockIcon className="size-5" />,
        to: "/business/rejected-services",
        submenu: [],
      },
      {
        title: "Inquiry Page",
        icon: <DocumentTextIcon className="size-5" />,
        to: "/business/inquiry-page",
        submenu: [],
      },
      {
        title: "Follow-ups Page",
        icon: <UserClockIcon className="size-5" />,
        to: "/business/follow-ups-page",
        submenu: [],
      },
    ],
  },
  {
    category: "Finance",
    items: [
      {
        title: "Withdraws",
        icon: <CurrencyDollarIcon className="size-5" />,
        to: "/finance/withdraws",
        submenu: [],
      },
    ],
  },
];

// ==================== VENDOR-SPECIFIC MENUS ====================
const vendorSpecificMenus: Record<string, MenuCategory[]> = {
  real_estate: [
    {
      category: "Property Management",
      items: [
        {
          title: "My Properties",
          icon: <BuildingOfficeIcon className="size-5" />,
          to: "/services/real_estate",
          submenu: [],
        },
      ],
    },
  ],
  gym: [
    {
      category: "Gym Management",
      items: [
        {
          title: "Gym Services",
          icon: <FitnessCenterIcon className="size-5" />,
          to: "/services/gym",
          submenu: [],
        },
      ],
    },
  ],
  salon: [
    {
      category: "Salon Management",
      items: [
        {
          title: "Salon Services",
          icon: <ScissorsIcon className="size-5" />,
          to: "/services/salon",
          submenu: [],
        },
      ],
    },
  ],
  travel_agency: [
    {
      category: "Travel Management",
      items: [
        {
          title: "Travel Packages",
          icon: <AirplaneIcon className="size-5" />,
          to: "/services/travel",
          submenu: [],
        },
      ],
    },
  ],
  finance: [
    {
      category: "Finance Management",
      items: [
        {
          title: "Loan Offers",
          icon: <BanknotesIcon className="size-5" />,
          to: "/services/finance",
          submenu: [],
        },
      ],
    },
  ],
  tech: [
    {
      category: "Tech Management",
      items: [
        {
          title: "Tech Services",
          icon: <DevicePhoneMobileIcon className="size-5" />,
          to: "/services/tech",
          submenu: [],
        },
      ],
    },
  ],
  tech_industry: [
    {
      category: "Tech Management",
      items: [
        {
          title: "Tech Services",
          icon: <DevicePhoneMobileIcon className="size-5" />,
          to: "/services/tech",
          submenu: [],
        },
      ],
    },
  ],
  hotel: [
    {
      category: "Hotel Management",
      items: [
        {
          title: "Hotel Services",
          icon: <HomeModernIcon className="size-5" />,
          to: "/services/hotel",
          submenu: [],
        },
      ],
    },
  ],
  healthcare: [
    {
      category: "Healthcare Management",
      items: [
        {
          title: "Healthcare Services",
          icon: <HeartIcon className="size-5" />,
          to: "/services/healthcare",
          submenu: [],
        },
      ],
    },
  ],
  education: [
    {
      category: "Education Management",
      items: [
        {
          title: "Education Services",
          icon: <AcademicCapIcon className="size-5" />,
          to: "/services/education",
          submenu: [],
        },
      ],
    },
  ],
  professional: [
    {
      category: "Professional Services",
      items: [
        {
          title: "Professional Services",
          icon: <BriefcaseIcon className="size-5" />,
          to: "/services/professional",
          submenu: [],
        },
      ],
    },
  ],
  restaurant: [
    {
      category: "Restaurant",
      items: [
        {
          title: "Restaurant Services",
          icon: <BuildingStorefrontIcon className="size-5" />,
          to: "/services/restaurant",
          submenu: [],
        },
      ],
    },
  ],
};

// ==================== UTILITY FUNCTIONS ====================
export function getMenuForVendorType(vendorType: string | undefined): MenuCategory[] {
  if (!vendorType) {
    return commonMenus;
  }

  const vendorMenus = vendorSpecificMenus[vendorType] || [];
  return [...commonMenus, ...vendorMenus];
}

export function getVendorTypeDisplayName(vendorType: string | undefined): string {
  if (!vendorType) return "Service Vendor";

  const displayMap: Record<string, string> = {
    'real_estate': 'Real Estate',
    'gym': 'Gym & Fitness',
    'salon': 'Salon & Beauty',
    'travel_agency': 'Travel Agency',
    'finance': 'Finance',
    'tech': 'Technology Services',
    'tech_industry': 'Technology Services',
    'hotel': 'Hotel',
    'healthcare': 'Healthcare',
    'education': 'Education',
    'professional': 'Professional Services',
    'restaurant': 'Restaurant',
  };

  return displayMap[vendorType] || vendorType.replace('_', ' ').toUpperCase();
}
