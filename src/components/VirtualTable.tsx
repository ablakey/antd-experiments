import { Checkbox, Table, TableColumnType, TableProps, theme } from "antd";
import { Key } from "antd/es/table/interface";
import { sum } from "lodash";
import ResizeObserver from "rc-resize-observer";
import { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VariableSizeGrid } from "react-window";
import { assert } from "ts-essentials";
import { produce } from "immer";

const HEADER_HEIGHT = 55; // Depends on "size" I think.
const ROW_HEIGHT = 54;
const ROW_SELECTION_COLUMN_WIDTH = 50;

// TODO: in the docstring enumerate the fields that should be made stable for performance.

// TODO explain what we're doing here and why rowSelection is custom.
// columns is a required field. Not sure why they make it optional.. .a table doesn't work without it.
type VirtualTableProps<T> = Omit<TableProps<T>, "scroll" | "rowSelection" | "pagination" | "columns"> & {
  rowSelection?: { selectedKeys: Key[]; onChange: (selectedKeys: Key[]) => void };
  columns: NonNullable<TableProps<T>["columns"]>;
};

/**
 * This is meant to be a generalized table that takes care of its own dimensions.  Application-specific behaviour
 * such as column details and data needs to live outside of this component.
 */
export function VirtualTable<T extends object>(props: VirtualTableProps<T>) {
  const [tableWidth, setTableWidth] = useState(0);
  const [tableHeight, setTableHeight] = useState(0);

  return (
    <ResizeObserver
      onResize={({ height, width }) => {
        setTableWidth(width);
        setTableHeight(height);
      }}
    >
      <div style={{ height: "100%" }}>
        {tableWidth > 0 && tableHeight > 0 ? (
          <VirtualTableInner {...props} tableWidth={tableWidth} tableHeight={tableHeight} />
        ) : null}
      </div>
    </ResizeObserver>
  );
}

function VirtualTableInner<T extends object>(props: VirtualTableProps<T> & { tableWidth: number; tableHeight: number }) {
  const { columns, tableWidth, tableHeight, ...restProps } = props;
  const { token } = theme.useToken();

  /**
   * Take any column that does not have a `width` set and calculate then set it. We use the remaining empty width
   * based on the table's width to calculate this.
   *
   * TODO
   * TODO: explain how width is now always a number and always set.
   */
  const internalColumns: (Omit<TableColumnType<T>, "width"> & { width: number })[] = useMemo(() => {
    return produce(props.columns, (draft) => {
      if (props.rowSelection) {
        draft.unshift({
          title: "C", // TODO
          key: "__rowSelection",
          align: "center",
          width: ROW_SELECTION_COLUMN_WIDTH,
          render: (_, __, idx) => {
            // TODO: Might want to make `selectedKeys` a lookup table for performance.
            return <Checkbox checked={props.rowSelection?.selectedKeys.includes(idx)} />;
          },
        });
      }

      const unsetColumnLength = draft.filter((c) => c.width === undefined).length;
      if (unsetColumnLength > 0) {
        const utilizedWidth = sum(draft.map((c) => c.width ?? 0));
        const remainingWidth = tableWidth - utilizedWidth;
        assert(remainingWidth >= 0);
        const columnWidth = Math.floor(remainingWidth / unsetColumnLength);
        draft.forEach((c) => (c.width = c.width ?? columnWidth));
      }
    });
  }, [props.columns, tableWidth, tableHeight, props.rowSelection]);

  // TODO explain.
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
  useEffect(() => resetVirtualGrid, [tableWidth, tableHeight, internalColumns.length]);

  // TODO:  does "rawData" already have sorting and filtering handled?
  const renderVirtualList = useCallback(
    (sortedFilteredData: readonly T[], opts?: { scrollbarSize: number }) => {
      /**
       * Render an individual cell in the table. We do the data lookup ourselves. We also look up the appropriate
       * render function from the columns, by index.
       */
      function TableCell(cellProps: { columnIndex: number; rowIndex: number; style: CSSProperties }) {
        const item: T = sortedFilteredData[cellProps.rowIndex];
        const config = internalColumns[cellProps.columnIndex];
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

      // Explain how this is buggy: on initial render scrollbarSize is 0 even though it's there. And when
      // responsively shrinking the parent, it flickers. // TODO: how did we fix this?
      function calculateColumnWidth(idx: number) {
        console.log(opts);
        if (idx < internalColumns.length - 1) {
          return internalColumns[idx].width;
        }
        return internalColumns[idx].width - (opts?.scrollbarSize ?? 0);
      }

      return (
        <VariableSizeGrid
          ref={gridRef}
          style={{ overflowX: "hidden" }} // TODO: explain why
          // It's a bit weird that `children` is a function that renders a single cell and gets called many times.
          // It should probably be something like `render` or `renderCell`. We reference it as a function rather than
          // an inner JSX Node to make this a bit more clear.
          children={TableCell}
          columnCount={internalColumns.length}
          columnWidth={calculateColumnWidth}
          height={tableHeight - HEADER_HEIGHT}
          rowCount={sortedFilteredData.length}
          rowHeight={() => ROW_HEIGHT}
          width={tableWidth}
        />
      );
    },
    [internalColumns, token, gridRef, tableWidth, tableHeight]
  );

  return (
    <Table
      {...restProps}
      columns={internalColumns}
      scroll={{ y: tableHeight - HEADER_HEIGHT, x: "100%" }}
      pagination={false}
      components={{
        body: renderVirtualList,
      }}
    />
  );
}
