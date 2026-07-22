---
name: audit-security
description:
  Perform a project‑agnostic security audit. Reads AGENTS.md for custom security
  rules, then checks for hardcoded secrets, dependency vulnerabilities, weak
  cryptography, and exposed sensitive files. Outputs a structured report ready
  for /create-todo.
---

## 1. Read project rules

- Locate and read the root `AGENTS.md` (or `agents.md`) file.
- Extract any security‑related rules, such as:
  - Secret management policy (e.g., "All secrets must be in environment
    variables via dotenv")
  - Approved cryptographic algorithms (e.g., "Use bcrypt for password hashing,
    AES‑256‑GCM for encryption")
  - Dependency restrictions (e.g., "Only packages with MIT, Apache‑2.0, or BSD
    licenses allowed")
  - Prohibited packages or versions
  - Any other security directives (e.g., "Do not commit .env files", "Run npm
    audit before every push")
- If no AGENTS.md exists, note this and proceed with generic best‑practice
  heuristics.

## 2. Discover the codebase

- Identify the primary language(s) and frameworks (scan file extensions, config
  files like `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`).
- Determine the package manager and the dependency manifest location.
- Check if `gh` (GitHub CLI) is installed and authenticated (optional, will be
  used if available; otherwise fall back to web searches).

## 3. Check dependencies for known vulnerabilities

- If a dependency manifest exists (e.g., `package.json`, `requirements.txt`):
  - **For npm projects**: attempt `npm audit --json`. If it succeeds, parse the
    JSON and extract advisories with severity "high" or "critical". If it fails
    (missing `node_modules`, etc.), fall back to manual lookup.
  - **For other ecosystems**: parse the manifest to list all direct dependencies
    and their pinned versions.
  - **Manual lookup (fallback)**: for each dependency, construct a search query:
    `<dependency-name> <version> CVE`. Use `gh api` to query the GitHub Advisory
    Database if authenticated, otherwise perform a targeted web search. Flag any
    confirmed or highly likely vulnerabilities.
  - **If AGENTS.md specifies approved/disallowed packages**, cross‑check the
    dependency list against those rules and flag violations.
- If no manifest exists, skip this section.

## 4. Scan for hardcoded secrets

- Run:
  `git grep -E 'password|secret|token|key|api_key' -- '*.{ts,js,py,yaml,yml,toml,env,json,config}'`
- For each match, examine the surrounding code to determine if it appears to be
  a real secret (not a placeholder, reference, or comment).
- **If AGENTS.md defines a secret‑management rule**, check whether the found
  value adheres to it (e.g., if rule says "use environment variables", flag any
  literal string assignment as a violation).
- Flag only convincing cases; ignore obvious placeholders like `"YOUR_API_KEY"`.

## 5. Check for weak cryptographic usage

- Search for known weak algorithms:
  `git grep -E 'md5|sha1|des|rc4|ecb' -- '*.{ts,js,py,go,rs,java,c,cpp,h}'`
- For each match, inspect the context to confirm it is used in a
  security‑relevant way (hashing, encryption, signature) and not merely as a
  non‑security checksum or in comments.
- **If AGENTS.md specifies an approved algorithm** (e.g., bcrypt, Argon2), flag
  any deviation as a violation.

## 6. Look for exposed sensitive files

- Run: `git ls-files | grep -E '\.env$|\.secrets$|credentials\.'` to find
  tracked sensitive files.
- Check if those files are listed in `.gitignore`. If not, flag them.
- Also verify that common sensitive paths (`node_modules/`, `__pycache__/`,
  `*.log`) are in `.gitignore`; if missing, note it as a hygiene issue (but the
  primary focus is on actual secrets).

## 7. Compile the report

- Group findings by category: **Vulnerable Dependencies**, **Hardcoded
  Secrets**, **Weak Cryptography**, **Exposed Files**.
- For each finding, output a line in this exact format:
  ```
  - `relative/path:line` **SEVERITY** | category/tag
    Description of the issue.
    **Fix**: Concrete, actionable suggestion for how to resolve it.
  ```
  - Example:
    ```
    - `src/auth/login.ts:42` **HIGH** | security/hardcoded-secret
      Hardcoded JWT secret, violates AGENTS.md rule "All secrets must be in environment variables."
      **Fix**: Move to `process.env.JWT_SECRET`.
    ```
- Severity levels: `HIGH` (immediate risk), `MEDIUM` (significant risk), `LOW`
  (best‑practice improvement).
- If an issue was detected because it violated an AGENTS.md rule, mention the
  rule explicitly.
- Sort by severity (HIGH first), then by file path.

## 8. Final summary

- Print total number of findings per severity.
- If zero findings, output: "No security issues found – nothing to do."
- If more than 20 findings were generated, show the first 20 and note: "More
  findings exist. Consider fixing these first, then re‑run the audit."
