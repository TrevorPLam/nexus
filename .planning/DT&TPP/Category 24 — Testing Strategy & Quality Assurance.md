<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 24 — Testing Strategy \& Quality Assurance

**Recommendation: adopt a risk-based test pyramid with Vitest for unit and
integration tests, PostgreSQL-backed integration tests for database/RLS/command
behavior, Playwright for web end-to-end testing, and Maestro for high-value Expo
mobile end-to-end flows.** Add Detox only if Maestro cannot provide the
deterministic native synchronization or test control required for the most
critical offline/notification/account-switch scenarios.[^1][^2][^3]

The most important principle is not “maximize test count.” It is to prove the
product’s highest-risk guarantees: workspace isolation, offline command
convergence, idempotency, account switching, calendar/OAuth safety,
background-job correctness, and privacy-safe client behavior.

## Core Decision

```text
Test runner/assertions:           Vitest
Unit tests:                       Domain/application packages, pure utilities, schemas
Backend route tests:              Hono app.request() + Vitest
Database integration:             Ephemeral PostgreSQL/Supabase-compatible test database
RLS/security tests:               Real PostgreSQL roles/JWT claims/policies; no mocked RLS
Worker/job tests:                 pg-boss + transactional outbox against real PostgreSQL
Web E2E:                          Playwright
Mobile E2E:                       Maestro on EAS development/preview builds
Mobile native E2E escalation:     Detox for critical offline/notification/account-switch scenarios requiring gray-box synchronization
Visual regression:                Targeted Storybook/component screenshots
Contract testing:                 Zod/OpenAPI schema tests + API compatibility checks
Load/performance:                 k6 or Artillery, focused on API/worker/integration pressure
Accessibility:                    Automated checks plus manual keyboard/VoiceOver/TalkBack reviews
CI policy:                        Fast checks on PR; integration/E2E shards; nightly resilience suite
```

Playwright provides a cross-browser end-to-end framework with automatic
actionability waiting, assertions, test isolation, tracing, and parallel
execution. Maestro provides YAML-based mobile and web UI automation flows,
making it a practical initial choice for Expo build validation.[^4][^3][^1]

## 2026 Research Validation

The core testing strategy recommendations above are validated against July 2026
research:

### Vitest Confirmed as Default Choice

- **Performance advantage**: Vitest is 3-5x faster in cold starts and 20-28x
  faster in watch mode compared to Jest 30, with 50%+ memory reduction
- **Modern stack alignment**: Native ESM support (no experimental flags),
  zero-config TypeScript via esbuild, and seamless Vite integration
- **New capabilities**: Vitest 4.0 stable browser mode enables component testing
  in real Chromium, reducing false-passing tests from jsdom simulation
- **Industry consensus**: Vitest is the recommended default for new
  JavaScript/TypeScript projects in 2026; Jest remains viable only for React
  Native projects or massive legacy codebases
- **Decision rationale**: The Life OS monorepo uses Vite for web and shares
  configuration across packages, making Vitest the natural choice

### Playwright Strengthened as Web E2E Standard

- **Cross-browser dominance**: Native Chromium, Firefox, and WebKit support with
  no external services required
- **Performance leadership**: 3-5x faster with parallel execution; 0.4% flake
  rate vs 1.9% for Cypress in 2026 benchmarks
- **Architecture advantages**: Out-of-process driver enables true multi-tab,
  multi-origin, WebSocket, and service worker testing
- **AI integration**: Official @playwright/mcp server enables AI agents to drive
  browsers and generate tests from natural language
- **TypeScript excellence**: First-class types in core package vs Cypress
  requiring additional @types packages
- **Decision rationale**: Life OS requires Safari coverage for web, uses
  TypeScript throughout, and needs multi-origin testing for OAuth flows

### Maestro + Detox Hybrid Strategy Validated

- **Maestro strengths**: 10-15 minute setup time, YAML-based authoring enables
  non-engineers to write tests, auto-retry handles timing flakiness, Maestro
  Cloud simplifies CI parallelization
- **Detox strengths**: Gray-box synchronization with React Native runtime
  delivers <2% flakiness, TypeScript test code with full IDE support, deepest
  React Native integration
- **2026 consensus**: Industry recommendation is to start with Maestro for
  critical user flows and add Detox for complex scenarios requiring
  deterministic synchronization
