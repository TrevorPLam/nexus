# TODO - Life OS Monorepo

Generated from codebase TODO assessment on 2026-07-23

## Legend

- [ ] = Incomplete
- [x] = Complete
- Status: ready | IN_PROGRESS | BLOCKED | COMPLETED
- AGENT = AI can execute
- HUMAN = Requires human intervention

---

## TASK-001: Remove deprecated calendar-operations function

- [x] TASK-001
- Status: done
- Related Files: `apps/api/src/lib/calendar-operations.ts`
- Definition of Done: Deprecated function removed, no callers remain, tests pass
- Out of Scope: None
- Rules to Follow: 
  - Verify no active callers exist before removal
  - Run calendar operations tests after removal
  - Commit with message: "refactor: remove deprecated bookSlot function"
- Advanced Coding Pattern: Dead code elimination
- Anti-Patterns: Removing code without verifying callers
- Imports/Exports: None affected
- Depends On: None
- Blocks: None

### Subtasks

- [x] TASK-001-001 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Search codebase for all references to the deprecated function name to verify no active callers exist. Use grep to search function name across entire codebase.

- [x] TASK-001-002 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Read the file around line 2137 to identify the exact function to remove, including its full signature and implementation.

- [x] TASK-001-003 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Remove the deprecated function and its associated comment. Ensure no other code depends on it.

- [x] TASK-001-004 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Run calendar operations tests to verify removal doesn't break functionality: `pnpm --filter @life-os/api test -- calendar-operations`

- [x] TASK-001-005 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Run type checking: `pnpm --filter @life-os/api typecheck`

- [x] TASK-001-006 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Update code-commentary.md to document the removal if this function was mentioned there.

---

## TASK-002: Implement command pattern with transaction wrapping

- [x] TASK-002
- Status: done
- Related Files: `apps/api/src/lib/command.test.ts`, `apps/api/src/lib/command-context.ts`
- Definition of Done: Command pattern implemented, all mutations wrapped in transactions, rollback on failure, tests pass
- Out of Scope: Calendar command pattern (separate task)
- Rules to Follow:
  - Use Zod for validation at command boundaries
  - Implement idempotency key checking
  - Atomic commit of domain + audit + outbox
  - Follow AGENTS.md architecture patterns
- Advanced Coding Pattern: Command pattern with Unit of Work
- Anti-Patterns: Partial commits, missing rollback logic
- Imports/Exports: Export command executor, command types
- Depends On: None
- Blocks: TASK-003, TASK-004, TASK-005

### Subtasks

- [x] TASK-002-001 | AGENT | `apps/api/src/lib/command.test.ts`
  Read the existing test file to understand the expected command pattern interface and requirements.

- [x] TASK-002-002 | AGENT | `apps/api/src/lib/command-context.ts`
  Command executor module already exists with transaction wrapping capability. Interface for command execution with rollback support already designed.

- [x] TASK-002-003 | AGENT | `apps/api/src/lib/idempotency.ts`
  Idempotency key checking already implemented before command execution. Keys stored in database with TTL.

- [x] TASK-002-004 | AGENT | `apps/api/src/lib/command-context.ts`
  Cached response return for duplicate idempotency keys already implemented.

- [x] TASK-002-005 | AGENT | `apps/api/src/lib/command-context.ts`
  Atomic commit of domain writes + audit log + outbox events in single transaction already implemented.

- [x] TASK-002-006 | AGENT | `apps/api/src/lib/command-context.ts`
  Rollback of audit/outbox on domain write failure already implemented via db.transaction().

- [x] TASK-002-007 | AGENT | `apps/api/src/lib/command.test.ts`
  Updated test file to verify command pattern implementation. Added tests for idempotency, rollback, and atomic commits.

- [x] TASK-002-008 | AGENT | `apps/api/src/lib/command.test.ts`
  Run command tests: `pnpm --filter @life-os/api test -- command` - All 16 tests passed.

- [x] TASK-002-009 | AGENT | `apps/api/src/lib/`
  Run type checking: `pnpm --filter @life-os/api typecheck`

- [x] TASK-002-010 | AGENT | `apps/api/src/lib/`
  Command pattern usage already documented in AGENTS.md under API Design section.

---

## TASK-003: Implement audit log creation for task mutations

- [ ] TASK-003
- Status: ready
- Related Files: `apps/api/src/lib/command.test.ts`, `apps/api/src/lib/work-operations.ts`
- Definition of Done: Audit logs created for all task mutations (create, update, delete), tests pass
- Out of Scope: Calendar event audit logs (separate task)
- Rules to Follow:
  - Use command pattern from TASK-002
  - Include user ID, workspace ID, timestamp, changes
  - Follow RLS policies for audit log table
- Advanced Coding Pattern: Event sourcing pattern
- Anti-Patterns: Missing audit entries, incomplete change tracking
- Imports/Exports: Export audit log creation functions
- Depends On: TASK-002
- Blocks: TASK-006, TASK-007, TASK-008

### Subtasks

- [ ] TASK-003-001 | AGENT | `packages/database/src/schema/`
  Verify audit log table exists in schema with required fields (user_id, workspace_id, action, entity_type, entity_id, changes, timestamp).

- [ ] TASK-003-002 | AGENT | `apps/api/src/lib/work-operations.ts`
  Read existing task mutation functions to understand current implementation.

- [ ] TASK-003-003 | AGENT | `apps/api/src/lib/work-operations.ts`
  Integrate audit log creation into task create operation using command pattern.

- [ ] TASK-003-004 | AGENT | `apps/api/src/lib/work-operations.ts`
  Integrate audit log creation into task update operation using command pattern.

- [ ] TASK-003-005 | AGENT | `apps/api/src/lib/work-operations.ts`
  Integrate audit log creation into task delete operation using command pattern.

- [ ] TASK-003-006 | AGENT | `apps/api/src/lib/command.test.ts`
  Add tests verifying audit log creation for each task mutation type.

- [ ] TASK-003-007 | AGENT | `apps/api/src/lib/work-operations.test.ts`
  Run work operations tests: `pnpm --filter @life-os/api test -- work-operations`

- [ ] TASK-003-008 | AGENT | `apps/api/src/lib/`
  Run type checking: `pnpm --filter @life-os/api typecheck`

---

## TASK-004: Implement outbox event creation for task mutations

- [ ] TASK-004
- Status: ready
- Related Files: `apps/api/src/lib/command.test.ts`, `apps/api/src/lib/work-operations.ts`
- Definition of Done: Outbox events created for all task mutations, worker can process them, tests pass
- Out of Scope: Calendar event outbox events (separate task)
- Rules to Follow:
  - Use command pattern from TASK-002
  - Include event type, entity data, timestamp
  - Follow pg-boss integration pattern
