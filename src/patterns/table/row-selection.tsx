import { useReactTable, getCoreRowModel, flexRender, type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const INITIAL_DATA: User[] = [
  { id: 1, name: "Alice Martin", email: "alice@acme.com", role: "Admin" },
  { id: 2, name: "Bob Chen", email: "bob@acme.com", role: "Engineer" },
  { id: 3, name: "Carol Smith", email: "carol@acme.com", role: "Designer" },
  { id: 4, name: "Dave Johnson", email: "dave@acme.com", role: "Engineer" },
  { id: 5, name: "Eve Williams", email: "eve@acme.com", role: "Manager" },
];

export default function RowSelection() {
  const [data, setData] = useState(INITIAL_DATA);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      size: 40,
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false} onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)} />
      ),
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />,
    },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role" },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  const selectedIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map(Number);

  function deleteSelected() {
    setData((d) => d.filter((u) => !selectedIds.includes(u.id)));
    setRowSelection({});
  }

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-md bg-muted px-4 py-2 text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <Button size="sm" variant="destructive" onClick={deleteSelected}>
            <Trash2 className="size-3 mr-1" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRowSelection({})}>
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground" style={{ width: header.getSize() }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${row.getIsSelected() ? "bg-muted/50" : ""}`}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            All rows deleted.{" "}
            <button className="underline" onClick={() => setData(INITIAL_DATA)}>
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