- **Performance context**: Maestro executes flows in 15-20s, Detox in 20-30s
  (sync overhead), Appium in 30-45s (WebDriver overhead)
- **Decision rationale**: Life OS MVP needs fast coverage of core flows
  (Maestro) with Detox escalation for offline sync, PowerSync integration, and
  notification scenarios where gray-box sync prevents timing-related flakiness

### Modern Testing Strategy Shifts

- **Testing trophy over pyramid**: Integration tests (60%) should form the bulk
  of the suite, with unit tests for pure functions only and a thin E2E cap. This
  reflects that SaaS bugs live in integration glue, not isolated functions
- **Contract testing critical**: Every third-party boundary (Stripe, Clerk,
  Supabase, Google Calendar) needs contract tests run nightly to catch API shape
  changes before customers do
- **Flaky test quarantine**: Tests that fail on unrelated PRs must be
  quarantined within 24 hours; otherwise teams normalize red and real bugs ship
  under cover of "probably just the flaky one"
- **Snapshot test discipline**: Use only for genuinely opaque output (compiled
  SQL, HTML email) or small snapshots humans will actually read. Explicit
  assertions are preferred over blind snapshot updates
- **AI-generated test scrutiny**: AI excels at writing tests that pass, not
  tests that catch bugs. Review must verify that deleting implementation would
  cause the test to fail for the right reason

## Quality Goals

The test strategy must verify:

- A user can operate core planner functions offline.
- Offline commands are durable, idempotent, and reconcile correctly.
- User A cannot access User B’s or another workspace’s data.
- Sign-out and account/workspace switching remove protected local state.
- Hono commands enforce authorization, validation, idempotency, audit, and
  outbox behavior.
- Calendar/OAuth/webhook flows tolerate retries, revocation, duplicates, and
  provider failure.
- Worker jobs survive restart/retry and do not duplicate external side effects.
- Notifications respect permission, privacy, scheduling, cancellation, and
  deep-link safety.
- Search/storage/realtime paths do not leak cross-workspace metadata or personal
  content.
- Web/mobile UX remains accessible and reliable across key browsers/devices.
- Releases can be promoted without bypassing schema, migration, security, and
  observability checks.

## Test Pyramid

| Layer                | Purpose                                                                  | Primary tools                                       |   Speed |  Required on PR |
| :------------------- | :----------------------------------------------------------------------- | :-------------------------------------------------- | ------: | --------------: |
| Static checks        | Type safety, lint, formatting, dependency boundaries, secret scan        | TypeScript, ESLint, Prettier, custom boundary rules | Seconds |             Yes |
| Unit                 | Pure domain rules, schemas, utilities, reducers, ranking/scheduling math | Vitest                                              | Seconds |             Yes |
| Component            | Rendering, forms, accessibility states, interaction logic                | Vitest + Testing Library                            | Seconds |             Yes |
| Route/contract       | Hono validation/auth/error mapping/API DTO shape                         | Vitest + Hono `app.request()`                       | Seconds |             Yes |
| Database integration | Transactions, RLS, migrations, indexes, idempotency, outbox              | Vitest + real PostgreSQL                            | Minutes |             Yes |
| Worker integration   | Queue retries, leases, dedupe, delayed jobs, provider adapters           | Vitest + pg-boss/PostgreSQL                         | Minutes |             Yes |
| Web E2E              | Browser-level user journeys                                              | Playwright                                          | Minutes | Critical subset |
| Mobile E2E           | Real Expo app flows                                                      | Maestro                                             | Minutes |    Smoke subset |
| Visual regression    | Token/component/page visual changes                                      | Storybook + Playwright screenshots                  | Minutes |        Targeted |
| Load/resilience      | Capacity, failure/recovery, race conditions                              | k6/Artillery + scripted chaos                       |  Longer | Nightly/release |
| Manual exploratory   | UX, permissions, accessibility, real device/provider behavior            | Test charters                                       |   Human |    Beta/release |

Do not replace database integration tests with mocks for RLS, transaction, SQL
constraints, outbox locking, or pg-boss behavior. Those are core architecture
risks that only a real PostgreSQL environment can prove.

## Tool Choices

### Vitest

Select Vitest as the default TypeScript test runner because it is fast,
Vite-compatible for React packages, works well in monorepos, and supports unit,
component, API-route, and integration test layers.

Use it for:

