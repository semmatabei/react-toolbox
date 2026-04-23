import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type RowSelectionState } from "@tanstack/react-table";
import { DataTable, FilterCreator, columnDefinitionCreator, useTableCrud, type FieldSchema, type FilterCondition } from "@/components/base/table/crud-table";
import { type Employee, apiFetch, apiCreate, apiUpdate, apiDelete } from "@/components/base/table/mock-db";

// ─────────────────────────────────────────────────────────────────────────────
// Schema — drives columns, editors, and filter UI
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA: FieldSchema[] = [
  { id: "id", label: "ID", type: "number", inputType: "readonly", width: "shrink" },
  { id: "name", label: "Name", type: "string", inputType: "text", sortable: true, filterable: true, required: true },
  { id: "email", label: "Email", type: "string", inputType: "text", filterable: true },
  {
    id: "role",
    label: "Role",
    type: "string",
    inputType: "select",
    sortable: true,
    filterable: true,
    options: [
      { label: "Admin", value: "Admin" },
      { label: "Engineer", value: "Engineer" },
      { label: "Designer", value: "Designer" },
      { label: "Manager", value: "Manager" },
    ],
  },
  {
    id: "active",
    label: "Active",
    type: "boolean",
    inputType: "checkbox",
    filterable: true,
    width: "shrink",
    viewValue: (v) => (
      <Badge variant={v ? "default" : "secondary"} className="text-xs">
        {v ? "Yes" : "No"}
      </Badge>
    ),
  },
];

const FilterPanel = FilterCreator(SCHEMA);
const getColumns = columnDefinitionCreator<Employee>(SCHEMA);

// ─────────────────────────────────────────────────────────────────────────────
// Pattern
// ─────────────────────────────────────────────────────────────────────────────

export default function CrudTable() {
  const { tableProps, filterProps, editContext, filters, newRow, addNewRow, creating } = useTableCrud<Employee, FilterCondition>({
    fetchData: apiFetch,
    createItem: apiCreate,
    updateItem: apiUpdate,
    deleteItem: apiDelete,
    defaultPagination: { page: 1, limit: 4 },
    confirmDeleteMessage: (u) => `Delete "${u.name}"? This cannot be undone.`,
    schema: SCHEMA,
  });

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const columns = getColumns(editContext);

  return (
    <div className="space-y-3">
      <FilterPanel {...filterProps} />

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => addNewRow({ role: "Engineer", active: true })} disabled={!!newRow || creating}>
          <Plus /> Add user
        </Button>
        {Object.keys(rowSelection).length > 0 && (
          <Button size="sm" variant="destructive" onClick={() => setRowSelection({})}>
            Clear {Object.keys(rowSelection).length} selected
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        {...tableProps}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyMessage={filters.some((f) => f.value) ? "No users match your filter." : "No users."}
      />
    </div>
  );
}
