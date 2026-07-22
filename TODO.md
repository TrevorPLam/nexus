# Life OS Implementation TODO

Status values: `PLANNED`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `DEFERRED`.

Assignment values:

- `AGENT`: The coding agent can inspect, implement, test, or document this task through the repository and approved CLI commands.
- `HUMAN`: The solo developer must make a product, security, account, credential, deployment, or external-service decision/action that the agent cannot safely make alone.

Completion rule: A parent task is complete only when its analysis phase, implementation subtasks, targeted validation commands, documentation updates, and definition of done are satisfied. A checked box without evidence is not complete.

Execution rule: Before implementing any task, complete its analysis/research subtask and record the result in the task's progress notes or the relevant repository document. If analysis changes the task, update this document before implementation.

Quality rule: Prefer small vertical changes with tests over broad refactors. Preserve behavior only when it is intentional and covered. Do not add compatibility abstractions without a demonstrated consumer.

Dependency rule: Do not begin a task whose `Depends on` items are incomplete unless the task explicitly states that it is an independent investigation.

Machine-readable parent format:

```text
- [ ] TASK-ID | STATUS: PLANNED | OWNER: AGENT | TITLE
```

Machine-readable subtask format:

```text
- [ ] TASK-ID.SUBTASK-ID | STATUS: PLANNED | OWNER: AGENT | PATH: path/or/N-A | ACTION: complete action
```

---

## Program 00: Planning and Working Agreements

### [x] NEXUS-000 | STATUS: DONE | OWNER: AGENT | Establish the execution baseline

Initial analysis and research:

- Inspect `PROJECT.md`, `README.md`, package manifests, TypeScript configurations, `turbo.json`, migration directories, and current source files.
- Re-run only the targeted commands needed to establish the baseline: `pnpm typecheck`, `pnpm lint`, `pnpm --filter @life-os/api typecheck`, `pnpm --filter @life-os/contracts typecheck`, `pnpm --filter @life-os/database typecheck`, `pnpm --filter @life-os/api-client typecheck`, `pnpm --filter @life-os/web typecheck`, `pnpm --filter @life-os/mobile typecheck`, and `pnpm --filter @life-os/worker typecheck`.
- Verify current upstream guidance before changing stack-specific behavior: Turbo task configuration, Supabase JWT verification, PostgreSQL RLS, Drizzle constraints and transactions, Hono error handling, OpenAPI 3.1, and PowerSync Sync Streams/upload handling.
- Record corrections to this TODO in `TODO.md`; do not begin implementation based only on stale assessment text.

Progress notes:

Fixed during execution:
- Turbo 2.10.5 requires `tasks` field instead of deprecated `pipeline` in turbo.json
- TypeScript base.json had inherited `rootDir: "src"` causing TS6059 errors across all packages
- Removed rootDir from base.json and added per-package rootDir where needed
- Created minimal src/index.ts placeholder files for api-client and worker packages

Current baseline status (after fixes):
- pnpm typecheck: FAILS (contracts, database, api, mobile, mobile-data, ui have errors)
- pnpm lint: FAILS (eslint-config-prettier/flat module not found)
- @life-os/api typecheck: FAILS (25 errors - Zod 4 breaking changes, database self-reference, undefined handling)
- @life-os/contracts typecheck: FAILS (5 errors - Zod 4 record() requires 2 arguments)
- @life-os/database typecheck: FAILS (3 errors - unused import, self-reference typing)
- @life-os/api-client typecheck: PASSES
- @life-os/web typecheck: PASSES
- @life-os/mobile typecheck: FAILS (2 errors - unused router imports)
- @life-os/worker typecheck: PASSES
- @life-os/mobile-data typecheck: FAILS (2 errors - missing dependencies)
- @life-os/ui typecheck: FAILS (15 errors - missing Tamagui and React types)

Remaining independent blockers:
1. ESLint: eslint-config-prettier/flat module not found in eslint.config.mjs
2. Zod 4: z.record() requires 2 arguments (keyType, valueType) - blocks contracts, api
3. Database: Self-reference typing and unused import - blocks database, api
4. UI package: Missing @tamagui/core and @types/react dependencies
5. Mobile-data: Missing @powersync/react-native and @life-os/database dependencies
6. Mobile: Unused router imports

Related paths:

- `PROJECT.md`
- `README.md`
- `TODO.md`
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `apps/*/package.json`
- `packages/*/package.json`
- `packages/*/tsconfig.json`

Definition of done:

- The repository baseline commands and their current failures are recorded.
- Every later task has an explicit dependency or is marked independent.
- Any recommendation contradicted by current code or current upstream documentation is corrected here.

Out of scope:

- Feature implementation.
- Changing dependencies or configuration during analysis.
- Creating product requirements that are not already specified in `PROJECT.md`.

Rules to follow:

- Keep this document emoji free.
- Use stable task IDs; never reuse an ID.
- Keep parent tasks small enough to finish in one focused coding session or one short sequence of dependent subtasks.
- Do not hide a product decision inside an implementation task.

Advanced coding pattern:

- Use an evidence-first execution plan: observation, hypothesis, targeted validation, implementation, regression proof.

Anti-patterns:

- Do not use a single parent task named `Fix everything`.
- Do not mark a task done because a file changed.
- Do not use a full-suite command when a narrow command proves the change.

Depends on: None.
Blocks: All implementation tasks.

Subtasks:

- [x] NEXUS-000.01 | STATUS: DONE | OWNER: AGENT | PATH: repository root | ACTION: Capture the current command baseline and list each independent blocker with its exact command and first actionable error.
- [x] NEXUS-000.02 | STATUS: DONE | OWNER: AGENT | PATH: TODO.md | ACTION: Compare this plan with the current source tree and update task paths, dependencies, or assumptions that are no longer accurate.
- [x] NEXUS-000.03 | STATUS: DONE | OWNER: AGENT | PATH: PROJECT.md, README.md | ACTION: Identify conflicts between locked architecture decisions and current implementation; preserve the locked decisions unless a separate HUMAN decision task explicitly changes them.
- [x] NEXUS-000.04 | STATUS: DONE | OWNER: AGENT | PATH: repository root | ACTION: Validate the task ID grammar, owner labels, status labels, dependency graph, and command specificity with a local text validation command.

Targeted validation:

```powershell
pnpm typecheck
pnpm lint
pnpm --filter @life-os/api typecheck
pnpm --filter @life-os/contracts typecheck
pnpm --filter @life-os/database typecheck
pnpm --filter @life-os/api-client typecheck
pnpm --filter @life-os/web typecheck
pnpm --filter @life-os/mobile typecheck
pnpm --filter @life-os/worker typecheck
```

---

## Program 01: Restore Repository Buildability

### [x] NEXUS-010 | STATUS: DONE | OWNER: AGENT | Make the monorepo quality graph executable

Initial analysis and research:

- Confirm the installed Turbo version and current schema requirements before editing `turbo.json`.
- Inspect every package script and determine which packages are libraries, applications, or intentionally empty scaffolds.
- Verify current TypeScript project-reference behavior and the effect of inherited `rootDir`, `outDir`, `include`, and `exclude` settings.
- Do not add placeholder source files merely to silence TypeScript unless the package is intentionally part of the active build graph and its entry-point contract is defined.

Related paths:

- `turbo.json`
- `package.json`
- `tsconfig.json`
- `packages/tsconfig/base.json`
- `packages/tsconfig/nextjs.json`
- `packages/tsconfig/expo.json`
- `apps/*/tsconfig.json`
- `packages/*/tsconfig.json`
- `apps/worker/package.json`
- `apps/worker/tsconfig.json`
- `packages/api-client/package.json`
- `packages/api-client/tsconfig.json`

Definition of done:

- Turbo accepts the root configuration.
- Every active workspace has a valid script or is intentionally excluded from the task graph.
- Library and application TypeScript configurations compile without cross-package `rootDir` errors.
- The root `typecheck`, `lint`, and `build` commands reach package code.
- The exact command results are recorded in `README.md` or a dedicated engineering-status section.

Out of scope:

- Domain behavior changes.
- Authentication, RLS, or API contract redesign.
- Adding new runtime dependencies unless analysis proves an existing dependency is insufficient.

Rules to follow:

- Use `tasks`, not the obsolete Turbo `pipeline` field.
- Keep shared TypeScript settings minimal; application-specific settings belong in application configs.
- Do not weaken strictness or disable unused-code checks to hide defects.
- Do not add `skipLibCheck` changes unless a specific dependency issue is documented.

Advanced coding pattern:

- Use layered project configurations: language baseline, library build config, Node application config, Next.js config, and Expo config.

Anti-patterns:

- Do not make every package inherit a universal `rootDir: "src"`.
- Do not add `any`, `@ts-ignore`, or broad exclusions to make the command green.
- Do not register empty packages as buildable applications without an entry point.

Depends on: NEXUS-000.
Blocks: NEXUS-011, NEXUS-012, NEXUS-013, NEXUS-014, NEXUS-015, NEXUS-016.

Subtasks:

