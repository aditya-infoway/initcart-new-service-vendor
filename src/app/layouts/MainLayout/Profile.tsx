// Import Dependencies
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  ArrowLeftStartOnRectangleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { TbPalette, TbUser } from "react-icons/tb";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";

// Local Imports
import { Avatar, Button } from "@/components/ui";
import { APP_FAVICON, APP_NAME, ColorType } from "@/constants/app";
import { Get } from "@/ApiHelper";
import { resolveProfileDisplay } from "@/utils/authMeProfile";
import { useAuthContext } from "@/app/contexts/auth/context";
import { GHOST_ENTRY_PATH } from "@/constants/app";

// ----------------------------------------------------------------------

export function Profile() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("Branch");
  const [adminEmail, setAdminEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");

  useEffect(() => {
    const loadProfile = () => {
      Get("auth/me/", {}, false)
        .then((res: any) => {
          const { displayName, email, profileImage: image } = resolveProfileDisplay(res?.data ?? res);
          setAdminName(displayName || "Service Vendor");
          setAdminEmail(email);
          setProfileImage(image);
        })
        .catch(() => {});
    };

    loadProfile();
    window.addEventListener("profile-updated", loadProfile);
    return () => window.removeEventListener("profile-updated", loadProfile);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate(GHOST_ENTRY_PATH);
  };

  return (
    <Popover className="relative">
      <PopoverButton
        as={Avatar}
        size={12}
        role="button"
        name={adminName}
        src={profileImage || undefined}
        initialColor="primary"
        classNames={{ display: "rounded-full text-sm font-bold" }}
        className="cursor-pointer"
      />
      <Transition
        enter="duration-200 ease-out"
        enterFrom="translate-x-2 opacity-0"
        enterTo="translate-x-0 opacity-100"
        leave="duration-200 ease-out"
        leaveFrom="translate-x-0 opacity-100"
        leaveTo="translate-x-2 opacity-0"
      >
        <PopoverPanel
          anchor={{ to: "right end", gap: 12 }}
          className="z-70 flex w-64 flex-col rounded-lg border border-gray-150 bg-white shadow-soft transition dark:border-dark-600 dark:bg-dark-700 dark:shadow-none"
        >
          {({ close }) => (
            <>
              {/* User Info */}
              <div className="flex items-center gap-4 rounded-t-lg bg-gray-100 px-4 py-5 dark:bg-dark-800">
                <Avatar
                  size={14}
                  name={adminName}
                  src={profileImage || undefined}
                  initialColor="primary"
                  classNames={{ display: "rounded-full text-base font-bold" }}
                />
                <div className="min-w-0">
                  <Link
                    className="truncate text-base font-medium text-gray-700 hover:text-primary-600 focus:text-primary-600 dark:text-dark-100 dark:hover:text-primary-400"
                    to="/settings/profile"
                    onClick={() => close()}
                  >
                    {adminName}
                  </Link>
                  {adminEmail && (
                    <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-dark-300">
                      {adminEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick links */}
              <div className="flex flex-col py-2">
                <Link
                  to="/settings/profile"
                  onClick={() => close()}
                  className="group flex items-center gap-3 px-4 py-2.5 tracking-wide outline-hidden transition-all hover:bg-gray-100 dark:hover:bg-dark-600"
                >
                  <Avatar size={8} initialColor="warning" classNames={{ display: "rounded-lg" }}>
                    <TbUser className="size-4" />
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-800 group-hover:text-primary-600 dark:text-dark-100">
                      Admin Profile
                    </p>
                    <p className="text-xs text-gray-400 dark:text-dark-300">
                      View & edit your profile
                    </p>
                  </div>
                </Link>

                <Link
                  to="/settings/appearance"
                  onClick={() => close()}
                  className="group flex items-center gap-3 px-4 py-2.5 tracking-wide outline-hidden transition-all hover:bg-gray-100 dark:hover:bg-dark-600"
                >
                  <Avatar size={8} initialColor="success" classNames={{ display: "rounded-lg" }}>
                    <TbPalette className="size-4" />
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-800 group-hover:text-primary-600 dark:text-dark-100">
                      Appearance
                    </p>
                    <p className="text-xs text-gray-400 dark:text-dark-300">
                      Theme & display settings
                    </p>
                  </div>
                </Link>

                <Link
                  to="/settings/general"
                  onClick={() => close()}
                  className="group flex items-center gap-3 px-4 py-2.5 tracking-wide outline-hidden transition-all hover:bg-gray-100 dark:hover:bg-dark-600"
                >
                  <Avatar size={8} initialColor="primary" classNames={{ display: "rounded-lg" }}>
                    <Cog6ToothIcon className="size-4" />
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-800 group-hover:text-primary-600 dark:text-dark-100">
                      Company Settings
                    </p>
                    <p className="text-xs text-gray-400 dark:text-dark-300">
                      General company profile
                    </p>
                  </div>
                </Link>

                {/* Logout */}
                <div className="px-4 pt-3">
                  <Button
                    className="w-full gap-2"
                    color="error"
                    variant="outlined"
                    onClick={handleLogout}
                  >
                    <ArrowLeftStartOnRectangleIcon className="size-4.5" />
                    <span>Logout</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