- Advanced Coding Pattern: Outbox pattern for reliable messaging
- Anti-Patterns: Missing outbox entries, malformed event data
- Imports/Exports: Export outbox creation functions
- Depends On: TASK-002
- Blocks: TASK-006, TASK-007, TASK-008

### Subtasks

- [ ] TASK-004-001 | AGENT | `packages/database/src/schema/`
  Verify outbox table exists in schema with required fields (event_type, payload, processed, timestamp).

- [ ] TASK-004-002 | AGENT | `apps/api/src/lib/work-operations.ts`
  Read existing task mutation functions to understand current implementation.

- [ ] TASK-004-003 | AGENT | `apps/api/src/lib/work-operations.ts`
  Integrate outbox event creation into task create operation using command pattern.

- [ ] TASK-004-004 | AGENT | `apps/api/src/lib/work-operations.ts`
  Integrate outbox event creation into task update operation using command pattern.

- [ ] TASK-004-005 | AGENT | `apps/api/src/lib/work-operations.ts`
  Integrate outbox event creation into task delete operation using command pattern.

- [ ] TASK-004-006 | AGENT | `apps/api/src/lib/command.test.ts`
  Add tests verifying outbox event creation for each task mutation type.

- [ ] TASK-004-007 | AGENT | `apps/api/src/lib/work-operations.test.ts`
  Run work operations tests: `pnpm --filter @life-os/api test -- work-operations`

- [ ] TASK-004-008 | AGENT | `apps/api/src/lib/`
  Run type checking: `pnpm --filter @life-os/api typecheck`

---

## TASK-005: Implement command pattern for calendar mutations

- [ ] TASK-005
- Status: ready
- Related Files: `apps/api/src/lib/command.test.ts`, `apps/api/src/lib/calendar-operations.ts`
- Definition of Done: Calendar mutations use command pattern, tests pass
- Out of Scope: Task mutations (handled in TASK-003, TASK-004)
- Rules to Follow:
  - Use same command pattern as task mutations
  - Include audit log and outbox integration
  - Follow AGENTS.md architecture patterns
- Advanced Coding Pattern: Command pattern with Unit of Work
- Anti-Patterns: Duplicating command logic, inconsistent with task pattern
- Imports/Exports: Reuse command executor from TASK-002
- Depends On: TASK-002
- Blocks: TASK-009, TASK-010

### Subtasks

- [ ] TASK-005-001 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Read existing calendar mutation functions to understand current implementation.

- [ ] TASK-005-002 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Refactor calendar event create to use command pattern with audit + outbox.

- [ ] TASK-005-003 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Refactor calendar event update to use command pattern with audit + outbox.

- [ ] TASK-005-004 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Refactor calendar event delete to use command pattern with audit + outbox.

- [ ] TASK-005-005 | AGENT | `apps/api/src/lib/command.test.ts`
  Add tests verifying calendar command pattern implementation.

- [ ] TASK-005-006 | AGENT | `apps/api/src/lib/calendar-operations.test.ts`
  Run calendar operations tests: `pnpm --filter @life-os/api test -- calendar-operations`

- [ ] TASK-005-007 | AGENT | `apps/api/src/lib/`
  Run type checking: `pnpm --filter @life-os/api typecheck`

---

## TASK-006: Implement audit log creation for calendar mutations

- [ ] TASK-006
- Status: ready
- Related Files: `apps/api/src/lib/command.test.ts`, `apps/api/src/lib/calendar-operations.ts`
- Definition of Done: Audit logs created for all calendar mutations, tests pass
- Out of Scope: Task audit logs (handled in TASK-003)
- Rules to Follow:
  - Use same audit pattern as task mutations
  - Include calendar-specific fields (event_id, calendar_id)
  - Follow RLS policies
- Advanced Coding Pattern: Event sourcing pattern
- Anti-Patterns: Inconsistent with task audit pattern
- Imports/Exports: Reuse audit log functions from TASK-003
- Depends On: TASK-002, TASK-005
- Blocks: None

### Subtasks

- [ ] TASK-006-001 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Integrate audit log creation into calendar event create operation.

- [ ] TASK-006-002 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Integrate audit log creation into calendar event update operation.

- [ ] TASK-006-003 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Integrate audit log creation into calendar event delete operation.

- [ ] TASK-006-004 | AGENT | `apps/api/src/lib/command.test.ts`
  Add tests verifying audit log creation for calendar mutations.

- [ ] TASK-006-005 | AGENT | `apps/api/src/lib/calendar-operations.test.ts`
  Run calendar operations tests: `pnpm --filter @life-os/api test -- calendar-operations`

- [ ] TASK-006-006 | AGENT | `apps/api/src/lib/`
  Run type checking: `pnpm --filter @life-os/api typecheck`

---

## TASK-007: Implement outbox event creation for calendar mutations

- [ ] TASK-007
- Status: ready
- Related Files: `apps/api/src/lib/command.test.ts`, `apps/api/src/lib/calendar-operations.ts`
- Definition of Done: Outbox events created for all calendar mutations, tests pass
- Out of Scope: Task outbox events (handled in TASK-004)
- Rules to Follow:
  - Use same outbox pattern as task mutations
  - Include calendar-specific event types
  - Follow pg-boss integration pattern
- Advanced Coding Pattern: Outbox pattern for reliable messaging
- Anti-Patterns: Inconsistent with task outbox pattern
- Imports/Exports: Reuse outbox functions from TASK-004
- Depends On: TASK-002, TASK-005
- Blocks: None

### Subtasks

- [ ] TASK-007-001 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Integrate outbox event creation into calendar event create operation.

- [ ] TASK-007-002 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Integrate outbox event creation into calendar event update operation.

- [ ] TASK-007-003 | AGENT | `apps/api/src/lib/calendar-operations.ts`
  Integrate outbox event creation into calendar event delete operation.

- [ ] TASK-007-004 | AGENT | `apps/api/src/lib/command.test.ts`
  Add tests verifying outbox event creation for calendar mutations.

- [ ] TASK-007-005 | AGENT | `apps/api/src/lib/calendar-operations.test.ts`
  Run calendar operations tests: `pnpm --filter @life-os/api test -- calendar-operations`

- [ ] TASK-007-006 | AGENT | `apps/api/src/lib/`
  Run type checking: `pnpm --filter @life-os/api typecheck`

---

## TASK-008: Implement PowerSync query for workspace-scoped projects

- [ ] TASK-008
- Status: ready
- Related Files: `apps/mobile/src/hooks/useWork.ts`, `packages/mobile-data/src/`
- Definition of Done: PowerSync query returns workspace-scoped projects, mobile app displays projects correctly
- Out of Scope: Tasks, calendars, events (separate tasks)
- Rules to Follow:
  - Use PowerSync SQL query syntax
  - Filter by workspace_id from auth context
  - Follow RLS policies
- Advanced Coding Pattern: Offline-first data synchronization
- Anti-Patterns: Missing workspace filtering, SQL injection
- Imports/Exports: Export useProjects hook
- Depends On: None
- Blocks: TASK-012

