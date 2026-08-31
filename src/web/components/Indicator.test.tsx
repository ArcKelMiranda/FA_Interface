/**
 * Issue #21 — `Indicator` component renders non-status state markers
 * (False-Company Detection Alert + Generic Unidentified Placeholder) with
 * the accessibility-safe encoding (texture + glyph + label, NOT
 * color-only). Texture + `data-indicator-kind` are stable hooks for tests
 * and assistive tech.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  FALSE_COMPANY_INDICATOR,
  GENERIC_PLACEHOLDER_INDICATOR,
} from "../status-meta.js";
import { Indicator } from "./Indicator.js";

describe("Indicator", () => {
  it("renders the meta label, glyph, and a distinct non-color texture for the False-Company Detection Alert", () => {
    render(<Indicator meta={FALSE_COMPANY_INDICATOR} />);
    const indicator = screen.getByRole("note", { name: /empresa falsa/i });
    expect(indicator).toHaveAttribute("data-indicator-kind", "false-company-alert");
    expect(indicator).toHaveAttribute("data-texture", "double-diagonal-stripes");
    expect(indicator).toHaveTextContent("\u26A0");
  });

  it("renders the meta label, glyph, and a distinct non-color texture for the Generic Unidentified Placeholder", () => {
    render(<Indicator meta={GENERIC_PLACEHOLDER_INDICATOR} />);
    const indicator = screen.getByRole("note", { name: /genérico/i });
    expect(indicator).toHaveAttribute("data-indicator-kind", "generic-placeholder");
    expect(indicator).toHaveAttribute("data-texture", "cross-hatch");
    expect(indicator).toHaveTextContent("—");
  });

  it("uses a texture distinct from the four status textures (issue #21 — must never be mistaken for a field status)", () => {
    const statusTextures = new Set([
      "solid",
      "diagonal-stripes",
      "dotted-border",
      "horizontal-hatch",
    ]);
    for (const meta of [FALSE_COMPANY_INDICATOR, GENERIC_PLACEHOLDER_INDICATOR]) {
      expect(statusTextures.has(meta.texture)).toBe(false);
    }
  });
});
