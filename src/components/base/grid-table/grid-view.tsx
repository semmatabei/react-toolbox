import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import DataEditor, { GridCellKind, GridColumnIcon, CompactSelection } from "@glideapps/glide-data-grid";
import type { DataEditorRef, GridColumn, Item, GridCell, EditableGridCell, Theme, GridSelection } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import type { ColumnDef } from "./mock-db";
import type { SortCondition, GroupHeaderRow } from "./use-grid";
import { ColumnHeaderMenu } from "./column-header-menu";

const fieldTypeToGridIcon: Record<string, GridColumnIcon> = {
  text: GridColumnIcon.HeaderString,
  number: GridColumnIcon.HeaderNumber,
  select: GridColumnIcon.HeaderArray,
  date: GridColumnIcon.HeaderDate,
  email: GridColumnIcon.HeaderEmail,
};

function isGroupHeader(row: any): row is GroupHeaderRow {
  return row && row.__isGroupHeader === true;
}

interface GridViewProps {
  columns: ColumnDef[];
  rows: Record<string, any>[];
  groupedRows: (Record<string, any> | GroupHeaderRow)[];
  onToggleGroupCollapse: (groupKey: string) => void;
  onSelectRow: (id: string) => void;
  onCellEdit?: (rowId: string, columnId: string, value: any) => void;
  sorts: SortCondition[];
  onAddSort: (field: string, direction: "asc" | "desc") => void;
  selectedRowIds: Set<string>;
  onSelectedRowIdsChange: (ids: Set<string>) => void;
  onAddColumn?: () => void;
  onInsertColumn?: (refId: string, pos: "left" | "right") => void;
  onDuplicateColumn?: (colId: string) => void;
  onDeleteColumn?: (colId: string) => void;
  onFreezeUpTo?: (colId: string) => void;
  onMoveColumn?: (startIndex: number, endIndex: number) => void;
  onResizeColumn?: (colId: string, newWidth: number) => void;
  onUpdateColumn?: (colId: string, updates: Partial<ColumnDef>) => void;
  onCloseInspector?: () => void;
  frozenColumnCount: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * GridView — glide-data-grid canvas renderer.
 *
 * RENDER DISCIPLINE: keep React re-renders to a minimum.
 * glide-data-grid paints everything onto a <canvas>. A React re-render forces
 * DataEditor to diff and re-subscribe its props, which is expensive and
 * produces visible flicker on fast interactions (hover, cursor move, etc.).
 *
 * Rules to follow when modifying this component:
 *
 * 1. Hover / cursor tracking → use refs + gridRef.current?.updateCells([...])
 *    updateCells tells glide to repaint only the affected cells by re-calling
 *    drawCell / getRowThemeOverride. No React state, no re-render needed.
 *    Current examples: hoverRowRef, iconHoverRowRef, wantsPointerCursorRef.
 *
 * 2. useCallback deps — never add a ref to a useCallback dep array. Refs are
 *    always current at call time; adding them as deps just re-creates the
 *    callback on unrelated changes and passes a new prop to DataEditor.
 *
 * 3. New interactive state — ask: "does this change the JSX output or only
 *    the canvas paint?" If canvas-only → ref + updateCells. If JSX (e.g. a
 *    popup, a modal, column widths) → useState is fine.
 *
 * 4. Legitimate re-render triggers (currently): containerSize, headerMenuCol,
 *    menuPos, gridSelection. All of these affect real DOM/JSX output.
 */
