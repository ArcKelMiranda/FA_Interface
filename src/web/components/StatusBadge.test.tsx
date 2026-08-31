/**
 * Task 6.4 (spec review-ui — Accessibility-Safe Status Encoding): every
 * status renders a distinct glyph AND a distinct `data-texture` attribute,
 * not just a distinct color — so status stays identifiable in grayscale.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./StatusBadge.js";

describe("StatusBadge", () => {
  it("renders the resolved status with its glyph and texture", () => {
    render(<StatusBadge status="resolved" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("✓");
    expect(badge).toHaveAttribute("data-texture", "solid");
  });

  it("renders needs_confirm with a distinct glyph and texture from resolved", () => {
    render(<StatusBadge status="needs_confirm" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("!");
    expect(badge).toHaveAttribute("data-texture", "diagonal-stripes");
  });

  it("gives every one of the four statuses a unique texture attribute", () => {
    const statuses = ["resolved", "needs_confirm", "needs_input", "no_data"] as const;
    const textures = new Set<string>();
    for (const status of statuses) {
      const { unmount } = render(<StatusBadge status={status} />);
      const texture = screen.getByRole("status").getAttribute("data-texture");
      expect(texture).not.toBeNull();
      textures.add(texture as string);
      unmount();
    }
    expect(textures.size).toBe(4);
  });

  it("includes an accessible label naming the status, not color alone", () => {
    render(<StatusBadge status="no_data" />);
    expect(screen.getByRole("status")).toHaveAccessibleName(/sin datos/i);
  });
});
