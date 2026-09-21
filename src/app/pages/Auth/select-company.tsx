import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Page } from "@/components/shared/Page";
import { Button } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { APP_LOGO, APP_SELECT_COMPANY_BANNER } from "@/constants/app";
import { CreateCompanyForm } from "./CreateCompany";
import { Get, toasterrormsg } from "@/ApiHelper";

interface FinancialYearRow {
  financialYearId: number;
  companyDetailsId: number;
  companyId: number;
  startDate: string;
  endDate: string;
  companyName: string;
}

function formatCompanyDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  return `${start.toLocaleDateString("en-GB", opts)} - ${end.toLocaleDateString("en-GB", opts)}`;
}

export default function SelectCompany() {
  const { user, completeAuth } = useAuthContext();   // 👈 completeAuth destructure karo
  const navigate = useNavigate();
  const [financialYears, setFinancialYears] = useState<FinancialYearRow[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const fetchFinancialYears = async () => {
    setLoading(true);
    try {
      const response = await Get("superadmin/financial-years", {}, false);
      if (response.data?.success) {
        setFinancialYears(response.data.data || []);
      } else {
        toasterrormsg(response.data?.message || "Failed to fetch companies.");
        setFinancialYears([]);
      }
    } catch {
      toasterrormsg("Something went wrong while fetching companies.");
      setFinancialYears([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ FIX — completeAuth() call kiya + path sahi kiya
  const handleCompanySelect = (row: FinancialYearRow) => {
    setSelectedRowId(row.financialYearId);
    sessionStorage.setItem("financialYearId", String(row.financialYearId));
    sessionStorage.setItem("companyDetailsId", String(row.companyDetailsId));

    completeAuth(String(row.companyId));   // 👈 isAuthenticated ko true karega
    navigate("/dashboards/home", { replace: true });
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchFinancialYears();
  };

  const hasCompanies = financialYears.length > 0;

  return (
    <Page title="Select Company">
      <main className="min-h-screen bg-white">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden min-h-screen">
            {/* Left Side */}
            <div className="flex flex-col bg-white justify-between min-h-screen relative">
              {/* Top Section: Logo, Title, and Table */}
              <div className="w-full">
                {/* Logo Area */}
                <div className="py-6 bg-white flex flex-col items-center justify-center pt-40">
                  <img
                    src={APP_LOGO}
                    alt="InitCart SuperAdmin"
                    className="h-11 w-auto object-contain"
                  />
                </div>

                {showCreateForm ? (
                  <div className="p-6">
                    <CreateCompanyForm
                      onCancel={() => setShowCreateForm(false)}
                      onSuccess={handleCreateSuccess}
                    />
                  </div>
                ) : (
                  <div className="px-6 sm:px-10 py-4 w-full">
                    {/* Header Banner */}
                    <div
                      className="px-4 py-3 text-left text-white font-bold text-lg tracking-wide rounded-t-sm"
                      style={{ backgroundColor: "#1a2fa8" }}
                    >
                      Select Company
                    </div>

                    {/* Table Container */}
                    <div className="w-full border border-t-0 border-gray-300 rounded-b-sm shadow-sm overflow-hidden">
                      {/* Table Header */}
                      <div className="grid grid-cols-2 bg-gray-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300">
                        <span>COMPANY NAME</span>
                        <span className="text-right">DATE</span>
                      </div>

                      {/* Fixed Height Scrollable Rows */}
                      <div className="h-[320px] overflow-y-auto bg-white divide-y divide-gray-200">
                        {loading ? (
                          <div className="px-4 py-12 text-center text-sm text-gray-400 bg-white">
                            Loading...
                          </div>
                        ) : financialYears.length === 0 ? (
                          <div className="px-4 py-12 text-center text-sm text-gray-400 bg-white">
                            No companies found. Create a new company to continue.
                          </div>
                        ) : (
                          financialYears.map((row, index) => (
                            <button
                              key={row.financialYearId}
                              type="button"
                              onClick={() => handleCompanySelect(row)}
                              className={`grid w-full grid-cols-2 px-4 py-3.5 text-left text-xs font-medium transition-colors ${selectedRowId === row.financialYearId
                                  ? "bg-blue-50 text-blue-900 font-bold ring-1 ring-inset ring-blue-300"
                                  : index % 2 === 0
                                    ? "bg-white text-gray-800 hover:bg-gray-50"
                                    : "bg-gray-50 text-gray-800 hover:bg-gray-100/70"
                                }`}
                            >
                              <span className="truncate pr-4 font-semibold text-gray-700">
                                {row.companyName}
                              </span>
                              <span className="text-right text-gray-500 font-medium whitespace-nowrap">
                                {formatCompanyDateRange(row.startDate, row.endDate)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Action Button at Bottom - only when no companies exist */}
              {!showCreateForm && !loading && !hasCompanies && (
                <div className="w-full border-t pt-4 bg-white sticky bottom-2 z-10 px-10 rounded-lg">
                  <Button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="w-full py-4"
                    color="primary"
                  >
                    Create Company
                  </Button>
                </div>
              )}
            </div>

            {/* Right Side - Branding Banner Image */}
            <div className="relative hidden lg:flex items-center justify-center bg-[#b81d24]">
              <img
                src={APP_SELECT_COMPANY_BANNER}
                alt="Select Company"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </main>
    </Page>
  );
}
