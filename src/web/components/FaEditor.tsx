/**
 * Task 6.7 (spec fa-assignment — FA Existing/New Resolution Modes,
 * Alternatives and Discarded-Candidate Reactivation): three modes to
 * resolve a code's FA — select a suggested alternative, reference an
 * existing FA by Id, or register a new FA (Persona/Empresa/Sin identificar)
 * — plus reactivating a previously discarded candidate into the
 * alternatives list.
 */
import { useState } from "react";

export type FaTipo = "Persona" | "Empresa" | "Sin identificar";

export interface FaAlternativeOption {
  label: string;
  faId: number;
  faName: string;
  // `| undefined` matches zod's `.optional()`-inferred shape under
  // exactOptionalPropertyTypes, so these types accept BatchAnalysis data
  // (src/domain/types.ts) directly without a normalization step.
  hint?: string | undefined;
}

export interface FaDiscardedOption {
  id: number;
  name: string;
  reason: string;
}

export interface FaEditorProps {
  alternatives: FaAlternativeOption[];
  discarded: FaDiscardedOption[];
  onSelectAlternative: (alt: FaAlternativeOption) => void;
  onSelectExisting: (faId: number) => void;
  onCreateNew: (name: string, tipo: FaTipo) => void;
  onReactivateDiscarded: (id: number) => void;
}

type Mode = "alternative" | "existing" | "new";

export function FaEditor({
  alternatives,
  discarded,
  onSelectAlternative,
  onSelectExisting,
  onCreateNew,
  onReactivateDiscarded,
}: FaEditorProps) {
  const [mode, setMode] = useState<Mode>("alternative");
  const [existingId, setExistingId] = useState("");
  const [newName, setNewName] = useState("");
  const [newTipo, setNewTipo] = useState<FaTipo>("Persona");

  return (
    <div className="fa-editor">
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="sr-only">Modo de resolución de FA</legend>
        <label style={{ marginRight: "16px" }}>
          <input
            type="radio"
            name="fa-editor-mode"
            value="alternative"
            checked={mode === "alternative"}
            onChange={() => setMode("alternative")}
          />
          Alternativa sugerida
        </label>
        <label style={{ marginRight: "16px" }}>
          <input
            type="radio"
            name="fa-editor-mode"
            value="existing"
            checked={mode === "existing"}
            onChange={() => setMode("existing")}
          />
          FA existente
        </label>
        <label>
          <input
            type="radio"
            name="fa-editor-mode"
            value="new"
            checked={mode === "new"}
            onChange={() => setMode("new")}
          />
          Alta nueva
        </label>
      </fieldset>

      {mode === "alternative" && (
        <ul style={{ listStyle: "none", padding: 0, margin: "16px 0" }}>
          {alternatives.map((alt) => (
            <li key={alt.faId}>
              <button
                type="button"
                onClick={() => onSelectAlternative(alt)}
                style={{ padding: "8px 12px", cursor: "pointer" }}
              >
                {alt.faName}
                {alt.hint ? ` — ${alt.hint}` : ""}
              </button>
            </li>
          ))}
          {alternatives.length === 0 && <li>No hay alternativas sugeridas.</li>}
        </ul>
      )}

      {mode === "existing" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const id = Number(existingId);
            if (Number.isFinite(id) && existingId.trim() !== "") {
              onSelectExisting(id);
            }
          }}
          style={{ margin: "16px 0" }}
        >
          <label htmlFor="fa-existing-id">Id de FA existente</label>
          <input
            id="fa-existing-id"
            type="text"
            inputMode="numeric"
            value={existingId}
            onChange={(event) => setExistingId(event.target.value)}
          />
          <button type="submit">Aplicar</button>
        </form>
      )}

      {mode === "new" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (newName.trim() !== "") {
              onCreateNew(newName.trim(), newTipo);
            }
          }}
          style={{ margin: "16px 0" }}
        >
          <label htmlFor="fa-new-name">Nombre</label>
          <input
            id="fa-new-name"
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <label htmlFor="fa-new-tipo">Tipo</label>
          <select
            id="fa-new-tipo"
            value={newTipo}
            onChange={(event) => setNewTipo(event.target.value as FaTipo)}
          >
            <option value="Persona">Persona</option>
            <option value="Empresa">Empresa</option>
            <option value="Sin identificar">Sin identificar</option>
          </select>
          <button type="submit" disabled={newName.trim() === ""}>
            Aplicar
          </button>
        </form>
      )}

      {discarded.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <p style={{ font: "var(--font-body-2)", color: "var(--color-gray-500)" }}>
            Candidatos descartados
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {discarded.map((d) => (
              <li key={d.id}>
                {d.name} ({d.reason}){" "}
                <button type="button" onClick={() => onReactivateDiscarded(d.id)}>
                  Reactivar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
