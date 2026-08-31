/**
 * Task 6.3 (spec review-ui — Live Batch Table Rendering) + task 6.12
 * (filter wiring): one row per code with BranchRep, Rep Name, FA(s), and
 * the eight resolution fields, filtered by status/onlyPending, selectable,
 * and opening the drawer via cell click.
 *
 * Issue #21 (spec fa-assignment — False-Company Detection Alert): the FA
 * cell renders the `FALSE_COMPANY_INDICATOR` when `faIndicatorsByCodeId`
 * carries the meta for that code, and renders the plain FA label
 * otherwise.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CodeEntry } from "../../domain/types.js";
import { FALSE_COMPANY_INDICATOR } from "../status-meta.js";
import { BatchTable } from "./BatchTable.js";

function field(value: string, status: "resolved" | "needs_confirm" | "needs_input" | "no_data") {
  return { value, status };
}

function makeCode(overrides: Partial<CodeEntry> = {}): CodeEntry {
  return {
    id: "code-1",
    branchRep: "0001-0002",
    repName: "Jane Doe",
    fields: {
      office: field("NY", "resolved"),
      country: field("US", "resolved"),
      region: field("NE", "resolved"),
      ibd: field("IBD1", "resolved"),
      nscc: field("NSCC1", "resolved"),
      origin: field("PERSHING", "resolved"),
      dealer: field("D1", "resolved"),
      agente: field("A1", "resolved"),
    },
    fa: [{ id: 1, name: "Acme Corp", state: "existente", status: "resolved" }],
    ...overrides,
  };
}

describe("BatchTable", () => {
  it("renders one row per code with BranchRep, Rep Name, FA, and the 8 fields", () => {
    render(
      <BatchTable
        codes={[makeCode()]}
        statusFilter={null}
        onlyPending={false}
        density="comfortable"
        selectedCodeId={null}
        onSelectRow={() => {}}
        onSelectField={() => {}}
      />,
    );

    const row = screen.getByRole("row", { name: /0001-0002/ });
    expect(within(row).getByText("Jane Doe")).toBeInTheDocument();
    expect(within(row).getByText("Acme Corp")).toBeInTheDocument();
    expect(within(row).getByText("NY")).toBeInTheDocument();
    expect(within(row).getByText("A1")).toBeInTheDocument();
  });

  it("filters out rows that do not match the active status filter", () => {
    const resolvedCode = makeCode({ id: "code-1", branchRep: "0001-0002" });
    const pendingCode = makeCode({
      id: "code-2",
      branchRep: "0003-0004",
      fields: { ...resolvedCode.fields, office: field("NY", "needs_confirm") },
    });

    render(
      <BatchTable
        codes={[resolvedCode, pendingCode]}
        statusFilter="needs_confirm"
        onlyPending={false}
        density="comfortable"
        selectedCodeId={null}
        onSelectRow={() => {}}
        onSelectField={() => {}}
      />,
    );

    expect(screen.queryByText("0001-0002")).not.toBeInTheDocument();
    expect(screen.getByText("0003-0004")).toBeInTheDocument();
  });

  it("'Sólo pendientes' hides fully-resolved rows", () => {
    const resolvedCode = makeCode({ id: "code-1", branchRep: "0001-0002" });
    const pendingCode = makeCode({
      id: "code-2",
      branchRep: "0003-0004",
      fields: { ...resolvedCode.fields, office: field("NY", "needs_input") },
    });

    render(
      <BatchTable
        codes={[resolvedCode, pendingCode]}
        statusFilter={null}
        onlyPending
        density="comfortable"
        selectedCodeId={null}
        onSelectRow={() => {}}
        onSelectField={() => {}}
      />,
    );

    expect(screen.queryByText("0001-0002")).not.toBeInTheDocument();
    expect(screen.getByText("0003-0004")).toBeInTheDocument();
  });

  it("clicking a field cell opens the drawer for that code+field", async () => {
    const user = userEvent.setup();
    const onSelectField = vi.fn();
    render(
      <BatchTable
        codes={[makeCode()]}
        statusFilter={null}
        onlyPending={false}
        density="comfortable"
        selectedCodeId={null}
        onSelectRow={() => {}}
        onSelectField={onSelectField}
      />,
    );

    await user.click(screen.getByText("NY"));

    expect(onSelectField).toHaveBeenCalledWith("code-1", "office");
  });

  it("marks the selected row and applies a comfortable/compact density class", () => {
    const { rerender } = render(
      <BatchTable
        codes={[makeCode()]}
        statusFilter={null}
        onlyPending={false}
        density="comfortable"
        selectedCodeId="code-1"
        onSelectRow={() => {}}
        onSelectField={() => {}}
      />,
    );
    let row = screen.getByRole("row", { name: /0001-0002/ });
    expect(row).toHaveAttribute("aria-selected", "true");
    expect(row).toHaveClass("batch-row--comfortable");

    rerender(
      <BatchTable
        codes={[makeCode()]}
        statusFilter={null}
        onlyPending={false}
        density="compact"
        selectedCodeId={null}
        onSelectRow={() => {}}
        onSelectField={() => {}}
      />,
    );
    row = screen.getByRole("row", { name: /0001-0002/ });
    expect(row).toHaveAttribute("aria-selected", "false");
    expect(row).toHaveClass("batch-row--compact");
  });

  describe("spec fa-assignment — False-Company Detection Alert (issue #21)", () => {
    it("renders the false-company indicator on the FA cell when faIndicatorsByCodeId carries it for that code", () => {
      render(
        <BatchTable
          codes={[makeCode()]}
          statusFilter={null}
          onlyPending={false}
          density="comfortable"
          selectedCodeId={null}
          onSelectRow={() => {}}
          onSelectField={() => {}}
          faIndicatorsByCodeId={{ "code-1": FALSE_COMPANY_INDICATOR }}
        />,
      );

      const row = screen.getByRole("row", { name: /0001-0002/ });
      const indicator = within(row).getByRole("note", { name: /empresa falsa/i });
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute("data-indicator-kind", "false-company-alert");
      // Distinct texture from the four status textures so it cannot be
      // mistaken for a field status badge.
      expect(indicator).toHaveAttribute("data-texture", "double-diagonal-stripes");
    });

    it("does not render the false-company indicator when faIndicatorsByCodeId is absent or empty", () => {
      const { rerender } = render(
        <BatchTable
          codes={[makeCode()]}
          statusFilter={null}
          onlyPending={false}
          density="comfortable"
          selectedCodeId={null}
          onSelectRow={() => {}}
          onSelectField={() => {}}
        />,
      );

      expect(screen.queryByRole("note", { name: /empresa falsa/i })).not.toBeInTheDocument();

      rerender(
        <BatchTable
          codes={[makeCode()]}
          statusFilter={null}
          onlyPending={false}
          density="comfortable"
          selectedCodeId={null}
          onSelectRow={() => {}}
          onSelectField={() => {}}
          faIndicatorsByCodeId={{}}
        />,
      );

      expect(screen.queryByRole("note", { name: /empresa falsa/i })).not.toBeInTheDocument();
    });

    it("only renders the indicator for codes present in faIndicatorsByCodeId, not for every row", () => {
      const matched = makeCode({ id: "matched", branchRep: "0001-0002" });
      const untouched = makeCode({
        id: "untouched",
        branchRep: "0003-0004",
        fa: [{ id: 2, name: "Vontobel", state: "existente", status: "resolved" }],
      });

      render(
        <BatchTable
          codes={[matched, untouched]}
          statusFilter={null}
          onlyPending={false}
          density="comfortable"
          selectedCodeId={null}
          onSelectRow={() => {}}
          onSelectField={() => {}}
          faIndicatorsByCodeId={{ matched: FALSE_COMPANY_INDICATOR }}
        />,
      );

      expect(
        within(screen.getByRole("row", { name: /0001-0002/ })).getByRole("note", {
          name: /empresa falsa/i,
        }),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole("row", { name: /0003-0004/ })).queryByRole("note", {
          name: /empresa falsa/i,
        }),
      ).not.toBeInTheDocument();
    });
  });
});
