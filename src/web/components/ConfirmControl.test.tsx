/**
 * Task 6.11 (spec write-confirmation — Two-Step Explicit Confirmation,
 * Approval-Request Signal Rendering): confirm CTA stays disabled until the
 * user retypes the exact batch number AND ticks "Revisé el plan" — two
 * distinct actions, never auto-confirm. Accent `#00E3DB` is reserved for
 * this control only (design.md UI Architecture — Buttons).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmControl } from "./ConfirmControl.js";

describe("ConfirmControl", () => {
  it("disables the confirm CTA until both the batch number matches and the checkbox is ticked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmControl batchNumber={42} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/número de lote/i), "42");
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /revisé el plan/i }));
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("keeps the CTA disabled when the retyped batch number does not match", async () => {
    const user = userEvent.setup();
    render(<ConfirmControl batchNumber={42} onConfirm={() => {}} />);

    await user.type(screen.getByLabelText(/número de lote/i), "99");
    await user.click(screen.getByRole("checkbox", { name: /revisé el plan/i }));

    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("uses the reserved accent color only on this control's confirm CTA", async () => {
    const user = userEvent.setup();
    render(<ConfirmControl batchNumber={42} onConfirm={() => {}} />);

    await user.type(screen.getByLabelText(/número de lote/i), "42");
    await user.click(screen.getByRole("checkbox", { name: /revisé el plan/i }));

    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmButton).toHaveStyle({ background: "var(--color-primary-2-600)" });
  });
});
