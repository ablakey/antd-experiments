import { Checkbox, Table, TableColumnType, TableProps, theme } from "antd";
import ResizeObserver from "rc-resize-observer";
import { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VariableSizeGrid } from "react-window";

// const HEADER_HEIGHT = 52; // `rowSelection` adds 3 pixels to the height.
const HEADER_HEIGHT = 55; // Depends on "size" I think.
const ROW_HEIGHT = 54;
const SELECT_COLUMN_WIDTH = 50;

type VirtualTableProps<T> = Omit<TableProps<T>, "scroll" | "rowSelection" | "pagination"> & {
  // rowSelection: {}; // TODO: custom rowSelection subset.
};

/**
 * This is meant to be a generalized table that takes care of its own dimensions.  Application-specific behaviour
 * such as column details and data needs to live outside of this component.
 */
export function VirtualTable<T extends object>(props: VirtualTableProps<T>) {
  const [dimensions, setDimensions] = useState<[number, number]>([0, 0]);

  return (
    <ResizeObserver onResize={({ height, width }) => setDimensions([width, height])}>
      <div style={{ height: "100%" }}>
        {dimensions[0] > 0 && dimensions[1] > 0 ? (
          <VirtualTableInner {...props} dimensions={dimensions} />
        ) : null}
      </div>
    </ResizeObserver>
  );
}

function VirtualTableInner<T extends object>(
  props: TableProps<T> & { dimensions: [number, number] }
) {
  const { columns, dimensions, ...restProps } = props;
  const [tableWidth] = dimensions;
  const { token } = theme.useToken();

  console.log("render");

  /**
   * rowSelection
   */
  const columnsWithRow: TableColumnType<T>[] = [
    {
      title: "C",
      key: "selection",
      align: "center",
      width: SELECT_COLUMN_WIDTH,
      render: (a) => {
        return <Checkbox checked />;
      },
    },
    ...columns!,
  ];

  /**
   * Take any column that does not have a `width` set and calculate then set it. We use the remaining empty width
   * based on the table's width to calculate this.
   */
  const fixedWidthColumns = useMemo(() => {
    // TODO: this currently assumes every column has no width.
    const unfixedColumnCount = columnsWithRow!.filter(({ width }) => !width).length;
    const columnWidth = Math.floor(tableWidth / unfixedColumnCount);
    return columnsWithRow!.map((c) => (c.width ? c : { ...c, width: columnWidth }));
  }, [columnsWithRow, dimensions]);

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
  useEffect(() => resetVirtualGrid, [dimensions, columns?.length]);

  // TODO:  does "rawData" already have sorting and filtering handled?
  const renderVirtualList = useCallback(
    (sortedFilteredData: readonly T[]) => {
      /**
       * Render an individual cell in the table. We do the data lookup ourselves. We also look up the appropriate
       * render function from the columns, by index.
       */
      function TableCell(cellProps: {
        columnIndex: number;
        rowIndex: number;
        style: CSSProperties;
      }) {
        const item: T = sortedFilteredData[cellProps.rowIndex];
        const config = fixedWidthColumns[cellProps.columnIndex];
        const value = item[config.dataIndex as keyof T]; // TODO: handle if dataIndex is undefined.
        const content = config.render ? config.render(value, item, cellProps.rowIndex) : value;

        return (
          <div
            style={{
              ...cellProps.style,
              display: "flex",
              justifyContent: config.align,
              alignItems: "center",
              borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
              background: token.colorBgContainer,
            }}
          >
            {content as ReactNode}
          </div>
        );
      }

      return (
        <VariableSizeGrid
          ref={gridRef}
          // It's a bit weird that `children` is a function that renders a single cell and gets called many times.
          // It should probably be something like `render` or `renderCell`. We reference it as a function rather than
          // an inner JSX Node to make this a bit more clear.
          children={TableCell}
          columnCount={fixedWidthColumns.length}
          columnWidth={(idx) => fixedWidthColumns[idx].width! as number}
          height={dimensions[1] - HEADER_HEIGHT}
          rowCount={sortedFilteredData.length}
          rowHeight={() => ROW_HEIGHT}
          width={tableWidth}
        />
      );
    },
    [fixedWidthColumns, token, gridRef]
  );

  return (
    <Table
      {...restProps}
      columns={fixedWidthColumns}
      scroll={{ y: dimensions[1] - HEADER_HEIGHT, x: "100%" }}
      pagination={false}
      components={{
        body: renderVirtualList,
      }}
    />
  );
}
