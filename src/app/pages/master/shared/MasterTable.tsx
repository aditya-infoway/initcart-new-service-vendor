import {
  flexRender,
  Table as TanstackTable,
} from "@tanstack/react-table";
import clsx from "clsx";

import { PaginationSection } from "@/components/shared/table/PaginationSection";
import { SelectedRowsActions } from "@/components/shared/table/SelectedRowsActions";
import { TableSortIcon } from "@/components/shared/table/TableSortIcon";
import { Card, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { useThemeContext } from "@/app/contexts/theme/context";

interface MasterTableProps<T> {
  table: TanstackTable<T>;
  columnCount: number;
  emptyMessage: string;
}

export function MasterTable<T>({
  table,
  columnCount,
  emptyMessage,
}: MasterTableProps<T>) {
  const { cardSkin } = useThemeContext();

  return (
    <div className="px-(--margin-x) pt-4">
      <Card className="relative overflow-hidden">
        <SelectedRowsActions table={table} />
        <div className="table-wrapper min-w-full overflow-x-auto">
          <Table hoverable className="w-full text-left rtl:text-right">
            <THead>
              {table.getHeaderGroups().map((headerGroup) => (
                <Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Th
                      key={header.id}
                      className="dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg"
                    >
                      {header.column.getCanSort() ? (
                        <div
                          className="flex cursor-pointer items-center gap-3 select-none"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                          <TableSortIcon sorted={header.column.getIsSorted()} />
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </Th>
                  ))}
                </Tr>
              ))}
            </THead>
            <TBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <Tr
                    key={row.id}
                    className={clsx(
                      "dark:border-b-dark-500 border-b border-gray-200",
                      row.getIsSelected() &&
                        "bg-primary-500/5 dark:bg-primary-500/10",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        className={clsx(
                          "bg-white",
                          cardSkin === "shadow"
                            ? "dark:bg-dark-700"
                            : "dark:bg-dark-900",
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Td>
                    ))}
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td
                    colSpan={columnCount}
                    className="py-10 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </Td>
                </Tr>
              )}
            </TBody>
          </Table>
        </div>

        {table.getRowModel().rows.length > 0 && (
          <div className="px-4 pb-4 pt-4 sm:px-5">
            <PaginationSection table={table} />
          </div>
        )}
      </Card>
    </div>
  );
}
