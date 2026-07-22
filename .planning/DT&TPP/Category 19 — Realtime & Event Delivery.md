<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 19 — Realtime \& Event Delivery

**Recommendation: use PowerSync as the sole realtime/convergence mechanism for replicated mobile entities, and use Supabase Realtime Broadcast from Database (trigger-based) with private, RLS-authorized channels for a narrow set of web-facing invalidation and ephemeral-status events.** Do not subscribe clients directly to raw PostgreSQL row changes for core product entities, and do not introduce a custom WebSocket service for MVP. Server-Sent Events (SSE) is the preferred fallback if Supabase Realtime authentication proves incompatible.[^1][^2][^3]

The important distinction is:

```text
Durable state convergence:
  Mobile -> PowerSync -> PostgreSQL -> PowerSync local SQLite

Durable asynchronous work:
  PostgreSQL transaction -> transactional outbox -> pg-boss worker

Best-effort immediate UI hints:
  Supabase Broadcast from Database (trigger-based) -> web client invalidates/refetches safe data

Fallback for web hints:
  Hono-authenticated SSE if Supabase Realtime auth spike fails

Ephemeral collaboration/presence:
  Not in MVP
```

Realtime notifications are a latency optimization, not a source of truth. Every client must remain correct if an event is delayed, missed, duplicated, received out of order, or never delivered.

## Requirements

Life OS needs limited realtime behavior for:

- Mobile devices converging on server-authoritative task/calendar/note changes.
- Web clients refreshing an interactive view after an API command or provider-driven update.
- Showing safe connection/sync health status.
- Eventually signaling integration refresh/export/account-operation progress.
- Multi-device updates without forcing constant full-page reloads.
- Future support for collaboration or shared workspaces without prematurely building presence infrastructure.

It does **not** require multiplayer cursor presence, a chat system, server-pushed full domain state, or a custom bidirectional socket protocol for MVP.

## Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **PowerSync mobile replication + Supabase Broadcast from Database** | Uses existing selected platforms; local mobile database remains authoritative; Broadcast from Database is Supabase's 2026-recommended scalable pattern; supports private channels and RLS authorization; low custom infrastructure | Two mechanisms with distinct roles; event payload and authorization design require care; requires trigger setup | **Select** |
| Supabase Postgres Changes directly to clients | Minimal setup; database-change subscriptions | Raw table/row coupling; single-threaded processing creates bottleneck at scale; RLS evaluation per client limits throughput; can expose too much; clients still need reconciliation | Reject for core product entities |
| Hono Server-Sent Events (SSE) | Simple one-way server-to-browser transport; HTTP/2 multiplexing eliminates old connection limits; auto-reconnect with Last-Event-ID; CDN-friendly; firewall-friendly | Must build connection management, auth/reconnect/event replay/scale; poor mobile fit; not selected while Supabase Broadcast is viable | **Preferred fallback** if Supabase Realtime auth fails |
| Hono/custom WebSockets | Full control and bidirectional support | Most operational/security complexity: connection state, authorization, fan-out, backpressure, reconnection, observability; requires sticky sessions; bypasses HTTP caching | Reject for MVP |
| Firebase/Firestore realtime | Excellent client realtime model | Conflicts with PostgreSQL/Supabase/PowerSync system of record | Reject |
| Polling only | Easiest and most reliable baseline | Less immediate cross-device UX; can add unnecessary load | Use as baseline/reconciliation |
| Ably/Pusher/Socket.io hosted service | Mature pub/sub and presence; Ably offers protocol-level guarantees (ordering, exactly-once) | Extra vendor/cost/data plane; still requires authorization/event architecture; overkill for invalidation hints | Defer |
| Supabase Realtime Presence | Built-in collaboration/presence | Not necessary for a personal productivity MVP; privacy/UX complexity; adds state-sync cost | Defer |
| ElectricSQL (PowerSync alternative) | Open-source; Postgres-to-SQLite sync | No offline write handling (read-only offline); requires schema changes via Electric CLI; less mature ecosystem; no official React Native support | Reject - PowerSync superior for mobile |
| Zero/Replicache (PowerSync alternative) | Server-authoritative; optimistic mutations; fast perceived performance | Web-only (no React Native/Flutter); IndexedDB limitations vs SQLite; less production-tested at scale; React-only | Reject - PowerSync superior for mobile |

