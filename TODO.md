# Code Health Remediation TODO

Generated from code health audit on July 23, 2026.

## Task Legend

- [ ]: Incomplete
- [x]: Complete
- STATUS: pending | in_progress | completed | blocked
- AGENT: AI performs the task
- HUMAN: Developer must perform the task (external action)

---

## TASK-001: Fix Import Order Violations in API Package

- [x] STATUS: done
- PRIORITY: HIGH

### Related File Paths
- apps/api/src/lib/work-operations.ts
- apps/api/src/routes/calendar/scheduling-links.ts
- apps/api/src/routes/work/projects.ts
- apps/api/src/routes/work/task-assignees.ts
- apps/api/src/routes/work/task-attachments.ts
- apps/api/src/routes/work/task-comments.ts
- apps/api/src/routes/work/tasks.ts
- apps/api/src/routes/work/time-entries.ts
- apps/api/src/routes/work/batch-operations.ts
- apps/api/src/routes/integration.ts
- apps/api/src/test/fixtures/seed-data.ts

### Definition of Done
- All import order violations in @life-os/api are resolved
- ESLint passes for @life-os/api with zero import-x/order errors
- Code still compiles and tests pass after import reordering

### Out of Scope
- Changing import semantics (only reordering)
- Adding/removing imports (unless unused)

### Rules to Follow
- AGENTS.md import order rule: builtin, external, internal, parent, sibling, index
- Newlines between import groups
- Alphabetical imports within groups

### Advanced Coding Pattern
- Use ESLint auto-fix where possible: `pnpm lint --filter @life-os/api lint --fix`
- Manual verification of auto-fixed imports to ensure no semantic changes

### Anti-Patterns
- Manually reordering when auto-fix can handle it
- Grouping imports incorrectly to bypass linter

### Imports/Exports
- No changes to import/export statements, only reordering

### Depends On
- None

### Blocks
- TASK-002 (TypeScript any fixes) - should complete import fixes first for cleaner diff

### Initial Analysis & Research Phase
1. Run `pnpm --filter @life-os/api lint` to get current error count
2. Run `pnpm --filter @life-os/api lint --fix` to auto-fix import order issues
3. Verify auto-fix did not break any imports
4. Re-run lint to confirm remaining import order errors

### Subtasks

#### TASK-001-001: Auto-fix Import Order Violations
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run `pnpm --filter @life-os/api lint --fix` to auto-fix all import order violations. Verify the output shows fixes applied. Re-run `pnpm --filter @life-os/api lint` to confirm import-x/order errors are resolved.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero import-x/order errors

#### TASK-001-002: Manual Fix Remaining Import Order Issues
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: If any import order errors remain after auto-fix, manually reorder imports in affected files following the builtin, external, internal, parent, sibling, index order with newlines between groups.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero import-x/order errors

#### TASK-001-003: Verify No Semantic Changes
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run `pnpm --filter @life-os/api typecheck` to ensure import reordering did not break type checking. Run relevant tests: `pnpm --filter @life-os/api test`.
- **VALIDATION**: Type check passes, tests pass

---

## TASK-002: Replace TypeScript `any` Types in API Package

- [x] STATUS: done
- PRIORITY: HIGH

### Related File Paths
- apps/api/src/lib/work-operations.test.ts
- apps/api/src/lib/work-operations.ts
- apps/api/src/routes/calendar/calendars.ts
- apps/api/src/routes/calendar/scheduling-links.ts
- apps/api/src/routes/integration.ts
- apps/api/src/routes/work/tasks.ts

### Definition of Done
- All `any` types in @life-os/api are replaced with proper TypeScript types
- ESLint passes for @life-os/api with zero @typescript-eslint/no-explicit-any errors
- Type checking passes
- Tests pass

### Out of Scope
- Changing function signatures that would break API contracts
- Adding new type definitions (use existing or create minimal new ones)

### Rules to Follow
- AGENTS.md: TypeScript strict mode enabled
- Use specific types from @life-os/database or @life-os/contracts where available
- Create minimal type definitions for truly unknown data structures
- Use `unknown` instead of `any` when type cannot be determined

### Advanced Coding Pattern
- Use Zod schema types from @life-os/contracts
- Use Drizzle ORM types from @life-os/database
- Use `Record<string, unknown>` for generic objects instead of `any`

### Anti-Patterns
- Using `as any` to bypass type checking
- Creating overly complex type definitions for simple cases

### Imports/Exports
- May need to import types from @life-os/contracts or @life-os/database

### Depends On
- TASK-001 (Import order fixes)

### Blocks
- None

### Initial Analysis & Research Phase
1. Read each file with `any` types to understand context
2. Identify what the `any` represents (e.g., database row, API response, config object)
3. Check if appropriate types exist in @life-os/contracts or @life-os/database
4. Determine if new type definitions are needed

### Subtasks

#### TASK-002-001: Analyze `any` Types in work-operations.test.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/work-operations.test.ts
- **ACTION**: Read lines 69, 510, 606 to understand what `any` represents. Check if test fixtures or schema types can be used instead. Document findings.
- **VALIDATION**: Document analysis showing what type should replace each `any`

#### TASK-002-002: Replace `any` Types in work-operations.test.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/work-operations.test.ts
- **ACTION**: Replace `any` types at lines 69, 510, 606 with appropriate types based on analysis. Import necessary types if needed.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero @typescript-eslint/no-explicit-any errors for this file

#### TASK-002-003: Analyze `any` Type in work-operations.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/work-operations.ts
- **ACTION**: Read line 120 to understand what `any` represents. Check if schema types from @life-os/database can be used. Document findings.
- **VALIDATION**: Document analysis showing what type should replace `any`

