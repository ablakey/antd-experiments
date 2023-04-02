import type { TableProps } from "antd";
import { Table, theme } from "antd";
import classNames from "classnames";
import ResizeObserver from "rc-resize-observer";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VariableSizeGrid } from "react-window";

// const HEADER_HEIGHT = 52; // `rowSelection` adds 3 pixels to the height.
const HEADER_HEIGHT = 55; // Depends on "size" I think.
const ROW_HEIGHT = 54;

type VirtualTableProps<T> = Omit<TableProps<T>, "scroll" | "rowSelection" | "pagination"> & {
  // rowSelection: {}; // TODO: custom rowSelection subset.
};

/**
 * This is meant to be a generalized table that takes care of its own dimensions.  Application-specific behaviour
 * such as column details and data needs to live outside of this component.
 */
export function VirtualTable<T extends object>(props: VirtualTableProps<T>) {
  const [height, setHeight] = useState(0);
  return (
    <ResizeObserver onResize={({ height }) => setHeight(height)}>
      <div style={{ height: "100%" }}>
        <VirtualTableInner {...props} scroll={{ y: height - HEADER_HEIGHT, x: "100%" }} />
      </div>
    </ResizeObserver>
  );
}

function VirtualTableInner<T extends object>(props: TableProps<T>) {
  const { columns, scroll, ...restProps } = props;
  const [tableWidth, setTableWidth] = useState(0);
  const { token } = theme.useToken();

  /**
   * Take any column that does not have a `width` set and calculate then set it. We use the remaining empty width
   * based on the table's width to calculate this.
   */
  const fixedWidthColumns = useMemo(() => {
    // TODO: this currently assumes every column has no width.
    const unfixedColumnCount = columns!.filter(({ width }) => !width).length;
    const columnWidth = Math.floor(tableWidth / unfixedColumnCount);
    return columns!.map((c) => (c.width ? c : { ...c, width: columnWidth }));
  }, [columns]);

  const gridRef = useRef<any>();

  const resetVirtualGrid = () => {
    gridRef.current?.resetAfterIndices({
      columnIndex: 0,
      shouldForceUpdate: true,
    });
  };

  /**
   * If the tableWidth or column config changes (because it can affect the width calculations), reset the grid.
   * This reset invalidates cached information like calculated widths.
   */
  useEffect(() => resetVirtualGrid, [tableWidth, columns?.length]);

  const renderVirtualList = useCallback(
    (rawData: readonly T[], opts: { scrollbarSize: number }) => {
      /**
       * Calculate the width of an individual column.  Subtract the scrollbar width from the final column if there
       * is a scrollbar needed.
       *
       * // TODO: Instead of doing this, just subtract the scrollbar width from the total width available when
       * calculating all column widths.  Does this work if the  scrollbar comes and goes?
       */
      function calculateColumnWidth(idx: number) {
        const { width } = fixedWidthColumns[idx];
        const hasScrollbar =
          rawData.length * ROW_HEIGHT > (scroll?.y as number) &&
          idx === fixedWidthColumns.length - 1;
        return hasScrollbar ? (width as number) - opts.scrollbarSize - 1 : (width as number);
      }

      return (
        <VariableSizeGrid
          ref={gridRef}
          className="virtual-grid"
          columnCount={fixedWidthColumns.length}
          columnWidth={calculateColumnWidth}
          height={scroll!.y as number}
          rowCount={rawData.length}
          rowHeight={() => 54}
          width={tableWidth}
        >
          {({
            columnIndex,
            rowIndex,
            style,
          }: {
            columnIndex: number;
            rowIndex: number;
            style: React.CSSProperties;
          }) => (
            <div
              className={classNames("virtual-table-cell", {
                "virtual-table-cell-last": columnIndex === fixedWidthColumns.length - 1,
              })}
              style={{
                ...style,
                boxSizing: "border-box",
                padding: token.padding,
                borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
                background: token.colorBgContainer,
              }}
            >
              {(rawData[rowIndex] as any)[(fixedWidthColumns as any)[columnIndex].dataIndex]}
            </div>
          )}
        </VariableSizeGrid>
      );
    },
    [fixedWidthColumns, token, gridRef]
  );

  return (
    <ResizeObserver
      onResize={({ width }) => {
        setTableWidth(width);
      }}
    >
      <Table
        {...restProps}
        className="virtual-table"
        columns={fixedWidthColumns}
        scroll={scroll}
        pagination={false}
        components={{
          body: renderVirtualList,
        }}
      />
    </ResizeObserver>
  );
}