Supabase's 2026 guidance strongly recommends Broadcast from Database over Postgres Changes for scalability and security. Postgres Changes processes all changes through a single replication slot and evaluates RLS per client, creating a bottleneck as connections grow. Broadcast from Database uses DB triggers with `realtime.broadcast_changes()` to fan out changes directly to topics, scaling far better. Private Broadcast channels require authenticated authorization via RLS policies on `realtime.messages`, and Broadcast is private by default.[^2][^4][^1][^8]

## Why This Wins

### Mobile already has the right solution

PowerSync supplies mobile local SQLite replicas that react to synchronized database changes. Its React hooks can re-render UI when query results or connectivity state change.  Adding Supabase Realtime listeners to mobile task/event tables would create a second update path and risks races such as:[^3]

```text
PowerSync replica applies task change
  while Supabase Postgres Changes event arrives
  -> both attempt to update UI/cache
  -> duplicate state, ordering ambiguity, inconsistent pending indicators
```

**Rule:** The Expo app does not subscribe to Supabase Realtime for replicated Life Graph entities. It observes PowerSync local queries and PowerSync connection state.

### The web needs only a prompt to reconcile

The web application does not use PowerSync in MVP. It can receive a small event indicating that a view may be stale, then invalidate a TanStack Query key or call `router.refresh()` in a bounded way.

It should **not** trust an event to contain complete entities or directly mutate its state from raw database payloads:

```text
Bad:
  realtime task.updated payload
  -> mutate React Query task object from event row

Good:
  realtime workspace.changed hint
  -> invalidate relevant query keys
  -> refetch through Hono API
  -> render authoritative DTO
```

This preserves Hono/API authorization, response shaping, data migration, and stable product contracts. TanStack Query v5 provides sophisticated invalidation patterns (prefix matching, exact matching, predicate functions) that should be leveraged for surgical cache updates rather than broad invalidation.[^9][^10]

## Event Taxonomy

### Separate events by durability and audience

| Event class | Transport | Durability | Audience | Example |
| :-- | :-- | :-- | :-- | :-- |
| Domain event | `outbox_events` | Durable | Worker/internal services | `task.completed.v1` |
| Job status | PostgreSQL/job records; optional Broadcast hint | Durable record, best-effort hint | Requesting user/workspace | `account.export.ready` |
| Mobile data change | PowerSync replication | Durable convergence | Authorized mobile replica | Task/event/note change |
| Web invalidation hint | Supabase Broadcast | Best effort | Authorized workspace/user | `workspace.data_changed` |
| Integration state hint | Broadcast + Hono refetch | Best effort | Authorized workspace/user | `calendar.sync_state_changed` |
| Ephemeral UI signal | Broadcast later, if needed | Non-durable | Explicitly authorized participants | `user.viewing_task` |
| Audit event | PostgreSQL audit table | Durable | Authorized history/support | `task.completed` |

Never conflate a broadcast event with an audit record, a command acceptance receipt, or a sync mechanism.

## Supabase Broadcast Design

### Use private, narrowly scoped topics

Topic naming should be opaque enough to avoid unnecessary information disclosure and structured enough for authorization:

```text
workspace:<workspace-id>:ui
user:<app-user-id>:ui
connection:<calendar-connection-id>:ui
```

Prefer workspace topics for workspace-wide entity changes and user topics for account-specific events such as export readiness. Do not create topics from task titles, note titles, email addresses, provider identifiers, or arbitrary user input.

Example event envelope:

