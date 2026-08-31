/**
 * Task 6.9 (spec mcp-client — Explicit Empty-State Rendering): a distinct
 * empty-state indicator, visually distinct from loading and error.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState.js";

describe("EmptyState", () => {
  it("renders a status role distinct from error's alert role", () => {
    render(<EmptyState message="No hay lote cargado." />);
    const el = screen.getByRole("status");
    expect(el).toHaveTextContent("No hay lote cargado.");
    expect(el).toHaveAttribute("data-state", "empty");
  });
});
