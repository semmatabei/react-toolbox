import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'

interface Post { id: number; title: string; body: string }

async function fetchPage(page: number): Promise<{ posts: Post[]; nextPage: number | null }> {
  await new Promise((r) => setTimeout(r, 600))
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts?_page=${page}&_limit=8`)
  const posts: Post[] = await res.json()
  return { posts, nextPage: page < 5 ? page + 1 : null }
}

export default function InfiniteScroll() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['infinite-posts'],
    queryFn: ({ pageParam }) => fetchPage(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
  })

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage) fetchNextPage() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage])

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="h-96 overflow-y-auto">
        {isLoading && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        <ul className="divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id} className="px-4 py-3">
              <p className="text-sm font-medium capitalize">{post.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.body}</p>
            </li>
          ))}
        </ul>

        {/* Sentinel */}
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isFetchingNextPage && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-xs text-muted-foreground">All posts loaded</p>
          )}
        </div>
      </div>
    </div>
  )
}
