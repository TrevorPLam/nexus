<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 18 — Background Jobs, Queues \& Scheduling

**Recommendation: use PostgreSQL-backed transactional outbox tables plus
`pg-boss` as the primary queue and scheduler, processed by a separate long-lived
Node worker service.** This keeps authoritative mutations, audit records, and
side-effect intent in the same Supabase PostgreSQL transaction, avoids adding
Redis or a hosted workflow vendor at MVP, and supports delayed jobs, retries,
priorities, concurrency controls, and cron-like scheduling.[^1][^2]

Use external durable workflow platforms such as **Inngest** or **Trigger.dev**
only if later requirements demand long-running, multi-step, human-in-the-loop
workflows that become awkward to operate in PostgreSQL. Do not use HTTP request
lifecycle background tasks, `setTimeout`, in-process cron libraries, or
serverless fire-and-forget callbacks for durable work.

## Core Decision

```text
Source of truth:              Supabase PostgreSQL
Transactional side-effect log: Outbox table in PostgreSQL
Primary job queue:            pg-boss, using PostgreSQL
Worker runtime:               Separate long-lived Node.js worker service
Scheduling:                   pg-boss delayed jobs / cron schedules
API runtime role:             Commits domain change + audit + outbox atomically;
                              never performs durable side effects inline
Idempotency:                  Required at command, outbox, job, and provider-operation levels
External workflows:           Defer Inngest/Trigger.dev until a defined need proves pg-boss insufficient
Redis:                        Not introduced for MVP
```

`pg-boss` is a mature Node.js background job queue built on PostgreSQL (3.7K
GitHub stars, active development through July 2026). It uses PostgreSQL's SKIP
LOCKED for exactly-once delivery, supports job scheduling, retries with
exponential backoff, dead-letter queues, rate limiting, concurrency controls,
and creating jobs within an existing database transaction. New in 2026: a web
dashboard (`@pg-boss/dashboard`), HTTP proxy (`@pg-boss/proxy`), job dependency
workflow orchestration, and ORM adapters for Drizzle, Knex, Kysely, and
Prisma.[^1]

## Requirements

Life OS needs durable asynchronous processing for:

- Calendar sync after an OAuth connection, provider webhook, user command, or
  scheduled reconciliation.
- Planning projection updates after tasks/events/projects change.
- Reminder and notification scheduling/delivery.
- OAuth token refresh and connection-health checks.
- Stripe/Clerk/provider webhook processing.
- Search indexing if a separate search system is added.
- Account data exports and deletion workflows.
- Attachment processing and cleanup if attachments ship.
- Retryable provider operations with rate limits and idempotency.
- Periodic repair, retention, reconciliation, and expiry work.

These jobs must survive API restarts, worker restarts, deployments, temporary
dependency outages, duplicate delivery, and individual provider failure. The
existing architecture already identifies a transactional outbox as necessary to
prevent state changes from committing without their required downstream
effects.[^3][^4]

## Job-Processing Options