#### TASK-002-004: Replace `any` Type in work-operations.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/work-operations.ts
- **ACTION**: Replace `any` type at line 120 with appropriate type based on analysis. Import necessary types if needed.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero @typescript-eslint/no-explicit-any errors for this file

#### TASK-002-005: Replace `any` Types in calendar routes
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/routes/calendar/calendars.ts, apps/api/src/routes/calendar/scheduling-links.ts
- **ACTION**: Replace `any` types in calendars.ts (line 147) and scheduling-links.ts (lines 94, 105, 211) with appropriate types. Use Zod schema types or Drizzle types where available.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero @typescript-eslint/no-explicit-any errors for these files

#### TASK-002-006: Replace `any` Types in integration routes
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/routes/integration.ts
- **ACTION**: Replace `any` types at lines 113, 121, 151, 159, 188, 196 with appropriate types. Use Zod schema types from @life-os/contracts.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero @typescript-eslint/no-explicit-any errors for this file

#### TASK-002-007: Replace `any` Type in tasks route
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/routes/work/tasks.ts
- **ACTION**: Replace `any` type at line 216 with appropriate type. Use Zod schema types from @life-os/contracts.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero @typescript-eslint/no-explicit-any errors for this file

#### TASK-002-008: Verify All `any` Types Fixed in API
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run `pnpm --filter @life-os/api lint` to confirm all @typescript-eslint/no-explicit-any errors are resolved. Run `pnpm --filter @life-os/api typecheck` to ensure type safety.
- **VALIDATION**: Zero @typescript-eslint/no-explicit-any errors, type check passes

---

## TASK-003: Remove Unused Variables in API Package

- [x] STATUS: done
- PRIORITY: HIGH

### Related File Paths
- apps/api/src/routes/integration.ts
- apps/api/src/routes/work/projects.ts

### Definition of Done
- All unused variables are removed or used
- ESLint passes for @life-os/api with zero @typescript-eslint/no-unused-vars errors
- Code functionality unchanged

### Out of Scope
- Changing variable names for stylistic reasons
- Adding functionality to use unused variables (unless it makes sense)

### Rules to Follow
- Remove unused imports
- Use underscore prefix for intentionally unused parameters (e.g., `_res`)
- Remove unused variables entirely

### Advanced Coding Pattern
- Use ESLint auto-fix for simple cases
- Manual verification for complex cases

### Anti-Patterns
- Commenting out code instead of removing it
- Adding dummy usage to bypass linter

### Imports/Exports
- May remove unused imports

### Depends On
- TASK-001 (Import order fixes)

### Blocks
- None

### Initial Analysis & Research Phase
1. Read integration.ts line 74 to understand CreateTaskWithEventRequest context
2. Read projects.ts line 217 to understand underscore variable context
3. Determine if removal is safe or if variable should be used

### Subtasks

#### TASK-003-001: Analyze Unused Import in integration.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/routes/integration.ts
- **ACTION**: Read line 74 to understand why CreateTaskWithEventRequest is imported but unused. Check if it should be used or if import can be removed.
- **VALIDATION**: Document analysis showing whether to remove import or add usage

#### TASK-003-002: Fix Unused Import in integration.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/routes/integration.ts
- **ACTION**: Based on analysis, either remove the unused CreateTaskWithEventRequest import or add appropriate usage.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero @typescript-eslint/no-unused-vars errors for this file

#### TASK-003-003: Fix Unused Variable in projects.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/routes/work/projects.ts
- **ACTION**: Read line 217 to understand the underscore variable. If it's an intentionally unused parameter, ensure it's properly named with underscore prefix. If it's truly unused, remove it.
- **VALIDATION**: `pnpm --filter @life-os/api lint` should show zero @typescript-eslint/no-unused-vars errors for this file

#### TASK-003-004: Verify All Unused Variables Fixed in API
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run `pnpm --filter @life-os/api lint` to confirm all @typescript-eslint/no-unused-vars errors are resolved.
- **VALIDATION**: Zero @typescript-eslint/no-unused-vars errors

---

## TASK-004: Fix Import Order Violations in Mobile Package

- [x] STATUS: done
- PRIORITY: HIGH

### Related File Paths
- apps/mobile/src/hooks/useWork.ts

### Definition of Done
- All import order violations in @life-os/mobile are resolved
- ESLint passes for @life-os/mobile with zero import-x/order errors
- Code still compiles and tests pass after import reordering

### Out of Scope
- Changing import semantics (only reordering)
- Adding/removing imports (unless unused)

### Rules to Follow
- AGENTS.md import order rule: builtin, external, internal, parent, sibling, index
- Newlines between import groups
- Alphabetical imports within groups

### Advanced Coding Pattern
- Use ESLint auto-fix where possible: `pnpm lint --filter @life-os/mobile lint --fix`
- Manual verification of auto-fixed imports

### Anti-Patterns
- Manually reordering when auto-fix can handle it

### Imports/Exports
- No changes to import/export statements, only reordering

### Depends On
- None

### Blocks
- TASK-005 (TypeScript fixes) - should complete import fixes first

### Initial Analysis & Research Phase
1. Run `pnpm --filter @life-os/mobile lint` to get current error count
2. Run `pnpm --filter @life-os/mobile lint --fix` to auto-fix import order issues
3. Verify auto-fix did not break any imports
4. Re-run lint to confirm remaining import order errors

### Subtasks

#### TASK-004-001: Auto-fix Import Order Violations
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/
- **ACTION**: Run `pnpm --filter @life-os/mobile lint --fix` to auto-fix import order violations. Verify the output shows fixes applied. Re-run `pnpm --filter @life-os/mobile lint` to confirm import-x/order errors are resolved.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` should show zero import-x/order errors

#### TASK-004-002: Manual Fix Remaining Import Order Issues
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/
- **ACTION**: If any import order errors remain after auto-fix, manually reorder imports in affected files following the builtin, external, internal, parent, sibling, index order with newlines between groups.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` should show zero import-x/order errors

