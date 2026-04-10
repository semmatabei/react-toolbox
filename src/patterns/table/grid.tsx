import { GridView } from "@/components/base/grid-table/grid-view";
import { InspectorPane } from "@/components/base/grid-table/inspector-pane";
import { useGrid, useGridState, GridProvider } from "@/components/base/grid-table/use-grid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/**
 * Grid Table — Airtable-style spreadsheet built on @glideapps/glide-data-grid.
 *
 * Features:
 * - Canvas-rendered cells (fast, handles thousands of rows)
 * - Inline cell editing (text, number, select, date, email)
 * - Sort by one or more columns (click column header menu)
 * - Filter rows with multiple conditions (AND / OR mode)
 * - Group rows by any field with collapsible group headers
 * - Column operations: add, insert, duplicate, delete, rename, resize, reorder, freeze
 * - Multi-row selection with bulk delete / duplicate
 * - Inspector side panel — click the expand icon on any row to edit all fields
 *
 * Architecture:
 * - `useGridState()` owns all mutable state (rows, columns, sorts, filters, groups)
 * - `GridProvider` + `useGrid()` pass state down without prop drilling
 * - `GridView` is a pure canvas renderer — no React state for hover/cursor (uses refs + updateCells)
 * - `InspectorPane` is the side panel for editing a single row
 * - `ColumnHeaderMenu` + `EditColumnDropdown` handle column configuration
 */
export default function GridTablePattern() {
  const state = useGridState();

  return (
    <div className="h-150 border border-border rounded-lg overflow-hidden bg-background flex flex-col min-w-0">
      <GridProvider value={state}>
        <GridContent />
      </GridProvider>
    </div>
  );
}

function GridContent() {
  const grid = useGrid();

  return (
    <>
      {/* Toolbar */}
      <div className="h-10 flex items-center px-3 gap-2 border-b shrink-0">
        <span className="text-xs text-muted-foreground">
          {grid.sortedRows.length} of {grid.activeTable.rows.length} rows
        </span>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={grid.addRow}>
          <Plus className="w-3.5 h-3.5" />
          Add Row
        </Button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        <GridView
          columns={grid.visibleColumns}
          rows={grid.sortedRows}
          groupedRows={grid.groupedRows}
          onToggleGroupCollapse={grid.toggleGroupCollapse}
          onSelectRow={grid.selectRow}
          onCellEdit={grid.editCell}
          sorts={grid.sorts}
          onAddSort={grid.addSortForField}
          selectedRowIds={grid.selectedRowIds}
          onSelectedRowIdsChange={grid.setSelectedRowIds}
          onAddColumn={grid.addColumn}
          onInsertColumn={grid.insertColumn}
          onDuplicateColumn={grid.duplicateColumn}
          onDeleteColumn={grid.deleteColumn}
          onUpdateColumn={grid.updateColumn}
          onFreezeUpTo={grid.freezeUpTo}
          onMoveColumn={grid.moveColumn}
          onResizeColumn={grid.resizeColumn}
          onCloseInspector={grid.closeInspector}
          frozenColumnCount={grid.frozenColumnCount}
        />
        <InspectorPane
          open={grid.inspectorOpen}
          onClose={grid.closeInspector}
          row={grid.selectedRow}
          columns={grid.activeTable.columns}
          tableName={grid.activeTable.name}
          onSave={(rowId, updates) => grid.editRow(rowId, updates)}
        />
      </div>
    </>
  );
}