| Option                                        | Advantages                                                                                                                                                                                                                                 | Disadvantages                                                                                                                                      | Decision                                                   |
| :-------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| **PostgreSQL outbox + pg-boss + Node worker** | Atomic relation to domain DB transaction; no Redis; retries, delays, cron, priorities, concurrency; data stays in Postgres; good small-team operational fit; mature (3.7K stars, active July 2026); new dashboard and HTTP proxy available | Database bears queue workload; requires schema/retention/monitoring discipline; less rich workflow UI than hosted platforms                        | **Select**                                                 |
| **Hatchet (Postgres-based)**                  | Durable tasks and DAG workflows; Postgres-only durability; built-in observability and dashboard; multi-language SDKs; 100K runs/month free tier; self-hostable via Docker; strong for complex workflows                                    | Additional orchestration engine; Go-based runtime; newer than pg-boss (7.5K stars, YC W24); more operational surface than simple queue             | **Strong alternative** for complex workflows               |
| **Graphile Worker**                           | High performance (up to 183K jobs/sec in tests); LISTEN/NOTIFY low latency; database-centric job creation; cron with backfill; task deduplication; mature (2K stars)                                                                       | Less feature-rich than pg-boss for queue policies; simpler scheduling model; no built-in dashboard                                                 | **Strong alternative** for high-throughput Postgres queues |
| Inngest                                       | Managed durable execution; event/cron/webhook triggers; step-level retries/checkpoints; excellent visibility; SOC 2/HIPAA compliant; agent provisioning for zero-touch setup                                                               | Additional vendor/data plane; event payload/privacy considerations; transaction/outbox bridge still required; pricing ($99/mo Pro)                 | Defer; strong future option for complex workflows          |
| Trigger.dev                                   | TypeScript-oriented durable jobs; strong AI agent focus (chat.agent, Sessions); schedules, queues, retry and monitoring; self-hostable option                                                                                              | Additional managed/self-hosted service; missing cloud features in self-hosted (warm starts, auto-scaling, checkpoints); AI-focused may be overkill | Defer; strong future option for AI-heavy workloads         |
| BullMQ + Redis                                | Mature queue ecosystem; high throughput; battle-tested; rich feature set (flows, rate limiting, groups)                                                                                                                                    | Adds Redis infra/backup/observability; no atomic write with Postgres without an outbox relay; overkill for MVP                                     | Reject                                                     |
| Sidequest (emerging 2025)                     | Redis-free; multi-backend (Postgres/MySQL/SQLite/MongoDB); built-in dashboard; worker threads; BullMQ/pg-boss alternative                                                                                                                  | Very new (1K stars, July 2025); requires Node 22.6+; not battle-tested at scale                                                                    | Monitor; not ready for MVP                                 |
| Vasto (emerging)                              | TypeScript-first; pluggable storage backends; auto-scaling supervisor; first-party dashboard; flexible worker isolation                                                                                                                    | Newer project; less mature than pg-boss; more complex architecture                                                                                 | Monitor; not ready for MVP                                 |
| Cloud queue: SQS, Pub/Sub, Cloud Tasks        | Highly durable/scalable, managed infrastructure                                                                                                                                                                                            | Cloud-vendor coupling; still requires transactional outbox; more distributed operations and configuration                                          | Defer for high scale or provider standardization           |
| Temporal                                      | Excellent long-running durable workflows and sagas; enterprise-grade                                                                                                                                                                       | Expensive ($100/mo minimum); significant operational/conceptual complexity; excessive for MVP                                                      | Reject initially                                           |
| Database polling custom queue                 | Minimal dependency                                                                                                                                                                                                                         | Rebuilds locking/retry/delay/dead-letter/observability features poorly                                                                             | Reject                                                     |
| `node-cron`, `setTimeout`, in-memory queue    | Tiny implementation effort                                                                                                                                                                                                                 | Work disappears on restarts/deploys; duplicate execution; no durable retries                                                                       | Reject absolutely                                          |
| Serverless `waitUntil`/background callback    | Convenient for short best-effort tasks                                                                                                                                                                                                     | No durable guarantee; runtime can terminate; no queue semantics                                                                                    | Reject for durable work                                    |

**pg-boss remains the optimal choice for Life OS MVP**: it provides mature,
battle-tested PostgreSQL-based queueing with active development (latest release
July 2026), new dashboard and proxy capabilities, and atomic transactional
integration with the authoritative data store. The transactional outbox pattern
remains essential regardless of queue choice.

**Hatchet and Graphile Worker are strong Postgres-based alternatives** worth
considering if requirements evolve toward complex DAG workflows or extreme
throughput needs. Hatchet offers durable tasks and built-in observability with a
generous free tier, while Graphile Worker provides exceptional performance for
high-volume scenarios.

**Inngest and Trigger.dev remain excellent managed options** for future
consideration, particularly if Life OS adopts serverless deployment patterns or
requires sophisticated human-in-the-loop workflows. Inngest's SOC 2/HIPAA
compliance and agent provisioning are notable for regulated industries.
Trigger.dev's AI agent focus aligns with the long-term AI roadmap but is
premature for MVP.

## Why PostgreSQL Queueing Wins

### Atomic intent with authoritative state

The core failure to avoid is:

```text
1. API marks a task complete in PostgreSQL.
2. API tries to enqueue plan update/reminder/calendar work.
3. API crashes or queue call fails.
4. Task is complete, but derived plan/reminders are wrong.
```

The transactional outbox pattern fixes this:

```text
1. Begin PostgreSQL transaction.
2. Validate command, identity, workspace membership, and idempotency.
3. Modify authoritative domain rows.
4. Insert audit record.
5. Insert outbox event(s).
6. Commit.
7. Worker relays/claims the committed outbox event.
8. Worker performs/retries side effect idempotently.
```

No external queue call occurs inside the transaction. The database’s commit is
the only atomicity boundary that matters.

### One operational datastore

Supabase PostgreSQL already hosts the product truth, RLS, audit records, command
idempotency, planning projections, and integration metadata. `pg-boss` uses
PostgreSQL rather than introducing Redis or another broker. For an MVP, that
lowers operational burden, security surface, backup complexity, and incident
diagnosis.[^1]

