import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, Inbox } from "lucide-react";

interface Post {
  id: number;
  title: string;
  body: string;
}

async function fetchPosts(fail: boolean): Promise<Post[]> {
  await new Promise((r) => setTimeout(r, 800));
  if (fail) throw new Error("Network error — could not fetch posts.");
  const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
  return res.json() as Promise<Post[]>;
}

export default function QueryStates() {
  const [simulateError, setSimulateError] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["posts", simulateError],
    queryFn: () => fetchPosts(simulateError),
    retry: false,
  });

  const displayed = simulateEmpty ? [] : data;

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Refetch
        </Button>
        <Button size="sm" variant={simulateError ? "destructive" : "outline"} onClick={() => setSimulateError((v) => !v)}>
          {simulateError ? "Disable" : "Simulate"} Error
        </Button>
        <Button size="sm" variant={simulateEmpty ? "secondary" : "outline"} onClick={() => setSimulateEmpty((v) => !v)}>
          {simulateEmpty ? "Disable" : "Simulate"} Empty
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Failed to load</p>
            <p className="text-xs">{error.message}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && displayed?.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Inbox className="size-8" />
          <p className="text-sm">No posts found.</p>
        </div>
      )}

      {/* Data */}
      {!isLoading && !isError && displayed && displayed.length > 0 && (
        <ul className="divide-y divide-border">
          {displayed.map((post) => (
            <li key={post.id} className="py-3">
              <p className="text-sm font-medium capitalize">{post.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// useState needs to be imported
import { useState } from "react";