```text
packages/domain
packages/application
packages/contracts
packages/api-client
packages/mobile-data query/command logic
packages/jobs
apps/backend route adapters
apps/web and apps/mobile component logic
```

Rules:

- Keep tests deterministic: inject time, random IDs, network adapters, and
  provider clients.
- Use fake timers only for pure scheduling/retry logic; use real database time
  in integration tests where transaction behavior matters.
- Avoid snapshots of large rendered trees or error objects.
- Prefer behavioral assertions and explicit expected values.
- Test error paths and invariants at least as deliberately as happy paths.

### Playwright for web

Select Playwright for web E2E. It supports Chromium, WebKit, and Firefox with
one API, and its isolated browser contexts prevent accidental state sharing
between tests. Next.js also documents Playwright as its recommended E2E option
for App Router applications.[^5][^2][^1]

Use Playwright for:

- Clerk sign-in/sign-out test flows.
- Web Today, task command, project/calendar/note navigation.
- Workspace switch and cache isolation.
- Browser deep links and route protection.
- OAuth initiation/return simulations.
- Billing/account/export/deletion confirmation workflows.
- Responsive desktop/tablet smoke coverage.
- Accessibility keyboard journeys.
- Web realtime invalidation behavior.
- Download/upload attachment flows with fixture files.
- Safe error and offline/network-degraded UX.

### Maestro for mobile

Select Maestro first for mobile E2E because it offers readable YAML flows and
supports mobile UI automation. It is well suited to validating end-user
workflows on EAS development and preview builds without building an extensive
native test harness immediately.[^3]

Use Maestro for:

- Auth bootstrap and authenticated tab navigation.
- Create, complete, defer, and schedule a task.
- Offline task action -> restart -> reconnect -> converged state.
- App sign-out/account switch local-data cleanup.
- Permission request and denied-state UX.
- Notification deep-link routing.
- Calendar connection return/callback state.
- Theme, large-text, and accessibility smoke scenarios.
- Release-candidate install/launch/smoke tests.

### Detox contingency

Detox is a strong React Native E2E option when deterministic synchronization
with the React Native runtime and deeper native control are necessary. Its setup
requires building dedicated iOS simulator and Android emulator
configurations.[^6]

Adopt Detox only if one or more of these conditions occurs:

- Maestro cannot reliably test a critical offline synchronization or
  background/foreground flow.
- Native module behavior requires deterministic synchronization Maestro cannot
  observe.
- The team needs low-level control over app launch arguments, network mocking,
  native permissions, or internal test hooks.
- Maestro flakiness persists after good identifiers, stable test data, and
  environment controls.

Do not run both frameworks broadly by default. Maintain Maestro for
product-level regression flows and add Detox only for the narrow failures it
demonstrably solves.

## Environment Strategy

### Isolated environments

| Environment          | Purpose                                                   | Data policy                             |
| :------------------- | :-------------------------------------------------------- | :-------------------------------------- |
| Local unit/component | Fast developer feedback                                   | Fixtures/fakes only                     |
| Local integration    | Database/RLS/job tests                                    | Disposable seeded data                  |
| CI integration       | Repeatable Postgres-backed suite                          | Per-run ephemeral database/schema       |
| Shared staging       | Cross-service, OAuth/provider sandbox, preview validation | Synthetic test users/workspaces only    |
| Preview mobile/web   | Stakeholder/QA validation                                 | Isolated preview tenant/config          |
| Production           | Smoke checks only, controlled                             | Dedicated synthetic canary account only |

Never run destructive test suites against production user data. Never point test
builds at production Clerk, PowerSync, notification, storage, or Google OAuth
credentials.

### Test identity model

Create dedicated Clerk test users and internal app identities:

```text
qa-owner-a
qa-member-a
qa-owner-b
qa-revoked-user
qa-no-notification-permission
qa-calendar-connected
qa-calendar-revoked
qa-billing-free
qa-billing-entitled
```

Each has deterministic, non-personal fixture data. Do not use developer personal
accounts or real calendars for automated tests.

## Database Testing

### Real PostgreSQL is mandatory

Run schema/migration/RLS tests against PostgreSQL close to the Supabase
production version/configuration. A lightweight SQLite substitute is not
acceptable for:

```text
RLS policies
JWT claim mapping
PostgreSQL transactions/isolation
GIN/trigram search indexes
advisory locks
outbox claiming
pg-boss queue behavior
generated columns/functions
Supabase extensions/features
```