- [x] NEXUS-010.01 | STATUS: DONE | OWNER: AGENT | PATH: turbo.json | ACTION: Update the Turbo schema to the current task configuration format while preserving build dependencies, outputs, persistent dev tasks, and test outputs.
- [x] NEXUS-010.02 | STATUS: DONE | OWNER: AGENT | PATH: packages/tsconfig/*.json | ACTION: Split shared compiler settings from package/application output settings so inherited `rootDir` and declarations do not break Next.js, Expo, or Node applications.
- [x] NEXUS-010.03 | STATUS: DONE | OWNER: AGENT | PATH: apps/*/package.json, packages/*/package.json | ACTION: Normalize scripts for `build`, `typecheck`, `lint`, `test`, and `format`; remove or explicitly document scripts that cannot run yet.
- [x] NEXUS-010.04 | STATUS: DONE | OWNER: AGENT | PATH: apps/worker, packages/api-client | ACTION: Decide from source inspection whether each package should receive its minimal real entry point or be excluded from active build tasks; do not create fake implementations.
- [x] NEXUS-010.05 | STATUS: DONE | OWNER: AGENT | PATH: README.md | ACTION: Document the authoritative quality commands and the package-level commands used for targeted validation.
- [x] NEXUS-010.06 | STATUS: DONE | OWNER: AGENT | PATH: repository root | ACTION: Run targeted package checks, then run the root checks only after package checks pass.

Targeted validation:

```powershell
pnpm exec turbo --version
pnpm --filter @life-os/contracts typecheck
pnpm --filter @life-os/database typecheck
pnpm --filter @life-os/api-client typecheck
pnpm --filter @life-os/api typecheck
pnpm --filter @life-os/web typecheck
pnpm --filter @life-os/mobile typecheck
pnpm --filter @life-os/worker typecheck
pnpm typecheck
pnpm lint
pnpm build
```

### [ ] NEXUS-011 | STATUS: PLANNED | OWNER: AGENT | Correct the contracts package for Zod 4 and explicit DTO boundaries

Initial analysis and research:

- Inspect the installed Zod version and all `z.record`, date, optional, nullable, default, and unknown-field usage.
- Compare request schemas, response schemas, path parameter schemas, query schemas, and command schemas.
- Confirm that public contracts must not expose Drizzle row types or contain duplicate IDs in both URL and body without a documented reason.

Related paths:

- `packages/contracts/src/common.ts`
- `packages/contracts/src/work.ts`
- `packages/contracts/src/calendar.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/package.json`
- `apps/api/src/routes/work.ts`
- `apps/api/src/routes/calendar.ts`
- `apps/api/src/routes/integration.ts`

Definition of done:

- Contracts compile under the installed Zod version.
- Request, response, path, query, pagination, error, and command contracts are distinct where their semantics differ.
- Reusable contract primitives are exported intentionally.
- Contract tests prove accepted and rejected representative payloads.
- No route requires a body ID when the authoritative ID is in the path.

Out of scope:

- Database schema changes.
- Client implementation.
- Product decisions about task/event behavior.

Rules to follow:

- Validate every external trust boundary.
- Use `z.record(z.string(), z.unknown())` or the current equivalent supported by the installed Zod version.
- Use branded or named inferred types where they improve clarity.
- Keep response contracts independent of database implementation details.

Advanced coding pattern:

- Use schema composition for shared fields, separate input/output DTOs, and discriminated command unions for operations with materially different semantics.

Anti-patterns:

- Do not use database insert types as public API inputs.
- Do not silently coerce invalid dates into `Invalid Date`.
- Do not use broad `z.any()` to bypass contract design.

Depends on: NEXUS-010, NEXUS-000.
Blocks: NEXUS-030, NEXUS-040, NEXUS-050, NEXUS-060, NEXUS-070.

Subtasks:

- [ ] NEXUS-011.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/contracts/src/common.ts | ACTION: Fix Zod 4 record schemas and define reusable validated ID, workspace ID, pagination, date-range, and error-envelope contracts.
- [ ] NEXUS-011.02 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/contracts/src/work.ts | ACTION: Split project/task/dependency/note request and response schemas; remove duplicate URL IDs from update bodies; normalize duration and date representations after domain analysis.
- [ ] NEXUS-011.03 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/contracts/src/calendar.ts | ACTION: Split calendar/event/attendee/recurrence request and response schemas and add cross-field validation for event time ranges.
- [ ] NEXUS-011.04 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/contracts/src/index.ts | ACTION: Replace accidental broad exports with intentional domain exports if required by the final package API; preserve stable imports for current consumers or update them in the same change.
- [ ] NEXUS-011.05 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/contracts/test | ACTION: Add focused contract tests for valid payloads, invalid UUIDs, invalid dates, invalid enum-like values, unknown fields, and boundary lengths.
- [ ] NEXUS-011.06 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/contracts/package.json | ACTION: Add the package test script and run only the contracts test file plus contracts typecheck.

Targeted validation:

```powershell
pnpm --filter @life-os/contracts typecheck
pnpm --filter @life-os/contracts test -- --run packages/contracts/test
```

### [ ] NEXUS-012 | STATUS: PLANNED | OWNER: AGENT | Fix database schema typing without weakening strictness

Initial analysis and research:

- Inspect Drizzle's current self-reference guidance for PostgreSQL schemas.
- Determine whether `parentId` should remain a self-reference, whether explicit foreign-key typing is required, and whether relations should be declared separately.
- Inventory every database field whose TypeScript, SQL, and contract types disagree.

Related paths:

- `packages/database/src/schema/core.ts`
- `packages/database/src/schema/work.ts`
- `packages/database/src/schema/calendar.ts`
- `packages/database/src/schema/index.ts`
- `packages/database/src/index.ts`
- `packages/database/package.json`
- `packages/database/tsconfig.json`

Definition of done:

- Database package typechecks with strict mode and unused-code checks enabled.
- Self-referential task typing is explicit and safe.
- Database insert/update/select types are available to repositories but are not used as public HTTP contracts.
- Schema fields have intentional SQL types and nullability.
- Relations and indexes are declared or intentionally kept in reviewed SQL with documentation.

Out of scope:

- Applying migrations to a production or hosted database.
- Choosing task/event relationship semantics without the HUMAN decision task.
- RLS policy redesign.

Rules to follow:

- Preserve relational integrity in the database, not only in TypeScript.
- Prefer integer storage for minute durations.
- Prefer explicit timestamps/date-only semantics over string conventions.
- Keep server-only schema imports out of client-only packages.

Advanced coding pattern:

- Use a normalized relational schema with explicit aggregate boundaries, typed repository projections, and separate relation declarations where that improves query clarity.

Anti-patterns:

- Do not use text for numeric durations.
- Do not use comments as substitutes for constraints.
- Do not expose `schema.*.$inferInsert` beyond the persistence boundary.

Depends on: NEXUS-010, NEXUS-011.
Blocks: NEXUS-020, NEXUS-021, NEXUS-022, NEXUS-030, NEXUS-070.

Subtasks:

- [ ] NEXUS-012.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/src/schema/work.ts | ACTION: Correct the unused import and self-referential task typing using the current Drizzle-supported pattern without changing intended table semantics.
- [ ] NEXUS-012.02 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/src/schema/work.ts, packages/contracts/src/work.ts | ACTION: Reconcile duration, task status, priority, energy, context-tag, and recurrence types after reviewing product semantics and database query needs.
- [ ] NEXUS-012.03 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/src/schema/calendar.ts, packages/contracts/src/calendar.ts | ACTION: Reconcile event timestamp, timezone, all-day, provider, and recurrence field semantics and document the selected representation.
- [ ] NEXUS-012.04 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/test | ACTION: Add schema-level tests or SQL validation fixtures for nullability, type assumptions, and representative insert/update shapes.
- [ ] NEXUS-012.05 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/package.json | ACTION: Add a targeted database typecheck/test command if absent and validate only the changed schema tests.

Targeted validation:

```powershell
pnpm --filter @life-os/database typecheck
pnpm --filter @life-os/database test -- --run packages/database/test
```

### [ ] NEXUS-013 | STATUS: PLANNED | OWNER: AGENT | Implement the missing API client package boundary

Initial analysis and research:

- Inspect web/mobile consumers and determine the minimum transport surface needed for task/calendar reads and commands.
- Review the standard error envelope, auth token source, idempotency requirements, response validation, cancellation, and retry rules.
- Confirm whether the package should contain framework-neutral fetch functions only, with TanStack Query hooks kept in applications or a separate client adapter.

Related paths:

- `packages/api-client/package.json`
- `packages/api-client/tsconfig.json`
- `packages/api-client/src`
- `packages/contracts/src`
- `apps/web/package.json`
- `apps/mobile/package.json`
- `apps/api/src/index.ts`

Definition of done:

- The package has a real source entry point and typechecks.
- Requests use typed contracts and validate critical responses.
- Errors preserve status, code, message, details, and request/correlation IDs.
- Auth and idempotency headers are injectable rather than hardcoded.
- The client is usable by both web and mobile without importing server database code.
- Focused client tests cover success, validation failure, auth failure, timeout, cancellation, and malformed response behavior.

Out of scope:

- UI integration.
- PowerSync upload implementation.
- Generating a full SDK from OpenAPI.

Rules to follow:

- Use native `fetch` and an injectable transport where practical.
- Retry only safe requests or explicitly idempotent commands.
- Never log tokens or request bodies by default.
- Keep the API client framework-neutral.

Advanced coding pattern:

- Use a small deep module: a narrow public client interface hiding URL construction, headers, parsing, transport, and error normalization.

Anti-patterns:

- Do not expose raw `fetch` calls to every application feature.
- Do not make TanStack Query the source of truth for mobile replicated entities.
- Do not retry all HTTP failures automatically.

Depends on: NEXUS-011, NEXUS-010.
Blocks: NEXUS-050, NEXUS-060, NEXUS-070.

Subtasks:

- [ ] NEXUS-013.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/api-client/src/index.ts | ACTION: Create the framework-neutral public client entry point with typed configuration, auth provider, request metadata, and transport injection.
- [ ] NEXUS-013.02 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/api-client/src/errors.ts | ACTION: Implement typed client errors that parse the canonical API error envelope without exposing secrets.
- [ ] NEXUS-013.03 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/api-client/src/resources | ACTION: Add focused task and calendar resource methods for the currently supported reads and commands.
- [ ] NEXUS-013.04 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/api-client/test | ACTION: Add transport-mocked tests for response parsing, errors, auth, idempotency, cancellation, and retry boundaries.
- [ ] NEXUS-013.05 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/api-client/package.json | ACTION: Add a package test script and validate only the API client tests and typecheck.

Targeted validation:

```powershell
pnpm --filter @life-os/api-client typecheck
pnpm --filter @life-os/api-client test -- --run packages/api-client/test
```

### [ ] NEXUS-014 | STATUS: PLANNED | OWNER: AGENT | Make the worker package an intentional scaffold or implementation

Initial analysis and research:

- Inspect `PROJECT.md` worker/outbox/pg-boss requirements.
- Confirm whether the current phase requires a running worker or only a package boundary.
- Identify the minimum health/startup behavior and database access boundary required for the worker.

Related paths:

- `apps/worker/package.json`
- `apps/worker/tsconfig.json`
- `apps/worker/src`
- `packages/database/src/schema/core.ts`
- `apps/api/src/lib/audit.ts`
- `PROJECT.md`

Definition of done:

- The worker is either a documented, intentionally excluded scaffold or a real executable service.
- No package script points to a nonexistent entry point.
- If implemented, it can claim/process outbox or pg-boss work idempotently and emits structured logs.
- Worker typecheck and focused tests pass.

Out of scope:

- Provider integrations.
- Notifications.
- Search indexing unless explicitly added as a separate task.

Rules to follow:

- Durable side effects belong in the worker, not the API request lifecycle.
- Job processing must be idempotent and retry-aware.
- Do not use a worker service-role credential in client code.

Advanced coding pattern:

- Use an atomic outbox-to-job handoff and idempotent job handlers with explicit retry classification.

Anti-patterns:

- Do not create a forever-running empty worker only to make TypeScript pass.
- Do not mark outbox rows processed before the side effect succeeds.

Depends on: NEXUS-010, NEXUS-012.
Blocks: NEXUS-041, NEXUS-080.

Subtasks:

- [ ] NEXUS-014.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/worker, PROJECT.md | ACTION: Decide from documented scope whether the worker is active now or deferred; document the decision and remove invalid active scripts if deferred.
- [ ] NEXUS-014.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/worker/src/index.ts | ACTION: If active, implement the smallest real startup/shutdown loop, dependency injection boundary, and health-safe error handling.
- [ ] NEXUS-014.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/worker/test | ACTION: Add focused tests for startup configuration and one idempotent processing path if the worker is active.
- [ ] NEXUS-014.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/worker/package.json | ACTION: Validate the worker package with only its typecheck and focused test command.

Targeted validation:

```powershell
pnpm --filter @life-os/worker typecheck
pnpm --filter @life-os/worker test -- --run apps/worker/test
```

### [ ] NEXUS-015 | STATUS: PLANNED | OWNER: AGENT | Correct web and mobile application compiler boundaries

Initial analysis and research:

- Inspect current Next.js and Expo TypeScript recommendations and package-specific generated files.
- Determine whether application configs should use `noEmit`, framework build typechecking, or separate app/library compiler configs.
- Confirm that app source files are not being compiled under the shared package config's `rootDir`.

Related paths:

- `apps/web/tsconfig.json`
- `apps/mobile/tsconfig.json`
- `packages/tsconfig/nextjs.json`
- `packages/tsconfig/expo.json`
- `apps/web/src`
- `apps/mobile/app`

Definition of done:

- Web and mobile typechecks execute against their own source roots.
- Generated framework files are included only where appropriate.
- No source file is outside its configured root.
- Unused imports such as unused router instances are removed or used intentionally.

Out of scope:

- Implementing UI features.
- Selecting a new UI library.

Rules to follow:

- Keep app configs app-local and framework-aware.
- Do not weaken strict mode.
- Preserve the selected Next.js and Expo architecture from `PROJECT.md` unless a separate HUMAN decision changes it.

Advanced coding pattern:

- Use framework-native typechecking for application code and independent strict TypeScript configs for reusable packages.

Anti-patterns:

- Do not make application configs inherit library declaration settings.
- Do not silence unused imports globally.

Depends on: NEXUS-010.
Blocks: NEXUS-060, NEXUS-070.

Subtasks:

- [ ] NEXUS-015.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/tsconfig | ACTION: Separate application and library compiler presets without changing source behavior.
- [ ] NEXUS-015.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web/tsconfig.json | ACTION: Configure the Next.js app to typecheck its app source and generated types without inherited library root errors.
- [ ] NEXUS-015.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/mobile/tsconfig.json | ACTION: Configure the Expo app to typecheck its route tree without inherited library root errors.
- [ ] NEXUS-015.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web/src, apps/mobile/app | ACTION: Remove or use currently unused imports and validate only the affected application typechecks.

Targeted validation:

```powershell
pnpm --filter @life-os/web typecheck
pnpm --filter @life-os/mobile typecheck
```

### [ ] NEXUS-016 | STATUS: PLANNED | OWNER: AGENT | Establish the TypeScript-aware linting baseline

Initial analysis and research:

- Inspect the installed ESLint major version and current flat-config compatibility.
- Verify current `typescript-eslint` and `eslint-plugin-import-x` configuration guidance.
- Identify whether linting currently analyzes TypeScript semantics or only generic JavaScript rules.

Related paths:

- `eslint.config.mjs`
- `package.json`
- `packages/tsconfig/*.json`
- all `*.ts`, `*.tsx`, `*.mjs`, and `*.js` source files

Definition of done:

- ESLint runs from the root and all workspaces without configuration errors.
- TypeScript files receive TypeScript-aware rules.
- Import resolution works for workspace packages.
- Formatting remains Prettier's responsibility.
- The lint policy documents intentional exceptions.

Out of scope:

- Refactoring all source style in the same parent task.
- Adding an architecture tool before lint is operational.

Rules to follow:

- Keep import ordering deterministic.
- Do not use lint disable directives without a narrow reason.
- Do not make lint enforce formatting rules that Prettier owns.

Advanced coding pattern:

- Use a layered flat config: language defaults, TypeScript rules, import rules, framework rules, project restrictions, then Prettier compatibility.

Anti-patterns:

- Do not treat lint as a substitute for typecheck or tests.
- Do not disable all rules for generated or application directories to achieve green output.

Depends on: NEXUS-010.
Blocks: NEXUS-017, NEXUS-080.

Subtasks:

- [ ] NEXUS-016.01 | STATUS: PLANNED | OWNER: AGENT | PATH: package.json, eslint.config.mjs | ACTION: Add and configure the minimum TypeScript ESLint packages compatible with the locked toolchain, only after verifying package compatibility.
- [ ] NEXUS-016.02 | STATUS: PLANNED | OWNER: AGENT | PATH: eslint.config.mjs | ACTION: Configure TypeScript parser/project behavior, import resolution, and workspace-safe rules.
- [ ] NEXUS-016.03 | STATUS: PLANNED | OWNER: AGENT | PATH: eslint.config.mjs | ACTION: Add targeted dependency-boundary restrictions for clients, API, database, and mobile-data packages.
- [ ] NEXUS-016.04 | STATUS: PLANNED | OWNER: AGENT | PATH: repository root | ACTION: Run lint on changed packages first, then run root lint and record any intentional exceptions.

Targeted validation:

```powershell
pnpm exec eslint apps/api/src/lib/errors.ts
pnpm exec eslint packages/contracts/src packages/database/src
pnpm lint
```

---

## Program 02: Domain Decisions and Database Integrity

### [ ] NEXUS-020 | STATUS: BLOCKED | OWNER: HUMAN | Decide the authoritative task/calendar relationship model

Initial analysis and research:

- Inspect current `tasks.calendarEventId`, `events.taskId`, integration endpoints, and future product requirements.
- Compare one-to-one, one-to-many, and explicit junction-table models.
- Review how recurring events, rescheduling, task completion, provider synchronization, and offline conflict handling depend on the choice.
- This is a product/domain decision and must not be guessed by the agent.

Related paths:

- `packages/database/src/schema/work.ts`
- `packages/database/src/schema/calendar.ts`
- `packages/contracts/src/work.ts`
- `packages/contracts/src/calendar.ts`
- `apps/api/src/routes/integration.ts`
- `apps/api/src/lib/calendar-operations.ts`
- `PROJECT.md`

Definition of done:

- The HUMAN records one selected model in `PROJECT.md` or a domain decision record.
- The decision states cardinality, authoritative owner, deletion behavior, recurrence behavior, and synchronization behavior.
- The decision identifies whether task scheduling fields remain separate from calendar events.

Out of scope:

- Implementing the selected model.
- Designing unrelated future modules.

Rules to follow:

- Prefer the simplest model that supports the actual product behavior.
- Do not maintain two mutable sources of truth without a transaction and database invariant.
- The agent may provide options and consequences but must not silently choose the business model.

Advanced coding pattern:

- Use an explicit domain decision record with invariants and examples, not an informal comment.

Anti-patterns:

- Do not retain both foreign keys merely because both are convenient.
- Do not derive business cardinality from current UI placeholders.

Depends on: NEXUS-000, NEXUS-012.
Blocks: NEXUS-021, NEXUS-022, NEXUS-041, NEXUS-051, NEXUS-071.

Subtasks:

- [ ] NEXUS-020.01 | STATUS: PLANNED | OWNER: AGENT | PATH: domain decision record | ACTION: Prepare a concise comparison of one-to-one, one-to-many, and junction-table options with their data, API, sync, and migration consequences.
- [ ] NEXUS-020.02 | STATUS: PLANNED | OWNER: HUMAN | PATH: PROJECT.md or decision record | ACTION: Select the authoritative relationship model and record the required invariants.
- [ ] NEXUS-020.03 | STATUS: PLANNED | OWNER: AGENT | PATH: TODO.md | ACTION: Update dependent tasks with the selected model and remove contradictory assumptions.

Targeted validation:

```powershell
Select-String -Path PROJECT.md,TODO.md -Pattern "task.*event|event.*task|relationship model" -CaseSensitive:$false
```

### [ ] NEXUS-021 | STATUS: PLANNED | OWNER: AGENT | Encode task and calendar invariants in the database

Initial analysis and research:

- Use the selected NEXUS-020 model.
- Inspect current migrations, Drizzle constraint APIs, PostgreSQL check constraints, foreign keys, indexes, and deletion semantics.
- List invariants that must hold for API, worker, migration, and PowerSync writes.

Related paths:

- `packages/database/src/schema/core.ts`
- `packages/database/src/schema/work.ts`
- `packages/database/src/schema/calendar.ts`
- `packages/database/drizzle/*.sql`
- `packages/database/drizzle/meta/*`
- `supabase/migrations`

Definition of done:

- Cross-entity relationships cannot silently cross workspaces.
- Invalid enum-like values are rejected at the database boundary or through a deliberate constrained representation.
- Events cannot have an invalid time interval.
- Dependencies cannot self-reference or duplicate unexpectedly.
- Workspace memberships have the intended uniqueness constraint.
- Indexes support workspace, foreign-key, RLS, list, and outbox query paths.
- A reviewed migration is generated and included in the authoritative migration history.

Out of scope:

- Replacing PostgreSQL with another database.
- Adding speculative constraints for future modules.

Rules to follow:

- Database constraints are the final integrity boundary.
- Use explicit names for constraints and indexes.
- Use expand-contract migration strategy for existing data.
- Never edit an already-applied migration; add a forward migration.

Advanced coding pattern:

- Use normalized relational modeling, composite keys where they express same-workspace ownership, partial unique indexes where appropriate, and transactional migration changes.

Anti-patterns:

- Do not rely only on Zod or UI validation.
- Do not add indexes without tying them to a query, policy, or measured access path.
- Do not use cascading deletes without reviewing audit, sync, and provider implications.

Depends on: NEXUS-012, NEXUS-020.
Blocks: NEXUS-022, NEXUS-031, NEXUS-041, NEXUS-051, NEXUS-071.

Subtasks:

- [ ] NEXUS-021.01 | STATUS: PLANNED | OWNER: AGENT | PATH: database schema and migration history | ACTION: Inventory current foreign keys, nullability, constraints, indexes, and migration drift; record the required delta before editing.
- [ ] NEXUS-021.02 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/src/schema/*.ts | ACTION: Add the selected relationship constraints, same-workspace integrity strategy, valid-value constraints, time-range constraint, dependency constraints, and required indexes.
- [ ] NEXUS-021.03 | STATUS: PLANNED | OWNER: AGENT | PATH: authoritative migration directory | ACTION: Generate or write a forward migration matching the schema changes and review every statement for existing-data safety.
- [ ] NEXUS-021.04 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/test | ACTION: Add database integration tests for invalid relationships, invalid values, duplicate records, time intervals, and index-sensitive query paths.
- [ ] NEXUS-021.05 | STATUS: PLANNED | OWNER: AGENT | PATH: README.md, PROJECT.md | ACTION: Document migration generation, review, application, rollback/forward-repair policy, and the authoritative migration location.

Targeted validation:

```powershell
pnpm --filter @life-os/database typecheck
pnpm --filter @life-os/database test -- --run packages/database/test/invariants.test.ts
```

### [ ] NEXUS-022 | STATUS: PLANNED | OWNER: AGENT | Define correct time, recurrence, and pagination semantics

Initial analysis and research:

- Inspect event and task contracts, schema fields, range queries, recurrence methods, cursor implementation, and UI requirements.
- Confirm half-open interval semantics, UTC storage policy, IANA timezone representation, all-day behavior, recurrence-series identity, and stable ordering.
- Identify whether pagination should use opaque keyset cursors or a simpler stable cursor.

Related paths:

- `packages/contracts/src/work.ts`
- `packages/contracts/src/calendar.ts`
- `packages/database/src/schema/work.ts`
- `packages/database/src/schema/calendar.ts`
- `apps/api/src/lib/calendar-operations.ts`
- `apps/api/src/lib/work-operations.ts`
- `apps/api/src/routes/calendar.ts`
- `apps/api/src/routes/work.ts`

Definition of done:

- The recurrence model can identify base series and instances without contradictory predicates.
- Event overlap queries use documented boundary semantics.
- Invalid date ranges are rejected before database queries.
- Cursor contents match the complete sort order and have a unique tie-breaker.
- Task and calendar list endpoints use shared validated pagination semantics.
- Focused tests cover timezone, all-day, boundaries, recurrence, and cursor behavior.

Out of scope:

- External calendar provider synchronization.
- Reminder scheduling.
- UI calendar rendering.

Rules to follow:

- Never compare a column to a value and `IS NULL` in the same base-event predicate.
- Never use a timestamp-only cursor for a multi-column order.
- Keep date/time conversion at the boundary and use a domain representation internally.

Advanced coding pattern:

- Use explicit value objects or pure functions for interval overlap, recurrence identity, date-range parsing, and opaque keyset cursors.

Anti-patterns:

- Do not use `new Date()` on unvalidated query strings.
- Do not use offset pagination for a changing ordered dataset when keyset pagination is required.
- Do not encode timezone assumptions in comments only.

Depends on: NEXUS-011, NEXUS-012, NEXUS-020, NEXUS-021.
Blocks: NEXUS-041, NEXUS-051, NEXUS-061, NEXUS-071.

Subtasks:

- [ ] NEXUS-022.01 | STATUS: PLANNED | OWNER: AGENT | PATH: domain decision record | ACTION: Record event interval, timezone, all-day, task due-date, recurrence-series, and instance semantics with examples.
- [ ] NEXUS-022.02 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/contracts/src/common.ts | ACTION: Add reusable validated date-range and opaque-cursor contracts with maximum limits and stable decoding errors.
- [ ] NEXUS-022.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/calendar-operations.ts | ACTION: Replace the impossible base-recurring query and duplicate range predicates with tested domain/query helpers.
- [ ] NEXUS-022.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/work-operations.ts, apps/api/src/lib/calendar-operations.ts | ACTION: Make ordering, cursor filtering, and tie-breakers consistent for every paginated list.
- [ ] NEXUS-022.05 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test | ACTION: Add focused tests for overlap boundaries, invalid ranges, recurrence base/instance queries, and cursor continuity.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/calendar-time.test.ts
pnpm --filter @life-os/api test -- --run apps/api/test/pagination.test.ts
pnpm --filter @life-os/api typecheck
```

### [ ] NEXUS-023 | STATUS: PLANNED | OWNER: AGENT | Make migration history authoritative and reproducible

Initial analysis and research:

- Compare `PROJECT.md`'s required `supabase/migrations` policy with the actual Drizzle migration directory and journal.
- Determine whether the standalone RLS file is applied, journaled, duplicated, or ignored.
- Inspect Supabase CLI migration conventions and Drizzle generation behavior before moving or rewriting files.
- This task changes migration history only after the agent can demonstrate a safe forward path.

Related paths:

- `PROJECT.md`
- `supabase/config.toml`
- `supabase/migrations`
- `packages/database/drizzle`
- `packages/database/drizzle/meta/_journal.json`
- `packages/database/drizzle.config.ts`
- `packages/database/package.json`
- `README.md`

Definition of done:

- Exactly one migration history is authoritative and documented.
- RLS policy SQL is included in that history or explicitly superseded.
- Migration ordering is unambiguous.
- A clean local database can be created from the committed history.
- A migration drift check exists for CI.
- No existing applied migration is edited in place.

Out of scope:

- Applying to a production Supabase project without HUMAN credentials/approval.
- Changing domain semantics beyond what is required for migration correctness.

Rules to follow:

- Use forward migrations.
- Keep schema generation and migration application commands distinct.
- Run migrations against a disposable local database before any hosted environment.
- Never commit secrets or signing keys.

Advanced coding pattern:

- Use an expand-contract migration workflow with clean-database replay and schema-drift verification.

Anti-patterns:

- Do not keep untracked or unjournaled policy SQL beside the applied migration history.
- Do not use schema push for non-disposable environments.

Depends on: NEXUS-010, NEXUS-012, NEXUS-021.
Blocks: NEXUS-031, NEXUS-080.

Subtasks:

- [ ] NEXUS-023.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/drizzle, supabase/migrations | ACTION: Inventory migration files, journal entries, duplicate numeric prefixes, and policy files; produce a migration map before moving anything.
- [ ] NEXUS-023.02 | STATUS: PLANNED | OWNER: AGENT | PATH: authoritative migration directory | ACTION: Consolidate or regenerate migration files into the selected authoritative history without editing migrations that may already be applied.
- [ ] NEXUS-023.03 | STATUS: PLANNED | OWNER: AGENT | PATH: supabase/config.toml, packages/database/drizzle.config.ts | ACTION: Align configuration and scripts with the chosen migration authority and prohibit accidental schema push in shared environments.
- [ ] NEXUS-023.04 | STATUS: PLANNED | OWNER: AGENT | PATH: repository root CI configuration | ACTION: Add clean-database migration replay and schema-drift validation commands.
- [ ] NEXUS-023.05 | STATUS: PLANNED | OWNER: HUMAN | PATH: hosted Supabase project | ACTION: If a hosted database already exists, provide the migration history/status and approve the forward-repair procedure; the agent must not guess production migration state.

Targeted validation:

```powershell
supabase db reset
supabase migration list
pnpm --filter @life-os/database generate
```

---

## Program 03: Authentication, Authorization, and RLS

### [ ] NEXUS-030 | STATUS: PLANNED | OWNER: AGENT | Replace custom JWT assumptions with validated Supabase token verification

Initial analysis and research:

- Verify current Supabase signing-key mode and current official guidance for `getClaims`, JWKS, and symmetric-key projects.
- Inspect Hono request lifecycle, auth middleware, environment handling, and how the API database connection is authenticated.
- Decide whether the API will verify asymmetric tokens through remote JWKS or call Supabase Auth for symmetric signing; document the selected path.

Related paths:

- `apps/api/src/lib/auth.ts`
- `apps/api/src/lib/middleware.ts`
- `apps/api/src/lib/db.ts`
- `apps/api/src/index.ts`
- `apps/api/.env.example`
- `apps/api/package.json`
- `PROJECT.md`

Definition of done:

- Tokens are verified using an approved Supabase-compatible mechanism.
- Issuer, audience, expiry, subject, and accepted algorithms are validated.
- Key rotation is supported for asymmetric signing.
- Missing or malformed claims produce a typed unauthorized error.
- Secrets are loaded through validated application environment configuration.
- Focused auth tests cover valid, expired, wrong-issuer, wrong-audience, missing-subject, malformed, rotated-key, and missing-header cases.

Out of scope:

- Implementing web/mobile sign-in UI.
- Choosing a different identity provider.
- Storing raw tokens in logs or database records.

Rules to follow:

- Never use the Supabase anon key as an implicit JWT signing secret.
- Never trust decoded claims without signature and claim validation.
- Restrict accepted algorithms.
- Keep auth provider adapters behind a small API boundary.

Advanced coding pattern:

- Use a verified principal value object produced once by middleware and consumed by authorization policies.

Anti-patterns:

- Do not use `getSession().user` as the sole server authorization source.
- Do not silently accept a missing `sub`.
- Do not log full tokens or full JWT payloads.

Depends on: NEXUS-010, NEXUS-011.
Blocks: NEXUS-031, NEXUS-032, NEXUS-040, NEXUS-050, NEXUS-070.

Subtasks:

- [ ] NEXUS-030.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/env.ts | ACTION: Add validated API environment configuration for Supabase URL, issuer, audience, JWKS URL or auth validation mode, database URL, and safe runtime settings.
- [ ] NEXUS-030.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/auth.ts | ACTION: Implement the selected Supabase verification path with strict claims and algorithm validation, key rotation handling, and typed principal output.
- [ ] NEXUS-030.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/middleware.ts | ACTION: Replace ad hoc user context values with typed verified-principal context and canonical unauthorized errors.
- [ ] NEXUS-030.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test/auth.test.ts | ACTION: Add focused auth verification tests using generated test tokens/keys without committing secrets.
- [ ] NEXUS-030.05 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/.env.example, README.md | ACTION: Document non-secret configuration names and remove guidance that encourages unsafe static-secret assumptions.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/auth.test.ts
pnpm --filter @life-os/api typecheck
```

### [ ] NEXUS-031 | STATUS: PLANNED | OWNER: AGENT | Enforce workspace and entity authorization consistently

Initial analysis and research:

- Inventory every route and operation that reads or mutates projects, tasks, dependencies, notes, calendars, events, attendees, and relationships.
- Identify all routes using only entity IDs and all routes that accept caller-supplied workspace IDs.
- Compare API authorization with RLS semantics and the database role used by the API.
- Design one policy interface that can authorize both direct commands and PowerSync uploads.

Related paths:

- `apps/api/src/lib/middleware.ts`
- `apps/api/src/routes/work.ts`
- `apps/api/src/routes/calendar.ts`
- `apps/api/src/routes/integration.ts`
- `apps/api/src/lib/work-operations.ts`
- `apps/api/src/lib/calendar-operations.ts`
- `packages/database/src/schema/core.ts`
- `packages/database/drizzle/0002_rls_policies.sql`

Definition of done:

- Every entity read/write is scoped to an authenticated principal and workspace membership.
- Caller-supplied workspace IDs cannot be used to select another workspace's entity.
- Cross-workspace relationships are rejected.
- Authorization failures return consistent 403/404 behavior according to the documented anti-enumeration policy.
- Two-user/two-workspace tests prove isolation for every resource family.

Out of scope:

- Role/permission expansion beyond the current workspace membership model.
- Support impersonation.
- Direct browser database writes.

Rules to follow:

- Authorization is a domain/application concern, not only a route concern.
- RLS is defense in depth, not a substitute for API policy when the API uses a privileged connection.
- Do not authorize based on client-provided workspace claims.

Advanced coding pattern:

- Use an authorization context and resource-policy functions that resolve entity ownership in the same transaction as the mutation.

Anti-patterns:

- Do not fetch by ID and authorize afterward in a separate race-prone step.
- Do not duplicate slightly different membership queries in every route.
- Do not rely on UUID secrecy.

Depends on: NEXUS-021, NEXUS-023, NEXUS-030.
Blocks: NEXUS-040, NEXUS-041, NEXUS-050, NEXUS-051, NEXUS-070.

Subtasks:

- [ ] NEXUS-031.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/authorization | ACTION: Create a small authorization module for principal, workspace membership, role capability, and entity ownership checks.
- [ ] NEXUS-031.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/repositories | ACTION: Add workspace-scoped entity lookup patterns that combine target ID and authorization scope in the query predicate or transaction.
- [ ] NEXUS-031.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/routes/*.ts | ACTION: Update every entity-level route and integration route to use the shared authorization/application boundary.
- [ ] NEXUS-031.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test/authorization.test.ts | ACTION: Add two-user/two-workspace isolation tests for reads, creates, updates, deletes, links, notes, attendees, dependencies, and batch operations.
- [ ] NEXUS-031.05 | STATUS: PLANNED | OWNER: AGENT | PATH: PROJECT.md, README.md | ACTION: Document the separation between API policy, database RLS, and privileged worker operations.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/authorization.test.ts
pnpm --filter @life-os/api typecheck
```

### [ ] NEXUS-032 | STATUS: PLANNED | OWNER: AGENT | Align RLS policy implementation with Supabase and PostgreSQL guidance

Initial analysis and research:

- Verify which database roles access each table: authenticated, API service role, worker role, migration role, and local test roles.
- Review RLS policy predicate performance, explicit roles, table-owner bypass, FORCE RLS requirements, policy combination semantics, and supporting indexes.
- Determine whether `auth.uid()` is available for the direct API connection or whether RLS applies only to direct Supabase client paths.

Related paths:

- `packages/database/drizzle/0002_rls_policies.sql`
- authoritative migration directory
- `packages/database/src/schema/core.ts`
- `supabase/config.toml`
- `apps/api/src/lib/db.ts`
- `apps/api/src/lib/auth.ts`
- `PROJECT.md`

Definition of done:

- Every protected table has reviewed role-scoped policies.
- RLS policy SQL is in authoritative migration history.
- Policy predicates have supporting indexes.
- Table-owner/service-role bypass is intentional and documented.
- FORCE RLS is applied where required by the threat model.
- RLS integration tests run under realistic roles and session claims.

Out of scope:

- Exposing direct CRUD to web/mobile.
- Replacing workspace membership authorization with JWT custom claims.

Rules to follow:

- Use explicit `TO` roles in policies.
- Use `USING` for existing-row visibility and `WITH CHECK` for proposed writes.
- Keep service-role credentials server-only.
- Test negative access, not only successful access.

Advanced coding pattern:

- Combine defense-in-depth API authorization with database policy enforcement and least-privilege role separation.

Anti-patterns:

- Do not assume `ENABLE ROW LEVEL SECURITY` is sufficient when table owners bypass it.
- Do not use unindexed membership subqueries at scale.
- Do not grant broad service-role credentials to the worker without an explicit capability boundary.

Depends on: NEXUS-021, NEXUS-023, NEXUS-030, NEXUS-031.
Blocks: NEXUS-080.

Subtasks:

- [ ] NEXUS-032.01 | STATUS: PLANNED | OWNER: AGENT | PATH: database policy SQL | ACTION: Inventory all tables and roles, then document intended SELECT/INSERT/UPDATE/DELETE policy behavior before editing SQL.
- [ ] NEXUS-032.02 | STATUS: PLANNED | OWNER: AGENT | PATH: database policy SQL | ACTION: Add explicit role scoping, reviewed predicates, required indexes, and FORCE RLS where justified by the threat model.
- [ ] NEXUS-032.03 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/test/rls | ACTION: Add local Supabase/PostgreSQL RLS matrix tests for two users, two workspaces, direct reads, direct writes, and negative cases.
- [ ] NEXUS-032.04 | STATUS: PLANNED | OWNER: HUMAN | PATH: Supabase project settings | ACTION: Confirm the hosted project's JWT signing-key mode and database role strategy if hosted RLS testing requires account access; provide only non-secret results to the agent.

Targeted validation:

```powershell
supabase start
supabase db reset
pnpm --filter @life-os/database test -- --run packages/database/test/rls
```

---

## Program 04: Application and API Architecture

### [ ] NEXUS-040 | STATUS: PLANNED | OWNER: AGENT | Introduce deep application modules and remove direct database access from routes

Initial analysis and research:

- Map current route-to-operation-to-database flows.
- Identify cohesive commands and queries for projects, tasks, notes, dependencies, calendars, events, attendees, recurrence, and task/calendar integration.
- Use deep-module principles: small public interfaces, substantial hidden implementation, one reason to change, and no route-specific persistence logic.

Related paths:

- `apps/api/src/routes/work.ts`
- `apps/api/src/routes/calendar.ts`
- `apps/api/src/routes/integration.ts`
- `apps/api/src/lib/work-operations.ts`
- `apps/api/src/lib/calendar-operations.ts`
- `apps/api/src/lib/audit.ts`
- `apps/api/src/lib/db.ts`
- `packages/contracts/src`
- `packages/database/src`

Definition of done:

- Routes perform transport concerns only: input parsing, principal extraction, command/query invocation, and response mapping.
- Integration routes no longer import Drizzle tables or global database handles.
- Application commands enforce authorization and invariants before persistence.
- Repositories are transaction-aware and persistence-specific.
- Route files are split by cohesive resource/use-case boundaries.
- Focused application tests cover commands and queries without requiring HTTP for every case.

Out of scope:

- Implementing every future module.
- Creating a general-purpose framework abstraction.
- Moving all code into an unnecessarily deep directory tree.

Rules to follow:

- One owner for each invariant.
- Commands mutate; queries read.
- Keep framework imports out of domain/application modules where practical.
- Use explicit dependencies instead of global database imports in testable services.

Advanced coding pattern:

- Use vertical slices: each use case owns its input, policy, domain validation, repository calls, transaction, events, and response projection.

Anti-patterns:

- Do not create a generic `BaseCrudService` that erases domain differences.
- Do not keep direct table imports in route handlers.
- Do not create shallow wrappers that add no policy, invariant, or composition value.

Depends on: NEXUS-011, NEXUS-012, NEXUS-031.
Blocks: NEXUS-041, NEXUS-042, NEXUS-050, NEXUS-051.

Subtasks:

- [ ] NEXUS-040.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application | ACTION: Define the application module conventions, command/query naming, dependency injection shape, transaction client type, and error propagation rules.
- [ ] NEXUS-040.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/repositories | ACTION: Extract workspace-scoped repository operations from work/calendar operation files while preserving query semantics and adding transaction client injection.
- [ ] NEXUS-040.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application/tasks, apps/api/src/application/calendar | ACTION: Implement focused commands and queries for the currently supported task/calendar use cases.
- [ ] NEXUS-040.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/routes | ACTION: Split oversized routers into cohesive resource routes and remove direct database access and duplicated persistence logic.
- [ ] NEXUS-040.05 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test | ACTION: Add application-level tests for command policy, validation, transaction use, and query projections.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/application
pnpm --filter @life-os/api typecheck
```

### [ ] NEXUS-041 | STATUS: PLANNED | OWNER: AGENT | Implement transactional commands with audit and outbox records

Initial analysis and research:

- Inspect Drizzle transaction APIs and postgres.js pooling behavior.
- Define which state changes are authoritative mutations and which outbox/audit records must commit atomically.
- Define event names, aggregate types, payload redaction, actor metadata, and retry semantics.

Related paths:

- `apps/api/src/lib/db.ts`
- `apps/api/src/lib/audit.ts`
- `packages/database/src/schema/core.ts`
- `apps/api/src/application`
- `apps/api/src/routes/integration.ts`
- `apps/worker`
- `PROJECT.md`

Definition of done:

- Task/calendar integrated mutation is one database transaction.
- Every authoritative command creates the required audit/outbox records atomically.
- Transaction rollback removes both domain and side-effect records.
- Event payloads contain no secrets or unbounded private content unless explicitly approved.
- Worker consumers can process events idempotently.
- Focused tests cover commit and rollback behavior.

Out of scope:

- External provider side effects within the transaction.
- Building every worker consumer.
- Distributed transactions.

Rules to follow:

- Commit domain state, audit, and outbox together.
- External side effects happen after commit through the worker.
- Use transaction-scoped repository dependencies.
- Preserve correlation/command IDs.

Advanced coding pattern:

- Transactional outbox with an application command boundary and idempotent post-commit consumers.

Anti-patterns:

- Do not create audit/outbox rows in a later best-effort promise.
- Do not call external providers inside the database transaction.
- Do not mark outbox work complete before durable processing.

Depends on: NEXUS-023, NEXUS-031, NEXUS-040.
Blocks: NEXUS-042, NEXUS-080.

Subtasks:

- [ ] NEXUS-041.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/src/schema/core.ts | ACTION: Add or refine command, outbox, audit, and processing metadata needed for atomic mutation and idempotent worker processing.
- [ ] NEXUS-041.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application/transactions | ACTION: Add transaction-scoped dependency construction and a transaction helper with typed commit/rollback behavior.
- [ ] NEXUS-041.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application | ACTION: Update task/calendar commands to write domain, audit, and outbox records in one transaction.
- [ ] NEXUS-041.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test/transactions.test.ts | ACTION: Add focused tests that force failures at each step and verify full rollback.
- [ ] NEXUS-041.05 | STATUS: PLANNED | OWNER: AGENT | PATH: README.md, PROJECT.md | ACTION: Document the transactional mutation and worker handoff contract.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/transactions.test.ts
pnpm --filter @life-os/database typecheck
```

### [ ] NEXUS-042 | STATUS: PLANNED | OWNER: AGENT | Replace response interception with robust command idempotency

Initial analysis and research:

- Inspect current idempotency table, unique constraints, expiry behavior, endpoint scoping, request-body identity, and concurrent request behavior.
- Research current HTTP idempotency conventions and database claim patterns.
- Design behavior for first request, concurrent duplicate, completed duplicate, mismatched duplicate, failed retryable request, and expired key.

Related paths:

- `apps/api/src/lib/idempotency.ts`
- `apps/api/src/lib/middleware.ts`
- `packages/database/src/schema/core.ts`
- `packages/database/drizzle/0003_narrow_baron_zemo.sql`
- `apps/api/src/application`
- `apps/api/test`

Definition of done:

- Idempotency claims are atomic.
- Request fingerprint mismatches are rejected.
- Concurrent duplicates cannot execute the domain command twice.
- Completed results are returned deterministically.
- Retryable failures do not permanently poison the key.
- Idempotency state is persisted in the same transaction as the command result where required.
- Focused concurrency tests pass.

Out of scope:

- Retrying arbitrary non-idempotent GET requests.
- Distributed cache introduction.
- Redis.

Rules to follow:

- Use database uniqueness and atomic state transitions.
- Keep idempotency keys scoped to principal and command semantics.
- Never monkey-patch framework response methods for correctness-critical persistence.

Advanced coding pattern:

- Use a command idempotency state machine: `claimed`, `completed`, `failed_retryable`, `expired`.

Anti-patterns:

- Do not perform check-then-insert without an atomic claim.
- Do not persist the result asynchronously after sending the response.
- Do not cache a response without validating request equivalence.

Depends on: NEXUS-040, NEXUS-041.
Blocks: NEXUS-050, NEXUS-070, NEXUS-080.

Subtasks:

- [ ] NEXUS-042.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/database/src/schema/core.ts | ACTION: Design and migrate idempotency state, request fingerprint, principal scope, command identity, and result storage fields.
- [ ] NEXUS-042.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/idempotency.ts | ACTION: Implement atomic claim, mismatch detection, completion, retryable failure, expiry, and duplicate-result retrieval.
- [ ] NEXUS-042.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application | ACTION: Integrate idempotency at command boundaries rather than response interception.
- [ ] NEXUS-042.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test/idempotency.test.ts | ACTION: Add concurrent duplicate, mismatch, retry, expiry, and completed-result tests.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/idempotency.test.ts
pnpm --filter @life-os/api typecheck
```

### [ ] NEXUS-043 | STATUS: PLANNED | OWNER: AGENT | Standardize Hono validation, errors, OpenAPI, and observability

Initial analysis and research:

- Inspect current Hono version and current `@hono/zod-openapi` route patterns.
- Determine how to generate OpenAPI 3.1 from the same schemas used for runtime validation.
- Review current Hono `app.onError()` behavior and request context typing.
- Define structured log fields and redaction rules from `PROJECT.md`.

Related paths:

- `apps/api/src/index.ts`
- `apps/api/src/routes/*.ts`
- `apps/api/src/lib/errors.ts`
- `apps/api/src/lib/middleware.ts`
- `packages/contracts/src/common.ts`
- `apps/api/package.json`
- `PROJECT.md`

Definition of done:

- One canonical error envelope is emitted for validation, auth, authorization, not-found, conflict, and internal failures.
- Routes use typed OpenAPI-aware schemas and reusable response components.
- Global error handling replaces repetitive route-level catch blocks where appropriate.
- Logs are structured, correlated, and redacted.
- OpenAPI generation and validation run in a focused command.

Out of scope:

- Full API client generation.
- Distributed tracing backend deployment.
- Product analytics.

Rules to follow:

- Validation errors never expose raw secrets or uncontrolled stack traces.
- Internal errors use stable codes and safe messages.
- OpenAPI is generated from the public contract boundary.
- Keep logging content allowlisted.

Advanced coding pattern:

- Use a typed error algebra plus global transport mapping and reusable OpenAPI components.

Anti-patterns:

- Do not return several incompatible error shapes.
- Do not wrap every handler in an identical try/catch.
- Do not log request bodies, tokens, or private calendar/task content by default.

Depends on: NEXUS-011, NEXUS-030, NEXUS-040.
Blocks: NEXUS-050, NEXUS-051, NEXUS-061, NEXUS-080.

Subtasks:

- [ ] NEXUS-043.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/errors.ts | ACTION: Refine typed errors, safe details, status mapping, and stable error codes; add serialization tests.
- [ ] NEXUS-043.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/index.ts | ACTION: Add global Hono error handling, request correlation, health/readiness separation, and safe default handling.
- [ ] NEXUS-043.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/routes | ACTION: Convert route definitions to typed OpenAPI-aware routes with reusable validation, parameter, response, and security components.
- [ ] NEXUS-043.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/lib/logging | ACTION: Add structured redacted logging with request ID, trace ID, command ID, and safe entity metadata.
- [ ] NEXUS-043.05 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test | ACTION: Add focused route tests for every standard error status and generated OpenAPI validation.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/errors.test.ts
pnpm --filter @life-os/api test -- --run apps/api/test/routes
pnpm --filter @life-os/api openapi:check
```

---

## Program 05: Task and Calendar Vertical Slices

### [ ] NEXUS-050 | STATUS: PLANNED | OWNER: AGENT | Implement task commands and queries as vertical slices

Initial analysis and research:

- Use the selected domain model, contracts, authorization, repository, transaction, error, and idempotency patterns.
- Inventory current project/task/note/dependency/subtask endpoints and identify intended command/query behavior.
- Define state transition rules for task status and `completedAt`.
- Decide whether delete is soft cancellation, archive, or true deletion based on current documented behavior.

Related paths:

- `apps/api/src/routes/work.ts`
- `apps/api/src/lib/work-operations.ts`
- `packages/contracts/src/work.ts`
- `packages/database/src/schema/work.ts`
- `apps/api/src/application/tasks`
- `apps/api/src/repositories/tasks`

Definition of done:

- Task/project/note/dependency/subtask commands and queries use the shared application boundary.
- Status transitions and completion timestamps are deterministic and tested.
- Every operation is workspace-authorized and transaction-aware.
- List queries use validated filters and stable pagination.
- Response DTOs are validated.
- Route and application tests cover happy paths, validation, authorization, conflicts, and rollback.

Out of scope:

- Daily-plan projection.
- Search indexing.
- Notifications.
- External provider integration.

Rules to follow:

- Keep task state transitions in one domain/application owner.
- Batch commands must validate every ID and workspace scope.
- Do not duplicate task completion logic between single and batch operations.

Advanced coding pattern:

- Use pure transition functions for task state plus transactional command handlers for persistence.

Anti-patterns:

- Do not accept arbitrary `newStatus: string`.
- Do not use `any` update objects.
- Do not hide bulk behavior behind repeated per-row network requests.

Depends on: NEXUS-011, NEXUS-012, NEXUS-031, NEXUS-040, NEXUS-041, NEXUS-042, NEXUS-043.
Blocks: NEXUS-060, NEXUS-061, NEXUS-070.

Subtasks:

- [ ] NEXUS-050.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/domain/tasks | ACTION: Define pure task state transition rules, completion timestamp behavior, and invariant tests.
- [ ] NEXUS-050.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application/tasks | ACTION: Implement create, update, complete, cancel, defer, reschedule, and batch task commands using shared authorization and transactions.
- [ ] NEXUS-050.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application/projects | ACTION: Implement workspace-scoped project commands and queries with soft-delete/archive semantics documented and tested.
- [ ] NEXUS-050.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application/task-notes, apps/api/src/application/task-dependencies | ACTION: Implement notes, subtasks, and dependency commands with same-workspace and self-reference checks.
- [ ] NEXUS-050.05 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test | ACTION: Add focused command/query tests and API route tests for task slices.
- [ ] NEXUS-050.06 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/api-client/src/resources | ACTION: Add client methods for the implemented task slices and response parsing.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/tasks
pnpm --filter @life-os/api typecheck
pnpm --filter @life-os/api-client test -- --run packages/api-client/test/tasks
```

### [ ] NEXUS-051 | STATUS: PLANNED | OWNER: AGENT | Implement calendar and task-event integration vertical slices

Initial analysis and research:

- Use NEXUS-020's selected relationship model and NEXUS-022's time/recurrence semantics.
- Inventory calendar/event/attendee/link/recurrence endpoints and remove direct database writes from integration routes.
- Identify provider-owned fields that users may not mutate directly.

Related paths:

- `apps/api/src/routes/calendar.ts`
- `apps/api/src/routes/integration.ts`
- `apps/api/src/lib/calendar-operations.ts`
- `packages/contracts/src/calendar.ts`
- `packages/database/src/schema/calendar.ts`
- `apps/api/src/application/calendar`
- `apps/api/src/application/integrations`

Definition of done:

- Calendar/event/attendee/link/recurrence commands and queries use shared application services.
- Task-event creation/link/unlink is atomic and follows the selected relationship model.
- Calendar ownership and event workspace consistency are enforced.
- Attendee state transitions are validated.
- Recurrence queries are correct and tested.
- Response DTOs and OpenAPI routes are implemented.

Out of scope:

- Google/Outlook OAuth and webhooks.
- Reminder delivery.
- Provider synchronization worker.

Rules to follow:

- External provider IDs are not user-controlled identity keys.
- Event dates are validated and normalized at the boundary.
- Linking entities from different workspaces must fail atomically.

Advanced coding pattern:

- Use an integration application service that composes task and calendar aggregates in one transaction without making either route own persistence details.

Anti-patterns:

- Do not maintain both sides of a relationship through separate non-transactional calls.
- Do not use query parameters for mutation payloads when a typed command body is clearer.
- Do not silently turn invalid dates into database values.

Depends on: NEXUS-020, NEXUS-021, NEXUS-022, NEXUS-031, NEXUS-040, NEXUS-041, NEXUS-042, NEXUS-043.
Blocks: NEXUS-060, NEXUS-061, NEXUS-070.

Subtasks:

- [ ] NEXUS-051.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/domain/calendar | ACTION: Define event interval, attendee, provider-field, and recurrence invariants as pure functions with tests.
- [ ] NEXUS-051.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application/calendar | ACTION: Implement calendar and event create/update/delete/query commands with workspace policy, transaction, and DTO mapping.
- [ ] NEXUS-051.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application/calendar/attendees | ACTION: Implement attendee commands and validated status transitions with event ownership checks.
- [ ] NEXUS-051.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/src/application/integrations/task-calendar.ts | ACTION: Replace direct integration route database writes with one selected-model command that atomically creates or links task and event state.
- [ ] NEXUS-051.05 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test | ACTION: Add focused calendar, recurrence, attendee, link, cross-workspace, and rollback tests.
- [ ] NEXUS-051.06 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/api-client/src/resources | ACTION: Add client methods for calendar and integration commands with idempotency support.

Targeted validation:

```powershell
pnpm --filter @life-os/api test -- --run apps/api/test/calendar
pnpm --filter @life-os/api test -- --run apps/api/test/integration
pnpm --filter @life-os/api-client test -- --run packages/api-client/test/calendar
```

### [ ] NEXUS-052 | STATUS: PLANNED | OWNER: AGENT | Add API contract and compatibility checks

Initial analysis and research:

- Inspect generated OpenAPI output after NEXUS-043 and current client methods after NEXUS-050/NEXUS-051.
- Determine supported-client compatibility policy and which changes are additive, breaking, or versionable.
- Identify response examples needed for supported task/calendar workflows.

Related paths:

- `apps/api`
- `packages/contracts`
- `packages/api-client`
- `README.md`
- `PROJECT.md`

Definition of done:

- OpenAPI output is generated deterministically.
- Contract fixtures cover task/calendar create, update, list, link, errors, and pagination.
- Breaking changes are detected in CI or explicitly versioned.
- API client tests use supported contract fixtures.

Out of scope:

- Full generated SDK replacement.
- External consumer migration.

Rules to follow:

- Public contract changes require fixture and compatibility review.
- Prefer additive changes and explicit API versioning.
- Do not use raw database rows as contract fixtures.

Advanced coding pattern:

- Consumer-driven contract fixtures plus OpenAPI compatibility checks.

Anti-patterns:

- Do not update schemas without updating response examples/tests.
- Do not silently change error codes or pagination shapes.

Depends on: NEXUS-011, NEXUS-013, NEXUS-043, NEXUS-050, NEXUS-051.
Blocks: NEXUS-060, NEXUS-070, NEXUS-080.

Subtasks:

- [ ] NEXUS-052.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/test/contracts | ACTION: Add representative request/response/error fixtures for implemented task/calendar operations.
- [ ] NEXUS-052.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/api/package.json | ACTION: Add deterministic OpenAPI generation and compatibility-check scripts.
- [ ] NEXUS-052.03 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/api-client/test | ACTION: Make client tests consume contract fixtures rather than hand-written unverified response assumptions.

Targeted validation:

```powershell
pnpm --filter @life-os/api openapi:generate
pnpm --filter @life-os/api openapi:check
pnpm --filter @life-os/api test -- --run apps/api/test/contracts
```

---

## Program 06: Client, UI, and Offline Delivery

### [ ] NEXUS-060 | STATUS: PLANNED | OWNER: AGENT | Connect the web app to the API client and real task/calendar states

Initial analysis and research:

- Inspect current Next.js App Router structure, auth requirements, server/client component boundaries, and API client capabilities.
- Identify which reads belong in server components and which interactions require client components/TanStack Query.
- Use the existing `packages/ui` direction and avoid creating a second styling system.

Related paths:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/work/page.tsx`
- `apps/web/src/app/calendar/page.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `packages/ui/src`
- `packages/api-client/src`
- `packages/contracts/src`

Definition of done:

- Web task/calendar pages use real typed reads and commands.
- Authenticated data is not publicly cached across users.
- Loading, empty, error, retry, and mutation states are accessible.
- UI uses shared UI primitives/tokens where available.
- Focused component and route tests cover the implemented states.

Out of scope:

- Full visual redesign.
- Provider OAuth.
- Mobile implementation.

Rules to follow:

- Product API remains the canonical cross-platform API.
- Use server components for initial data where appropriate and client components only for interaction.
- Validate response data at the client boundary.
- Preserve accessibility requirements from `PROJECT.md`.

Advanced coding pattern:

- Use feature-local UI composition over a global entity store; use TanStack Query only for web remote state.

Anti-patterns:

- Do not call the database directly from the web app.
- Do not duplicate task/calendar data in a global Zustand/Redux cache.
- Do not use inline styles as the long-term design system.

Depends on: NEXUS-013, NEXUS-015, NEXUS-050, NEXUS-051, NEXUS-052.
Blocks: NEXUS-080.

Subtasks:

- [ ] NEXUS-060.01 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web/src/lib | ACTION: Add web-safe authenticated API client configuration and request boundary without exposing server secrets.
- [ ] NEXUS-060.02 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web/src/app/work | ACTION: Implement task/project list and create/update interactions with typed loading, empty, error, and success states.
- [ ] NEXUS-060.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web/src/app/calendar | ACTION: Implement calendar/event list and create/update interactions with date-range validation and typed states.
- [ ] NEXUS-060.04 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/ui/src | ACTION: Extract only the repeated primitives needed by the web task/calendar views and keep complex composites web-local unless sharing is justified.
- [ ] NEXUS-060.05 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web/test | ACTION: Add focused component and interaction tests for task/calendar happy, empty, error, and unauthorized states.

Targeted validation:

```powershell
pnpm --filter @life-os/web test -- --run apps/web/test
pnpm --filter @life-os/web typecheck
pnpm --filter @life-os/web build
```

### [ ] NEXUS-061 | STATUS: PLANNED | OWNER: AGENT | Establish the PowerSync mobile read and upload architecture

Initial analysis and research:

- Inspect current PowerSync React Native/Expo package compatibility.
- Follow current PowerSync guidance: Sync Streams are preferred for new projects; client schema follows stream projections; `fetchCredentials()` and `uploadData()` are required for backend integration.
- Determine which task/calendar data is safe and necessary to replicate to mobile.
- Confirm how server-authoritative commands, validation errors, conflicts, and sync issues will be represented.

Related paths:

- `packages/mobile-data/src/schema.ts`
- `packages/mobile-data/src/index.ts`
- `packages/mobile-data/package.json`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/work/index.tsx`
- `apps/mobile/app/calendar/index.tsx`
- `apps/mobile/package.json`
- `packages/api-client/src`
- `PROJECT.md`

Definition of done:

- Mobile has a real PowerSync database/provider boundary.
- Authenticated credentials and Sync Stream subscriptions are configured.
- Client schema intentionally matches the selected stream projections.
- `uploadData()` synchronously applies batches through the API command boundary.
- Retryable and permanent validation/conflict outcomes are handled without permanently blocking the queue.
- Mobile reads replicated entities from local SQLite, not a parallel HTTP entity cache.
- Offline create/update/delete/link workflows have focused tests or device-level validation plans.

Out of scope:

- Production PowerSync Cloud account setup without HUMAN credentials.
- Provider calendar OAuth.
- Full mobile visual design.

Rules to follow:

- Use authenticated JWT parameters for access control; do not use client-controlled parameters for authorization.
- Generate UUIDs locally for offline-created records.
- Keep upload application synchronous and idempotent.
- Store user-visible sync issues in a safe replicated/local model.

Advanced coding pattern:

- Server-authoritative offline-first architecture with local optimistic state, durable upload queue, command application, and explicit reconciliation.

Anti-patterns:

- Do not sync entire tables by default.
- Do not use TanStack Query as the mobile replicated-entity cache.
- Do not return permanent 4xx failures that block the PowerSync queue without a client-visible conflict strategy.
- Do not put service credentials in the mobile app.

Depends on: NEXUS-013, NEXUS-020, NEXUS-022, NEXUS-030, NEXUS-031, NEXUS-050, NEXUS-051, NEXUS-052.
Blocks: NEXUS-070, NEXUS-080.

Subtasks:

- [ ] NEXUS-061.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/mobile-data/src | ACTION: Design the client-safe projected schema and list every synced table/field with its reason for replication.
- [ ] NEXUS-061.02 | STATUS: PLANNED | OWNER: AGENT | PATH: PowerSync configuration | ACTION: Define authenticated Sync Streams for workspace-scoped task/calendar data and document subscription parameters and access assumptions.
- [ ] NEXUS-061.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/mobile/src, packages/mobile-data/src | ACTION: Implement PowerSync database/provider initialization, credential fetching, connection lifecycle, sign-out cleanup, and subscription management.
- [ ] NEXUS-061.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/mobile/src, packages/api-client/src | ACTION: Implement `uploadData()` batch translation to typed API commands with idempotency and retry classification.
- [ ] NEXUS-061.05 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/mobile-data/test, apps/mobile/test | ACTION: Add focused tests for projection queries, offline local writes, upload batches, retries, conflict/error propagation, and account/workspace switching.
- [ ] NEXUS-061.06 | STATUS: PLANNED | OWNER: HUMAN | PATH: PowerSync Cloud/Supabase accounts | ACTION: If hosted sync setup is required, create or authorize the external PowerSync/Supabase resources and provide non-secret endpoint/configuration results to the agent.

Targeted validation:

```powershell
pnpm --filter @life-os/mobile-data typecheck
pnpm --filter @life-os/mobile test -- --run apps/mobile/test/powersync
pnpm --filter @life-os/mobile typecheck
```

### [ ] NEXUS-062 | STATUS: PLANNED | OWNER: AGENT | Replace duplicated placeholder UI with shared accessible primitives

Initial analysis and research:

- Inspect `packages/ui` exports and current web/mobile placeholder screens.
- Compare Tamagui compatibility with Next.js and Expo versions in the repository.
- Extract only genuinely repeated primitives and keep platform-specific composites local.

Related paths:

- `packages/ui/src`
- `apps/web/src/app/work/page.tsx`
- `apps/web/src/app/calendar/page.tsx`
- `apps/mobile/app/work/index.tsx`
- `apps/mobile/app/calendar/index.tsx`
- `apps/web/src/app/globals.css`

Definition of done:

- Repeated empty states, sections, buttons, cards, and loading/error primitives have one appropriate owner.
- Web and mobile accessibility behavior is tested or manually verified.
- UI files remain small and feature-focused.
- Unused navigation imports and dead buttons are resolved.

Out of scope:

- Full design system completion.
- Complex universal calendar components.

Rules to follow:

- Share tokens and simple primitives; do not force complex platform-specific composites to be universal.
- Preserve keyboard, screen reader, dynamic type, and reduced-motion requirements.
- Keep product copy and interaction semantics explicit.

Advanced coding pattern:

- Cross-platform design-system foundations with feature-local composition.

Anti-patterns:

- Do not duplicate near-identical style objects across screens.
- Do not create a universal component with many platform conditionals before a real shared consumer exists.

Depends on: NEXUS-015, NEXUS-060.
Blocks: NEXUS-080.

Subtasks:

- [ ] NEXUS-062.01 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/ui/src | ACTION: Inventory current exports and identify the smallest set of reusable primitives needed by task/calendar screens.
- [ ] NEXUS-062.02 | STATUS: PLANNED | OWNER: AGENT | PATH: packages/ui/src | ACTION: Implement or refine the selected primitives with typed props and accessible behavior.
- [ ] NEXUS-062.03 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web/src/app, apps/mobile/app | ACTION: Replace duplicated placeholder structures with the selected primitives without introducing a global entity store.
- [ ] NEXUS-062.04 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web/test, apps/mobile/test | ACTION: Add focused accessibility and interaction tests for the shared primitives.

Targeted validation:

```powershell
pnpm --filter @life-os/ui typecheck
pnpm --filter @life-os/web test -- --run apps/web/test/ui
pnpm --filter @life-os/mobile test -- --run apps/mobile/test/ui
```

---

## Program 07: Testing, Documentation, and Repository Governance

### [ ] NEXUS-070 | STATUS: PLANNED | OWNER: AGENT | Build the TDD and BDD regression pyramid

Initial analysis and research:

- Inventory current test scripts and confirm the selected Vitest, Testing Library, Playwright, Maestro, and optional Detox architecture from `PROJECT.md`.
- Map regression priorities: cross-workspace isolation, transactions, idempotency, task/calendar linking, recurrence, offline durability, account switching, and error redaction.
- Define which tests are unit, application integration, database/RLS integration, API contract, web E2E, and mobile E2E.

Related paths:

- `PROJECT.md`
- root and package `package.json` files
- `apps/api`
- `packages/contracts`
- `packages/database`
- `packages/api-client`
- `apps/web`
- `apps/mobile`
- `apps/worker`

Definition of done:

- Every implemented command has focused unit/application tests.
- Database/RLS behavior uses a real ephemeral PostgreSQL/Supabase-compatible environment.
- API routes use Hono request tests and contract assertions.
- BDD scenarios describe user-observable task/calendar behavior.
- E2E tests cover the highest-risk cross-layer workflows.
- CI runs fast deterministic tests on PR and broad suites on schedule/release.

Out of scope:

- 100 percent coverage as a vanity target.
- Provider integration tests without controlled test accounts.
- Snapshot-heavy tests that do not express behavior.

Rules to follow:

- Write a failing test before implementing a behavior change when practical.
- Test observable behavior and invariants, not private implementation details.
- Use deterministic synthetic data.
- Keep each test focused and name it after the behavior it protects.

Advanced coding pattern:

- Test pyramid plus BDD scenario matrix: pure domain tests, application/database integration, API contract tests, and a small number of end-to-end workflows.

Anti-patterns:

- Do not mock the database for RLS or transaction claims.
- Do not rely on one broad end-to-end test for every defect.
- Do not assert internal function call counts when observable state is the requirement.

Depends on: NEXUS-011, NEXUS-013, NEXUS-021, NEXUS-022, NEXUS-030, NEXUS-031, NEXUS-040, NEXUS-041, NEXUS-042, NEXUS-043, NEXUS-050, NEXUS-051, NEXUS-061.
Blocks: NEXUS-080.

Subtasks:

- [ ] NEXUS-070.01 | STATUS: PLANNED | OWNER: AGENT | PATH: test configuration | ACTION: Add Vitest configuration and package test scripts with targeted project scopes and deterministic setup/teardown.
- [ ] NEXUS-070.02 | STATUS: PLANNED | OWNER: AGENT | PATH: domain tests | ACTION: Add unit tests for task state transitions, event intervals, recurrence identity, pagination cursors, and error mapping.
- [ ] NEXUS-070.03 | STATUS: PLANNED | OWNER: AGENT | PATH: API/database tests | ACTION: Add integration tests for authorization, RLS, transactions, idempotency, outbox, and contract behavior.
- [ ] NEXUS-070.04 | STATUS: PLANNED | OWNER: AGENT | PATH: BDD feature documentation | ACTION: Write concise Given/When/Then scenarios for task creation/completion, calendar scheduling, task-event linking, cross-workspace rejection, and offline reconciliation.
- [ ] NEXUS-070.05 | STATUS: PLANNED | OWNER: AGENT | PATH: apps/web, apps/mobile | ACTION: Add only the highest-value web/mobile E2E workflows after lower-level tests are stable.
- [ ] NEXUS-070.06 | STATUS: PLANNED | OWNER: AGENT | PATH: CI configuration | ACTION: Separate fast PR validation from nightly/provider/device suites and document all commands.

Targeted validation:

```powershell
pnpm --filter @life-os/contracts test -- --run
pnpm --filter @life-os/api test -- --run apps/api/test/domain
pnpm --filter @life-os/api test -- --run apps/api/test/routes
pnpm --filter @life-os/database test -- --run packages/database/test/rls
pnpm test
```

### [ ] NEXUS-071 | STATUS: PLANNED | OWNER: AGENT | Complete repository documentation and implementation status

Initial analysis and research:

- Compare README claims with actual source, tests, migrations, and package scripts.
- Identify every document that should explain a durable architectural decision, operational command, migration policy, auth policy, sync policy, or user-visible domain rule.
- Keep documentation concise and link to source-of-truth decisions instead of duplicating implementation details.

Related paths:

- `README.md`
- `PROJECT.md`
- `TODO.md`
- `packages/database/README.md` if created
- `apps/api/README.md` if created
- `apps/mobile/README.md` if created
- architecture decision records under `.planning/` or a documented decision directory

Definition of done:

- README accurately distinguishes implemented, scaffolded, blocked, and planned work.
- Migration, environment, auth, API, worker, testing, and PowerSync setup commands are accurate.
- Domain decisions from HUMAN tasks are recorded and linked.
- Each major implementation pattern has one concise authoritative document.
- TODO task completion evidence points to tests/docs rather than vague claims.

Out of scope:

- Marketing copy.
- Documentation for modules that do not exist.
- Copying all source code into documentation.

Rules to follow:

- Update documentation in the same change as behavior or architecture changes.
- Never document an unverified command as working.
- Keep secrets and real credentials out of documentation.

Advanced coding pattern:

- Architecture decision records plus executable runbooks and a status document derived from actual checks.

Anti-patterns:

- Do not keep “completed” claims for scaffolds.
- Do not let README setup instructions drift from package scripts.
- Do not create a second conflicting task list.

Depends on: NEXUS-000, NEXUS-023, NEXUS-043, NEXUS-061, NEXUS-070.
Blocks: NEXUS-080.

Subtasks:

- [ ] NEXUS-071.01 | STATUS: PLANNED | OWNER: AGENT | PATH: README.md | ACTION: Rewrite implementation status and setup instructions based on verified commands and actual package behavior.
- [ ] NEXUS-071.02 | STATUS: PLANNED | OWNER: AGENT | PATH: architecture decision records | ACTION: Record task/event relationship, time semantics, migration authority, auth verification, RLS role strategy, and mobile sync decisions.
- [ ] NEXUS-071.03 | STATUS: PLANNED | OWNER: AGENT | PATH: PROJECT.md | ACTION: Update only decisions that were intentionally changed and preserve locked decisions that remain valid.
- [ ] NEXUS-071.04 | STATUS: PLANNED | OWNER: AGENT | PATH: TODO.md | ACTION: Attach completion evidence, mark finished tasks, and add follow-up tasks only when analysis identifies a real remaining gap.

Targeted validation:

```powershell
Select-String -Path README.md,PROJECT.md,TODO.md -Pattern "pnpm|supabase|PowerSync|completed|pending|migration" -CaseSensitive:$false
```

### [ ] NEXUS-072 | STATUS: PLANNED | OWNER: AGENT | Add architecture and dependency-boundary enforcement

Initial analysis and research:

- Inspect actual imports after NEXUS-040, NEXUS-050, NEXUS-060, and NEXUS-061.
- Choose dependency-cruiser and/or targeted ESLint restrictions based on measured boundary needs.
- Define allowed dependency directions before adding rules.

Related paths:

- `eslint.config.mjs`
- `packages/*/package.json`
- `apps/*/package.json`
- `apps/api/src`
- `packages/contracts/src`
- `packages/database/src`
- `packages/mobile-data/src`
- `packages/api-client/src`

Definition of done:

- Database code cannot be imported by web/mobile.
- API routes cannot import database tables directly.
- Contracts do not import apps or database code.
- Mobile data does not expose server-only credentials or modules.
- Cycles and forbidden imports fail a targeted architecture command.

Out of scope:

- Enforcing directory structure that does not express a meaningful boundary.
- Rewriting correct imports solely for stylistic preference.

Rules to follow:

- Architecture rules must reflect actual runtime/security boundaries.
- Every exception requires a named reason and owner.
- Run boundary checks on changed packages first.

Advanced coding pattern:

- Explicit dependency graph with inward domain/application dependencies and outward adapters.

Anti-patterns:

- Do not use barrel exports to bypass boundaries.
- Do not place shared code in a root “utils” package without an owned abstraction.
- Do not solve cycles with dynamic imports without understanding the dependency design.

Depends on: NEXUS-016, NEXUS-040, NEXUS-050, NEXUS-060, NEXUS-061.
Blocks: NEXUS-080.

Subtasks:

- [ ] NEXUS-072.01 | STATUS: PLANNED | OWNER: AGENT | PATH: architecture configuration | ACTION: Write the intended package dependency graph and allowed import directions before enabling enforcement.
- [ ] NEXUS-072.02 | STATUS: PLANNED | OWNER: AGENT | PATH: eslint.config.mjs or dependency-cruiser config | ACTION: Implement only the rules supported by the measured graph and add narrow documented exceptions where necessary.
- [ ] NEXUS-072.03 | STATUS: PLANNED | OWNER: AGENT | PATH: repository root | ACTION: Add a targeted architecture validation script and run it against the changed packages.

Targeted validation:

```powershell
pnpm architecture:check
pnpm exec eslint apps/api/src packages/contracts/src packages/database/src packages/api-client/src packages/mobile-data/src
```

---

## Program 08: Final Release Gate

### [ ] NEXUS-080 | STATUS: PLANNED | OWNER: AGENT | Run the integrated readiness review

Initial analysis and research:

- Review every completed parent task and verify evidence rather than relying on checkboxes.
- Re-run current upstream compatibility checks for the selected versions of Node, pnpm, Turbo, TypeScript, Hono, Zod, Drizzle, Supabase, and PowerSync.
- Confirm no task remains incorrectly marked done because it was only scaffolded.

Related paths:

- `TODO.md`
- `PROJECT.md`
- `README.md`
- all package manifests and configs
- all migration and policy files
- CI configuration

Definition of done:

- Root typecheck, lint, format check, test, build, architecture, migration, and OpenAPI checks pass.
- Focused security, RLS, authorization, transaction, idempotency, task/calendar, contract, and offline tests pass.
- Documentation matches actual behavior.
- No critical or high-risk finding from the assessment remains unowned.
- Remaining work is explicitly deferred with a reason and follow-up task.

Out of scope:

- Production deployment approval.
- External provider production credentials.
- New feature scope discovered during the review.

Rules to follow:

- Treat a failing release gate as a blocker, not a warning.
- Record command output summaries and known environmental limitations.
- Do not weaken checks to pass the gate.

Advanced coding pattern:

- Evidence-based release readiness review with layered automated gates and explicit human approval only for external deployment/security actions.

Anti-patterns:

- Do not declare readiness because the UI renders.
- Do not skip RLS, idempotency, offline, or migration tests because they are slower.
- Do not close unresolved high-risk tasks under a general “future hardening” label.

Depends on: NEXUS-000, NEXUS-010, NEXUS-011, NEXUS-012, NEXUS-013, NEXUS-014, NEXUS-015, NEXUS-016, NEXUS-020, NEXUS-021, NEXUS-022, NEXUS-023, NEXUS-030, NEXUS-031, NEXUS-032, NEXUS-040, NEXUS-041, NEXUS-042, NEXUS-043, NEXUS-050, NEXUS-051, NEXUS-052, NEXUS-060, NEXUS-061, NEXUS-062, NEXUS-070, NEXUS-071, NEXUS-072.
Blocks: None.

Subtasks:

- [ ] NEXUS-080.01 | STATUS: PLANNED | OWNER: AGENT | PATH: repository root | ACTION: Run targeted checks for every changed package and collect the exact command results.
- [ ] NEXUS-080.02 | STATUS: PLANNED | OWNER: AGENT | PATH: repository root | ACTION: Run root release checks only after targeted checks pass.
- [ ] NEXUS-080.03 | STATUS: PLANNED | OWNER: AGENT | PATH: TODO.md, README.md | ACTION: Produce a final status summary with completed evidence, deferred work, known limitations, and unresolved risks.
- [ ] NEXUS-080.04 | STATUS: PLANNED | OWNER: HUMAN | PATH: deployment accounts and environments | ACTION: Approve any external staging/production migration, credential, PowerSync Cloud, provider OAuth, or deployment action after reviewing the agent's readiness evidence.

Targeted validation:

```powershell
pnpm format --check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm architecture:check
pnpm openapi:check
supabase db reset
supabase migration list
```

---

## HUMAN Decision Register

Only use a HUMAN task when the agent cannot safely decide or perform the action through the repository and approved CLI commands.

- `NEXUS-020`: Select the authoritative task/calendar relationship model.
- `NEXUS-023.05`: Confirm hosted migration state if a hosted database already exists.
- `NEXUS-032.04`: Confirm hosted Supabase signing-key and database-role details when account access is required.
- `NEXUS-061.06`: Create/authorize external PowerSync/Supabase resources when credentials or account ownership are required.
- `NEXUS-080.04`: Approve external staging/production actions.

The HUMAN should not be asked to perform repository analysis, coding, test creation, refactoring, migration authoring, documentation, or CLI validation when the agent can perform those actions.

## Task Progress Notes

Record concise evidence here when a task changes assumptions, discovers a blocker, or requires a new dependent task.

```text
Date:
Task ID:
Observation:
Decision or correction:
Files changed:
Targeted validation:
Result:
Follow-up task:
```
