import { create } from 'zustand'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Slice pattern — each domain owns its slice, one combined store
// ---------------------------------------------------------------------------

interface CounterSlice {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

interface ThemeSlice {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

type Store = CounterSlice & ThemeSlice

const useStore = create<Store>((set) => ({
  // Counter slice
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: s.count - 1 })),
  reset: () => set({ count: 0 }),

  // Theme slice
  theme: 'light',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}))

// ---------------------------------------------------------------------------
// Components — each consumes only its relevant slice
// ---------------------------------------------------------------------------
function CounterWidget() {
  const { count, increment, decrement, reset } = useStore()
  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Counter Slice</p>
      <p className="text-3xl font-bold tabular-nums">{count}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={decrement}>−</Button>
        <Button size="sm" onClick={increment}>+</Button>
        <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
      </div>
    </div>
  )
}

function ThemeWidget() {
  const { theme, toggleTheme } = useStore()
  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Theme Slice</p>
      <p className="text-sm">Current: <span className="font-medium">{theme}</span></p>
      <Button size="sm" variant="outline" onClick={toggleTheme}>Toggle Theme</Button>
    </div>
  )
}

export default function StoreSlices() {
  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <p className="text-sm text-muted-foreground">Two independent slices in one Zustand store. Each component subscribes only to its slice.</p>
      <div className="grid grid-cols-2 gap-3">
        <CounterWidget />
        <ThemeWidget />
      </div>
    </div>
  )
}
