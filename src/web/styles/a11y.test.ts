/**
 * Regression guard (issue #24, testing/ui): the 44x44px touch-target CSS
 * rule for `.fingerprint-tick` below the 768px mobile breakpoint
 * (`src/web/styles/tokens.css`) is enforced by visual review only because
 * jsdom doesn't evaluate media queries. This test reads the file from
 * disk and asserts the rule's key facts so accidental deletion or typo
 * (wrong breakpoint, missing `!important`, dimensions changed) breaks
 * CI instead of slipping through to a tablet regression.
 *
 * The expected block (verbatim from tokens.css lines 109-117):
 *
 *   @media (max-width: 767px) {
 *     .fingerprint-tick {
 *       width: 44px !important;
 *       height: 44px !important;
 *     }
 *   }
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const tokensCssPath = fileURLToPath(new URL("./tokens.css", import.meta.url));

function readTokensCss(): string {
  return readFileSync(tokensCssPath, "utf8");
}

/**
 * Locates the `@media (max-width: 767px) { .fingerprint-tick { ... } }`
 * block. Returns the inner body of the media query when found, or null
 * when the block is absent or structurally broken.
 */
function extractFingerprintTickBlock(css: string): string | null {
  const mediaOpen = css.indexOf("@media (max-width: 767px)");
  if (mediaOpen < 0) {
    return null;
  }
  const braceOpen = css.indexOf("{", mediaOpen);
  if (braceOpen < 0) {
    return null;
  }
  let depth = 1;
  let cursor = braceOpen + 1;
  while (cursor < css.length && depth > 0) {
    const ch = css[cursor];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return css.slice(braceOpen + 1, cursor);
      }
    }
    cursor += 1;
  }
  return null;
}

describe("44x44 touch-target breakpoint rule (src/web/styles/tokens.css)", () => {
  const css = readTokensCss();
  const block = extractFingerprintTickBlock(css);

  it("contains the @media (max-width: 767px) block", () => {
    expect(block).not.toBeNull();
  });

  it("targets the .fingerprint-tick selector inside the mobile media query", () => {
    expect(block).not.toBeNull();
    expect(block ?? "").toMatch(/\.fingerprint-tick\s*\{/);
  });

  it("enforces a 44x44px hit area with !important preserved on both axes", () => {
    expect(block).not.toBeNull();
    const body = block ?? "";
    expect(body).toMatch(/width:\s*44px\s*!important/);
    expect(body).toMatch(/height:\s*44px\s*!important/);
  });
});
