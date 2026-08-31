/**
 * Task 6.2 (page shell): centered Destacado 1 page title with a centered
 * 120px separator (design.md UI Architecture — Page title). Purely
 * presentational.
 */
import type { ReactNode } from "react";

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ textAlign: "center", marginTop: "var(--space-6)", marginBottom: "var(--space-4)" }}>
      <h1 style={{ font: "var(--font-heading-1)", margin: 0 }}>{children}</h1>
      <hr
        style={{
          width: "120px",
          border: "none",
          borderTop: "1px solid var(--color-border)",
          margin: "var(--space-2) auto 0",
        }}
      />
    </div>
  );
}
