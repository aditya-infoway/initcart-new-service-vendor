import { WithIcon, type TabItem } from "@/components/ui/Tab";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
  CellContext,
  RowSelectionState,
} from "@tanstack/react-table";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Input } from "@/components/ui";
import { Delete, Get, toastsuccessmsg, toasterrormsg } from "@/ApiHelper";
import { 
  HomeIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  CubeIcon 
} from "@heroicons/react/24/outline";
import { MasterTable } from "@/app/pages/master/shared/MasterTable";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { ConfirmModal, type ConfirmMessages } from "@/components/shared/ConfirmModal";import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { Highlight } from "@/components/shared/Highlight";
import { ensureString } from "@/utils/ensureString";
import {
  Account,
  AccountTabKey,
  ACCOUNT_TABS,
  mapApiAccount,
} from "./data";
import { AccountDrawer } from "./AccountDrawer";

// ----------------------------------------------------------------------

const confirmMessages: ConfirmMessages = {
  pending: {
    title: "Delete Account",
    description: "Are you sure you want to delete this account? This action cannot be undone.",
    actionText: "Delete",
  },
  success: {
    title: "Account Deleted",
    description: "The account has been deleted successfully.",
    actionText: "Done",
  },
  error: {
    title: "Delete Failed",
    description: "Failed to delete the account. Please try again.",
    actionText: "Retry",
  },
};

