import { useState, useEffect } from "react";
import { notification } from "@/components/base/notification";
import { ShowConfirm } from "@/components/base/dialog/show-confirm";
import { type FieldSchema } from "./types";
import { type EditContext } from "./column-factory";

interface UseTableCrudOptions<T, F> {
  fetchData: (params: { page: number; limit: number; sorting: { id: string; desc: boolean }[]; filters: F[] }) => Promise<{ data: T[]; pagination: any }>;
  createItem?: (values: Partial<T>) => Promise<any>;
  updateItem?: (id: any, values: Partial<T>) => Promise<any>;
  deleteItem?: (id: any) => Promise<any>;
  defaultFilters?: F[];
  defaultPagination?: { page: number; limit: number };
  confirmDeleteMessage?: (item: T) => string;
  schema?: FieldSchema[];
}

function castingValue(values: Record<string, any>, schema?: FieldSchema[]): Record<string, any> {
  const fieldTypes: Record<string, string> = {};
  const inputTypes: Record<string, string> = {};
  if (schema) {
    for (const f of schema) {
      fieldTypes[f.id] = f.type;
      inputTypes[f.id] = f.inputType;
    }
  }
  const casted: Record<string, any> = {};
  for (const key in values) {
    const type = fieldTypes[key];
    const inputType = inputTypes[key];
    let val = (values as any)[key];
    if (val === undefined || val === null) {
      casted[key] = val;
      continue;
    }

    if (inputType === "autocomplete") {
      val = val.value ? val.value : val;
    }

    switch (type) {
      case "string":
        casted[key] = String(val);
        break;
      case "number":
      case "int":
        casted[key] = Number.isNaN(Number(val)) ? null : parseInt(val, 10);
        break;
      case "float":
        casted[key] = Number.isNaN(Number(val)) ? null : parseFloat(val);
        break;
      case "boolean":
        casted[key] = val === true || val === "true" || val === 1 || val === "1";
        break;
      case "json":
        if (typeof val === "string") {
          try {
            casted[key] = JSON.parse(val);
          } catch {
            casted[key] = val;
          }
        } else {
          casted[key] = val;
        }
        break;
      default:
        casted[key] = val;
    }
  }
  return casted;
}