### Migration test flow

Every migration must be tested through:

```text
1. Start from empty schema -> apply all migrations -> run schema assertions.
2. Start from prior release schema -> apply new migration -> validate upgrade behavior.
3. Seed realistic fixture data -> run application integration tests.
4. Confirm RLS policies, indexes, triggers/functions, constraints, and permissions.
5. Rollback plan reviewed; destructive migrations require expand/contract rollout.
```

Do not use automatic destructive schema push in production. All production
migrations are versioned, reviewed, and applied through CI/CD with backups and
release coordination.

### RLS test matrix

For every protected table or API operation, test at least:

| Actor                                 | Expected                                  |
| :------------------------------------ | :---------------------------------------- |
| Unauthenticated                       | Denied                                    |
| Workspace owner                       | Authorized permitted operation            |
| Workspace member                      | Allowed only by role/policy               |
| User from another workspace           | Zero rows / denied                        |
| Former/revoked member                 | Denied                                    |
| Service/worker role                   | Only explicitly allowed operational scope |
| Malformed/missing claims              | Denied                                    |
| Client-supplied workspace ID mismatch | Denied or scoped to verified membership   |

RLS must be tested both through direct database roles/session claims and through
Hono API routes. Passing an API authorization test does not prove the database
policy is correct.

## Command and Offline Tests

### Command contract matrix

For every command type:

```text
CreateTask
RenameTask
ScheduleTask
CompleteTask
ReopenTask
DeferTask
SplitTask
CreateNativeTimeBlock
MoveTimeBlock
UpdateNote
LinkEntities
DeleteAttachment
ConnectCalendar
DisconnectCalendar
```

Test:

1. Valid command accepted.
2. Invalid Zod payload rejected.
3. Missing/expired auth rejected.
4. Wrong workspace rejected.
5. Entity missing/deleted handled safely.
6. Repeated same command ID returns the original safe result.
7. Same idempotency key with different payload is rejected.
8. Domain invariant violation returns stable typed error.
9. Transaction creates authoritative rows, audit record, and outbox record
   together.
10. Side effect eventually executes through worker.
11. Server/projection result converges through PowerSync/client state.
12. Retry after partial failure does not duplicate outcome.

### Offline scenario suite

The highest-value tests simulate actual mobile offline behavior:

| Scenario                                 | Expected result                                          |
| :--------------------------------------- | :------------------------------------------------------- |
| Launch offline with existing replica     | Today/tasks available locally                            |
| Create task offline                      | Local task and command survive restart                   |
| Complete task offline                    | Immediate pending UI; server convergence after reconnect |
| Reconnect after multiple commands        | Exactly-once/idempotent server results                   |
| Server rejects stale/invalid action      | Local state reconciles; Sync Issues persists             |
| Device loses connection mid-upload       | Upload state recoverable; no false success               |
| Account switch offline                   | Old replica is not exposed to next user                  |
| Membership revoked during offline period | Sync stops/clears safely on reconnect                    |
| App killed during queued command         | Command persists and recovers                            |
| Duplicate command delivery               | One effective authoritative action                       |

Run these at three levels:

- Unit tests for command state machine.
- Database/worker integration tests for idempotency/outbox.
- Maestro/Detox flows on a real app build with controllable network conditions.

## Worker and Job Tests

The jobs category selected PostgreSQL outbox plus pg-boss. Test both components
together.

### Required scenarios

| Scenario                                       | Expected behavior                                  |
| :--------------------------------------------- | :------------------------------------------------- |
| Domain transaction commits                     | Outbox row exists atomically                       |
| Worker is down at commit                       | Work begins after worker recovery                  |
| Outbox dispatcher retries                      | One logical queue job, no lost event               |
| Job runs twice                                 | Idempotent external/internal effect                |
| Worker crashes after provider accepted request | Retry detects prior operation and avoids duplicate |
| Provider rate limit                            | Backoff honors normalized retry policy             |
| Calendar connection lock                       | No parallel sync for same connection               |
| Bulk task edits                                | Planning jobs coalesce by workspace/date           |
| Delayed reminder becomes obsolete              | Job revalidates and skips                          |
| Dead-letter condition                          | Safe failure record, alert, controlled retry path  |
| Deploy shutdown                                | In-flight job leased/retried safely                |
| DST/timezone transition                        | Reminder time calculation follows policy           |