### Sufficient capability

`pg-boss` provides the core mechanics Life OS needs: delayed jobs, cron
schedules, retries/backoff, priorities, dead-letter queue behavior, worker
concurrency controls, throttling/debouncing, and backpressure-aware worker
polling.[^9][^1]

The product does not initially need a visual drag-and-drop workflow engine,
30-day “sleep until” orchestration across many human approvals, or massive
fan-out. Reassess when those requirements are real.

## Architecture

```text
Hono API / PowerSync command handler / webhook endpoint
  -> PostgreSQL transaction
      -> authoritative domain update
      -> audit log
      -> idempotency record
      -> outbox_events row
  -> HTTP response

Separate Node worker
  -> claims unprocessed outbox event
  -> idempotently creates pg-boss job
  -> marks outbox dispatch state
  -> pg-boss worker claims job
  -> application job handler
      -> provider/API/db side effect
      -> success / retry / permanent failure
      -> job outcome / error records / follow-up outbox event
```

There are deliberately **two layers**:

| Layer           | Purpose                                                                                    |
| :-------------- | :----------------------------------------------------------------------------------------- |
| `outbox_events` | Transactionally records that a committed domain change requires follow-up work             |
| `pg-boss` jobs  | Schedules, leases, retries, delays, prioritizes, and executes the actual asynchronous work |

Do not treat `pg-boss` itself as a substitute for the transactional outbox. A
queue job can be created after a commit fails, be duplicated, or be unavailable;
the outbox gives the system a durable reconciliation point.

## Database Model

### `outbox_events`

Suggested minimum shape:

```text
outbox_events
  id                      UUID primary key
  event_type              text not null
  aggregate_type          text not null
  aggregate_id            UUID not null
  workspace_id            UUID null
  actor_type              user | system | integration | webhook | worker
  actor_id                UUID/text null
  correlation_id          UUID/text not null
  causation_id            UUID/text null
  payload                 jsonb not null
  occurred_at             timestamptz not null
  available_at            timestamptz not null
  dispatched_at           timestamptz null
  dispatch_attempts       integer not null default 0
  last_error_code         text null
  locked_at               timestamptz null
  locked_by               text null
  created_at              timestamptz not null
```

Required indexes:

```text
(dispatched_at, available_at)
(event_type, available_at)
(workspace_id, occurred_at)
(correlation_id)
```

### Outbox rules

- Insert an outbox event in the exact transaction that changes authoritative
  state.
- Use schema-versioned event types, such as `task.completed.v1`.
- Keep payloads small, intentional, and privacy-minimized.
- Never place OAuth refresh tokens, Stripe payment data, raw Calendar event
  payloads, note bodies, attachment contents, or full database rows into events.
- Include identifiers and a snapshot only when needed for deterministic
  handling.
- Handlers must reload authoritative data by ID and re-check state/authorization
  where relevant.
- Outbox delivery is **at least once**; handlers must be idempotent.
- Do not delete undelivered events automatically.
- Archive/retain dispatched events according to a defined operational and
  privacy retention policy.

### `job_runs` / `job_failures`

Maintain an application-visible operational record distinct from pg-boss
internal tables:

```text
job_runs
  id
  job_name
  queue_job_id
  outbox_event_id
  workspace_id
  status                  queued | running | succeeded | retrying | failed | cancelled
  attempt
  correlation_id
  started_at
  finished_at
  error_class             null or safe normalized value
  result_reference        null or safe output reference
```

This table supports support diagnostics, reconciliation, product-facing export
status, and metrics without exposing raw queue payloads or provider secrets.

## Queue Naming and Job Contracts

### Queue names

Use stable, domain-specific names:

```text
outbox.dispatch
planning.rebuild
calendar.sync.connection
calendar.reconcile.workspace
calendar.push.write
notifications.schedule
notifications.deliver
oauth.refresh.connection
webhooks.process.stripe
webhooks.process.clerk
account.export.generate
account.deletion.execute
attachments.process
cleanup.expire
reconciliation.detect-drift
```

Do not create queues per user, workspace, task, or calendar connection. Put
those identifiers in validated job payloads and use concurrency/rate controls.

### Typed job payloads

Define Zod schemas under a jobs package:

```text
packages/jobs/
├── src/
│   ├── contracts/
│   │   ├── calendar-sync.ts
│   │   ├── planning-rebuild.ts
│   │   ├── notification-delivery.ts
│   │   ├── export.ts
│   │   └── cleanup.ts
│   ├── handlers/
│   ├── registry.ts
│   └── index.ts
```

