/**
 * Task 6.10 (spec write-confirmation — Commit Action Disabled Until
 * Upstream Write Tools Exist; Full Write Preview Rendering): rows, resolved
 * names, statements, and a disabled commit CTA carrying a stated reason
 * and a non-color disabled cue.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { WritePlan } from "../../ports/ReviewStateStore.js";
import { PlanReview } from "./PlanReview.js";

function makePlan(): WritePlan {
  return {
    planId: "plan-1",
    statements: [
      "0001-0002 (code-1): office = \"NY\"",
      "0001-0002 (code-1): agente = \"A1\"",
    ],
    affectedRows: 2,
    expiresAt: "2026-08-31T00:15:00.000Z",
    status: "awaiting_confirmation",
  };
}

describe("PlanReview", () => {
  it("renders every planned statement", () => {
    render(<PlanReview plan={makePlan()} batchNumber={42} onConfirm={() => {}} />);

    expect(screen.getByText(/office = "NY"/)).toBeInTheDocument();
    expect(screen.getByText(/agente = "A1"/)).toBeInTheDocument();
  });

  it("renders the commit action disabled with a stated reason, not color alone", () => {
    render(<PlanReview plan={makePlan()} batchNumber={42} onConfirm={() => {}} />);

    const commitButton = screen.getByRole("button", { name: /confirmar escritura/i });
    expect(commitButton).toBeDisabled();
    expect(commitButton).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(/yhat-mcp-server aún no expone herramientas de escritura/i),
    ).toBeInTheDocument();
  });

  it("offers no alternate action that performs or substitutes for a commit", () => {
    render(<PlanReview plan={makePlan()} batchNumber={42} onConfirm={() => {}} />);

    expect(screen.queryByRole("button", { name: /exportar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /descargar script/i })).not.toBeInTheDocument();
  });
});
