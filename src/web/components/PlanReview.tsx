/**
 * Task 6.10 (spec write-confirmation — Commit Action Disabled Until
 * Upstream Write Tools Exist, Full Write Preview Rendering): the full-page
 * plan-review screen — rows, resolved names, statements, and the commit
 * CTA. While `writeToolsEnabled` is false (the current reality —
 * `WRITE_TOOLS_ENABLED=false` server-side, design.md Migration/Rollout),
 * the CTA renders disabled with a stated reason and a non-color cue
 * (`disabled` attribute + `aria-disabled` + reduced-opacity/gray fill, not
 * color alone). Once write tools exist, this embeds `ConfirmControl`
 * (task 6.11) as the two-step gate before the commit call.
 */
import type { WritePlan } from "../../ports/ReviewStateStore.js";
import { ConfirmControl } from "./ConfirmControl.js";

export interface PlanReviewProps {
  plan: WritePlan;
  batchNumber: number;
  onConfirm: () => void;
  /** Defaults to false — matches `WRITE_TOOLS_ENABLED=false` today. */
  writeToolsEnabled?: boolean;
}

const WRITE_TOOLS_UNAVAILABLE_MESSAGE =
  'La escritura está deshabilitada: yhat-mcp-server aún no expone herramientas de escritura.';

export function PlanReview({
  plan,
  batchNumber,
  onConfirm,
  writeToolsEnabled = false,
}: PlanReviewProps) {
  return (
    <section aria-label="Revisión del plan de escritura" style={{ padding: "var(--space-4)" }}>
      <h2
        style={{
          font: "var(--font-heading-2)",
          textAlign: "center",
          margin: "0 0 var(--space-2) 0",
        }}
      >
        Plan de alta — Lote {batchNumber}
      </h2>

      <p style={{ font: "var(--font-body-2)", color: "var(--color-gray-500)" }}>
        {plan.affectedRows} cambio(s) planificado(s). Expira: {plan.expiresAt}.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-3) 0" }}>
        {plan.statements.map((statement, index) => (
          <li
            key={index}
            style={{
              padding: "var(--space-1) var(--space-2)",
              borderBottom: "1px solid var(--color-border)",
              font: "var(--font-body-2)",
            }}
          >
            {statement}
          </li>
        ))}
      </ul>

      {writeToolsEnabled ? (
        <ConfirmControl batchNumber={batchNumber} onConfirm={onConfirm} />
      ) : (
        <div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            style={{
              background: "var(--color-gray-400)",
              color: "var(--color-white)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "10px 20px",
              cursor: "not-allowed",
              opacity: 0.7,
            }}
          >
            <span aria-hidden="true">🔒</span> Confirmar escritura
          </button>
          <p style={{ font: "var(--font-body-2)", color: "var(--color-gray-600)" }}>
            {WRITE_TOOLS_UNAVAILABLE_MESSAGE}
          </p>
        </div>
      )}
    </section>
  );
}
