// Import Dependencies
import { Outlet } from "react-router";
import { useLayoutEffect } from "react";

// Local Imports
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

// ----------------------------------------------------------------------

export default function Sideblock() {
  useLayoutEffect(() => {
    if (document?.body?.dataset) {
      document.body.dataset.layout = "sideblock";
    }
  }, []);

  return (
    <>
      <Header />
      <main className="main-content transition-content grid grid-cols-1">
        <Outlet />
      </main>
      <Sidebar />
    </>
  );
} 