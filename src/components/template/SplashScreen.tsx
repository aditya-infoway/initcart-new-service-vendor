// Local Imports
import { APP_LOGO } from "@/constants/app";
import { Progress } from "@/components/ui";

// ----------------------------------------------------------------------

export function SplashScreen() {
  return (
    <>
      <div className="fixed grid h-full w-full place-content-center">
        <img
          src={APP_LOGO}
          alt="InitCart SuperAdmin"
          className="h-28 w-auto object-contain"
        />
        <Progress
          color="primary"
          isIndeterminate
          animationDuration="1s"
          className="mt-2 h-1"
        />
      </div>
    </>
  );
}
