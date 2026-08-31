/**
 * Task 6.4 (spec review-ui — Accessibility-Safe Status Encoding): color AND
 * a distinct non-color attribute (texture + glyph) per status, never color
 * alone. `data-texture` is the grayscale/color-blind-safe differentiator.
 */
import { STATUS_META, type FieldStatus } from "../status-meta.js";

export interface StatusBadgeProps {
  status: FieldStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status];

  return (
    <span
      role="status"
      aria-label={meta.label}
      data-texture={meta.texture}
      data-status={status}
      className={["status-badge", `status-badge--${meta.texture}`, className]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: meta.bg,
        color: meta.fg,
        borderRadius: "var(--radius-sm)",
        padding: "4px 10px",
        font: "var(--font-caption)",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <span aria-hidden="true">{meta.glyph}</span>
      {meta.label}
    </span>
  );
}
