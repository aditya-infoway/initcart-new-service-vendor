// Import Dependencies
import { Outlet } from "react-router";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Sidebar } from "./Sidebar";

// ----------------------------------------------------------------------

export default function Settings() {
  return (
    <Page title="Setting">
      <main className="main-content transition-content grid flex-1 grid-cols-1 place-content-start px-(--margin-x) py-6">
        <div className="h-full w-full">
          <Outlet />
        </div>
      </main>
      <Sidebar />
    </Page>
  );
}
