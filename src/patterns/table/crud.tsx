import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, FilterCreator, columnDefinitionCreator, useTableCrud, type FieldSchema, type FilterCondition } from "@/components/base/table/crud-table";

// ─────────────────────────────────────────────────────────────────────────────
// In-memory "database" — stands in for a real API
// ─────────────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Engineer" | "Designer" | "Manager";
  active: boolean;
}

let nextId = 6;
const DB: User[] = [
  { id: 1, name: "Alice Martin", email: "alice@acme.com", role: "Admin", active: true },
  { id: 2, name: "Bob Chen", email: "bob@acme.com", role: "Engineer", active: true },
  { id: 3, name: "Carol Smith", email: "carol@acme.com", role: "Designer", active: false },
  { id: 4, name: "Dave Johnson", email: "dave@acme.com", role: "Engineer", active: true },
  { id: 5, name: "Eve Williams", email: "eve@acme.com", role: "Manager", active: false },
];

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiFetch(params: { page: number; limit: number; filters: FilterCondition[] }) {
  await delay();
  let rows = [...DB];

  for (const f of params.filters) {
    if (!f.value && f.value !== false) continue;
    rows = rows.filter((r) => {
      const val = String((r as any)[f.field] ?? "").toLowerCase();
      const q = String(f.value).toLowerCase();
      if (f.operator === "contains") return val.includes(q);
      if (f.operator === "equals") return val === q;
      if (f.operator === "startsWith") return val.startsWith(q);
      return true;
    });
  }

  const total = rows.length;
  const data = rows.slice((params.page - 1) * params.limit, params.page * params.limit);
  return { data, pagination: { page: params.page, limit: params.limit, total } };
}

async function apiUpdate(id: number, values: Partial<User>) {
  await delay();
  const idx = DB.findIndex((r) => r.id === id);
  if (idx !== -1) DB[idx] = { ...DB[idx], ...values, id };
}

async function apiCreate(values: Partial<User>) {
  await delay();
  const row = { id: nextId++, name: "", email: "", role: "Engineer" as const, active: true, ...values };
  DB.push(row);
  return row;
}

async function apiDelete(id: number) {
  await delay();
  const idx = DB.findIndex((r) => r.id === id);
  if (idx !== -1) DB.splice(idx, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema — drives columns, editors, and filter UI
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA: FieldSchema[] = [
  { id: "id", label: "ID", type: "number", inputType: "readonly", width: "60" },
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
    width: "70",
    viewValue: (v) => (
      <Badge variant={v ? "default" : "secondary"} className="text-xs">
        {v ? "Yes" : "No"}
      </Badge>
    ),
  },
];

const FilterPanel = FilterCreator(SCHEMA);
const getColumns = columnDefinitionCreator<User>(SCHEMA);

// ─────────────────────────────────────────────────────────────────────────────
// Pattern
// ─────────────────────────────────────────────────────────────────────────────

export default function CrudTable() {
  const {
    data,
    filters,
    tableState,
    editRowId,
    setEditRowId,
    handleApplyFilter,
    handleSortingChange,
    handlePageChange,
    handleSave,
    handleDelete,
    newRow,
    addNewRow,
    saveNewRow,
    cancelNewRow,
    creating,
  } = useTableCrud<User, FilterCondition>({
    fetchData: apiFetch,
    updateItem: apiUpdate,
    deleteItem: apiDelete,
    defaultPagination: { page: 1, limit: 4 },
    confirmDeleteMessage: (u) => `Delete "${u.name}"? This cannot be undone.`,
    schema: SCHEMA,
  });

  const columns = getColumns(
    editRowId,
    setEditRowId,
    (id, values) => {
      if (id === "new") return saveNewRow(values, apiCreate);
      return handleSave(id, values);
    },
    handleDelete,
    (id) => {
      if (id === "new") return cancelNewRow();
      setEditRowId(null);
    },
  );

  return (
    <div className="space-y-3">
      <FilterPanel handleApplyFilter={handleApplyFilter} />

      <Button size="sm" onClick={() => addNewRow({ role: "Engineer", active: true })} disabled={!!newRow || creating}>
        <Plus /> Add user
      </Button>

      <DataTable
        data={data}
        columns={columns}
        state={{
          ...tableState,
          sorting: tableState.sorting as any,
        }}
        options={{
          onSortingChange: handleSortingChange,
          onPageChange: handlePageChange,
          emptyMessage: filters.some((f) => f.value) ? "No users match your filter." : "No users.",
        }}
      />
    </div>
  );
}
