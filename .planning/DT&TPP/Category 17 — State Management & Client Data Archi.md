<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 17 — State Management \& Client Data Architecture

**Recommendation: use PowerSync SQLite as the authoritative client-side source for replicated Life Graph entities on mobile; use TanStack Query only for non-replicated HTTP/server state; use small, feature-scoped Zustand stores for ephemeral UI state; and use React Hook Form for form state.** Do not use Redux, React Query, Zustand, or component props as a second canonical store for tasks, events, notes, projects, or other PowerSync-replicated entities.[^1][^2][^3]

The essential rule is simple:

> **Every category of client state gets one clear owner.**

Most offline bugs are not caused by a missing cache library. They arise when the same task is simultaneously represented in PowerSync SQLite, a React Query cache, a global Zustand entity store, form state, and an optimistic component state.

## State Ownership Model

| State category | Owner | Web | Mobile | Why |
| :-- | :-- | :-- | :-- | :-- |
| Replicated tasks, projects, goals, events, notes, contacts, entity links, plan projections | **PowerSync local SQLite** | Hono API / future web realtime; no PowerSync initially | PowerSync reactive queries | Offline-capable, selective replication, one local entity truth |
| Offline command queue and command outcome | **PowerSync/local mobile DB + backend authoritative result** | Hono command API state | PowerSync upload queue/local command records | Durable retry, reconciliation, no ad hoc pending mutation cache |
| Non-replicated remote state: profile, entitlement, integration status, export status | **TanStack Query** | Yes | Yes, narrowly | Standard HTTP cache/invalidation/retry behavior |
| Authentication session | **Clerk SDK** | Clerk Next.js SDK | Clerk Expo SDK + secure token cache | Identity/session lifecycle belongs to provider |
| Router/navigation state | **Next.js URL/router / Expo Router** | URL and App Router | Expo Router | Deep links, back/forward, recoverable state |
| Form inputs and validation | **React Hook Form + Zod** | Yes | Yes | Controlled validation and submit lifecycle |
| Short-lived UI state | **React state/reducer** | Yes | Yes | Smallest adequate scope |
| Cross-screen ephemeral UI state | **Feature-scoped Zustand store** | Yes when justified | Yes when justified | Useful for UI coordination, not domain entity caching |
| Theme preference | **Theme provider + local preference** | Yes | Yes | UI setting; optionally sync later |
| Server authority | **PostgreSQL + Hono command/API layer** | Yes | Yes | Client state never replaces server authorization/invariants |

PowerSync’s React hooks are designed to re-render components when local query results change and expose connectivity state.  TanStack Query is designed for asynchronous server-state fetching, caching, and updates rather than general global state.[^2][^3]

## Requirements

The client data architecture must support:

- Mobile offline-first reads and optimistic user interactions.
- Selective PowerSync replication and safe account/workspace switching.
- Typed command submission, idempotency, retries, rejection reconciliation, and Sync Issues UX.
- Web server-rendered initial data plus interactive remote caching.
- Clerk authentication lifecycle and token refresh.
- Clear loading, stale, offline, pending, conflict, and error states.
- Avoidance of cross-user local-cache leakage.
- Predictable testing and observability.
- No duplicate entity truth layers.