```json
{
  "eventId": "uuid",
  "type": "workspace.data_changed.v1",
  "workspaceId": "uuid",
  "resource": "task",
  "change": "updated",
  "affected": {
    "date": "2026-07-21",
    "taskId": "uuid"
  },
  "occurredAt": "2026-07-21T23:14:00Z",
  "correlationId": "uuid"
}
```

Keep payloads deliberately small:

- Include opaque identifiers, coarse resource type, and stable event version.
- Exclude task titles, note body/content, calendar event descriptions, attachment names, email addresses, OAuth/provider tokens, payment data, raw errors, and row snapshots.
- Treat every payload as potentially visible in logs, browser devtools, or compromised client context.
- Version event types rather than changing payload meaning in place.


### Authorization

Configure Supabase Realtime private channels and RLS policies on `realtime.messages` so users can receive only channels authorized by active workspace membership. Supabase documents Realtime Authorization through policies on the Realtime messages table and notes that private channels require authorization to control receive/send access.[^5][^4]

Authorization policy requirements:

```text
Can receive workspace:<workspace-id>:ui:
  Authenticated JWT maps to an app user that has active membership in workspace ID.

Can send:
  Client send is denied by default.

Server/database can send:
  Only trusted backend/database path emits Broadcast messages.

Membership revoked:
  Token refresh/reconnect must result in channel access denial;
  client stops/disposes subscriptions immediately.
```

**Do not allow client Broadcast sends in MVP.** User actions go through typed Hono commands, not mutable peer events.

### Authentication compatibility

Supabase Realtime authorization must be proven to work with the selected Clerk JWT configuration before enabling production channels. This is a required proof of concept, not an assumption.

**Clerk native integration (April 2025+)**: Clerk is now a supported third-party auth provider in Supabase, replacing the deprecated JWT template approach. The native integration allows Supabase to accept Clerk-signed session tokens directly via JWKS verification, eliminating the need to share JWT secrets or generate custom tokens. However, Realtime-specific compatibility must still be validated.

The spike must validate:

1. Clerk-issued session JWT (via native integration) can authenticate the Supabase Realtime client.
2. Realtime RLS can resolve claims needed for `app_users`/workspace membership checks using `auth.jwt()->>'sub'` (Clerk uses string IDs, not UUIDs like Supabase Auth).
3. JWT refresh updates subscription authorization correctly.
4. Revoked membership prevents a new subscription and disposes the existing client channel promptly.
5. The web client never needs a Supabase service-role key.
6. The `accessToken` callback pattern works correctly for Realtime connections (known issue in 2025 with Clerk third-party auth requiring async token refresh).[^11][^12]

If Clerk-to-Supabase Realtime JWT compatibility proves brittle, choose one of these fallbacks:


| Fallback | Assessment |
| :-- | :-- |
| Hono-authenticated SSE stream for web invalidation hints | Preferred fallback; simple one-way custom channel with narrow scope; HTTP/2 multiplexing eliminates old connection limits |
| Polling/refetch on focus and after mutations | Acceptable MVP fallback; preserves correctness |
| Hono-issued short-lived Supabase-compatible realtime JWT, if safely supported | Possible but adds token exchange/key management; evaluate only after simpler fallback |
| Adopt Supabase Auth | Not justified solely for web realtime; conflicts with selected Clerk decision |

Do not solve a best-effort UX improvement by weakening identity validation or sharing JWT signing secrets.

## Event Emission Flow

### Emit after commit, never from uncommitted rows

**Updated for 2026**: Supabase now recommends Broadcast from Database (trigger-based) as the scalable pattern. However, Life OS should still prefer worker-emitted Broadcast after outbox processing for most cases, with DB triggers used selectively for well-audited scenarios.

**Worker-emitted path (default)**:

```text
Hono command / webhook / worker
  -> PostgreSQL transaction
      -> domain mutation
      -> audit event
      -> outbox event
  -> commit
  -> worker dispatches domain consequence
  -> worker optionally emits a sanitized Broadcast hint
```

**DB trigger path (selective use)**:

