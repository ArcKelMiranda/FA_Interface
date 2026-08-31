/**
 * `Indicator` — non-status state marker (spec `fa-assignment` — False-
 * Company Detection Alert + Generic Unidentified Placeholder, issue #21).
 *
 * Sibling of `StatusBadge`, NOT a replacement: `StatusBadge` describes a
 * field's resolution status (resolved/needs_confirm/needs_input/no_data),
 * `Indicator` marks orthogonal states a reviewer must see without opening
 * the drawer (false-company heuristic match on the FA; generic placeholder
 * on a field value). Each indicator carries a distinct texture token
 * (different from the four status textures) so it is never mistaken for a
 * field status badge.
 *
 * Accessibility (design.md Decision 3 — NOT color-only): every indicator
 * exposes its label via `role="note" aria-label`, its glyph via
 * `aria-hidden`, and its texture via `data-texture` so the encoding
 * survives grayscale / color-blind rendering. The `data-indicator-kind`
 * attribute gives tests + assistive tech a stable hook.
 */
import type { IndicatorMeta } from "../status-meta.js";

export interface IndicatorProps {
  meta: IndicatorMeta;
  className?: string;
}

export function Indicator({ meta, className }: IndicatorProps) {
  return (
    <span
      role="note"
      aria-label={meta.label}
      data-texture={meta.texture}
      data-indicator-kind={meta.kind}
      className={["indicator", `indicator--${meta.texture}`, className]
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
