import React, { useMemo } from "react";
import { type ColumnDef, type SortingState, flexRender, getCoreRowModel, useReactTable, type RowSelectionState, type ColumnPinningState } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";

export interface ColumnConfig<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  cell?: (value: any, row: T) => React.ReactNode;
  className?: string;
  width?: string;
  hide?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
}

export interface TableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];

  // State
  sorting?: SortingState;
  pagination?: PaginationInfo;
  isLoading?: boolean;
  rowSelection?: RowSelectionState;

  // Handlers
  onSortingChange?: (sorting: SortingState) => void;
  onPageChange?: (page: number) => void;
  onRowSelectionChange?: (state: RowSelectionState) => void;

  // UI
  emptyMessage?: string;
  className?: string;
  columnPinning?: ColumnPinningState;
}

function DataTable<T extends Record<string, any>>(props: TableProps<T>) {
  const {
    data,
    columns,
    sorting = [],
    pagination,
    isLoading = false,
    rowSelection = {},
    onSortingChange,
    onPageChange,
    onRowSelectionChange,
    emptyMessage = "No results found.",
    className,
    columnPinning,
  } = props;

  const resolvedPinning: ColumnPinningState = {
    left: columnPinning?.left ?? [],
    right: columnPinning?.right ?? [],
  };
  const lastSelectedIndexRef = React.useRef<number | null>(null);
  const [columnSizing, setColumnSizing] = React.useState<Record<string, number>>({});
  const selectionEnabled = !!onRowSelectionChange;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;
  const selectedCount = Object.keys(rowSelection).length;

  const getRowId = (row: T) => row.id?.toString?.() ?? "";

  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];
    if (selectionEnabled) {
      cols.push({
        id: "select",
        header: ({ table }) => <SelectAllHeader table={table} />,
        cell: (cellCtx) => <SelectCell {...cellCtx} rowSelection={rowSelection} setRowSelection={onRowSelectionChange!} lastSelectedIndexRef={lastSelectedIndexRef} />,
        enableSorting: false,
        enableHiding: false,
      });
    }
    columns.forEach((col) => {
      const columnDef: ColumnDef<T> = {
        accessorKey: col.key as string,
        header:
          col.sortable === true
            ? (_header) => (
                <SortableHeader
                  label={col.header}
                  sorted={sorting.find((s) => s.id === col.key)?.desc ?? undefined}
                  onClick={() => {
                    if (!onSortingChange) return;
                    const currentSort = sorting.find((s) => s.id === col.key);
                    if (!currentSort) onSortingChange([{ id: col.key as string, desc: false }]);
                    else if (!currentSort.desc) onSortingChange([{ id: col.key as string, desc: true }]);
                    else onSortingChange([]);
                  }}
                />
              )
            : col.header,
        cell: ({ row, getValue }) => (col.cell ? col.cell(getValue(), row.original) : String(getValue() ?? "")),
        enableSorting: false,
        enableHiding: col.hide !== true,
        meta: { hasExplicitWidth: !!col.width && col.width !== "shrink" },
      };
      if (col.width === "shrink") {
        columnDef.size = 1;
        columnDef.enableResizing = false;
      } else if (col.width) {
        columnDef.size = parseInt(col.width);
      }
      cols.push(columnDef);
    });
    return cols;
  }, [columns, selectionEnabled, sorting, onSortingChange, rowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    enableRowSelection: selectionEnabled,
    enableColumnResizing: true,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange?.(next);
    },
    state: { rowSelection, columnPinning: resolvedPinning, columnSizing },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
  });

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-md ring-1 ring-border">
        <Table className="w-full">
          <TableHeader className="[&_tr]:border-0 [&_tr_th:last-child]:border-r-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPinnedRight = header.column.getIsPinned?.() === "right";
                  const canResize = header.column.getCanResize?.();
                  const isShrink = header.column.getSize() === 1;
                  const hasExplicitWidth = (header.column.columnDef.meta as any)?.hasExplicitWidth;
                  return (
                    <TableHead
                      key={header.id}
                      className={`${isPinnedRight ? "sticky right-0 z-30 bg-background" : ""} ${canResize ? "group relative" : ""} ${isShrink ? "w-px whitespace-nowrap" : ""} border-b border-r border-border`}
                      style={canResize || hasExplicitWidth ? { width: header.column.getSize() } : {}}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {canResize && (
                        <div
                          onMouseDown={header.getResizeHandler?.()}
                          onTouchStart={header.getResizeHandler?.()}
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none transition group-hover:bg-gray-200"
                          style={{ zIndex: 50 }}
                        />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="[&_tr]:border-0 [&_tr:last-child_td]:border-b-0 [&_tr_td:last-child]:border-r-0">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => {
                    const isPinnedRight = cell.column.getIsPinned?.() === "right";
                    const isShrink = cell.column.getSize() === 1;
                    const hasExplicitWidth = (cell.column.columnDef.meta as any)?.hasExplicitWidth;
                    return (
                      <TableCell
                        key={cell.id}
                        className={`max-h-12.5 align-middle ${isPinnedRight ? "sticky right-0 z-20 bg-muted/30" : ""} ${isShrink ? "w-px whitespace-nowrap" : ""} border-b border-r border-border`}
                        style={cell.column.getCanResize() || hasExplicitWidth ? { width: `${cell.column.getSize()}px` } : {}}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(pagination && totalPages > 1) || (selectionEnabled && selectedCount > 0) ? (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex items-center space-x-4">
            {selectionEnabled && selectedCount > 0 ? <div className="text-sm text-muted-foreground">{selectedCount} row(s) selected</div> : null}
            {pagination ? (
              <div className="text-sm text-muted-foreground">
                Showing {data.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
            ) : null}
          </div>
          {pagination && totalPages > 1 && (
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex w-25 items-center justify-center text-sm font-medium">
                Page {pagination.page} of {totalPages || 1}
              </div>
              {onPageChange && (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= totalPages || isLoading}>
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default DataTable;

// --- Reusable helpers ---
function SortableHeader({ label, sorted, onClick }: { label: string; sorted?: boolean; onClick: () => void }) {
  const Icon = sorted === undefined ? ArrowUpDown : sorted ? ChevronDown : ChevronUp;
  return (
    <Button variant="ghost" onClick={onClick} className="h-auto justify-start p-0 font-medium hover:bg-transparent">
      {label}
      <Icon className="ml-1 size-3 opacity-60" />
    </Button>
  );
}

function SelectAllHeader({ table }: { table: any }) {
  return (
    <Checkbox
      checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() ? "indeterminate" : false)}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
    />
  );
}

function SelectCell({
  row,
  table,
  rowSelection,
  setRowSelection,
  lastSelectedIndexRef,
}: {
  row: any;
  table: any;
  rowSelection: RowSelectionState;
  setRowSelection: (s: RowSelectionState) => void;
  lastSelectedIndexRef: React.MutableRefObject<number | null>;
}) {
  const rowIndex = row.index;
  return (
    <Checkbox
      checked={row.getIsSelected()}
      aria-label="Select row"
      onPointerDown={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.shiftKey && lastSelectedIndexRef) {
          const allRows = table.getRowModel().rows;
          const last = lastSelectedIndexRef.current;
          if (last !== null && last !== rowIndex) {
            const [start, end] = last < rowIndex ? [last, rowIndex] : [rowIndex, last];
            const newSelection: RowSelectionState = { ...rowSelection };
            for (let i = start; i <= end; i++) {
              const id = allRows[i]?.id;
              if (id) newSelection[id] = true;
            }
            setRowSelection(newSelection);
            row.toggleSelected(true);
          } else {
            row.toggleSelected();
          }
        } else {
          row.toggleSelected();
        }
        lastSelectedIndexRef.current = rowIndex;
      }}
    />
  );
}
