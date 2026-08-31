/**
 * Task 6.3 (spec review-ui — Live Batch Table Rendering): one row per code
 * — BranchRep, Rep Name, FA(s), and the eight resolution fields — with
 * hover/selected states and a left-aligned title separator
 * (design.md UI Architecture — Batch table). Task 6.12 wires the status
 * legend filter, "Sólo pendientes", and the 8pt-multiple density toggle
 * directly into row visibility and cell padding.
 */
import type { CSSProperties } from "react";

import type { CodeEntry } from "../../domain/types.js";
import { FIELD_LABELS, FIELD_ORDER, worstStatus, type FieldStatus } from "../status-meta.js";
import type { Density } from "./Filters.js";
import { Fingerprint, type FingerprintStatuses } from "./Fingerprint.js";
import { StatusBadge } from "./StatusBadge.js";

export interface BatchTableProps {
  codes: CodeEntry[];
  statusFilter: FieldStatus | null;
  onlyPending: boolean;
  density: Density;
  selectedCodeId: string | null;
  onSelectRow: (codeId: string) => void;
  onSelectField: (codeId: string, field: string) => void;
}

function faStatus(code: CodeEntry): FieldStatus {
  return worstStatus(code.fa.map((fa) => fa.status ?? "needs_input"));
}

function rowStatus(code: CodeEntry): FieldStatus {
  const fieldStatuses = FIELD_ORDER.map((f) => code.fields[f].status);
  return worstStatus([...fieldStatuses, faStatus(code)]);
}

function faLabel(code: CodeEntry): string {
  if (code.fa.length === 0) {
    return "—";
  }
  return code.fa.map((fa) => fa.name).join(", ");
}

export function BatchTable({
  codes,
  statusFilter,
  onlyPending,
  density,
  selectedCodeId,
  onSelectRow,
  onSelectField,
}: BatchTableProps) {
  const visibleCodes = codes.filter((code) => {
    const overall = rowStatus(code);
    if (onlyPending && overall === "resolved") {
      return false;
    }
    if (statusFilter) {
      const anyFieldMatches = FIELD_ORDER.some((f) => code.fields[f].status === statusFilter);
      const faMatches = faStatus(code) === statusFilter;
      if (!anyFieldMatches && !faMatches) {
        return false;
      }
    }
    return true;
  });

  const cellPadding = density === "compact" ? "8px 16px" : "12px 16px";

  return (
    <section aria-label="Tabla de lote" style={{ padding: "var(--space-2) 0" }}>
      <h3
        style={{
          font: "var(--font-heading-3)",
          textAlign: "left",
          margin: "0 0 var(--space-2) 0",
          paddingBottom: "var(--space-2)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        Códigos del lote
      </h3>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--color-table-header-bg)" }}>
            <th style={headerStyle}>BranchRep</th>
            <th style={headerStyle}>Rep Name</th>
            <th style={headerStyle}>FA</th>
            {FIELD_ORDER.map((f) => (
              <th key={f} style={headerStyle}>
                {FIELD_LABELS[f]}
              </th>
            ))}
            <th style={headerStyle}>Estado</th>
            <th style={headerStyle}>Fingerprint</th>
          </tr>
        </thead>
        <tbody>
          {visibleCodes.map((code) => {
            const selected = code.id === selectedCodeId;
            const fingerprintStatuses: FingerprintStatuses = {
              fa: faStatus(code),
              office: code.fields.office.status,
              country: code.fields.country.status,
              region: code.fields.region.status,
              ibd: code.fields.ibd.status,
              nscc: code.fields.nscc.status,
              origin: code.fields.origin.status,
              dealer: code.fields.dealer.status,
              agente: code.fields.agente.status,
            };

            return (
              <tr
                key={code.id}
                aria-selected={selected}
                className={`batch-row batch-row--${density}${selected ? " batch-row--selected" : ""}`}
                onClick={() => onSelectRow(code.id)}
                style={{
                  background: selected ? "var(--color-secondary-2-400)" : undefined,
                  cursor: "pointer",
                }}
              >
                <td style={{ ...cellStyle, padding: cellPadding }}>{code.branchRep}</td>
                <td style={{ ...cellStyle, padding: cellPadding }}>{code.repName}</td>
                <td
                  style={{ ...cellStyle, padding: cellPadding, cursor: "pointer" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectField(code.id, "fa");
                  }}
                >
                  {faLabel(code)}
                </td>
                {FIELD_ORDER.map((f) => (
                  <td
                    key={f}
                    style={{ ...cellStyle, padding: cellPadding, cursor: "pointer" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectField(code.id, f);
                    }}
                  >
                    {code.fields[f].value}
                  </td>
                ))}
                <td style={{ ...cellStyle, padding: cellPadding }}>
                  <StatusBadge status={rowStatus(code)} />
                </td>
                <td style={{ ...cellStyle, padding: cellPadding }}>
                  <Fingerprint
                    statuses={fingerprintStatuses}
                    onSelectField={(field) => onSelectField(code.id, field)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

const headerStyle: CSSProperties = {
  textAlign: "left",
  font: "var(--font-body-2)",
  fontWeight: 700,
  color: "var(--color-gray-700)",
  padding: "12px 16px",
  border: "1px solid var(--color-border)",
};

const cellStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  font: "var(--font-body-2)",
};
