/**
 * Task 6.9 (spec review-ui — Batch Load Failure Blocks Rendering): a
 * visible, batch-scoped error — `role="alert"` (assertive) plus
 * `data-state="error"` — visually distinct from EmptyState's `role="status"`
 * and from any loading indicator.
 */
export interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-state="error"
      style={{
        textAlign: "center",
        padding: "var(--space-6)",
        background: "#fee2e2",
        border: "1px solid var(--color-error)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div aria-hidden="true" style={{ fontSize: "48px", color: "var(--color-error)" }}>
        ✗
      </div>
      <h3 style={{ font: "var(--font-heading-3)", color: "#991b1b" }}>Error al cargar</h3>
      <p style={{ font: "var(--font-body)", color: "#991b1b" }}>{message}</p>
    </div>
  );
}