#### TASK-004-003: Verify No Semantic Changes
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/
- **ACTION**: Run `pnpm --filter @life-os/mobile typecheck` to ensure import reordering did not break type checking. Run relevant tests: `pnpm --filter @life-os/mobile test`.
- **VALIDATION**: Type check passes, tests pass

---

## TASK-005: Replace @ts-ignore with @ts-expect-error in Mobile Package

- [x] STATUS: done
- PRIORITY: HIGH

### Related File Paths
- apps/mobile/src/lib/powersync/database.ts
- apps/mobile/src/hooks/useWork.ts
- apps/mobile/src/lib/command-queue.ts

### Definition of Done
- All `@ts-ignore` comments are replaced with `@ts-expect-error`
- ESLint passes for @life-os/mobile with zero @typescript-eslint/ban-ts-comment errors
- Code still compiles and functions correctly

### Out of Scope
- Removing the suppression entirely (unless safe to do so)
- Changing the suppressed error logic

### Rules to Follow
- AGENTS.md: Use @ts-expect-error instead of @ts-ignore
- @ts-expect-error ensures the error actually exists
- @ts-ignore silently suppresses even if no error exists

### Advanced Coding Pattern
- Replace `@ts-ignore` with `@ts-expect-error` line by line
- Verify each replacement still compiles (error should exist)

### Anti-Patterns
- Using @ts-ignore for convenience
- Suppressing errors that should be fixed properly

### Imports/Exports
- No changes

### Depends On
- TASK-004 (Import order fixes)

### Blocks
- TASK-006 (Floating promises)

### Initial Analysis & Research Phase
1. Read each file with @ts-ignore to understand what error is being suppressed
2. Verify the error still exists (otherwise @ts-expect-error will fail)
3. Document why each suppression is needed

### Subtasks

#### TASK-005-001: Analyze @ts-ignore in database.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/powersync/database.ts
- **ACTION**: Read lines 182, 184, 186, 188, 190, 192 to understand what errors are being suppressed. Document why each suppression is necessary.
- **VALIDATION**: Document analysis for each @ts-ignore usage

#### TASK-005-002: Replace @ts-ignore in database.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/powersync/database.ts
- **ACTION**: Replace all `@ts-ignore` with `@ts-expect-error` at lines 182, 184, 186, 188, 190, 192. Verify compilation succeeds (errors should still exist).
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` should show zero @typescript-eslint/ban-ts-comment errors for this file

#### TASK-005-003: Analyze @ts-ignore in useWork.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/hooks/useWork.ts
- **ACTION**: Read lines 62, 89 to understand what errors are being suppressed. Document why each suppression is necessary.
- **VALIDATION**: Document analysis for each @ts-ignore usage

#### TASK-005-004: Replace @ts-ignore in useWork.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/hooks/useWork.ts
- **ACTION**: Replace all `@ts-ignore` with `@ts-expect-error` at lines 62, 89. Verify compilation succeeds.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` should show zero @typescript-eslint/ban-ts-comment errors for this file

#### TASK-005-005: Analyze @ts-ignore in command-queue.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/command-queue.ts
- **ACTION**: Read lines 60, 74, 88, 116, 125, 144 to understand what errors are being suppressed. Document why each suppression is necessary.
- **VALIDATION**: Document analysis for each @ts-ignore usage

#### TASK-005-006: Replace @ts-ignore in command-queue.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/command-queue.ts
- **ACTION**: Replace all `@ts-ignore` with `@ts-expect-error` at lines 60, 74, 88, 116, 125, 144. Verify compilation succeeds.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` should show zero @typescript-eslint/ban-ts-comment errors for this file

#### TASK-005-007: Verify All @ts-ignore Replaced in Mobile
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/
- **ACTION**: Run `pnpm --filter @life-os/mobile lint` to confirm all @typescript-eslint/ban-ts-comment errors are resolved.
- **VALIDATION**: Zero @typescript-eslint/ban-ts-comment errors

---

## TASK-006: Fix Floating Promises in Mobile Package

- [x] STATUS: done
- PRIORITY: HIGH

### Related File Paths
- apps/mobile/src/hooks/useWork.ts
- apps/mobile/src/lib/powersync/provider.tsx

### Definition of Done
- All floating promises are properly handled with await, .catch(), or void operator
- ESLint passes for @life-os/mobile with zero @typescript-eslint/no-floating-promises errors
- Promise errors are properly handled or explicitly ignored

### Out of Scope
- Changing promise logic (only adding error handling)
- Adding complex error handling where simple void is appropriate

### Rules to Follow
- AGENTS.md: Promises must be awaited, end with .catch, end with .then with rejection handler, or be explicitly marked as ignored with void operator
- Use void for intentionally fire-and-forget operations
- Use .catch() for error handling
- Use await for sequential operations

### Advanced Coding Pattern
- Use void for fire-and-forget: `void someAsyncOperation()`
- Use .catch() for error logging: `someAsyncOperation().catch(console.error)`
- Use await when result is needed

### Anti-Patterns
- Ignoring promises without void (silent failures)
- Adding empty .catch() to bypass linter

### Imports/Exports
- No changes

### Depends On
- TASK-005 (@ts-ignore fixes)

### Blocks
- TASK-007 (TypeScript any fixes)

### Initial Analysis & Research Phase
1. Read each floating promise to understand if it should be awaited, caught, or voided
2. Determine if error handling is needed or if fire-and-forget is appropriate
3. Document decision for each floating promise

### Subtasks

#### TASK-006-001: Analyze Floating Promises in useWork.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/hooks/useWork.ts
- **ACTION**: Read lines 128, 166, 189, 211 to understand the floating promises. Determine if each should be awaited, caught, or voided. Document analysis.
- **VALIDATION**: Document analysis for each floating promise

#### TASK-006-002: Fix Floating Promises in useWork.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/hooks/useWork.ts
- **ACTION**: Based on analysis, fix floating promises at lines 128, 166, 189, 211 with appropriate await, .catch(), or void operator.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` should show zero @typescript-eslint/no-floating-promises errors for this file