Use provider fakes for most tests, but run scheduled sandbox tests against real
Google/Expo/Stripe integrations in staging.

## API and Contract Tests

### Contract source

Zod schemas in `packages/contracts` define request/response/error shapes.
Verify:

- Hono route accepts all valid fixture variants.
- Invalid payloads yield standard `VALIDATION_ERROR`.
- Every non-2xx response conforms to common API error schema.
- Successful responses conform to expected DTO schema.
- OpenAPI document includes expected endpoint/security/request/response
  declarations.
- API client parses valid responses and safely handles malformed/unexpected
  payloads.
- Additive changes remain backward compatible; breaking changes require explicit
  API version decision.

### Consumer-style compatibility tests

Because mobile binaries can lag backend releases:

- Maintain fixtures representing the currently supported mobile/web release
  contracts.
- Test the backend against those fixtures before deployment.
- Avoid removing/renaming fields during active client support window.
- Add fields as optional and provide server defaults when possible.
- Fail CI if OpenAPI compatibility diff detects an accidental breaking change.

## Web E2E Strategy

### Browser matrix

| Suite                    | Browsers                            | Frequency         |
| :----------------------- | :---------------------------------- | :---------------- |
| PR smoke                 | Chromium                            | Every PR          |
| Main branch regression   | Chromium + WebKit + Firefox         | Main/merge queue  |
| Release candidate        | Chromium + WebKit + Firefox         | Before production |
| Responsive smoke         | Chromium desktop + mobile emulation | Main/release      |
| Manual Safari validation | Real Safari where needed            | Beta/release      |

Playwright supports Chromium, Firefox, and WebKit across operating systems and
can run tests in parallel with isolated browser contexts.[^1][^4]

### Stable locator policy

Use accessible, user-facing locators first:

```text
getByRole
getByLabel
getByText for stable visible labels
getByTestId only when semantic locator is impractical
```

Playwright recommends prioritizing user-facing attributes and explicit test IDs
where contracts are otherwise unstable.[^7]

Do not select by:

```text
CSS class names
Tamagui-generated DOM structure
nth-child
visual position
implementation-specific icon paths
random IDs
```

## Mobile E2E Strategy

### Build policy

Run mobile E2E against EAS development or preview builds—not Expo Go—because
production dependencies include PowerSync, secure storage, notifications, and
native configuration.

Initial device matrix:

| Platform         | PR smoke               | Nightly/release                                                     |
| :--------------- | :--------------------- | :------------------------------------------------------------------ |
| iOS              | One current simulator  | Current + prior supported iOS simulator/device                      |
| Android          | One current emulator   | Current + lower/mid API-level emulator/device                       |
| Physical devices | Manual targeted checks | Required for push, deep links, permissions, real OAuth, performance |

### Test IDs

Expose stable `testID` values only for key controls where accessibility labels
cannot uniquely identify an element:

```text
task-row-<safe-id>
quick-capture-open
task-complete
task-schedule
sync-issues-entry
notification-permission-enable
calendar-connect
```

Do not put raw task titles, note content, user emails, tokens, or personally
meaningful IDs into test IDs. Test fixture IDs must be synthetic.

## Accessibility QA

### Automated checks

- Web: axe-core integration in component and Playwright test paths.
- Validate landmark/headings, labels, roles, focus visibility, dialog semantics,
  contrast where tooling supports it.
- Mobile: test accessible labels/roles/state; use platform accessibility
  inspector when available.
- Run large-text/dynamic-type snapshots for Today, Task Detail, Quick Capture,
  Settings, and Sync Issues.

### Manual critical-path checks

Before beta/release, test:

```text
Web:
  Keyboard-only sign-in, Today, capture, task completion, scheduling,
  search, dialog focus trap, settings, sign-out

iOS:
  VoiceOver plus Dynamic Type

Android:
  TalkBack plus font scaling

Both:
  Reduced motion, dark theme, error/pending/offline states
```

Automated accessibility tests catch structural issues; they cannot verify
whether a planner interaction is understandable or whether task/sync states are
communicated well.

## Visual Regression

Use targeted visual regression, not blanket screenshot snapshots.

Test:

- Shared primitives: Button, Field, Dialog/Sheet, StatusIndicator.
- Product patterns: TaskRow, CalendarBlock, SyncStatus, empty/error/offline
  states.
