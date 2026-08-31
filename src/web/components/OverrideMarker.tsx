/**
 * Task 6.8 (spec fa-assignment — Override Marking and Restore): visually
 * marks a manually-changed field/FA and offers a "restore suggestion"
 * action that reverts it to the originally suggested value.
 */
export interface OverrideMarkerProps {
  isOverride: boolean;
  onRestore: () => void;
}

export function OverrideMarker({ isOverride, onRestore }: OverrideMarkerProps) {
  if (!isOverride) {
    return null;
  }

  return (
    <span
      className="override-marker"
      style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
    >
      <span
        style={{
          font: "var(--font-caption)",
          color: "var(--color-gray-600)",
          border: "1px solid var(--color-gray-400)",
          borderRadius: "var(--radius-sm)",
          padding: "2px 6px",
        }}
      >
        Editado
      </span>
      <button
        type="button"
        onClick={onRestore}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--color-primary-1-600)",
          font: "var(--font-body-2)",
          cursor: "pointer",
          padding: "8px 12px",
        }}
      >
        Restaurar sugerencia
      </button>
    </span>
  );
}