#### TASK-006-003: Analyze Floating Promise in provider.tsx
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/powersync/provider.tsx
- **ACTION**: Read line 70 to understand the floating promise. Determine if it should be awaited, caught, or voided. Document analysis.
- **VALIDATION**: Document analysis for the floating promise

#### TASK-006-004: Fix Floating Promise in provider.tsx
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/powersync/provider.tsx
- **ACTION**: Based on analysis, fix floating promise at line 70 with appropriate await, .catch(), or void operator.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` should show zero @typescript-eslint/no-floating-promises errors for this file

#### TASK-006-005: Verify All Floating Promises Fixed in Mobile
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/
- **ACTION**: Run `pnpm --filter @life-os/mobile lint` to confirm all @typescript-eslint/no-floating-promises errors are resolved.
- **VALIDATION**: Zero @typescript-eslint/no-floating-promises errors

---

## TASK-007: Replace TypeScript `any` Types in Mobile Package

- [x] STATUS: done
- PRIORITY: HIGH

### Related File Paths
- apps/mobile/src/lib/command-queue.ts

### Definition of Done
- All `any` types in @life-os/mobile are replaced with proper TypeScript types
- ESLint passes for @life-os/mobile with zero @typescript-eslint/no-explicit-any errors
- Type checking passes
- Tests pass

### Out of Scope
- Changing function signatures that would break app functionality
- Adding new type definitions (use existing or create minimal new ones)

### Rules to Follow
- AGENTS.md: TypeScript strict mode enabled
- Use specific types from @life-os/mobile-data or @life-os/contracts where available
- Create minimal type definitions for truly unknown data structures
- Use `unknown` instead of `any` when type cannot be determined

### Advanced Coding Pattern
- Use Zod schema types from @life-os/contracts
- Use PowerSync schema types from @life-os/mobile-data
- Use `Record<string, unknown>` for generic objects instead of `any`

### Anti-Patterns
- Using `as any` to bypass type checking
- Creating overly complex type definitions for simple cases

### Imports/Exports
- May need to import types from @life-os/contracts or @life-os/mobile-data

### Depends On
- TASK-006 (Floating promises fixes)

### Blocks
- None

### Initial Analysis & Research Phase
1. Read command-queue.ts lines 53, 73, 143 to understand what `any` represents
2. Check if appropriate types exist in @life-os/mobile-data or @life-os/contracts
3. Determine if new type definitions are needed

### Subtasks

#### TASK-007-001: Analyze `any` Types in command-queue.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/command-queue.ts
- **ACTION**: Read lines 53, 73, 143 to understand what `any` represents. Check if PowerSync schema types or Zod types can be used instead. Document findings.
- **VALIDATION**: Document analysis showing what type should replace each `any`

#### TASK-007-002: Replace `any` Types in command-queue.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/command-queue.ts
- **ACTION**: Replace `any` types at lines 53, 73, 143 with appropriate types based on analysis. Import necessary types if needed.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` should show zero @typescript-eslint/no-explicit-any errors for this file

#### TASK-007-003: Verify All `any` Types Fixed in Mobile
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/
- **ACTION**: Run `pnpm --filter @life-os/mobile lint` to confirm all @typescript-eslint/no-explicit-any errors are resolved. Run `pnpm --filter @life-os/mobile typecheck` to ensure type safety.
- **VALIDATION**: Zero @typescript-eslint/no-explicit-any errors, type check passes

---

## TASK-008: Fix Formatting Issues

- [ ] STATUS: ready
- PRIORITY: MEDIUM

### Related File Paths
- apps/mobile/.expo/types/router.d.ts

### Definition of Done
- All formatting issues are resolved
- Prettier check passes for entire project
- No code style issues remain

### Out of Scope
- Changing code structure (only formatting)
- Modifying generated files that should be in .gitignore

### Rules to Follow
- AGENTS.md: Prettier 3.9.x with specific config
- Run `pnpm format` to fix formatting
- Verify generated files are in .gitignore if they shouldn't be committed

### Advanced Coding Pattern
- Use Prettier auto-fix: `pnpm format`
- Consider adding generated files to .gitignore if they shouldn't be manually formatted

### Anti-Patterns
- Manually formatting when Prettier can handle it
- Committing generated type files

### Imports/Exports
- No changes

### Depends On
- None

### Blocks
- None

### Initial Analysis & Research Phase
1. Check if apps/mobile/.expo/types/router.d.ts is a generated file
2. Check if it's in .gitignore
3. Determine if it should be formatted or ignored

### Subtasks

#### TASK-008-001: Analyze router.d.ts File
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/.expo/types/router.d.ts, .gitignore
- **ACTION**: Check if router.d.ts is a generated file by Expo. Check if .expo/types/ is in .gitignore. Document findings.
- **VALIDATION**: Document analysis showing whether file should be formatted or ignored

#### TASK-008-002: Update .gitignore if Needed
- **ASSIGNMENT**: AGENT
- **FILE**: .gitignore
- **ACTION**: If router.d.ts is a generated file and not in .gitignore, add `.expo/types/` to .gitignore.
- **VALIDATION**: File is in .gitignore if it's generated