- Critical routes: Today, Task Detail, Quick Capture, Calendar, Integration
  Settings.
- Light/dark themes, long text, errors, high text scale, narrow/wide web
  viewport.

Avoid visual snapshots for dynamic dates, live calendar events, random avatars,
asynchronous skeletons, or third-party Clerk surfaces unless fully
mocked/stabilized.

## Performance and Load

### Tooling

Use k6 or Artillery for backend load tests. The exact tool is less important
than running production-like scenarios against isolated staging infrastructure.

### Required load profiles

| Flow                | Test                                                        |
| :------------------ | :---------------------------------------------------------- |
| Command API         | Sustained task create/complete/defer with idempotency keys  |
| PowerSync token     | Refresh burst during mobile app open/reconnect              |
| Calendar webhook    | Duplicate/burst provider events                             |
| Outbox/worker       | Queue backlog recovery after worker outage                  |
| Planning projection | Bulk rescheduling/coalescing workload                       |
| Search              | Concurrent queries with varying length/filter complexity    |
| Storage             | Upload initiation/completion, not raw file transfer only    |
| Notifications       | Scheduled delivery burst and invalid token receipt handling |
| Realtime            | Workspace invalidation fan-out and reconnect burst          |

Track latency, error rate, database pool usage, queue age, provider throttling,
and output correctness—not only requests per second.

## Security Testing

### Automated security gates

Run on every PR or merge where relevant:

```text
Secret scanning
Dependency vulnerability scan
License policy scan
SAST/lint rules for unsafe APIs
Docker/container image scan
Infrastructure/configuration scan
OpenAPI/auth endpoint diff review
```

### Application security tests

Test:

- JWT signature/issuer/audience/expiry/type failures.
- Cross-workspace IDOR attempts.
- RLS bypass attempts.
- CORS and redirect allowlist behavior.
- CSRF for cookie-based browser mutation routes.
- Rate-limit enforcement and idempotency collisions.
- Webhook signature verification with altered raw body.
- OAuth state/PKCE replay and redirect manipulation.
- Signed storage URL expiry and cross-workspace download attempts.
- Realtime topic subscription authorization.
- Deep-link parameter validation.
- Log/Sentry/trace redaction of secrets and content.

Do not use production credentials or user data in automated security scans.

## CI/CD Quality Gates

### Pull request

```text
Install with locked dependencies
Typecheck
Lint/format
Unit/component/route tests
Contract/API-client tests
Database integration/RLS/outbox tests
Build web, backend, worker, mobile
Secret/dependency/license scans
Chromium Playwright smoke
Targeted visual/accessibility checks
```

### Main branch/nightly

```text
Full browser matrix
Full database/worker integration suite
Maestro mobile regression on iOS/Android
PowerSync offline/reconnect suite
Staging Google/Stripe/Expo sandbox checks
Load smoke
Schema/index/reconciliation checks
Telemetry/redaction test suite
```

### Release candidate

```text
Migration rehearsal from production-like snapshot
Deploy to staging
Cross-browser and real-device E2E
OAuth, webhook, push notification validation
Offline/account-switch/deep-link manual checks
Accessibility review
Rollback rehearsal
Sentry source-map/release verification
Operational dashboard/alert smoke
```

A failing flaky test must be treated as a defect. Do not normalize rerunning
failed tests until green as a release practice; investigate, quarantine only
with owner/expiry, and fix or remove the unreliable test.

## Test Data and Fixtures

- Use factories/builders for domain entities with safe default values.
- Make fixture clocks/timezones explicit.
- Use deterministic IDs where assertions need them; avoid random snapshot noise.
- Seed one small default workspace plus specialized fixtures rather than a giant
  shared mutable dataset.
- Give every E2E test its own workspace/user when possible.
- Clean up through database reset/schema teardown, not brittle UI deletion
  flows.
- Never include real personal calendar/note/task data in source control,
  snapshots, logs, screenshots, or test artifacts.
- Encrypt/restrict access to staging test recordings, screenshots, traces, and
  build artifacts; expire them quickly.

## Test Ownership

| Area                            | Minimum owner                           |
| :------------------------------ | :-------------------------------------- |
| Domain invariants and commands  | Feature/domain engineer                 |
| RLS, migrations, database roles | Backend/data owner                      |
| API contracts                   | Backend + client owner                  |
| Worker/job correctness          | Backend/integration owner               |
| Web E2E                         | Web owner                               |
| Mobile E2E/offline flows        | Mobile owner                            |
| OAuth/webhooks/provider sandbox | Integration owner                       |
| Accessibility                   | Web/mobile feature owner with QA review |
| Release validation/runbooks     | Engineering lead/release owner          |