### Subtasks

- [ ] TASK-008-001 | AGENT | `packages/mobile-data/src/`
  Read PowerSync schema to understand projects table structure and indexes.

- [ ] TASK-008-002 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Read existing useWork hook to understand current implementation and auth context access.

- [ ] TASK-008-003 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Implement PowerSync query for workspace-scoped projects using workspace_id from auth context.

- [ ] TASK-008-004 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Add error handling and loading states to useProjects hook.

- [ ] TASK-008-005 | AGENT | `apps/mobile/app/work/index.test.tsx`
  Update test to verify PowerSync query returns correct workspace-scoped projects.

- [ ] TASK-008-006 | AGENT | `apps/mobile/app/work/offline-regression.test.tsx`
  Update offline regression test to verify projects work offline.

- [ ] TASK-008-007 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-008-008 | AGENT | `apps/mobile/src/hooks/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-009: Implement PowerSync query for workspace-scoped tasks

- [ ] TASK-009
- Status: ready
- Related Files: `apps/mobile/src/hooks/useWork.ts`, `packages/mobile-data/src/`
- Definition of Done: PowerSync query returns workspace-scoped tasks, mobile app displays tasks correctly
- Out of Scope: Projects, calendars, events (separate tasks)
- Rules to Follow:
  - Use PowerSync SQL query syntax
  - Filter by workspace_id from auth context
  - Support optional project_id filtering
- Advanced Coding Pattern: Offline-first data synchronization
- Anti-Patterns: Missing workspace filtering, N+1 queries
- Imports/Exports: Export useTasks hook
- Depends On: None
- Blocks: TASK-012

### Subtasks

- [ ] TASK-009-001 | AGENT | `packages/mobile-data/src/`
  Read PowerSync schema to understand tasks table structure and indexes.

- [ ] TASK-009-002 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Read existing useWork hook to understand current implementation and auth context access.

- [ ] TASK-009-003 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Implement PowerSync query for workspace-scoped tasks using workspace_id from auth context.

- [ ] TASK-009-004 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Add optional project_id filtering to tasks query.

- [ ] TASK-009-005 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Add error handling and loading states to useTasks hook.

- [ ] TASK-009-006 | AGENT | `apps/mobile/app/work/index.test.tsx`
  Update test to verify PowerSync query returns correct workspace-scoped tasks.

- [ ] TASK-009-007 | AGENT | `apps/mobile/app/work/offline-regression.test.tsx`
  Update offline regression test to verify tasks work offline.

- [ ] TASK-009-008 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-009-009 | AGENT | `apps/mobile/src/hooks/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-010: Implement PowerSync query for workspace-scoped calendars

- [ ] TASK-010
- Status: ready
- Related Files: `apps/mobile/app/calendar/hooks/useCalendarData.ts`, `packages/mobile-data/src/`
- Definition of Done: PowerSync query returns workspace-scoped calendars, mobile app displays calendars correctly
- Out of Scope: Events (separate task)
- Rules to Follow:
  - Use PowerSync SQL query syntax
  - Filter by workspace_id from auth context
  - Follow RLS policies
- Advanced Coding Pattern: Offline-first data synchronization
- Anti-Patterns: Missing workspace filtering, SQL injection
- Imports/Exports: Export useCalendars hook
- Depends On: None
- Blocks: TASK-013

### Subtasks

- [ ] TASK-010-001 | AGENT | `packages/mobile-data/src/`
  Read PowerSync schema to understand calendars table structure and indexes.

- [ ] TASK-010-002 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Read existing useCalendarData hook to understand current implementation and auth context access.

- [ ] TASK-010-003 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Implement PowerSync query for workspace-scoped calendars using workspace_id from auth context.

- [ ] TASK-010-004 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Add error handling and loading states to useCalendars hook.

- [ ] TASK-010-005 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-010-006 | AGENT | `apps/mobile/app/calendar/hooks/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-011: Implement PowerSync query for workspace-scoped events with date filtering

- [ ] TASK-011
- Status: ready
- Related Files: `apps/mobile/app/calendar/hooks/useCalendarData.ts`, `packages/mobile-data/src/`
- Definition of Done: PowerSync query returns workspace-scoped events with date range filtering, mobile app displays events correctly
- Out of Scope: Calendars (handled in TASK-010)
- Rules to Follow:
  - Use PowerSync SQL query syntax
  - Filter by workspace_id from auth context
  - Support date range filtering (start_date, end_date)
  - Use appropriate indexes for performance
- Advanced Coding Pattern: Offline-first data synchronization with indexed queries
- Anti-Patterns: Missing date filtering, full table scans
- Imports/Exports: Export useEvents hook
- Depends On: None
- Blocks: TASK-013

### Subtasks

- [ ] TASK-011-001 | AGENT | `packages/mobile-data/src/`
  Read PowerSync schema to understand events table structure and indexes.

- [ ] TASK-011-002 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Read existing useCalendarData hook to understand current implementation and auth context access.

- [ ] TASK-011-003 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Implement PowerSync query for workspace-scoped events using workspace_id from auth context.

- [ ] TASK-011-004 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Add date range filtering (start_date, end_date) to events query.

- [ ] TASK-011-005 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Add error handling and loading states to useEvents hook.

- [ ] TASK-011-006 | AGENT | `apps/mobile/app/calendar/hooks/useCalendarData.ts`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-011-007 | AGENT | `apps/mobile/app/calendar/hooks/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-012: Implement mobile command queue for project operations

- [ ] TASK-012
- Status: ready
- Related Files: `apps/mobile/src/hooks/useWork.ts`, `apps/api/src/routes/`
- Definition of Done: Mobile app can enqueue create project commands, API processes them, tests pass
- Out of Scope: Task, calendar, event operations (separate tasks)
- Rules to Follow:
  - Use existing API endpoints
  - Implement command queue with offline support
  - Handle command failures and retries
- Advanced Coding Pattern: Command queue with offline support
- Anti-Patterns: Blocking UI on command enqueue, missing retry logic
- Imports/Exports: Export enqueueCreateProject function
- Depends On: TASK-008
- Blocks: TASK-016

### Subtasks

- [ ] TASK-012-001 | AGENT | `apps/api/src/routes/`
  Verify API endpoint exists for creating projects (POST /api/work/projects).

- [ ] TASK-012-002 | AGENT | `apps/api/src/routes/`
  Read API contract from packages/contracts to understand project creation request schema.

- [ ] TASK-012-003 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Implement command queue infrastructure for offline command storage.

- [ ] TASK-012-004 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Implement enqueueCreateProject function that adds create project command to queue.

- [ ] TASK-012-005 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Implement command processing logic that sends queued commands to API when online.

- [ ] TASK-012-006 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Add error handling and retry logic for failed commands.

