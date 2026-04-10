import { useEffect, useRef, useState, type ReactNode } from "react";
import { create } from "zustand";
import { persist, createJSONStorage, subscribeWithSelector } from "zustand/middleware";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/base/section-header";

function RenderCount({ label }: { label: string }) {
  const count = useRef(0);
  count.current += 1;
  return (
    <span className="text-xs text-muted-foreground">
      {label} renders: <span className="font-mono font-medium text-foreground">{count.current}</span>
    </span>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="p-6 space-y-3">
      <SectionHeader title={title} description={description} />
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BASIC USAGE
//
// create() returns a hook. Call it anywhere — no provider needed.
// Pass a selector to subscribe to a slice; without one, the whole store.
// Actions live on the store itself: set() merges partial state.
// ─────────────────────────────────────────────────────────────────────────────

interface CounterBasicStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useBasicStore = create<CounterBasicStore>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: s.count - 1 })),
  reset: () => set({ count: 0 }),
}));

function BasicDemo() {
  const { count, increment, decrement, reset } = useBasicStore();
  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" onClick={decrement}>
        −
      </Button>
      <span className="text-2xl font-bold tabular-nums w-8 text-center">{count}</span>
      <Button size="sm" onClick={increment}>
        +
      </Button>
      <Button size="sm" variant="ghost" onClick={reset}>
        Reset
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PERSISTENT STATE (HYDRATION)
//
// persist middleware serializes state to localStorage (or any storage adapter).
// On mount, Zustand rehydrates synchronously from storage.
//
// The _hasHydrated flag is the key pattern: without it, components render with
// the initial default value for one tick before hydration sets the real value,
// causing a flash of wrong UI. Gating render on _hasHydrated eliminates it.
// ─────────────────────────────────────────────────────────────────────────────

interface HydrationStore {
  count: number;
  _hasHydrated: boolean;
  increment: () => void;
  reset: () => void;
  setHydrated: () => void;
}

const useHydrationStore = create<HydrationStore>()(
  persist(
    (set) => ({
      count: 0,
      _hasHydrated: false,
      increment: () => set((s) => ({ count: s.count + 1 })),
      reset: () => set({ count: 0 }),
      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "rtb:hydration-demo",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

function HydrationDemo() {
  const { count, _hasHydrated, increment, reset } = useHydrationStore();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold tabular-nums">{_hasHydrated ? count : "…"}</span>
        <Button size="sm" onClick={increment} disabled={!_hasHydrated}>
          +1
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} disabled={!_hasHydrated}>
          Reset
        </Button>
        <Badge variant={_hasHydrated ? "outline" : "secondary"}>{_hasHydrated ? "Hydrated ✓" : "Hydrating…"}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">Increment, then refresh the page — value persists.</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOGIC OUTSIDE REACT (THE "PURE JS" BRIDGE)
//
// store.getState() and store.setState() are plain functions — no hooks,
// no component context required. Call them from anywhere:
//   - WebSocket / SSE message handlers
//   - fetch/axios interceptors (add auth errors to a notification store)
//   - setTimeout / setInterval callbacks
//   - Web Workers (via postMessage bridge)
//   - Third-party SDK callbacks (Stripe, analytics, etc.)
//
// This makes Zustand the single source of truth even for non-React code paths.
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityStore {
  events: string[];
  log: (msg: string) => void;
  clear: () => void;
}

const useActivityStore = create<ActivityStore>((set) => ({
  events: [],
  log: (msg) => set((s) => ({ events: [`${new Date().toLocaleTimeString()} ${msg}`, ...s.events].slice(0, 5) })),
  clear: () => set({ events: [] }),
}));

// Plain JS functions — zero React dependencies
function simulateWebSocket() {
  setTimeout(() => useActivityStore.getState().log("WS → user_joined"), 400);
}
function simulateFetchInterceptor() {
  useActivityStore.getState().log("Fetch → GET /api/users");
}
function simulateWorkerMessage() {
  setTimeout(() => useActivityStore.getState().log("Worker → chunk_processed"), 200);
}

function OutsideReactDemo() {
  const { events, clear } = useActivityStore();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={simulateWebSocket}>
          WS message
        </Button>
        <Button size="sm" variant="outline" onClick={simulateFetchInterceptor}>
          Fetch interceptor
        </Button>
        <Button size="sm" variant="outline" onClick={simulateWorkerMessage}>
          Worker event
        </Button>
        <Button size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground">Fire events above — all called outside React.</p>
      ) : (
        <ul className="space-y-1">
          {events.map((e, i) => (
            <li key={i}>
              <Badge variant="secondary" className="text-xs font-mono">
                {e}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. STATE SHARDING (FINE-GRAINED SUBSCRIPTIONS)
//
// By default, any store update re-renders all subscribers. Selectors fix this:
// a component only re-renders when its selected slice changes.
//
// subscribeWithSelector middleware also enables store.subscribe(selector, cb)
// for reacting to specific field changes outside React.
//
// Rule of thumb: one store per domain (user, cart, ui), not one giant store.
// Components subscribe to exactly what they need.
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileStore {
  name: string;
  email: string;
  role: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  setRole: (v: string) => void;
}

const useProfileStore = create<ProfileStore>()(
  subscribeWithSelector((set) => ({
    name: "Alice",
    email: "alice@acme.com",
    role: "Admin",
    setName: (name) => set({ name }),
    setEmail: (email) => set({ email }),
    setRole: (role) => set({ role }),
  })),
);

function ProfileField({ label, selector, onSet }: { label: string; selector: (s: ProfileStore) => string; onSet: (v: string) => void }) {
  const value = useProfileStore(selector);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">{label}</p>
        <RenderCount label={label} />
      </div>
      <Input value={value} onChange={(e) => onSet(e.target.value)} className="h-7 text-xs" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CROSS-COMPONENT COORDINATION (ACTION DECOUPLING)
//
// Components call store actions directly — no prop drilling, no callbacks,
// no shared parent, no context providers. Any component anywhere in the tree
// can trigger any action. This is especially powerful for globally scoped
// concerns: notifications, modals, cart, undo history, command palette.
//
// Pattern: keep actions on the store, not in components.
// Components are pure view + intent — the store owns logic.
// ─────────────────────────────────────────────────────────────────────────────

interface ToastStore {
  items: { id: number; text: string; kind: "info" | "success" | "error" }[];
  push: (text: string, kind?: "info" | "success" | "error") => void;
  dismiss: (id: number) => void;
}

let toastId = 0;
const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (text, kind = "info") => set((s) => ({ items: [...s.items, { id: ++toastId, text, kind }] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((m) => m.id !== id) })),
}));

function ToastDisplay() {
  const { items, dismiss } = useToastStore();
  const variantMap = { info: "secondary", success: "default", error: "destructive" } as const;
  return (
    <div className="rounded-md border border-border p-3 min-h-10 space-y-1.5">
      <p className="text-xs text-muted-foreground">Toast store — click any badge to dismiss</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No messages.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((m) => (
            <Badge key={m.id} variant={variantMap[m.kind]} className="cursor-pointer text-xs" onClick={() => dismiss(m.id)}>
              {m.text} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SUBSCRIPTIONS WITHOUT REACT
//
// store.subscribe(selector, callback) fires whenever the selected value changes,
// entirely outside the React render cycle. No component needed.
//
// Use for:
//   - Syncing to external systems (IndexedDB, BroadcastChannel, analytics)
//   - Logging / audit trails
//   - Triggering side effects that shouldn't cause a re-render
//   - Bridging to non-React code that needs to react to state changes
//
// Requires subscribeWithSelector middleware for selector-based subscriptions.
// ─────────────────────────────────────────────────────────────────────────────

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const useCounterStore = create<CounterStore>()(
  subscribeWithSelector((set) => ({
    count: 0,
    increment: () => set((s) => ({ count: s.count + 1 })),
    decrement: () => set((s) => ({ count: s.count - 1 })),
  })),
);

function SubscriptionDemo() {
  const { count, increment, decrement } = useCounterStore();
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    // Runs outside React — subscriber never causes a re-render on its own
    return useCounterStore.subscribe(
      (s) => s.count,
      (value, prev) => setLog((l) => [`${prev} → ${value}`, ...l].slice(0, 4)),
    );
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={decrement}>
          −
        </Button>
        <span className="text-2xl font-bold tabular-nums w-8 text-center">{count}</span>
        <Button size="sm" onClick={increment}>
          +
        </Button>
      </div>
      <div className="space-y-1">
        {log.length === 0 ? (
          <p className="text-xs text-muted-foreground">Change the counter — subscription fires outside React.</p>
        ) : (
          log.map((entry, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-mono mr-1">
              {entry}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. TRANSIENT UPDATES (ZERO RE-RENDERS FOR HIGH-FREQUENCY STATE)
//
// Problem: state that changes hundreds of times per second (mouse position,
// scroll offset, animation frames, real-time cursors) causes massive render
// thrashing if subscribed normally via useStore().
//
// Solution: store the value in Zustand, but subscribe via store.subscribe()
// and write directly to a DOM ref — bypassing React's render cycle entirely.
// The value lives in the store (accessible anywhere via getState()) but never
// triggers a re-render in any component.
//
// Compare the two render counters below:
//   Reactive: re-renders on every mousemove event (many per second)
//   Transient: zero re-renders regardless of how fast the mouse moves
// ─────────────────────────────────────────────────────────────────────────────

interface MouseStore {
  x: number;
  y: number;
  setPos: (x: number, y: number) => void;
}

const useMouseStore = create<MouseStore>()(
  subscribeWithSelector((set) => ({
    x: 0,
    y: 0,
    setPos: (x, y) => set({ x, y }),
  })),
);

function ReactiveTracker() {
  const { x, y } = useMouseStore();
  return (
    <div className="rounded-md border border-border p-3 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Reactive (useStore)</p>
        <RenderCount label="Renders" />
      </div>
      <p className="text-xs font-mono text-muted-foreground">
        {x}, {y}
      </p>
    </div>
  );
}

function TransientTracker() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    return useMouseStore.subscribe(
      (s) => [s.x, s.y] as [number, number],
      ([x, y]) => {
        if (ref.current) ref.current.textContent = `${x}, ${y}`;
      },
      { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] },
    );
  }, []);

  return (
    <div className="rounded-md border border-border p-3 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Transient (ref + subscribe)</p>
        <RenderCount label="Renders" />
      </div>
      <p ref={ref} className="text-xs font-mono text-muted-foreground">
        0, 0
      </p>
    </div>
  );
}

function TransientDemo() {
  return (
    <div
      className="space-y-2"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        useMouseStore.getState().setPos(Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top));
      }}
    >
      <p className="text-xs text-muted-foreground">Move your mouse over this area.</p>
      <div className="rounded-md bg-muted/30 border border-dashed border-border h-16 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Mouse zone</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ReactiveTracker />
        <TransientTracker />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function ZustandCapabilities() {
  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      <Section title="1. Basic Usage" description="create() returns a hook — no Provider needed. Call it in any component. Actions live on the store; set() merges partial state.">
        <BasicDemo />
      </Section>

      <Section
        title="2. Persistent State (Hydration)"
        description="persist middleware serializes to localStorage. _hasHydrated gates render until rehydration completes — prevents flash of default values on load."
      >
        <HydrationDemo />
      </Section>

      <Section
        title="3. Logic Outside React"
        description="store.getState() is a plain function — call it from WebSocket handlers, fetch interceptors, Web Workers, or any non-React code. No hooks or context needed."
      >
        <OutsideReactDemo />
      </Section>

      <Section title="4. State Sharding" description="Selector subscriptions make each component re-render only when its own slice changes. Type in Name — Email and Role renders stay frozen.">
        <div className="grid grid-cols-3 gap-3">
          <ProfileField label="Name" selector={(s) => s.name} onSet={(v) => useProfileStore.getState().setName(v)} />
          <ProfileField label="Email" selector={(s) => s.email} onSet={(v) => useProfileStore.getState().setEmail(v)} />
          <ProfileField label="Role" selector={(s) => s.role} onSet={(v) => useProfileStore.getState().setRole(v)} />
        </div>
      </Section>

      <Section
        title="5. Cross-Component Coordination"
        description="Components call store actions directly — no prop drilling, callbacks, or shared parent. Any component anywhere in the tree can trigger any action."
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => useToastStore.getState().push("Order placed!", "success")}>
              Checkout
            </Button>
            <Button size="sm" variant="outline" onClick={() => useToastStore.getState().push("Draft saved.", "info")}>
              Save Draft
            </Button>
            <Button size="sm" variant="destructive" onClick={() => useToastStore.getState().push("Item deleted.", "error")}>
              Delete
            </Button>
          </div>
          <ToastDisplay />
        </div>
      </Section>

      <Section
        title="6. Subscriptions Without React"
        description="store.subscribe(selector, cb) fires on state changes outside the render cycle. Use it to sync to IndexedDB, BroadcastChannel, analytics, or any external system."
      >
        <SubscriptionDemo />
      </Section>

      <Section
        title="7. Transient Updates"
        description="High-frequency state (mouse, scroll, animation) written to a DOM ref via subscribe(). The store holds the value but no React re-render ever fires — Reactive side re-renders on every move, Transient stays at 1."
      >
        <TransientDemo />
      </Section>
    </div>
  );
}
