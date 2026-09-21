import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TableCellsIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useRef, useState } from "react";  

import { Page } from "@/components/shared/Page";
import { Button, Card } from "@/components/ui";
import { Get, Post, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { API_URL } from "@/ApiHelper";

// ── helpers ──────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("access") || "";
}

export default function ItemImportPage() {
  const isSuperAdmin = useMemo(() => localStorage.getItem("role") === "superadmin", []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ── Company Items (superadmin only) ──
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  const [companyImporting, setCompanyImporting] = useState(false);
  const [companyExporting, setCompanyExporting] = useState(false);
  const [companyDownloading, setCompanyDownloading] = useState(false);
  const [selectedCompanyFile, setSelectedCompanyFile] = useState<File | null>(null);

  // ── Download Template ─────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}pos/manual/template/download/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "item_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toastsuccessmsg("Template downloaded successfully.");
    } catch {
      toasterrormsg("Failed to download template.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Import Items ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) handleImport(file);
    e.target.value = "";
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await Post("pos/manual/template/import/", form, true);
      toastsuccessmsg("Items imported successfully.");
      setSelectedFile(null);
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        "Failed to import items.",
      );
    } finally {
      setImporting(false);
    }
  };

  // ── Download Company Template ─────────────────────────────────────────────
  const handleDownloadCompanyTemplate = async () => {
    setCompanyDownloading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}pos/items/export-template/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "item_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toastsuccessmsg("Template downloaded successfully.");
    } catch {
      toasterrormsg("Failed to download template.");
    } finally {
      setCompanyDownloading(false);
    }
  };

  // ── Import Company Items ──────────────────────────────────────────────────
  const handleCompanyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedCompanyFile(file);
    if (file) handleCompanyImport(file);
    e.target.value = "";
  };

  const handleCompanyImport = async (file: File) => {
    setCompanyImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await Post("pos/items/import/", form, true);
      toastsuccessmsg("Company items imported successfully.");
      setSelectedCompanyFile(null);
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        "Failed to import company items.",
      );
    } finally {
      setCompanyImporting(false);
    }
  };

  // ── Export Company Items ──────────────────────────────────────────────────
  const handleExportCompanyItems = async () => {
    setCompanyExporting(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}pos/items/export/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "items_export.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toastsuccessmsg("Company items exported successfully.");
    } catch {
      toasterrormsg("Failed to export company items.");
    } finally {
      setCompanyExporting(false);
    }
  };


  // ── Export Items ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}pos/manual/items/export/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "manual_items_export.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toastsuccessmsg("Items exported successfully.");
    } catch {
      toasterrormsg("Failed to export items.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page title="Item Import / Export">
      <div className="transition-content w-full px-(--margin-x) py-6 space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400">
            <TableCellsIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
              Excel Import / Export
            </h1>
            <p className="text-sm text-gray-500 dark:text-dark-300">
              Bulk upload and export items using Excel files
            </p>
          </div>
        </div>

        {/* Instructions */}
        <Card className="border-l-4 border-l-primary bg-primary/5 p-5 dark:bg-primary/10">
          <div className="flex gap-3">
            <InformationCircleIcon className="size-5 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-primary dark:text-primary-400 mb-2">
                Instructions for Excel Import
              </p>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-dark-200 list-disc list-inside">
                <li>Download the template first to understand the required format</li>
                <li>Fields marked with <span className="text-red-500 font-semibold">*</span> are mandatory</li>
                <li>Multiple rows with same ITEM_NAME will create one item with multiple variants</li>
                <li>BRAND_NAME, CATEGORY_NAME, GROUP_NAME, UNIT_NAME must match existing names</li>
                <li>MRP must be greater than or equal to SALES_PRICE</li>
                <li>BARCODE accepts alphanumeric values only (letters and numbers)</li>
              </ul>
            </div>
          </div>
        </Card>
{/* Company Items section — superadmin only */}
        {isSuperAdmin && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BuildingOfficeIcon className="size-5 text-success-600 dark:text-success-400" />
              <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
                Company Items
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2.5 py-0.5 text-xs font-semibold text-success-600 dark:bg-success-500/15 dark:text-success-400">
                <ShieldCheckIcon className="size-3.5" /> Super Admin
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Download Template */}
              <Card className="group p-5 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-success-500/30 dark:hover:border-success-500/30 cursor-default">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-success-500/10 text-success-600 transition-colors duration-200 dark:bg-success-500/15 dark:text-success-400">
                    <ArrowDownTrayIcon className="size-4" />
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-dark-100">
                    Download Template
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-dark-300">
                  Download Excel template with required columns for bulk upload.
                </p>
                <Button
                  onClick={handleDownloadCompanyTemplate}
                  disabled={companyDownloading}
                  className="w-full gap-2 bg-success-600 text-white hover:bg-success-700 active:scale-[0.98] transition-all duration-150"
                >
                  <ArrowDownTrayIcon className="size-4" />
                  {companyDownloading ? "Downloading..." : "Download Template"}
                </Button>
              </Card>

              {/* Import Items */}
              <Card className="group p-5 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-success-500/30 dark:hover:border-success-500/30 cursor-default">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-success-500/10 text-success-600 transition-colors duration-200 dark:bg-success-500/15 dark:text-success-400">
                    <ArrowUpTrayIcon className="size-4" />
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-dark-100">
                    Import Company Items
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-dark-300">
                  Upload filled Excel file to bulk import company items.
                </p>
                <input
                  ref={companyFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleCompanyFileChange}
                />
                <Button
                  onClick={() => companyFileInputRef.current?.click()}
                  disabled={companyImporting}
                  className="w-full gap-2 bg-success-600 text-white hover:bg-success-700 active:scale-[0.98] transition-all duration-150"
                >
                  <ArrowUpTrayIcon className="size-4" />
                  {companyImporting ? "Importing..." : selectedCompanyFile ? selectedCompanyFile.name : "Choose File & Import"}
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* Manual Items section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <DocumentArrowDownIcon className="size-5 text-gray-700 dark:text-dark-200" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              Manual Items
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Download Template */}
            <Card className="group p-5 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 dark:hover:border-primary/30 cursor-default">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-600 transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary dark:bg-dark-600 dark:text-dark-300">
                  <ArrowDownTrayIcon className="size-4" />
                </div>
                <p className="font-semibold text-gray-800 dark:text-dark-100">
                  Download Manual Template
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-dark-300">
                Download manual Excel template for your branch items.
              </p>
              <Button
                onClick={handleDownloadTemplate}
                disabled={downloading}
                className="w-full gap-2 bg-gray-700 text-white hover:bg-gray-900 active:scale-[0.98] transition-all duration-150 dark:bg-dark-500 dark:hover:bg-dark-400"
              >
                <ArrowDownTrayIcon className="size-4" />
                {downloading ? "Downloading..." : "Download Template"}
              </Button>
            </Card>

            {/* Import Items */}
            <Card className="group p-5 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 dark:hover:border-primary/30 cursor-default">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-600 transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary dark:bg-dark-600 dark:text-dark-300">
                  <ArrowUpTrayIcon className="size-4" />
                </div>
                <p className="font-semibold text-gray-800 dark:text-dark-100">
                  Import Manual Items
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-dark-300">
                Upload filled manual Excel file to bulk import items.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full gap-2 bg-gray-700 text-white hover:bg-gray-900 active:scale-[0.98] transition-all duration-150 dark:bg-dark-500 dark:hover:bg-dark-400"
              >
                <ArrowUpTrayIcon className="size-4" />
                {importing ? "Importing..." : selectedFile ? selectedFile.name : "Choose File & Import"}
              </Button>
            </Card>
          </div>
        </div>

 {/* Export Options */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <DocumentArrowDownIcon className="size-5 text-gray-700 dark:text-dark-200" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              Export Options
            </h2>
          </div>

          <div className={isSuperAdmin ? "grid gap-4 sm:grid-cols-2" : "sm:max-w-sm"}>
            {/* Export Company Items — superadmin only */}
            {isSuperAdmin && (
              <Card className="group p-5 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-success-500/30 dark:hover:border-success-500/30 cursor-default">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-success-500/10 text-success-600 transition-colors duration-200 dark:bg-success-500/15 dark:text-success-400">
                    <ArrowDownTrayIcon className="size-4" />
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-dark-100">
                    Export Company Items
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-dark-300">
                  Export all company items to Excel file.
                </p>
                <Button
                  onClick={handleExportCompanyItems}
                  disabled={companyExporting}
                  className="w-full gap-2 bg-success-600 text-white hover:bg-success-700 active:scale-[0.98] transition-all duration-150"
                >
                  <DocumentArrowDownIcon className="size-4" />
                  {companyExporting ? "Exporting..." : "Export Company Items"}
                </Button>
              </Card>
            )}

            {/* Export Manual Items — all users */}
            <Card className="group p-5 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 dark:hover:border-primary/30 cursor-default">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-600 transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary dark:bg-dark-600 dark:text-dark-300">
                  <ArrowDownTrayIcon className="size-4" />
                </div>
                <p className="font-semibold text-gray-800 dark:text-dark-100">
                  Export Manual Items
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-dark-300">
                {isSuperAdmin ? "Export all manual items to Excel file." : "Export your branch items to Excel file."}
              </p>
              <Button
                color="primary"
                onClick={handleExport}
                disabled={exporting}
                className="w-full gap-2 active:scale-[0.98] transition-all duration-150"
              >
                <DocumentArrowDownIcon className="size-4" />
                {exporting ? "Exporting..." : "Export Manual Items"}
              </Button>
            </Card>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4 space-y-1.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-success-500">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="size-4 text-success-600 dark:text-success-400" />
              <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">Required Fields</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              ITEM_NAME, PURCHASE_PRICE, SALES_PRICE and MRP are required.
            </p>
          </Card>

          <Card className="p-4 space-y-1.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-warning-500">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="size-4 text-warning-600 dark:text-warning-400" />
              <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">Validations</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Prices must be positive, MRP ≥ Sales Price, Barcode alphanumeric only.
            </p>
          </Card>

          <Card className="p-4 space-y-1.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-info-500">
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="size-4 text-info-600 dark:text-info-400" />
              <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">Manual Import</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Custom validation rules, larger datasets, detailed error reporting.
            </p>
          </Card>
        </div>

      </div>
    </Page>
  );
}
