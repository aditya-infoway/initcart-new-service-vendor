import {
  ArrowLeftIcon, CheckIcon, ArrowPathIcon, KeyIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Table, THead, TBody, Tr, Th, Td } from "@/components/ui";
import { Checkbox } from "@/components/ui/Form";
import { Get, Post, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";

// ── Types ──────────────────────────────────────────────────────────────────
interface FlatPage {
  page_key: string;
  page_label: string;
  group: string;
}

interface PermissionRow extends FlatPage {
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

type ActionField = "can_view" | "can_add" | "can_edit" | "can_delete";
type AllowedActions = Record<ActionField, boolean>;

// ── Page-wise allowed actions map ───────────────────────────────────────────
const PAGE_ALLOWED_ACTIONS: Record<string, AllowedActions> = {
  // ── Master ──────────────────────────────
  "/master-menu/account-creation": { can_view: true, can_add: true, can_edit: true, can_delete: false },
  "/master-menu/branch-master": { can_view: true, can_add: true, can_edit: true, can_delete: true },
  "/master-menu/add-items": { can_view: true, can_add: true, can_edit: true, can_delete: true },
  "/master-menu/website-items": { can_view: true, can_add: true, can_edit: true, can_delete: true },
  "/master-menu/item-barcodes": { can_view: true, can_add: true, can_edit: true, can_delete: false },
  "/master-menu/orders": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/master-menu/group": { can_view: true, can_add: true, can_edit: true, can_delete: true },
  "/master-menu/item-import": { can_view: true, can_add: true, can_edit: false, can_delete: false },

  // ── Order Management ────────────────────
  "/order-management/order-items": { can_view: true, can_add: true, can_edit: true, can_delete: true },
  "/order-management/stock-verification": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/order-management/stock-return": { can_view: true, can_add: true, can_edit: false, can_delete: true },
  "/order-management/stock-transfer": { can_view: true, can_add: true, can_edit: false, can_delete: false },

  // ── Purchase Master ─────────────────────
  "/purchase/purchase-entry": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/purchase/purchase-return": { can_view: true, can_add: true, can_edit: false, can_delete: true },
  "/purchase/b2b-purchase-verification": { can_view: true, can_add: false, can_edit: false, can_delete: false },

  // ── Sales Master ────────────────────────
  "/sales/sales-entry-report": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/sales/sales-entry2": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/sales/b2b-sales": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/sales/sales-return-report": { can_view: true, can_add: true, can_edit: false, can_delete: true },

  // ── Stock Master ────────────────────────
  "/stock/stock-report": { can_view: true, can_add: false, can_edit: false, can_delete: false },

  // ── B2B Inventory ───────────────────────
  "/b2b-inventory/stock-return": { can_view: true, can_add: true, can_edit: false, can_delete: true },
  "/b2b-inventory/stock-transfer/send-order": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/b2b-inventory/stock-transfer/received-orders": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/b2b-inventory/stock-return-management": { can_view: true, can_add: true, can_edit: true, can_delete: true },
  "/b2b-inventory/b2b-stock-return-management": { can_view: true, can_add: true, can_edit: true, can_delete: true },
  "/b2b-inventory/scheme-offer": { can_view: true, can_add: true, can_edit: true, can_delete: true },

  // ── Transaction Master ───────────────────
  "/transaction/day-book": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/transaction/cash-book": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/transaction/bank-book": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/transaction/ledger-report": { can_view: true, can_add: false, can_edit: false, can_delete: false },

  // ── Accounting ─────────────────────────
  "/accounting/bank-payment": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/accounting/bank-receipt": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/accounting/cash-payment": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/accounting/cash-receipt": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/accounting/contra": { can_view: true, can_add: true, can_edit: false, can_delete: false },
  "/accounting/journal-entries": { can_view: false, can_add: false, can_edit: false, can_delete: false },
  "/accounting/sales-profit-report": { can_view: true, can_add: false, can_edit: false, can_delete: false },

  // ── Reporting ─────────────────────────
  "/reporting/outstanding": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/reporting/sales-register": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/reporting/purchase-register": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/reporting/sales-return-register": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/reporting/purchase-return-register": { can_view: true, can_add: false, can_edit: false, can_delete: false },
  "/reporting/due-payment": { can_view: true, can_add: false, can_edit: false, can_delete: false },
};

const DEFAULT_ALLOWED: AllowedActions = { can_view: true, can_add: true, can_edit: true, can_delete: true };

const isActionAllowed = (page_key: string, field: ActionField): boolean => {
  const allowed = PAGE_ALLOWED_ACTIONS[page_key] ?? DEFAULT_ALLOWED;
  return allowed[field];
};

// ── Flatten menu for permissions ───────────────────────────────────────────
const flattenMenu = (): FlatPage[] => {
  const pages: FlatPage[] = [
    // Master
    { page_key: "/master-menu/account-creation", page_label: "Account Creation", group: "Master" },
    { page_key: "/master-menu/branch-master", page_label: "Branch Master", group: "Master" },
    { page_key: "/master-menu/add-items", page_label: "Add Items", group: "Master" },
    { page_key: "/master-menu/website-items", page_label: "Website Items", group: "Master" },
    { page_key: "/master-menu/item-barcodes", page_label: "Item Barcodes", group: "Master" },
    { page_key: "/master-menu/orders", page_label: "Orders", group: "Master" },
    { page_key: "/master-menu/group", page_label: "Group", group: "Master" },
    { page_key: "/master-menu/item-import", page_label: "Item Import", group: "Master" },

    // Order Management
    { page_key: "/order-management/order-items", page_label: "Order Items", group: "Order Management" },
    { page_key: "/order-management/stock-verification", page_label: "Stock Verification", group: "Order Management" },
    { page_key: "/order-management/stock-return", page_label: "Stock Return", group: "Order Management" },
    { page_key: "/order-management/stock-transfer", page_label: "Stock Transfer", group: "Order Management" },

    // Purchase Master
    { page_key: "/purchase/purchase-entry", page_label: "Purchase Entry", group: "Purchase Master" },
    { page_key: "/purchase/purchase-return", page_label: "Purchase Return", group: "Purchase Master" },
    { page_key: "/purchase/b2b-purchase-verification", page_label: "B2B Purchase Verification", group: "Purchase Master" },

    // Sales Master
    { page_key: "/sales/sales-entry-report", page_label: "Sales Entry Report", group: "Sales Master" },
    { page_key: "/sales/sales-entry2", page_label: "Sales Entry 2", group: "Sales Master" },
    { page_key: "/sales/b2b-sales", page_label: "B2B Sales", group: "Sales Master" },
    { page_key: "/sales/sales-return-report", page_label: "Sales Return Report", group: "Sales Master" },

    // Stock Master
    { page_key: "/stock/stock-report", page_label: "Stock Report", group: "Stock Master" },

    // B2B Inventory
    { page_key: "/b2b-inventory/stock-return", page_label: "Stock Return", group: "B2B Inventory" },
    { page_key: "/b2b-inventory/stock-transfer/send-order", page_label: "Send Order", group: "B2B Inventory" },
    { page_key: "/b2b-inventory/stock-transfer/received-orders", page_label: "Received Orders", group: "B2B Inventory" },
    { page_key: "/b2b-inventory/stock-return-management", page_label: "Stock Return Management", group: "B2B Inventory" },
    { page_key: "/b2b-inventory/b2b-stock-return-management", page_label: "B2B Stock Return Management", group: "B2B Inventory" },
    { page_key: "/b2b-inventory/scheme-offer", page_label: "Scheme Offer", group: "B2B Inventory" },

    // Transaction Master
    { page_key: "/transaction/day-book", page_label: "Day Book", group: "Transaction Master" },
    { page_key: "/transaction/cash-book", page_label: "Cash Book", group: "Transaction Master" },
    { page_key: "/transaction/bank-book", page_label: "Bank Book", group: "Transaction Master" },
    { page_key: "/transaction/ledger-report", page_label: "Ledger Report", group: "Transaction Master" },

    // Accounting
    { page_key: "/accounting/bank-payment", page_label: "Bank Payment", group: "Accounting" },
    { page_key: "/accounting/bank-receipt", page_label: "Bank Receipt", group: "Accounting" },
    { page_key: "/accounting/cash-payment", page_label: "Cash Payment", group: "Accounting" },
    { page_key: "/accounting/cash-receipt", page_label: "Cash Receipt", group: "Accounting" },
    { page_key: "/accounting/contra", page_label: "Contra", group: "Accounting" },
    { page_key: "/accounting/journal-entries", page_label: "Journal Entries", group: "Accounting" },
    { page_key: "/accounting/sales-profit-report", page_label: "Sales Profit Report", group: "Accounting" },

    // Reporting
    { page_key: "/reporting/outstanding", page_label: "Outstanding", group: "Reporting" },
    { page_key: "/reporting/sales-register", page_label: "Sales Register", group: "Reporting" },
    { page_key: "/reporting/purchase-register", page_label: "Purchase Register", group: "Reporting" },
    { page_key: "/reporting/sales-return-register", page_label: "Sales Return Register", group: "Reporting" },
    { page_key: "/reporting/purchase-return-register", page_label: "Purchase Return Register", group: "Reporting" },
    { page_key: "/reporting/due-payment", page_label: "Due Payment", group: "Reporting" },
  ];

  // Filter out Employee Management pages - employees shouldn't have access to manage other employees
  return pages.filter(p => !p.page_key.includes("/employee-management"));
};

// ── Main permissions page ───────────────────────────────────────────────────
export default function EmployeePermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employeeName, setEmployeeName] = useState("");
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await Get(`pos/employees/${id}/permissions/`) as any;
        const employee = res?.data?.data ?? res?.data ?? res;
        setEmployeeName(employee?.full_name || "");

        const existing: Record<string, any> = {};
        (employee?.permissions || []).forEach((p: any) => { existing[p.page_key] = p; });

        const merged = flattenMenu().map((p) => ({
          ...p,
          can_view: isActionAllowed(p.page_key, "can_view") ? (existing[p.page_key]?.can_view ?? false) : false,
          can_add: isActionAllowed(p.page_key, "can_add") ? (existing[p.page_key]?.can_add ?? false) : false,
          can_edit: isActionAllowed(p.page_key, "can_edit") ? (existing[p.page_key]?.can_edit ?? false) : false,
          can_delete: isActionAllowed(p.page_key, "can_delete") ? (existing[p.page_key]?.can_delete ?? false) : false,
        }));
        setRows(merged);
      } catch {
        toasterrormsg("Failed to load employee permissions");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const toggle = (page_key: string, field: keyof PermissionRow) => {
    if (field !== "page_key" && field !== "page_label" && field !== "group") {
      if (!isActionAllowed(page_key, field as ActionField)) return;
    }

    setRows((prev) => prev.map((r) => {
      if (r.page_key !== page_key) return r;
      const updated = { ...r, [field]: !r[field] };
      if (field !== "can_view" && updated[field]) updated.can_view = true;
      if (field === "can_view" && !updated.can_view) {
        updated.can_add = false;
        updated.can_edit = false;
        updated.can_delete = false;
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Post(`pos/employees/${id}/permissions/`, {
        permissions: rows.map(({ page_key, page_label, can_view, can_add, can_edit, can_delete }) =>
          ({ page_key, page_label, can_view, can_add, can_edit, can_delete })),
      });
      toastsuccessmsg("Permissions updated successfully");
      navigate("/employee-management/employee-master");
    } catch {
      toasterrormsg("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(() => {
    return rows.reduce<Record<string, PermissionRow[]>>((acc, row) => {
      acc[row.group] = acc[row.group] || [];
      acc[row.group].push(row);
      return acc;
    }, {});
  }, [rows]);

  const renderCell = (row: PermissionRow, field: ActionField) => {
    if (!isActionAllowed(row.page_key, field)) {
      return <span className="text-gray-400 dark:text-dark-500 select-none">—</span>;
    }
    return (
      <div className="flex justify-center">
        <Checkbox
          checked={row[field]}
          onChange={() => toggle(row.page_key, field)}
          color="primary"
          variant="basic"
        />
      </div>
    );
  };

  return (
    <Page title="Employee Permissions">
      <div className="transition-content w-full pb-5">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Set Access — {employeeName}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Configure page-level permissions for this employee
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={() => navigate("/employee-management/employee-master")}
            >
              <ArrowLeftIcon className="size-4" />
              <span>Back</span>
            </Button>
            <Button
              color="primary"
              className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="size-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="size-4" />
                  <span>Save Access</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="px-(--margin-x) pt-4">
          <Card className="relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <ArrowPathIcon className="size-6 animate-spin text-primary-500 mb-3" />
                <span className="text-sm text-gray-500 dark:text-dark-400">Loading permissions...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table hoverable className="w-full">
                  <THead>
                    <Tr>
                      <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg whitespace-nowrap">
                        Menu
                      </Th>
                      <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg whitespace-nowrap">
                        Page
                      </Th>
                      <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg whitespace-nowrap text-center w-24">
                        View
                      </Th>
                      <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg whitespace-nowrap text-center w-24">
                        Add
                      </Th>
                      <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg whitespace-nowrap text-center w-24">
                        Edit
                      </Th>
                      <Th className="dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg whitespace-nowrap text-center w-24">
                        Delete
                      </Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {Object.entries(grouped).map(([group, items]) =>
                      items.map((row, idx) => (
                        <Tr key={row.page_key} className="dark:border-b-dark-500 border-b border-gray-200">
                          {idx === 0 && (
                            <Td
                              className="bg-white dark:bg-dark-900 p-3 font-semibold text-gray-800 dark:text-dark-100 align-top"
                              rowSpan={items.length}
                            >
                              {group}
                            </Td>
                          )}
                          <Td className="bg-white dark:bg-dark-900 p-3 text-gray-800 dark:text-dark-100">
                            {row.page_label}
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 p-3 text-center">
                            {renderCell(row, "can_view")}
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 p-3 text-center">
                            {renderCell(row, "can_add")}
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 p-3 text-center">
                            {renderCell(row, "can_edit")}
                          </Td>
                          <Td className="bg-white dark:bg-dark-900 p-3 text-center">
                            {renderCell(row, "can_delete")}
                          </Td>
                        </Tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="px-(--margin-x) pt-4 flex justify-end gap-2">
          <Button
            variant="outlined"
            className="h-9 gap-2 rounded-md px-3 text-sm"
            onClick={() => navigate("/employee-management/employee-master")}
          >
            <ArrowLeftIcon className="size-4" />
            <span>Back</span>
          </Button>
          <Button
            color="primary"
            className="h-9 gap-2 rounded-md px-4 text-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <ArrowPathIcon className="size-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckIcon className="size-4" />
                <span>Save Access</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Page>
  );
}
