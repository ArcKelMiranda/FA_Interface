/**
 * Task 6.2 (page shell): Header -> Title -> Filters -> KPI row -> Table ->
 * Footer (design.md UI Architecture, YHAT landing order). Orchestrates
 * batch loading (spec review-ui — Live Batch Table Rendering, Batch Load
 * Failure Blocks Rendering; spec mcp-client — Explicit Empty-State
 * Rendering), the fingerprint -> drawer -> field-override flow (tasks
 * 6.5-6.8), and the "Preparar alta" -> plan-review hand-off (design.md
 * Write-Confirmation Gate sequence).
 */
import { useState } from "react";

import type { BatchAnalysis } from "../domain/types.js";
import type { WritePlan } from "../ports/ReviewStateStore.js";
import { ApiError, fetchBatch, postWritePlan, putFieldOverride } from "./api/client.js";
import { BatchTable } from "./components/BatchTable.js";
import { EmptyState } from "./components/EmptyState.js";
import { ErrorState } from "./components/ErrorState.js";
import { Filters, type Density } from "./components/Filters.js";
import type { DrawerAlternative, DrawerDetail } from "./components/FieldDrawer.js";
import { FieldDrawer } from "./components/FieldDrawer.js";
import { Footer } from "./components/Footer.js";
import { Header } from "./components/Header.js";
import { KpiRow } from "./components/KpiRow.js";
import { PageTitle } from "./components/PageTitle.js";
import { PlanReview } from "./components/PlanReview.js";
import { FIELD_LABELS, FIELD_ORDER, type FieldName, type FieldStatus } from "./status-meta.js";
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
      const primaryFa = code.fa[0];
      setDrawerDetail({
        kind: "fa",
        label: "FA",
        alternatives: primaryFa?.alternatives ?? [],
        discarded: code.faDiscarded ?? [],
      });
    } else {
      const key = field as FieldName;
      const fieldValue = code.fields[key];
      setDrawerDetail({
        kind: "field",
        fieldKey: field,
        label: FIELD_LABELS[key] ?? field,
        value: fieldValue.value,
        status: fieldValue.status,
        ...(fieldValue.evidence !== undefined ? { evidence: fieldValue.evidence } : {}),
        ...(fieldValue.alternatives !== undefined ? { alternatives: fieldValue.alternatives } : {}),
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
          const key = field as FieldName;
          return {
            ...code,
            fields: {
              ...code.fields,
              [key]: { ...code.fields[key], value: alt.label, status: "resolved" as const },
            },
          };
        }),
      };
    });
    setDrawerOpen(false);
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
        />
      </main>
      <Footer />
    </div>
  );
}
