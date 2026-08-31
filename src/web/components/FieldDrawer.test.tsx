/**
 * Task 6.6 (spec review-ui — Per-Field Drawer): opens on cell/fingerprint
 * click, `role="dialog" aria-modal="true"`, Escape closes without losing
 * table state, shows current value/evidence/precedent-codes/alternatives,
 * and a catalog search control for non-FA fields.
 *
 * Issue #21 (spec fa-assignment — Generic Unidentified Placeholder): the
 * header renders the `GENERIC_PLACEHOLDER_INDICATOR` when
 * `detail.headerIndicator` carries it, and renders only the field label
 * otherwise.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GENERIC_PLACEHOLDER_INDICATOR } from "../status-meta.js";
import { FieldDrawer, type DrawerReference, type NonFaFieldDetail } from "./FieldDrawer.js";

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

function sampleReference(): DrawerReference {
  return {
    title: "Tabla de sucursales previas",
    description: "Coincidencias encontradas en lotes anteriores.",
    columns: ["branchRep", "repName", "office"],
    rows: [
      { branchRep: "1234/5678", repName: "Doe, J.", office: "NY" },
      { branchRep: "1234/5679", repName: "Roe, R.", office: "NY" },
    ],
    footnote: "Fuente: lote 42",
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

  it("renders OverrideMarker with the 'Editado' badge and a restore button when detail.isOverride is true and onRestore is provided", () => {
    render(
      <FieldDrawer
        open
        detail={{ ...nonFaField(), isOverride: true }}
        onClose={() => {}}
        onAcceptAlternative={() => {}}
        onCatalogSelect={() => {}}
        onRestore={() => {}}
      />,
    );

    expect(screen.getByText(/editado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restaurar sugerencia/i })).toBeInTheDocument();
  });

  it("does not render the OverrideMarker UI when detail.isOverride is false", () => {
    render(
      <FieldDrawer
        open
        detail={{ ...nonFaField(), isOverride: false }}
        onClose={() => {}}
        onAcceptAlternative={() => {}}
        onCatalogSelect={() => {}}
        onRestore={() => {}}
      />,
    );

    expect(screen.queryByText(/editado/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restaurar sugerencia/i })).not.toBeInTheDocument();
  });

  it("invokes onRestore when the user clicks 'Restaurar sugerencia' inside the OverrideMarker", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(
      <FieldDrawer
        open
        detail={{ ...nonFaField(), isOverride: true }}
        onClose={() => {}}
        onAcceptAlternative={() => {}}
        onCatalogSelect={() => {}}
        onRestore={onRestore}
      />,
    );

    await user.click(screen.getByRole("button", { name: /restaurar sugerencia/i }));

    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  describe("precedent codes (CodeEntry.references)", () => {
    it("renders the references section with a table, title, description, and footnote when references are present", () => {
      const ref = sampleReference();
      render(
        <FieldDrawer
          open
          detail={{ ...nonFaField(), references: [ref] }}
          onClose={() => {}}
          onAcceptAlternative={() => {}}
          onCatalogSelect={() => {}}
        />,
      );

      const section = screen.getByRole("region", { name: /códigos precedentes/i });
      expect(section).toBeInTheDocument();
      expect(within(section).getByText(ref.title)).toBeInTheDocument();
      expect(within(section).getByText(ref.description)).toBeInTheDocument();
      expect(within(section).getByText(ref.footnote ?? "")).toBeInTheDocument();

      for (const col of ref.columns) {
        expect(within(section).getByRole("columnheader", { name: col })).toBeInTheDocument();
      }
      // Header row + 2 data rows
      const rows = within(section).getAllByRole("row");
      expect(rows).toHaveLength(1 + ref.rows.length);
      // Spot-check a unique cell value (the duplicated "NY" would trip
      // getByText, so use a branchRep value that appears only once).
      expect(within(section).getByText("1234/5678")).toBeInTheDocument();
      expect(within(section).getByText("Roe, R.")).toBeInTheDocument();
    });

    it("does not render the precedent-codes section when references is omitted", () => {
      render(
        <FieldDrawer
          open
          detail={nonFaField()}
          onClose={() => {}}
          onAcceptAlternative={() => {}}
          onCatalogSelect={() => {}}
        />,
      );

      expect(screen.queryByRole("region", { name: /códigos precedentes/i })).not.toBeInTheDocument();
    });

    it("does not render the precedent-codes section when references is an empty array", () => {
      render(
        <FieldDrawer
          open
          detail={{ ...nonFaField(), references: [] }}
          onClose={() => {}}
          onAcceptAlternative={() => {}}
          onCatalogSelect={() => {}}
        />,
      );

      expect(screen.queryByRole("region", { name: /códigos precedentes/i })).not.toBeInTheDocument();
    });
  });

  describe("spec fa-assignment — Generic Unidentified Placeholder (issue #21)", () => {
    it("renders the generic-placeholder indicator on the field header when detail.headerIndicator carries it", () => {
      render(
        <FieldDrawer
          open
          detail={{ ...nonFaField(), headerIndicator: GENERIC_PLACEHOLDER_INDICATOR }}
          onClose={() => {}}
          onAcceptAlternative={() => {}}
          onCatalogSelect={() => {}}
        />,
      );

      const dialog = screen.getByRole("dialog");
      const indicator = within(dialog).getByRole("note", { name: /genérico/i });
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute("data-indicator-kind", "generic-placeholder");
      // Distinct texture from the four status textures so it cannot be
      // mistaken for a field status badge.
      expect(indicator).toHaveAttribute("data-texture", "cross-hatch");
    });

    it("does not render the generic-placeholder indicator when detail.headerIndicator is absent", () => {
      render(
        <FieldDrawer
          open
          detail={nonFaField()}
          onClose={() => {}}
          onAcceptAlternative={() => {}}
          onCatalogSelect={() => {}}
        />,
      );

      expect(screen.queryByRole("note", { name: /genérico/i })).not.toBeInTheDocument();
    });
  });
});
