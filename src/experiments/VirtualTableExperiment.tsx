import { Button, Slider, Space } from "antd";
import { VirtualTable } from "../components/VirtualTable";
import { useMemo, useState } from "react";
import { random } from "lodash";

const MIN_COUNT = 2000;
const MAX_COUNT = 3000;

// Usage
const columns = [
  { title: "A", dataIndex: "key" },
  { title: "B", dataIndex: "key" },
  { title: "C", dataIndex: "key" },
  { title: "D", dataIndex: "key" },
  { title: "E", dataIndex: "key" },
  { title: "F", dataIndex: "key" },
];

export function VirtualTableExperiment() {
  const [count, setCount] = useState(MIN_COUNT);
  const [height, setHeight] = useState(400);
  const [width, setWidth] = useState(400);
  const [columnCount, setColumnCount] = useState(3);

  const data = useMemo(() => {
    return Array.from({ length: count }, (_, key) => ({ key }));
  }, [count]);

  const cols = useMemo(() => columns.slice(0, columnCount), [columnCount]);

  return (
    <>
      <Space>
        <Button onClick={() => setCount(random(MIN_COUNT, MAX_COUNT))}>Randomize Data</Button>
        <span>Height:</span>
        <Slider min={200} max={1200} value={height} style={{ width: 100 }} onChange={setHeight} />
        <span>Width:</span>
        <Slider min={200} max={1200} value={width} style={{ width: 100 }} onChange={setWidth} />
        <span>Columns:</span>
        <Slider
          min={1}
          max={5}
          value={columnCount}
          style={{ width: 100 }}
          onChange={setColumnCount}
        />
      </Space>

      {/* This represents whatever space the table has to fill. The table should always fill its width and height. */}
      <div style={{ width, height, border: "2px solid red" }}>
        <VirtualTable
          dataSource={data}
          columns={cols}
          rowSelection={{
            onChange: console.log,
            type: "checkbox",
            selectedRowKeys: [0, 2, 3],
            columnWidth: 30, // Must be a fixed value (every col needs a known fixed width)
          }}
        />
      </div>
    </>
  );
}
