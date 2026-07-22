---
name: create-todo
description:
  Generate a structured, machine‑ and human‑readable TODO.md from audit findings
  or manual issues. Applies TDD/BDD/DDD/deep‑module principles, assigns AGENT vs
  HUMAN, and enforces your strict task template.
---

## 1. Read project rules

- Locate and read the root `AGENTS.md` (or `agents.md`) file.
- Extract any conventions relevant to task creation: coding standards,
  architecture rules, testing requirements, approved libraries, anti‑patterns,
  and domain terminology.
- If no AGENTS.md exists, note that and proceed with generic best practices.

## 2. Gather input

- Ask me: “What issues should I convert into tasks?” I can:
  - Paste the output of a previous audit (`/audit-security`, `/audit-code`,
    etc.)
  - Give you a path to an audit report file
  - Describe issues in free‑form text
  - Provide a mix of the above.
- Parse the provided input and extract a clean list of discrete issues. If input
  is ambiguous, ask clarifying questions before proceeding.

## 3. Validate and scope each issue

- For each issue, ensure it is concrete and actionable. If an issue is too vague
  (e.g., “fix auth”), ask me for more detail.
- **Split rule:** If an issue spans multiple files or multiple distinct
  concerns, split it into separate parent tasks _before_ generating templates.
  Each parent task must be SMALL—focused on one file or one logical change.
- Once the final list of atomic issues is confirmed, proceed.

## 4. Generate parent tasks using the exact template below

For each atomic issue, produce a parent task that follows this structure
exactly. Fill every placeholder using the issue description, file analysis, and
AGENTS.md context.

```markdown
## T-XXX: [Short, imperative title]

- [ ] **Task ID**: T-XXX
- **Status**: `ready`
- **Related files**: `[file path(s)]`
- **Definition of Done**:
  - [Concrete, verifiable outcome 1]
  - [Concrete, verifiable outcome 2]
- **Out of Scope**: [What this task deliberately does NOT cover]
- **Rules to Follow**: [Project‑specific rules from AGENTS.md, plus general good
  practice]
- **Advanced Coding Pattern**: [Pattern to apply (e.g., Strategy, Repository,
  Deep Module), or “None specific”]
- **Anti-patterns**: [Patterns to avoid, from AGENTS.md or context]
- **Imports/Exports**: [Expected new imports, or “No new imports expected”]
- **Depends on**: [Task IDs this task must wait for, or “None”]
- **Blocks**: [Task IDs this task blocks, or “None”]

### Initial Analysis

- [ ] Read [file(s)] and understand current implementation.
- [ ] Research [relevant topic] for best practices.
- [ ] Report findings and update this task if corrections are needed.

### Subtasks

- **T-XXX-1** | `AGENT` | `[file path]` | Complete initial analysis and
  research.
- **T-XXX-2** | `AGENT` | `[file path]` | [Write test first, if TDD applies]
- **T-XXX-3** | `AGENT` | `[file path]` | [Implement the fix]
- **T-XXX-4** | `AGENT` | `[file path]` | [Run validation command to confirm]

### Validation Commands

- `[specific command to run the relevant test file(s)]`
- `[linter or type‑check command, if applicable]`
```

**Guidance for filling fields intelligently:**

- **Task ID:** Use `T-001`, `T-002`, etc. If `TODO.md` already exists, read it
  and continue from the highest existing ID.
- **Title:** Short, imperative, starts with a verb (“Add error handling to
  payment endpoint”, “Remove hardcoded JWT secret”).
- **Status:** Always `ready` unless you know a dependency blocks it.
- **Related files:** List every file likely to be touched. Read the file(s) to
  verify the path and understand current code.
- **Definition of Done:** State measurable outcomes. For user‑facing changes,
  add a BDD‑style scenario (Given/When/Then) if helpful.
- **Out of Scope:** Aggressively list what is NOT included to prevent scope
  creep.
- **Rules to Follow:** Pull these from AGENTS.md (e.g., “Use early returns”, “No
  console.log”, “All secrets via environment variables”). If none, use sensible
  defaults.
- **Advanced Coding Pattern:** Suggest a pattern if the change clearly benefits
  from one (e.g., “Extract Adapter pattern for third‑party API”, “Deep module:
  hide complex caching logic behind a simple `getUser` export”). If no pattern
  applies, write “None specific”.
- **Anti-patterns:** List what NOT to do, from AGENTS.md or inferred from the
  codebase.
- **Imports/Exports:** If the fix introduces new dependencies, specify the exact
  import statement. Otherwise “No new imports expected”.
- **Depends on / Blocks:** Initially “None”. Dependencies will be reviewed in
  step 6.
- **Initial Analysis:** Always include a subtask for reading relevant files and
  researching the right approach. This prevents blind implementation.
- **Subtasks:** Apply TDD ordering: test first, then implementation, then
  validation. Each subtask is a single atomic action assigned to `AGENT` unless
  it genuinely requires external human action (e.g., “Deploy to production
  (requires manual approval)”). Only then mark it `HUMAN`.
- **Validation Commands:** Be precise: run _only_ the specific test file(s), not
  the whole suite. If no tests exist, include the best available check (linter,
  type‑check, build).

## 5. Incorporate methodologies

- **TDD:** For any code‑change task, order subtasks so that a failing test is
  written before the implementation.
- **BDD:** If the task addresses user behavior, include a GIVEN/WHEN/THEN
  acceptance criterion in the Definition of Done.
- **DDD:** If the project uses domain‑driven design (check AGENTS.md and folder
  names like `domain/`, `entities/`), use domain language in titles and
  descriptions, and suggest patterns like Repository, Aggregate, Value Object
  where appropriate.
- **Deep modules:** In “Advanced Coding Pattern” or “Rules to Follow”, encourage
  designs that expose a simple interface while hiding complex internals.

## 6. Review dependencies

- After all parent tasks are generated, print them and ask: “Do any tasks depend
  on others? (e.g., T‑003 cannot start until T‑001 is complete).”
- Update the `Depends on` and `Blocks` fields accordingly. Let me also say
  “none” if there are no dependencies.

## 7. Write or update TODO.md

- If `TODO.md` exists at the project root, read it and append the new tasks.
  Preserve all completed tasks.
- If not, create a new `TODO.md` with a clear header:
  ```
  # Project Task List
  Generated by /create-todo on [date]
  ```
- Write the tasks in order by ID.

## 8. Final validation

- Verify every parent task has all sections present.
- Verify every subtask has a unique ID (`T-XXX-N`), an `AGENT` or `HUMAN` label,
  a file path (or “N/A” if truly no file), and an unambiguous description.
- Ensure no emoji are used.
- Print a summary: “Created N new parent tasks with M subtasks. Ready for
  /execute-todo.”
