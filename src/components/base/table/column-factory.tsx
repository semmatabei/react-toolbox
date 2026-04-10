import React, { useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CellEditor } from "./cell-editor";
import { type FieldSchema } from "./types";

export interface EditContext<T> {
  editRowId: any;
  setEditRowId: (id: any) => void;
  onSave: (id: any, values: Partial<T>) => void;
  onDelete: (id: any, row: T) => void;
  onCancel: (id: any) => void;
}

export function columnDefinitionCreator<T extends Record<string, any>>(schema: FieldSchema[], customRender: Partial<Record<string, (value: any, row: T) => React.ReactNode>> = {}) {
  return function getColumns(context: EditContext<T>) {
    const { editRowId, setEditRowId, onSave, onDelete, onCancel } = context;
    const editRowValueRef = useRef<Record<string, any>>({});
    const prevEditRowId = useRef<any>(null);
    if (editRowId !== prevEditRowId.current) {
      editRowValueRef.current = {};
      prevEditRowId.current = editRowId;
    }

    const columns = schema.map((field) => ({
      key: field.id as keyof T,
      header: field.label,
      sortable: field.sortable,
      width: field.width,
      cell: (value: any, row: T) => {
        if (customRender[field.id]) return customRender[field.id]!(value, row);

        if (editRowId === row.id && field.inputType !== "readonly") {
          return (
            <div className="relative z-10 -mx-2 -my-2.5 flex min-h-10.5 items-center overflow-hidden bg-accent/40 focus-within:overflow-visible">
              <CellEditor field={field} value={value} row={row} editRowValueRef={editRowValueRef} />
            </div>
          );
        }

        if (field.type === "boolean") {
          return (
            <div className="flex justify-center">
              <Checkbox checked={!!value} disabled />
            </div>
          );
        }

        const viewValue = field.viewValue ? field.viewValue(value, row) : value;
        return (
          <div title={typeof viewValue === "string" ? viewValue : undefined} className={`overflow-hidden text-ellipsis whitespace-nowrap ${field.type === "number" ? "text-right" : "text-left"}`}>
            {viewValue ?? ""}
          </div>
        );
      },
    }));

    columns.push({
      key: "actions" as keyof T,
      header: "",
      sortable: false,
      width: "shrink",
      cell: (_v: any, row: T) =>
        editRowId === row.id ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => onCancel(row.id)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSave(row.id, { ...row, ...editRowValueRef.current })}>
              Save
            </Button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setEditRowId(row.id)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(row.id, row)}>
              Delete
            </Button>
          </div>
        ),
    } as any);

    return columns;
  };
}
