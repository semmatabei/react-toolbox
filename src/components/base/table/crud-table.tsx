import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import InputImage from "./InputImageAdmin/InputImageAdmin";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import RichTextEditor from "./RichText/RichText";

export interface FieldSchema {
  id: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "json" | "int" | "float";
  inputType: "text" | "textarea" | "number" | "checkbox" | "select" | "date" | "readonly" | "autocomplete" | "image" | "image-multiple" | "rich-text";
  sortable?: boolean;
  filterable?: boolean;
  options?: Array<{ label: string; value: any; disabled?: boolean }>;
  onFilter?: (query: string) => Promise<Array<{ label: string; value: string }>>;
  viewValue?: (value: any, row: any) => string | React.ReactNode;
  editValue?: (value: any, row: any) => any;
  width?: string; // in px
  required?: boolean;
}

export type FilterCondition = {
  field: string;
  operator: string;
  value: any;
};

export const filterOperators = [
  { value: "equals", label: "=" },
  { value: "contains", label: "contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  // Add more operators as needed
];

export function CellEditor({ field, value, row, editRowValueRef }) {
  const [cellValue, setCellValue] = useState((field.editValue ? field.editValue(value, row) : value) || "");

  const handleChange = (value) => {
    setCellValue(value);
    editRowValueRef.current[field.id] = value;
  };

  if (field.inputType === "checkbox") {
    return <InputCheckbox className="flex h-full items-center justify-center" checked={!!cellValue} onChange={(e) => handleChange(e.target.checked)} />;
  }
  if (field.inputType === "textarea") {
    return <Textarea value={cellValue} className="max-h-40 rounded-none border-0 bg-blue-50" onChange={(value) => handleChange(value)} placeholder={field.label} />;
  }
  if (field.inputType === "autocomplete") {
    return (
      <Autocomplete
        value={cellValue}
        className="h-full"
        fullHeight
        inputClassName="w-full border-0 rounded-none h-full !bg-transparent"
        suggestions={field.onFilter}
        onChange={(value) => handleChange(value)}
        placeholder={field.label}
      />
    );
  }
  if (field.inputType === "image") {
    return <InputImage value={withCdn(cellValue)} onChange={(value) => handleChange(value.filepath)} />;
  }
  if (field.inputType === "image-multiple") {
    return <ImageMultiplePopover images={cellValue || []} onChange={handleChange} />;
  }
  if (field.inputType === "rich-text") {
    return <InsideRichText value={cellValue} onChange={(value) => handleChange(value)} />;
  }
  if (field.inputType === "select" && field.options) {
    return (
      <Select value={cellValue} onValueChange={(v) => handleChange(v)}>
        <SelectTrigger className="input m-auto h-full w-full rounded-none border-0 ring-0">
          <SelectValue placeholder={field.label} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((opt) => (
            <SelectItem key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Default to text
  const inputType = field.inputType === "number" || "date" ? field.inputType : "text";
  return <input className="h-full w-full border-0 bg-transparent px-2 text-sm" type={inputType} value={cellValue} onChange={(e) => handleChange(e.target.value)} />;
}

export function FilterCreator(schema: FieldSchema[]): React.FC<{ handleApplyFilter: (filter: FilterCondition[]) => void }> {
  const filterFields = schema.filter((f) => f.filterable);

  return function Filter({ handleApplyFilter }: { handleApplyFilter: (filter: FilterCondition[]) => void }) {
    const [filters, setFilters] = useState<FilterCondition[]>([{ field: "", operator: "contains", value: "" }]);

    const handleFilterChange = (idx: number, cond: FilterCondition) => {
      setFilters((prev) => prev.map((f, i) => (i === idx ? cond : f)));
    };

    const handleAddFilter = () => {
      setFilters((prev) => [...prev, { field: "", operator: "contains", value: "" }]);
    };
    const handleRemoveFilter = (idx: number) => {
      setFilters((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
    };
    const handleBeforeApplyFilter = () => {
      // convert value type based on field schema
      const fieldDefMap = filterFields.reduce(
        (acc, field) => {
          acc[field.id] = { type: field.type, inputType: field.inputType };
          return acc;
        },
        {} as Record<string, { type: string; inputType: string }>,
      );

      const appliedFilters = filters.map((f) => {
        const fieldDef = fieldDefMap[f.field];
        let value: any = f.value;
        if (fieldDef) {
          if (fieldDef.inputType === "autocomplete") {
            value = f.value.value;
          } else if (fieldDef.type === "number") {
            value = Number(f.value);
          } else if (fieldDef.type === "boolean") {
            value = f.value === "true" || f.value === "1";
          }
        }
        return { ...f, value };
      });
      console.log("Applying filters", appliedFilters);
      handleApplyFilter(appliedFilters);
    };

    return (
      <div className="items-top mb-4 flex gap-4 rounded border border-gray-300 p-4">
        <div className="pt-1.5 font-semibold">Filter</div>
        <div className="space-y-2">
          {filters.map((cond, idx) => (
            <FilterRule key={idx} condition={cond} onChange={(c) => handleFilterChange(idx, c)} onRemove={() => handleRemoveFilter(idx)} disableRemove={filters.length === 1} />
          ))}
        </div>
        <div className="flex gap-2 border-l border-gray-300 pl-4 pt-0.5">
          <Button size="sm" onClick={handleAddFilter}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="default" onClick={handleBeforeApplyFilter}>
            Filter
          </Button>
        </div>
      </div>
    );
  };

  function FilterRule({ condition, onChange, onRemove, disableRemove }: { condition: FilterCondition; onChange: (cond: FilterCondition) => void; onRemove: () => void; disableRemove?: boolean }) {
    // Find the selected field schema
    const selectedField = filterFields.find((f) => f.id === condition.field) || filterFields[0];
    // Choose input type based on schema
    let valueInput: React.ReactNode;
    if (selectedField?.inputType === "checkbox") {
      valueInput = (
        <Select value={condition.value} onValueChange={(v) => onChange({ ...condition, value: v })}>
          <SelectTrigger className="input input-sm w-[80px]">
            <SelectValue placeholder="Value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    } else if (selectedField?.inputType === "select" && selectedField.options) {
      valueInput = (
        <Select value={condition.value} onValueChange={(v) => onChange({ ...condition, value: v })}>
          <SelectTrigger className="input input-sm w-[120px]">
            <SelectValue placeholder="Value" />
          </SelectTrigger>
          <SelectContent>
            {selectedField.options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else if (selectedField?.inputType === "autocomplete") {
      valueInput = <Autocomplete value={condition.value} className="w-[120px]" suggestions={selectedField.onFilter} onChange={(value) => onChange({ ...condition, value })} placeholder="Value" />;
    } else {
      valueInput = <Input className="input input-sm w-[120px]" value={condition.value} onChange={(e) => onChange({ ...condition, value: e.target.value })} placeholder="Value" />;
    }

    return (
      <div className="flex items-center gap-2">
        <Select value={condition.field} onValueChange={(v) => onChange({ ...condition, field: v, value: "" })}>
          <SelectTrigger className="input input-sm w-[120px]">
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            {filterFields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={condition.operator} onValueChange={(v) => onChange({ ...condition, operator: v })}>
          <SelectTrigger className="input input-sm w-[120px]">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {filterOperators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {valueInput}
        <Button size="sm" onClick={onRemove} disabled={disableRemove}>
          <Minus className="h-4 w-4" />
        </Button>
      </div>
    );
  }
}

export function columnDefinitionCreator(schema: FieldSchema[], customRender: Record<string, (value: any, row: any) => React.ReactNode>) {
  return function geColumns(editRowId, setEditRowId, onSave, onDelete, onCancel) {
    const editRowValueRef = useRef<any>({});
    const prevEditRowId = useRef<any>(null);
    if (editRowId !== prevEditRowId.current) {
      editRowValueRef.current = {};
      prevEditRowId.current = editRowId;
    }

    const columns = schema
      .map((field) => {
        return {
          key: field.id,
          header: field.label,
          sortable: field.sortable,
          width: field.width,
          className: "",
          cell: (value: any, row: any) => {
            // Custom render
            if (customRender[field.id]) return customRender[field.id](value, row);
            // Editable cell with local state
            if (editRowId === row.id && field.inputType !== "readonly") {
              return (
                <div className="relative z-10 -m-2 h-[50px] max-h-12 overflow-hidden bg-blue-50 focus-within:overflow-visible">
                  <CellEditor field={field} value={value} row={row} editRowValueRef={editRowValueRef} />
                </div>
              );
            }
            // Readonly cell
            const viewValue = field.viewValue ? field.viewValue(value, row) : value;

            if (field.type === "boolean")
              return (
                <div className="flex justify-center">
                  <InputCheckbox checked={!!value} disabled />
                </div>
              );

            const textAlign = field.type === "number" ? "text-right" : "text-left";
            return (
              <div title={viewValue} className={`${textAlign} overflow-hidden text-ellipsis whitespace-nowrap`}>
                {viewValue}
              </div>
            );
          },
        };
      })
      .filter(Boolean);

    // Add actions column
    columns.push({
      key: "actions",
      header: "",
      sortable: false,
      width: "130",
      cell: (_v, row) =>
        editRowId === row.id ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onCancel(row.id)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={() => onSave(row.id, { ...row, ...editRowValueRef.current })}>
              Save
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setEditRowId(row.id)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(row.id, row.name)}>
              Delete
            </Button>
          </div>
        ),
      className: "whitespace-nowrap",
    });
    return columns;
  };
}

// --- ImageMultiplePopover component ---
function ImageMultiplePopover({ images = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    e.dataTransfer.setDragImage(e.target, 0, 0); // Use the dragged element as the drag image
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (idx) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    const newImages = [...images];
    const [removed] = newImages.splice(draggedIdx, 1);
    newImages.splice(idx, 0, removed);
    setDraggedIdx(null);
    onChange(newImages);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className="flex h-full w-full items-center justify-center">
        <Button size="sm" variant="outline">
          {images.length > 0 ? (
            <img src={withCdn(images[0])} className="mr-2 inline-block h-8 w-8 rounded border object-contain align-middle" />
          ) : (
            <span className="mr-2 inline-block h-8 w-8 rounded border bg-gray-200 align-middle" />
          )}
          <span className="align-middle">Manage ({images.length})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[340px] max-w-[95vw] p-6">
        <div className="flex flex-wrap gap-4">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={"group relative flex h-32 w-32 cursor-move rounded border bg-gray-50 p-1 transition-shadow hover:shadow-md" + (draggedIdx === idx ? " border-blue-400 opacity-50" : "")}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              title="Drag to reorder"
            >
              <img src={withCdn(img)} className="h-full w-full rounded object-cover" />
              <Button size="icon" className="absolute right-2 top-2" onClick={() => onChange(images.filter((_, i) => i !== idx))}>
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="h-32 w-32">
            <InputImage value={null} onChange={(value) => onChange([...images, value.filepath])} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InsideRichText({ value, onChange }) {
  const handleClick = () => {
    ShowModal(({ open, setOpen }) => (
      <ModalBasic open={open} setOpen={setOpen} className="h-max w-6/12">
        <RichTextEditor value={value} onChange={(v) => onChange(v)} />
      </ModalBasic>
    ));
  };

  return (
    <div className="relative h-full cursor-text p-2" onClick={handleClick}>
      {value ? <div>{value}</div> : <div className="flex h-full items-center text-gray-400">Click to edit</div>}
    </div>
  );
}