```sql
create or replace function public.broadcast_entity_changes()
returns trigger
security definer
language plpgsql
as $$
begin
  perform realtime.broadcast_changes(
    'topic:' || coalesce(NEW.id, OLD.id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  return null;
end;
$$;
```

Why worker-emitted remains the default:

- The worker can coalesce a burst of changes into one hint.
- The worker can ensure only committed, meaningful changes are published.
- Payload shaping and event versioning happen in TypeScript/application code.
- Event emission remains tied to domain event semantics rather than raw table rows.
- The worker can suppress noisy or irrelevant events.

When to use DB triggers:

- Narrow, well-audited requirements where post-commit database-origin signaling is essential.
- High-volume tables where worker processing would be a bottleneck.
- Scenarios where the trigger payload is fully safe (no sensitive data).
- Always use `security definer` and validate all inputs in the trigger function.[^2][^8]

## Invalidation Strategy

### Web query mapping

Maintain a centralized mapping from event type to safe invalidation behavior:


| Broadcast event | Web action |
| :-- | :-- |
| `workspace.data_changed.v1` with `resource=task` | Invalidate workspace task list, Today/date window, affected project summary |
| `workspace.data_changed.v1` with `resource=calendar` | Invalidate selected calendar date range and Today |
| `workspace.data_changed.v1` with `resource=note` | Invalidate current note/list only if matching workspace/ID |
| `calendar.sync_state_changed.v1` | Invalidate integration status; optionally current calendar window |
| `workspace.plan_rebuilt.v1` | Invalidate Today/plan projection query |
| `user.export_ready.v1` | Invalidate export-status query; show non-sensitive UI prompt |
| `user.account_state_changed.v1` | Refetch profile/session state and redirect if access changed |

Rules:

- Batch/debounce invalidations (for example, 100–500 ms) to avoid event storms.
- Do not refetch every workspace resource after any event.
- Do not use broadcast payloads as entity patches.
- If a relevant page is not open, do nothing; the next normal fetch gets current state.
- Reconnect/focus causes a bounded reconciliation fetch for active views.
- The client must tolerate duplicate and out-of-order hints.


### Mobile behavior

Mobile ignores Broadcast domain hints. It updates through PowerSync replication. It may use a separate, non-domain mechanism for narrow non-replicated account changes only if required, such as an export-ready notification; polling or push notification is generally preferable.

## Connection and Reconciliation Model

### Web subscription lifecycle

```text
1. Clerk client session becomes available.
2. Fetch/resolve active app user and active workspace through Hono.
3. Acquire/refresh an approved Realtime auth token if required by selected implementation.
4. Subscribe to at most:
   - one active workspace UI channel
   - one current user UI channel
   - one active connection channel only while its settings screen is visible
5. On event, validate envelope and queue targeted invalidation.
6. On workspace change, unsubscribe old channels before subscribing new channels.
7. On sign-out, token failure, or membership revocation, unsubscribe and clear user state.
8. On reconnect/window focus, reconcile current visible queries through Hono.
```

Do not subscribe to a topic per task, project, calendar event, or list row. It increases connection/channel complexity and becomes a privacy/operational risk.

### Correctness without events

Every feature must work when:

- Realtime is disabled.
- A device is offline.
- A tab sleeps for hours.
- A websocket connection drops.
- The user has an old tab with expired JWT.
- A broadcast is lost or delivered twice.
- A deploy interrupts event emission.
- Events arrive before the corresponding Hono read returns.

The baseline remains:

```text
Command succeeds -> client invalidates/refetches affected view.
App gains focus/reconnects -> client refetches visible sensitive/current views.
Normal route entry -> server/API fetches current data.
Realtime event -> reduces time until the above refresh occurs.
```


### SSE Assessment

Server-Sent Events provide a one-way server-to-client connection; MDN notes that clients cannot send messages back over the SSE connection. This makes SSE a simpler fallback than WebSockets for web invalidation/status hints.

