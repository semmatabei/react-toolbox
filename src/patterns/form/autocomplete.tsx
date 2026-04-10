import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Fake remote data
// ---------------------------------------------------------------------------

type Person = { id: string; name: string; role: string; org: string };

const DB: Person[] = [
  { id: "gaearon", name: "Dan Abramov", role: "Engineer", org: "Bluesky" },
  { id: "tj", name: "TJ Holowaychuk", role: "Engineer", org: "Apex" },
  { id: "sindresorhus", name: "Sindre Sorhus", role: "Open Source", org: "Independent" },
  { id: "getify", name: "Kyle Simpson", role: "Author", org: "Independent" },
  { id: "addyosmani", name: "Addy Osmani", role: "Engineer", org: "Google" },
  { id: "vjeux", name: "Christopher Chedeau", role: "Engineer", org: "Meta" },
  { id: "sebmarkbage", name: "Sebastian Markbåge", role: "Engineer", org: "Vercel" },
  { id: "sokra", name: "Tobias Koppers", role: "Engineer", org: "Vercel" },
  { id: "ryanflorence", name: "Ryan Florence", role: "Engineer", org: "Shopify" },
  { id: "mjackson", name: "Michael Jackson", role: "Engineer", org: "Shopify" },
  { id: "swyx", name: "Shawn Wang", role: "DevRel", org: "Airbyte" },
  { id: "tannerlinsley", name: "Tanner Linsley", role: "Engineer", org: "Nozzle" },
  { id: "evanw", name: "Evan Wallace", role: "Engineer", org: "Figma" },
  { id: "evanyou", name: "Evan You", role: "Creator", org: "Independent" },
  { id: "mattpocock", name: "Matt Pocock", role: "Author", org: "Total TypeScript" },
  { id: "kentcdodds", name: "Kent C. Dodds", role: "Author", org: "EpicWeb" },
  { id: "markdalgleish", name: "Mark Dalgleish", role: "Engineer", org: "Atlassian" },
  { id: "colinhacks", name: "Colin McDonnell", role: "Engineer", org: "Independent" },
  { id: "antfu", name: "Anthony Fu", role: "Open Source", org: "NuxtLabs" },
  { id: "jaredpalmer", name: "Jared Palmer", role: "Engineer", org: "Vercel" },
];

async function searchPeople(query: string): Promise<Person[]> {
  // Simulate ~350ms network latency
  await new Promise<void>((r) => setTimeout(r, 300 + Math.random() * 100));
  const q = query.toLowerCase();
  return DB.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.org.toLowerCase().includes(q)).slice(0, 6);
}

// ---------------------------------------------------------------------------
// Shared hook: debounced remote search
// ---------------------------------------------------------------------------

function useRemoteSearch(debounceMs = 300) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsPending(false);
      return;
    }
    setIsPending(true);
    const id = setTimeout(async () => {
      try {
        const data = await searchPeople(query);
        setResults(data);
      } finally {
        setIsPending(false);
      }
    }, debounceMs);
    return () => clearTimeout(id);
  }, [query, debounceMs]);

  return { query, setQuery, results, isPending };
}

// ---------------------------------------------------------------------------
// Demo 1: Command + Popover
// ---------------------------------------------------------------------------
// Classic approach: controlled Popover wraps a cmdk Command.
// `shouldFilter={false}` disables client-side filtering so only
// server-returned results appear.

function CommandPopoverDemo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Person | null>(null);
  const { query, setQuery, results, isPending } = useRemoteSearch();

  function handleSelect(person: Person) {
    setSelected(person);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-72 justify-between font-normal">
            <span className={cn(!selected && "text-muted-foreground")}>{selected ? selected.name : "Search people…"}</span>
            <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Type a name, handle, or org…" value={query} onValueChange={setQuery} />
            <CommandList>
              {isPending && (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full rounded-md" />
                  ))}
                </div>
              )}
              {!isPending && query && results.length === 0 && <CommandEmpty>No results for "{query}".</CommandEmpty>}
              {!isPending && !query && <CommandEmpty className="py-4 text-muted-foreground">Start typing to search.</CommandEmpty>}
              {!isPending && results.length > 0 && (
                <CommandGroup>
                  {results.map((p) => (
                    <CommandItem key={p.id} value={p.id} onSelect={() => handleSelect(p)}>
                      <CheckIcon className={cn("size-3.5 shrink-0", selected?.id === p.id ? "opacity-100" : "opacity-0")} />
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-auto text-muted-foreground">{p.org}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected && (
        <p className="text-xs text-muted-foreground">
          Selected: <strong className="text-foreground">{selected.name}</strong> — {selected.role} @ {selected.org}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo 2: base-ui Combobox
// ---------------------------------------------------------------------------
// Uses base-ui's Combobox with `filter={null}` to disable client-side
// filtering. `onInputValueChange` fires on every keystroke; we ignore
// reason === "item-press" so selecting an item doesn't re-trigger a search.

function ComboboxDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const { query, setQuery, results, isPending } = useRemoteSearch();

  const selectedPerson = DB.find((p) => p.id === selected) ?? null;

  return (
    <div className="space-y-3">
      <Combobox
        value={selected}
        onValueChange={(v) => setSelected(v as string | null)}
        // Disable client-side filtering — we serve pre-filtered results
        filter={null}
        onInputValueChange={(value, { reason }) => {
          // Only fetch when the user is actively typing, not on selection fill
          if (reason === "input-change" || reason === "input-paste") {
            setQuery(value);
          }
          if (reason === "input-clear" || reason === "clear-press") {
            setQuery("");
          }
        }}
        itemToStringLabel={(id) => DB.find((p) => p.id === id)?.name ?? (id as string)}
      >
        <ComboboxInput className="w-72" placeholder="Search people…" showClear={!!selected} />
        <ComboboxContent>
          <ComboboxList>
            {isPending ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full rounded-md" />
                ))}
              </div>
            ) : query && results.length === 0 ? (
              <ComboboxEmpty>No results for "{query}".</ComboboxEmpty>
            ) : !query ? (
              <ComboboxEmpty>Start typing to search.</ComboboxEmpty>
            ) : (
              results.map((p) => (
                <ComboboxItem key={p.id} value={p.id}>
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-auto text-muted-foreground">{p.org}</span>
                </ComboboxItem>
              ))
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {selectedPerson && (
        <p className="text-xs text-muted-foreground">
          Selected: <strong className="text-foreground">{selectedPerson.name}</strong> — {selectedPerson.role} @ {selectedPerson.org}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AutocompleteRemoteFetch() {
  return (
    <div className="space-y-10 p-6">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Command + Popover</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controlled Popover wraps a cmdk <code className="font-mono">Command</code> with <code className="font-mono">shouldFilter=&#123;false&#125;</code>. Results are fetched remotely on each
            debounced keystroke.
          </p>
        </div>
        <CommandPopoverDemo />
      </section>

      <div className="border-t border-border" />

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">base-ui Combobox</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            base-ui <code className="font-mono">Combobox</code> with <code className="font-mono">filter=&#123;null&#125;</code> — client-side filtering disabled. Input changes trigger a debounced
            remote fetch; item selection fills the input via <code className="font-mono">itemToStringLabel</code>.
          </p>
        </div>
        <ComboboxDemo />
      </section>
    </div>
  );
}