## State-Management Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **PowerSync + TanStack Query + React state + narrow Zustand** | Best tool for each state category; preserves offline SQLite authority; minimal custom cache/sync logic; mature ecosystem | More than one library, requires strict ownership rules; PowerSync requires separate sync service | **Select** |
| **Supastash (Alternative)** | Direct Supabase integration; no separate sync service; simpler setup; built-in conflict resolution; replication mode for multi-device; experimental desktop support | Supabase-only; newer ecosystem (less battle-tested); requires specific table schema; less mature than PowerSync | **Consider as alternative** if Supabase-first approach preferred |
| TanStack Query for all remote/offline data | Excellent HTTP server-state tooling; React Native support; persistence options | Does not replace relational local database, selective replication, durable sync protocol, or command reconciliation | Reject as primary mobile entity layer |
| Redux Toolkit / RTK Query | Mature, predictable global state and API tooling; excellent if already using Redux | Large surface area; encourages a parallel normalized entity store; duplicates PowerSync/TanStack roles; unnecessary if not already using Redux | Reject |
| Zustand for all state/data | Small API and simple DX; ~1KB gzipped; actively maintained | Easy to create unbounded global stores, ad hoc persistence, and stale duplicate entities | Reject as universal solution |
| Jotai | Fine-grained reactive UI state; atomic model; actively maintained (Recoil is deprecated) | Atom graph becomes another entity cache; unnecessary alongside local reactive SQL; different mental model | Reject for this architecture |
| Recoil | Atomic state model | Effectively unmaintained (last release 2023); React 18/19 bugs; deprecated in 2026 | **Reject** - use Jotai if atomic model needed |
| MobX | Reactive model ergonomics | Implicit mutation patterns; another source of truth; less aligned with command/event architecture | Reject |
| XState for all app state | Explicit state machines, excellent for complex flows | Excessive for normal list/detail UI; adds modeling overhead | Use selectively for critical workflows only |
| Custom Context-only state | No extra library | Poor for complex updates/performance; context becomes accidental global store | Use only for stable providers/configuration |
| TanStack DB | v0.6 adds SQLite persistence; cross-platform (browser, RN, Expo, Node, Electron, Tauri); reactive query engine; optimistic updates with acknowledgement tracking | Still in BETA (pre-v1); overlaps with PowerSync local database; less mature sync story; query-engine-first vs ORM-flavored | **Defer** - monitor for v1 stability; could complement PowerSync later |
| Synchro | PostgreSQL extension-based (no separate sync tier); WAL-based change detection; native Swift/Kotlin SDKs; deterministic sync | Requires PostgreSQL 18; Rust toolchain for extension; complex setup; newer ecosystem; React Native is bridge over native SDKs | **Defer** - promising but too early for MVP; evaluate if PostgreSQL extension approach aligns with long-term goals |
| Kosha | Ultra-lightweight (~450 bytes); React 18+ optimized; middleware support | Very new (2026); limited ecosystem; no devtools; unproven at scale | Reject for production use |
| connectivity-js | Declarative offline UI; queueing with deduplication; framework-agnostic core | New library (2026); limited adoption; adds another abstraction layer | Consider if offline UX patterns become complex, but not needed for MVP |

TanStack Query supports React Native, including integration with React Native focus and online state mechanisms.  It also offers `online`, `always`, and `offlineFirst` network modes, but this is HTTP-cache behavior, not a replacement for a synchronized relational SQLite replica.[^4][^1]

## Emerging Alternatives to Monitor (2026)

### Supastash
Supastash is a newer Supabase-first offline sync engine that provides two-way sync between Supabase and SQLite without requiring a separate sync service. It offers built-in conflict resolution, replication mode for multi-device scenarios, and experimental desktop support via Tauri.

**When to consider:**
- If the team wants a Supabase-only stack without external sync services
- If simpler setup and direct Supabase integration outweigh PowerSync's maturity
- If experimental desktop support is valuable for the roadmap

**Why PowerSync remains the primary recommendation:**
- More mature ecosystem and battle-tested production deployments
- Better Drizzle integration (critical for the current architecture)
- Stronger selective replication and sync stream capabilities
- Multi-platform support beyond Supabase (future flexibility)

### TanStack DB v0.6
TanStack DB added SQLite persistence in v0.6, making it a potential local-first database with cross-platform support (browser via WASM, React Native, Expo, Node, Electron, Tauri). It features a reactive query engine, optimistic updates with acknowledgement tracking, and hierarchical data projections.

**Current status:** BETA (pre-v1). The feature set is compelling, but maturity is insufficient for production use in the MVP.

**Future potential:** Could complement or partially replace PowerSync for specific use cases once stable, particularly for:
- Cross-platform consistency between web and mobile local data
- Complex client-side query patterns with fine-grained reactivity
- Agent-style workflows with reactive side effects

**Recommendation:** Monitor for v1 release and production stability. Evaluate in 2027 if the architecture needs evolve.

