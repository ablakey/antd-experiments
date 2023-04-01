import { createRoot } from "react-dom/client";
import { VirtualTableExperiment } from "./experiments/VirtualTableExperiment";

const container = document.getElementById("root");
const root = createRoot(container!);

function App() {
  return (
    <div style={{ height: 700, width: 600 }}>
      <VirtualTableExperiment />
    </div>
  );
}

root.render(<App />);
