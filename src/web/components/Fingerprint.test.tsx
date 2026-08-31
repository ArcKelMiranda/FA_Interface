/**
 * Task 6.5 (spec review-ui — Per-Row Fingerprint Summary): nine ticks (FA +
 * 8 fields), each clickable and opening the matching drawer field.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Fingerprint } from "./Fingerprint.js";

function statuses() {
  return {
    fa: "resolved" as const,
    office: "resolved" as const,
    country: "needs_confirm" as const,
    region: "needs_input" as const,
    ibd: "no_data" as const,
    nscc: "resolved" as const,
    origin: "resolved" as const,
    dealer: "resolved" as const,
    agente: "resolved" as const,
  };
}

describe("Fingerprint", () => {
  it("renders exactly nine ticks", () => {
    render(<Fingerprint statuses={statuses()} onSelectField={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("opens the matching drawer field when a tick is clicked", async () => {
    const user = userEvent.setup();
    const onSelectField = vi.fn();
    render(<Fingerprint statuses={statuses()} onSelectField={onSelectField} />);

    await user.click(screen.getByRole("button", { name: /country/i }));

    expect(onSelectField).toHaveBeenCalledWith("country");
  });

  it("opens the fa drawer field when the fa tick is clicked", async () => {
    const user = userEvent.setup();
    const onSelectField = vi.fn();
    render(<Fingerprint statuses={statuses()} onSelectField={onSelectField} />);

    await user.click(screen.getByRole("button", { name: /^fa/i }));

    expect(onSelectField).toHaveBeenCalledWith("fa");
  });

  it("each tick carries its status as a non-color texture attribute", () => {
    render(<Fingerprint statuses={statuses()} onSelectField={() => {}} />);
    const ibdTick = screen.getByRole("button", { name: /ibd/i });
    expect(ibdTick).toHaveAttribute("data-texture", "horizontal-hatch");
  });
});