### Synchro
Synchro takes a PostgreSQL extension-based approach, running sync logic inside PostgreSQL via a Rust extension rather than a separate sync service. It offers WAL-based change detection, native Swift/Kotlin SDKs, and deterministic sync.

**Current status:** Very early (v0.1.x in 2026). Requires PostgreSQL 18, Rust toolchain for extension compilation, and complex setup.

**Future potential:** Interesting if the team wants to eliminate the sync tier entirely and keep logic close to the database. The extension model could reduce operational complexity at scale.

**Recommendation:** Defer evaluation. The PostgreSQL 18 requirement and Rust toolchain add significant complexity for MVP. Reassess in 2027 if the extension-based model proves compelling.

### Jotai vs Recoil
Recoil is effectively deprecated as of 2026 (last meaningful release in 2023, unresolved React 18/19 bugs). Jotai is the actively maintained spiritual successor with the same atomic model, better React 19/Suspense support, and a smaller bundle (~5KB vs ~24KB).

**Impact on this architecture:** Minimal, since neither is selected for the MVP. If atomic state becomes necessary later, Jotai is the clear choice over Recoil.

## Why This Combination Wins

### PowerSync owns mobile entity data

On mobile, tasks, time blocks, calendar events, notes, and planning projections must remain usable without network connectivity. The right representation is a real local database with reactive SQL queries, not an in-memory object store persisted as JSON.

```text
Mobile screen
  -> PowerSync React hook / local query
  -> SQLite replica
  -> changes from local command intent or sync stream
  -> component updates reactively
```

This gives the app:

- Fast local reads.
- Queryable/sortable/filterable data.
- Selective replication by workspace.
- Correct data after app restart.
- A natural model for derived local views.
- A single place to reconcile server-authoritative changes.


### TanStack Query owns narrow HTTP state

TanStack Query is still valuable, but only for state that PowerSync does not replicate:

```text
Current account profile summary
Workspace list and active-workspace switch metadata
Subscription/entitlement
Integration connection health
PowerSync token response
Account export job status
Account deletion state
Remote feature flags
Non-sensitive app configuration
Web-only server-fetched lists where PowerSync is not used
```

TanStack Query’s cache/retry/invalidation machinery is excellent for these HTTP concerns. It should **not** cache `Task`, `Project`, `CalendarEvent`, or `Note` on mobile when the same data is in PowerSync SQLite.

### Zustand owns transient UI coordination

Use Zustand only where React local state becomes cumbersome because multiple components/screens need the same **non-domain, ephemeral UI state**.

Good examples:

```text
Is global quick-capture sheet open?
Which task is being temporarily dragged on a web planner?
Which filters are currently applied before they are committed to the URL?
Is a user currently in selection mode?
Which sync-issue item is expanded?
Is a local, non-sensitive coachmark dismissed?
```

Bad examples:

```text
All tasks keyed by ID
Current calendar events
Task completion state
Project list
User authorization/membership truth
Server profile record
Persistent offline mutation queue
Google OAuth tokens
```

A Zustand store must never become a shadow database.

## Mobile Data Architecture

### Provider hierarchy

The authenticated mobile app should use a deliberate provider order:

```text
Root layout
  -> ErrorBoundary
  -> ThemeProvider
  -> ClerkProvider
  -> AuthBootstrapProvider
  -> PowerSyncConnectionProvider
  -> QueryClientProvider
  -> Feature/UI providers
  -> Expo Router authenticated route tree
```

Key rules:

- Do not initialize a PowerSync replica until Clerk session identity and selected active workspace are resolved.
- Do not render a prior user’s replica while new user/session bootstrap is occurring.
- Create the QueryClient once per application runtime, not per screen render.
- Reset or selectively clear user-scoped TanStack Query state on sign-out/account change.
- Keep global providers small and stable; do not put mutable domain entities in React Context.


### Replica identity

The local database identity must include environment, internal app user ID, and active workspace:

```text
lifeos.<environment>.<appUserId>.<workspaceId>.sqlite
```

On sign-out, revocation, or account switch:

