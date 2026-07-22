<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 11 — Offline-First Sync Engine

**Recommendation (updated July 2026): select PowerSync Cloud with the React Native/Expo SDK, the OP-SQLite adapter, Sync Streams, and a custom backend-issued PowerSync JWT.** Use Clerk only to authenticate the call to the backend token endpoint; do not attempt to make PowerSync directly validate Clerk session tokens unless a production proof of concept verifies full compatibility. PowerSync remains the best fit for Life OS because it provides the essential mobile architecture: a local SQLite replica with full SQL and reactive queries, partial replication via Sync Streams, a persistent upload queue for offline writes, official Expo/React Native support, and the `@powersync/drizzle-driver` to keep the mobile schema aligned with Drizzle definitions.[^1][^2][^3][^30][^31][^32]

This category is the highest technical risk in the system. The selection is therefore **conditional**: complete a narrow end-to-end spike before committing production domain work. The fallback is not “build custom sync”; it is to use **Supabase Auth plus PowerSync’s supported Supabase Auth path** if the Clerk-to-custom-PowerSync-token bridge cannot meet security, usability, or operational requirements.

## What “Offline First” Means

For Life OS, offline-first is not merely storing a cache. It means the mobile app’s normal screens work against an embedded local database:

```text
Mobile UI
  -> PowerSync local SQLite database
  -> Reactive local queries
  -> Local mutation / queued write
  -> PowerSync upload queue when network exists
  -> Hono command endpoint validates, authorizes, and commits to PostgreSQL
  -> PostgreSQL change captured by PowerSync
  -> Authorized server truth replicates back to client SQLite
```

PowerSync streams changes from a backend source database to a client-side SQLite database, filtered through Sync Streams (legacy Sync Rules are still supported but are no longer the recommended path).  The user should therefore be able to open Today, view recent tasks and events, create/complete/defer tasks, and inspect locally replicated notes without waiting for a network round trip.[^1][^31]

## Requirements

The sync engine must support:

- Expo/React Native on iOS and Android.
- Native local SQLite storage and reactive queries.
- PostgreSQL/Supabase source database.
- Per-user/per-workspace selective replication.
- Clerk-authenticated users and the selected RLS/workspace membership model.
- Offline task creation, completion, deferral, rescheduling, and command queueing.
- Safe sync after connectivity restoration and app restart.
- Explicit conflict behavior and server-side validation.
- Secure sign-out/account-switch data cleanup.
- Background/lifecycle resilience appropriate to mobile OS limits.
- A small-team managed-service path rather than an operated sync cluster.


