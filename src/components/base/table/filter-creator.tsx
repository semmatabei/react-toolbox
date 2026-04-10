import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { type FieldSchema, type FilterCondition, filterOperators } from "./types";

export function FilterCreator(schema: FieldSchema[]): React.FC<{ handleApplyFilter: (filter: FilterCondition[]) => void }> {
  const filterFields = schema.filter((f) => f.filterable);

  return function Filter({ handleApplyFilter }: { handleApplyFilter: (filter: FilterCondition[]) => void }) {
    const [filters, setFilters] = useState<FilterCondition[]>([{ field: filterFields[0]?.id ?? "", operator: "contains", value: "" }]);

    const handleFilterChange = (idx: number, cond: FilterCondition) => {
      setFilters((prev) => prev.map((f, i) => (i === idx ? cond : f)));
    };
    const handleAddFilter = () => {
      setFilters((prev) => [...prev, { field: filterFields[0]?.id ?? "", operator: "contains", value: "" }]);
    };
    const handleRemoveFilter = (idx: number) => {
      setFilters((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
    };
    const handleBeforeApplyFilter = () => {
      const fieldDefMap = filterFields.reduce<Record<string, { type: string; inputType: string }>>((acc, field) => {
        acc[field.id] = { type: field.type, inputType: field.inputType };
        return acc;
      }, {});

      const appliedFilters = filters.map((f) => {
        const fieldDef = fieldDefMap[f.field];
        let value: any = f.value;
        if (fieldDef) {
          if (fieldDef.type === "number") value = Number(f.value);
          else if (fieldDef.type === "boolean") value = f.value === "true" || f.value === "1";
        }
        return { ...f, value };
      });
      handleApplyFilter(appliedFilters);
    };

    return (
      <div className="mb-4 flex flex-wrap items-start gap-4 rounded-md border border-border p-4">
        <div className="pt-1.5 text-xs font-semibold">Filter</div>
        <div className="space-y-2">
          {filters.map((cond, idx) => (
            <FilterRule key={idx} condition={cond} onChange={(c) => handleFilterChange(idx, c)} onRemove={() => handleRemoveFilter(idx)} disableRemove={filters.length === 1} />
          ))}
        </div>
        <div className="flex gap-2 border-l border-border pl-4 pt-0.5">
          <Button size="sm" variant="outline" onClick={handleAddFilter}>
            <Plus />
          </Button>
          <Button size="sm" onClick={handleBeforeApplyFilter}>
            Apply
          </Button>
        </div>
      </div>
    );
  };

  function FilterRule({ condition, onChange, onRemove, disableRemove }: { condition: FilterCondition; onChange: (cond: FilterCondition) => void; onRemove: () => void; disableRemove?: boolean }) {
    const selectedField = filterFields.find((f) => f.id === condition.field) ?? filterFields[0];

    let valueInput: React.ReactNode;
    if (selectedField?.inputType === "checkbox") {
      valueInput = (
        <Select value={condition.value} onValueChange={(v) => onChange({ ...condition, value: v })}>
          <SelectTrigger className="h-7 w-24 text-xs">
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
          <SelectTrigger className="h-7 w-32 text-xs">
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
    } else {
      valueInput = <Input className="h-7 w-32 text-xs" value={condition.value} onChange={(e) => onChange({ ...condition, value: e.target.value })} placeholder="Value" />;
    }

    return (
      <div className="flex items-center gap-2">
        <Select value={condition.field} onValueChange={(v) => onChange({ ...condition, field: v, value: "" })}>
          <SelectTrigger className="h-7 w-32 text-xs">
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
          <SelectTrigger className="h-7 w-32 text-xs">
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
        <Button size="icon-sm" variant="ghost" onClick={onRemove} disabled={disableRemove}>
          <Minus />
        </Button>
      </div>
    );
  }
}
