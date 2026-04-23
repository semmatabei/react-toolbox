import { DB as employeeDB } from "../table/mock-db";

export interface TableDef {
  id: string;
  name: string;
  icon: string;
  columns: ColumnDef[];
  rows: Record<string, any>[];
}

export interface ColumnDef {
  id: string;
  name: string;
  type: "text" | "number" | "select" | "date" | "email" | "autocomplete";
  width?: number;
  options?: { label: string; color: string }[];
}

export type ViewType = "grid" | "kanban" | "calendar";

export interface ViewDef {
  id: string;
  name: string;
  type: ViewType;
  icon: string; // lucide icon name
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: "is" | "is_not" | "contains" | "not_contains" | "is_empty" | "is_not_empty" | "gt" | "lt";
  value: string;
}

const statusOptions = [
  { label: "Active", color: "confirmed" },
  { label: "On Leave", color: "pending" },
  { label: "Inactive", color: "cancelled" },
];

const departmentOptions = [
  { label: "Engineering", color: "confirmed" },
  { label: "Design", color: "pending" },
  { label: "Product", color: "draft" },
];

const roleOptions = [
  { label: "Admin", color: "draft" },
  { label: "Engineer", color: "confirmed" },
  { label: "Designer", color: "pending" },
  { label: "Manager", color: "cancelled" },
];

export const tables: TableDef[] = [
  {
    id: "employees",
    name: "Employees",
    icon: "Users",
    columns: [
      { id: "name", name: "Name", type: "text", width: 180 },
      { id: "email", name: "Email", type: "email", width: 220 },
      { id: "department", name: "Department", type: "select", width: 140, options: departmentOptions },
      { id: "title", name: "Title", type: "text", width: 180 },
      { id: "role", name: "Role", type: "select", width: 120, options: roleOptions },
      { id: "status", name: "Status", type: "autocomplete", width: 120, options: statusOptions },
      { id: "tenure", name: "Tenure (yrs)", type: "number", width: 110 },
    ],
    rows: employeeDB.map((e) => ({ ...e, id: String(e.id) })),
  },
];
