import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Placeholder entry point (Phase 1 scaffold). Phase 6 replaces this with the
// real page shell: Header -> Title -> Filters -> KPI row -> Table -> Footer
// per design.md's UI Architecture section.
function App() {
  return <p>facodes — UI pendiente (ver tasks.md Fase 6)</p>;
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("root element not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