Example:

```ts
const calendarSyncJobSchema = z.object({
  connectionId: z.uuid(),
  workspaceId: z.uuid(),
  reason: z.enum([
    'connection_created',
    'provider_webhook',
    'scheduled_reconciliation',
    'manual_refresh',
    'token_refreshed',
  ]),
  correlationId: z.string().min(1),
});
```

Every handler validates its payload even though the producer is internal. Queue
payloads are a process boundary and can outlive application releases.

## Job Categories

| Job type                    | Trigger                                                 | Priority | Retry model                            | Notes                              |
| :-------------------------- | :------------------------------------------------------ | -------: | :------------------------------------- | :--------------------------------- |
| Outbox dispatch             | Committed outbox row                                    | Critical | Fast bounded retry                     | Keeps side effects flowing         |
| Planning projection rebuild | Task/event/project change                               |     High | Debounced per workspace/date           | Derived state; coalesce bursts     |
| Calendar incremental sync   | Provider webhook, user action, scheduled reconciliation |     High | Provider-aware exponential backoff     | Lock per connection                |
| Calendar native write       | User command                                            |     High | Idempotent provider operation          | Never duplicate external events    |
| Reminder scheduling         | Task/time-block change                                  |     High | Recompute/cancel prior schedule        | Store deterministic reminder key   |
| Reminder delivery           | Scheduled due time                                      |     High | Limited retry; late delivery policy    | Timezone/DST-aware                 |
| OAuth token refresh         | Expiry threshold / provider error                       |     High | Limited retry then connection degraded | Tokens server-only                 |
| Webhook processing          | Inbound verified event                                  |     High | Durable/idempotent                     | Acknowledge fast; process async    |
| Data export                 | User request                                            |   Normal | Retryable; short-lived artifact        | Requires recent auth/authorization |
| Account deletion            | Confirmed deletion date                                 | Critical | Carefully controlled, resumable        | Cancellation/retention aware       |
| Search indexing             | Entity change                                           |      Low | Coalesced                              | Skip until separate search exists  |
| Cleanup/retention           | Cron                                                    |      Low | Idempotent                             | Never blindly bulk-delete          |
| Reconciliation              | Cron                                                    |   Normal | Alert on drift                         | Detect missed webhooks/sync issues |

## Scheduling Policy

### Use schedules for infrastructure tasks

Use `pg-boss` cron/delayed jobs for:

```text
Calendar reconciliation
Token refresh checks
Reminder delivery
Expired OAuth state cleanup
Expired export deletion
Idempotency/audit/outbox retention
Dead-letter review
Sync drift detection
Billing entitlement reconciliation
```

`pg-boss` supports cron scheduling and delayed jobs.[^9][^1]

### Do not use cron for user-local reminders blindly

A per-minute cron scanning every reminder across all users is simple but becomes
expensive and error-prone. Instead:

1. When a task or time block changes, compute its next reminder occurrence.
2. Create/update a uniquely keyed delayed delivery job.
3. When it fires, re-check current task/reminder state and user timezone.
4. Deliver, record result, and schedule the next occurrence if recurring.

For recurrence, schedule a bounded future window and periodically extend it.
This avoids trying to enqueue years of reminders while maintaining resilience
across time-zone/DST changes.

### Time handling

- Store instants in UTC.
- Store user/workspace IANA timezone separately.
- For user-facing recurrence/reminders, preserve local-time intent plus
  timezone.
- Test daylight-saving forward/back transitions.
- Determine late-notification policy explicitly: for example, skip reminders
  more than 30 minutes late rather than waking a user at 3 a.m. after an outage.
- Jobs should contain a scheduled instant plus a source entity ID; reload
  current state before delivery.

## Retry and Failure Policy

### Classify failures

| Failure class                      | Examples                                                | Policy                                                           |
| :--------------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------- |
| Transient infrastructure           | Network timeout, 502/503, database temporary failure    | Retry with exponential backoff + jitter                          |
| Provider throttling                | Google/Stripe rate limit                                | Honor retry guidance; queue-specific rate limit/backoff          |
| Concurrency/lease conflict         | Same calendar connection already syncing                | Retry soon or coalesce; do not run in parallel                   |
| Validation/domain failure          | Bad payload, deleted entity, impossible state           | Do not retry; record safe permanent failure                      |
| Authorization/consent failure      | Revoked Google grant, membership revoked                | Mark integration/action degraded; stop retries until user action |
| Idempotent duplicate               | Already-created provider event, already-applied command | Treat as successful convergence if outcome matches               |
| Programmer/schema mismatch         | Unexpected handler exception                            | Bounded retry then dead letter; alert engineering                |
| Sensitive/account deletion failure | Incomplete multi-system cleanup                         | Pause/escalate; never silently mark complete                     |

