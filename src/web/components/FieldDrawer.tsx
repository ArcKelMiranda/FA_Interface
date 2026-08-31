/**
 * Task 6.6 (spec review-ui — Per-Field Drawer): opens on cell or
 * fingerprint-tick click, `role="dialog" aria-modal="true"`, Escape closes
 * without losing table state (`/audit` slide-over precedent, design.md UI
 * Architecture — Edit drawer), shows the field's current value, evidence,
 * precedent codes/alternatives, and a catalog search control for non-FA
 * fields. For the `fa` field it embeds `FaEditor` (task 6.7) instead.
 *
 * SPEC fa-assignment — Generic Unidentified Placeholder (issue #21):
 * fields resolved via `resolveToUnidentifiedPlaceholder` (src/domain/
 * unidentified.ts) carry `isGenericPlaceholder: true` on the
 * `NonFaFieldDetail` passed in here. The header renders the
 * `GENERIC_PLACEHOLDER_INDICATOR` next to the label so the reviewer can
 * see at a glance that the value is the generic `-Unidentified`
 * placeholder, not a real match.
 */
import { useEffect, useState } from "react";

import type { FieldStatus, IndicatorMeta } from "../status-meta.js";
import {
  FaEditor,
  type FaAlternativeOption,
  type FaDiscardedOption,
  type FaTipo,
} from "./FaEditor.js";
import { Indicator } from "./Indicator.js";
import { OverrideMarker } from "./OverrideMarker.js";
import { StatusBadge } from "./StatusBadge.js";

export interface DrawerReference {
  title: string;
  description: string;
  columns: string[];
  rows: Record<string, unknown>[];
  footnote?: string | undefined;
}

// `| undefined` on every optional field below matches zod's
// `.optional()`-inferred shape under exactOptionalPropertyTypes, so these
// types accept BatchAnalysis field/alternative data (src/domain/types.ts)
// directly without a normalization step.
export interface DrawerAlternative {
  label: string;
  hint?: string | undefined;
}

export interface NonFaFieldDetail {
  kind: "field";
  fieldKey: string;
  label: string;
  value: string;
  status: FieldStatus;
  evidence?: string | undefined;
  alternatives?: DrawerAlternative[] | undefined;
  isOverride?: boolean | undefined;
  references?: DrawerReference[] | undefined;
  /**
   * Indicator meta to surface on the field header — currently only
   * `GENERIC_PLACEHOLDER_INDICATOR` (issue #21). Absent on real matches,
   * so the header renders only the field label.
   */
  headerIndicator?: IndicatorMeta | undefined;
}

export interface FaFieldDetail {
  kind: "fa";
  label: string;
  alternatives: FaAlternativeOption[];
  discarded: FaDiscardedOption[];
}

export type DrawerDetail = NonFaFieldDetail | FaFieldDetail;

export interface FieldDrawerProps {
  open: boolean;
  detail: DrawerDetail | null;
  onClose: () => void;
  onAcceptAlternative: (alt: DrawerAlternative) => void;
  onCatalogSelect: (alt: DrawerAlternative) => void;
  onMarkForReview?: () => void;
  onRestore?: () => void;
  onSelectFaAlternative?: (alt: FaAlternativeOption) => void;
  onSelectExistingFa?: (faId: number) => void;
  onCreateNewFa?: (name: string, tipo: FaTipo) => void;
  onReactivateDiscardedFa?: (id: number) => void;
}

