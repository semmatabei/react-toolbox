/**
 * view-table — read-only table wrapper built on top of DataTable.
 *
 * Features (same as crud-table minus inline editing):
 *   - Schema-driven columns via `columnViewCreator`
 *   - Filter bar via `FilterCreator`
 *   - Server-side pagination + sorting via `useTableView`
 *   - Optional row selection
 *   - Optional row click handler
 */

import { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { type FieldSchema } from "./types";
import type { ColumnConfig } from "./data-table";

export type { FieldSchema, FilterCondition } from "./types";
export { filterOperators } from "./types";
export { FilterCreator } from "./filter-creator";
export { default as DataTable } from "./data-table";

// ─────────────────────────────────────────────────────────────────────────────
// columnViewCreator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a `ColumnConfig[]` from a `FieldSchema[]`.
 * No edit mode, no actions column — purely for display.
 *
 * Optional `customRender` lets callers override individual cell renderers.
 */
export function columnViewCreator<T extends Record<string, any>>(schema: FieldSchema[], customRender: Partial<Record<string, (value: any, row: T) => React.ReactNode>> = {}): ColumnConfig<T>[] {
  return schema.map((field) => ({
    key: field.id as keyof T,
    header: field.label,
    sortable: field.sortable,
    width: field.width,
    cell: (value: any, row: T): React.ReactNode => {
      if (customRender[field.id]) return customRender[field.id]!(value, row);

      const viewValue = field.viewValue ? field.viewValue(value, row) : value;

      if (field.type === "boolean") {
        return (
          <div className="flex justify-center">
            <Checkbox checked={!!value} disabled />
          </div>
        );
      }

      return (
        <div
          title={typeof viewValue === "string" ? viewValue : undefined}
          className={`overflow-hidden text-ellipsis whitespace-nowrap ${field.type === "number" || field.type === "int" || field.type === "float" ? "text-right" : "text-left"}`}
        >
          {(viewValue as React.ReactNode) ?? ""}
        </div>
      );
    },
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// useTableView
// ─────────────────────────────────────────────────────────────────────────────

interface UseTableViewOptions<T, F> {
  fetchData: (params: { page: number; limit: number; sorting: { id: string; desc: boolean }[]; filters: F[] }) => Promise<{ data: T[]; pagination: any }>;
  defaultFilters?: F[];
  defaultPagination?: { page: number; limit: number };
  onRowClick?: (row: T) => void;
}

/**
 * Orchestration hook for the view table — handles data fetching,
 * sorting, pagination, and filters. No create / update / delete.
 */
export function useTableView<T = any, F = any>({ fetchData, defaultFilters = [], defaultPagination = { page: 1, limit: 20 } }: UseTableViewOptions<T, F>) {
  const [data, setData] = useState<T[]>([]);
  const [filters, setFilters] = useState<F[]>(defaultFilters);
  const [tableState, setTableState] = useState({
    sorting: [] as { id: string; desc: boolean }[],
    pagination: { ...defaultPagination, total: 0 },
    isLoading: false,
  });

  const doFetch = useCallback(
    async (params: { page: number; limit: number; sorting: { id: string; desc: boolean }[]; filters: F[] }) => {
      setTableState((prev) => ({ ...prev, isLoading: true }));
      try {
        const response = await fetchData(params);
        setData(response.data);
        setTableState((prev) => ({ ...prev, pagination: response.pagination ?? prev.pagination, isLoading: false }));
      } catch {
        setTableState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [fetchData],
  );

  // Initial fetch
  useEffect(() => {
    doFetch({ page: defaultPagination.page, limit: defaultPagination.limit, sorting: [], filters: defaultFilters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilter = (newFilters: F[]) => {
    setFilters(newFilters);
    doFetch({ page: 1, limit: tableState.pagination.limit, sorting: tableState.sorting, filters: newFilters });
    setTableState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: 1 } }));
  };

  const handleSortingChange = (newSorting: { id: string; desc: boolean }[]) => {
    setTableState((prev) => ({ ...prev, sorting: newSorting, pagination: { ...prev.pagination, page: 1 } }));
    doFetch({ page: 1, limit: tableState.pagination.limit, sorting: newSorting, filters });
  };

  const handlePageChange = (page: number) => {
    setTableState((prev) => ({ ...prev, pagination: { ...prev.pagination, page } }));
    doFetch({ page, limit: tableState.pagination.limit, sorting: tableState.sorting, filters });
  };

  return {
    /** Spread directly into `<DataTable>` */
    tableProps: {
      data,
      sorting: tableState.sorting,
      pagination: tableState.pagination,
      isLoading: tableState.isLoading,
      onSortingChange: handleSortingChange,
      onPageChange: handlePageChange,
    },
    /** Spread directly into `<FilterPanel>` */
    filterProps: {
      handleApplyFilter,
    },
    /** Current active filters — useful for empty-message copy */
    filters,
  };
}
