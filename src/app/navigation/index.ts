import { NavigationTree } from "@/@types/navigation";
import { dashboard } from "./segments/dashboard";
import { business } from "./segments/business";
import { finance } from "./segments/finance";
import { settingsAndProfile } from "./segments/settingsAndProfile";
import { logout } from "./segments/logout";

const isSuperAdmin = () => localStorage.getItem("role") === "superadmin";

// Get vendor type from localStorage - more robust check
const getVendorType = () => {
  try {
    const vendorStr = localStorage.getItem("vendor");
    if (vendorStr) {
      const vendor = JSON.parse(vendorStr);
      // Check vendor_subtype first (contains specific type like hotel, gym, etc.)
      // then fallback to vendor_type (general type like "service")
      const vendorType = vendor?.vendor_subtype || vendor?.vendor_type || vendor?.type || vendor?.service_type || null;
      return vendorType;
    }
  } catch (e) {
    console.error("Failed to parse vendor:", e);
  }
  return null;
};

// Vendor-specific service menus
const getVendorServiceMenu = (): NavigationTree | null => {
  const vendorType = getVendorType();
  
  if (!vendorType) return null;

  const vendorMenuMap: Record<string, { title: string; path: string; icon: string }> = {
    'real_estate': { title: 'My Properties', path: '/services/real_estate', icon: 'BuildingOffice2Icon' },
    'gym': { title: 'Gym Services', path: '/services/gym', icon: 'FireIcon' },
    'salon': { title: 'Salon Services', path: '/services/salon', icon: 'ScissorsIcon' },
    'travel_agency': { title: 'Travel Packages', path: '/services/travel', icon: 'PaperAirplaneIcon' },
    'finance': { title: 'Loan Offers', path: '/services/finance', icon: 'BanknotesIcon' },
    'tech': { title: 'Tech Services', path: '/services/tech', icon: 'DevicePhoneMobileIcon' },
    'tech_industry': { title: 'Tech Services', path: '/services/tech', icon: 'DevicePhoneMobileIcon' },
    'hotel': { title: 'Hotel Services', path: '/services/hotel', icon: 'HomeModernIcon' },
    'healthcare': { title: 'Healthcare Services', path: '/services/healthcare', icon: 'HeartIcon' },
    'education': { title: 'Education Services', path: '/services/education', icon: 'AcademicCapIcon' },
    'professional': { title: 'Professional Services', path: '/services/professional', icon: 'BriefcaseIcon' },
    'restaurant': { title: 'Restaurant Services', path: '/services/restaurant', icon: 'BuildingStorefrontIcon' },
  };

  const menuConfig = vendorMenuMap[vendorType];
  if (!menuConfig) return null;

  return {
    id: `vendor.${vendorType}`,
    type: "item" as const,
    path: menuConfig.path,
    title: menuConfig.title,
    icon: menuConfig.icon,
  };
};

function filterNavigationByRole(items: NavigationTree[]): NavigationTree[] {
  const superAdmin = isSuperAdmin();
  const vendorType = getVendorType();
  
  return items
    .filter((item) => {
      if (item.superAdminOnly && !superAdmin) return false;
      if (item.branchOnly && superAdmin) return false;
      return true;
    })
    .map((item) =>
      item.childs
        ? { ...item, childs: filterNavigationByRole(item.childs) }
        : item
    );
}

const rawNavigation = [
  dashboard,
  business,
  finance,
  settingsAndProfile,
  logout,
];

export const getNavigation = (): NavigationTree[] => {
  const filteredNav = filterNavigationByRole(rawNavigation);
  
  // Add vendor-specific service menu if vendor is logged in
  const vendorServiceMenu = getVendorServiceMenu();
  
  if (vendorServiceMenu) {
    // Insert after dashboard, before business
    const vendorSection: NavigationTree = {
      id: "vendor-services",
      type: "collapse",
      path: "/services",
      title: "MY SERVICES",
      icon: "services",
      childs: [vendorServiceMenu],
    };
    
    // Insert vendor section after dashboard (index 1)
    return [filteredNav[0], vendorSection, ...filteredNav.slice(1)];
  }
  
  return filteredNav;
};
