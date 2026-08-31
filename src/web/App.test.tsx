/**
 * Task 6.2 (page shell) integration coverage: Header -> Title -> Filters ->
 * KPI row -> Table -> Footer, wired to the empty/loading/error states
 * (task 6.9), the fingerprint -> drawer flow (tasks 6.5-6.6), and the
 * "Preparar alta" -> plan-review flow (design.md Write-Confirmation Gate
 * sequence; spec write-confirmation).
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BatchAnalysis } from "../domain/types.js";
import { App } from "./App.js";

function field(value: string, status: "resolved" | "needs_confirm" | "needs_input" | "no_data" = "resolved") {
  return { value, status };
}

function makeBatch(overrides: Partial<BatchAnalysis> = {}): BatchAnalysis {
  return {
    contractVersion: "1.0.0",
    batchNo: 42,
    snapshot: "2026-08-31T00:00:00.000Z",
    codes: [
      {
        id: "code-1",
        branchRep: "0001-0002",
        repName: "Jane Doe",
        fields: {
          office: field("NY"),
          country: field("US"),
          region: field("NE"),
          ibd: field("IBD1"),
          nscc: field("NSCC1"),
          origin: field("PERSHING"),
          dealer: field("D1"),
          agente: field("A1"),
        },
        fa: [{ id: 1, name: "Acme Corp", state: "existente", status: "resolved" }],
      },
    ],
    ...overrides,
  };
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the empty state before any batch is loaded", () => {
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent(/no hay lote cargado/i);
  });

  it("loads a batch and renders the table shell: title, filters, KPI row, table, footer", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch: makeBatch() }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));

    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /revisión de lote/i })).toBeInTheDocument();
    expect(screen.getByText("Codes")).toBeInTheDocument();
    expect(screen.getByText("facodes — Revisión de códigos FA")).toBeInTheDocument();
  });

  it("shows a blocking error and no table when the load fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: "batch_load_failed", message: "No se pudo cargar el lote 42." }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("opens the field drawer from a fingerprint tick and closes it on Escape", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch: makeBatch() }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^office/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("enables 'Preparar alta' only when the batch is fully resolved, and opens plan review on click", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch: makeBatch() }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        plan: {
          planId: "plan-1",
          statements: ["0001-0002 (code-1): office = \"NY\""],
          affectedRows: 1,
          expiresAt: "2026-08-31T00:15:00.000Z",
          status: "awaiting_confirmation",
        },
      }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    const preparar = screen.getByRole("button", { name: /preparar alta/i });
    expect(preparar).toBeEnabled();

    await user.click(preparar);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /plan de alta/i })).toBeInTheDocument(),
    );
    expect(screen.getByText(/office = "NY"/)).toBeInTheDocument();
  });

  it("resolves a code's FA via the alternative-selection mode and closes the drawer", async () => {
    const user = userEvent.setup();
    const batch = makeBatch();
    batch.codes[0]!.fa = [
      {
        id: 1,
        name: "Acme Corp",
        state: "existente",
        status: "needs_confirm",
        alternatives: [{ label: "Beta Inc", faId: 2, faName: "Beta Inc" }],
      },
    ];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^fa:/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /beta inc/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Beta Inc")).toBeInTheDocument());
  });

  it("resolves a code's FA via the existing-by-Id mode", async () => {
    const user = userEvent.setup();
    const batch = makeBatch();
    batch.codes[0]!.fa = [{ id: 1, name: "Acme Corp", state: "existente", status: "needs_confirm" }];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^fa:/i }));
    await user.click(screen.getByRole("radio", { name: /fa existente/i }));
    await user.type(screen.getByLabelText(/id de fa existente/i), "99");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/fa #99/i)).toBeInTheDocument());
  });

  it("resolves a code's FA via the new-FA registration mode", async () => {
    const user = userEvent.setup();
    const batch = makeBatch();
    batch.codes[0]!.fa = [{ id: 1, name: "Acme Corp", state: "existente", status: "needs_confirm" }];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^fa:/i }));
    await user.click(screen.getByRole("radio", { name: /alta nueva/i }));
    await user.type(screen.getByLabelText(/^nombre$/i), "Gamma LLC");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Gamma LLC")).toBeInTheDocument());
  });

  it("reactivates a discarded FA candidate into the alternatives list without closing the drawer", async () => {
    const user = userEvent.setup();
    const batch = makeBatch();
    batch.codes[0]!.fa = [{ id: 1, name: "Acme Corp", state: "existente", status: "needs_confirm" }];
    batch.codes[0]!.faDiscarded = [{ id: 5, name: "Delta Co", reason: "duplicado" }];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^fa:/i }));
    expect(screen.getByText("Delta Co", { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /reactivar/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(/candidatos descartados/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delta co/i })).toBeInTheDocument();
  });

  it("marks a field as an override and restores it to the original suggested value", async () => {
    const user = userEvent.setup();
    const batch = makeBatch();
    batch.codes[0]!.fields.office.alternatives = [{ label: "Boston" }];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^office/i }));
    await user.click(screen.getByRole("button", { name: /aceptar sugerencia/i }));
    await waitFor(() => expect(screen.getByText("Boston")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^office/i }));
    expect(screen.getByText(/editado/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /restaurar sugerencia/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("NY")).toBeInTheDocument());
  });

  it("marks a field for review, setting its status to needs_confirm", async () => {
    const user = userEvent.setup();
    const batch = makeBatch();
    batch.codes[0]!.fields.office.alternatives = [{ label: "Boston" }];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^office/i }));
    await user.click(screen.getByRole("button", { name: /marcar para revisar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const preparar = screen.getByRole("button", { name: /preparar alta/i });
    expect(preparar).toBeDisabled();
  });

  it("renders precedent codes in the field drawer when the code carries references", async () => {
    const user = userEvent.setup();
    const batch = makeBatch();
    batch.codes[0]!.references = [
      {
        title: "Códigos previos",
        description: "Coincidencias históricas para este BranchRep.",
        columns: ["Codigo", "Office"],
        rows: [{ Codigo: "0001-0002", Office: "NY" }],
      },
    ];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batch }),
    } as Response);

    render(<App />);
    await user.type(screen.getByLabelText(/id de lote/i), "42");
    await user.click(screen.getByRole("button", { name: /cargar/i }));
    await waitFor(() => expect(screen.getByText("0001-0002")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^office/i }));
    expect(screen.getByText(/códigos precedentes/i)).toBeInTheDocument();
    expect(screen.getByText(/coincidencias históricas/i)).toBeInTheDocument();
  });
});
