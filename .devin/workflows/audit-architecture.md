---
name: audit-architecture
description:
  Perform a project‑agnostic architecture audit. Reads AGENTS.md for layering
  rules and module conventions, then checks for circular dependencies, import
  bloat, layer violations, and deep module design issues. Outputs a structured
  report ready for /create-todo.
---

## 1. Read project rules

- Locate and read the root `AGENTS.md` (or `agents.md`) file.
- Extract any architecture‑related rules, such as:
  - Layer definitions and allowed dependencies (e.g., "`services/` may import
    from `repositories/` but not from `routes/`")
  - Module conventions (e.g., "Each feature exports a single barrel file from
    `index.ts`")
  - Maximum number of imports per file (e.g., "No file should import more than
    10 other modules")
  - Rules about circular dependencies (e.g., "No circular dependencies allowed,
    except within `common/`")
  - Any other structural constraints.
- If no AGENTS.md exists, note this and proceed with generic structural
  heuristics.

## 2. Discover the codebase structure

- Identify the primary language(s) and framework(s).
- Map the top‑level directory tree, noting directories that typically imply
  architectural layers:
  - `components/`, `pages/`, `views/` (UI)
  - `services/`, `controllers/`, `routes/` (business logic / API)
  - `repositories/`, `models/`, `data/` (data access)
  - `utils/`, `helpers/`, `lib/`, `common/` (shared utilities)
- List all import/require statement patterns in use (e.g., `import ... from`,
  `require(...)`).
- Determine whether TypeScript path aliases or similar module resolution
  shortcuts are configured (look for `tsconfig.json`, `jsconfig.json`,
  `webpack.config.js`, etc.).

## 3. Check for circular dependencies

- Using the import statements collected, construct a lightweight dependency
  graph. Cascade can analyse moderate codebases file‑by‑file; for large
  repositories, sample the most‑imported files.
- Identify any pair of files that both import from each other, either directly
  or indirectly through an intermediary chain.
- Flag all circular dependencies found.
- **If AGENTS.md has a rule about allowed circular dependencies**, check each
  finding against that rule; only flag those that violate it.

## 4. Check for import bloat (high coupling)

- Count the number of distinct imports in each file (excluding standard library
  / built‑in modules).
- Flag any file with more than **10** imports, or the limit defined in
  AGENTS.md.
- For each flagged file, note the number of imports and briefly describe what
  the file likely does (based on name and location). High import count often
  signals a “God object” that knows too much.

## 5. Check for layer violations

- If AGENTS.md defines layering rules, use them. If not, but the directory
  structure suggests typical layering (e.g., `components/`, `services/`,
  `utils/`), Cascade can infer reasonable default rules:
  - `utils/` files should not import from `components/` or `services/`.
  - `services/` should not import from `routes/` or `controllers/`.
  - `components/` should not import from `services/` directly if a
    state‑management layer exists.
- Scan imports that cross these inferred boundaries and flag them. For each,
  explain why it looks like a potential violation.
- If no layering rules are present and the structure is flat, skip this section.

## 6. Check for shallow modules (optional)

- This checks whether modules have a clean public API. For each file that
  exports more than 5 symbols (functions, classes, variables), flag it as
  potentially “shallow” — exposing too much internal detail.
- If AGENTS.md specifies a maximum number of exports per module, use that
  threshold.
- If a barrel file (`index.ts` / `index.js`) exists but only re‑exports
  everything, flag it as a missed opportunity to curate the public API.

## 7. Compile the report

- Group findings by category: **Circular Dependencies**, **Import Bloat**,
  **Layer Violations**, **Shallow Modules**.
- For each finding, use the exact format:
  ```
  - `relative/path:line` **SEVERITY** | category/tag
    Description of the issue.
    **Fix**: Concrete, actionable suggestion.
  ```
  - Example:
    ```
    - `src/services/auth.ts:1` → `src/utils/http.ts:1` **HIGH** | architecture/circular-dependency
      Mutual imports between auth service and http utility.
      **Fix**: Extract shared code into a new `common/http-helpers.ts` and import it from both.
    ```
- Severity: `HIGH` for circular deps, `MEDIUM` for layer violations and severe
  import bloat, `LOW` for shallow modules and minor bloat.

## 8. Final summary

- Print total number of findings per severity.
- If zero findings: "No architecture issues found – nothing to do."
- If more than 20 findings, show the first 20 and note: "More findings exist.
  Consider fixing these first, then re‑run the audit."