export function useTableCrud<T = any, F = any>({
  fetchData,
  createItem,
  updateItem,
  deleteItem,
  defaultFilters = [],
  defaultPagination = { page: 1, limit: 20 },
  confirmDeleteMessage,
  schema,
}: UseTableCrudOptions<T, F>) {
  const [data, setData] = useState<T[]>([]);
  const [filters, setFilters] = useState<F[]>(defaultFilters);
  const [tableState, setTableState] = useState({
    selectedRows: [],
    sorting: [] as { id: string; desc: boolean }[],
    pagination: { ...defaultPagination, total: 0 },
    isLoading: false,
  });
  const [editRowId, setEditRowId] = useState<any>(null);
  const [newRow, setNewRow] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);

  // Fetch data
  const doFetchData = async (params: { page: number; limit: number; sorting: any; filters: F[] }) => {
    setTableState((prev) => ({ ...prev, isLoading: true }));
    const response = await fetchData(params);
    setData(response.data);
    setTableState((prev) => ({ ...prev, pagination: response.pagination ?? tableState.pagination, isLoading: false }));
  };

  // Add new row logic
  const addNewRow = (defaults: Partial<T> = {}) => {
    if (newRow) return;
    setNewRow({ id: "new", ...defaults } as T);
    setEditRowId("new");
  };

  const validateRequredFields = (values: Partial<T>): string | null => {
    if (!schema) return null;
    for (const field of schema) {
      const value = (values as any)[field.id];

      if (field.type === "string" && field.required && (!value || String(value).trim() === "")) {
        return `Field "${field.label}" is required.`;
      } else if ((field.type === "number" || field.type === "int" || field.type === "float") && field.required && (value === null || value === undefined || value === "")) {
        return `Field "${field.label}" is required.`;
      } else if (field.type === "boolean" && field.required && (value === null || value === undefined)) {
        return `Field "${field.label}" is required.`;
      }
    }
    return null;
  };

  // Shared save logic
  const doSave = async (options: {
    id?: any;
    values: Partial<T>;
    apiFn: (id: any, values: Partial<T>) => Promise<any> | ((values: Partial<T>) => Promise<any>);
    isNew?: boolean;
    onSuccessMsg?: string;
    onErrorMsg?: string;
  }) => {
    const { id, values, apiFn, isNew, onSuccessMsg, onErrorMsg } = options;
    if (isNew) setCreating(true);
    const casted = castingValue(values as Record<string, any>, schema);
    const validationError = validateRequredFields(casted as Partial<T>);
    if (validationError) {
      notification.error(validationError);
      return;
    }
    let res = null;
    try {
      if (isNew) {
        res = await (apiFn as (values: Partial<T>) => Promise<any>)(casted as Partial<T>);
        setNewRow(null);
        setEditRowId(null);
      } else {
        res = await (apiFn as (id: any, values: Partial<T>) => Promise<any>)(id, casted as Partial<T>);
        setEditRowId(null);
      }
      const { pagination, sorting } = tableState;
      doFetchData({ page: pagination.page, limit: pagination.limit, sorting, filters });
      notification.success(onSuccessMsg || "Item saved");
    } catch {
      notification.error(onErrorMsg || "Failed to save item");
    } finally {
      if (isNew) setCreating(false);
    }
    return res;
  };

  const saveNewRow = async (values: Partial<T>) => {
    if (!createItem) return;
    return doSave({ values, apiFn: createItem, isNew: true, onSuccessMsg: "Item created", onErrorMsg: "Failed to create item" });
  };

  const cancelNewRow = () => {
    setNewRow(null);
    setEditRowId(null);
  };

  // Initial fetch
  useEffect(() => {
    const { pagination, sorting } = tableState;
    doFetchData({ page: pagination.page, limit: pagination.limit, sorting, filters: defaultFilters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleApplyFilter = (filter: F[]) => {
    setFilters(filter);
    setTableState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: 1 } }));
    doFetchData({ page: 1, limit: tableState.pagination.limit, sorting: tableState.sorting, filters: filter });
  };
  const handleSortingChange = (newSorting: { id: string; desc: boolean }[]) => {
    setTableState((prev) => ({ ...prev, sorting: newSorting, pagination: { ...prev.pagination, page: 1 } }));
    doFetchData({ page: 1, limit: tableState.pagination.limit, sorting: newSorting, filters });
  };
  const handlePageChange = (page: number) => {
    setTableState((prev) => ({ ...prev, pagination: { ...prev.pagination, page } }));
    doFetchData({ page, limit: tableState.pagination.limit, sorting: tableState.sorting, filters });
  };
  const handleSave = async (id: any, values: Partial<T>) => {
    if (!updateItem) return;
    return doSave({ id, values, apiFn: updateItem, isNew: false, onSuccessMsg: "Item updated", onErrorMsg: "Failed to update item" });
  };
  const handleDelete = async (id: any, item: T) => {
    if (!deleteItem) return;
    const message = confirmDeleteMessage ? confirmDeleteMessage(item) : "This action cannot be undone.";
    const confirmed = await ShowConfirm("Delete", message, { variant: "destructive" });
    if (!confirmed) return;
    try {
      await deleteItem(id);
      notification.success("Item deleted");
      const { pagination, sorting } = tableState;
      doFetchData({ page: pagination.page, limit: pagination.limit, sorting, filters });
    } catch {
      notification.error("Failed to delete item");
    }
  };

  // Compose table data: if newRow exists, put it at the top
  const tableData = newRow ? [newRow, ...data] : data;

  const editContext: EditContext<T> = {
    editRowId,
    setEditRowId,
    onSave: (id: any, values: Partial<T>) => {
      if (id === "new") return saveNewRow(values);
      return handleSave(id, values);
    },
    onDelete: handleDelete,
    onCancel: (id: any) => {
      if (id === "new") cancelNewRow();
      else setEditRowId(null);
    },
  };

  return {
    // Spread directly into <DataTable>
    tableProps: {
      data: tableData,
      sorting: tableState.sorting,
      pagination: tableState.pagination,
      isLoading: tableState.isLoading,
      onSortingChange: handleSortingChange,
      onPageChange: handlePageChange,
    },
    // Spread directly into <FilterPanel>
    filterProps: {
      handleApplyFilter,
    },
    // Pass to getColumns()
    editContext,
    // For conditional UI (emptyMessage text, add-button disabled state)
    filters,
    newRow,
    addNewRow,
    creating,
  };
}
