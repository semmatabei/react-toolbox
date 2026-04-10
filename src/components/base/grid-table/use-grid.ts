import { useState, useCallback, useMemo, createContext, useContext } from "react";
import { tables as initialTables } from "./mock-db";
import type { ColumnDef, FilterCondition } from "./mock-db";

export interface SortCondition {
  id: string;
  field: string;
  direction: "asc" | "desc";
}

export interface GroupCondition {
  id: string;
  field: string;
  direction: "asc" | "desc";
}

export interface GroupHeaderRow {
  __isGroupHeader: true;
  __groupField: string;
  __groupValue: string;
  __groupCount: number;
  __groupDepth: number;
  __groupKey: string;
}

export type GridState = ReturnType<typeof useGridState>;

const GridContext = createContext<GridState | null>(null);

export const GridProvider = GridContext.Provider;

export function useGrid(): GridState {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error("useGrid must be used within GridProvider");
  return ctx;
}

export function useGridState() {
  const tableDef = initialTables[0];
  const [rows, setRows] = useState<Record<string, any>[]>([...tableDef.rows]);
  const [columns, setColumns] = useState<ColumnDef[]>([...tableDef.columns]);

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sorts, setSorts] = useState<SortCondition[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "any">("all");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [frozenColumnCount, setFrozenColumnCount] = useState(0);
  const [groups, setGroups] = useState<GroupCondition[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const activeTableDef = tableDef;
  const activeTable = { ...activeTableDef, columns, rows };

  const selectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
    setInspectorOpen(true);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    setSelectedRowId(null);
  }, []);

  const addSort = useCallback(() => {
    const usedFields = new Set(sorts.map((s) => s.field));
    const available = activeTable.columns.find((c) => !usedFields.has(c.id));
    if (!available) return;
    setSorts((prev) => [...prev, { id: crypto.randomUUID(), field: available.id, direction: "asc" }]);
  }, [sorts, activeTable.columns]);

  const addSortForField = useCallback((field: string, direction: "asc" | "desc") => {
    setSorts((prev) => {
      const existing = prev.find((s) => s.field === field);
      if (existing) {
        return prev.map((s) => (s.id === existing.id ? { ...s, direction } : s));
      }
      return [...prev, { id: crypto.randomUUID(), field, direction }];
    });
  }, []);

  const updateSort = useCallback((id: string, updates: Partial<SortCondition>) => {
    setSorts((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const removeSort = useCallback((id: string) => {
    setSorts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleColumn = useCallback((columnId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  }, []);

  const addFilter = useCallback(() => {
    const firstCol = activeTable.columns[0];
    setFilters((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field: firstCol?.id || "",
        operator: "is",
        value: "",
      },
    ]);
  }, [activeTable]);

  const updateFilter = useCallback((id: string, updates: Partial<FilterCondition>) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const applyFilter = useCallback((row: Record<string, any>, condition: FilterCondition): boolean => {
    const val = String(row[condition.field] ?? "").toLowerCase();
    const target = condition.value.toLowerCase();
    switch (condition.operator) {
      case "is":
        return val === target;
      case "is_not":
        return val !== target;
      case "contains":
        return val.includes(target);
      case "not_contains":
        return !val.includes(target);
      case "is_empty":
        return val === "";
      case "is_not_empty":
        return val !== "";
      case "gt":
        return Number(row[condition.field]) > Number(condition.value);
      case "lt":
        return Number(row[condition.field]) < Number(condition.value);
      default:
        return true;
    }
  }, []);

  const filteredRows = useMemo(() => {
    const activeFilters = filters.filter((f) => f.field && (f.operator === "is_empty" || f.operator === "is_not_empty" || f.value));
    if (activeFilters.length === 0) return activeTable.rows;
    return activeTable.rows.filter((row) => {
      if (filterMode === "all") return activeFilters.every((f) => applyFilter(row, f));
      return activeFilters.some((f) => applyFilter(row, f));
    });
  }, [activeTable.rows, filters, filterMode, applyFilter]);

  const sortedRows = useMemo(() => {
    if (sorts.length === 0) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      for (const sort of sorts) {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""), undefined, { numeric: true });
        if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredRows, sorts]);

  const groupedRows = useMemo((): (Record<string, any> | GroupHeaderRow)[] => {
    if (groups.length === 0) return sortedRows;

    const sorted = [...sortedRows].sort((a, b) => {
      for (const group of groups) {
        const aVal = a[group.field];
        const bVal = b[group.field];
        const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""), undefined, { numeric: true });
        if (cmp !== 0) return group.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });

    const result: (Record<string, any> | GroupHeaderRow)[] = [];
    const buildGroups = (rows: Record<string, any>[], depth: number, parentKey: string) => {
      if (depth >= groups.length) {
        rows.forEach((r) => result.push(r));
        return;
      }
      const group = groups[depth];
      const buckets = new Map<string, Record<string, any>[]>();
      rows.forEach((r) => {
        const key = String(r[group.field] ?? "");
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(r);
      });

      for (const [value, bucketRows] of buckets) {
        const groupKey = `${parentKey}/${group.field}:${value}`;
        result.push({
          __isGroupHeader: true,
          __groupField: group.field,
          __groupValue: value,
          __groupCount: bucketRows.length,
          __groupDepth: depth,
          __groupKey: groupKey,
        } as GroupHeaderRow);
        if (!collapsedGroups.has(groupKey)) {
          buildGroups(bucketRows, depth + 1, groupKey);
        }
      }
    };

    buildGroups(sorted, 0, "");
    return result;
  }, [sortedRows, groups, collapsedGroups]);

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const orderedColumns = useMemo(() => {
    if (!columnOrder) return columns;
    const map = new Map(columns.map((c) => [c.id, c]));
    return columnOrder.map((id) => map.get(id)).filter(Boolean) as ColumnDef[];
  }, [columns, columnOrder]);

  const visibleColumns = orderedColumns.filter((c) => !hiddenColumns.has(c.id));

  const selectedRow = selectedRowId ? rows.find((r) => r.id === selectedRowId) || null : null;

  const editCell = useCallback((rowId: string, columnId: string, value: any) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row)));
  }, []);

  const editRow = useCallback((rowId: string, updates: Record<string, any>) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  }, []);

  const addRow = useCallback(() => {
    const newRow: Record<string, any> = { id: crypto.randomUUID() };
    activeTable.columns.forEach((col) => {
      newRow[col.id] = col.type === "number" ? 0 : "";
    });
    setRows((prev) => [...prev, newRow]);
  }, [activeTable.columns]);

  const updateColumn = useCallback((colId: string, updates: Partial<ColumnDef>) => {
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, ...updates } : c)));
  }, []);

  const addColumn = useCallback(() => {
    const newCol: ColumnDef = {
      id: `field_${Date.now()}`,
      name: `Field ${columns.length + 1}`,
      type: "text",
      width: 150,
    };
    setColumns((prev) => [...prev, newCol]);
  }, [columns.length]);

  const insertColumn = useCallback((referenceColId: string, position: "left" | "right") => {
    setColumns((prev) => {
      const cols = [...prev];
      const idx = cols.findIndex((c) => c.id === referenceColId);
      if (idx === -1) return prev;
      const newCol: ColumnDef = {
        id: `field_${Date.now()}`,
        name: `Field ${cols.length + 1}`,
        type: "text",
        width: 150,
      };
      cols.splice(position === "left" ? idx : idx + 1, 0, newCol);
      return cols;
    });
  }, []);

  const duplicateColumn = useCallback((colId: string) => {
    const newColId = `field_${Date.now()}`;
    setColumns((prev) => {
      const cols = [...prev];
      const idx = cols.findIndex((c) => c.id === colId);
      if (idx === -1) return prev;
      const source = cols[idx];
      const newCol: ColumnDef = { ...source, id: newColId, name: `${source.name} (copy)` };
      cols.splice(idx + 1, 0, newCol);
      return cols;
    });
    setRows((prev) => prev.map((row) => ({ ...row, [newColId]: row[colId] })));
  }, []);

  const deleteColumn = useCallback((colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
  }, []);

  const freezeUpTo = useCallback(
    (colId: string) => {
      const cols = visibleColumns;
      const idx = cols.findIndex((c) => c.id === colId);
      setFrozenColumnCount(idx >= 0 ? idx + 1 : 0);
    },
    [visibleColumns],
  );

  const moveColumn = useCallback((startIndex: number, endIndex: number) => {
    setColumns((prev) => {
      const cols = [...prev];
      const [moved] = cols.splice(startIndex, 1);
      cols.splice(endIndex, 0, moved);
      return cols;
    });
  }, []);

  const resizeColumn = useCallback((colId: string, newWidth: number) => {
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, width: newWidth } : c)));
  }, []);

  const deleteRows = useCallback((ids: Set<string>) => {
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    setSelectedRowIds(new Set());
  }, []);

  const duplicateRows = useCallback((ids: Set<string>) => {
    setRows((prev) => {
      const newRows = prev.filter((r) => ids.has(r.id)).map((r) => ({ ...r, id: crypto.randomUUID() }));
      return [...prev, ...newRows];
    });
    setSelectedRowIds(new Set());
  }, []);

  const addGroup = useCallback(() => {
    const usedFields = new Set(groups.map((g) => g.field));
    const available = activeTable.columns.find((c) => !usedFields.has(c.id));
    if (!available) return;
    setGroups((prev) => [...prev, { id: crypto.randomUUID(), field: available.id, direction: "asc" }]);
  }, [groups, activeTable.columns]);

  const addGroupForField = useCallback(
    (field: string) => {
      if (groups.some((g) => g.field === field)) return;
      setGroups((prev) => [...prev, { id: crypto.randomUUID(), field, direction: "asc" }]);
    },
    [groups],
  );

  const updateGroup = useCallback((id: string, updates: Partial<GroupCondition>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);

  const removeGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return {
    activeTable,
    selectedRow,
    selectedRowId,
    selectRow,
    selectedRowIds,
    setSelectedRowIds,
    inspectorOpen,
    closeInspector,
    sorts,
    addSort,
    addSortForField,
    updateSort,
    removeSort,
    filters,
    filterMode,
    setFilterMode,
    addFilter,
    updateFilter,
    removeFilter,
    hiddenColumns,
    toggleColumn,
    columnOrder,
    setColumnOrder,
    visibleColumns,
    orderedColumns,
    sortedRows,
    groupedRows,
    editCell,
    editRow,
    addRow,
    updateColumn,
    addColumn,
    insertColumn,
    duplicateColumn,
    deleteColumn,
    freezeUpTo,
    frozenColumnCount,
    moveColumn,
    resizeColumn,
    deleteRows,
    duplicateRows,
    groups,
    addGroup,
    addGroupForField,
    updateGroup,
    removeGroup,
    toggleGroupCollapse,
  };
}
