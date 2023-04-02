import type { TableProps } from "antd";
import { Table, theme } from "antd";
import classNames from "classnames";
import ResizeObserver from "rc-resize-observer";
import React, { useEffect, useRef, useState } from "react";
import { VariableSizeGrid } from "react-window";

// const HEADER_HEIGHT = 52; // `rowSelection` adds 3 pixels to the height.
const HEADER_HEIGHT = 55; // Depends on "size" I think.

type VirtualTableProps<T> = Omit<TableProps<T>, "scroll" | "rowSelection"> & { rowSelection: {} }; // TODO

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
  const { columns, scroll, dataSource, ...restProps } = props;
  const [tableWidth, setTableWidth] = useState(0);
  const { token } = theme.useToken();

  const widthColumnCount = columns!.filter(({ width }) => !width).length;

  // Make sure every column has a known width.
  const mergedColumns = columns!.map((column) => {
    if (column.width) {
      return column;
    }

    return {
      ...column,
      width: Math.floor(tableWidth / widthColumnCount),
    };
  });

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

  const renderVirtualList: NonNullable<TableProps<T>["components"]>["body"] = (
    rawData: readonly T[],
    { scrollbarSize, ref, onScroll }
  ) => {
    const totalHeight = rawData.length * 54;

    return (
      <VariableSizeGrid
        ref={gridRef}
        className="virtual-grid"
        columnCount={mergedColumns.length}
        columnWidth={(index: number) => {
          const { width } = mergedColumns[index];
          return totalHeight > (scroll?.y as number) && index === mergedColumns.length - 1
            ? (width as number) - scrollbarSize - 1
            : (width as number);
        }}
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
              "virtual-table-cell-last": columnIndex === mergedColumns.length - 1,
            })}
            style={{
              ...style,
              boxSizing: "border-box",
              padding: token.padding,
              borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
              background: token.colorBgContainer,
            }}
          >
            {(rawData[rowIndex] as any)[(mergedColumns as any)[columnIndex].dataIndex]}
          </div>
        )}
      </VariableSizeGrid>
    );
  };

  return (
    <ResizeObserver
      onResize={({ width }) => {
        setTableWidth(width);
      }}
    >
      <Table
        {...restProps}
        className="virtual-table"
        columns={mergedColumns}
        pagination={false}
        components={{
          body: renderVirtualList,
        }}
      />
    </ResizeObserver>
  );
}
