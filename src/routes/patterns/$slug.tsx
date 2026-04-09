import { createFileRoute } from '@tanstack/react-router'
import { PATTERNS } from '@/lib/patterns'
import { lazy, Suspense } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/patterns/$slug')({
  component: PatternPage,
})

function PatternPage() {
  const { slug } = Route.useParams()
  // slug uses '--' instead of '/' to be URL-safe in a path segment
  const patternSlug = slug.replace('--', '/')
  const meta = PATTERNS.find((p) => p.slug === patternSlug)

  if (!meta) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Pattern not found: <code className="ml-2">{patternSlug}</code>
      </div>
    )
  }

  // Dynamically import the pattern component
  const PatternComponent = lazy(
    () => import(`../patterns/${patternSlug}.tsx`),
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 flex items-center gap-3 px-6 border-b border-border shrink-0">
        <h1 className="text-sm font-semibold">{meta.title}</h1>
        <span className="text-muted-foreground text-xs">—</span>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
        <div className="ml-auto flex gap-1">
          {meta.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <Suspense fallback={<PatternSkeleton />}>
            <PatternComponent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function PatternSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  )
}
