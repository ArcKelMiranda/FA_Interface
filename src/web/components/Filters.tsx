/**
 * Task 6.12 (spec review-ui — Legend is filterable): the status legend
 * doubles as a status filter, plus "Sólo pendientes" and an 8pt-multiple
 * density toggle (design.md UI Architecture — Filter container). v5's
 * accent-color toggle is intentionally dropped — it contradicts YHAT's
 * single brand palette.
 */
import { STATUS_META, type FieldStatus } from "../status-meta.js";
import { StatusBadge } from "./StatusBadge.js";

export type Density = "compact" | "comfortable";

export interface FiltersProps {
  statusFilter: FieldStatus | null;
  onlyPending: boolean;
  density: Density;
  onStatusFilterChange: (status: FieldStatus | null) => void;
  onOnlyPendingChange: (value: boolean) => void;
  onDensityChange: (density: Density) => void;
}

const ALL_STATUSES = Object.keys(STATUS_META) as FieldStatus[];

export function Filters({
  statusFilter,
  onlyPending,
  density,
  onStatusFilterChange,
  onOnlyPendingChange,
  onDensityChange,
}: FiltersProps) {
  return (
    <div
      className="filters"
      style={{
        borderRadius: "var(--radius-lg)",
        background: "var(--color-white)",
        border: "1px solid var(--color-border)",
        padding: "var(--space-2)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        marginBottom: "var(--space-4)",
      }}
    >
      <div role="group" aria-label="Leyenda / filtro de estado" style={{ display: "flex", gap: "8px" }}>
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={statusFilter === status}
            onClick={() => onStatusFilterChange(statusFilter === status ? null : status)}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            <StatusBadge status={status} />
          </button>
        ))}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <input
          type="checkbox"
          checked={onlyPending}
          onChange={(event) => onOnlyPendingChange(event.target.checked)}
        />
        Sólo pendientes
      </label>

      <div role="group" aria-label="Densidad" style={{ display: "flex", gap: "4px" }}>
        <button
          type="button"
          aria-pressed={density === "compact"}
          onClick={() => onDensityChange("compact")}
        >
          Compacto
        </button>
        <button
          type="button"
          aria-pressed={density === "comfortable"}
          onClick={() => onDensityChange("comfortable")}
        >
          Cómodo
        </button>
      </div>
    </div>
  );
}
