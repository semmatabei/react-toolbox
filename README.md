# react-toolbox

A personal library of reusable React patterns and components. The code is the documentation — browse live previews in the web UI and copy-paste what you need into any React project.

## Stack

- **Vite** + React + TypeScript
- **TanStack Router** — file-based routing, typed URL params
- **shadcn/ui** (radix-mira style, neutral) + **Tailwind CSS v4**
- **Zustand** — state management patterns
- **TanStack Query** — data fetching patterns
- **TanStack Table** — table patterns
- **react-hook-form** + **zod** — form patterns

## Dev

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run typecheck  # run after dev/build (needs generated routeTree.gen.ts)
```

## Patterns

| Category     | Patterns                                           |
| ------------ | -------------------------------------------------- |
| Form         | Basic form, Multi-step, Dynamic fields             |
| Modal        | Basic dialog, Form dialog, Imperative modal        |
| Notification | Toast, Optimistic UI                               |
| Query        | Query states, Infinite scroll, Optimistic mutation |
| Table        | Basic (sortable), Server-side, Row selection       |
| State        | Store slices, Persisted store                      |
| Layout       | Sidebar shell, Command palette                     |
| Util         | Error boundary, Debounced search                   |

## Adding a pattern

1. Create `src/patterns/<category>/<name>.tsx` — default export a React component
2. Add an entry to `PATTERNS` in `src/lib/patterns.ts`

The sidebar and routing update automatically.

## Shadcn Registries

- https://www.shadcn-form.com
- https://www.shadcn.io/patterns
- https://magicui.design
- https://www.kibo-ui.com
