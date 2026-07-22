---
name: audit-hygiene
description:
  Perform a project‑agnostic repository hygiene audit. Reads AGENTS.md for
  repo‑level policies, then checks for large files, missing .gitignore entries,
  missing license, and other common housekeeping gaps. Outputs a structured
  report ready for /create-todo.
---

## 1. Read project rules

- Locate and read the root `AGENTS.md` (or `agents.md`) file.
- Extract any hygiene‑related rules, such as:
  - Files that must always be in `.gitignore` (e.g., `*.log`, `.DS_Store`,
    `.env`)
  - Required repository files (e.g., `LICENSE`, `CONTRIBUTING.md`,
    `CHANGELOG.md`)
  - Maximum allowed file sizes (e.g., "No file larger than 1 MB in the
    repository")
  - Rules about generated files (e.g., "Generated code must be in `generated/`
    and .gitignored")
  - Any other housekeeping policies.
- If no AGENTS.md exists, note this and proceed with generic best practices.

## 2. Discover the repository layout

- Confirm you are in a git repository.
- List top‑level files and directories.
- Note the presence/absence of:
  - `.gitignore`
  - `LICENSE`
  - `README.md` (or similar)
  - Any other common repository‑level config files.

## 3. Check for large files

- Find the 10 largest tracked files:
  `git ls-files -z | xargs -0 ls -l | sort -nrk5 | head -10`
- Flag any file larger than 1 MB (or the limit from AGENTS.md) as potentially
  problematic.
- For binary files (images, compiled assets), check if they should be tracked or
  replaced with alternatives (e.g., Git LFS).
- For text files, note their size and consider whether they are auto‑generated
  and should be in .gitignore.

## 4. Verify .gitignore coverage

- Ensure `.gitignore` exists; if not, flag as HIGH severity.
- Check for the presence of common temporary/build directories that should be
  ignored:
  - `node_modules/`, `__pycache__/`, `*.pyc`, `.DS_Store`, `dist/`, `build/`,
    `target/`, `*.log`, `.env`
- Run `git ls-files --others --exclude-standard` to see untracked files; if any
  of the above patterns appear (meaning they are not ignored and likely should
  be), flag them.
- If AGENTS.md lists specific entries that must be in `.gitignore`, verify each
  one is present; if missing, flag.

## 5. Check for essential repository files

- **LICENSE**: if missing, flag with severity MEDIUM. Note that without a
  license, others may not legally use the code.
- **README.md**: if missing, flag with severity LOW (you are a solo dev, but a
  README helps when returning to a project after time away).
- **CONTRIBUTING.md** or **CHANGELOG.md**: only check if mandated by AGENTS.md;
  otherwise ignore.

## 6. Look for other hygiene issues

- **Sensitive files accidentally tracked**: check for `.env`, `.secrets`,
  `credentials.*` that are tracked but not in `.gitignore`. (Overlaps with
  security audit; here focus on the hygiene aspect of keeping the repo clean.)
- **Empty directories**: not typically a problem, but if there are many empty
  directories, note it.
- **Outdated or leftover generated files**: if there's a `generated/` or `dist/`
  directory that contains files that look stale (much older than source files),
  flag as potential cleanup.
- **Multiple lock files** (e.g., both `package-lock.json` and `yarn.lock`): flag
  as inconsistency.

## 7. Compile the report

- Group findings by category: **Large Files**, **Missing .gitignore Entries**,
  **Missing Essential Files**, **General Cleanup**.
- For each finding, use the exact format:
  ```
  - `relative/path` **SEVERITY** | category/tag
    Description of the issue.
    **Fix**: Concrete, actionable suggestion.
  ```
  - Example:
    ```
    - `.gitignore` **HIGH** | repo-hygiene/missing-gitignore-entry
      `node_modules/` is not in .gitignore and should be.
      **Fix**: Add `node_modules/` to .gitignore.
    ```
- Severity: `HIGH` for missing .gitignore entirely, tracked sensitive files;
  `MEDIUM` for large files that might slow the repo, missing LICENSE, critical
  .gitignore gaps; `LOW` for minor cleanup and optional files.

## 8. Final summary

- Print total number of findings per severity.
- If zero findings: "No repository hygiene issues found – your repo looks
  clean."
- If more than 20 findings, show the first 20 and note: "More findings exist.
  Consider fixing these first, then re‑run the audit."