- [ ] TASK-012-007 | AGENT | `apps/mobile/app/work/index.test.tsx`
  Update test to verify project creation command enqueues correctly.

- [ ] TASK-012-008 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-012-009 | AGENT | `apps/mobile/src/hooks/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-013: Implement mobile command queue for task operations

- [ ] TASK-013
- Status: ready
- Related Files: `apps/mobile/src/hooks/useWork.ts`, `apps/api/src/routes/work/tasks.ts`
- Definition of Done: Mobile app can enqueue create/update/delete task commands, API processes them, tests pass
- Out of Scope: Project, calendar, event operations (separate tasks)
- Rules to Follow:
  - Use existing API endpoints
  - Reuse command queue from TASK-012
  - Handle command failures and retries
- Advanced Coding Pattern: Command queue with offline support
- Anti-Patterns: Duplicating queue logic, inconsistent with project pattern
- Imports/Exports: Export enqueueCreateTask, enqueueUpdateTask, enqueueDeleteTask functions
- Depends On: TASK-009, TASK-012
- Blocks: TASK-016

### Subtasks

- [ ] TASK-013-001 | AGENT | `apps/api/src/routes/work/tasks.ts`
  Verify API endpoints exist for creating, updating, and deleting tasks.

- [ ] TASK-013-002 | AGENT | `apps/api/src/routes/work/tasks.ts`
  Read API contract from packages/contracts to understand task mutation request schemas.

- [ ] TASK-013-003 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Implement enqueueCreateTask function using command queue from TASK-012.

- [ ] TASK-013-004 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Implement enqueueUpdateTaskStatus function using command queue from TASK-012.

- [ ] TASK-013-005 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Implement enqueueDeleteTask function using command queue from TASK-012.

- [ ] TASK-013-006 | AGENT | `apps/mobile/app/work/index.test.tsx`
  Update test to verify task command enqueues correctly.

- [ ] TASK-013-007 | AGENT | `apps/mobile/app/work/offline-regression.test.tsx`
  Update offline regression test to verify task commands work offline.

- [ ] TASK-013-008 | AGENT | `apps/mobile/src/hooks/useWork.ts`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-013-009 | AGENT | `apps/mobile/src/hooks/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-014: Implement mobile sign-in flow

- [ ] TASK-014
- Status: ready
- Related Files: `apps/mobile/src/contexts/AuthContext.tsx`, `apps/mobile/app/`
- Definition of Done: Mobile app can sign in users, auth context provides user session, tests pass
- Out of Scope: Sign out, sign up (separate tasks if needed)
- Rules to Follow:
  - Use Supabase Auth
  - Store session securely
  - Update auth context on sign-in success
- Advanced Coding Pattern: Authentication context with secure session storage
- Anti-Patterns: Storing session in plain text, missing error handling
- Imports/Exports: Export signIn function from AuthContext
- Depends On: None
- Blocks: TASK-015, TASK-016

### Subtasks

- [ ] TASK-014-001 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Read existing AuthContext to understand current implementation and placeholder structure.

- [ ] TASK-014-002 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Implement signIn function using Supabase Auth (supabase.auth.signInWithPassword).

- [ ] TASK-014-003 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Update auth context state on successful sign-in (user, session, loading).

- [ ] TASK-014-004 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Add error handling for sign-in failures (invalid credentials, network errors).

- [ ] TASK-014-005 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Add loading state during sign-in process.

- [ ] TASK-014-006 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-014-007 | AGENT | `apps/mobile/src/contexts/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-015: Implement PowerSync replica data clearing on sign-out

- [ ] TASK-015
- Status: ready
- Related Files: `apps/mobile/src/contexts/AuthContext.tsx`, `packages/mobile-data/src/`
- Definition of Done: PowerSync replica cleared on sign-out, no stale data remains, tests pass
- Out of Scope: Sign-in flow (handled in TASK-014)
- Rules to Follow:
  - Clear PowerSync database on sign-out
  - Reset PowerSync connection
  - Handle clearing errors gracefully
- Advanced Coding Pattern: Secure data cleanup on authentication change
- Anti-Patterns: Leaving stale data, crashing on clear failure
- Imports/Exports: Export signOut function from AuthContext
- Depends On: TASK-014
- Blocks: None

### Subtasks

- [ ] TASK-015-001 | AGENT | `packages/mobile-data/src/`
  Read PowerSync schema to understand database structure and clearing method.

- [ ] TASK-015-002 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Read existing AuthContext to understand current implementation and PowerSync integration.

- [ ] TASK-015-003 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Implement signOut function that calls Supabase Auth signOut.

- [ ] TASK-015-004 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Add PowerSync database clearing to signOut function.

- [ ] TASK-015-005 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Add PowerSync connection reset to signOut function.

- [ ] TASK-015-006 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Add error handling for clearing failures (log error, continue with sign-out).

- [ ] TASK-015-007 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Update auth context state on successful sign-out (clear user, session).

- [ ] TASK-015-008 | AGENT | `apps/mobile/src/contexts/AuthContext.tsx`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-015-009 | AGENT | `apps/mobile/src/contexts/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-016: Implement mobile project creation modal

- [ ] TASK-016
- Status: ready
- Related Files: `apps/mobile/app/work/index.tsx`, `apps/mobile/app/work/components/`
- Definition of Done: Mobile app has project creation modal, creates projects via command queue, tests pass
- Out of Scope: Task creation modal, task details modal (separate tasks)
- Rules to Follow:
  - Use existing UI components from packages/ui
  - Integrate with command queue from TASK-012
  - Validate form input before submission
- Advanced Coding Pattern: Modal form with validation and command queue integration
- Anti-Patterns: Missing validation, blocking UI on command enqueue
- Imports/Exports: Export ProjectCreationModal component
- Depends On: TASK-008, TASK-012
- Blocks: None

### Subtasks

- [ ] TASK-016-001 | AGENT | `apps/mobile/app/work/index.tsx`
  Read existing work index page to understand current UI structure and placeholder button.

- [ ] TASK-016-002 | AGENT | `packages/ui/src/components/`
  Check for existing Modal and Input components that can be reused.

- [ ] TASK-016-003 | AGENT | `apps/mobile/app/work/components/`
  Create ProjectCreationModal component with form fields (name, description).

- [ ] TASK-016-004 | AGENT | `apps/mobile/app/work/components/`
  Add form validation (required name, max length).

- [ ] TASK-016-005 | AGENT | `apps/mobile/app/work/components/`
  Integrate with enqueueCreateProject from command queue on form submission.

- [ ] TASK-016-006 | AGENT | `apps/mobile/app/work/components/`
  Add loading state during command enqueue.

- [ ] TASK-016-007 | AGENT | `apps/mobile/app/work/components/`
  Add error handling and display for command enqueue failures.

- [ ] TASK-016-008 | AGENT | `apps/mobile/app/work/index.tsx`
  Integrate ProjectCreationModal into work index page, wire up open button.

