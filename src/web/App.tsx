/**
 * Task 6.2 (page shell): Header -> Title -> Filters -> KPI row -> Table ->
 * Footer (design.md UI Architecture, YHAT landing order). Orchestrates
 * batch loading (spec review-ui — Live Batch Table Rendering, Batch Load
 * Failure Blocks Rendering; spec mcp-client — Explicit Empty-State
 * Rendering), the fingerprint -> drawer -> field-override flow (tasks
 * 6.5-6.8), and the "Preparar alta" -> plan-review hand-off (design.md
 * Write-Confirmation Gate sequence).
 *
 * Spec fa-assignment (issue #21): per-code `isFalseCompanyMatch`
 * (src/domain/false-company.ts) is projected into a
 * `faIndicatorsByCodeId` map the `BatchTable` renders on the FA cell;
 * per-field `isUnidentifiedPlaceholder` (src/domain/unidentified.ts) is
 * projected into a `headerIndicator` on the `NonFaFieldDetail` the
 * `FieldDrawer` renders on the field header.
 */
import { useState } from "react";

import { isFalseCompanyMatch } from "../domain/false-company.js";
import { isUnidentifiedPlaceholder } from "../domain/unidentified.js";
import type { BatchAnalysis, CodeEntry } from "../domain/types.js";
import type { WritePlan } from "../ports/ReviewStateStore.js";
import { ApiError, fetchBatch, postWritePlan, putFieldOverride } from "./api/client.js";
import { BatchTable } from "./components/BatchTable.js";
import { EmptyState } from "./components/EmptyState.js";
import { ErrorState } from "./components/ErrorState.js";
import type { FaAlternativeOption, FaTipo } from "./components/FaEditor.js";
import { Filters, type Density } from "./components/Filters.js";
import type { DrawerAlternative, DrawerDetail, FaFieldDetail } from "./components/FieldDrawer.js";
import { FieldDrawer } from "./components/FieldDrawer.js";
import { Footer } from "./components/Footer.js";
import { Header } from "./components/Header.js";
import { KpiRow } from "./components/KpiRow.js";
import { PageTitle } from "./components/PageTitle.js";
import { PlanReview } from "./components/PlanReview.js";
import {
  FALSE_COMPANY_INDICATOR,
  FIELD_LABELS,
  FIELD_ORDER,
  GENERIC_PLACEHOLDER_INDICATOR,
  type FieldName,
  type FieldStatus,
  type IndicatorMeta,
} from "./status-meta.js";
import "./styles/tokens.css";

type LoadState = "idle" | "loading" | "loaded" | "error";
type View = "table" | "plan";

function isBatchFullyResolved(batch: BatchAnalysis): boolean {
  return batch.codes.every((code) => {
    const fieldsResolved = FIELD_ORDER.every((f) => code.fields[f].status === "resolved");
    const faResolved = code.fa.length > 0 && code.fa.every((fa) => fa.status === "resolved");
    return fieldsResolved && faResolved;
  });
}

function buildFaDrawerDetail(code: CodeEntry): FaFieldDetail {
  const primaryFa = code.fa[0];
  return {
    kind: "fa",
    label: "FA",
    alternatives: primaryFa?.alternatives ?? [],
    discarded: code.faDiscarded ?? [],
  };
}

/**
 * Spec `fa-assignment` — False-Company Detection Alert (issue #21).
 * Returns the `FALSE_COMPANY_INDICATOR` meta for codes whose joined FA
 * names match `isFalseCompanyMatch`; absent for codes with normal names.
 * The `BatchTable` renders this on the FA cell, not inside the drawer.
 */
function buildFaIndicatorsByCodeId(batch: BatchAnalysis): Record<string, IndicatorMeta> {
  const result: Record<string, IndicatorMeta> = {};
  for (const code of batch.codes) {
    if (code.fa.length === 0) continue;
    const faNames = code.fa.map((fa) => fa.name).join(", ");
    if (isFalseCompanyMatch(faNames)) {
      result[code.id] = FALSE_COMPANY_INDICATOR;
    }
  }
  return result;
}

