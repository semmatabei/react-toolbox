import type { FilterCondition } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Shared in-memory "database" — used by all table pattern examples
// ─────────────────────────────────────────────────────────────────────────────

export interface Employee {
  id: number;
  name: string;
  email: string;
  department: "Engineering" | "Design" | "Product";
  title: string;
  role: "Admin" | "Engineer" | "Designer" | "Manager";
  status: "Active" | "On Leave" | "Inactive";
  active: boolean;
  tenure: number; // years
}

export let nextId = 11;

export const DB: Employee[] = [
  { id: 1, name: "Alice Martin", email: "alice@acme.com", department: "Engineering", title: "Staff Engineer", role: "Engineer", status: "Active", active: true, tenure: 6 },
  { id: 2, name: "Bob Chen", email: "bob@acme.com", department: "Engineering", title: "Senior Engineer", role: "Engineer", status: "Active", active: true, tenure: 4 },
  { id: 3, name: "Carol Smith", email: "carol@acme.com", department: "Design", title: "Lead Designer", role: "Designer", status: "On Leave", active: false, tenure: 3 },
  { id: 4, name: "Dave Johnson", email: "dave@acme.com", department: "Engineering", title: "Engineer", role: "Engineer", status: "Active", active: true, tenure: 2 },
  { id: 5, name: "Eve Williams", email: "eve@acme.com", department: "Product", title: "Product Manager", role: "Manager", status: "Inactive", active: false, tenure: 1 },
  { id: 6, name: "Frank Lee", email: "frank@acme.com", department: "Design", title: "Designer", role: "Designer", status: "Active", active: true, tenure: 2 },
  { id: 7, name: "Grace Kim", email: "grace@acme.com", department: "Product", title: "Senior PM", role: "Manager", status: "Active", active: true, tenure: 5 },
  { id: 8, name: "Hank Torres", email: "hank@acme.com", department: "Engineering", title: "Principal Engineer", role: "Admin", status: "On Leave", active: false, tenure: 8 },
  { id: 9, name: "Iris Patel", email: "iris@acme.com", department: "Design", title: "UX Researcher", role: "Designer", status: "Active", active: true, tenure: 3 },
  { id: 10, name: "Jake Brown", email: "jake@acme.com", department: "Product", title: "Associate PM", role: "Manager", status: "Inactive", active: false, tenure: 1 },
];

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function apiFetch(params: { page: number; limit: number; sorting?: { id: string; desc: boolean }[]; filters: FilterCondition[] }) {
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

  if (params.sorting?.length) {
    const { id, desc } = params.sorting[0];
    rows.sort((a, b) => {
      const av = (a as any)[id];
      const bv = (b as any)[id];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return desc ? -cmp : cmp;
    });
  }

  const total = rows.length;
  const data = rows.slice((params.page - 1) * params.limit, params.page * params.limit);
  return { data, pagination: { page: params.page, limit: params.limit, total } };
}

export async function apiCreate(values: Partial<Employee>): Promise<Employee> {
  await delay();
  const row: Employee = {
    id: nextId++,
    name: "",
    email: "",
    department: "Engineering",
    title: "",
    role: "Engineer",
    status: "Active",
    active: true,
    tenure: 0,
    ...values,
  };
  DB.push(row);
  return row;
}

export async function apiUpdate(id: number, values: Partial<Employee>): Promise<void> {
  await delay();
  const idx = DB.findIndex((r) => r.id === id);
  if (idx !== -1) DB[idx] = { ...DB[idx], ...values, id };
}

export async function apiDelete(id: number): Promise<void> {
  await delay();
  const idx = DB.findIndex((r) => r.id === id);
  if (idx !== -1) DB.splice(idx, 1);
}
