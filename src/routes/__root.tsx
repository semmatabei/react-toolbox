import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { CATEGORIES, PATTERNS } from '@/lib/patterns'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Package2 } from 'lucide-react'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}

function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-border shrink-0">
        <Package2 className="size-4 text-muted-foreground" />
        <span className="font-semibold text-sm">react-toolbox</span>
      </div>

      <ScrollArea className="flex-1">
        <nav className="py-3">
          {CATEGORIES.map((cat) => {
            const patterns = PATTERNS.filter((p) => p.category === cat.value)
            return (
              <div key={cat.value} className="mb-4">
                <p className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </p>
                {patterns.map((pattern) => (
                  <Link
                    key={pattern.slug}
                    to="/patterns/$slug"
                    params={{ slug: pattern.slug.replace('/', '--') }}
                    className="flex items-center px-4 py-1.5 text-sm text-foreground/70 hover:text-foreground hover:bg-muted rounded-none transition-colors"
                    activeProps={{ className: 'bg-muted text-foreground font-medium' }}
                  >
                    {pattern.title}
                  </Link>
                ))}
                <Separator className="mt-3" />
              </div>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}
