import type React from "react";

export interface FieldSchema {
  id: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "json" | "int" | "float";
  inputType: "text" | "textarea" | "number" | "checkbox" | "select" | "date" | "readonly" | "autocomplete" | "image" | "image-multiple";
  sortable?: boolean;
  filterable?: boolean;
  options?: Array<{ label: string; value: any; disabled?: boolean }>;
  onFilter?: (query: string) => Promise<Array<{ label: string; value: string }>>;
  viewValue?: (value: any, row: any) => string | React.ReactNode;
  editValue?: (value: any, row: any) => any;
  width?: string;
  required?: boolean;
}

export type FilterCondition = {
  field: string;
  operator: string;
  value: any;
};

export const filterOperators = [
  { value: "equals", label: "=" },
  { value: "contains", label: "contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
];
