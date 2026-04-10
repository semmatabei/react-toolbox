import { useState } from "react";
import type { ColumnDef } from "./mock-db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight, Search, Type, Hash, CalendarDays, Mail, List, X, Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD_TYPES: { value: ColumnDef["type"]; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Text", icon: <Type className="w-4 h-4" /> },
  { value: "number", label: "Number", icon: <Hash className="w-4 h-4" /> },
  { value: "select", label: "Single Option", icon: <List className="w-4 h-4" /> },
  { value: "date", label: "Date", icon: <CalendarDays className="w-4 h-4" /> },
  { value: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
];

interface EditColumnDropdownProps {
  col: ColumnDef;
  position: { x: number; y: number };
  onClose: () => void;
  onSave: (updates: Partial<ColumnDef>) => void;
}

export function EditColumnDropdown({ col, position, onClose, onSave }: EditColumnDropdownProps) {
  const [name, setName] = useState(col.name);
  const [type, setType] = useState(col.type);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [options, setOptions] = useState<{ label: string; color: string }[]>(col.options || []);

  const filteredTypes = FIELD_TYPES.filter((t) => t.label.toLowerCase().includes(typeSearch.toLowerCase()));

  const selectedTypeInfo = FIELD_TYPES.find((t) => t.value === type);

  const addOption = () => {
    setOptions((prev) => [...prev, { label: `value ${prev.length + 1}`, color: "draft" }]);
  };

  const removeOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateOptionLabel = (idx: number, label: string) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, label } : o)));
  };

  if (showTypePicker) {
    return (
      <div
        className="fixed z-50 w-60 rounded-md border border-border bg-popover shadow-md animate-in fade-in-0 zoom-in-95"
        style={{ left: Math.min(position.x, window.innerWidth - 260), top: position.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} placeholder="Search" className="h-7 pl-7 text-xs" autoFocus />
          </div>
        </div>
        <div className="py-1 max-h-64 overflow-y-auto">
          <div className="px-2 py-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Basic</span>
          </div>
          {filteredTypes.map((ft) => (
            <button
              key={ft.value}
              onClick={() => {
                setType(ft.value);
                setShowTypePicker(false);
              }}
              className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors", ft.value === type && "text-primary font-medium")}
            >
              {ft.icon}
              <span className="flex-1 text-left">{ft.label}</span>
              {ft.value === type && <span className="text-primary">✓</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 w-75 rounded-md border border-border bg-popover shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ left: Math.min(position.x, window.innerWidth - 320), top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Field title</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" autoFocus />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Field type</label>
          <button
            onClick={() => setShowTypePicker(true)}
            className="flex w-full items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm hover:bg-secondary transition-colors"
          >
            {selectedTypeInfo?.icon}
            <span className="flex-1 text-left">{selectedTypeInfo?.label || type}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {type === "select" && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Options</label>
            <div className="space-y-1.5">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                  <div className="w-3 h-3 rounded-sm bg-amber-400 shrink-0" />
                  <Input value={opt.label} onChange={(e) => updateOptionLabel(idx, e.target.value)} className="h-7 text-xs flex-1" />
                  <button onClick={() => removeOption(idx)} className="p-0.5 hover:bg-accent rounded">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addOption} className="flex items-center gap-1 mt-2 text-xs text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-3 h-3" /> Add Option
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={() => onSave({ name, type, ...(type === "select" ? { options } : {}) })}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
