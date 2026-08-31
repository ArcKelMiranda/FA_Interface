/**
 * Task 6.2 (page shell): static YHAT header — 64px, white, border-bottom,
 * subtle shadow (design.md UI Architecture). Purely presentational, no
 * conditional logic — no dedicated test per SKILL.md TDD guidance for
 * static components.
 */
export function Header() {
  return (
    <header
      style={{
        height: "64px",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--space-4)",
        background: "var(--color-white)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      <strong style={{ font: "var(--font-heading-3)" }}>facodes</strong>
    </header>
  );
}
