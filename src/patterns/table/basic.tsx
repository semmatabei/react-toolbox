import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DB, type Employee } from "@/components/base/table/mock-db";

const COLUMNS: ColumnDef<Employee>[] = [
  { accessorKey: "id", header: "ID", size: 60 },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "role", header: "Role" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const val = getValue<string>();
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            val === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {val}
        </span>
      );
    },
  },
];

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="ml-1 size-3" />;
  if (sorted === "desc") return <ArrowDown className="ml-1 size-3" />;
  return <ArrowUpDown className="ml-1 size-3 opacity-40" />;
}

export default function BasicTable() {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: DB.slice(0, 5),
    columns: COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() }}>
                  {header.isPlaceholder ? null : (
                    <Button variant="ghost" size="sm" className="-ml-2 h-auto py-0 font-medium text-xs text-muted-foreground hover:text-foreground" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon sorted={header.column.getIsSorted()} />
                    </Button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
