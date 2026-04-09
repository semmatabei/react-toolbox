import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface User { id: number; name: string; email: string; role: string; status: 'active' | 'inactive' }

const DATA: User[] = [
  { id: 1, name: 'Alice Martin', email: 'alice@acme.com', role: 'Admin', status: 'active' },
  { id: 2, name: 'Bob Chen', email: 'bob@acme.com', role: 'Engineer', status: 'active' },
  { id: 3, name: 'Carol Smith', email: 'carol@acme.com', role: 'Designer', status: 'inactive' },
  { id: 4, name: 'Dave Johnson', email: 'dave@acme.com', role: 'Engineer', status: 'active' },
  { id: 5, name: 'Eve Williams', email: 'eve@acme.com', role: 'Manager', status: 'inactive' },
]

const COLUMNS: ColumnDef<User>[] = [
  { accessorKey: 'id', header: 'ID', size: 60 },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const val = getValue<string>()
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          val === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
        }`}>
          {val}
        </span>
      )
    },
  },
]

export default function BasicTable() {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: DATA,
    columns: COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-auto py-0 font-medium text-xs text-muted-foreground hover:text-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="ml-1 size-3" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="ml-1 size-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 size-3 opacity-40" />
                      )}
                    </Button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/30 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
