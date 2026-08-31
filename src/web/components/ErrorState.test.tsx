/**
 * Task 6.9 (spec review-ui — Batch Load Failure Blocks Rendering): a
 * visible, batch-scoped error, distinct from the empty and loading states.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorState } from "./ErrorState.js";

describe("ErrorState", () => {
  it("renders an alert role distinct from empty-state's status role", () => {
    render(<ErrorState message="No se pudo cargar el lote 42." />);
    const el = screen.getByRole("alert");
    expect(el).toHaveTextContent("No se pudo cargar el lote 42.");
    expect(el).toHaveAttribute("data-state", "error");
  });
});
