import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { type FieldSchema } from "./types";

export function CellEditor({ field, value, row, editRowValueRef }: { field: FieldSchema; value: any; row: any; editRowValueRef: React.MutableRefObject<Record<string, any>> }) {
  const [cellValue, setCellValue] = useState((field.editValue ? field.editValue(value, row) : value) ?? "");

  const handleChange = (val: any) => {
    setCellValue(val);
    editRowValueRef.current[field.id] = val;
  };

  if (field.inputType === "checkbox") {
    return (
      <div className="flex h-full items-center justify-center">
        <Checkbox checked={!!cellValue} onCheckedChange={(checked) => handleChange(!!checked)} />
      </div>
    );
  }

  if (field.inputType === "textarea") {
    return <Textarea value={cellValue} className="min-h-0 rounded-none border-0 bg-accent/30 text-xs" onChange={(e) => handleChange(e.target.value)} placeholder={field.label} />;
  }

  if (field.inputType === "autocomplete") {
    const displayValue = typeof cellValue === "object" && cellValue !== null ? (cellValue.label ?? "") : (cellValue ?? "");
    return <Input value={displayValue} className="h-full rounded-none border-0 bg-accent/30 text-xs" onChange={(e) => handleChange(e.target.value)} placeholder={field.label} />;
  }

  if (field.inputType === "image") {
    return (
      <div className="flex h-full items-center gap-2 px-2">
        {cellValue && <img src={cellValue} alt="" className="h-8 w-8 rounded border object-contain" />}
        <input
          type="file"
          accept="image/*"
          className="text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleChange(URL.createObjectURL(file));
          }}
        />
      </div>
    );
  }

  if (field.inputType === "image-multiple") {
    const images: string[] = Array.isArray(cellValue) ? cellValue : [];
    return (
      <div className="flex h-full flex-col gap-1 p-1">
        <div className="flex flex-wrap gap-1">
          {images.map((src, i) => (
            <div key={i} className="group relative">
              <img src={src} alt="" className="h-8 w-8 rounded border object-contain" />
              <button
                type="button"
                className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] group-hover:flex"
                onClick={() => handleChange(images.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="text-xs"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            handleChange([...images, ...files.map((f) => URL.createObjectURL(f))]);
          }}
        />
      </div>
    );
  }

  if (field.inputType === "select" && field.options) {
    return (
      <Select value={String(cellValue)} onValueChange={(v) => handleChange(v)}>
        <SelectTrigger className="h-full w-full rounded-none border-0 bg-accent/30 text-xs ring-0">
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

  const inputType = field.inputType === "number" || field.inputType === "date" ? field.inputType : "text";
  return <Input type={inputType} value={cellValue} className="h-full rounded-none border-0 bg-accent/30 text-xs" onChange={(e) => handleChange(e.target.value)} placeholder={field.label} />;
}