Every production defect should result in one of:

- A regression test at the lowest effective layer.
- A new metric/alert/dashboard indicator.
- A runbook improvement.
- An architectural guardrail.
- A documented reason why automated prevention is not feasible.

## Trade-Offs

| Choice                            | Gain                                                   | Cost                                                            |
| :-------------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------- |
| Vitest as broad default           | Fast, consistent TypeScript testing                    | Needs real DB/mobile tools for platform-specific risks          |
| Real PostgreSQL integration tests | Validates RLS, transactions, outbox, pg-boss correctly | Slower setup/execution than mocks                               |
| Playwright                        | Strong cross-browser web E2E, tracing, parallelism     | Requires careful fixtures/locators to avoid slow/flaky suite    |
| Maestro first for mobile          | Fast readable Expo mobile workflows                    | May lack deterministic depth for some native/offline conditions |
| Detox only on demonstrated need   | Avoids duplicate mobile E2E maintenance                | Requires later setup if Maestro limitations appear              |
| Risk-based E2E subset on PR       | Fast feedback                                          | Full confidence shifts to nightly/release suites                |
| Visual regression targeted        | Catches meaningful design regressions                  | Does not replace behavior/accessibility testing                 |
| Real provider sandbox tests       | Finds integration configuration defects                | Slower, cost/quota/rate-limit management needed                 |

## Final Decision

Lock the following quality architecture:

```text
Primary test runner:            Vitest
Unit/component/API route tests: Vitest + Testing Library + Hono app.request()
Database/RLS/outbox/jobs:       Real ephemeral PostgreSQL integration environment
Web E2E:                        Playwright
Mobile E2E:                     Maestro on EAS development/preview builds
Mobile escalation:              Detox for critical offline/notification/account-switch scenarios requiring gray-box synchronization
Contract safety:                Zod DTO/error validation, OpenAPI compatibility checks, supported-client fixtures
Visual QA:                      Targeted Storybook/component screenshots
Accessibility:                  axe-style automation plus manual keyboard, VoiceOver, and TalkBack checks
Performance:                    k6/Artillery against isolated staging
Security:                       Secret/dependency/SAST scans plus IDOR/RLS/OAuth/webhook/redaction suites
CI:                             Fast deterministic gates on PR; broad integration/device/provider suites nightly and before release
Top regression priorities:      Cross-workspace isolation, offline durability, idempotency, account switching,
                                calendar/OAuth/webhooks, job recovery, notification safety, and telemetry redaction
```

This architecture is validated by July 2026 research confirming Vitest as the
modern default for TypeScript projects, Playwright as the de facto standard for
cross-browser E2E testing, and the Maestro + Detox hybrid approach as the
industry-recommended pattern for React Native applications requiring both fast
coverage and deterministic synchronization for critical offline scenarios.

The next category in dependency order is **CI/CD, Environments \& Release
Management**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://playwright.dev/docs/intro

[^2]: https://nextjs.org/docs/app/guides/testing/playwright

[^3]: https://docs.maestro.dev/

[^4]: https://playwright.dev/

[^5]: https://playwright.dev/docs/browsers

[^6]: https://wix.github.io/Detox/docs/contributing/code/building-and-testing/

[^7]: https://playwright.dev/docs/best-practices

[^8]: https://playwright.dev/docs/writing-tests

[^9]: https://learn.microsoft.com/en-us/azure/playwright-testing/

[^10]: https://playwright.dev/docs/api/class-test

[^11]: https://azure.microsoft.com/en-us/products/playwright-testing

[^12]: https://www.browserstack.com/guide/playwright-tutorial

[^13]:
    https://learn.microsoft.com/en-us/shows/getting-started-with-end-to-end-testing-with-playwright/introduction-to-playwright-for-end-to-end-testing

[^14]: https://oneuptime.com/blog/post/2026-01-26-playwright-e2e-testing/view

[^15]:
    https://assets.ctfassets.net/ut4a3ciohj8i/2x9exeEMY2KQ0kMd59HR8S/727f9cf04bbbaaef7168ed24087f0124/Playwright_Test.pdf
