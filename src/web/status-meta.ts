/**
 * Status → {color, texture, glyph, label} mapping (spec review-ui —
 * Accessibility-Safe Status Encoding). Every status MUST carry a distinct
 * non-color attribute (`texture`) so it stays identifiable in grayscale or
 * under color-blind simulation — never color alone.
 */

export type FieldStatus = "resolved" | "needs_confirm" | "needs_input" | "no_data";

export interface StatusMeta {
  status: FieldStatus;
  label: string;
  glyph: string;
  /** CSS class applied in addition to color; distinguishable in grayscale. */
  texture: "solid" | "diagonal-stripes" | "dotted-border" | "horizontal-hatch";
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
