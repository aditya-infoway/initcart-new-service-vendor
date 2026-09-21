// Import Dependencies
import { ElementType, Fragment, ReactNode, useEffect } from "react";

// Local Imports
import { APP_FAVICON, APP_NAME } from "@/constants/app";
import { useDocumentTitle } from "@/hooks/index";

// ----------------------------------------------------------------------

type PageProps<T extends ElementType = typeof Fragment> = {
  title?: string;
  component?: T;
  children: ReactNode;
} & React.ComponentPropsWithoutRef<T>;

function Page<T extends ElementType = typeof Fragment>({
  title = "",
  component,
  children,
  ...rest
}: PageProps<T>) {
  const Component: ElementType = component || Fragment;
  useDocumentTitle(`${title} - ${APP_NAME}`);

  // Ensure the favicon <link> always points to the correct path,
  // even when the app is served under a sub-path (e.g. /servicevendor2/).
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    link.href = APP_FAVICON;
  }, []);

  return <Component {...rest}>{children}</Component>;
}

export { Page };