**2026 update**: HTTP/2 multiplexing has eliminated the old 6-connection-per-origin limit that made SSE impractical. SSE now shares a single TCP connection as logical multiplexed streams, making it viable for production use. LLM token streaming has made SSE the de facto standard for unidirectional server-to-client streaming.[^6]

Use Hono SSE only if the Supabase Realtime auth spike fails or explicit backend-controlled delivery becomes necessary:

```text
GET /v1/realtime/events
Authorization: Bearer <Clerk JWT>
```

SSE fallback requirements:

- Authenticate before opening stream.
- Verify workspace access and subscribe only to authorized server-side topics.
- Send minimal, versioned invalidation hints.
- Use event IDs and `Last-Event-ID` for replay semantics (automatic reconnection with resume).
- Maintain heartbeat (periodic comments as keep-alives for proxy compatibility), reconnect/backoff, connection limits, and server-side cleanup.
- Support graceful degradation to focus/reconnect polling.
- Never use SSE to stream raw PostgreSQL rows, note content, secrets, or provider data.
- Verify proxy/load-balancer buffering (set `X-Accel-Buffering: no` for nginx) and connection timeouts in staging.
- Handle mobile network conditions gracefully (some mobile networks silently kill idle connections).

SSE is not selected now because Supabase Broadcast avoids building and operating connection fan-out infrastructure. It is the right fallback because Life OS needs one-way hints, not arbitrary bidirectional messaging, and SSE's simplicity (auto-reconnect, HTTP semantics, CDN compatibility) makes it an excellent safety net.

## WebSockets Assessment

Do not build custom Hono WebSockets for MVP. They would require:

- Connection lifecycle and horizontal-scale coordination.
- Per-message authorization.
- Backpressure and slow-client handling.
- Reconnect/replay/ordering semantics.
- Observability and connection quotas.
- Security review of every inbound event type.
- A separate implementation for client state convergence that PowerSync already provides on mobile.

Custom WebSockets become reasonable only if a future collaboration feature requires genuinely bidirectional low-latency interaction that Supabase Broadcast/Presence cannot provide.

## Presence and Collaboration

Defer presence. A future shared workspace may need:

```text
Who is viewing a plan
Who is editing a note
Collaborative cursor/selection
Activity hints
```

These must be explicitly opt-in and privacy reviewed. Presence exposes behavioral metadata even if entity content is protected, so it cannot be added casually to a personal life-management product.

Supabase supports Broadcast and Presence concepts, with private-channel authorization available for access control.  That capability does not create a product requirement to use it.[^7][^4]

## Notification Boundary

Do not misuse realtime as the user-notification system.


| Need | Correct mechanism |
| :-- | :-- |
| App open, active web UI needs update hint | Supabase Broadcast |
| Mobile local task/event change | PowerSync |
| App backgrounded; user must be alerted | Push notification system |
| Exact scheduled reminder | Delayed job + push/local notification |
| Durable user history | Audit/event table |
| Provider webhook receipt | Verified webhook + outbox/job |
| Cross-device state correctness | PostgreSQL + PowerSync/API reconciliation |

A Broadcast event has no guarantee that a backgrounded device/tab receives it and is not a replacement for a scheduled reminder or push notification.

## Monitoring

Track:

```text
Active web subscriptions/channels
Channel join authorization failures
Reconnect rate and duration
Broadcast events emitted by type
Broadcast delivery/invalidation client telemetry, sampled and privacy-safe
Invalidation-to-fresh-data latency
Event-handler errors/schema validation failures
Fallback polling/refetch rate
Realtime auth-token refresh failures
Membership-revocation channel cleanup behavior
```

Alert on sustained authorization failures, unusually high reconnect rates, event storms, and failure to emit critical status hints. Do not log full event payloads if they can contain user-correlatable identifiers; log event type, hashed/scoped identifiers, correlation ID, and outcome.

## Testing