- [ ] TASK-016-009 | AGENT | `apps/mobile/app/work/index.test.tsx`
  Update test to verify project creation modal opens and submits correctly.

- [ ] TASK-016-010 | AGENT | `apps/mobile/app/work/components/`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-016-011 | AGENT | `apps/mobile/app/work/components/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-017: Implement mobile task creation modal

- [ ] TASK-017
- Status: ready
- Related Files: `apps/mobile/app/work/index.tsx`, `apps/mobile/app/work/components/`
- Definition of Done: Mobile app has task creation modal, creates tasks via command queue, tests pass
- Out of Scope: Project creation modal, task details modal (separate tasks)
- Rules to Follow:
  - Use existing UI components from packages/ui
  - Integrate with command queue from TASK-013
  - Validate form input before submission
- Advanced Coding Pattern: Modal form with validation and command queue integration
- Anti-Patterns: Missing validation, blocking UI on command enqueue
- Imports/Exports: Export TaskCreationModal component
- Depends On: TASK-009, TASK-013
- Blocks: None

### Subtasks

- [ ] TASK-017-001 | AGENT | `apps/mobile/app/work/index.tsx`
  Read existing work index page to understand current UI structure and placeholder button.

- [ ] TASK-017-002 | AGENT | `packages/ui/src/components/`
  Check for existing Modal, Input, and Select components that can be reused.

- [ ] TASK-017-003 | AGENT | `apps/mobile/app/work/components/`
  Create TaskCreationModal component with form fields (title, description, project, status, due date).

- [ ] TASK-017-004 | AGENT | `apps/mobile/app/work/components/`
  Add form validation (required title, max lengths).

- [ ] TASK-017-005 | AGENT | `apps/mobile/app/work/components/`
  Integrate with enqueueCreateTask from command queue on form submission.

- [ ] TASK-017-006 | AGENT | `apps/mobile/app/work/components/`
  Add loading state during command enqueue.

- [ ] TASK-017-007 | AGENT | `apps/mobile/app/work/components/`
  Add error handling and display for command enqueue failures.

- [ ] TASK-017-008 | AGENT | `apps/mobile/app/work/index.tsx`
  Integrate TaskCreationModal into work index page, wire up open button.

- [ ] TASK-017-009 | AGENT | `apps/mobile/app/work/index.test.tsx`
  Update test to verify task creation modal opens and submits correctly.

- [ ] TASK-017-010 | AGENT | `apps/mobile/app/work/components/`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-017-011 | AGENT | `apps/mobile/app/work/components/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-018: Implement mobile task details modal

- [ ] TASK-018
- Status: ready
- Related Files: `apps/mobile/app/work/index.tsx`, `apps/mobile/app/work/components/`
- Definition of Done: Mobile app has task details modal, displays task info, allows status updates, tests pass
- Out of Scope: Project creation modal, task creation modal (separate tasks)
- Rules to Follow:
  - Use existing UI components from packages/ui
  - Integrate with command queue from TASK-013 for status updates
  - Display all relevant task information
- Advanced Coding Pattern: Modal with read-only display and action buttons
- Anti-Patterns: Missing error handling, blocking UI on command enqueue
- Imports/Exports: Export TaskDetailsModal component
- Depends On: TASK-009, TASK-013
- Blocks: None

### Subtasks

- [ ] TASK-018-001 | AGENT | `apps/mobile/app/work/index.tsx`
  Read existing work index page to understand current UI structure and placeholder button.

- [ ] TASK-018-002 | AGENT | `packages/ui/src/components/`
  Check for existing Modal and Button components that can be reused.

- [ ] TASK-018-003 | AGENT | `apps/mobile/app/work/components/`
  Create TaskDetailsModal component with task display (title, description, status, project, due date).

- [ ] TASK-018-004 | AGENT | `apps/mobile/app/work/components/`
  Add status update button with status selector.

- [ ] TASK-018-005 | AGENT | `apps/mobile/app/work/components/`
  Integrate with enqueueUpdateTaskStatus from command queue on status change.

- [ ] TASK-018-006 | AGENT | `apps/mobile/app/work/components/`
  Add loading state during command enqueue.

- [ ] TASK-018-007 | AGENT | `apps/mobile/app/work/components/`
  Add error handling and display for command enqueue failures.

- [ ] TASK-018-008 | AGENT | `apps/mobile/app/work/index.tsx`
  Integrate TaskDetailsModal into work index page, wire up open button on task items.

- [ ] TASK-018-009 | AGENT | `apps/mobile/app/work/index.test.tsx`
  Update test to verify task details modal opens and updates status correctly.

- [ ] TASK-018-010 | AGENT | `apps/mobile/app/work/components/`
  Run mobile tests: `pnpm --filter @life-os/mobile test`

- [ ] TASK-018-011 | AGENT | `apps/mobile/app/work/components/`
  Run type checking: `pnpm --filter @life-os/mobile typecheck`

---

## TASK-019: Implement UI component tests - TextArea

- [ ] TASK-019
- Status: ready
- Related Files: `packages/ui/src/components/TextArea.test.tsx`, `packages/ui/src/components/TextArea.tsx`
- Definition of Done: All 7 test placeholders implemented, tests pass
- Out of Scope: Other UI components (separate tasks)
- Rules to Follow:
  - Use Testing Library
  - Test user interactions, not implementation details
  - Follow AGENTS.md testing standards
- Advanced Coding Pattern: Component testing with user-centric assertions
- Anti-Patterns: Testing implementation details, missing edge cases
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-019-001 | AGENT | `packages/ui/src/components/TextArea.tsx`
  Read TextArea component to understand props and behavior.

- [ ] TASK-019-002 | AGENT | `packages/ui/src/components/TextArea.test.tsx`
  Implement test: renders textarea input

- [ ] TASK-019-003 | AGENT | `packages/ui/src/components/TextArea.test.tsx`
  Implement test: displays placeholder text

- [ ] TASK-019-004 | AGENT | `packages/ui/src/components/TextArea.test.tsx`
  Implement test: displays initial value

- [ ] TASK-019-005 | AGENT | `packages/ui/src/components/TextArea.test.tsx`
  Implement test: calls onChange when text entered

- [ ] TASK-019-006 | AGENT | `packages/ui/src/components/TextArea.test.tsx`
  Implement test: is disabled when disabled prop is true

- [ ] TASK-019-007 | AGENT | `packages/ui/src/components/TextArea.test.tsx`
  Implement test: respects maxLength prop

- [ ] TASK-019-008 | AGENT | `packages/ui/src/components/TextArea.test.tsx`
  Implement test: respects rows prop

- [ ] TASK-019-009 | AGENT | `packages/ui/src/components/TextArea.test.tsx`
  Run TextArea tests: `pnpm --filter @life-os/ui test -- TextArea`

- [ ] TASK-019-010 | AGENT | `packages/ui/src/components/`
  Run type checking: `pnpm --filter @life-os/ui typecheck`

