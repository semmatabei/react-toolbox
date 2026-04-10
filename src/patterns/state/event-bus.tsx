import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/base/section-header";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Event bus — Zustand as a pub/sub system, no state consumed in components.
// Emit events via emit(), subscribe with useEvent() or bus.subscribe().
//
// Use EVENTS when:
//   - Something happened and other parts should react, but nobody needs to
//     read the current value (e.g. "file uploaded", "payment succeeded")
//   - The emitter shouldn't know who is listening
//   - Side effects across unrelated components (toast, analytics, modals)
//   - One-shot notifications that don't need to be replayed on mount
//
// Use STATE when:
//   - Components need to read the current value, not just react to changes
//     (e.g. cart item count shown in a badge, theme, auth user)
//   - New subscribers need the latest value immediately on mount
//   - The value persists and can be queried at any time
// ---------------------------------------------------------------------------

type EventMap = {
  "item:added": { name: string };
  "item:removed": { name: string };
  "cart:cleared": undefined;
};

type EventName = keyof EventMap;
type EventPayload<E extends EventName> = EventMap[E];

interface BusStore {
  event: { name: EventName; payload: EventMap[EventName] } | null;
  emit: <E extends EventName>(name: E, payload: EventPayload<E>) => void;
}

const bus = create<BusStore>((set) => ({
  event: null,
  emit: (name, payload) => set({ event: { name, payload: payload as EventMap[EventName] } }),
}));

export function emit<E extends EventName>(name: E, payload: EventPayload<E>) {
  bus.getState().emit(name, payload);
}

export function useEvent<E extends EventName>(name: E, handler: (payload: EventPayload<E>) => void) {
  useEffect(() => {
    return bus.subscribe((s) => {
      if (s.event?.name === name) handler(s.event.payload as EventPayload<E>);
    });
  }, [name, handler]);
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

function RenderCount({ label }: { label: string }) {
  const count = useRef(0);
  count.current += 1;
  return (
    <span className="text-xs text-muted-foreground">
      {label} renders: <span className="font-mono font-medium text-foreground">{count.current}</span>
    </span>
  );
}

const ITEMS = ["Apple", "Banana", "Cherry"];

function Cart() {
  const [log, setLog] = useState<string[]>([]);

  useEvent("item:added", ({ name }) => setLog((l) => [`+ ${name}`, ...l]));
  useEvent("item:removed", ({ name }) => setLog((l) => [`− ${name}`, ...l]));
  useEvent("cart:cleared", () => setLog((l) => [`cleared`, ...l]));

  return (
    <div className="rounded-md border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cart listener</p>
        <RenderCount label="Cart" />
      </div>
      {log.length === 0 ? (
        <p className="text-xs text-muted-foreground">No events yet.</p>
      ) : (
        <ul className="space-y-1">
          {log.map((entry, i) => (
            <li key={i}>
              <Badge variant="secondary" className="text-xs font-mono">
                {entry}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemList() {
  return (
    <div className="rounded-md border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emit events</p>
        <RenderCount label="ItemList" />
      </div>
      <div className="flex flex-col gap-2">
        {ITEMS.map((item) => (
          <div key={item} className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => emit("item:added", { name: item })}>
              + {item}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => emit("item:removed", { name: item })}>
              − {item}
            </Button>
          </div>
        ))}
        <Button size="sm" variant="destructive" className="mt-1" onClick={() => emit("cart:cleared", undefined)}>
          Clear cart
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parent-state comparison — lifting state causes parent + all children to re-render
// ---------------------------------------------------------------------------

function StateCart({ log }: { log: string[] }) {
  return (
    <div className="rounded-md border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cart (prop)</p>
        <RenderCount label="Cart" />
      </div>
      {log.length === 0 ? (
        <p className="text-xs text-muted-foreground">No actions yet.</p>
      ) : (
        <ul className="space-y-1">
          {log.map((entry, i) => (
            <li key={i}>
              <Badge variant="secondary" className="text-xs font-mono">
                {entry}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StateItemList({ onAdd, onRemove, onClear }: { onAdd: (name: string) => void; onRemove: (name: string) => void; onClear: () => void }) {
  return (
    <div className="rounded-md border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emit (callback)</p>
        <RenderCount label="ItemList" />
      </div>
      <div className="flex flex-col gap-2">
        {ITEMS.map((item) => (
          <div key={item} className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onAdd(item)}>
              + {item}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onRemove(item)}>
              − {item}
            </Button>
          </div>
        ))}
        <Button size="sm" variant="destructive" className="mt-1" onClick={onClear}>
          Clear cart
        </Button>
      </div>
    </div>
  );
}

function ParentStateDemo() {
  const [log, setLog] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Every action re-renders the parent and both children.</p>
        <RenderCount label="Parent" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StateItemList onAdd={(name) => setLog((l) => [`+ ${name}`, ...l])} onRemove={(name) => setLog((l) => [`− ${name}`, ...l])} onClear={() => setLog((l) => ["cleared", ...l])} />
        <StateCart log={log} />
      </div>
    </div>
  );
}

export default function EventBus() {
  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <SectionHeader title="Event bus via Zustand" description="Components communicate through typed events without sharing state. useEvent subscribes; emit fires — no store value is ever read." />

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3 space-y-1.5 text-xs">
            <p className="font-medium">Use events when</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>Something happened; others react but nobody reads the value</li>
              <li>The emitter shouldn't know who is listening</li>
              <li>Side effects across unrelated parts (toast, analytics, modals)</li>
              <li>One-shot notifications — no replay needed on mount</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">Parent never re-renders — only the subscribing child does.</p>
          <div className="grid grid-cols-2 gap-2">
            <ItemList />
            <Cart />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3 space-y-1.5 text-xs">
            <p className="font-medium">Use state when</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>Components need to read the current value (cart count, theme, auth)</li>
              <li>New subscribers need the latest value immediately on mount</li>
              <li>The value persists and can be queried at any time</li>
            </ul>
          </div>
          <ParentStateDemo />
        </div>
      </div>
    </div>
  );
}
