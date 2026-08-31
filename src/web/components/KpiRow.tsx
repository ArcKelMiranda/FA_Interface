/**
 * Task 6.2 (page shell — KPI row of 4, design.md UI Architecture — Batch
 * summary): Codes, Resueltos, Pendientes, FAs nuevos.
 */
import type { CodeEntry } from "../../domain/types.js";
import { FIELD_ORDER, worstStatus } from "../status-meta.js";

export interface KpiRowProps {
  codes: CodeEntry[];
}

function isCodeResolved(code: CodeEntry): boolean {
  const fieldStatuses = FIELD_ORDER.map((f) => code.fields[f].status);
  const faStatuses = code.fa.map((fa) => fa.status ?? "needs_input");
  return worstStatus([...fieldStatuses, ...faStatuses]) === "resolved";
}

export function KpiRow({ codes }: KpiRowProps) {
  const total = codes.length;
  const resolved = codes.filter(isCodeResolved).length;
  const pending = total - resolved;
  const newFas = codes.reduce(
    (count, code) => count + code.fa.filter((fa) => fa.state === "nuevo").length,
    0,
  );

  const kpis = [
    { label: "Codes", value: total },
    { label: "Resueltos", value: resolved },
    { label: "Pendientes", value: pending },
    { label: "FAs nuevos", value: newFas },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-3)",
        marginBottom: "var(--space-6)",
      }}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            flex: 1,
            textAlign: "center",
            background: "var(--color-white)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-2)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ font: "var(--font-heading-2)" }}>{kpi.value}</div>
          <div style={{ font: "var(--font-caption)", color: "var(--color-gray-500)" }}>
            {kpi.label}
          </div>
        </div>
      ))}
    </div>
  );
}
