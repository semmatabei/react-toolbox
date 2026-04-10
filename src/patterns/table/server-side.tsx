import { useReactTable, getCoreRowModel, flexRender, type ColumnDef, type SortingState, type PaginationState } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

interface Post {
  id: number;
  title: string;
  userId: number;
}

async function fetchPosts(page: number, pageSize: number, sorting: SortingState) {
  const sort = sorting[0];
  const params = new URLSearchParams({
    _page: String(page + 1),
    _limit: String(pageSize),
    ...(sort && { _sort: sort.id, _order: sort.desc ? "desc" : "asc" }),
  });
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts?${params}`);
  const total = Number(res.headers.get("x-total-count") ?? 100);
  return { rows: (await res.json()) as Post[], total };
}

const COLUMNS: ColumnDef<Post>[] = [
  { accessorKey: "id", header: "ID", size: 60 },
  { accessorKey: "userId", header: "User" },
  { accessorKey: "title", header: "Title" },
];

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="ml-1 size-3" />;
  if (sorted === "desc") return <ArrowDown className="ml-1 size-3" />;
  return <ArrowUpDown className="ml-1 size-3 opacity-40" />;
}

export default function ServerSideTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });

  const { data, isLoading } = useQuery({
    queryKey: ["server-posts", pagination, sorting],
    queryFn: () => fetchPosts(pagination.pageIndex, pagination.pageSize, sorting),
  });

  const table = useReactTable({
    data: data?.rows ?? [],
    columns: COLUMNS,
    rowCount: data?.total ?? 0,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() }}>
                  <Button variant="ghost" size="sm" className="-ml-2 h-auto py-0 font-medium text-xs text-muted-foreground hover:text-foreground" onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <SortIcon sorted={header.column.getIsSorted()} />
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: pagination.pageSize }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="max-w-xs truncate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="size-3" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