## Sync Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **PowerSync Cloud + OP-SQLite** | Official Expo/React Native SDK; native SQLite via OP-SQLite (or React Native Quick SQLite); reactive `useQuery`; Sync Streams for per-user/per-workspace partial replication; `@powersync/drizzle-driver` for shared schema; custom JWT auth; backend-controlled writes via upload queue; managed Cloud with free and paid tiers | Vendor/cost; Clerk custom-JWT bridge needs a spike; upload API and conflict rules must be designed; Expo Go requires the JS-only `@powersync/adapter-sql-js` adapter for experiments | **Select, conditional** |
| ElectricSQL (Cloud / self-hosted) | Postgres-native shape-based sync; open source; HTTP/CDN fan-out; PGlite local SQL; pay per write | Read-path only — no built-in offline write queue; last-write-wins conflicts; reported React Native/Expo background/resume sync issues; needs custom local mutation queue plus command backend | Reject for MVP |
| Zero (Rocicorp) 1.0 | GA (Mar 2026); React Native / Expo support; local SQLite replica (expo-sqlite or op-sqlite); optimistic mutations; custom mutators; query-driven partial sync | Requires a `zero-cache` replication server; app-code permissions (no Postgres RLS), no column permissions yet, no Postgres views; custom ZQL + mutator endpoints; no Drizzle driver; less proven for mobile command pipelines | Reject for MVP; monitor |
| WatermelonDB + custom sync backend | Fast reactive local SQLite; MIT license; proven at scale (Nozbe) | Last stable release Apr 2025; open React Native New Architecture / Expo SDK 54 issues; requires building full pull/push/conflict backend | Reject |
| RxDB 17 + custom/Supabase replication | Backend-agnostic NoSQL; many replication plugins; Expo Filesystem storage is fastest; strong React integration | Premium storage is paid; no Drizzle/Postgres alignment; NoSQL document model diverges from Life Graph; requires custom sync/conflict logic | Reject |
| Replicache | Elegant git-like rebase; optimistic mutators; proven for instant web apps | In maintenance mode; succeeded by Zero; no official React Native support; browser/IndexedDB focused | Reject |
| TinyBase / CRDT sync | Tiny, reactive, CRDT merge; supports PowerSync/Electric persisters | In-memory store; not a turnkey Postgres-to-SQLite sync engine; would require custom sync wiring | Reject |
| Supabase Realtime + local SQLite/custom queue | Fewer vendors; flexible | Realtime is online-only; requires building replication protocol, retry semantics, sync cursors, change ordering, selective sync, conflicts, and account switching | Reject |
| Supabase direct client CRUD + offline cache | Fast initial CRUD | Not true offline-first; weak command/invariant control; direct writes complicate audit/outbox/planning | Reject |
| Firebase/Firestore offline persistence | Polished offline client UX | Abandons PostgreSQL/RLS/PowerSync architecture and relational data model | Reject |
| Realm/Atlas Device Sync | Historically strong mobile sync | Atlas Device Sync was deprecated and shut down in September 2025 | Reject |
| Custom SQLite + bespoke sync | Maximum control | Highest risk and longest path; reimplements a difficult distributed-systems product | Reject absolutely for MVP |

Electric remains a read-path sync engine in 2026: it streams Postgres shapes to clients over HTTP and has no built-in offline write queue, so it is not a drop-in fit for a command-based offline-first planner. Zero 1.0 is a new GA alternative with React Native support, but it requires running a `zero-cache` replication server, uses app-code permissions rather than database RLS, lacks column-level permissions and Postgres views, and has no Drizzle driver — making it a larger architectural bet than PowerSync for this stack. WatermelonDB’s last stable release was April 2025 and it has unresolved React Native New Architecture / Expo SDK 54 issues. RxDB 17 is backend-agnostic but requires a premium storage plugin for best React Native performance and has no Drizzle/Postgres alignment. Realm’s cloud sync is no longer viable: MongoDB deprecated Atlas Device Sync and shut it down in September 2025.[^4][^5][^6][^35][^36][^37][^38][^39][^40][^41][^42][^43]

## Why PowerSync Wins

### Correct mobile data model

PowerSync lets application code work against local SQLite rather than a remote API cache. This is the right model for a planning product: Today should open instantly, task completion should feel immediate, and a subway/elevator/network interruption should not block basic action capture.

### PostgreSQL alignment

PowerSync is designed to synchronize a backend source database into local SQLite.  That matches the selected Supabase-managed PostgreSQL source of truth and avoids introducing a document database solely to get offline behavior.[^1]

### Controlled replication

PowerSync Sync Streams (now GA and recommended over legacy Sync Rules) determine which records replicate to local tables. Streams support on-demand or auto-subscribed subscriptions, per-subscription TTL caching, JOINs, CTEs, and parameters from the JWT. This is essential because a device should receive only the current user’s active workspace data and only the fields/data domains actually needed offline.[^7][^1][^31]

### Backend-owned writes

PowerSync does not require clients to write unrestricted server rows directly. Its upload queue is handled by the application backend, which can enforce commands, Zod validation, RLS-aware authorization, idempotency, audit logs, outbox events, subscription entitlements, and planning invariants before PostgreSQL becomes authoritative.[^8]

That fits Life OS’s command-pipeline requirement far better than generic bidirectional row synchronization.

## Architecture Decision

### Select PowerSync Cloud

Use PowerSync Cloud for MVP, not self-hosted PowerSync.