#### TASK-008-003: Run Prettier Format
- **ASSIGNMENT**: AGENT
- **FILE**: All files
- **ACTION**: Run `pnpm format` to fix all formatting issues. Verify the output shows files formatted.
- **VALIDATION**: `pnpm format:check` should pass

#### TASK-008-004: Verify Formatting Fixed
- **ASSIGNMENT**: AGENT
- **FILE**: All files
- **ACTION**: Run `pnpm format:check` to confirm all formatting issues are resolved.
- **VALIDATION**: `pnpm format:check` passes with exit code 0

---

## TASK-009: Split Long File - work-operations.ts

- [ ] STATUS: ready
- PRIORITY: MEDIUM

### Related File Paths
- apps/api/src/lib/work-operations.ts (3712 lines)

### Definition of Done
- work-operations.ts is split into smaller, focused modules
- Each module has a single responsibility
- All imports are updated in dependent files
- Tests pass after refactoring
- ESLint and type checking pass

### Out of Scope
- Changing business logic (only moving code)
- Changing function signatures (unless necessary for module boundaries)
- Changing API contracts

### Rules to Follow
- AGENTS.md: Deep modules, single responsibility
- Module size should be under 400 lines
- Each module should have clear responsibility
- Maintain existing exports for backward compatibility

### Advanced Coding Pattern
- Extract related functions into domain-specific modules (e.g., task-operations.ts, project-operations.ts, dependency-operations.ts)
- Use barrel exports (index.ts) to maintain backward compatibility
- Keep shared utilities in work-operations.ts or separate utils module

### Anti-Patterns
- Splitting arbitrarily without considering domain boundaries
- Creating circular dependencies between modules
- Breaking existing imports without updating them

### Imports/Exports
- Will create new modules with exports
- Will update imports in dependent files
- May create barrel index.ts for backward compatibility

### Depends On
- TASK-001 through TASK-003 (API lint fixes)

### Blocks
- TASK-010 (calendar-operations.ts split)

### Initial Analysis & Research Phase
1. Read work-operations.ts to understand structure
2. Identify logical groupings of functions (e.g., project operations, task operations, dependency operations)
3. Map dependencies between functions
4. Plan module boundaries to avoid circular dependencies
5. Identify all files that import from work-operations.ts

### Subtasks

#### TASK-009-001: Analyze work-operations.ts Structure
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/work-operations.ts
- **ACTION**: Read the entire file to understand function groupings. Identify logical domains (e.g., projects, tasks, dependencies, notes, assignees, comments, attachments, time entries). Document proposed module structure.
- **VALIDATION**: Document analysis with proposed module structure and file sizes

#### TASK-009-002: Identify Dependent Files
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Search for all files that import from work-operations.ts using grep. Document the imports to understand what needs to be updated after split.
- **VALIDATION**: Document all dependent files and their imports

#### TASK-009-003: Create task-operations.ts Module
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/task-operations.ts
- **ACTION**: Extract task-related functions from work-operations.ts into new task-operations.ts module. Add module header documentation following AGENTS.md conventions.
- **VALIDATION**: Module compiles, exports are correct

#### TASK-009-004: Create project-operations.ts Module
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/project-operations.ts
- **ACTION**: Extract project-related functions from work-operations.ts into new project-operations.ts module. Add module header documentation.
- **VALIDATION**: Module compiles, exports are correct

#### TASK-009-005: Create dependency-operations.ts Module
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/dependency-operations.ts
- **ACTION**: Extract dependency-related functions from work-operations.ts into new dependency-operations.ts module. Add module header documentation.
- **VALIDATION**: Module compiles, exports are correct

#### TASK-009-006: Create Additional Modules as Needed
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/
- **ACTION**: Based on analysis, create additional modules for other function groupings (e.g., note-operations.ts, assignee-operations.ts). Add module header documentation.
- **VALIDATION**: All modules compile, exports are correct

#### TASK-009-007: Update work-operations.ts to Re-export
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/work-operations.ts
- **ACTION**: Update work-operations.ts to re-export from new modules for backward compatibility. Keep shared utilities and transaction wrapper in this file.
- **VALIDATION**: File compiles, exports match original

#### TASK-009-008: Update Dependent File Imports
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Update imports in dependent files to import from specific modules where appropriate. Use work-operations.ts for backward compatibility where needed.
- **VALIDATION**: All dependent files compile

#### TASK-009-009: Verify Tests Pass After Split
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run `pnpm --filter @life-os/api test` to ensure all tests pass after refactoring. Run `pnpm --filter @life-os/api typecheck` to ensure type safety.
- **VALIDATION**: All tests pass, type check passes

#### TASK-009-010: Verify Lint Passes After Split
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run `pnpm --filter @life-os/api lint` to ensure no new lint errors after refactoring.
- **VALIDATION**: Lint passes with zero errors

---

## TASK-010: Split Long File - calendar-operations.ts

- [ ] STATUS: ready
- PRIORITY: MEDIUM

### Related File Paths
- apps/api/src/lib/calendar-operations.ts (2055 lines)

### Definition of Done
- calendar-operations.ts is split into smaller, focused modules
- Each module has a single responsibility
- All imports are updated in dependent files
- Tests pass after refactoring
- ESLint and type checking pass

### Out of Scope
- Changing business logic (only moving code)
- Changing function signatures (unless necessary for module boundaries)
- Changing API contracts

### Rules to Follow
- AGENTS.md: Deep modules, single responsibility
- Module size should be under 400 lines
- Each module should have clear responsibility
- Maintain existing exports for backward compatibility

### Advanced Coding Pattern
- Extract related functions into domain-specific modules (e.g., event-operations.ts, calendar-operations.ts, scheduling-operations.ts)
- Use barrel exports (index.ts) to maintain backward compatibility
- Keep shared utilities in calendar-operations.ts or separate utils module

