import { Badge } from "@/components/ui/badge";
import { DataTable, FilterCreator, columnViewCreator, useTableView, type FieldSchema, type FilterCondition } from "@/components/base/table/view-table";
import { type Employee, apiFetch } from "@/components/base/table/mock-db";

// ─────────────────────────────────────────────────────────────────────────────
// Schema — drives columns and filter UI
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  Active: "default",
  "On Leave": "secondary",
  Inactive: "destructive",
};

const SCHEMA: FieldSchema[] = [
  { id: "id", label: "ID", type: "number", inputType: "number", width: "shrink" },
  { id: "name", label: "Name", type: "string", inputType: "text", sortable: true, filterable: true },
  {
    id: "department",
    label: "Department",
    type: "string",
    inputType: "select",
    sortable: true,
    filterable: true,
    options: [
      { label: "Engineering", value: "Engineering" },
      { label: "Design", value: "Design" },
      { label: "Product", value: "Product" },
    ],
  },
  { id: "title", label: "Title", type: "string", inputType: "text", filterable: true },
  {
    id: "status",
    label: "Status",
    type: "string",
    inputType: "select",
    filterable: true,
    width: "shrink",
    options: [
      { label: "Active", value: "Active" },
      { label: "On Leave", value: "On Leave" },
      { label: "Inactive", value: "Inactive" },
    ],
    viewValue: (v) => (
      <Badge variant={STATUS_VARIANT[v] ?? "secondary"} className="text-xs">
        {v}
      </Badge>
    ),
  },
  { id: "tenure", label: "Tenure (yrs)", type: "number", inputType: "number", sortable: true, width: "shrink" },
];

const FilterPanel = FilterCreator(SCHEMA);
const columns = columnViewCreator<Employee>(SCHEMA);

// ─────────────────────────────────────────────────────────────────────────────
// Pattern
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewTable() {
  const { tableProps, filterProps, filters } = useTableView<Employee, FilterCondition>({
    fetchData: apiFetch,
    defaultPagination: { page: 1, limit: 5 },
  });

  return (
    <div className="space-y-3">
      <FilterPanel {...filterProps} />

      <DataTable columns={columns} {...tableProps} emptyMessage={filters.some((f) => f.value) ? "No employees match your filter." : "No employees."} />
    </div>
  );
}