// ── Row actions ─────────────────────────────────────────────────────────────
function AccountRowActions({
  account,
  onEdit,
  onDelete,
}: {
  account: Account;
  onEdit: (a: Account) => void;
  onDelete: (a: Account) => void;
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
          className="dark:border-dark-500 dark:bg-dark-750 absolute z-100 w-36 rounded-lg border border-gray-300 bg-white py-1 shadow-lg shadow-gray-200/50 outline-hidden dark:shadow-none"
        >
          <MenuItem>
            {({ focus }: { focus: boolean }) => (
              <button
                type="button"
                onClick={() => onEdit(account)}
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
                onClick={() => onDelete(account)}
                className={clsx(
                  "this:error text-this dark:text-this-light flex h-9 w-full items-center gap-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-this/10 dark:bg-this-light/10",
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

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AccountCreationPage() {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AccountTabKey>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Get("pos/account/", { page: 1, page_size: 200 }) as any;
      const body = res?.data ?? res;
      const rows: any[] = Array.isArray(body?.results)
        ? body.results
        : Array.isArray(body)
        ? body
        : [];
      setData(rows.map(mapApiAccount));
    } catch {
      toasterrormsg("Failed to fetch accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // ── Tab filtered data ────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (activeTab === "all") return data;
    return data.filter((item) => item.group === activeTab);
  }, [activeTab, data]);

  // ── Tab counts ───────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => ({
    all: data.length,
    "Sundry Creditor(Main)": data.filter((d) => d.group === "Sundry Creditor(Main)").length,
    Customer: data.filter((d) => d.group === "Customer").length,
    "Case In Hand": data.filter((d) => d.group === "Case In Hand").length,
  }), [data]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onEdit = useCallback((a: Account) => {
    setEditingAccount(a);
    setDrawerOpen(true);
  }, []);

  const onDelete = useCallback((a: Account) => {
    setDeleteTarget(a);
    setDeleteSuccess(false);
    setDeleteError(false);
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await Delete(`pos/account/${deleteTarget.id}/`, {});
      toastsuccessmsg("Account deleted successfully.");
      setData((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteSuccess(true);
    } catch (e: any) {
      toasterrormsg(
        e?.response?.data?.detail || e?.response?.data?.message || "Failed to delete account.",
      );
      setDeleteError(true);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Account>[]>(
    () => [
      {
        id: "select",
        header: SelectHeader,
        cell: SelectCell,
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        id: "srNo",
        header: "#",
        size: 55,
        cell: ({ row }: CellContext<Account, unknown>) => (
          <span className="text-gray-600 dark:text-dark-300">{row.index + 1}</span>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        id: "accountName",
        accessorKey: "accountName",
        header: "Account Name",
        cell: ({ getValue, table }: CellContext<Account, unknown>) => {
          const q = ensureString(table.getState().globalFilter);
          return (
            <span className="font-medium text-gray-900 dark:text-white">
              <Highlight query={q}>{String(getValue() ?? "—")}</Highlight>
            </span>
          );
        },
      },
      {
        id: "group",
        accessorKey: "group",
        header: "Group",
        cell: ({ getValue }: CellContext<Account, unknown>) => (
          <Badge color="primary" variant="soft">
            {String(getValue() ?? "—")}
          </Badge>
        ),
      },
      {
        id: "city",
        accessorKey: "city",
        header: "City",
        cell: ({ getValue }: CellContext<Account, unknown>) => (
          <span className="text-gray-600 dark:text-dark-200">{String(getValue() ?? "—")}</span>
        ),
      },
      {
        id: "state",
        accessorKey: "state",
        header: "State",
        cell: ({ getValue }: CellContext<Account, unknown>) => (
          <span className="text-gray-600 dark:text-dark-200">{String(getValue() ?? "—")}</span>
        ),
      },
      {
        id: "mobile",
        accessorKey: "mobile",
        header: "Mobile No.",
        cell: ({ getValue }: CellContext<Account, unknown>) => {
          const v = String(getValue() ?? "");
          if (!v) return <span className="text-gray-400">—</span>;
          return (
            <a href={`tel:${v}`} className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
              {v}
            </a>
          );
        },
      },
      {
        id: "openingBalance",
        accessorKey: "openingBalance",
        header: "Opening Balance",
        cell: ({ row }: CellContext<Account, unknown>) => (
          <span className="text-gray-700 dark:text-dark-200">
            ₹{row.original.openingBalance}{" "}
            <span className={clsx(
              "text-xs font-semibold",
              row.original.drcr === "Dr" ? "text-success-600" : "text-error-600",
            )}>
              {row.original.drcr}
            </span>
          </span>
        ),
      },
      {
        id: "currentBalance",
        accessorKey: "currentBalance",
        header: "Current Balance",
        cell: ({ row }: CellContext<Account, unknown>) => (
          <span className="text-gray-700 dark:text-dark-200">
            ₹{row.original.currentBalance}{" "}
            <span className={clsx(
              "text-xs font-semibold",
              row.original.currentDrcr === "Dr" ? "text-success-600" : "text-error-600",
            )}>
              {row.original.currentDrcr}
            </span>
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        size: 60,
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }: CellContext<Account, unknown>) => (
          <div className="flex justify-center">
            <AccountRowActions
              account={row.original}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, sorting, rowSelection },
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
    <Page title="Account List">
      <div className="transition-content w-full pb-5">

        {/* Toolbar */}
        <div className="px-(--margin-x) flex flex-wrap items-center justify-between gap-4 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Account List
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              {data.length} account{data.length === 1 ? "" : "s"} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              className="h-9 gap-2 rounded-md px-3 text-sm"
              onClick={fetchAccounts}
              disabled={loading}
            >
              <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button
              color="primary"
              className="h-9 gap-2 rounded-md px-4 text-sm"
              onClick={() => { setEditingAccount(null); setDrawerOpen(true); }}
            >
              <PlusIcon className="size-4" />
              <span>Add Account</span>
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
            placeholder="Search accounts..."
          />
        </div>

        {/* Tab filters + table */}
        <div className="px-(--margin-x) pt-4">
          <WithIcon
            tabs={ACCOUNT_TABS.map((tab) => {
              // Map appropriate icons based on tab type
              const getIcon = () => {
                switch(tab.key) {
                  case "all": return HomeIcon;
                  case "Sundry Creditor(Main)": return BuildingOfficeIcon;
                  case "Customer": return UserGroupIcon;
                  case "Case In Hand": return CubeIcon;
                  default: return HomeIcon;
                }
              };
              
              return {
                id: tab.key,
                title: `${tab.title} (${tabCounts[tab.key as keyof typeof tabCounts] ?? 0})`,
                icon: getIcon(),
                content: (
                  <MasterTable
                    table={table}
                    columnCount={columns.length}
                    emptyMessage={loading ? "Loading accounts..." : "No accounts found."}
                  />
                ),
              };
            })}
            selectedIndex={ACCOUNT_TABS.findIndex((t) => t.key === activeTab)}
            onChange={(idx) => {
              setActiveTab(ACCOUNT_TABS[idx].key);
              setRowSelection({});
            }}
          />
        </div>
      </div>

      {/* Add / Edit Drawer */}
      <AccountDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        account={editingAccount}
        onSaved={fetchAccounts}
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
