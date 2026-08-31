/**
 * Task 6.2 (page shell — KPI row of 4): Codes, Resueltos, Pendientes, FAs
 * nuevos, computed from the batch's codes.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CodeEntry } from "../../domain/types.js";
import { KpiRow } from "./KpiRow.js";

function field(status: "resolved" | "needs_confirm" | "needs_input" | "no_data") {
  return { value: "x", status };
}

function makeCode(overrides: Partial<CodeEntry>): CodeEntry {
  return {
    id: "code-1",
    branchRep: "0001-0002",
    repName: "Jane Doe",
    fields: {
      office: field("resolved"),
      country: field("resolved"),
      region: field("resolved"),
      ibd: field("resolved"),
      nscc: field("resolved"),
      origin: field("resolved"),
      dealer: field("resolved"),
      agente: field("resolved"),
    },
    fa: [{ id: 1, name: "Acme", state: "existente", status: "resolved" }],
    ...overrides,
  };
}

describe("KpiRow", () => {
  it("computes Codes, Resueltos, Pendientes, and FAs nuevos", () => {
    const resolvedCode = makeCode({ id: "code-1" });
    const pendingCode = makeCode({
      id: "code-2",
      fields: { ...resolvedCode.fields, office: field("needs_confirm") },
    });
    const newFaCode = makeCode({
      id: "code-3",
      fa: [{ id: 2, name: "Nueva FA", state: "nuevo" }],
    });

    render(<KpiRow codes={[resolvedCode, pendingCode, newFaCode]} />);

    expect(screen.getByText("Codes").previousSibling).toHaveTextContent("3");
    expect(screen.getByText("Resueltos").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Pendientes").previousSibling).toHaveTextContent("2");
    expect(screen.getByText("FAs nuevos").previousSibling).toHaveTextContent("1");
  });
});