export function GridView({
  columns,
  rows,
  groupedRows,
  onToggleGroupCollapse,
  onCellEdit,
  onSelectRow,
  sorts,
  onAddSort,
  selectedRowIds,
  onSelectedRowIdsChange,
  onAddColumn,
  onInsertColumn,
  onDuplicateColumn,
  onDeleteColumn,
  onUpdateColumn,
  onFreezeUpTo,
  onMoveColumn,
  onResizeColumn,
  onCloseInspector,
  frozenColumnCount,
  onLoadMore,
  hasMore,
}: GridViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<DataEditorRef>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 400 });
  const hoverRowRef = useRef<number | undefined>(undefined);
  const [headerMenuCol, setHeaderMenuCol] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const iconHoverRowRef = useRef<number | undefined>(undefined);
  const wantsPointerCursorRef = useRef(false);
  const colCountRef = useRef(columns.length);
  colCountRef.current = columns.length;

  const ICON_SIZE = 16;
  const ICON_PAD = 12;

  const hasGrouping = groupedRows.length !== rows.length || groupedRows.some((r) => isGroupHeader(r));
  const displayData = hasGrouping ? groupedRows : rows;
  const displayRowCount = displayData.length + (hasMore ? 1 : 0);

  const [gridSelection, setGridSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
    current:
      rows.length > 0 && columns.length > 0
        ? {
            cell: [0, 0],
            range: { x: 0, y: 0, width: 1, height: 1 },
            rangeStack: [],
          }
        : undefined,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (rows.length === 0 || columns.length === 0) return;
    setGridSelection((prev) => {
      if (prev.current) return prev;
      return {
        ...prev,
        current: {
          cell: [0, 0],
          range: { x: 0, y: 0, width: 1, height: 1 },
          rangeStack: [],
        },
      };
    });
    const id = requestAnimationFrame(() => {
      gridRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [rows.length, columns.length]);

  const sortMap = useMemo(() => {
    const map = new Map<string, "asc" | "desc">();
    sorts.forEach((s) => map.set(s.field, s.direction));
    return map;
  }, [sorts]);

  const addColIndex = columns.length;
  const lastDataColIndex = columns.length - 1;

  const gridColumns: GridColumn[] = useMemo(() => {
    const cols = columns.map((col) => ({
      id: col.id,
      title: `${col.name}${sortMap.has(col.id) ? (sortMap.get(col.id) === "asc" ? " ↑" : " ↓") : ""}`,
      width: col.width || 150,
      hasMenu: true,
      icon: fieldTypeToGridIcon[col.type],
    }));
    cols.push({
      id: "__add_column",
      title: "",
      width: 44,
      hasMenu: false,
      icon: undefined as any,
    } as any);
    return cols;
  }, [columns, sortMap]);

  const getCellContent = useCallback(
    ([colIdx, rowIdx]: Item): GridCell => {
      // "Load more" row
      if (rowIdx === displayData.length && hasMore) {
        if (colIdx === 0) {
          return {
            kind: GridCellKind.Text,
            data: "Load more...",
            displayData: "Load more...",
            allowOverlay: false,
            readonly: true,
            themeOverride: { textDark: "#3b82f6", fontFamily: "Inter, system-ui, sans-serif" },
          };
        }
        return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false, readonly: true };
      }

      const item = displayData[rowIdx];
      if (!item) {
        return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false, readonly: true };
      }

      // Group header row — ALL cells in span must declare the same span
      if (isGroupHeader(item)) {
        const spanRange: [number, number] = [0, lastDataColIndex];
        if (colIdx <= lastDataColIndex) {
          if (colIdx === 0) {
            const indent = "  ".repeat(item.__groupDepth);
            const label = `${indent}▾ ${item.__groupField}: ${item.__groupValue} (${item.__groupCount})`;
            return {
              kind: GridCellKind.Text,
              data: label,
              displayData: label,
              allowOverlay: false,
              readonly: true,
              span: spanRange,
              themeOverride: {
                bgCell: "#f8fafc",
                textDark: "#334155",
                baseFontStyle: "600 13px",
              },
            };
          }
          // Non-first cells in span must also declare the span
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "",
            allowOverlay: false,
            readonly: true,
            span: spanRange,
            themeOverride: { bgCell: "#f8fafc" },
          };
        }
        // __add_column cell for group header
        return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false, readonly: true, themeOverride: { bgCell: "#f8fafc" } };
      }

      // __add_column
      if (colIdx >= columns.length) {
        return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false, readonly: true };
      }

      const col = columns[colIdx];
      if (!col) {
        return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false, readonly: true };
      }

      const value = item[col.id];
      if (col.type === "number") {
        return {
          kind: GridCellKind.Number,
          data: typeof value === "number" ? value : Number(value) || 0,
          displayData: String(value ?? ""),
          allowOverlay: true,
          readonly: false,
        };
      }
      return {
        kind: GridCellKind.Text,
        data: String(value ?? ""),
        displayData: String(value ?? ""),
        allowOverlay: true,
        readonly: false,
      };
    },
    [columns, displayData, hasMore, lastDataColIndex],
  );

  const onCellEdited = useCallback(
    ([colIdx, rowIdx]: Item, newValue: EditableGridCell) => {
      const item = displayData[rowIdx];
      if (!item || isGroupHeader(item)) return;
      if (colIdx >= columns.length) return;
      const col = columns[colIdx];
      if (!col || !onCellEdit) return;
      const val = newValue.kind === GridCellKind.Number ? newValue.data : (newValue as { data: string }).data;
      onCellEdit(item.id, col.id, val);
    },
    [columns, displayData, onCellEdit],
  );

  const onHeaderMenuClick = useCallback((colIdx: number, bounds: { x: number; y: number; width: number; height: number }) => {
    setHeaderMenuCol(colIdx);
    setMenuPos({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
  }, []);

  const onGridSelectionChanged = useCallback(
    (sel: GridSelection) => {
      setGridSelection(sel);
      const ids = new Set<string>();
      if (sel.rows) {
        for (const idx of sel.rows) {
          if (idx < displayData.length) {
            const item = displayData[idx];
            if (item && !isGroupHeader(item)) ids.add(item.id);
          }
        }
      }
      const sameSize = ids.size === selectedRowIds.size;
      const sameValues = sameSize && [...ids].every((id) => selectedRowIds.has(id));
      if (!sameValues) onSelectedRowIdsChange(ids);
    },
    [displayData, selectedRowIds, onSelectedRowIdsChange],
  );

  const theme: Partial<Theme> = useMemo(
    () => ({
      bgCell: "#ffffff",
      bgHeader: "#ffffff",
      bgHeaderHasFocus: "#f8fafc",
      bgHeaderHovered: "#f1f5f9",
      borderColor: "#e2e8f0",
      headerFontStyle: "500 12px",
      baseFontStyle: "13px",
      fontFamily: "Inter, system-ui, sans-serif",
      textDark: "#0f172a",
      textMedium: "#64748b",
      textHeader: "#334155",
      textLight: "#94a3b8",
      accentColor: "#3b82f6",
      accentLight: "#eff6ff",
      headerBottomBorderColor: "#e2e8f0",
      horizontalBorderColor: "#f1f5f9",
      lineHeight: 1.5,
      headerIconSize: 16,
    }),
    [],
  );

  const menuCol = headerMenuCol !== null ? columns[headerMenuCol] : null;

  const onHeaderClicked = useCallback(
    (colIdx: number) => {
      if (colIdx === addColIndex) onAddColumn?.();
    },
    [addColIndex, onAddColumn],
  );

  const onColumnMoved = useCallback(
    (startIndex: number, endIndex: number) => {
      if (endIndex >= addColIndex) return;
      onMoveColumn?.(startIndex, endIndex);
    },
    [addColIndex, onMoveColumn],
  );

  const onColumnProposeMove = useCallback(
    (_startIndex: number, endIndex: number) => {
      return endIndex < addColIndex;
    },
    [addColIndex],
  );

  const onColumnResize = useCallback(
    (col: GridColumn, newSize: number) => {
      if (col.id && col.id !== "__add_column") onResizeColumn?.(col.id, newSize);
    },
    [onResizeColumn],
  );

  // onItemHovered only fires on cell transitions, not per-pixel within a cell.
  // Use it only for row-level hover (background highlight). Fine-grained icon
  // hover is tracked by the native mousemove effect below.
  const onItemHovered = useCallback((args: any) => {
    const [_col, row] = args.location;
    const isCell = args.kind === "cell";
    const nextRow = isCell ? row : undefined;
    const prevRow = hoverRowRef.current;
    if (prevRow === nextRow) return;
    hoverRowRef.current = nextRow;
    // Repaint only the two affected rows — no React state, no re-render
    const toRedraw: { cell: [number, number] }[] = [];
    const totalCols = colCountRef.current;
    if (prevRow !== undefined) {
      for (let c = 0; c < totalCols; c++) toRedraw.push({ cell: [c, prevRow] });
    }
    if (nextRow !== undefined) {
      for (let c = 0; c < totalCols; c++) toRedraw.push({ cell: [c, nextRow] });
    }
    if (toRedraw.length) gridRef.current?.updateCells(toRedraw);
  }, []);

  // Native mousemove fires on every pixel — use it to track whether the mouse
  // is over the expand button within col-0 cells, and update cursor accordingly.
  // getBounds returns canvas-relative coords. e.clientX is viewport-relative.
  // To get cell-local X: subtract canvas's viewport offset, then subtract bounds.x.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const BTN_RIGHT_PAD = 6; // 6px gap between button right edge and cell right edge
    const BTN_WIDTH = 22; // ICON_SIZE(16) + 6 padding

    // Cache the canvas element once — querySelector on every mousemove is wasteful.
    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;

    const clearIconHover = () => {
      const prev = iconHoverRowRef.current;
      if (prev !== undefined) {
        iconHoverRowRef.current = undefined;
        gridRef.current?.updateCells([{ cell: [0, prev] }]);
      }
      if (wantsPointerCursorRef.current) {
        wantsPointerCursorRef.current = false;
        if (canvas) canvas.style.cursor = "";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const row = hoverRowRef.current;
      if (row === undefined) {
        clearIconHover();
        return;
      }

      const bounds = gridRef.current?.getBounds(0, row);
      if (!bounds) {
        clearIconHover();
        return;
      }

      // Convert viewport clientX → canvas-local X → cell-local X
      const canvasLeft = canvas?.getBoundingClientRect().left ?? 0;
      const cellLocalX = e.clientX - canvasLeft - bounds.x;
      const btnLeft = bounds.width - BTN_RIGHT_PAD - BTN_WIDTH;
      const btnRight = bounds.width - BTN_RIGHT_PAD;
      const overIcon = cellLocalX >= btnLeft && cellLocalX <= btnRight;

      const prevIconRow = iconHoverRowRef.current;
      const nextIconRow = overIcon ? row : undefined;
      if (prevIconRow !== nextIconRow) {
        iconHoverRowRef.current = nextIconRow;
        const toRedraw: { cell: [number, number] }[] = [];
        if (prevIconRow !== undefined) toRedraw.push({ cell: [0, prevIconRow] });
        if (nextIconRow !== undefined) toRedraw.push({ cell: [0, nextIconRow] });
        gridRef.current?.updateCells(toRedraw);
      }

      if (wantsPointerCursorRef.current !== overIcon) {
        wantsPointerCursorRef.current = overIcon;
        if (canvas) canvas.style.cursor = overIcon ? "pointer" : "";
      }
    };

    const handleMouseLeave = () => {
      hoverRowRef.current = undefined;
      clearIconHover();
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const getRowThemeOverride = useCallback(
    (row: number) => {
      const item = displayData[row];
      if (item && isGroupHeader(item)) {
        return { bgCell: "#f8fafc", bgCellMedium: "#f1f5f9" };
      }
      if (row !== hoverRowRef.current) return undefined;
      return { bgCell: "#f8fafc", bgCellMedium: "#f1f5f9" };
    },
    [displayData],
  );

  const drawCell = useCallback(
    (args: any, draw: () => void) => {
      const item = displayData[args.row];

      // Custom draw for group header rows
      if (item && isGroupHeader(item)) {
        const { ctx, rect } = args;
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        if (args.col === 0) {
          ctx.save();
          const indent = 16 + item.__groupDepth * 20;
          const colDef = columns.find((c) => c.id === item.__groupField);
          const fieldName = colDef?.name || item.__groupField;
          const label = `${item.__groupValue}`;
          const countLabel = ` (${item.__groupCount})`;

          ctx.fillStyle = "#64748b";
          ctx.font = "11px Inter, system-ui, sans-serif";
          const triX = rect.x + indent - 12;
          const triY = rect.y + rect.height / 2;
          ctx.beginPath();
          ctx.moveTo(triX, triY - 3);
          ctx.lineTo(triX + 6, triY);
          ctx.lineTo(triX, triY + 3);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#94a3b8";
          ctx.font = "500 12px Inter, system-ui, sans-serif";
          ctx.textBaseline = "middle";
          const fieldWidth = ctx.measureText(fieldName + ": ").width;
          ctx.fillText(fieldName + ": ", rect.x + indent, rect.y + rect.height / 2);

          ctx.fillStyle = "#0f172a";
          ctx.font = "600 13px Inter, system-ui, sans-serif";
          const valueWidth = ctx.measureText(label).width;
          ctx.fillText(label, rect.x + indent + fieldWidth, rect.y + rect.height / 2);

          ctx.fillStyle = "#94a3b8";
          ctx.font = "400 12px Inter, system-ui, sans-serif";
          ctx.fillText(countLabel, rect.x + indent + fieldWidth + valueWidth, rect.y + rect.height / 2);

          ctx.restore();
        }

        const { ctx: c2, rect: r2 } = args;
        c2.strokeStyle = "#e2e8f0";
        c2.lineWidth = 1;
        c2.beginPath();
        c2.moveTo(r2.x, r2.y + r2.height);
        c2.lineTo(r2.x + r2.width, r2.y + r2.height);
        c2.stroke();

        return;
      }

      // Default draw for normal cells
      draw();

      // Draw expand icon on first column when row is hovered
      if (args.col !== 0 || args.row !== hoverRowRef.current) return;
      if (args.row >= displayData.length) return;
      if (isGroupHeader(displayData[args.row])) return;

      const { ctx, rect } = args;
      ctx.save();

      // Button
      const BTN = ICON_SIZE + 6; // 22px
      const btnX = rect.x + rect.width - BTN - 6;
      const btnY = rect.y + (rect.height - BTN) / 2;
      const isIconHov = iconHoverRowRef.current === args.row;
      ctx.fillStyle = isIconHov ? "#c8cdd4" : "#eaecf0";
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, BTN, BTN, 4);
      ctx.fill();

      // Icon 12×12, 5px padding on every side inside the 22px button
      const iSz = 12;
      const iX = btnX + (BTN - iSz) / 2;
      const iY = btnY + (BTN - iSz) / 2;
      ctx.strokeStyle = isIconHov ? "#1d2939" : "#5b6271";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Outer rect
      ctx.beginPath();
      ctx.roundRect(iX, iY, iSz, iSz, 1.5);
      ctx.stroke();

      // Vertical panel divider at 67% (x=8 from icon left)
      const divX = iX + 8;
      ctx.beginPath();
      ctx.moveTo(divX, iY + 1.5);
      ctx.lineTo(divX, iY + iSz - 1.5);
      ctx.stroke();

      ctx.restore();
    },
    [displayData, columns],
  );

  const onCellClicked = useCallback(
    (cell: Item, event: any) => {
      const [col, row] = cell;

      const item = displayData[row];
      if (item && isGroupHeader(item)) {
        onToggleGroupCollapse(item.__groupKey);
        return;
      }

      if (row === displayData.length && hasMore) {
        onLoadMore?.();
        return;
      }

      if (col === 0 && row < displayData.length && !isGroupHeader(displayData[row])) {
        const bounds = gridRef.current?.getBounds(col, row);
        if (bounds) {
          const clickX = event.localEventX ?? 0;
          const BTN = ICON_SIZE + 6; // 22px — must match drawCell
          const BTN_RIGHT_PAD = 6;
          const btnLeft = bounds.width - BTN_RIGHT_PAD - BTN;
          if (clickX >= btnLeft) {
            // Icon clicked — open inspector. Do NOT preventDefault so glide can
            // still process double-click → edit overlay on the second click.
            onSelectRow((displayData[row] as Record<string, any>).id);
            return;
          }
        }
      }
      onCloseInspector?.();
    },
    [displayData, onSelectRow, onCloseInspector, hasMore, onLoadMore, onToggleGroupCollapse],
  );

  const drawHeader = useCallback((args: any, draw: () => void) => {
    if (args.column.id === "__add_column") {
      const { ctx, rect } = args;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 14px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", rect.x + rect.width / 2, rect.y + rect.height / 2);
      return true;
    }
    draw();
    return undefined;
  }, []);

  return (
    <div ref={containerRef} className="flex-1 min-w-0 overflow-hidden relative flex flex-col">
      <div className="flex-1 overflow-hidden">
        <DataEditor
          ref={gridRef}
          getCellContent={getCellContent}
          columns={gridColumns}
          rows={displayRowCount}
          width={containerSize.width}
          height={containerSize.height}
          theme={theme}
          headerHeight={36}
          rowHeight={34}
          smoothScrollX
          smoothScrollY
          rowMarkers="both"
          rowSelect="multi"
          columnSelect="multi"
          rangeSelect="rect"
          gridSelection={gridSelection}
          getCellsForSelection={true}
          onItemHovered={onItemHovered}
          getRowThemeOverride={getRowThemeOverride}
          onCellEdited={onCellEdited}
          onGridSelectionChange={onGridSelectionChanged}
          onHeaderMenuClick={onHeaderMenuClick}
          freezeColumns={frozenColumnCount}
          onHeaderClicked={onHeaderClicked}
          drawHeader={drawHeader}
          drawCell={drawCell}
          onCellClicked={onCellClicked}
          onColumnMoved={onColumnMoved}
          onColumnProposeMove={onColumnProposeMove}
          onColumnResize={onColumnResize}
        />
      </div>

      {menuCol && (
        <ColumnHeaderMenu
          col={menuCol}
          position={menuPos}
          onClose={() => setHeaderMenuCol(null)}
          onInsertLeft={() => {
            onInsertColumn?.(menuCol.id, "left");
            setHeaderMenuCol(null);
          }}
          onInsertRight={() => {
            onInsertColumn?.(menuCol.id, "right");
            setHeaderMenuCol(null);
          }}
          onDuplicate={() => {
            onDuplicateColumn?.(menuCol.id);
            setHeaderMenuCol(null);
          }}
          onDelete={() => {
            onDeleteColumn?.(menuCol.id);
            setHeaderMenuCol(null);
          }}
          onFreeze={() => {
            onFreezeUpTo?.(menuCol.id);
            setHeaderMenuCol(null);
          }}
          onSortAsc={() => {
            onAddSort(menuCol.id, "asc");
            setHeaderMenuCol(null);
          }}
          onSortDesc={() => {
            onAddSort(menuCol.id, "desc");
            setHeaderMenuCol(null);
          }}
          onEditColumn={onUpdateColumn}
        />
      )}
    </div>
  );
}
