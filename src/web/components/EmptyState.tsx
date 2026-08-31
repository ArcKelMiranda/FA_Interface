/**
 * Task 6.9 (spec mcp-client — Explicit Empty-State Rendering; design.md UI
 * Architecture — Empty states): distinct from both loading and error —
 * `role="status"` (polite, non-alarming) plus `data-state="empty"`.
 */
export interface EmptyStateProps {
  message: string;
  title?: string;
}

export function EmptyState({ message, title = "Sin resultados" }: EmptyStateProps) {
  return (
    <div
      role="status"
      data-state="empty"
      style={{
        textAlign: "center",
        padding: "var(--space-6)",
        background: "var(--color-table-header-bg)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div aria-hidden="true" style={{ fontSize: "48px", color: "var(--color-gray-400)" }}>
        ○
      </div>
      <h3 style={{ font: "var(--font-heading-3)", color: "var(--color-gray-700)" }}>{title}</h3>
      <p style={{ font: "var(--font-body)", color: "var(--color-gray-500)" }}>{message}</p>
    </div>
  );
}