### Retry defaults

Start with job-specific, bounded defaults:

```text
Critical internal DB/outbox:      8 attempts, seconds-to-minutes exponential backoff
Calendar/provider sync:           6 attempts, provider-aware backoff and jitter
Notification delivery:            3 attempts, bounded by useful delivery window
Webhooks:                         8 attempts, idempotent, alert if dead-lettered
Exports:                          3 attempts, then visible failure/retry option
Destructive deletion:             Manual/reviewable escalation after bounded automatic retries
Cleanup:                          Retry next scheduled run, alert on repeated failures
```

Do not adopt one global retry policy. Retrying a reminder after it is no longer
useful, or repeatedly retrying revoked OAuth consent, harms user trust.

`pg-boss` supports retries with exponential backoff and dead-letter handling.
Trigger.dev also provides configurable retry behavior and exponential backoff;
it remains a viable future alternative if managed workflows become
warranted.[^10][^1]

## Idempotency and Concurrency

### Every handler is at-least-once safe

Assume any job can run:

- More than once.
- After a process crash at any instruction.
- After an external provider accepted a request but before the worker recorded
  success.
- Out of order relative to another job unless ordering is explicitly enforced.
- Much later than originally intended.

Use durable idempotency keys:

| Operation                      | Idempotency key                                         |
| :----------------------------- | :------------------------------------------------------ |
| Outbox-to-queue dispatch       | `outbox_event_id`                                       |
| Planning projection update     | `workspace_id + plan_date + projection_version`         |
| Calendar provider event upsert | `connection_id + provider_event_id + provider_revision` |
| Calendar write                 | `command_id` or generated stable provider-operation key |
| Notification delivery          | `reminder_id + scheduled_at + channel`                  |
| OAuth refresh                  | `calendar_connection_id + refresh-window`               |
| Stripe/Clerk webhook           | Provider event ID                                       |
| Export                         | `export_request_id`                                     |
| Account deletion               | `deletion_request_id + deletion_step`                   |

### Use database locks for serialized resources

Certain operations must not overlap:

```text
One calendar sync per connection
One plan recompute per workspace/date
One account-deletion workflow per account
One token refresh per integration connection
One export generation per export request
```

Use a PostgreSQL advisory lock or row-lease approach with an expiry and explicit
ownership. Do not rely solely on in-memory mutexes, because multiple worker
replicas may exist.

`pg-boss` uses PostgreSQL `SKIP LOCKED` to coordinate queue processing across
workers. Application-level resource locks are still required when different job
types can affect the same calendar connection or planning projection.[^1]

### Coalescing and debounce

Planning and calendar changes can produce bursts:

```text
User bulk-reschedules 20 tasks
  -> do not enqueue 20 full plan rebuilds
  -> enqueue or upsert one workspace/date recompute request
  -> worker processes latest authoritative state
```

Use a stable deduplication key, an `available_at` delay, and a version/dirty
marker to coalesce. The job should load current state rather than rely on a
stale event payload.

## Worker Deployment

### Separate worker service

```text
API service:
  Hono, request latency/availability optimized
  No long-running work

Worker service:
  pg-boss worker registrations
  Outbox dispatcher
  Bounded queue concurrency
  Job health/metrics
  Graceful lease release/shutdown
```

Run at least one worker replica in staging/production. Scale worker replicas
based on queue depth, oldest-job age, provider rate limits, and database
connection budget—not merely CPU.

### Graceful shutdown

On `SIGTERM`:

1. Stop fetching new jobs.
2. Mark worker as draining.
3. Allow in-flight jobs a bounded completion period.
4. Safely fail/release leases that cannot finish.
5. Close `pg-boss`/database connections.
6. Flush logs/telemetry.
7. Exit.

Do not force jobs to “succeed” during shutdown. The retry/lease mechanism must
be allowed to redeliver unfinished work.

## RLS and Database Access

Job workers are privileged operations, but they must not be all-powerful:

- Use a dedicated `job_worker` database role, separate from migration owner and
  normal app-user role.
- Limit schema/table privileges to operational and required domain tables.
- Do not grant unrestricted public table writes merely to simplify jobs.
- Require `workspace_id`, `connection_id`, or other scoped identifier in job
  contracts when applicable.
- Reload and validate current authoritative state; do not trust an old event
  payload.