---

## TASK-020: Implement UI component tests - Select

- [ ] TASK-020
- Status: ready
- Related Files: `packages/ui/src/components/Select.test.tsx`, `packages/ui/src/components/Select.tsx`
- Definition of Done: All 6 test placeholders implemented, tests pass
- Out of Scope: Other UI components (separate tasks)
- Rules to Follow:
  - Use Testing Library
  - Test user interactions, not implementation details
  - Follow AGENTS.md testing standards
- Advanced Coding Pattern: Component testing with user-centric assertions
- Anti-Patterns: Testing implementation details, missing edge cases
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-020-001 | AGENT | `packages/ui/src/components/Select.tsx`
  Read Select component to understand props and behavior.

- [ ] TASK-020-002 | AGENT | `packages/ui/src/components/Select.test.tsx`
  Implement test: renders select input

- [ ] TASK-020-003 | AGENT | `packages/ui/src/components/Select.test.tsx`
  Implement test: renders options

- [ ] TASK-020-004 | AGENT | `packages/ui/src/components/Select.test.tsx`
  Implement test: displays placeholder when no value selected

- [ ] TASK-020-005 | AGENT | `packages/ui/src/components/Select.test.tsx`
  Implement test: calls onChange when option selected

- [ ] TASK-020-006 | AGENT | `packages/ui/src/components/Select.test.tsx`
  Implement test: is disabled when disabled prop is true

- [ ] TASK-020-007 | AGENT | `packages/ui/src/components/Select.test.tsx`
  Implement test: displays selected value

- [ ] TASK-020-008 | AGENT | `packages/ui/src/components/Select.test.tsx`
  Run Select tests: `pnpm --filter @life-os/ui test -- Select`

- [ ] TASK-020-009 | AGENT | `packages/ui/src/components/`
  Run type checking: `pnpm --filter @life-os/ui typecheck`

---

## TASK-021: Implement UI component tests - Modal

- [ ] TASK-021
- Status: ready
- Related Files: `packages/ui/src/components/Modal.test.tsx`, `packages/ui/src/components/Modal.tsx`
- Definition of Done: All 7 test placeholders implemented, tests pass
- Out of Scope: Other UI components (separate tasks)
- Rules to Follow:
  - Use Testing Library
  - Test user interactions, not implementation details
  - Follow AGENTS.md testing standards
- Advanced Coding Pattern: Component testing with user-centric assertions
- Anti-Patterns: Testing implementation details, missing edge cases
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-021-001 | AGENT | `packages/ui/src/components/Modal.tsx`
  Read Modal component to understand props and behavior.

- [ ] TASK-021-002 | AGENT | `packages/ui/src/components/Modal.test.tsx`
  Implement test: renders modal when open

- [ ] TASK-021-003 | AGENT | `packages/ui/src/components/Modal.test.tsx`
  Implement test: does not render when closed

- [ ] TASK-021-004 | AGENT | `packages/ui/src/components/Modal.test.tsx`
  Implement test: displays title

- [ ] TASK-021-005 | AGENT | `packages/ui/src/components/Modal.test.tsx`
  Implement test: displays children content

- [ ] TASK-021-006 | AGENT | `packages/ui/src/components/Modal.test.tsx`
  Implement test: calls onClose when close button clicked

- [ ] TASK-021-007 | AGENT | `packages/ui/src/components/Modal.test.tsx`
  Implement test: calls onClose when backdrop clicked

- [ ] TASK-021-008 | AGENT | `packages/ui/src/components/Modal.test.tsx`
  Implement test: prevents body scroll when open

- [ ] TASK-021-009 | AGENT | `packages/ui/src/components/Modal.test.tsx`
  Run Modal tests: `pnpm --filter @life-os/ui test -- Modal`

- [ ] TASK-021-010 | AGENT | `packages/ui/src/components/`
  Run type checking: `pnpm --filter @life-os/ui typecheck`

---

## TASK-022: Implement UI component tests - Checkbox

- [ ] TASK-022
- Status: ready
- Related Files: `packages/ui/src/components/Checkbox.test.tsx`, `packages/ui/src/components/Checkbox.tsx`
- Definition of Done: All 6 test placeholders implemented, tests pass
- Out of Scope: Other UI components (separate tasks)
- Rules to Follow:
  - Use Testing Library
  - Test user interactions, not implementation details
  - Follow AGENTS.md testing standards
- Advanced Coding Pattern: Component testing with user-centric assertions
- Anti-Patterns: Testing implementation details, missing edge cases
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-022-001 | AGENT | `packages/ui/src/components/Checkbox.tsx`
  Read Checkbox component to understand props and behavior.

- [ ] TASK-022-002 | AGENT | `packages/ui/src/components/Checkbox.test.tsx`
  Implement test: renders checkbox input

- [ ] TASK-022-003 | AGENT | `packages/ui/src/components/Checkbox.test.tsx`
  Implement test: handles checked state

- [ ] TASK-022-004 | AGENT | `packages/ui/src/components/Checkbox.test.tsx`
  Implement test: handles unchecked state

- [ ] TASK-022-005 | AGENT | `packages/ui/src/components/Checkbox.test.tsx`
  Implement test: calls onChange when clicked

- [ ] TASK-022-006 | AGENT | `packages/ui/src/components/Checkbox.test.tsx`
  Implement test: is disabled when disabled prop is true

- [ ] TASK-022-007 | AGENT | `packages/ui/src/components/Checkbox.test.tsx`
  Implement test: displays label when provided

- [ ] TASK-022-008 | AGENT | `packages/ui/src/components/Checkbox.test.tsx`
  Run Checkbox tests: `pnpm --filter @life-os/ui test -- Checkbox`

- [ ] TASK-022-009 | AGENT | `packages/ui/src/components/`
  Run type checking: `pnpm --filter @life-os/ui typecheck`

---

## TASK-023: Implement web hook tests - useEventDetails

- [ ] TASK-023
- Status: ready
- Related Files: `apps/web/src/hooks/useEventDetails.test.ts`, `apps/web/src/hooks/useEventDetails.ts`
- Definition of Done: All 7 test placeholders implemented, tests pass
- Out of Scope: Other web hooks (separate tasks)
- Rules to Follow:
  - Use Testing Library for hooks
  - Mock API responses
  - Test loading, error, and success states
- Advanced Coding Pattern: Hook testing with React Testing Library
- Anti-Patterns: Testing implementation details, missing error states
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-023-001 | AGENT | `apps/web/src/hooks/useEventDetails.ts`
  Read useEventDetails hook to understand functionality and return values.

- [ ] TASK-023-002 | AGENT | `apps/web/src/hooks/useEventDetails.test.ts`
  Implement test: fetches event attendees when event selected

- [ ] TASK-023-003 | AGENT | `apps/web/src/hooks/useEventDetails.test.ts`
  Implement test: creates event attendee and invalidates query