| Deployment | Pros | Cons | Decision |
| :-- | :-- | :-- | :-- |
| **PowerSync Cloud** | Fastest setup; managed service; avoids operating replication/sync infrastructure; free tier (2 GB data synced, 50 peak connections); Pro from $49/month (30 GB, 1,000 peak connections); Team from $599/month | Vendor cost, network/data-processing dependency, regional/compliance questions | **Select for MVP** |
| Self-hosted PowerSync | More control over data plane, network, and deployment; source-available Open Edition | Operate upgrades, availability, credentials, observability, backup/recovery, and scaling of a critical sync service | Defer |
| No dedicated sync engine | Fewer vendors | Fails core offline-first product requirement | Reject |

The product’s initial region and provider review should ensure PowerSync data-processing location, encryption posture, subprocessor terms, and deletion behavior are compatible with the privacy policy before beta users connect personal calendars or notes.

## Authentication Design

### Do not use legacy Supabase JWT secrets

The previously suggested shortcut — configuring PowerSync to accept Supabase JWTs using a shared Supabase secret — is incompatible with the selected Clerk model and is not an acceptable production design. Supabase’s old Clerk integration is deprecated specifically because shared JWT secrets create rotation and security problems.[^9]

PowerSync’s Supabase Auth configuration is useful only if Life OS later adopts Supabase Auth. It is **not** the correct path while Clerk is the selected identity provider.[^10][^11]

### Select custom PowerSync JWTs, issued by Hono

PowerSync supports custom JWT-based authentication with any identity provider. The intended flow is:

```text
1. Client authenticates to Clerk.
2. Client calls Life OS backend /v1/sync/powersync-token
   using Clerk session JWT.
3. Hono verifies Clerk token, resolves app_user and active workspace membership.
4. Hono signs a short-lived PowerSync JWT.
5. Client gives that PowerSync JWT and endpoint to the PowerSync SDK.
6. PowerSync verifies the signed token through Life OS public JWKS.
7. Sync rules use trusted JWT `sub` and narrow parameters to select data.
```

PowerSync documents this custom-auth pattern: the app authenticates through its normal provider, calls the backend to obtain a PowerSync JWT, and PowerSync verifies that JWT through a public JWKS endpoint.[^2][^12]

### JWT requirements

PowerSync requires:

- A `kid` that matches a JWKS key.
- Signature verification through the published JWKS.
- An `aud` matching the PowerSync instance URL.
- `iat` and `exp`, with a maximum lifetime of 24 hours and 60 minutes or less recommended (PowerSync recommends 5–60 minutes).
- The user identity as JWT `sub`.[^12]

Use RS256 or EdDSA asymmetric keys with public keys exposed at a dedicated JWKS endpoint. Do **not** use HS256 shared secrets for production. A custom token avoids sharing Clerk or Supabase signing material with PowerSync.

### Token claim design

```json
{
  "iss": "https://api.lifeos.example",
  "aud": "https://<powersync-instance>",
  "sub": "internal-app-user-uuid",
  "iat": 0,
  "exp": 0,
  "jti": "opaque-unique-token-id",
  "workspace_id": "active-workspace-uuid",
  "sync_schema_version": 1
}
```

The `workspace_id` may be a trusted PowerSync client parameter because PowerSync considers parameters embedded in its authentication JWT trustworthy for access-control use.  It must be minted only after a live membership lookup, be short-lived, and be reissued on token refresh.[^13]

For future multi-workspace users, the client should select one active workspace, request a token for that membership, and run a separate local replica/cache namespace for that workspace. Do **not** put an unbounded list of workspace IDs into tokens or sync all accessible workspaces by default.

### Token endpoint requirements

`POST /v1/sync/powersync-token` must:

1. Require a valid Clerk bearer token.
2. Verify signature, issuer, audience, expiry, and token type.
3. Resolve `app_users` from immutable Clerk subject.
4. Resolve requested active workspace from `workspace_memberships`.
5. Require explicit workspace selection when multiple memberships exist.
6. Apply account status, deletion, suspension, and entitlement checks.
7. Issue a maximum 15-minute PowerSync token initially, despite the 24-hour platform maximum.
8. Include only necessary sync parameters.
9. Return `{ endpoint, token, expiresAt }`.
10. Rate-limit issuance and log only opaque security metadata.
11. Never return private signing material or database credentials.

Use 15 minutes initially. Short lifetime reduces stale authorization after membership revocation; automatic SDK refresh preserves normal usability.

### Key Management

- Keep private signing keys in the backend platform secret store.
- Publish only current/previous public keys at `/.well-known/jwks.json`.
- Use stable `kid` values.
- Support overlapping old/new keys during rotation.
- Rotate keys through a rehearsed, non-breaking process.
- Cache JWKS according to PowerSync verifier behavior, but ensure a key rotation can be propagated before old keys are removed.
- Separate development, staging, and production signing keypairs and PowerSync instances.
- Never use development tokens outside local experimentation.

PowerSync supports temporary development tokens for initial experiments, but its setup guidance says production implementation should replace them with proper JWT authentication.[^14][^15]

## Replication Model

### Sync only what the device needs

Replicate the minimal offline working set:


| Domain | Replicate? | Rules |
| :-- | :-- | :-- |
| Workspace summary and active membership | Yes | Current active workspace only |
| Areas, goals, projects | Yes | Active/non-deleted entities |
| Tasks and task occurrences | Yes | Current workspace, active/needed historical window |
| Native time blocks | Yes | Current workspace and relevant date window |
| Imported calendar event projections | Yes | Current workspace, bounded rolling window |
| Notes | Yes, selected scope | Current workspace; consider metadata/full text based on privacy and offline need |
| Contacts | Yes | Current workspace, active records |
| Entity links | Yes | Only links whose source and target are both replicated |
| Daily-plan projections | Yes | Today plus bounded upcoming/history window |
| Reminders/notifications state | Yes, carefully | Device-relevant and user-visible state |
| Attachments metadata | Yes | No binary contents automatically |
| Attachment binaries | On demand | Signed, authorized download; encrypted cache policy |
| Audit logs | Minimal read-only subset | Only user-visible history, bounded time |
| OAuth credentials | Never | Server/integration worker only |
| Outbox/idempotency tables | Never | Backend/worker only |
| Billing/Stripe tables | Never | Backend only |
| Raw provider payloads | Never by default | Server-only; sanitized projection if needed |
| Analytics/operational logs | Never | Server-only |

Do not replicate an entire workspace indefinitely. Use date windows, status filters, and explicitly scoped history. The core planner needs a bounded horizon; old notes, completed task history, and calendar events can be fetched on demand or synchronized through separate feature-specific streams.

### Reference integrity

Polymorphic `entity_links` are dangerous in selective replication. A link must replicate only if:

- Its `workspace_id` equals the token workspace.
- Its source entity is in the replicated set.
- Its target entity is in the replicated set.
- The link type is safe for client use.

Never replicate a link that gives the client an identifier or metadata reference to a non-replicated/private entity.

### Local schema

Use OP-SQLite (`@powersync/op-sqlite`) as the production native database adapter; the JS-only `@powersync/adapter-sql-js` can be used for quick Expo Go experiments but must not ship to production.[^1][^30] Use `packages/mobile-data` with the PowerSync Drizzle driver for:

- Replicated tables.
- Local-only tables such as UI preferences, optimistic command state, device-local drafts, sync error state, and query caches.
- Client-safe indexes for Today, task list, calendar window, and plan projection.

Do not attempt to reuse the complete PostgreSQL Drizzle schema directly. PowerSync local database tables are SQLite tables and need a deliberately reduced, client-safe model.

## Write Model

### Commands, not generic row mutations

