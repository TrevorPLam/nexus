---
name: audit-tests
description:
  Perform a project‑agnostic testing audit. Reads AGENTS.md for testing
  standards, then evaluates test presence, coverage, and quality. Outputs a
  structured report ready for /create-todo.
---

## 1. Read project rules

- Locate and read the root `AGENTS.md` (or `agents.md`) file.
- Extract any testing‑related rules, such as:
  - Required test frameworks (e.g., "All tests must use Jest", "Use pytest with
    fixtures")
  - Coverage thresholds (e.g., "Branch coverage must be ≥ 80%", "Every new
    module must have tests")
  - Required test types (e.g., "Unit tests for all services, integration tests
    for API endpoints")
  - Test file conventions (e.g., "Tests live next to source files as
    `*.test.ts`", "All test files in `tests/`")
  - Rules about test quality (e.g., "No empty tests", "Assertions must be
    specific")
  - Any other testing policies.
- If no AGENTS.md exists, note this and proceed with generic best practices.

## 2. Discover test infrastructure

- Identify primary language(s) and frameworks.
- Locate existing test files and directories (look for `*.test.*`, `*_test.*`,
  `*Spec.*`, `spec/`, `tests/`, `__tests__/`).
- Detect the test framework by examining configuration files (e.g.,
  `jest.config.*`, `pytest.ini`, `.rspec`, `Cargo.toml` with
  `[dev-dependencies]`, `go test` patterns).
- Determine if a coverage tool is configured (e.g., `jest --coverage`,
  `pytest-cov`, `cargo-tarpaulin`, `coverage.py`).

## 3. Assess test presence

- Compute the ratio: number of test files to source files (excluding static
  assets, configuration, and generated code).
- Flag if the ratio is below 20% (or the threshold specified in AGENTS.md).
- List all source files that do not have a corresponding test file based on
  naming conventions (e.g., `src/auth.ts` but no `src/auth.test.ts` or
  `tests/auth_test.py`).
- If there are **zero tests** in the entire project, report this as a `HIGH`
  severity finding: the most critical gap.

## 4. Measure test coverage (if tool available)

- If a coverage tool is detected, run it (e.g., `jest --coverage`,
  `pytest --cov=. --cov-report=term`, `cargo tarpaulin --out Json`).
- Parse the coverage summary and extract:
  - Overall line coverage percentage
  - Overall branch coverage percentage (if available)
  - Files with coverage below the AGENTS.md threshold, or below 80% if no
    threshold is defined.
- If the coverage command fails, note the failure and skip numerical coverage;
  instead, rely on the file‑level presence check from step 3.

## 5. Assess test quality

- Search for empty or trivial tests:
  - Empty blocks: `it('...', () => {})`, `test('...', () => {})`,
    `def test_...(): pass`, `#[test] fn ...() {}` with no body.
  - Trivial assertions: `assert(true)`, `expect(true).toBe(true)`,
    `assert 1 == 1`.
- Flag any such tests as poor quality, with a suggestion to add meaningful
  assertions.
- Scan test files for excessive mocking: if a test file mocks more than 3
  different modules, note that it may be too coupled to implementation details.
- If AGENTS.md specifies particular test patterns (e.g., "Use given‑when‑then",
  "Each test should have a single assertion"), verify them here if feasible.

## 6. Compile the report

- Group findings by category: **Missing Tests**, **Low Coverage**, **Poor Test
  Quality**.
- For each finding, use the exact format:
  ```
  - `relative/path` **SEVERITY** | category/tag
    Description of the issue.
    **Fix**: Concrete, actionable suggestion.
  ```
  - Example:
    ```
    - `src/utils/helpers.ts` **HIGH** | tests/missing
      No corresponding test file exists.
      **Fix**: Create `src/utils/helpers.test.ts` with unit tests covering all exported functions.
    ```
- Severity: `HIGH` for missing tests in critical-looking modules, zero tests
  project‑wide, or coverage far below threshold; `MEDIUM` for missing tests in
  utility modules or moderate coverage gaps; `LOW` for minor test quality
  issues.

## 7. Final summary

- Print total number of findings per severity.
- If zero findings: "No testing issues found – your project looks well‑tested."
- If more than 20 findings, show the first 20 and note: "More findings exist.
  Consider fixing these first, then re‑run the audit."