### Anti-Patterns
- Splitting arbitrarily without considering domain boundaries
- Creating circular dependencies between modules
- Breaking existing imports without updating them

### Imports/Exports
- Will create new modules with exports
- Will update imports in dependent files
- May create barrel index.ts for backward compatibility

### Depends On
- TASK-009 (work-operations.ts split - learn from experience)

### Blocks
- None

### Initial Analysis & Research Phase
1. Read calendar-operations.ts to understand structure
2. Identify logical groupings of functions (e.g., events, calendars, scheduling, availability)
3. Map dependencies between functions
4. Plan module boundaries to avoid circular dependencies
5. Identify all files that import from calendar-operations.ts

### Subtasks

#### TASK-010-001: Analyze calendar-operations.ts Structure
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/calendar-operations.ts
- **ACTION**: Read the entire file to understand function groupings. Identify logical domains (e.g., events, calendars, scheduling links, availability). Document proposed module structure.
- **VALIDATION**: Document analysis with proposed module structure and file sizes

#### TASK-010-002: Identify Dependent Files
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Search for all files that import from calendar-operations.ts using grep. Document the imports to understand what needs to be updated after split.
- **VALIDATION**: Document all dependent files and their imports

#### TASK-010-003: Create event-operations.ts Module
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/event-operations.ts
- **ACTION**: Extract event-related functions from calendar-operations.ts into new event-operations.ts module. Add module header documentation following AGENTS.md conventions.
- **VALIDATION**: Module compiles, exports are correct

#### TASK-010-004: Create calendar-crud-operations.ts Module
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/calendar-crud-operations.ts
- **ACTION**: Extract calendar CRUD functions from calendar-operations.ts into new calendar-crud-operations.ts module. Add module header documentation.
- **VALIDATION**: Module compiles, exports are correct

#### TASK-010-005: Create Additional Modules as Needed
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/
- **ACTION**: Based on analysis, create additional modules for other function groupings (e.g., scheduling-operations.ts, availability-operations.ts). Add module header documentation.
- **VALIDATION**: All modules compile, exports are correct

#### TASK-010-006: Update calendar-operations.ts to Re-export
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/calendar-operations.ts
- **ACTION**: Update calendar-operations.ts to re-export from new modules for backward compatibility. Keep shared utilities and transaction wrapper in this file.
- **VALIDATION**: File compiles, exports match original

#### TASK-010-007: Update Dependent File Imports
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Update imports in dependent files to import from specific modules where appropriate. Use calendar-operations.ts for backward compatibility where needed.
- **VALIDATION**: All dependent files compile

#### TASK-010-008: Verify Tests Pass After Split
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run `pnpm --filter @life-os/api test` to ensure all tests pass after refactoring. Run `pnpm --filter @life-os/api typecheck` to ensure type safety.
- **VALIDATION**: All tests pass, type check passes

#### TASK-010-009: Verify Lint Passes After Split
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run `pnpm --filter @life-os/api lint` to ensure no new lint errors after refactoring.
- **VALIDATION**: Lint passes with zero errors

---

## TASK-011: Reduce Deep Nesting in API Package

- [ ] STATUS: ready
- PRIORITY: MEDIUM