1. Stop/disconnect PowerSync.
2. Dispose subscriptions/reactive queries.
3. Clear user-scoped in-memory state.
4. Clear TanStack Query user data.
5. Delete or securely invalidate the replica/database and command queue.
6. Clear Clerk secure session/token cache through provider-supported flow.
7. Restart at unauthenticated bootstrap.

Do not reuse a local task/event cache across users or workspaces. That would be a privacy breach, not merely a stale-cache bug.

## Mobile Query Pattern

### Use repository hooks over raw SQL in screens

Create feature-oriented query modules in `packages/mobile-data`:

```text
packages/mobile-data/src/
├── queries/
│   ├── use-today-plan.ts
│   ├── use-task.ts
│   ├── use-task-list.ts
│   ├── use-project.ts
│   ├── use-calendar-window.ts
│   ├── use-note.ts
│   ├── use-sync-issues.ts
│   └── use-connectivity.ts
├── commands/
│   ├── create-task.ts
│   ├── complete-task.ts
│   ├── defer-task.ts
│   ├── schedule-task.ts
│   └── retry-command.ts
├── schema/
└── sync/
```

Screens should use:

```ts
const today = useTodayPlan({ workspaceId, date });
const task = useTask({ workspaceId, taskId });
const issues = useSyncIssues({ workspaceId });
```

rather than embedding arbitrary SQL throughout UI components.

Benefits:

- Centralized workspace filtering.
- Consistent deleted/pending/error behavior.
- Easier query-plan/index optimization.
- Clear test seams.
- Less accidental exposure of server-only fields.
- Easier migration if PowerSync query APIs change.


### Query requirements

Every local entity query should:

- Filter by current workspace.
- Exclude soft-deleted records unless explicitly viewing history/trash.
- Use deterministic ordering with an ID tie-breaker.
- Be paginated/windowed for long lists.
- Include only client-safe fields.
- Handle missing records gracefully instead of assuming a deep-linked ID is replicated.
- Expose enough metadata for UI to distinguish loading, unavailable, stale, pending, and rejected state.


## Offline Command State

### Command lifecycle

Use a durable, typed state machine:

```text
draft
  -> queued_local
  -> uploading
  -> accepted
  -> reflected_in_replica
  -> completed

or

queued_local/uploading
  -> rejected
  -> needs_user_resolution
  -> discarded_or_retried
```

A UI action should never be represented only as:

```text
setTask({ ...task, completed: true })
```

Instead, submit a typed command:

```text
completeTask({
  commandId,
  workspaceId,
  taskId,
  baseRevision,
  completedAt,
})
```

The local UI may immediately show the intended effect, but it must carry a pending state until server-authoritative data returns through replication.

### Command display states

| State | UI treatment |
| :-- | :-- |
| Queued locally, offline | Show local result plus “Pending sync” indicator |
| Uploading | Avoid disruptive spinner; mark action as pending |
| Accepted, waiting for replica | Keep subtle pending state until authoritative reflection |
| Rejected: validation | Restore/reconcile state; show actionable message |
| Rejected: authorization/revocation | Stop retries; clear/restrict data as appropriate |
| Rejected: conflict | Show changed server state and specific resolution options |
| Retryable network failure | Preserve command, retry with bounded backoff |
| Permanent failure | Put in Sync Issues; never silently drop user intent |

Do not use generic toast messages as the only record of failure. Toasts disappear; a user needs a durable Sync Issues surface.

## Optimistic Updates

### Mobile

PowerSync/local command flow is the optimistic mechanism for replicated entities. Do not additionally use TanStack Query `onMutate` updates for the same task/event/note.

For each command, define:

```text
Local optimistic projection:
  What the user should immediately see.

Authoritative result:
  What PostgreSQL/command handler commits.

Reconciliation:
  How local state changes if the authoritative result differs or fails.

Conflict UX:
  What user-visible path exists if automatic resolution is not safe.
```

Example:

```text
Complete task:
  Local: mark task complete and fade/remove from Today appropriately.
  Server: validate state, create completion/audit/outbox records,
          create recurrence occurrence if applicable.
  Reconcile: receive new authoritative task/occurrence/plan projection.
  Failure: restore task to active or display a resolution state.
```


