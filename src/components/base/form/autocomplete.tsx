import { Skeleton } from "@/components/ui/skeleton";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutocompleteItem {
  value: string;
  label: React.ReactNode;
}

export interface AutocompleteProps {
  /** The currently selected value (item key). */
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** Items to display in the dropdown. */
  items: AutocompleteItem[];
  /** Whether remote results are loading. */
  isPending?: boolean;
  /** Current search query — used to decide which empty state to show. */
  query: string;
  /** Called when the user types or clears the input. */
  onQueryChange: (query: string) => void;
  /**
   * Resolves a stored value back to its display label.
   * Required so the input shows the selected item's text after selection.
   */
  itemToStringLabel: (value: string) => string;
  placeholder?: string;
  className?: string;
  /** Number of skeleton rows shown while loading. */
  loadingRows?: number;
  /** Message shown when query is non-empty but no results were found. */
  noResultsText?: string | ((query: string) => string);
  /** Message shown when the input is empty (before any search). */
  promptText?: string;
}

// ---------------------------------------------------------------------------
// Autocomplete
// ---------------------------------------------------------------------------

export function Autocomplete({
  value,
  onValueChange,
  items,
  isPending = false,
  query,
  onQueryChange,
  itemToStringLabel,
  placeholder = "Search…",
  className,
  loadingRows = 3,
  noResultsText = (q) => `No results for "${q}".`,
  promptText = "Start typing to search.",
}: AutocompleteProps) {
  const noResults = typeof noResultsText === "function" ? noResultsText(query) : noResultsText;

  return (
    <Combobox
      value={value}
      onValueChange={(v) => onValueChange(v as string | null)}
      filter={null}
      onInputValueChange={(inputValue, { reason }) => {
        if (reason === "input-change") {
          onQueryChange(inputValue);
        }
        if (reason === "input-clear" || reason === "clear-press") {
          onQueryChange("");
        }
      }}
      itemToStringLabel={itemToStringLabel}
    >
      <ComboboxInput className={className} placeholder={placeholder} showClear={!!value} />
      <ComboboxContent>
        <ComboboxList>
          {isPending ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: loadingRows }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-md" />
              ))}
            </div>
          ) : query && items.length === 0 ? (
            <ComboboxEmpty>{noResults}</ComboboxEmpty>
          ) : !query ? (
            <ComboboxEmpty>{promptText}</ComboboxEmpty>
          ) : (
            items.map((item) => (
              <ComboboxItem key={item.value} value={item.value}>
                {item.label}
              </ComboboxItem>
            ))
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