export function App() {
  const [batchIdInput, setBatchIdInput] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [batch, setBatch] = useState<BatchAnalysis | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<FieldStatus | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);
  const [density, setDensity] = useState<Density>("comfortable");

  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDetail, setDrawerDetail] = useState<DrawerDetail | null>(null);
  const [drawerContext, setDrawerContext] = useState<{ codeId: string; field: string } | null>(null);

  const [overriddenFields, setOverriddenFields] = useState<Set<string>>(new Set());
  const [originalFieldValues, setOriginalFieldValues] = useState<Record<string, string>>({});

  const [view, setView] = useState<View>("table");
  const [plan, setPlan] = useState<WritePlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  async function loadBatch() {
    const id = batchIdInput.trim();
    if (id === "") {
      return;
    }
    setLoadState("loading");
    setLoadError(null);
    try {
      const loaded = await fetchBatch(id);
      setBatch(loaded);
      setBatchId(id);
      setLoadState("loaded");
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Error inesperado al cargar el lote.");
      setLoadState("error");
    }
  }

  function openDrawer(codeId: string, field: string) {
    const code = batch?.codes.find((c) => c.id === codeId);
    if (!code) {
      return;
    }
    setSelectedCodeId(codeId);
    setDrawerContext({ codeId, field });

    if (field === "fa") {
      setDrawerDetail(buildFaDrawerDetail(code));
    } else {
      const key = field as FieldName;
      const fieldValue = code.fields[key];
      setDrawerDetail({
        kind: "field",
        fieldKey: field,
        label: FIELD_LABELS[key] ?? field,
        value: fieldValue.value,
        status: fieldValue.status,
        isOverride: overriddenFields.has(`${codeId}:${field}`),
        ...(isUnidentifiedPlaceholder(fieldValue.value)
          ? { headerIndicator: GENERIC_PLACEHOLDER_INDICATOR }
          : {}),
        ...(fieldValue.evidence !== undefined ? { evidence: fieldValue.evidence } : {}),
        ...(fieldValue.alternatives !== undefined ? { alternatives: fieldValue.alternatives } : {}),
        ...(code.references !== undefined ? { references: code.references } : {}),
      });
    }
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  async function applyFieldOverride(alt: DrawerAlternative) {
    if (!batch || !batchId || !drawerContext) {
      return;
    }
    const { codeId, field } = drawerContext;
    if (field === "fa") {
      return;
    }
    await putFieldOverride(batchId, codeId, field, { value: alt.label });
    const overrideKey = `${codeId}:${field}`;
    const key = field as FieldName;
    const code = batch.codes.find((c) => c.id === codeId);
    if (code && !(overrideKey in originalFieldValues)) {
      const originalValue = code.fields[key].value;
      setOriginalFieldValues((prev) => ({ ...prev, [overrideKey]: originalValue }));
    }
    setOverriddenFields((prev) => new Set(prev).add(overrideKey));
    setBatch((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        codes: prev.codes.map((c) => {
          if (c.id !== codeId) {
            return c;
          }
          return {
            ...c,
            fields: {
              ...c.fields,
              [key]: { ...c.fields[key], value: alt.label, status: "resolved" as const },
            },
          };
        }),
      };
    });
    setDrawerOpen(false);
  }

  function restoreField() {
    if (!drawerContext) {
      return;
    }
    const { codeId, field } = drawerContext;
    const overrideKey = `${codeId}:${field}`;
    const original = originalFieldValues[overrideKey];
    if (original === undefined) {
      return;
    }
    const key = field as FieldName;
    setBatch((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        codes: prev.codes.map((code) => {
          if (code.id !== codeId) {
            return code;
          }
          return {
            ...code,
            fields: {
              ...code.fields,
              [key]: { ...code.fields[key], value: original, status: "resolved" as const },
            },
          };
        }),
      };
    });
    setOverriddenFields((prev) => {
      const next = new Set(prev);
      next.delete(overrideKey);
      return next;
    });
    setDrawerOpen(false);
  }

  function markFieldForReview() {
    if (!drawerContext) {
      return;
    }
    const { codeId, field } = drawerContext;
    const key = field as FieldName;
    setBatch((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        codes: prev.codes.map((code) => {
          if (code.id !== codeId) {
            return code;
          }
          return {
            ...code,
            fields: {
              ...code.fields,
              [key]: { ...code.fields[key], status: "needs_confirm" as const },
            },
          };
        }),
      };
    });
    setDrawerOpen(false);
  }

  function updateCodeFa(codeId: string, updater: (code: CodeEntry) => CodeEntry) {
    if (!batch) {
      return;
    }
    const code = batch.codes.find((c) => c.id === codeId);
    if (!code) {
      return;
    }
    const updatedCode = updater(code);
    setBatch({
      ...batch,
      codes: batch.codes.map((c) => (c.id === codeId ? updatedCode : c)),
    });
    return updatedCode;
  }

  function selectFaAlternative(alt: FaAlternativeOption) {
    if (!drawerContext) {
      return;
    }
    updateCodeFa(drawerContext.codeId, (code) => ({
      ...code,
      fa: [{ id: alt.faId, name: alt.faName, state: "existente" as const, status: "resolved" as const }],
    }));
    setDrawerOpen(false);
  }

  function selectExistingFa(faId: number) {
    if (!drawerContext) {
      return;
    }
    updateCodeFa(drawerContext.codeId, (code) => ({
      ...code,
      fa: [{ id: faId, name: `FA #${faId}`, state: "existente" as const, status: "resolved" as const }],
    }));
    setDrawerOpen(false);
  }

  function createNewFa(name: string, tipo: FaTipo) {
    if (!drawerContext) {
      return;
    }
    updateCodeFa(drawerContext.codeId, (code) => ({
      ...code,
      fa: [
        {
          id: -Date.now(),
          name,
          tipo,
          state: "nuevo" as const,
          status: "resolved" as const,
        },
      ],
    }));
    setDrawerOpen(false);
  }

  function reactivateDiscardedFa(id: number) {
    if (!drawerContext) {
      return;
    }
    const updatedCode = updateCodeFa(drawerContext.codeId, (code) => {
      const discardedItem = (code.faDiscarded ?? []).find((d) => d.id === id);
      if (!discardedItem) {
        return code;
      }
      const remainingDiscarded = (code.faDiscarded ?? []).filter((d) => d.id !== id);
      const newAlternative: FaAlternativeOption = {
        label: discardedItem.name,
        faId: discardedItem.id,
        faName: discardedItem.name,
      };
      const primaryFa = code.fa[0];
      const updatedFa = primaryFa
        ? [{ ...primaryFa, alternatives: [...(primaryFa.alternatives ?? []), newAlternative] }, ...code.fa.slice(1)]
        : code.fa;
      return { ...code, fa: updatedFa, faDiscarded: remainingDiscarded };
    });
    if (updatedCode) {
      setDrawerDetail(buildFaDrawerDetail(updatedCode));
    }
  }

  async function handlePrepararAlta() {
    if (!batchId) {
      return;
    }
    try {
      const preparedPlan = await postWritePlan(batchId);
      setPlan(preparedPlan);
      setPlanError(null);
      setView("plan");
    } catch (error) {
      setPlanError(error instanceof ApiError ? error.message : "No se pudo preparar el plan de alta.");
    }
  }

  const fullyResolved = batch !== null && isBatchFullyResolved(batch);

  return (
    <div>
      <Header />
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 var(--space-4)" }}>
        <PageTitle>Revisión de lote</PageTitle>

        {view === "table" && (
          <>
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: "var(--space-3)",
              }}
            >
              <label htmlFor="batch-id-input">Id de lote</label>
              <input
                id="batch-id-input"
                value={batchIdInput}
                onChange={(event) => setBatchIdInput(event.target.value)}
              />
              <button type="button" onClick={loadBatch}>
                Cargar
              </button>
            </div>

            {loadState === "idle" && <EmptyState message="No hay lote cargado." />}
            {loadState === "loading" && (
              <p role="status" data-state="loading">
                Cargando lote...
              </p>
            )}
            {loadState === "error" && (
              <ErrorState message={loadError ?? "No se pudo cargar el lote."} />
            )}
            {loadState === "loaded" && batch && (
              <>
                <Filters
                  statusFilter={statusFilter}
                  onlyPending={onlyPending}
                  density={density}
                  onStatusFilterChange={setStatusFilter}
                  onOnlyPendingChange={setOnlyPending}
                  onDensityChange={setDensity}
                />
                <KpiRow codes={batch.codes} />
                {batch.codes.length === 0 ? (
                  <EmptyState message="El lote no tiene códigos." />
                ) : (
                  <BatchTable
                    codes={batch.codes}
                    statusFilter={statusFilter}
                    onlyPending={onlyPending}
                    density={density}
                    selectedCodeId={selectedCodeId}
                    onSelectRow={setSelectedCodeId}
                    onSelectField={openDrawer}
                    faIndicatorsByCodeId={buildFaIndicatorsByCodeId(batch)}
                  />
                )}
                <div style={{ textAlign: "center", margin: "var(--space-4) 0" }}>
                  <button type="button" disabled={!fullyResolved} onClick={handlePrepararAlta}>
                    Preparar alta
                  </button>
                  {planError && <p role="alert">{planError}</p>}
                </div>
              </>
            )}
          </>
        )}

        {view === "plan" && plan && batch && (
          <PlanReview plan={plan} batchNumber={batch.batchNo} onConfirm={() => {}} />
        )}

        <FieldDrawer
          open={drawerOpen}
          detail={drawerDetail}
          onClose={closeDrawer}
          onAcceptAlternative={applyFieldOverride}
          onCatalogSelect={applyFieldOverride}
          onMarkForReview={markFieldForReview}
          onRestore={restoreField}
          onSelectFaAlternative={selectFaAlternative}
          onSelectExistingFa={selectExistingFa}
          onCreateNewFa={createNewFa}
          onReactivateDiscardedFa={reactivateDiscardedFa}
        />
      </main>
      <Footer />
    </div>
  );
}