### Web

For web commands, use TanStack Query optimistic updates only where the action is low-risk and easy to reverse, and always pair with idempotency:

- Safe candidates: pin/unpin UI preference, dismiss onboarding, simple label rename.
- Cautious candidates: task completion, due-date move, scheduling.
- Avoid optimistic success for destructive deletion, account actions, billing, OAuth connection, or actions requiring immediate server validation.

A successful HTTP response is not necessarily the same as projection completion. For plan-affecting commands, invalidate/refetch affected views or use the future realtime mechanism rather than fabricate complex client-side plan recomputation.

## Web State Architecture

### Server data

Use Server Components for initial authenticated page composition. The web framework category already selected dynamic/no-shared caching by default for personal data.

For interactive server state:

```text
Hono API
  -> packages/api-client
  -> TanStack Query
  -> Client Component
```

Recommended web query ownership:


| Web state | Owner |
| :-- | :-- |
| Initial route/page data | Server Component / server-safe API client |
| Interactive filters/search/pagination data | TanStack Query |
| URL-shareable filters/view mode/date | URL search params |
| Task/calendar mutation state | TanStack Mutation plus API error/idempotency handling |
| Global UI shell, command palette, layout panels | Zustand/React state |
| Forms | React Hook Form + Zod |
| Auth | Clerk |
| Domain truth | Hono/PostgreSQL; later realtime invalidation/subscription |

Do not export a global `useTasksStore` that mirrors every response. Use query keys and normalized server DTOs only as far as necessary for the relevant component tree.

### Query-key policy

Keep query keys centralized:

```ts
export const queryKeys = {
  me: () => ['me'] as const,
  workspaces: () => ['workspaces'] as const,
  entitlement: (workspaceId: string) =>
    ['workspace', workspaceId, 'entitlement'] as const,
  exportStatus: (exportId: string) =>
    ['account', 'exports', exportId] as const,
};
```

For web entity lists, include all inputs deterministically:

```text
workspace ID
resource type
stable filter object
sort
cursor/page
date window
schema/API version if needed
```

Do not include tokens, user-entered note body, raw free-text search content, or sensitive provider values in query keys if they may surface in devtools/telemetry.

## Zustand Policy

### Approved use

Create a store only after answering these questions:

1. Why is React local state/context insufficient?
2. Is the state ephemeral/UI-only rather than replicated or server-authoritative?
3. What resets it on sign-out/workspace change?
4. Is it safe to persist? If so, where and for how long?
5. Can it include personal data? Usually, the answer should be no.

Suggested store structure:

```text
apps/web/src/stores/
  command-palette-store.ts
  planner-ui-store.ts

apps/mobile/src/stores/
  quick-capture-ui-store.ts
  selection-mode-store.ts
  onboarding-ui-store.ts
```


### Persistence rules

- Persist only benign preferences such as theme, dismissed local coachmarks, local view density, or sort preference.
- Do not persist tokens, personal domain entities, commands, notes, calendar details, auth state, workspace membership, or private search history in Zustand persistence.
- Namespace any persisted preference by environment and, when user-specific, by internal app user ID.
- Clear user-scoped persisted UI data on sign-out.
- Prefer encrypted/secure storage only for actual secrets under the responsible provider/library; do not put secrets in a generic state-persistence plugin.


## React Context Policy

Use React Context for stable dependency injection and broad configuration:

```text
Theme
Authenticated actor bootstrap result
PowerSync database/service
API client instance
Feature flags/config
Accessibility settings
```

Do not use Context for rapidly changing task lists, calendar timelines, command queues, or large data objects. It creates broad rerenders and opaque ownership.

## XState Policy

Do not add XState globally. Use a small explicit reducer or state machine where a workflow is truly multi-step and failure-sensitive:

```text
Google Calendar connection:
  idle -> initiating -> browser_open -> callback_received
  -> token_exchange -> syncing -> completed | failed

Account deletion:
  idle -> recent_auth_required -> confirmation_pending
  -> scheduled -> cancelled | deletion_in_progress -> deleted

Data export:
  idle -> requested -> queued -> generating -> ready -> expired | failed
```

