import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

// Reusable debounce hook
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const FRUITS = [
  "Apple",
  "Apricot",
  "Avocado",
  "Banana",
  "Blueberry",
  "Cherry",
  "Coconut",
  "Grape",
  "Grapefruit",
  "Guava",
  "Kiwi",
  "Lemon",
  "Lime",
  "Mango",
  "Orange",
  "Papaya",
  "Peach",
  "Pear",
  "Pineapple",
  "Plum",
  "Raspberry",
  "Strawberry",
  "Watermelon",
];

export default function DebouncedSearch() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const [fireCount, setFireCount] = useState(0);

  const filtered = FRUITS.filter((f) => f.toLowerCase().includes(debounced.toLowerCase()));

  // Track how many actual "searches" fired
  useEffect(() => {
    if (debounced) setFireCount((n) => n + 1);
  }, [debounced]);

  const highlightMatch = useCallback(
    (text: string) => {
      if (!debounced) return text;
      const idx = text.toLowerCase().indexOf(debounced.toLowerCase());
      if (idx === -1) return text;
      return (
        <>
          {text.slice(0, idx)}
          <mark className="bg-yellow-200 dark:bg-yellow-800 rounded-sm">{text.slice(idx, idx + debounced.length)}</mark>
          {text.slice(idx + debounced.length)}
        </>
      );
    },
    [debounced],
  );

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Keystrokes fire immediately; search debounces 300ms.</span>
        <Badge variant="secondary">Searches fired: {fireCount}</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search fruits…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {filtered.map((fruit) => (
          <div key={fruit} className="rounded-md border border-border px-3 py-2 text-sm">
            {highlightMatch(fruit)}
          </div>
        ))}
        {filtered.length === 0 && <p className="col-span-3 text-sm text-muted-foreground text-center py-4">No results.</p>}
      </div>
    </div>
  );
}
