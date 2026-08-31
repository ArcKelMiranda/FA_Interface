/**
 * Task 6.6 (spec review-ui — Per-Field Drawer): opens on cell/fingerprint
 * click, `role="dialog" aria-modal="true"`, Escape closes without losing
 * table state, shows current value/evidence/alternatives, and a catalog
 * search control for non-FA fields.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FieldDrawer, type NonFaFieldDetail } from "./FieldDrawer.js";

function nonFaField(): NonFaFieldDetail {
  return {
    kind: "field",
    fieldKey: "office",
    label: "Office",
    value: "NY",
    status: "needs_confirm",
    evidence: "Coincide con el código de sucursal previo.",
    alternatives: [
      { label: "New York" },
      { label: "Newark" },
    ],
  };
}

describe("FieldDrawer", () => {
  it("renders nothing when closed", () => {
    render(
      <FieldDrawer
        open={false}
        detail={nonFaField()}
        onClose={() => {}}
        onAcceptAlternative={() => {}}
        onCatalogSelect={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders as an accessible modal dialog with evidence and alternatives", () => {
    render(
      <FieldDrawer
        open
        detail={nonFaField()}
        onClose={() => {}}
        onAcceptAlternative={() => {}}
        onCatalogSelect={() => {}}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(/coincide con el código de sucursal previo/i)).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FieldDrawer
        open
        detail={nonFaField()}
        onClose={onClose}
        onAcceptAlternative={() => {}}
        onCatalogSelect={() => {}}
      />,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("filters the catalog search control by query text", async () => {
    const user = userEvent.setup();
    render(
      <FieldDrawer
        open
        detail={nonFaField()}
        onClose={() => {}}
        onAcceptAlternative={() => {}}
        onCatalogSelect={() => {}}
      />,
    );

    await user.type(screen.getByLabelText(/buscar en catálogo/i), "ark");

    expect(screen.queryByText("New York")).not.toBeInTheDocument();
    expect(screen.getByText("Newark")).toBeInTheDocument();
  });
});
