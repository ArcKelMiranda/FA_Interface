/**
 * Task 6.5 (spec review-ui — Per-Row Fingerprint Summary): nine ticks — one
 * FA slot plus the eight resolution fields — each a clickable 4×16px button
 * carrying its status fill/texture and an `aria-label`. Below 768px the hit
 * area expands to 44×44px (design.md UI Architecture — Fingerprint).
 */
import { FIELD_LABELS, FIELD_ORDER, STATUS_META, type FieldName, type FieldStatus } from "../status-meta.js";

export type DrawerFieldKey = "fa" | FieldName;

export interface FingerprintStatuses {
  fa: FieldStatus;
  office: FieldStatus;
  country: FieldStatus;
  region: FieldStatus;
  ibd: FieldStatus;
  nscc: FieldStatus;
  origin: FieldStatus;
  dealer: FieldStatus;
  agente: FieldStatus;
}

export interface FingerprintProps {
  statuses: FingerprintStatuses;
  onSelectField: (field: DrawerFieldKey) => void;
}

const TICKS: { key: DrawerFieldKey; label: string }[] = [
  { key: "fa", label: "FA" },
  ...FIELD_ORDER.map((field) => ({ key: field as DrawerFieldKey, label: FIELD_LABELS[field] })),
];

export function Fingerprint({ statuses, onSelectField }: FingerprintProps) {
  return (
    <div
      role="group"
      aria-label="Fingerprint"
      style={{ display: "inline-flex", gap: "2px", padding: "8px", marginLeft: "8px" }}
    >
      {TICKS.map(({ key, label }) => {
        const meta = STATUS_META[statuses[key]];
        return (
          <button
            key={key}
            type="button"
            aria-label={`${label}: ${meta.label}`}
            data-texture={meta.texture}
            data-field={key}
            onClick={() => onSelectField(key)}
            className={`fingerprint-tick fingerprint-tick--${meta.texture}`}
            style={{
              width: "4px",
              height: "16px",
              minWidth: "4px",
              padding: 0,
              border: "none",
              background: meta.bg,
              cursor: "pointer",
            }}
          />
        );
      })}
    </div>
  );
}