A typed reducer may be sufficient initially. Introduce XState only when visualization, formal transition guards, persistence, or parallel-state behavior delivers clear value.

## TanStack Query Policy

### Defaults

Use conservative defaults appropriate to sensitive, user-specific HTTP data:

```text
Retry queries:
  1-2 retries for transient network/503 only

Retry mutations:
  Only if idempotency key/command ID makes retry safe

Refetch on focus:
  Enabled selectively for profile/entitlement/integration state;
  avoid noisy refetching on expensive or sensitive endpoints

Persistence:
  Off by default for user-scoped data

Cache time:
  Short and intentional for sensitive data

Devtools:
  Development only; never bundled/exposed in production
```

TanStack Query’s network modes include `online`, `always`, and `offlineFirst`; default `online` pauses queries/retries when no connection is available.  For Life OS, this behavior is suitable for non-replicated HTTP endpoints, while PowerSync handles normal offline entity use cases.[^4]

### Mobile network integration

If TanStack Query is used in Expo:

- Connect `onlineManager` to a real connectivity source such as Expo Network or NetInfo.
- Connect focus management to AppState/navigation visibility where appropriate.
- Do not present “online” merely because a device has a network interface; API availability may still fail.
- Do not block local PowerSync queries on Query’s online state.
- Treat non-replicated endpoints unavailable offline as an expected state with a clear UI.

TanStack Query documents React Native-specific focus and online management considerations.[^1]

## Error and Loading State Model

Avoid boolean sprawl such as `isLoading`, `isRefreshing`, `isOffline`, `isPending`, `hasError`, and `isStale` scattered inconsistently. Establish a common UI mapping:


| Condition | User-facing meaning | Default UI |
| :-- | :-- | :-- |
| No local data, initial replica not ready | Preparing workspace | Structured loading/skeleton |
| Local data, sync connecting | Data available; checking updates | Normal content with subtle sync state |
| Local data, offline | Showing available offline data | Normal content + offline indicator |
| Local data, command pending | Change saved locally; awaiting server | Local result + pending indicator |
| Local data, command rejected | Server could not apply change | Reconciled state + Sync Issues action |
| Remote HTTP query loading | Fetching non-replicated service state | Inline/skeleton where needed |
| Remote HTTP failure | Server feature unavailable | Safe error + retry; local product remains usable |
| Authorization revoked | Access removed | Stop sync, clear/shelter data, recovery message |
| Missing local deep-link record | Not available locally | Bounded retry/refresh or safe unavailable screen |

Do not display a full-screen loading screen over usable local data merely because a remote fetch is in progress.

## Testing

### Ownership tests

Add architecture tests/lint rules where feasible:

- Mobile task/event/note screens may not import TanStack Query entity hooks.
- `packages/mobile-data` is the only location that imports PowerSync database primitives.
- Zustand stores may not contain entity arrays/maps for replicated domains.
- `packages/api-client` cannot import PowerSync or database code.
- Web/mobile UI cannot import server database clients.
- No client package imports server-only tokens or credentials.


### Behavioral tests

| Scenario | Required result |
| :-- | :-- |
| Offline launch with existing replica | Today/tasks available without HTTP |
| Offline create/complete task | Immediate local result, pending indicator, durable after restart |
| Reconnect | Exactly-once/idempotent convergence |
| Command rejection | Local state reconciles and Sync Issues persists |
| User A sign-out / User B sign-in | No User A data remains in Query cache, Zustand persistence, or SQLite |
| Workspace switch | Correct replica and scoped UI; no stale workspace content |
| Web mutation | Idempotent API call, cache invalidation, safe error behavior |
| Token expiry | API query recovers or safely returns auth flow; no data leak |
| Fast screen navigation | No duplicate subscriptions, stale closures, or wasted refetches |
| Long task list | Virtualized local query rendering without global store copies |

## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| PowerSync as mobile entity owner | True offline relational data and one replica truth | Developers must learn reactive local-query patterns |
| TanStack Query for server-only state | Mature fetch/cache/error behavior | Requires strict boundary to avoid duplicate entity caches |
| Zustand only for UI state | Lightweight coordination without Redux | Team must resist turning it into a database |
| React local state first | Simple, localized logic | Requires refactoring when state genuinely crosses features |
| Typed command lifecycle | Clear offline/retry/rejection behavior | More deliberate UI and backend design |
| Separate web/mobile data ownership | Proper platform fit | Less superficial code symmetry |
| Query persistence off by default | Limits sensitive-data leakage | Some noncritical remote state reloads after restart |

## Final Decision

Lock the following state-management architecture:

```text
Mobile replicated entities:     PowerSync SQLite, queried through packages/mobile-data hooks
Mobile offline mutations:       Durable typed command queue/upload flow; not React Query mutations
Mobile non-replicated HTTP:     TanStack Query, scoped to profile/integration/entitlement/service state
Web remote data:                Server Components for initial data; TanStack Query for interactive HTTP state
Web/mobile transient UI:        React local state/reducer first
Cross-screen UI state:          Feature-scoped Zustand stores only when justified
Forms:                          React Hook Form + Zod
Auth/session:                   Clerk SDK and secure token cache
Navigation:                     Next.js URL/router and Expo Router
Global entity store:            Prohibited
Redux/RTK Query:                Rejected
TanStack Query as entity sync:  Rejected
Zustand as entity cache:        Rejected
Persistence:                    Only low-risk UI preferences; never tokens or replicated personal data
```

The next category in dependency order is **Background Jobs, Queues & Scheduling**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30]</span>

<div align="center">⁂</div>

[^1]: https://tanstack.com/query/v5/docs/framework/react/react-native

[^2]: https://powersync-ja.github.io/powersync-js/react-sdk

[^3]: https://tanstack.com/query/latest

[^4]: https://tanstack.com/query/v4/docs/framework/react/guides/network-mode

[^5]: https://tanstack.com/query/v4/docs/framework/react/examples/offline

[^6]: https://dev.to/fedorish/react-native-offline-first-with-tanstack-query-1pe5

[^7]: https://github.com/TanStack/query/discussions/7027

[^8]: https://powersync.mintlify.app/client-sdk-references/react-native-and-expo/usage-examples

[^9]: https://github.com/TanStack/query/discussions/8147

[^10]: https://github.com/TanStack/query/discussions/4342

[^11]: https://joelkuijper.me/notes/tanstack-query-offline/

[^12]: https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes

[^13]: https://gist.github.com/badsyntax/805364dbbf92372c3da183487c235f2e

[^14]: https://tanstack.com/query/v4/docs/framework/react/reference/useQuery

[^15]: https://github.com/TanStack/query/discussions/4296

[^16]: https://github.com/0xZekeA/supastash

[^17]: https://docs.powersync.com/client-sdks/reference/react-native-and-expo

[^18]: https://docs.powersync.com/integrations/supabase/guide.md

[^19]: https://www.infoworld.com/article/4168581/developing-local-first-apps-with-react-supabase-and-powersync.html

[^20]: https://github.com/trainstar/synchro

[^21]: https://tanstack.com/db/latest/docs/overview

[^22]: https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes

[^23]: https://typescript.news/articles/2026-04-04-tanstack-db-06-sqlite-persistence-local-first

[^24]: https://www.salmanizhar.com/blog/zustand-vs-jotai-large-react-apps

[^25]: https://www.salmanizhar.com/blog/recoil-alternatives-2026

[^26]: https://www.pkgpulse.com/guides/recoil-vs-jotai-2026

[^27]: https://dev.to/bean_bean/jotai-vs-recoil-2026-the-atomic-state-migration-recoil-is-deprecated-1m4d

[^28]: https://jotai.org/docs/basics/comparison

[^29]: https://theroadtoenterprise.com/blog/rtk-query-vs-tanstack-query

[^30]: https://www.pkgpulse.com/guides/tanstack-query-v5-vs-swr-v3-vs-rtk-query-data-fetching-2026

