// Import Dependencies
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import invariant from "tiny-invariant";

// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";
import { useBreakpointsContext } from "@/app/contexts/breakpoint/context";
import { useSidebarContext } from "@/app/contexts/sidebar/context";
import { type NavigationTree } from "@/@types/navigation";
import { navigationIcons } from "@/app/navigation/icons";
import { GHOST_ENTRY_PATH } from "@/constants/app";

// ----------------------------------------------------------------------

export function LogoutMenuItem({ data }: { data: NavigationTree }) {
  const { icon, transKey, title } = data;
  const { t } = useTranslation();
  const { logout } = useAuthContext();
  const navigate = useNavigate();
  const { lgAndDown } = useBreakpointsContext();
  const { close } = useSidebarContext();

  invariant(
    icon && navigationIcons[icon],
    `[LogoutMenuItem] Icon ${icon} not found in navigationIcons`,
  );

  const Icon = navigationIcons[icon];
  const label = transKey ? t(transKey) : title;

  const handleLogout = async () => {
    await logout();
    if (lgAndDown) close();
    navigate(GHOST_ENTRY_PATH);
  };

  return (
    <div className="relative flex px-3">
      <button
        type="button"
        onClick={handleLogout}
        className={clsx(
          "group min-w-0 flex-1 rounded-md px-3 py-2 font-medium outline-hidden transition-colors ease-in-out",
          "text-gray-800 hover:bg-gray-100 hover:text-gray-950 focus:bg-gray-100 focus:text-gray-950 dark:text-dark-200 dark:hover:bg-dark-300/10 dark:hover:text-dark-50 dark:focus:bg-dark-300/10",
        )}
      >
        <div className="flex min-w-0 items-center gap-3 text-xs-plus tracking-wide">
          <Icon className="size-5 shrink-0 stroke-[1.5] opacity-80 group-hover:opacity-100" />
          <span className="truncate">{label}</span>
        </div>
      </button>
    </div>
  );
}