export function FieldDrawer({
  open,
  detail,
  onClose,
  onAcceptAlternative,
  onCatalogSelect,
  onMarkForReview,
  onRestore,
  onSelectFaAlternative,
  onSelectExistingFa,
  onCreateNewFa,
  onReactivateDiscardedFa,
}: FieldDrawerProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery("");
  }, [detail]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !detail) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Editar ${detail.label}`}
      className="field-drawer"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(420px, 100vw)",
        background: "var(--color-white)",
        borderRadius: "var(--radius-xl) 0 0 var(--radius-xl)",
        boxShadow: "var(--shadow-lg)",
        padding: "var(--space-2)",
        overflowY: "auto",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", flexWrap: "wrap" }}>
          <h2 style={{ font: "var(--font-heading-3)", margin: 0 }}>{detail.label}</h2>
          {detail.kind === "field" && detail.headerIndicator && (
            <Indicator meta={detail.headerIndicator} />
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </header>

      {detail.kind === "fa" ? (
        <FaEditor
          alternatives={detail.alternatives}
          discarded={detail.discarded}
          onSelectAlternative={onSelectFaAlternative ?? (() => {})}
          onSelectExisting={onSelectExistingFa ?? (() => {})}
          onCreateNew={onCreateNewFa ?? (() => {})}
          onReactivateDiscarded={onReactivateDiscardedFa ?? (() => {})}
        />
      ) : (
        <NonFaFieldPanel
          detail={detail}
          query={query}
          onQueryChange={setQuery}
          onAcceptAlternative={onAcceptAlternative}
          onCatalogSelect={onCatalogSelect}
          onMarkForReview={onMarkForReview}
          onRestore={onRestore}
        />
      )}
    </div>
  );
}

function NonFaFieldPanel({
  detail,
  query,
  onQueryChange,
  onAcceptAlternative,
  onCatalogSelect,
  onMarkForReview,
  onRestore,
}: {
  detail: NonFaFieldDetail;
  query: string;
  onQueryChange: (q: string) => void;
  onAcceptAlternative: (alt: DrawerAlternative) => void;
  onCatalogSelect: (alt: DrawerAlternative) => void;
  onMarkForReview?: (() => void) | undefined;
  onRestore?: (() => void) | undefined;
}) {
  const alternatives = detail.alternatives ?? [];
  const firstAlternative = alternatives[0];
  const filtered = query.trim()
    ? alternatives.filter((alt) => alt.label.toLowerCase().includes(query.trim().toLowerCase()))
    : alternatives;

  return (
    <div>
      <p>
        <StatusBadge status={detail.status} /> <strong>{detail.value}</strong>
      </p>

      {detail.evidence && (
        <p style={{ font: "var(--font-body-2)", color: "var(--color-gray-600)" }}>
          {detail.evidence}
        </p>
      )}

      {onRestore && <OverrideMarker isOverride={detail.isOverride ?? false} onRestore={onRestore} />}

      {detail.references && detail.references.length > 0 && (
        <section aria-label="Códigos precedentes" style={{ marginTop: "var(--space-2)" }}>
          <p style={{ font: "var(--font-body-2)", fontWeight: 600 }}>Códigos precedentes</p>
          {detail.references.map((ref) => (
            <div key={ref.title} style={{ marginBottom: "var(--space-2)" }}>
              <p style={{ font: "var(--font-body-2)", fontWeight: 600 }}>{ref.title}</p>
              <p style={{ font: "var(--font-body-2)", color: "var(--color-gray-600)" }}>
                {ref.description}
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {ref.columns.map((col) => (
                      <th key={col} style={{ textAlign: "left", font: "var(--font-caption)" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ref.rows.map((row, rowIndex) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={rowIndex}>
                      {ref.columns.map((col) => (
                        <td key={col} style={{ font: "var(--font-body-2)" }}>
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {ref.footnote && (
                <p style={{ font: "var(--font-caption)", color: "var(--color-gray-500)" }}>
                  {ref.footnote}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      <div style={{ marginTop: "var(--space-2)" }}>
        <label htmlFor="drawer-catalog-search">Buscar en catálogo</label>
        <input
          id="drawer-catalog-search"
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Escriba para filtrar..."
        />
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-2) 0" }}>
        {filtered.map((alt) => (
          <li key={alt.label} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {alt.label}
              {alt.hint ? ` — ${alt.hint}` : ""}
            </span>
            <button type="button" onClick={() => onCatalogSelect(alt)}>
              Usar
            </button>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: "var(--space-1)" }}>
        {firstAlternative && (
          <button
            type="button"
            onClick={() => onAcceptAlternative(firstAlternative)}
            style={{
              background: "var(--color-primary-1-600)",
              color: "var(--color-white)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "10px 20px",
            }}
          >
            Aceptar sugerencia
          </button>
        )}
        {onMarkForReview && (
          <button
            type="button"
            onClick={onMarkForReview}
            style={{
              background: "var(--color-white)",
              color: "var(--color-primary-1-600)",
              border: "1px solid var(--color-primary-1-600)",
              borderRadius: "var(--radius-md)",
              padding: "10px 20px",
            }}
          >
            Marcar para revisar
          </button>
        )}
      </div>
    </div>
  );
}
