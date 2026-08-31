/**
 * Task 6.2 (page shell): footer — centered, gray secondary text, border-top
 * (design.md UI Architecture — Footer). Purely presentational.
 */
export function Footer() {
  return (
    <footer
      style={{
        textAlign: "center",
        padding: "var(--space-6) 0",
        borderTop: "1px solid var(--color-border)",
        color: "var(--color-gray-500)",
        font: "var(--font-body-2)",
      }}
    >
      facodes — Revisión de códigos FA
    </footer>
  );
}
