---
name: audit-dependencies
description:
  Perform a project‑agnostic dependency audit. Reads AGENTS.md for approved
  packages and license policies, then checks for outdated, unused, and insecure
  dependencies, as well as license compliance. Outputs a structured report ready
  for /create-todo.
---

## 1. Read project rules

- Locate and read the root `AGENTS.md` (or `agents.md`) file.
- Extract any dependency‑related rules, such as:
  - Approved or prohibited packages (e.g., "No `lodash`; use native methods",
    "Only `axios` for HTTP")
  - License restrictions (e.g., "Only MIT, Apache‑2.0, or BSD licenses allowed")
  - Required package manager (e.g., "Use `pnpm`", "Lock files must be
    committed")
  - Audit requirements (e.g., "Run `npm audit` before every push")
  - Any other supply‑chain policies.
- If no AGENTS.md exists, note this and proceed with generic best practices.

## 2. Discover the dependency manifest

- Identify all dependency manifests in the project (e.g., `package.json`,
  `requirements.txt`, `go.mod`, `Cargo.toml`, `Gemfile`, `composer.json`).
- Determine the package manager and the appropriate commands for listing,
  checking, and updating packages.
- For each manifest, extract the list of declared dependencies with their
  current pinned or ranged versions.

## 3. Check for outdated dependencies

- For each manifest, attempt to run the ecosystem‑specific outdated command:
  - **npm**: `npm outdated --json` (or `yarn outdated --json`,
    `pnpm outdated --json`)
  - **Python**: `pip list --outdated --format json`
  - **Rust**: `cargo update --dry-run` and parse changes
  - **Go**: `go list -u -m all` and parse output
  - **Ruby**: `bundle outdated --parseable`
  - **PHP**: `composer outdated --format json`
- If the command succeeds, parse the output and list any dependencies that are
  behind their latest compatible version.
- If the command fails, note the failure and mark dependency freshness as
  "unable to verify".
- **If AGENTS.md specifies approved packages**, cross‑check outdated packages:
  if an update would introduce a prohibited package version, flag that as a
  separate finding.

## 4. Check for unused dependencies

- Attempt to run an unused‑dependency detector if available:
  - **npm**: `npx depcheck --json` (or `npx unimported`)
  - **Python**: `pip‑check` or `deptry`
  - **Rust**: `cargo udeps`
  - **Go**: `go mod tidy -v` (dry‑run) and check for removed entries
  - **Ruby**: `bundler‑leak` or manual check
- If a tool is not available, Cascade can perform a manual check by:
  1. Listing all imports/requires in source files (excluding tests).
  2. Comparing those imports against the declared dependencies.
  3. Flagging any dependency that is never imported.
- Also check for unused development dependencies if a tool supports it.
- **If AGENTS.md restricts certain packages**, check if any unused dependency is
  on that prohibited list and flag it for removal.

## 5. Check for known vulnerabilities (if not already covered by `/audit-security`)

- This audit **complements** the security audit. It should focus on
  _non‑security_ dependency health. However, if the security audit hasn't been
  run, or if you want a quick check here, you can optionally:
  - For npm: `npm audit --json` and flag `high`/`critical` advisories.
  - For other ecosystems, note that vulnerability checking may require dedicated
    tooling and suggest running `/audit-security`.
- **If AGENTS.md mandates a specific audit command**, run it here; otherwise,
  leave vulnerability scanning to the security audit.

## 6. Check license compliance

- Extract the license information from each manifest, or from any `LICENSE`
  files present in the repository.
- For each dependency, attempt to find its license. For npm, licenses are often
  listed in the package metadata; for other ecosystems, you may need to read
  each package’s `LICENSE` file or package metadata.
- **If AGENTS.md specifies allowed licenses**, flag any dependency with a
  license that does not match the approved list.
- If no policy is set, but a dependency has a restrictive license (e.g., GPLv3,
  AGPL), flag it with severity `MEDIUM` and a note: "This license may restrict
  your project's distribution; verify compatibility."
- If license cannot be determined, flag with severity `LOW` and suggest manual
  verification.

## 7. Compile the report

- Group findings by category: **Outdated**, **Unused**, **License Issues**.
- For each finding, use the exact format:
  ```
  - `manifest‑file` **SEVERITY** | category/tag
    Description of the issue.
    **Fix**: Concrete, actionable suggestion.
  ```
  - Example:
    ```
    - `package.json` **MEDIUM** | dependencies/outdated
      `lodash` is version 4.17.19, latest is 4.17.21.
      **Fix**: Run `npm install lodash@latest` and verify tests pass.
    ```
- Severity: `HIGH` for critical outdated packages (major versions behind with
  breaking changes) or prohibited licenses; `MEDIUM` for outdated minor/patch or
  unused packages; `LOW` for unknown licenses.

## 8. Final summary

- Print total number of findings per severity.
- If zero findings: "No dependency issues found – nothing to do."
- If more than 20 findings, show the first 20 and note: "More findings exist.
  Consider fixing these first, then re‑run the audit."
