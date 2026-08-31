/**
 * Task 6.12 (spec review-ui — Legend is filterable): the legend doubles as
 * a status filter, plus "Sólo pendientes" and an 8pt-multiple density
 * toggle. v5's accent-color toggle is intentionally NOT reproduced here.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Filters } from "./Filters.js";

function baseProps() {
  return {
    statusFilter: null,
    onlyPending: false,
    density: "comfortable" as const,
    onStatusFilterChange: vi.fn(),
    onOnlyPendingChange: vi.fn(),
    onDensityChange: vi.fn(),
  };
}

describe("Filters", () => {
  it("clicking a legend entry filters by that status", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<Filters {...props} />);

    await user.click(screen.getByRole("button", { name: /resuelto/i }));

    expect(props.onStatusFilterChange).toHaveBeenCalledWith("resolved");
  });

  it("clicking the active legend entry again clears the filter", async () => {
    const user = userEvent.setup();
    const props = { ...baseProps(), statusFilter: "resolved" as const };
    render(<Filters {...props} />);

    await user.click(screen.getByRole("button", { name: /resuelto/i }));

    expect(props.onStatusFilterChange).toHaveBeenCalledWith(null);
  });

  it("toggles 'Sólo pendientes'", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<Filters {...props} />);

    await user.click(screen.getByRole("checkbox", { name: /sólo pendientes/i }));

    expect(props.onOnlyPendingChange).toHaveBeenCalledWith(true);
  });

  it("switches density between 8pt-multiple options", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<Filters {...props} />);

    await user.click(screen.getByRole("button", { name: /compacto/i }));

    expect(props.onDensityChange).toHaveBeenCalledWith("compact");
  });

  it("does not render an accent-color toggle (removed from v5)", () => {
    render(<Filters {...baseProps()} />);
    expect(screen.queryByRole("button", { name: /color/i })).not.toBeInTheDocument();
  });
});
