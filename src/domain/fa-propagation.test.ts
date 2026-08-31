import { describe, expect, it } from "vitest";
import { propagateFaByBranchRep, type BranchRepFaAssignment } from "./fa-propagation.js";

describe("propagateFaByBranchRep", () => {
  it("suggests the resolved FA to an unresolved code with the same BranchRep", () => {
    const entries: BranchRepFaAssignment[] = [
      { id: "c1", branchRep: "1234-5678", resolvedFaId: 42 },
      { id: "c2", branchRep: "1234-5678", resolvedFaId: null },
    ];

    expect(propagateFaByBranchRep(entries)).toEqual({ c1: 42, c2: 42 });
  });

  it("does not propagate across different BranchRep groups", () => {
    const entries: BranchRepFaAssignment[] = [
      { id: "c1", branchRep: "1234-5678", resolvedFaId: 42 },
      { id: "c2", branchRep: "AB01-99", resolvedFaId: null },
    ];

    expect(propagateFaByBranchRep(entries)).toEqual({ c1: 42, c2: null });
  });

  it("leaves a group with no resolved FA entirely unsuggested", () => {
    const entries: BranchRepFaAssignment[] = [
      { id: "c1", branchRep: "1234-5678", resolvedFaId: null },
      { id: "c2", branchRep: "1234-5678", resolvedFaId: null },
    ];

    expect(propagateFaByBranchRep(entries)).toEqual({ c1: null, c2: null });
  });
});
