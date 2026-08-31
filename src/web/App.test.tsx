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
});
