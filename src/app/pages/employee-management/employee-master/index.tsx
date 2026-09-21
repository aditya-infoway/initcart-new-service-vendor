import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, SortingState, useReactTable, flexRender,
  ColumnDef, CellContext, RowSelectionState,
} from "@tanstack/react-table";
import {
  Menu, MenuButton, MenuItem, MenuItems, Transition,
} from "@headlessui/react";
import {
  ArrowPathIcon, KeyIcon, MagnifyingGlassIcon, PencilIcon,
  PlusIcon, TrashIcon, EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { Get, Post, Delete, toasterrormsg, toastsuccessmsg } from "@/ApiHelper";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import { EmployeeDrawer } from "./employee-drawer";
import { ConfirmModal, type ConfirmMessages } from "@/components/shared/ConfirmModal";

// ── Types ──────────────────────────────────────────────────────────────────
interface Employee {
  id: number;
  full_name: string;
  mobile: string;
  email: string;
  city: string;
  department: string;
  status: string;
}

const DEPARTMENT_LABEL: Record<string, string> = {
  purchase: "Purchase Department",
  sales: "Sales Department",
  accounting: "Accounting Department",
};

const STATUS_COLOR: Record<string, "info" | "success" | "warning" | "error"> = {
  active: "success",
  inactive: "error",
  pending: "warning",
};

const confirmMessages: ConfirmMessages = {
  pending: {
    title: "Delete Employee",
    description: "Are you sure you want to delete this employee? Login access will be revoked.",
    actionText: "Delete",
  },
  success: {
    title: "Employee Deleted",
    description: "The employee has been deleted successfully.",
    actionText: "Done",
  },
  error: {
    title: "Delete Failed",
    description: "Failed to delete the employee. Please try again.",
    actionText: "Retry",
  },
};

// ── Row actions ─────────────────────────────────────────────────────────────
function EmployeeRowActions({
  employee,
  onEdit,
  onDelete,
  onPermissions,
}: {
  employee: Employee;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
  onPermissions: (e: Employee) => void;
}) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton as={Button} isIcon className="size-8 rounded-full">
        <EllipsisHorizontalIcon className="size-4.5" />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out"
        enterFrom="opacity-0 translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-2"
      >
        <MenuItems
          anchor={{ to: "bottom end", gap: 8 }}
          className="dark:border-dark-500 dark:bg-dark-750 absolute z-100 w-40 rounded-lg border border-gray-300 bg-white py-1 shadow-lg shadow-gray-200/50 outline-hidden dark:shadow-none"
        >
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button
                type="button"
                onClick={() => onPermissions(employee)}
                className={clsx(
                  "flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-dark-100",
                )}
              >
                <KeyIcon className="size-4.5 stroke-1" />
                <span>Set Access</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button
                type="button"
                onClick={() => onEdit(employee)}
                className={clsx(
                  "flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-dark-100",
                )}
              >
                <PencilIcon className="size-4.5 stroke-1" />
                <span>Edit</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button
                type="button"
                onClick={() => onDelete(employee)}
                className={clsx(
                  "text-error-600 dark:text-error-400 flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-error-50 dark:bg-error-900/20",
                )}
              >
                <TrashIcon className="size-4.5 stroke-1" />
                <span>Delete</span>
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}

