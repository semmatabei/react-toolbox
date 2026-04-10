export type PatternCategory = "form" | "modal" | "notification" | "query" | "table" | "state" | "layout" | "util";

export interface PatternMeta {
  slug: string;
  title: string;
  category: PatternCategory;
  tags: string[];
  description: string;
}

export const CATEGORIES: { value: PatternCategory; label: string }[] = [
  { value: "form", label: "Form" },
  { value: "modal", label: "Modal" },
  { value: "notification", label: "Notification" },
  { value: "query", label: "Query" },
  { value: "table", label: "Table" },
  { value: "state", label: "State" },
  { value: "util", label: "Util" },
];

export const PATTERNS: PatternMeta[] = [
  // Form
  {
    slug: "form/basic",
    title: "Basic Form",
    category: "form",
    tags: ["react-hook-form", "zod", "validation"],
    description: "Controlled form with react-hook-form + zod schema validation.",
  },
  {
    slug: "form/multi-step",
    title: "Multi-Step Form",
    category: "form",
    tags: ["react-hook-form", "wizard", "steps"],
    description: "Wizard-style step form with state preserved across steps.",
  },
  {
    slug: "form/autocomplete",
    title: "Autocomplete Remote Fetch",
    category: "form",
    tags: ["combobox", "command", "autocomplete", "remote", "debounce"],
    description: "Two approaches: Command+Popover and base-ui Combobox — both with debounced remote fetch and server-side filtering.",
  },
  // Modal
  {
    slug: "modal/basic",
    title: "Basic Dialog",
    category: "modal",
    tags: ["radix", "dialog"],
    description: "Dialog with name and email inputs opened imperatively.",
  },
  {
    slug: "modal/show-confirm",
    title: "Show Confirmation",
    category: "modal",
    tags: ["radix", "dialog", "confirm", "zustand", "imperative"],
    description: "Awaitable confirm dialog opened imperatively — returns true/false without JSX at callsite.",
  },
  // Notification
  {
    slug: "notification/toast",
    title: "Toast",
    category: "notification",
    tags: ["sonner", "toast"],
    description: "Toast notifications with success, error, warning variants.",
  },
  // Query
  {
    slug: "query/states",
    title: "Query States",
    category: "query",
    tags: ["tanstack-query", "loading", "error", "empty"],
    description: "Single hook rendering loading / error / empty / data states.",
  },
  {
    slug: "query/infinite-scroll",
    title: "Infinite Scroll",
    category: "query",
    tags: ["tanstack-query", "infinite", "intersection-observer"],
    description: "useInfiniteQuery with intersection observer trigger.",
  },
  {
    slug: "query/optimistic-mutation",
    title: "Optimistic Mutation",
    category: "query",
    tags: ["tanstack-query", "mutation", "optimistic"],
    description: "Mutate cache before server confirms; rollback on error.",
  },
  // Table
  {
    slug: "table/basic",
    title: "Basic Table",
    category: "table",
    tags: ["tanstack-table", "sort"],
    description: "Sortable typed table with sensible column defaults.",
  },
  {
    slug: "table/server-side",
    title: "Server-Side Table",
    category: "table",
    tags: ["tanstack-table", "server", "pagination"],
    description: "Sorting and pagination sent to API via URL params.",
  },
  {
    slug: "table/crud",
    title: "CRUD Table",
    category: "table",
    tags: ["tanstack-table", "crud", "edit", "delete", "filter", "pagination"],
    description: "Inline editable table with schema-driven columns, filter bar, pagination, and create/delete via useTableCrud hook.",
  },
  {
    slug: "table/view-table",
    title: "View Table",
    category: "table",
    tags: ["tanstack-table", "filter", "pagination", "sort", "read-only"],
    description: "Read-only schema-driven table with filter bar, sorting, and pagination via useTableView hook.",
  },
  {
    slug: "table/grid",
    title: "Grid Table",
    category: "table",
    tags: ["glide-data-grid", "canvas", "spreadsheet", "sort", "filter", "group", "inline-edit"],
    description: "Airtable-style spreadsheet with canvas rendering, inline editing, sort/filter/group, column management, and inspector panel.",
  },
  // State
  {
    slug: "state/zustand-features",
    title: "Zustand Features",
    category: "state",
    tags: ["zustand", "persist", "subscribe", "decoupling"],
    description: "Advanced Zustand patterns: persistence, external logic, transient updates.",
  },
  {
    slug: "state/event-bus",
    title: "Event Bus",
    category: "state",
    tags: ["zustand", "event-bus", "pub-sub"],
    description: "Typed pub/sub event bus using Zustand subscriptions — no store state consumed.",
  },
  // Util
  {
    slug: "util/error-boundary",
    title: "Error Boundary",
    category: "util",
    tags: ["error-boundary", "fallback"],
    description: "React error boundary with fallback UI.",
  },
  {
    slug: "util/debounced-search",
    title: "Debounced Search",
    category: "util",
    tags: ["debounce", "search", "url-state"],
    description: "Input → debounce → query, URL-state synced.",
  },
];

export function getPatternsByCategory(category: PatternCategory) {
  return PATTERNS.filter((p) => p.category === category);
}