- Record `actor_type = system`, `integration`, or `worker` in audit data.
- Do not replicate job/outbox/internal operational tables through PowerSync.
- Never return raw job payload/error content to clients.

For actions that require RLS bypass, use narrowly reviewed server-side paths and
explicit workspace filtering. The worker must never use the migration
owner/table owner as its runtime database identity.

## Observability and Operations

### Required metrics

```text
Queue depth by queue
Oldest pending outbox event age
Oldest queued job age
Job attempt count / retry count
Job success/failure/dead-letter rate
Execution duration by job type
Calendar provider rate-limit/authorization errors
Planning projection freshness lag
Notification scheduled-versus-delivered latency
Outbox dispatch lag
Worker concurrency and database-pool saturation
```

### Alerts

Alert on:

- Oldest critical outbox event above threshold.
- Critical queue depth or latency sustained above threshold.
- Dead-lettered calendar, deletion, billing, webhook, or reminder job.
- Repeated provider authorization errors for a connection cohort.
- Planning projection lag that affects Today.
- Worker unavailable/no successful heartbeat.
- Error-rate anomaly after deployment.
- Database connection/pool pressure.

### Admin experience

Do not build a full internal queue UI in V1. Start with:

- Restricted operational dashboards.
- Search by correlation ID, workspace ID, job ID, event ID, and integration
  connection ID.
- A controlled dead-letter/retry runbook.
- Read-only support diagnostics with redacted error class/timing.
- No generic “run arbitrary job” button.

## Postgres-Based Alternatives: Hatchet and Graphile Worker

### Hatchet

Hatchet is an orchestration engine for background tasks, AI agents, and durable
workflows built on Postgres (7.5K GitHub stars, YC W24). It provides durable
tasks, DAG workflows, built-in observability, and a real-time dashboard. Key
advantages:

- **Postgres-only durability**: Single database for both queue and
  observability, simplifying self-hosting
- **Multi-language SDKs**: Python, TypeScript, Go, Ruby support
- **Generous free tier**: 100,000 runs/month on Hatchet Cloud
- **Durable execution**: Automatic retries from failure checkpoints, not from
  scratch
- **Complex workflows**: DAGs, fan-out/fan-in, durable sleep, event waits
- **Built-in observability**: Full run replay, step-by-step logs without
  external logging

Hatchet becomes compelling if Life OS requires:

- Complex multi-step workflows with parent-child dependencies
- Long-running AI agent orchestration (hours to days)
- Human-in-the-loop pause/resume patterns
- Rich workflow UI without building custom tooling
- Multi-language support beyond Node.js

Trade-offs: Additional orchestration engine beyond a simple queue, Go-based
runtime (different from Node.js stack), and more operational surface than
pg-boss for basic job processing.

### Graphile Worker

Graphile Worker is a high-performance Node.js/PostgreSQL job queue (2K GitHub
stars) designed for database-centric applications. Key advantages:

- **Exceptional performance**: Up to 183,000 jobs/second in benchmarks, 4ms
  average latency
- **LISTEN/NOTIFY**: Sub-5ms latency from job schedule to execution
- **Database-centric**: Jobs can be created directly from PostgreSQL
  triggers/functions
- **Cron with backfill**: Minute granularity scheduling with optional backfill
  for missed runs
- **Task deduplication**: Unique `job_key` prevents duplicate jobs
- **Batch processing**: Local queue feature significantly reduces database load
  at high throughput

Graphile Worker becomes compelling if Life OS requires:

- Extreme throughput (tens of thousands of jobs/second)
- Database-triggered job creation (e.g., PostGraphile, PostgREST integration)
- Minimal latency for near real-time background processing
- Simple, high-performance queue without rich workflow features

Trade-offs: Less feature-rich than pg-boss for queue policies (rate limiting,
debouncing, concurrency controls), simpler scheduling model, and no built-in
dashboard.

## Inngest and Trigger.dev Reassessment (July 2026)

### Inngest

Inngest functions can be triggered by events, cron schedules, or webhooks and
persist step checkpoints so a failure retries from the last successful step.
Updated July 2026 capabilities:

- **Pricing**: Free tier (50K executions, 5 concurrent, 500MB span data), Pro
  $99/mo (1M executions, 100 concurrent)
- **Compliance**: SOC 2 compliant, HIPAA BAA available for regulated industries
- **Agent provisioning**: Zero-touch setup via Stripe Agent Provisioning
  Protocol
- **Durable execution**: Step-level retries, `step.sleepUntil()`,
  `step.waitForEvent()`
- **Observability**: Waterfall traces, run search, replay, SQL-based insights