- [ ] TASK-023-004 | AGENT | `apps/web/src/hooks/useEventDetails.test.ts`
  Implement test: deletes event attendee and invalidates query

- [ ] TASK-023-005 | AGENT | `apps/web/src/hooks/useEventDetails.test.ts`
  Implement test: fetches scheduling links for workspace

- [ ] TASK-023-006 | AGENT | `apps/web/src/hooks/useEventDetails.test.ts`
  Implement test: creates scheduling link and invalidates query

- [ ] TASK-023-007 | AGENT | `apps/web/src/hooks/useEventDetails.test.ts`
  Implement test: updates scheduling link and invalidates query

- [ ] TASK-023-008 | AGENT | `apps/web/src/hooks/useEventDetails.test.ts`
  Implement test: deletes scheduling link and invalidates query

- [ ] TASK-023-009 | AGENT | `apps/web/src/hooks/useEventDetails.test.ts`
  Run useEventDetails tests: `pnpm --filter @life-os/web test -- useEventDetails`

- [ ] TASK-023-010 | AGENT | `apps/web/src/hooks/`
  Run type checking: `pnpm --filter @life-os/web typecheck`

---

## TASK-024: Implement web hook tests - useTaskFilters

- [ ] TASK-024
- Status: ready
- Related Files: `apps/web/src/hooks/useTaskFilters.test.ts`, `apps/web/src/hooks/useTaskFilters.ts`
- Definition of Done: All 3 test placeholders implemented, tests pass
- Out of Scope: Other web hooks (separate tasks)
- Rules to Follow:
  - Use Testing Library for hooks
  - Test filter state management
  - Test filter combinations
- Advanced Coding Pattern: Hook testing with React Testing Library
- Anti-Patterns: Testing implementation details, missing edge cases
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-024-001 | AGENT | `apps/web/src/hooks/useTaskFilters.ts`
  Read useTaskFilters hook to understand functionality and return values.

- [ ] TASK-024-002 | AGENT | `apps/web/src/hooks/useTaskFilters.test.ts`
  Implement test: manages filter state

- [ ] TASK-024-003 | AGENT | `apps/web/src/hooks/useTaskFilters.test.ts`
  Implement test: resets filters to default

- [ ] TASK-024-004 | AGENT | `apps/web/src/hooks/useTaskFilters.test.ts`
  Implement test: applies multiple filters

- [ ] TASK-024-005 | AGENT | `apps/web/src/hooks/useTaskFilters.test.ts`
  Run useTaskFilters tests: `pnpm --filter @life-os/web test -- useTaskFilters`

- [ ] TASK-024-006 | AGENT | `apps/web/src/hooks/`
  Run type checking: `pnpm --filter @life-os/web typecheck`

---

## TASK-025: Implement web hook tests - useTaskHelpers

- [ ] TASK-025
- Status: ready
- Related Files: `apps/web/src/hooks/useTaskHelpers.test.ts`, `apps/web/src/hooks/useTaskHelpers.ts`
- Definition of Done: All 4 test placeholders implemented, tests pass
- Out of Scope: Other web hooks (separate tasks)
- Rules to Follow:
  - Use Testing Library for hooks
  - Test utility functions
  - Test edge cases (null values, invalid dates)
- Advanced Coding Pattern: Hook testing with React Testing Library
- Anti-Patterns: Testing implementation details, missing edge cases
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-025-001 | AGENT | `apps/web/src/hooks/useTaskHelpers.ts`
  Read useTaskHelpers hook to understand functionality and return values.

- [ ] TASK-025-002 | AGENT | `apps/web/src/hooks/useTaskHelpers.test.ts`
  Implement test: formats task due date

- [ ] TASK-025-003 | AGENT | `apps/web/src/hooks/useTaskHelpers.test.ts`
  Implement test: calculates task completion percentage

- [ ] TASK-025-004 | AGENT | `apps/web/src/hooks/useTaskHelpers.test.ts`
  Implement test: determines task urgency level

- [ ] TASK-025-005 | AGENT | `apps/web/src/hooks/useTaskHelpers.test.ts`
  Implement test: formats task duration

- [ ] TASK-025-006 | AGENT | `apps/web/src/hooks/useTaskHelpers.test.ts`
  Run useTaskHelpers tests: `pnpm --filter @life-os/web test -- useTaskHelpers`

- [ ] TASK-025-007 | AGENT | `apps/web/src/hooks/`
  Run type checking: `pnpm --filter @life-os/web typecheck`

---

## TASK-026: Implement web hook tests - useWorkProjects

- [ ] TASK-026
- Status: ready
- Related Files: `apps/web/src/hooks/useWorkProjects.test.ts`, `apps/web/src/hooks/useWorkProjects.ts`
- Definition of Done: All 4 test placeholders implemented, tests pass
- Out of Scope: Other web hooks (separate tasks)
- Rules to Follow:
  - Use Testing Library for hooks
  - Mock API responses
  - Test loading, error, and success states
- Advanced Coding Pattern: Hook testing with React Testing Library
- Anti-Patterns: Testing implementation details, missing error states
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-026-001 | AGENT | `apps/web/src/hooks/useWorkProjects.ts`
  Read useWorkProjects hook to understand functionality and return values.

- [ ] TASK-026-002 | AGENT | `apps/web/src/hooks/useWorkProjects.test.ts`
  Implement test: fetches projects for workspace

- [ ] TASK-026-003 | AGENT | `apps/web/src/hooks/useWorkProjects.test.ts`
  Implement test: creates project and invalidates query

- [ ] TASK-026-004 | AGENT | `apps/web/src/hooks/useWorkProjects.test.ts`
  Implement test: updates project and invalidates query

- [ ] TASK-026-005 | AGENT | `apps/web/src/hooks/useWorkProjects.test.ts`
  Implement test: deletes project and invalidates queries

- [ ] TASK-026-006 | AGENT | `apps/web/src/hooks/useWorkProjects.test.ts`
  Run useWorkProjects tests: `pnpm --filter @life-os/web test -- useWorkProjects`

- [ ] TASK-026-007 | AGENT | `apps/web/src/hooks/`
  Run type checking: `pnpm --filter @life-os/web typecheck`

---

## TASK-027: Implement web hook tests - useTaskDetails

- [ ] TASK-027
- Status: ready
- Related Files: `apps/web/src/hooks/useTaskDetails.test.ts`, `apps/web/src/hooks/useTaskDetails.ts`
- Definition of Done: All 16 test placeholders implemented, tests pass
- Out of Scope: Other web hooks (separate tasks)
- Rules to Follow:
  - Use Testing Library for hooks
  - Mock API responses
  - Test loading, error, and success states
- Advanced Coding Pattern: Hook testing with React Testing Library
- Anti-Patterns: Testing implementation details, missing error states
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-027-001 | AGENT | `apps/web/src/hooks/useTaskDetails.ts`
  Read useTaskDetails hook to understand functionality and return values.

