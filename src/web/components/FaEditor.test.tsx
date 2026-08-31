/**
 * Task 6.7 (spec fa-assignment — FA Existing/New Resolution Modes,
 * Alternatives and Discarded-Candidate Reactivation): three resolution
 * modes (select alternative / existing by Id / new FA) plus reactivating a
 * previously discarded FA candidate.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FaEditor } from "./FaEditor.js";

function baseProps() {
  return {
    alternatives: [{ label: "Acme Corp", faId: 10, faName: "Acme Corp" }],
    discarded: [{ id: 20, name: "Old Co", reason: "duplicado" }],
    onSelectAlternative: vi.fn(),
    onSelectExisting: vi.fn(),
    onCreateNew: vi.fn(),
    onReactivateDiscarded: vi.fn(),
  };
}

describe("FaEditor", () => {
  it("defaults to the alternative-selection mode and lists suggested alternatives", () => {
    render(<FaEditor {...baseProps()} />);
    expect(screen.getByRole("radio", { name: /alternativa/i })).toBeChecked();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("switches to existing-by-Id mode and hides the alternative list", async () => {
    const user = userEvent.setup();
    render(<FaEditor {...baseProps()} />);

    await user.click(screen.getByRole("radio", { name: /existente/i }));

    expect(screen.getByLabelText(/id de fa existente/i)).toBeInTheDocument();
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("submits an existing FA by Id", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<FaEditor {...props} />);

    await user.click(screen.getByRole("radio", { name: /existente/i }));
    await user.type(screen.getByLabelText(/id de fa existente/i), "42");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(props.onSelectExisting).toHaveBeenCalledWith(42);
  });

  it("switches to new-FA mode and requires a name and a type before submitting", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<FaEditor {...props} />);

    await user.click(screen.getByRole("radio", { name: /alta nueva/i }));
    await user.type(screen.getByLabelText(/nombre/i), "Nueva FA SA");
    await user.selectOptions(screen.getByLabelText(/tipo/i), "Empresa");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(props.onCreateNew).toHaveBeenCalledWith("Nueva FA SA", "Empresa");
  });

  it("reactivates a discarded candidate", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<FaEditor {...props} />);

    await user.click(screen.getByRole("button", { name: /reactivar/i }));

    expect(props.onReactivateDiscarded).toHaveBeenCalledWith(20);
  });
});