Inngest is a strong choice if Life OS later needs:

- Multi-day durable workflows with many external steps
- Human approval/wait states
- Complex fan-out/fan-in behavior
- A richer hosted observability/replay experience
- Lower desire to operate queue-worker behavior directly
- Regulatory compliance (SOC 2, HIPAA)

### Trigger.dev

Trigger.dev offers long-running TypeScript jobs, retries, queues/concurrency,
schedules, and run observability. Updated July 2026 capabilities (v4.5.5):

- **AI agent focus**: `chat.agent`, Sessions, AI Prompts generally available
- **Self-hosting**: Available via Docker, but missing cloud features (warm
  starts, auto-scaling, checkpoints)
- **Runtimes**: Experimental Node.js 24 and 26 support
- **AI SDK integration**: Vercel AI SDK v5, v6, and v7 support
- **Skills system**: Progressive disclosure for agent capabilities

Trigger.dev becomes compelling if:

- AI processing pipelines or media workflows become central
- The team values a workflow product UI more than Postgres-native queueing
- Job durations and orchestration requirements exceed simple idempotent handlers
- Self-hosting/managed-hosting trade-offs fit the selected deployment plan
- Long-running AI agent orchestration is a primary use case

### Emerging Solutions (2025-2026)

**Sidequest** (July 2025): Redis-free background job processor supporting
PostgreSQL, MySQL, SQLite, and MongoDB. Features built-in dashboard, worker
threads, and BullMQ/pg-boss alternative positioning. Still maturing (1K stars) -
not recommended for MVP but worth monitoring.

**Vasto**: TypeScript-first queue system with pluggable storage backends (Redis,
Postgres, MySQL, MongoDB, DynamoDB), auto-scaling supervisor, and first-party
dashboard. Flexible worker isolation (inline/thread/process). Newer project with
less battle-testing than pg-boss.

**Duron** (December 2025): Type-safe job queue for Node.js and Bun with
step-based execution, PostgreSQL/PGLite support, REST API server, and React
dashboard. Very new (8 stars) - experimental.

**glide-mq** (February 2026): High-performance message queue built on
Valkey/Redis Streams with Rust NAPI core. AI-native primitives for cost
tracking, token streaming, model failover. Specialized for AI workloads with
Redis dependency.

### Migration Boundary

Keep a `JobDispatcher` port and typed job contracts so `pg-boss` can be replaced
without rewriting domain handlers:

```text
application event/outbox
  -> JobDispatcher interface
  -> pg-boss adapter now
  -> Hatchet/Graphile Worker/Inngest/Trigger.dev adapter later if needed
```

The transactional outbox remains valuable even after adopting an external
workflow provider. It guarantees that the event to be dispatched exists only
after the authoritative database mutation commits.

## Testing

| Test level           | Required coverage                                                                                           |
| :------------------- | :---------------------------------------------------------------------------------------------------------- |
| Unit                 | Job payload Zod schemas; retry classification; idempotency-key generation; scheduling/timezone calculations |
| Database integration | Atomic domain mutation + audit + outbox insertion; outbox claim/lease behavior; resource locks              |
| Worker integration   | Retry, backoff, duplicate job, crash/restart, dead-letter, concurrency limit, delayed execution             |
| Provider sandbox     | Google token refresh/sync, Stripe webhook/event replay, email/push test delivery                            |
| E2E                  | Task change -> projection update -> mobile/web sees correct result; reminder scheduling; export lifecycle   |
| Time tests           | DST transitions, timezone changes, late job policy, recurrence scheduling                                   |
| Security             | Worker role restriction, redaction, no credentials in payload/logs, no cross-workspace action               |
| Load/soak            | Bulk task edit coalescing, calendar webhook burst, reminder burst, queue recovery after outage              |

Critical chaos scenarios:

1. API commits a task change while worker is down; projection eventually updates
   after recovery.
2. Worker crashes after Google accepts a write but before success is recorded;
   retry does not duplicate provider event.
3. Same webhook arrives repeatedly; only one effective state change occurs.
4. Calendar token is revoked; retries stop and user sees a connection-repair
   state.
5. A deploy interrupts a running job; it is safely retried or resumed.
6. A burst of task edits produces one bounded plan recompute per affected
   workspace/date.
7. An account deletion fails halfway; system records state and resumes safely
   rather than claiming deletion completed.

## Trade-Offs

