/**
 * Task 6.11 (spec write-confirmation — Two-Step Explicit Confirmation,
 * Approval-Request Signal Rendering): the confirm CTA stays disabled until
 * the user (1) retypes the exact batch number AND (2) ticks "Revisé el
 * plan" — two distinct explicit actions, never auto-confirm
 * (design.md sequence diagram note). Accent `#00E3DB`
 * (`--color-primary-2-600`) is reserved for exactly this control's confirm
 * CTA — no other control in the SPA uses it (design.md UI Architecture —
 * Buttons).
 */
import { useState } from "react";

export interface ConfirmControlProps {
  batchNumber: number;
  onConfirm: () => void;
}

export function ConfirmControl({ batchNumber, onConfirm }: ConfirmControlProps) {
  const [retypedNumber, setRetypedNumber] = useState("");
  const [reviewed, setReviewed] = useState(false);

  const matches = retypedNumber.trim() === String(batchNumber);
  const canConfirm = matches && reviewed;

  return (
    <div
      className="confirm-control"
      role="group"
      aria-label="Confirmación de escritura"
      style={{
        border: "2px solid var(--color-primary-2-600)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-2)",
        marginTop: "var(--space-3)",
      }}
    >
      <p style={{ font: "var(--font-body-2)", color: "var(--color-gray-700)" }}>
        Escriba el número de lote y confirme que revisó el plan antes de continuar.
      </p>

      <label htmlFor="confirm-batch-number">Número de lote</label>
      <input
        id="confirm-batch-number"
        type="text"
        value={retypedNumber}
        onChange={(event) => setRetypedNumber(event.target.value)}
        placeholder={String(batchNumber)}
      />

      <label style={{ display: "block", marginTop: "var(--space-1)" }}>
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(event) => setReviewed(event.target.checked)}
        />
        Revisé el plan
      </label>

      <button
        type="button"
        disabled={!canConfirm}
        onClick={onConfirm}
        style={{
          marginTop: "var(--space-2)",
          background: canConfirm ? "var(--color-primary-2-600)" : "var(--color-gray-400)",
          color: "var(--color-black)",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "10px 20px",
          cursor: canConfirm ? "pointer" : "not-allowed",
        }}
      >
        Confirmar
      </button>
    </div>
  );
}