### Related File Paths
- apps/api/src/lib/work-operations.ts
- apps/api/src/lib/calendar-operations.ts
- apps/api/src/routes/integration.ts
- apps/api/src/routes/work/*.ts

### Definition of Done
- Deep nesting (4+ levels) is reduced in API package
- Code uses early returns and guard clauses
- Functions are extracted to reduce nesting
- ESLint and type checking pass
- Tests pass

### Out of Scope
- Changing business logic (only restructuring)
- Changing function signatures

### Rules to Follow
- AGENTS.md: Code quality, readability
- Use early returns to reduce nesting
- Extract nested logic into separate functions
- Use guard clauses for precondition checks

### Advanced Coding Pattern
- Early return pattern: `if (!condition) return;`
- Guard clause pattern: `if (!isValid) throw new Error();`
- Extract function pattern: Move nested blocks to named functions

### Anti-Patterns
- Deep nesting for simple conditions
- Nested ternary operators
- Arrow functions in nested callbacks

### Imports/Exports
- May create new helper functions
- No changes to existing exports

### Depends On
- TASK-009, TASK-010 (File splits - easier to refactor smaller files)

### Blocks
- None

### Initial Analysis & Research Phase
1. Identify files with 4+ levels of nesting (already identified in audit)
2. For each file, identify deeply nested blocks
3. Determine if early returns or extracted functions would help
4. Plan refactoring approach

### Subtasks

#### TASK-011-001: Analyze Deep Nesting in work-operations.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/work-operations.ts
- **ACTION**: Search for lines with 4+ levels of indentation. Identify deeply nested blocks. Document which can be reduced with early returns or extracted functions.
- **VALIDATION**: Document analysis with refactoring plan

#### TASK-011-002: Reduce Nesting in work-operations.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/work-operations.ts
- **ACTION**: Apply early returns, guard clauses, and function extraction to reduce deep nesting. Focus on business logic, not data structures.
- **VALIDATION**: `pnpm --filter @life-os/api lint` passes, tests pass

#### TASK-011-003: Analyze Deep Nesting in calendar-operations.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/calendar-operations.ts
- **ACTION**: Search for lines with 4+ levels of indentation. Identify deeply nested blocks. Document which can be reduced with early returns or extracted functions.
- **VALIDATION**: Document analysis with refactoring plan

#### TASK-011-004: Reduce Nesting in calendar-operations.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/lib/calendar-operations.ts
- **ACTION**: Apply early returns, guard clauses, and function extraction to reduce deep nesting. Focus on business logic.
- **VALIDATION**: `pnpm --filter @life-os/api lint` passes, tests pass

#### TASK-011-005: Reduce Nesting in API Routes
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/routes/
- **ACTION**: For each route file with deep nesting (integration.ts, work/*.ts), apply early returns and guard clauses to reduce nesting.
- **VALIDATION**: `pnpm --filter @life-os/api lint` passes, tests pass

#### TASK-011-006: Verify All Nesting Reduced
- **ASSIGNMENT**: AGENT
- **FILE**: apps/api/src/
- **ACTION**: Run grep for 4+ levels of indentation to verify deep nesting is reduced in business logic files.
- **VALIDATION**: Minimal deep nesting remains in business logic

---

## TASK-012: Reduce Deep Nesting in Web Package

- [ ] STATUS: ready
- PRIORITY: LOW

### Related File Paths
- apps/web/src/app/work/components/*.tsx
- apps/web/src/app/calendar/components/*.tsx

### Definition of Done
- Deep nesting (4+ levels) is reduced in web components
- Code uses early returns and guard clauses
- Components are extracted to reduce nesting
- ESLint and type checking pass
- Tests pass

### Out of Scope
- Changing component behavior (only restructuring)
- Changing component props

### Rules to Follow
- AGENTS.md: Code quality, readability
- Use early returns in React components
- Extract nested JSX into separate components
- Use guard clauses for conditional rendering

### Advanced Coding Pattern
- Early return in React: `if (!data) return <Loading />`
- Extract component: Move nested JSX to named component
- Conditional rendering: `condition && <Component />`

### Anti-Patterns
- Deep nesting for conditional rendering
- Nested ternary operators in JSX
- Complex inline logic in JSX

### Imports/Exports
- May create new helper components
- No changes to existing exports

### Depends On
- None

### Blocks
- None

### Initial Analysis & Research Phase
1. Identify component files with 4+ levels of nesting
2. For each file, identify deeply nested blocks
3. Determine if early returns or extracted components would help
4. Plan refactoring approach

### Subtasks

#### TASK-012-001: Analyze Deep Nesting in Web Components
- **ASSIGNMENT**: AGENT
- **FILE**: apps/web/src/app/
- **ACTION**: Search for lines with 4+ levels of indentation in work and calendar components. Identify deeply nested blocks. Document refactoring plan.
- **VALIDATION**: Document analysis with refactoring plan

#### TASK-012-002: Reduce Nesting in Work Components
- **ASSIGNMENT**: AGENT
- **FILE**: apps/web/src/app/work/components/
- **ACTION**: Apply early returns and component extraction to reduce deep nesting in work components.
- **VALIDATION**: `pnpm --filter @life-os/web lint` passes, tests pass

#### TASK-012-003: Reduce Nesting in Calendar Components
- **ASSIGNMENT**: AGENT
- **FILE**: apps/web/src/app/calendar/components/
- **ACTION**: Apply early returns and component extraction to reduce deep nesting in calendar components.
- **VALIDATION**: `pnpm --filter @life-os/web lint` passes, tests pass

#### TASK-012-004: Verify All Nesting Reduced in Web
- **ASSIGNMENT**: AGENT
- **FILE**: apps/web/src/
- **ACTION**: Run grep for 4+ levels of indentation to verify deep nesting is reduced in web components.
- **VALIDATION**: Minimal deep nesting remains in web components

---

## TASK-013: Reduce Deep Nesting in Mobile Package

- [ ] STATUS: ready
- PRIORITY: LOW

### Related File Paths
- apps/mobile/src/contexts/AuthContext.tsx
- apps/mobile/src/hooks/useWork.ts
- apps/mobile/src/lib/powersync/database.ts
- apps/mobile/src/lib/command-queue.ts

### Definition of Done
- Deep nesting (4+ levels) is reduced in mobile package
- Code uses early returns and guard clauses
- Functions are extracted to reduce nesting
- ESLint and type checking pass
- Tests pass

### Out of Scope
- Changing business logic (only restructuring)
- Changing function signatures

### Rules to Follow
- AGENTS.md: Code quality, readability
- Use early returns to reduce nesting
- Extract nested logic into separate functions
- Use guard clauses for precondition checks

### Advanced Coding Pattern
- Early return pattern: `if (!condition) return;`
- Guard clause pattern: `if (!isValid) throw new Error();`
- Extract function pattern: Move nested blocks to named functions

### Anti-Patterns
- Deep nesting for simple conditions
- Nested ternary operators
- Arrow functions in nested callbacks

### Imports/Exports
- May create new helper functions
- No changes to existing exports

### Depends On
- TASK-004 through TASK-007 (Mobile lint fixes)

### Blocks
- None

### Initial Analysis & Research Phase
1. Identify files with 4+ levels of nesting (already identified in audit)
2. For each file, identify deeply nested blocks
3. Determine if early returns or extracted functions would help
4. Plan refactoring approach

### Subtasks

#### TASK-013-001: Analyze Deep Nesting in Mobile Files
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/
- **ACTION**: Search for lines with 4+ levels of indentation in identified files. Identify deeply nested blocks. Document refactoring plan.
- **VALIDATION**: Document analysis with refactoring plan

#### TASK-013-002: Reduce Nesting in AuthContext.tsx
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/contexts/AuthContext.tsx
- **ACTION**: Apply early returns and function extraction to reduce deep nesting.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` passes, tests pass

#### TASK-013-003: Reduce Nesting in useWork.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/hooks/useWork.ts
- **ACTION**: Apply early returns and function extraction to reduce deep nesting.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` passes, tests pass

#### TASK-013-004: Reduce Nesting in PowerSync Files
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/powersync/
- **ACTION**: Apply early returns and function extraction to reduce deep nesting in database.ts and provider.tsx.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` passes, tests pass

#### TASK-013-005: Reduce Nesting in command-queue.ts
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/lib/command-queue.ts
- **ACTION**: Apply early returns and function extraction to reduce deep nesting.
- **VALIDATION**: `pnpm --filter @life-os/mobile lint` passes, tests pass

#### TASK-013-006: Verify All Nesting Reduced in Mobile
- **ASSIGNMENT**: AGENT
- **FILE**: apps/mobile/src/
- **ACTION**: Run grep for 4+ levels of indentation to verify deep nesting is reduced in mobile files.
- **VALIDATION**: Minimal deep nesting remains in mobile files

---

## TASK-014: Final Verification and Documentation Update

- [ ] STATUS: ready
- PRIORITY: HIGH

### Related File Paths
- All files modified during remediation
- TODO.md (this file)

### Definition of Done
- All lint errors are resolved across all packages
- All formatting issues are resolved
- All tests pass
- Type checking passes for all packages
- TODO.md is updated with completion status
- AGENTS.md is reviewed for any needed updates based on remediation

### Out of Scope
- Adding new features
- Changing project structure beyond remediation

### Rules to Follow
- AGENTS.md: Code quality standards
- Run full validation: `pnpm validate`
- Update documentation to reflect lessons learned

### Advanced Coding Pattern
- Full project validation
- Documentation updates
- Commit changes with conventional commits

### Anti-Patterns
- Skipping final verification
- Not updating documentation

### Imports/Exports
- No changes

### Depends On
- All previous tasks (TASK-001 through TASK-013)

### Blocks
- None

### Initial Analysis & Research Phase
1. Review all completed tasks
2. Identify any remaining issues
3. Plan final verification steps
4. Plan documentation updates

### Subtasks

#### TASK-014-001: Run Full Lint Check
- **ASSIGNMENT**: AGENT
- **FILE**: All packages
- **ACTION**: Run `pnpm lint` to verify all lint errors are resolved across all packages.
- **VALIDATION**: `pnpm lint` passes with zero errors

#### TASK-014-002: Run Full Format Check
- **ASSIGNMENT**: AGENT
- **FILE**: All files
- **ACTION**: Run `pnpm format:check` to verify all formatting issues are resolved.
- **VALIDATION**: `pnpm format:check` passes with exit code 0

#### TASK-014-003: Run Full Type Check
- **ASSIGNMENT**: AGENT
- **FILE**: All packages
- **ACTION**: Run `pnpm typecheck` to verify type safety across all packages.
- **VALIDATION**: `pnpm typecheck` passes with zero errors

#### TASK-014-004: Run Full Test Suite
- **ASSIGNMENT**: AGENT
- **FILE**: All packages
- **ACTION**: Run `pnpm test` to verify all tests pass after remediation.
- **VALIDATION**: `pnpm test` passes with zero failures

#### TASK-014-005: Run Full Validation
- **ASSIGNMENT**: AGENT
- **FILE**: All packages
- **ACTION**: Run `pnpm validate` to run full module validation (lint, typecheck, test).
- **VALIDATION**: `pnpm validate` passes with zero errors

#### TASK-014-006: Update TODO.md with Completion Status
- **ASSIGNMENT**: AGENT
- **FILE**: TODO.md
- **ACTION**: Update all task checkboxes to [x] and status to completed. Add summary of remediation results.
- **VALIDATION**: TODO.md reflects all completed tasks

#### TASK-014-007: Review AGENTS.md for Updates
- **ASSIGNMENT**: AGENT
- **FILE**: AGENTS.md
- **ACTION**: Review AGENTS.md to determine if any updates are needed based on lessons learned from remediation (e.g., add rules about file size, nesting depth). Document findings.
- **VALIDATION**: Document analysis showing whether AGENTS.md needs updates

#### TASK-014-008: Update AGENTS.md if Needed
- **ASSIGNMENT**: AGENT
- **FILE**: AGENTS.md
- **ACTION**: If analysis shows AGENTS.md needs updates (e.g., adding file size limits, nesting depth rules), update the document accordingly.
- **VALIDATION**: AGENTS.md reflects best practices from remediation

#### TASK-014-009: Create Remediation Summary
- **ASSIGNMENT**: AGENT
- **FILE**: docs/code-health-remediation-summary.md
- **ACTION**: Create a summary document of the code health remediation, including what was fixed, lessons learned, and recommendations for future development.
- **VALIDATION**: Summary document is comprehensive and actionable

---

## Appendix: Quick Reference

### Validation Commands
- Full lint: `pnpm lint`
- Package lint: `pnpm --filter @life-os/[package] lint`
- Auto-fix lint: `pnpm --filter @life-os/[package] lint --fix`
- Format check: `pnpm format:check`
- Format fix: `pnpm format`
- Type check: `pnpm typecheck`
- Package type check: `pnpm --filter @life-os/[package] typecheck`
- Test: `pnpm test`
- Package test: `pnpm --filter @life-os/[package] test`
- Full validation: `pnpm validate`

### Package Names
- @life-os/api
- @life-os/web
- @life-os/mobile
- @life-os/worker
- @life-os/contracts
- @life-os/database
- @life-os/api-client
- @life-os/mobile-data
- @life-os/ui

### AGENTS.md Key Rules
- Import order: builtin, external, internal, parent, sibling, index
- No circular dependencies
- TypeScript strict mode
- ESLint 10 with flat config
- Prettier 3.9.x for formatting
- Use @ts-expect-error instead of @ts-ignore
- Handle promises with await, .catch(), or void
- No unused variables or imports
- No any types (use specific types or unknown)
