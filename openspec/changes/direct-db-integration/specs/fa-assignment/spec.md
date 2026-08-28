# Delta for fa-assignment (`fa-assignment`)

## ADDED Requirements

### Requirement: FA Existing/New Resolution Modes

The system MUST support resolving a code's FA through three modes: (1) selecting a suggested alternative, (2) referencing an existing FA by Id, and (3) registering a new FA (type Persona, Empresa, or Sin identificar).

#### Scenario: User assigns an existing FA by Id

- GIVEN a code with an unresolved FA field
- WHEN the user opens "Cambiar FA" and enters an existing FA Id
- THEN the field is marked as resolved to that FA
- AND the change is visually marked as an override

#### Scenario: User registers a new FA

- GIVEN a code needing a new FA
- WHEN the user selects "Alta nueva", provides a name, and selects a type (Persona/Empresa/Sin identificar)
- THEN the code's FA field is set to a pending-new-FA state carrying that name and type
- AND the write preview reflects a new-FA record alongside the code assignment

### Requirement: Alternatives and Discarded-Candidate Reactivation

The system MUST present suggested FA alternatives per code and MUST allow the user to reactivate a previously discarded FA candidate.

#### Scenario: Reactivating a discarded candidate

- GIVEN a code with at least one discarded FA candidate
- WHEN the user selects the discarded candidate for reactivation
- THEN that candidate becomes an assignable alternative for the code
- AND it is no longer shown in the discarded list

### Requirement: Same Branch+Rep Implies Same FA

When two or more codes in a batch share the same BranchRep value, the system MUST present the same FA (or FA set) as the default suggestion for all of them.

#### Scenario: Shared BranchRep proposes a consistent FA

- GIVEN two codes in the same batch with identical BranchRep values
- WHEN one code's FA is resolved to a specific FA
- THEN the other code with the same BranchRep is suggested that same FA by default

### Requirement: Format-Specific Resolution Rules

The system MUST apply Pershing- and UBS-specific formatting rules when interpreting BranchRep and related fields for codes originating from those sources.

#### Scenario: Pershing-format BranchRep is parsed correctly

- GIVEN a code whose Origin indicates a Pershing source
- WHEN the system evaluates its BranchRep value
- THEN the Pershing-specific parsing rule is applied instead of the generic default

### Requirement: False-Company Detection Alert

The system MUST flag a code with a visible alert when its Agente or FA name matches a known false-company pattern.

#### Scenario: False-company pattern triggers an alert

- GIVEN a code whose Agente/FA name matches a false-company heuristic
- WHEN the code is rendered
- THEN a visible alert is attached to that code, distinct from ordinary status indicators

### Requirement: Generic Unidentified Placeholder

The system MUST support assigning a generic `-Unidentified` placeholder value to a field or FA when no specific match can be determined, and MUST mark it distinctly from a normally resolved value.

#### Scenario: Field resolved to generic placeholder

- GIVEN a field with no confident match
- WHEN the user accepts the `-Unidentified` placeholder
- THEN the field status becomes `resolved` but visually marked as a generic/placeholder resolution

### Requirement: Override Marking and Restore

The system MUST visually mark any field or FA whose value was manually changed from the suggested value, and MUST offer a "restore suggestion" action.

#### Scenario: Editing a field marks it and allows restore

- GIVEN a field currently showing its originally suggested value
- WHEN the user changes it to a different value
- THEN the field displays an "edited" marker
- AND a "restore suggestion" action reverts it to the original suggested value

## Key Learnings

1. FA assignment supports three resolution modes: alternative selection, existing-by-Id, and new-FA registration.
2. The "same Branch+Rep implies same FA" rule and Pershing/UBS format rules are PRD v5 business rules carried forward unchanged.
