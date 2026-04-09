import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface Post { id: number; title: string; userId: number }
interface PageResult { rows: Post[]; total: number }

async function fetchPosts(page: number, pageSize: number, sorting: SortingState): Promise<PageResult> {
  const sort = sorting[0]
  const url = new URL('https://jsonplaceholder.typicode.com/posts')
  url.searchParams.set('_page', String(page + 1))
  url.searchParams.set('_limit', String(pageSize))
  if (sort) {
    url.searchParams.set('_sort', sort.id)
    url.searchParams.set('_order', sort.desc ? 'desc' : 'asc')
  }
  const res = await fetch(url)
  const total = Number(res.headers.get('x-total-count') ?? 100)
  const rows: Post[] = await res.json()
  return { rows, total }
}

const COLUMNS: ColumnDef<Post>[] = [
  { accessorKey: 'id', header: 'ID', size: 60 },
  { accessorKey: 'userId', header: 'User' },
  { accessorKey: 'title', header: 'Title' },
]

export default function ServerSideTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 })

  const { data, isLoading } = useQuery({
    queryKey: ['server-posts', pagination, sorting],
    queryFn: () => fetchPosts(pagination.pageIndex, pagination.pageSize, sorting),
  })

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
  })

  return (
    <div className="rounded-lg border border-border overflow-hidden space-y-0">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground" style={{ width: header.getSize() }}>
                  <Button
                    variant="ghost" size="sm"
                    className="-ml-2 h-auto py-0 font-medium text-xs text-muted-foreground hover:text-foreground"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' ? <ArrowUp className="ml-1 size-3" /> : header.column.getIsSorted() === 'desc' ? <ArrowDown className="ml-1 size-3" /> : <ArrowUpDown className="ml-1 size-3 opacity-40" />}
                  </Button>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading
            ? Array.from({ length: pagination.pageSize }).map((_, i) => (
                <tr key={i}><td colSpan={3} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td></tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 max-w-xs truncate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
        <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
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
  )
}
