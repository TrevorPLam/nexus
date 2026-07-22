---
name: audit-code
description:
  Perform a project‑agnostic code health audit. Reads AGENTS.md for custom
  quality rules, then checks for overly long files, deep nesting, dead code,
  duplicated code, and missing linting/formatting. Outputs a structured report
  ready for /create-todo.
---

## 1. Read project rules

- Locate and read the root `AGENTS.md` (or `agents.md`) file.
- Extract any code‑health‑related rules, such as:
  - Maximum file length (e.g., "Files should not exceed 300 lines")
  - Maximum function length (e.g., "Functions should be under 40 lines")
  - Nesting depth limits (e.g., "No more than 3 levels of indentation")
  - Code style preferences (e.g., "Use early returns", "No commented‑out code",
    "Prefer named exports")
  - Required linters or formatters (e.g., "ESLint with airbnb config", "Prettier
    with single quotes")
  - Any other quality directives.
- If no AGENTS.md exists, note this and proceed with generic best‑practice
  heuristics.

## 2. Discover the codebase

- Identify primary language(s) and frameworks.
- Check for configured linters: look for `.eslintrc.*`, `.prettierrc`,
  `pylintrc`, `flake8`, `clippy.toml`, etc.
- Check for configured formatters: `prettier.config.*`, `.editorconfig`,
  `rustfmt.toml`, etc.
- Determine the package manager and how to run tools (e.g., `npx`, `pip`,
  `cargo`).

## 3. Run configured linters (if available)

- For each linter found:
  - Attempt to run it on the entire project (e.g., `npx eslint . --format json`,
    `flake8 .`, `cargo clippy --message-format json`).
  - If the command fails (missing dependencies, config error), note the failure
    and continue with heuristic checks only.
  - If successful, parse the output and extract only **errors** and
    **high‑severity warnings**. Ignore stylistic nitpicks unless they violate an
    AGENTS.md rule.
- **If AGENTS.md requires a specific linter config**, verify that it is present
  and correctly named; if not, flag the missing config.

## 4. Run configured formatters in check mode (if available)

- For each formatter found:
  - Run it in dry‑run/check mode (e.g., `npx prettier --check .`,
    `cargo fmt --check`).
  - If files are not formatted, flag them and note how many files need
    formatting.

## 5. Heuristic checks (always run)

These provide a safety net for projects without configured tools, and catch
issues that linters may miss.

- **Long files**: `git ls-files | xargs wc -l | sort -nr | head -20`
  - Flag any file that exceeds the AGENTS.md limit, or 400 lines if no limit is
    defined.
- **Deep nesting**: search for lines with 4+ levels of indentation (4+ tabs or
  16+ spaces). Cascade can examine these files and identify deeply nested
  blocks. Flag any that appear to be business logic (not data structures or
  templates).
- **Dead code**:
  - Search for commented‑out code:
    `git grep -E '^\s*//|^\s*#' -- '*.{ts,js,py,go,rs}'` and inspect matches for
    code patterns (function definitions, loops, return statements). Flag likely
    dead code.
  - Search for unused imports: if the linter did not already report them,
    Cascade can attempt a manual check by comparing imported symbols with their
    usage in the file. Flag any unused imports.
- **Duplicated code**:
  - For each file flagged as long, ask Cascade to scan for repeated 5+ line
    blocks that appear twice or more. Flag as duplicated code if found.
  - This is a best‑effort check; note that it is not exhaustive.

## 6. Compile the report

- Group findings by category: **Linter Errors**, **Formatting Issues**,
  **Structural Smells**, **Dead Code**, **Duplicated Code**.
- For each finding, use the exact format:
  ```
  - `relative/path:line` **SEVERITY** | category/tag
    Description of the issue.
    **Fix**: Concrete, actionable suggestion.
  ```
  - Example:
    ```
    - `src/components/OldDashboard.tsx:1` **LOW** | code-health/dead-code
      Entire file appears to be commented‑out legacy code.
      **Fix**: Remove the file if no longer needed, or restore and refactor.
    ```
- If an AGENTS.md rule was violated, mention the rule.
- Sort by severity: `HIGH` for linter errors, `MEDIUM` for
  structural/duplication issues, `LOW` for dead code and minor formatting.

## 7. Final summary

- Print total number of findings per severity.
- If zero findings: "No code health issues found – nothing to do."
- If more than 20 findings, show the first 20 and note: "More findings exist.
  Consider fixing these first, then re‑run the audit."