// ── Main list page ─────────────────────────────────────────────────────────
export default function EmployeeMasterPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | undefined>();

  // Delete states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/employees/", { page: 1, page_size: 1000 }) as any;
      const data = res?.data?.data ?? res?.data?.results ?? res?.data ?? res ?? [];
      const items = Array.isArray(data) ? data : [];
      setRows(items);
    } catch {
      toasterrormsg("Could not load employees.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onEdit = useCallback((emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setDrawerOpen(true);
  }, []);

  const onPermissions = useCallback((emp: Employee) => {
    navigate(`/employee-management/employee-master/${emp.id}/permissions`);
  }, [navigate]);

  const onDelete = useCallback((emp: Employee) => {
    setDeleteTarget(emp);
    setDeleteSuccess(false);
    setDeleteError(false);
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);

    try {
      await Delete(`pos/employees/${deleteTarget.id}/`, {});

      toastsuccessmsg("Employee deleted successfully");
      setRows((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteSuccess(true);
    } catch {
      toasterrormsg("Failed to delete employee");
      setDeleteError(true);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget]);

  const columns = useMemo<ColumnDef<Employee>[]>(() => [
    {
      id: "select",
      header: SelectHeader,
      cell: SelectCell,
      enableSorting: false,
      enableGlobalFilter: false,
    },
    {
      id: "srNo", header: "#", size: 55,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<Employee, unknown>) => (
        <span className="text-gray-600 dark:text-dark-300">{row.index + 1}</span>
      ),
    },
    {
      id: "full_name", accessorKey: "full_name", header: "Full Name",
      cell: ({ getValue, table }: CellContext<Employee, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        const value = String(getValue() ?? "—");
        return (
          <span className="font-medium text-gray-800 dark:text-dark-100">
            <Highlight query={q}>{value}</Highlight>
          </span>
        );
      },
    },
    {
      id: "mobile", accessorKey: "mobile", header: "Mobile",
      cell: ({ getValue, table }: CellContext<Employee, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        const value = String(getValue() ?? "—");
        return (
          <span className="text-gray-600 dark:text-dark-300">
            <Highlight query={q}>{value}</Highlight>
          </span>
        );
      },
    },
    {
      id: "email", accessorKey: "email", header: "Login Email",
      cell: ({ getValue, table }: CellContext<Employee, unknown>) => {
        const q = ensureString(table.getState().globalFilter);
        const value = String(getValue() ?? "—");
        return (
          <span className="text-gray-600 dark:text-dark-300 text-sm">
            <Highlight query={q}>{value}</Highlight>
          </span>
        );
      },
    },
    {
      id: "department", accessorKey: "department", header: "Department",
      cell: ({ getValue }: CellContext<Employee, unknown>) => {
        const dept = getValue() as string;
        const label = DEPARTMENT_LABEL[dept] || dept;
        return (
          <Badge color="info" variant="soft" className="text-xs">
            {label}
          </Badge>
        );
      },
    },
    {
      id: "city", accessorKey: "city", header: "City",
      cell: ({ getValue }: CellContext<Employee, unknown>) => {
        const city = getValue() as string;
        return <span className="text-gray-600 dark:text-dark-300">{city || "-"}</span>;
      },
    },
    {
      id: "status", accessorKey: "status", header: "Status",
      cell: ({ getValue }: CellContext<Employee, unknown>) => {
        const status = getValue() as string;
        return (
          <Badge color={STATUS_COLOR[status] || "info"} variant="soft" className="text-xs font-medium">
            {status || "active"}
          </Badge>
        );
      },
    },
    {
      id: "actions", header: "Action", size: 60,
      enableSorting: false, enableGlobalFilter: false,
      cell: ({ row }: CellContext<Employee, unknown>) => (
        <div className="flex justify-center">
          <EmployeeRowActions
            employee={row.original}
            onEdit={onEdit}
            onDelete={onDelete}
            onPermissions={onPermissions}
          />
        </div>
      ),
    },
  ], [onEdit, onDelete, onPermissions]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, rowSelection },
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const deleteState = deleteError ? "error" : deleteSuccess ? "success" : "pending";

  return (
    <Page title="Employee Master">
      <div className="transition-content w-full pb-5">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Employee Master
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              {rows.length} employee{rows.length === 1 ? "" : "s"} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchRows}
              disabled={loading}
            >
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button
              color="primary"
              className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => {
                setEditingEmployeeId(undefined);
                setDrawerOpen(true);
              }}
            >
              <PlusIcon className="size-4" />
              <span>Add Employee</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-(--margin-x) mt-2 max-w-sm">
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            classNames={{ input: "ring-primary-500/50 h-9 text-sm focus:ring-3" }}
            placeholder="Search by name, mobile, email, department or city..."
          />
        </div>

        {/* Table */}
        <div className=" pt-4">
          <MasterTable
            table={table}
            columnCount={columns.length}
            emptyMessage={loading ? "Loading employees..." : globalFilter ? "No employees match your search" : "No employees found."}
          />
        </div>
      </div>

      {/* Employee Drawer */}
      <EmployeeDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingEmployeeId(undefined);
        }}
        employeeId={editingEmployeeId}
        onSuccess={fetchRows}
      />

      {/* Delete confirm modal */}
      <ConfirmModal
        show={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        messages={confirmMessages}
        state={deleteState}
        onOk={handleDelete}
        confirmLoading={deleteLoading}
      />
    </Page>
  );
}