- [ ] TASK-027-002 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: fetches task dependencies when task selected

- [ ] TASK-027-003 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: creates task dependency and invalidates query

- [ ] TASK-027-004 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: deletes task dependency and invalidates query

- [ ] TASK-027-005 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: fetches task assignees when task selected

- [ ] TASK-027-006 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: creates task assignee and invalidates query

- [ ] TASK-027-007 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: deletes task assignee and invalidates query

- [ ] TASK-027-008 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: fetches task comments when task selected

- [ ] TASK-027-009 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: creates task comment and invalidates query

- [ ] TASK-027-010 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: deletes task comment and invalidates query

- [ ] TASK-027-011 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: fetches time entries when task selected

- [ ] TASK-027-012 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: creates time entry and invalidates query

- [ ] TASK-027-013 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: updates time entry and invalidates query

- [ ] TASK-027-014 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: deletes time entry and invalidates query

- [ ] TASK-027-015 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: fetches task attachments when task selected

- [ ] TASK-027-016 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: creates task attachment and invalidates query

- [ ] TASK-027-017 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Implement test: deletes task attachment and invalidates query

- [ ] TASK-027-018 | AGENT | `apps/web/src/hooks/useTaskDetails.test.ts`
  Run useTaskDetails tests: `pnpm --filter @life-os/web test -- useTaskDetails`

- [ ] TASK-027-019 | AGENT | `apps/web/src/hooks/`
  Run type checking: `pnpm --filter @life-os/web typecheck`

---

## TASK-028: Implement web hook tests - useCalendarData

- [ ] TASK-028
- Status: ready
- Related Files: `apps/web/src/hooks/useCalendarData.test.ts`, `apps/web/src/hooks/useCalendarData.ts`
- Definition of Done: All 8 test placeholders implemented, tests pass
- Out of Scope: Other web hooks (separate tasks)
- Rules to Follow:
  - Use Testing Library for hooks
  - Mock API responses
  - Test loading, error, and success states
- Advanced Coding Pattern: Hook testing with React Testing Library
- Anti-Patterns: Testing implementation details, missing error states
- Imports/Exports: None
- Depends On: None
- Blocks: None

### Subtasks

- [ ] TASK-028-001 | AGENT | `apps/web/src/hooks/useCalendarData.ts`
  Read useCalendarData hook to understand functionality and return values.

- [ ] TASK-028-002 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Implement test: fetches calendars for workspace

- [ ] TASK-028-003 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Implement test: fetches events for workspace

- [ ] TASK-028-004 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Implement test: creates calendar and invalidates query

- [ ] TASK-028-005 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Implement test: updates calendar and invalidates query

- [ ] TASK-028-006 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Implement test: deletes calendar and invalidates queries

- [ ] TASK-028-007 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Implement test: creates event and invalidates query

- [ ] TASK-028-008 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Implement test: updates event and invalidates query

- [ ] TASK-028-009 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Implement test: deletes event and invalidates query

- [ ] TASK-028-010 | AGENT | `apps/web/src/hooks/useCalendarData.test.ts`
  Run useCalendarData tests: `pnpm --filter @life-os/web test -- useCalendarData`

- [ ] TASK-028-011 | AGENT | `apps/web/src/hooks/`
  Run type checking: `pnpm --filter @life-os/web typecheck`

---

## TASK-029: Implement worker background job processing tests

- [ ] TASK-029
- Status: ready
- Related Files: `apps/worker/src/index.test.ts`, `apps/worker/src/index.ts`
- Definition of Done: All 4 test placeholders implemented, tests pass
- Out of Scope: None
- Rules to Follow:
  - Mock pg-boss job queue
  - Test job processing logic
  - Test error handling
- Advanced Coding Pattern: Integration testing with mocked job queue
- Anti-Patterns: Testing implementation details, missing error cases
- Imports/Exports: None
- Depends On: TASK-003, TASK-004, TASK-006, TASK-007
- Blocks: None

### Subtasks

- [ ] TASK-029-001 | AGENT | `apps/worker/src/index.ts`
  Read worker index to understand job processing logic and pg-boss integration.

- [ ] TASK-029-002 | AGENT | `apps/worker/src/index.test.ts`
  Implement test: implements background job processing logic

- [ ] TASK-029-003 | AGENT | `apps/worker/src/index.test.ts`
  Implement test: handles pg-boss job queue events

- [ ] TASK-029-004 | AGENT | `apps/worker/src/index.test.ts`
  Implement test: processes audit log events

- [ ] TASK-029-005 | AGENT | `apps/worker/src/index.test.ts`
  Implement test: processes outbox events for publishing

- [ ] TASK-029-006 | AGENT | `apps/worker/src/index.test.ts`
  Run worker tests: `pnpm --filter @life-os/worker test`

- [ ] TASK-029-007 | AGENT | `apps/worker/src/`
  Run type checking: `pnpm --filter @life-os/worker typecheck`

---

## Summary

Total Tasks: 29
Total Subtasks: 287

### Task Categories

1. **Code Cleanup** (1 task): TASK-001 - Remove deprecated code
2. **Command Pattern** (1 task): TASK-002 - Core infrastructure
3. **Audit Logs** (2 tasks): TASK-003 (tasks), TASK-006 (calendar)
4. **Outbox Events** (2 tasks): TASK-004 (tasks), TASK-007 (calendar)
5. **Calendar Command Pattern** (1 task): TASK-005
6. **Mobile PowerSync Queries** (4 tasks): TASK-008, TASK-009, TASK-010, TASK-011
7. **Mobile Command Queue** (2 tasks): TASK-012 (projects), TASK-013 (tasks)
8. **Mobile Auth** (2 tasks): TASK-014 (sign-in), TASK-015 (sign-out)
9. **Mobile UI Modals** (3 tasks): TASK-016, TASK-017, TASK-018
10. **UI Component Tests** (4 tasks): TASK-019, TASK-020, TASK-021, TASK-022
11. **Web Hook Tests** (6 tasks): TASK-023, TASK-024, TASK-025, TASK-026, TASK-027, TASK-028
12. **Worker Tests** (1 task): TASK-029

### Dependency Chain

Critical Path:
TASK-002 (command pattern) -> TASK-003, TASK-004, TASK-005 (audit/outbox integration) -> TASK-006, TASK-007 (calendar audit/outbox) -> TASK-029 (worker tests)

Mobile Path:
TASK-008, TASK-009, TASK-010, TASK-011 (PowerSync queries) -> TASK-012, TASK-013 (command queue) -> TASK-016, TASK-017, TASK-018 (UI modals)

Auth Path:
TASK-014 (sign-in) -> TASK-015 (sign-out)

Test Path:
Independent tasks (TASK-019 through TASK-029) can run in parallel after dependencies are met