| Choice                             | Gain                                                                      | Cost                                                                    |
| :--------------------------------- | :------------------------------------------------------------------------ | :---------------------------------------------------------------------- |
| PostgreSQL outbox + pg-boss        | Atomicity with product data, fewer services, durable delayed/retried work | Queue load shares PostgreSQL resources; operational discipline required |
| Separate worker service            | Reliable side effects and independent scaling                             | Additional deployed process                                             |
| Typed job contracts                | Safer evolution and payload validation                                    | More schema/code organization                                           |
| At-least-once/idempotent design    | Correct recovery from crash/retry/duplicate delivery                      | Each handler must deliberately manage idempotency                       |
| Delayed jobs for reminders         | Accurate per-user scheduling without global scans                         | Requires reschedule/cancellation and timezone care                      |
| Coalescing plan jobs               | Prevents queue amplification                                              | Derived-state versioning/dirty tracking                                 |
| No Redis                           | Lower MVP operational surface                                             | Cannot use Redis-centric queue ecosystem                                |
| Deferring hosted workflow platform | Fewer vendors and data paths now                                          | Less built-in workflow UI/checkpointing                                 |

## Final Decision

Lock the following jobs and scheduling architecture:

```text
Durable queue:                 pg-boss on Supabase PostgreSQL (v12.26.1+, July 2026)
Atomic event handoff:          Transactional outbox_events table
Worker runtime:                Separate long-lived Node.js service
Producer behavior:             Domain transaction writes state + audit + outbox only
Consumer behavior:             At-least-once, idempotent, typed Zod-validated job handlers
Scheduling:                    pg-boss delayed jobs and cron schedules
Planning updates:              Coalesced/debounced per workspace/date from authoritative state
Calendar work:                 Serialized per connection, provider-aware retry/rate-limit policy
Reminders:                     Deterministic delayed jobs, timezone/DST-aware
Failure handling:              Bounded retries, normalized permanent failures, dead-letter alert/runbook
Operational access:            Dedicated least-privilege worker role; no client access to job/outbox tables
Monitoring:                   Use @pg-boss/dashboard for queue visibility when available
Redis:                         Not introduced for MVP
Postgres alternatives:         Consider Hatchet for complex DAG workflows; Graphile Worker for extreme throughput
Managed platforms:             Defer Inngest/Trigger.dev; revisit for genuinely long-running or multi-step workflows
Emerging solutions:             Monitor Sidequest, Vasto, Duron; not ready for MVP adoption
```

**Rationale for pg-boss selection (July 2026):**

- Mature and actively maintained (3.7K stars, releases through July 2026)
- Atomic transactional integration with authoritative PostgreSQL data store
- No additional infrastructure (Redis, separate queue server)
- Comprehensive feature set: retries, delays, cron, priorities, concurrency,
  dead-letter queues
- New dashboard and proxy capabilities improve operational experience
- ORM adapters (Drizzle, Knex, Kysely, Prisma) simplify integration
- Proven at scale for MVP-sized workloads

**When to reconsider:**

- Adopt Hatchet if complex DAG workflows and built-in observability become
  critical
- Adopt Graphile Worker if throughput exceeds 10K jobs/second or
  database-triggered jobs are needed
- Adopt Inngest if serverless deployment, regulatory compliance, or
  sophisticated human-in-the-loop workflows are required
- Adopt Trigger.dev if AI agent orchestration becomes a primary workload with
  long-running sessions

The next category in dependency order is **Realtime \& Event Delivery**.
<span style="display:none">[^11][^12][^13][^14][^15][^16][^17]</span>

<div align="center">⁂</div>

[^1]: https://github.com/timgit/pg-boss/blob/master/README.md

[^2]: https://github.com/timgit/pg-boss

[^3]: 08-Key-Technical-Decisions-Rationale.md

[^4]: 06-Data-Model-Life-Graph.md

[^5]: https://trigger.dev/docs/introduction

[^6]: https://github.com/triggerdotdev/trigger.dev/blob/main/README.md

[^7]: https://www.inngest.com/docs/learn/inngest-functions

[^8]: https://www.inngest.com/docs

[^9]: https://app.unpkg.com/pg-boss@3.1.1/files/README.md

[^10]: https://trigger.dev/docs/management/errors-and-retries

[^11]: https://www.inngest.com/docs/guides/background-jobs

[^12]: https://www.inngest.com/docs/guides

[^13]: https://www.spinny.dev/en/blog/trigger-dev-background-jobs-guide

[^14]: https://www.inngest.com/docs/guides/scheduled-functions

[^15]: https://docs.rs/pgboss/latest/pgboss/

[^16]: https://blog.codercops.com/blog/inngest-background-jobs-nextjs-2026

[^17]: https://github.com/inngest/inngest-js