| Test | Required behavior |
| :-- | :-- |
| Mobile task update from another device | Mobile UI converges through PowerSync without Supabase Realtime dependency |
| Web task update from another client | Broadcast hint causes targeted invalidate/refetch and current Hono DTO render |
| Dropped/duplicate/out-of-order event | UI remains correct after normal refetch/reconciliation |
| Workspace isolation | User cannot join/send/receive another workspace’s topic |
| Membership revocation | Existing channel closes/disposes; subsequent join fails; web data clears/redirects safely |
| Sign-out/account switch | Subscriptions disposed and caches cleared before next user content appears |
| Token expiry | Token refresh works or client falls back safely without stale protected view |
| Event storm | Debounced invalidation; no request stampede |
| Realtime unavailable | Application remains usable with mutation invalidation/focus polling |
| Raw payload safety | No note/task/calendar contents, tokens, or provider data enter event payload/logs |
| Worker crash around emit | Reconciliation eventually updates web even without Broadcast hint |

## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| PowerSync only for mobile entities | One authoritative mobile local state path | Mobile does not get separate instant Broadcast hooks |
| Broadcast hints, not row replication | Stable API boundary and safer payloads | Web performs targeted refetch after event |
| Private workspace/user topics | Strong authorization model | Requires RLS/JWT compatibility proof of concept |
| Worker-emitted events | Coalescing and domain-level semantics | Slightly less immediate than raw DB trigger delivery |
| No custom socket server | Low operational/security burden | No bespoke bidirectional realtime features |
| Reconciliation baseline | Correctness under missed events | Some polling/refetch work remains necessary |
| No presence | Better privacy/scope control | No live collaboration cues in MVP |

## Final Decision

Lock the following realtime/event-delivery architecture:

```text
Mobile replicated entities:      PowerSync replication and reactive SQLite queries only
Web realtime mechanism:          Supabase Broadcast from Database (trigger-based) with private authorized channels
Event purpose:                   Best-effort, sanitized invalidation and status hints only
Canonical data after event:      Hono API refetch / TanStack Query invalidation (prefix/predicate-based)
Raw Postgres Changes:            Rejected for core client entity data (single-threaded bottleneck at scale)
Broadcast emission:              Worker emits after committed outbox-driven processing (default);
                                 DB triggers with realtime.broadcast_changes() for selective high-volume use
Authorization:                   Realtime RLS policy based on active workspace membership;
                                 Clerk native third-party auth integration (JWKS verification);
                                 Clerk/Supabase Realtime compatibility is a required spike
Topics:                          At most active workspace, active user, and temporary active-connection topics
Client send/presence:            Denied/deferred for MVP
Mobile Supabase Realtime:        Not used for replicated domain tables
Fallback if auth spike fails:    Hono-authenticated SSE for web hints (HTTP/2 compatible), or polling/refetch on focus/mutation
Correctness model:               Events may be missed/duplicated/out of order; reconciliation remains mandatory
Push/reminders:                  Separate notifications/scheduling system, never Realtime Broadcast
```

The next category in dependency order is **Notifications \& Reminders**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://supabase.com/docs/guides/realtime/broadcast

[^2]: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes

[^3]: https://powersync-ja.github.io/powersync-js/react-sdk

[^4]: https://supabase.com/docs/guides/realtime/concepts

[^5]: https://supabase.com/docs/guides/realtime/authorization

[^6]: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events

[^7]: https://supabase.com/blog/supabase-realtime-broadcast-and-presence-authorization

[^8]: https://supabase.com/docs/guides/realtime/postgres-changes

[^9]: https://tomodahinata.com/en/blog/supabase-realtime-rls-authorization-broadcast-presence-private-channel-guide

[^10]: https://supabase.com/docs/guides/realtime/getting_started

[^11]: https://supabase.com/docs/guides/database/postgres/row-level-security

[^12]: https://github.com/orgs/supabase/discussions/22484

[^13]: https://supabase.com/blog/realtime-row-level-security-in-postgresql

[^14]: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/realtime/postgres-changes.mdx

[^15]: https://supabase.com/features/realtime-broadcast-authorization

[^16]: https://supabase.com/docs/guides/realtime/reports

