import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { QUERY_ENTITIES_TOOL_NAME } from "./yhat-client.js";

// design.md Threat Matrix: "facodes MUST validate [entity-query params] with
// Zod ... and MUST NOT expose `yhat_query` (raw SQL, admin-only) to the UI."
// facodes has no admin-only module yet, so the allowlist below is
// deliberately empty — every source file is UI-facing at this phase.
const ALLOWED_ADMIN_PATHS: readonly string[] = [];

const SRC_ROOT = join(process.cwd(), "src");
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const TEST_FILE_PATTERN = /\.test\.(ts|tsx)$/;
const RAW_SQL_ADMIN_TOOL_PATTERN = /\byhat_query\b/;

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "__fixtures__") continue;
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (SOURCE_FILE_PATTERN.test(entry) && !TEST_FILE_PATTERN.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("admin tool boundary (design.md Threat Matrix)", () => {
  it("never references the raw-SQL admin tool `yhat_query` in non-admin source code", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_ROOT)) {
      if (ALLOWED_ADMIN_PATHS.some((allowed) => file.includes(allowed))) continue;
      const code = stripComments(readFileSync(file, "utf8"));
      if (RAW_SQL_ADMIN_TOOL_PATTERN.test(code)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the MCP client's only callable tool name is the entity-query tool", () => {
    expect(QUERY_ENTITIES_TOOL_NAME).toBe("yhat_query_entities");
  });
});
