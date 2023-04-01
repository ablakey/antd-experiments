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

  const data = useMemo(() => {
    return Array.from({ length: count }, (_, key) => ({ key }));
  }, [count]);

  return (
    <>
      <Space>
        <Button onClick={() => setCount(random(MIN_COUNT, MAX_COUNT))}>Randomize Data</Button>
        <Slider min={400} max={800} style={{ width: 300 }} onAfterChange={setHeight} />
      </Space>

      {/* This represents whatever space the table has to fill. The table should always fill its width and height. */}
      <div style={{ width, height, border: "2px solid red" }}>
        <VirtualTable dataSource={data} columns={columns} />
      </div>
    </>
  );
}