Life OS must not map a client-side `UPDATE tasks SET ...` directly to broad server writes. Write actions should carry domain intent:

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
ConnectCalendar
DisconnectCalendar
UpdateNote
LinkEntities
```

Each command has:

```text
command_id           UUID, generated client-side
client_id            stable device installation ID
workspace_id         selected workspace
type                 discriminated union
payload              Zod-validated, minimal intent data
base_revision        optional authoritative version for conflict-sensitive actions
created_at           client timestamp for UX/audit only
```

The backend receives a queued command, authenticates it independently, checks active membership, validates the payload and state transition, deduplicates by command ID/client operation ID, writes authoritative PostgreSQL data, and emits outbox/audit records atomically.

### PowerSync upload queue

PowerSync’s default model includes queued PUT/PATCH/DELETE operations, but it leaves backend write processing and conflict handling to the application. Operations can arrive more than once, so the server must be idempotent.[^8]

**Recommendation:** use the PowerSync upload mechanism to deliver a narrow, append-only `client_commands` table or command-shaped operations to a dedicated backend endpoint. Do not expose every replicated entity to generic row-level mutation.

Two implementation patterns require evaluation during the spike:


| Pattern | Description | Assessment |
| :-- | :-- | :-- |
| **Command-table replication** | Client writes an append-only local `client_commands` record; upload handler converts it to typed backend command; server result replicates as authoritative entity changes | **Preferred**: preserves domain intent and auditability |
| Entity-row mutation handler | Client modifies task/event rows and backend maps mutations to commands | Faster demo, but intent ambiguity and protected-field risks |
| Separate HTTP command queue | UI writes local command table, then dedicated client worker sends commands to Hono; PowerSync syncs reads only | Simpler server semantics, but must implement robust offline retry queue independently |

The spike must determine which exact PowerSync client API and upload-handler contract best supports the preferred command-table approach. Do not assume API behavior from an old sample; PowerSync has evolved from legacy Sync Rules toward Sync Streams.[^1]

## Conflict Strategy

### Product-level conflict classes

A single “last write wins” policy is not appropriate for every Life OS action.


| Data/action | Default conflict rule | Why |
| :-- | :-- | :-- |
| Task completion | Completion wins unless task is deleted; server event timestamp/audit records preserved | Avoid a completed task unexpectedly reopening |
| Task title/notes | Field-level last-write-wins with visible `updated_at` | Low-risk personal edits; preserve latest field changes |
| Task schedule/time block | Server validates conflicts/capacity; reject or create explicit conflict state | Calendar scheduling affects plan correctness |
| Task recurrence | Server-authoritative; require revision/version if concurrent edits | Recurrence changes can alter many occurrences |
| Task deletion | Delete wins; soft-delete/tombstone retained for sync | Avoid resurrection from stale device |
| Entity links | Idempotent add/remove by stable link ID; delete wins | Avoid duplicate/inconsistent graph edges |
| Calendar provider events | Provider source of truth for imported data | Prevent local mutation from overwriting Google source |
| Native Life OS blocks | User command server-authoritative, with revision/version if needed | User-generated but schedule-sensitive |
| Daily plan projections | Never client-authored; server derived | No conflict surface |
| Local drafts | Device-local until explicit save | Preserve user intent offline |

PowerSync’s default conflict model is essentially last-write-wins, with server-defined custom handling available; it also recommends idempotent operations and notes that deletes commonly win over later updates.  Life OS should use that default only for low-risk field updates, not planning-critical actions.[^8]

### Rejection handling

When the server rejects a queued command because of authorization, validation, stale revision, deleted entity, or conflict:

1. Persist a machine-readable failure record server-side.
2. Replicate/surface a sanitized error state to the device.
3. Roll back or reconcile the local optimistic representation.
4. Preserve the user’s attempted input in a local draft/error UI when reasonable.
5. Never silently discard a meaningful offline edit.

PowerSync automatically rolls back rejected client changes and can propagate error details asynchronously through a separate synchronized table or a success response body.  Build a user-visible **Sync Issues** surface from the beginning, even if it is initially a minimal list.[^16]

## Device and Account Lifecycle

### Installation identity

Create a random `client_id` on first launch and store it in secure platform storage. It is not an authentication credential; it supports idempotency, diagnostics, queue ordering, and device-scoped push registration.

### Sign-out and account switch

Sign-out is a privacy-critical operation:

```text
1. Disconnect PowerSync.
2. Stop/reactively dispose local queries.
3. Clear local SQLite replica and local command queue.
4. Clear Clerk secure token cache.
5. Clear in-memory app state and encrypted attachment cache.
6. Revoke/forget active workspace selection.
7. Return to unauthenticated screen.
```

On next sign-in, initialize a new replica database keyed by environment + internal app user ID + active workspace ID, for example:

```text
lifeos.<environment>.<app_user_id>.<workspace_id>.sqlite
```

Do not reuse a prior user’s replica on a shared device. Test account switch, offline sign-out, and failed reconnect scenarios on both iOS and Android.

### Background behavior

Mobile operating systems constrain background execution. Design for eventual synchronization:

- Sync immediately while app is foregrounded and connectivity exists.
- Retry with exponential backoff and jitter after failures.
- Request OS background work only for bounded, user-beneficial tasks.
- Do not promise real-time background sync while the app is killed.
- On app resume, refresh token, reconnect, process queue, and update Today.
- Notifications/reminders must not depend solely on a background sync loop.


## Security Controls

- PowerSync JWT `sub` uses internal `app_user.id`, not raw Clerk user ID or email.
- `workspace_id` parameter is minted only by Hono after active membership verification.
- Tokens expire in 15 minutes; audience is exact PowerSync instance URL.
- Keypairs are isolated by environment.
- No PowerSync private key, Supabase service key, Clerk secret, or DB credentials in mobile builds.
- Sync streams/rules filter at the source; do not rely on client filtering.
- Replicate only sanitized, user-authorized fields.
- Test remote membership revocation, deleted accounts, suspended subscriptions, and compromised device sign-out.
- Capture telemetry only for sync state, error class, queue depth, latency, and schema version — never task titles, note content, calendar data, or token values.
- Use a kill switch to disable syncing for a vulnerable client build or incident, while preserving local data safely.


## Mandatory Spike

Time-box this to approximately one to two engineering weeks. It must use a real Expo development build, not only Expo Go.

### Build

- One `tasks` table with `workspace_id`, owner mapping, title, state, revision, timestamps, and soft-delete field.
- Two Clerk users, two internal app users, two workspaces, and test memberships.
- Current Clerk -> Supabase third-party auth integration.
- Hono endpoint issuing short-lived RS256/EdDSA PowerSync JWTs and a public JWKS endpoint.
- PowerSync Cloud development instance.
- One minimal Sync Stream/rule that selects only the `workspace_id` in token parameters.
- Local PowerSync SQLite task list with reactive query.
- One typed `CreateTask` and `CompleteTask` command path.
- Server idempotency table plus outbox/audit write.
- Sign-out wipes local replica.


### Test

| Scenario | Acceptance condition |
| :-- | :-- |
| Fresh sign-in | Only selected workspace’s seeded task appears |
| Offline create | New task is immediately visible locally |
| Reconnect | Exactly one authoritative task appears after repeated retry/restart |
| Offline completion | UI updates locally and converges after reconnection |
| Two-device edit | Conflict behavior matches defined product rule |
| User A / User B | No cross-workspace rows, IDs, links, or metadata replicate |
| Invalid/expired token | Sync stops/re-authenticates without data leak or crash |
| Revoked membership | New token issuance denied; future sync stops; queued writes rejected |
| Sign-out/account switch | Previous user’s records are not readable or queryable |
| Server validation rejection | Local optimistic state reconciles and user sees actionable issue |
| Backend restart/retry | Commands remain idempotent |
| Key rotation | Old/new keys overlap without breaking valid sessions unexpectedly |

**Go/no-go:** proceed only if all isolation, offline, idempotency, token-refresh, and sign-out tests pass. A happy-path demo is not enough.

## Cost and Vendor Risk

### Licensing Model

PowerSync's core software is licensed under the Functional Source License (FSL), which is a source-available license. This license allows free use for development, testing, and small-scale production deployments. However, for larger commercial deployments or when specific revenue thresholds are exceeded, a commercial license is required. The self-hosted Open Edition is source-available under FSL, while the Cloud service is a proprietary managed offering.

This licensing model means:
- Development and MVP testing can proceed without licensing concerns
- Self-hosting at scale may require purchasing a commercial license
- The Cloud service has its own separate pricing structure independent of the FSL license

### Cloud Pricing

PowerSync Cloud adds a critical vendor to the data plane. As of 2026, PowerSync Cloud pricing is usage-based: a Free plan with 2 GB data synced and 50 peak concurrent connections per month; Pro from $49/month with 30 GB data synced and 1,000 peak connections; Team from $599/month. Overage is $1 per GB for data synced and $30 per 1,000 peak connections.[^33][^34]

### Vendor Risk Mitigation

Mitigate vendor risk by:

- Keeping PostgreSQL as the sole source of truth.
- Keeping typed commands and business logic in Hono/PostgreSQL, not in PowerSync-specific code.
- Isolating sync adapter/token issuance code.
- Maintaining a documented data-replication inventory.
- Building web functionality that can operate against the backend API without PowerSync.
- Avoiding irreversible reliance on PowerSync-only domain semantics.
- Reviewing pricing, regional processing, encryption, incident response, data deletion, and export terms before public beta.
- Documenting a contingency mode: mobile becomes online-first with a local read cache if PowerSync has a major outage; server truth remains intact.


## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| PowerSync vs. custom sync | Mature SQLite/Postgres sync mechanics and much faster MVP | Vendor dependency and integration-specific learning |
| PowerSync Cloud vs. self-hosting | Low operational burden | Less infrastructure/control ownership |
| Custom PowerSync JWT vs. direct Clerk token | Clean, narrow authorization bridge; no shared issuer-secret assumptions | Backend JWKS/token endpoint and key rotation responsibility |
| Command-table writes | Preserves business intent, validation, audit, and idempotency | More initial design than generic CRUD upload |
| Selective replication | Strong privacy posture and lower local storage/egress | More sync-rule design and testing |
| Short-lived tokens | Fast revocation response and lower credential risk | Frequent refresh implementation |
| Explicit conflict rules | Predictable user experience for planning-critical data | More product/engineering decisions |
| Replica wipe on sign-out | Prevents shared-device data leakage | Loses local cache and requires re-download |
| Sync Streams vs. legacy Sync Rules | On-demand subscriptions, TTL caching, JOINs/CTEs, simpler DX; auto_subscribe preserves offline-first behavior | Newer API; legacy Sync Rules will eventually be deprecated | Adopt Sync Streams |
| OP-SQLite vs. Expo Go JS adapter | Native performance, SQLCipher encryption, better New Architecture support | Expo Go sandbox requires the slower JS-only adapter for quick experiments | OP-SQLite for prod builds |

## Final Decision

Lock the following offline-first architecture:

```text
Sync engine:                   PowerSync Cloud
Mobile SDK:                    PowerSync React Native / Expo SDK
Local database adapter:        OP-SQLite (native); Expo Go experiments only with @powersync/adapter-sql-js
Local database:                SQLite managed through PowerSync
Server source of truth:        Supabase-managed PostgreSQL
Schema integration:            Separate client-safe PowerSync/Drizzle schema in packages/mobile-data
Authentication to Life OS:     Clerk session token
Authentication to PowerSync:   Custom short-lived asymmetric JWT issued by Hono
PowerSync token source:        POST /v1/sync/powersync-token after Clerk verification and membership lookup
PowerSync token claims:        Internal app-user sub, one active workspace parameter, exact audience, 15-minute expiry
Key distribution:              Backend public JWKS endpoint; environment-isolated signing keys
Replication:                   Per-user/per-workspace minimal selective Sync Streams
Writes:                        Typed idempotent commands through backend; no generic direct row CRUD
Conflict model:                Server-defined by entity/action; LWW only for low-risk field updates
Failure UX:                    Reconciliation plus user-visible Sync Issues state
Sign-out:                      Disconnect and securely delete prior user/workspace replica and queued data
Critical gate:                 Complete Expo Clerk -> Hono JWT -> PowerSync -> Supabase proof of concept before core implementation
Fallback:                      Supabase Auth + supported PowerSync Supabase Auth integration if the Clerk-to-PowerSync bridge fails
```

The next category in the dependency order is **API Client**.
<span style="display:none">[^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43]</span>

<div align="center">⁂</div>

[^1]: https://docs.powersync.com/client-sdks/reference/react-native-and-expo

[^2]: https://docs.powersync.com/configuration/auth/custom

[^3]: https://docs.powersync.com/configuration/app-backend/client-side-integration

[^4]: https://electric-sql.com/docs/integrations/expo

[^5]: https://github.com/realm/realm-dotnet/discussions/3676

[^6]: https://oneuptime.com/blog/post/2026-03-31-mongodb-offline-first-applications/view

[^7]: https://expo.dev/blog/what-synced-in-app-sqlite-brings-to-expo-apps

[^8]: https://docs.powersync.com/handling-writes/handling-update-conflicts

[^9]: https://supabase.com/docs/guides/auth/third-party/clerk

[^10]: https://docs.powersync.com/configuration/auth/supabase-auth

[^11]: https://releases.powersync.com/announcements/important-notice-for-supabase-users-using-supabase-jwts

[^12]: https://powersync.mintlify.app/installation/authentication-setup/custom

[^13]: https://docs.powersync.com/sync/rules/client-parameters

[^14]: https://docs.powersync.com/configuration/auth/development-tokens

[^15]: https://docs.powersync.com/intro/setup-guide

[^16]: https://docs.powersync.com/handling-writes/handling-write-validation-errors

[^17]: https://docs.powersync.com/integrations/supabase/guide

[^18]: https://powersync.com/blog/introducing-powersync-v1-0-postgres-sqlite-sync-layer

[^19]: https://codeyaan.com/blog/ai-tools/electric-sql-localfirst-database-sync-1106

[^20]: https://electric.ax/blog/2023/09/20/introducing-electricsql-v0.6

[^21]: https://github.com/electric-sql/electric-old/blob/main/README.md

[^22]: https://terminalskills.io/skills/electric-sql

[^23]: https://dev.classmethod.jp/articles/electricsql-introduction/

[^24]: https://electric-sql.com/llms.txt

[^25]: https://electric.ax/blog/2023/10/12/linerlite-local-first-with-react

[^26]: https://docs.powersync.com/self-hosting/installation/client-side-setup

[^27]: https://github.com/powersync-ja/powersync-jwks-example

[^28]: https://github.com/powersync-ja/powersync-nodejs-firebase-backend-todolist-demo

[^29]: https://github.com/powersync-ja/powersync-dotnet-backend-demo

[^30]: https://docs.powersync.com/client-sdks/frameworks/expo-go-support

[^31]: https://docs.powersync.com/sync/streams/overview

[^32]: https://docs.powersync.com/client-sdks/orms/js/drizzle

[^33]: https://powersync.com/pricing

[^34]: https://docs.powersync.com/resources/usage-and-billing/usage-and-billing-faq

[^35]: https://electric.ax/pricing

[^36]: https://github.com/electric-sql/electric/issues/4116

[^37]: https://zero.rocicorp.dev/docs/react-native

[^38]: https://zero.rocicorp.dev/docs/status

[^39]: https://zero.rocicorp.dev/docs/deprecated/rls-permissions

[^40]: https://github.com/nozbe/watermelondb/issues/1969

[^41]: https://rxdb.info/react-native-database.html

[^42]: https://queryplane.com/blog/electricsql-vs-powersync-vs-replicache/

[^43]: https://trybuildpilot.com/648-electric-sql-vs-powersync-vs-zero-2026

