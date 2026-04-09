import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
}

const ITEMS: CommandItem[] = [
  {
    id: "1",
    label: "Go to Dashboard",
    category: "Navigation",
    action: () => console.log("→ Dashboard"),
  },
  { id: "2", label: "Go to Users", category: "Navigation", action: () => console.log("→ Users") },
  {
    id: "3",
    label: "Go to Settings",
    category: "Navigation",
    action: () => console.log("→ Settings"),
  },
  {
    id: "4",
    label: "Create New User",
    category: "Actions",
    action: () => console.log("Create user"),
  },
  { id: "5", label: "Export CSV", category: "Actions", action: () => console.log("Export CSV") },
  {
    id: "6",
    label: "Toggle Dark Mode",
    category: "Preferences",
    action: () => console.log("Toggle theme"),
  },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSelect(item: CommandItem) {
    item.action();
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
    if (e.key === "Enter" && filtered[active]) handleSelect(filtered[active]);
  }

  const byCategory = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <p className="text-sm text-muted-foreground">
        Press <kbd className="rounded border border-border px-1.5 py-0.5 text-xs font-mono">⌘K</kbd> or click the button to open.
      </p>

      <Button variant="outline" onClick={() => setOpen(true)}>
        <Search className="size-3 mr-2" /> Search…
        <span className="ml-auto text-xs text-muted-foreground font-mono">⌘K</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Type a command…"
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
              />
            </div>

            <div className="max-h-72 overflow-y-auto py-2">
              {Object.keys(byCategory).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No results.</p>}
              {Object.entries(byCategory).map(([category, items]) => (
                <div key={category}>
                  <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{category}</p>
                  {items.map((item) => {
                    const idx = filtered.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${active === idx ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => handleSelect(item)}
                      >
                        <ArrowRight className="size-3 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
