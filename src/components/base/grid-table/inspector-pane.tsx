import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import type { ColumnDef } from "./mock-db";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InspectorPaneProps {
  open: boolean;
  onClose: () => void;
  row: Record<string, any> | null;
  columns: ColumnDef[];
  tableName: string;
  onSave?: (rowId: string, updates: Record<string, any>) => void;
}

const colorMap: Record<string, string> = {
  confirmed: "bg-status-confirmed",
  draft: "bg-status-draft",
  pending: "bg-status-pending",
  cancelled: "bg-status-cancelled",
};

export function InspectorPane({ open, onClose, row, columns, tableName, onSave }: InspectorPaneProps) {
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (row) {
      setDraft({ ...row });
      setIsDirty(false);
    }
  }, [row]);

  if (!open || !row) return null;

  const titleCol = columns.find((c) => c.type === "text");
  const title = titleCol ? draft[titleCol.id] || row[titleCol.id] : `Record ${row.id}`;

  const handleChange = (colId: string, value: any) => {
    setDraft((prev) => ({ ...prev, [colId]: value }));
    setIsDirty(true);
  };

  const handleSubmit = () => {
    if (onSave && row) {
      const updates: Record<string, any> = {};
      columns.forEach((col) => {
        if (draft[col.id] !== row[col.id]) {
          updates[col.id] = draft[col.id];
        }
      });
      if (Object.keys(updates).length > 0) {
        onSave(row.id, updates);
      }
      setIsDirty(false);
    }
  };

  return (
    <div className="w-80 h-full border-l border-border bg-card shrink-0 animate-slide-in-right flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{tableName}</p>
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {columns.map((col) => {
          const value = draft[col.id] ?? "";

          return (
            <div key={col.id}>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{col.name}</label>
              <div className="mt-1">
                {col.type === "select" && col.options ? (
                  <Select value={String(value)} onValueChange={(v) => handleChange(col.id, v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {col.options.map((opt) => (
                        <SelectItem key={opt.label} value={opt.label}>
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", colorMap[opt.color] || "")} />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : col.type === "number" ? (
                  <Input type="number" value={value} onChange={(e) => handleChange(col.id, e.target.value === "" ? "" : Number(e.target.value))} className="h-8 text-sm" />
                ) : col.type === "date" ? (
                  <Input type="date" value={value} onChange={(e) => handleChange(col.id, e.target.value)} className="h-8 text-sm" />
                ) : (
                  <Input type={col.type === "email" ? "email" : "text"} value={value} onChange={(e) => handleChange(col.id, e.target.value)} className="h-8 text-sm" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="p-4 border-t border-border">
        <Button onClick={handleSubmit} disabled={!isDirty} className="w-full gap-2" size="sm">
          <Check className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
