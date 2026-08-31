/**
 * Status → {color, texture, glyph, label} mapping (spec review-ui —
 * Accessibility-Safe Status Encoding). Every status MUST carry a distinct
 * non-color attribute (`texture`) so it stays identifiable in grayscale or
 * under color-blind simulation — never color alone.
 */

export type FieldStatus = "resolved" | "needs_confirm" | "needs_input" | "no_data";

/** Texture token, reused by `StatusMeta` and `IndicatorMeta`. Every
 * consumer MUST apply it as a CSS class so the visual encoding remains
 * identifiable in grayscale (design.md Decision 3). */
export type StatusTexture =
  | "solid"
  | "diagonal-stripes"
  | "dotted-border"
  | "horizontal-hatch"
  | "double-diagonal-stripes"
  | "cross-hatch";

export interface StatusMeta {
  status: FieldStatus;
  label: string;
  glyph: string;
  /** CSS class applied in addition to color; distinguishable in grayscale. */
  texture: StatusTexture;
  bg: string;
  fg: string;
}

export const STATUS_META: Record<FieldStatus, StatusMeta> = {
  resolved: {
    status: "resolved",
    label: "Resuelto",
    glyph: "✓",
    texture: "solid",
    bg: "var(--status-resolved-bg)",
    fg: "var(--status-resolved-fg)",
  },
  needs_confirm: {
    status: "needs_confirm",
    label: "Confirmar",
    glyph: "!",
    texture: "diagonal-stripes",
    bg: "var(--status-needs-confirm-bg)",
    fg: "var(--status-needs-confirm-fg)",
  },
  needs_input: {
    status: "needs_input",
    label: "Falta info",
    glyph: "✗",
    texture: "dotted-border",
    bg: "var(--status-needs-input-bg)",
    fg: "var(--status-needs-input-fg)",
  },
  no_data: {
    status: "no_data",
    label: "Sin datos",
    glyph: "–",
    texture: "horizontal-hatch",
    bg: "var(--status-no-data-bg)",
    fg: "var(--status-no-data-fg)",
  },
};

/** Non-status, state-marking indicators (spec `fa-assignment` —
 * False-Company Detection Alert + Generic Unidentified Placeholder).
 * Distinct from the regular status badge: different visual encoding
 * (texture + glyph + label) and a `data-indicator-kind` attribute so
 * tests/AT can target them precisely. */
export interface IndicatorMeta {
  /** Stable kind identifier (`data-indicator-kind`); one of the
   * `INDICATOR_KIND_*` values below. */
  kind: IndicatorKind;
  label: string;
  glyph: string;
  /** Texture distinct from the four status textures so the indicator
   * is never mistaken for a field status (issue #21). */
  texture: StatusTexture;
  bg: string;
  fg: string;
}

export const INDICATOR_KIND = {
  FALSE_COMPANY_ALERT: "false-company-alert",
  GENERIC_PLACEHOLDER: "generic-placeholder",
} as const;

export type IndicatorKind = (typeof INDICATOR_KIND)[keyof typeof INDICATOR_KIND];

/** Spec `fa-assignment` — False-Company Detection Alert. Surfaces the
 * result of `isFalseCompanyMatch(name)` (src/domain/false-company.ts)
 * so the reviewer sees the heuristic flag on the FA cell, not only inside
 * the drawer. Glyph + texture + label (design.md Decision 3 — NOT
 * color-only). */
export const FALSE_COMPANY_INDICATOR: IndicatorMeta = {
  kind: INDICATOR_KIND.FALSE_COMPANY_ALERT,
  label: "Empresa falsa",
  glyph: "\u26A0",
  texture: "double-diagonal-stripes",
  bg: "var(--status-alert-bg)",
  fg: "var(--status-alert-fg)",
};

/** Spec `fa-assignment` — Generic Unidentified Placeholder. Marks a
 * field resolved via `resolveToUnidentifiedPlaceholder`
 * (src/domain/unidentified.ts) so the reviewer can tell the placeholder
 * from a real resolved value at a glance. */
export const GENERIC_PLACEHOLDER_INDICATOR: IndicatorMeta = {
  kind: INDICATOR_KIND.GENERIC_PLACEHOLDER,
  label: "Genérico",
  glyph: "—",
  texture: "cross-hatch",
  bg: "var(--status-generic-bg)",
  fg: "var(--status-generic-fg)",
};

export const FIELD_ORDER = [
  "office",
  "country",
  "region",
  "ibd",
  "nscc",
  "origin",
  "dealer",
  "agente",
] as const;

export type FieldName = (typeof FIELD_ORDER)[number];

export const FIELD_LABELS: Record<FieldName, string> = {
  office: "Office",
  country: "Country",
  region: "Region",
  ibd: "IBD",
  nscc: "NSCC",
  origin: "Origin",
  dealer: "Dealer",
  agente: "Agente",
};

/** Most-severe-first order, used to derive one overall status from many. */
const SEVERITY_ORDER: FieldStatus[] = ["needs_input", "needs_confirm", "no_data", "resolved"];

/** Reduces multiple statuses to the single most-severe one (e.g. a row's
 * overall status from its 8 fields + FA, or an FA list's combined status). */
export function worstStatus(statuses: FieldStatus[]): FieldStatus {
  if (statuses.length === 0) {
    return "no_data";
  }
  for (const candidate of SEVERITY_ORDER) {
    if (statuses.includes(candidate)) {
      return candidate;
    }
  }
  return "no_data";
}
