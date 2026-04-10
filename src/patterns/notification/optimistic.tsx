import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/custom/section-header";

type Status = "idle" | "loading" | "success" | "error";

// Simulate a list of items with optimistic updates
const INITIAL_ITEMS = ["Alpha", "Beta", "Gamma", "Delta"];

export default function OptimisticUI() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  async function deleteItem(name: string) {
    // Optimistically remove
    setItems((prev) => prev.filter((i) => i !== name));
    setStatuses((s) => ({ ...s, [name]: "loading" }));

    await new Promise((r) => setTimeout(r, 900));

    // 50% chance of failure
    const fail = Math.random() < 0.5;
    if (fail) {
      // Rollback
      setItems((prev) => [name, ...prev]);
      setStatuses((s) => ({ ...s, [name]: "error" }));
      setTimeout(() => setStatuses((s) => ({ ...s, [name]: "idle" })), 2000);
    } else {
      setStatuses((s) => ({ ...s, [name]: "success" }));
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <SectionHeader description="Optimistic delete — 50% chance of server failure + rollback." />

      <ul className="space-y-2">
        {INITIAL_ITEMS.map((name) => {
          const status = statuses[name] ?? "idle";
          const deleted = !items.includes(name) && status !== "error";
          return (
            <li
              key={name}
              className={`flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-all ${
                deleted ? "opacity-0 pointer-events-none h-0 border-0 p-0 overflow-hidden" : ""
              }`}
            >
              <span>{name}</span>
              <div className="flex items-center gap-2">
                {status === "error" && (
                  <span className="text-xs text-destructive flex items-center gap-1">
                    <XCircle className="size-3" /> Rolled back
                  </span>
                )}
                {status === "success" && <CheckCircle2 className="size-4 text-green-500" />}
                <Button size="sm" variant="ghost" onClick={() => deleteItem(name)} disabled={status === "loading"}>
                  {status === "loading" ? <Loader2 className="size-3 animate-spin" /> : "Delete"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setItems(INITIAL_ITEMS);
          setStatuses({});
        }}
      >
        Reset
      </Button>
    </div>
  );
}
