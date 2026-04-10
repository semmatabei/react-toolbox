import { useState, useEffect } from "react";
import { type FieldSchema } from "./crud-table";

interface UseTableCrudOptions<T, F> {
  fetchData: (params: { page: number; limit: number; sorting: any; filters: F[] }) => Promise<{ data: T[]; pagination: any }>;
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
    sorting: [],
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
      Notification.error(validationError);
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
      Notification.success(onSuccessMsg || "Item saved");
    } catch (e) {
      Notification.error(onErrorMsg || "Failed to save item");
    } finally {
      if (isNew) setCreating(false);
    }
    return res;
  };

  const saveNewRow = async (values: Partial<T>, createItem: (values: Partial<T>) => Promise<any>) => {
    return doSave({ values, apiFn: createItem, isNew: true, onSuccessMsg: "Item created", onErrorMsg: "Failed to create item" });
  };

  const cancelNewRow = () => {
    setNewRow(null);
    setEditRowId(null);
  };

  // Initial fetch
  useEffect(() => {
    const { pagination, sorting } = tableState;
    doFetchData({ page: pagination.page, limit: pagination.limit, sorting, filters });
  }, []);

  // Handlers
  const handleApplyFilter = (filter: F[]) => {
    setFilters(filter);
    setTableState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: 1 } }));
    doFetchData({ page: 1, limit: tableState.pagination.limit, sorting: tableState.sorting, filters: filter });
  };
  const handleSortingChange = (newSorting: any) => {
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
    const confirmed = await Confirm("Delete", confirmDeleteMessage(item) ?? "This action cannot be undone.", { mode: "destructive" });
    if (!confirmed) return;
    try {
      await deleteItem(id);
      Notification.success("Item deleted");
      const { pagination, sorting } = tableState;
      doFetchData({ page: pagination.page, limit: pagination.limit, sorting, filters });
    } catch (e) {
      Notification.error("Failed to delete item");
    }
  };

  // Compose table data: if newRow exists, put it at the top
  const tableData = newRow ? [newRow, ...data] : data;

  return {
    data: tableData,
    filters,
    tableState,
    editRowId,
    setEditRowId,
    handleApplyFilter,
    handleSortingChange,
    handlePageChange,
    handleSave,
    handleDelete,
    // new row logic
    newRow,
    addNewRow,
    saveNewRow,
    cancelNewRow,
    creating,
  };
}
