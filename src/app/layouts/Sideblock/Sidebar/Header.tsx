// Import Dependencies
import { Link } from "react-router";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

// Local Imports
import { APP_LOGO, HOME_PATH } from "@/constants/app";
import { Button } from "@/components/ui";
import { useSidebarContext } from "@/app/contexts/sidebar/context";
import { useBreakpointsContext } from "@/app/contexts/breakpoint/context";

// ----------------------------------------------------------------------

export function Header() {
  const { close } = useSidebarContext();
  const { lgAndDown } = useBreakpointsContext();

  return (
    <header
      className={clsx(
        "flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 dark:border-dark-600 dark:bg-dark-900",
      )}
    >
      <Link to={HOME_PATH} className="flex items-center gap-3">
        <img src={APP_LOGO} alt="InitCart SuperAdmin" className="h-8" />
      </Link>

      {lgAndDown && (
        <Button
          onClick={close}
          variant="flat"
          isIcon
          className="size-6 rounded-full"
        >
          <ChevronLeftIcon className="size-5 rtl:rotate-180" />
        </Button>
      )}
    </header>
  );
}
