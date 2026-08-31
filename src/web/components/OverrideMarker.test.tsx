/**
 * Task 6.8 (spec fa-assignment — Override Marking and Restore): a field or
 * FA whose value was manually changed shows an "edited" marker and a
 * "restore suggestion" action.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OverrideMarker } from "./OverrideMarker.js";

describe("OverrideMarker", () => {
  it("renders nothing when the field is not overridden", () => {
    const { container } = render(<OverrideMarker isOverride={false} onRestore={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an edited marker and a restore action when overridden", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(<OverrideMarker isOverride onRestore={onRestore} />);

    expect(screen.getByText(/editado/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /restaurar sugerencia/i }));

    expect(onRestore).toHaveBeenCalledTimes(1);
  });
});
