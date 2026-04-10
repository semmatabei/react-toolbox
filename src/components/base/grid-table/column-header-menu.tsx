import { useEffect, useState } from "react";
import { Pencil, Copy, ArrowLeft, ArrowRight, Snowflake, ArrowUpAZ, ArrowDownZA, Trash2 } from "lucide-react";
import type { ColumnDef } from "./mock-db";
import { EditColumnDropdown } from "./edit-column-dropdown";

interface ColumnHeaderMenuProps {
  col: ColumnDef;
  position: { x: number; y: number };
  onClose: () => void;
  onInsertLeft: () => void;
  onInsertRight: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onFreeze: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onEditColumn?: (colId: string, updates: Partial<ColumnDef>) => void;
}

export function ColumnHeaderMenu({ col, position, onClose, onInsertLeft, onInsertRight, onDuplicate, onDelete, onFreeze, onSortAsc, onSortDesc, onEditColumn }: ColumnHeaderMenuProps) {
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (!showEdit) onClose();
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [onClose, showEdit]);

  if (showEdit) {
    return (
      <EditColumnDropdown
        col={col}
        position={position}
        onClose={onClose}
        onSave={(updates) => {
          onEditColumn?.(col.id, updates);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed z-50 min-w-45 rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ left: Math.min(position.x, window.innerWidth - 200), top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem icon={<Pencil className="w-3.5 h-3.5" />} label="Edit Column" onClick={() => setShowEdit(true)} />
      <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicate Column" onClick={onDuplicate} />
      <div className="h-px bg-border my-1" />
      <MenuItem icon={<ArrowLeft className="w-3.5 h-3.5" />} label="Insert Left" onClick={onInsertLeft} />
      <MenuItem icon={<ArrowRight className="w-3.5 h-3.5" />} label="Insert Right" onClick={onInsertRight} />
      <MenuItem icon={<Snowflake className="w-3.5 h-3.5" />} label="Freeze up to This Column" onClick={onFreeze} />
      <div className="h-px bg-border my-1" />
      <MenuItem icon={<ArrowUpAZ className="w-3.5 h-3.5" />} label="Sort A → Z" onClick={onSortAsc} />
      <MenuItem icon={<ArrowDownZA className="w-3.5 h-3.5" />} label="Sort Z → A" onClick={onSortDesc} />
      <div className="h-px bg-border my-1" />
      <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete Column" onClick={onDelete} className="text-destructive" />
    </div>
  );
}

function MenuItem({ icon, label, onClick, className = "" }: { icon: React.ReactNode; label: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors ${className}`}>
      {icon}
      {label}
    </button>
  );
}
