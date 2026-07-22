<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 7 — Database Management System

**Recommendation: retain PostgreSQL as the single operational database and use
Supabase-managed PostgreSQL as the primary platform for the MVP.** PostgreSQL is
the correct model for Life OS’s relational Life Graph, transaction-heavy command
processing, workspace isolation, planning projections, calendar synchronization,
search fallback, and future privacy architecture; Supabase adds the local
development stack, RLS, storage, realtime options, connection pooling, and
backups needed to ship quickly.[^1][^2][^3]

The correct decision is not “Supabase instead of PostgreSQL.” It is:

> **PostgreSQL is the database. Supabase is the managed platform and
> product-integration layer around it.**

That distinction preserves portability. Life OS should use normal PostgreSQL
schemas, migrations, constraints, indexes, transactions, RLS policies, and SQL
so a future move to a different managed Postgres provider or self-hosted
PostgreSQL remains possible.

## Requirements

The database must support:

- A unified, relational **Life Graph** of workspaces, tasks, projects, goals,
  events, notes, contacts, entity links, reminders, attachments, audit logs, and
  commands.
- Strong transactional integrity for offline commands, idempotency, calendar
  sync, outbox events, and planning projections.
- Row-level, workspace-scoped authorization that does not rely solely on
  application code.
- PostgreSQL-compatible change data capture for PowerSync.
- Full-text search for MVP command-bar search.
- Flexible metadata where schema rigidity would be harmful.
- Encryption, managed backups, recovery, and observability suitable for personal
  data.
- Low operations burden during validation and the MVP.

The Life Graph depends on both conventional relational behavior and graph-like
generic links. PostgreSQL is strong at precisely this combination: normalized
entities and relationships where integrity matters, plus `jsonb` for bounded
flexible metadata. PostgreSQL provides native JSON/JSONB types, SQL/JSON
support, functions, and operators; that is an extension point, not a reason to
model the whole product as documents.[^4][^5]

## Database Options

| Option                           | Advantages                                                                                                                                                                             | Disadvantages                                                                                                                                                                                                                                                                                                                                                           | Decision                                  |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------- |
| **Supabase-managed PostgreSQL**  | Full PostgreSQL; first-class PowerSync integration[^31]; integrated RLS/Auth/JWT, Storage, Realtime; local CLI stack; Supavisor pooling; backups/PITR; broad extension support         | Platform dependency; public-schema Data API no longer auto-exposes tables by default from late 2026; only 4 logical replication slots (Realtime may consume one); PowerSync + Supabase can see WAL growth if `max_wal_size`/`archive_timeout` is not tuned; compute resize can cause ~39 s of downtime; PG18 not yet available on managed Supabase as of July 2026[^40] | **Select**                                |
| **Neon PostgreSQL**              | Serverless scale-to-zero, instant copy-on-write branching, autoscaling; full PostgreSQL RLS; PowerSync integration guide exists[^38]; PostgREST-compatible Data API; Drizzle alignment | No bundled Auth/Storage/Realtime; cold starts 300–900 ms; logical replication prevents scale-to-zero and keeps compute active; inactive replication slots removed after ~40 h[^43]; narrower extension set; Databricks acquisition introduces strategic uncertainty                                                                                                     | Reject for primary; viable alternate      |
| **AWS RDS / Aurora PostgreSQL**  | Mature enterprise controls; IAM/VPC integration; Aurora PostgreSQL 18.3 available since June 2026[^44]; strong HA, read replicas, PITR; broad compliance path                          | High cost at scale (Multi-AZ + replicas); no integrated local dev/Auth/Storage/Realtime; requires RDS Proxy or PgBouncer for serverless loads; more assembly                                                                                                                                                                                                            | Defer; viable future migration            |
| **Crunchy Bridge**               | Pure Postgres, PG15–18, PgBouncer included, backups/PITR, cross-cloud, SOC2/HIPAA, predictable hourly pricing from $9/mo[^41]                                                          | No integrated local dev stack/Auth/Storage/Realtime; less alignment with Supabase/PowerSync local workflow                                                                                                                                                                                                                                                              | Reject for MVP; note for regulated future |
| **PlanetScale Postgres**         | Full PostgreSQL compatibility, PG17/18, HA across 3 AZ, Metal NVMe performance, Drizzle support, $5/mo start[^42]                                                                      | Newer entrant, less proven at scale; no bundled Auth/Storage/Realtime; not yet a first-class PowerSync target                                                                                                                                                                                                                                                           | Reject for MVP; watch                     |
| **Render / Railway PostgreSQL**  | Simple, cheap, good if already hosting other services on those platforms                                                                                                               | No integrated RLS/JWT/Supabase/PowerSync local stack; limited scaling/HA                                                                                                                                                                                                                                                                                                | Reject for MVP                            |
| **Self-hosted PostgreSQL**       | Maximum infrastructure/data control                                                                                                                                                    | Requires backups, HA, patching, monitoring, poolers, incident response, and security operations                                                                                                                                                                                                                                                                         | Reject for MVP                            |
| **MySQL / PlanetScale**          | Familiar relational database; PlanetScale has branching                                                                                                                                | RLS/PowerSync integration weaker; PlanetScale Vitess MySQL has no foreign keys; less aligned with Drizzle/PowerSync design                                                                                                                                                                                                                                              | Reject                                    |
| **MongoDB / Document DB**        | Flexible document model                                                                                                                                                                | Weak fit for relational graph integrity, RLS model, transaction-heavy planning projections, and shared Drizzle/PowerSync design                                                                                                                                                                                                                                         | Reject                                    |
| **SQLite-only server**           | Simple and low-cost                                                                                                                                                                    | Not appropriate as a multi-device, multi-user server source of truth or for RLS/PowerSync server sync                                                                                                                                                                                                                                                                   | Reject                                    |
| **Graph database such as Neo4j** | Native relationship traversal                                                                                                                                                          | Adds a second database or forces awkward handling of transactions, scheduling, RLS, and conventional product queries                                                                                                                                                                                                                                                    | Reject                                    |
| **Firebase / Firestore**         | Fast real-time product development                                                                                                                                                     | Document-oriented; less suitable for joins, constraints, SQL policy enforcement, and the planned PowerSync/Postgres system                                                                                                                                                                                                                                              | Reject                                    |

Neon and PlanetScale Postgres are technically viable pure-PostgreSQL platforms
with full RLS support; Neon also has a documented PowerSync integration
path[^38]. They are not the best fit here because the Life OS architecture
already assumes Supabase for local development, RLS/JWT interoperability,
Storage, Realtime, and the first-class PowerSync/Supabase integration[^31]. If
the team later decouples from the Supabase platform, Neon or PlanetScale
Postgres would be the first alternatives to re-evaluate.

## Why PostgreSQL Wins

### Relational integrity

Life OS has critical relationship constraints:

- Every user-visible entity belongs to a workspace.
- A task can reference a project, goal, area, recurrence template, reminders,
  attachments, and entity links.
- Calendar events must prevent duplicates from concurrent incremental sync and
  webhook/poll races.
- Offline commands must be idempotent and transactionally update source
  entities, audit records, outbox events, and plan projections.
- Every authorization-sensitive query must reliably scope itself to the current
  workspace.

These are relational concerns. PostgreSQL foreign keys, uniqueness constraints,
check constraints, transactional semantics, indexes, and RLS policies protect
those invariants at the authoritative data layer. A generic `entity_links` table
can add graph flexibility without abandoning integrity for all the core
entities.[^2]

### RLS as defense in depth

PostgreSQL RLS policies can control, per user, which rows are visible or can be
inserted, updated, or deleted. Supabase’s implementation is still PostgreSQL
RLS, and it is explicitly positioned as defense in depth even when a third-party
component accesses data.[^7][^8]

This matters to Life OS because authorization is not merely an API concern:

- Web reads may eventually use Supabase capabilities.
- Mobile data replication must never download another workspace’s records.
- Future integrations and background jobs must use carefully scoped service
  identities.
- A bug in Hono route filtering must not become a cross-user data breach.

**Rule:** Every table containing workspace/user data must have RLS enabled from
its first production migration. Administrative/background paths use narrowly
privileged server credentials and explicit workspace filtering; they do not
bypass authorization casually.

### Full-text search and metadata flexibility

PostgreSQL includes full-text search, allowing the MVP to use `tsvector`, GIN
indexes, and `pg_trgm` without introducing a separate search service. It also
supports JSONB for well-defined flexible fields, such as integration provider
payload fragments, UI metadata, low-frequency per-entity settings, typed event
payloads, or encrypted Vault ciphertext envelopes.[^9][^10]

**Use JSONB selectively.** Do not place task priority, status, due date,
workspace ID, ownership, timestamps, entity type, or searchable fields solely in
JSONB. Those require relational columns, constraints, indexes, and explicit
queryability.

## Supabase Evaluation

### Benefits

| Capability                   | Why it matters to Life OS                                                                   |
| :--------------------------- | :------------------------------------------------------------------------------------------ |
| Managed PostgreSQL           | Preserves standard SQL and relational integrity                                             |
| Local CLI stack              | Enables realistic local development for DB, Auth, Storage, and RLS behavior                 |
| RLS tooling                  | Supports database-level workspace isolation                                                 |
| Supavisor pooling            | Protects PostgreSQL connection limits for backend and serverless-adjacent workloads         |
| Daily backups / PITR options | Essential for a system holding planning, calendar, and future sensitive life data           |
| Storage                      | Supports attachments without assembling S3 infrastructure on day one                        |
| Realtime option              | Can support web dashboard updates if selected later                                         |
| SQL extensions               | Supports MVP FTS, `pg_trgm`, UUID generation, and other normal PostgreSQL extensions        |
| Portability                  | Database remains PostgreSQL; migrations and domain logic can remain mostly platform-neutral |

Supabase provides a full PostgreSQL database rather than an abstraction, and its
Auth, Storage, and Realtime capabilities are built around that database. It
manages daily backups and offers point-in-time recovery on paid plans; stored
object data is excluded from database backups, so Storage needs a separate
backup/export plan.[^1]

### Risks and mitigations

| Risk                                  | Why it matters                                                                                                                                                | Mitigation                                                                                                                    |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------- |
| Platform coupling                     | Convenience features can leak into domain logic                                                                                                               | Keep SQL/migrations/Drizzle schema portable; isolate Supabase SDK usage in adapters                                           |
| RLS policy mistakes                   | A wrong policy is a potential data breach                                                                                                                     | RLS tests in CI; default-deny policies; indexes for policy predicates; security review                                        |
| Service-role misuse                   | A service role can bypass RLS                                                                                                                                 | Backend-only; never client-exposed; separate roles/credentials; audit privileged access                                       |
| Direct client database access         | Can bypass intended command/business logic                                                                                                                    | Mobile writes use command pipeline; clients receive only approved query surfaces                                              |
| Backup assumptions                    | DB PITR does not restore Storage objects                                                                                                                      | Create explicit attachment storage backup/export/retention policy                                                             |
| Connection exhaustion                 | Backend/jobs can consume limited Postgres connections                                                                                                         | Supavisor transaction pooling for ordinary queries; session/direct only where required                                        |
| PowerSync replication slot contention | Supabase limits logical replication slots (max 4; Realtime may use one); PowerSync needs a slot and an extra during deploys                                   | Delete inactive slots, avoid extra CDC consumers, monitor `pg_replication_slots`                                              |
| PowerSync WAL growth                  | Supabase's default `archive_timeout` can cause excessive WAL growth with idle PowerSync slots, maxing disk                                                    | Tune `max_wal_size` and `max_slot_wal_keep_size`; monitor disk; keep slots active; see PowerSync Supabase guidance[^31]       |
| Data API default change               | Supabase will stop auto-exposing `public` schema tables to the Data API for new projects from May 2026 and enforce it for existing projects from October 2026 | Do not rely on direct Data API writes; use backend command pipeline and explicit grants if needed                             |
| Compute resize downtime               | Resizing Supabase compute can cause ~39 s of SQL downtime and throttle consecutive changes                                                                    | Plan compute sizing before load spikes; treat resizes as maintenance windows                                                  |
| Branching with data                   | Supabase `with_data` branches require existing physical backups and may fail on fresh projects                                                                | Use seed/migration scripts for branch data; do not depend on copy-on-write branches                                           |
| Vendor outage / pricing               | Managed dependency                                                                                                                                            | Exportable PostgreSQL backups, provider-neutral SQL, contingency runbook                                                      |
| Extension availability                | Not every Postgres extension/version behaves identically; Supabase PG17 drops `timescaledb`, `plv8`, `plcoffee`, `plls`, `pgjwt`                              | Verify needed extensions before relying on them; avoid exotic extensions in MVP; pin to a supported Supabase Postgres version |

## Data Model Principles

### Use a conventional relational core

The following must be explicit, first-class relational tables:

```text
users
workspaces
workspace_memberships
areas
goals
projects
tasks
task_occurrences
calendar_connections
calendar_sources
calendar_events
native_time_blocks
notes
contacts
entity_links
reminders
notifications
attachments
integration_accounts
audit_logs
outbox_events
idempotency_keys
daily_plan_events / daily_plan_projections
```

This follows the planned Life Graph but adds one important clarity: **use a
`workspace_memberships` table from day one**, even when V1 only allows a single
personal workspace. It makes authorization policies explicit and prevents a
breaking schema redesign when household, family, or shared workspaces arrive
later. The V1 product can enforce one membership/workspace per user at the
application/onboarding level while the database remains future-safe.[^2]

### Use UUIDv7 or database-generated UUIDs

Use time-sortable UUIDv7 identifiers where the selected PostgreSQL/Supabase
version and ecosystem support them cleanly; otherwise use `gen_random_uuid()`
and do not invent a custom ID scheme. The final ORM/migration research should
verify exact support before locking the default.

Requirements regardless of UUID variant:

- IDs are opaque to clients.
- IDs are generated authoritatively on the server for ordinary online creation.
- Offline creation uses a conflict-safe client-generated identifier only where
  PowerSync command design requires it.
- No sequential IDs exposed to users.
- Every FK column gets an appropriate index when not already covered.

### Time and audit fields

Every mutable domain table should include:

```text
id
workspace_id
created_at
updated_at
created_by_user_id
updated_by_user_id
version or revision field where optimistic/concurrent semantics require it
```

Use `timestamptz`, always store timestamps in UTC, and convert to a user’s
timezone only in application/planning layers. Calendar events additionally need
source timezone and original provider time fields when Google’s representation
requires them.

Do not rely on client-provided `created_at`, `updated_at`, workspace ID, or
ownership fields. Enforce defaults/triggers or server-side command handling.

## Workspace Isolation and RLS

### Policy design

For user-owned data, policies should derive access from a membership relation
and JWT claims, rather than trusting a `workspace_id` delivered in a request.

Conceptually:

```sql
CREATE POLICY workspace_member_can_access_task
ON tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM workspace_memberships wm
    WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workspace_memberships wm
    WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
  )
);
```

This is conceptual only. The Clerk-to-Supabase claim mapping and exact helper
function must be validated in the dedicated auth/RLS research category. The
critical PowerSync/Clerk JWT proof of concept must confirm that the same
authorization context is correctly applied to PowerSync replication.[^3][^11]

### RLS rules to lock

- Enable RLS on every workspace/user data table.
- Start with **default deny**: no policy means no access.
- Make `workspace_id` non-null for all scoped data.
- Use `WITH CHECK` for insert/update policies, not only `USING`.
- Prevent clients from changing `workspace_id`, ownership, audit actor fields,
  external integration ownership, or status fields that should only be set
  through server commands.
- Test every `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and upsert path under at
  least two different workspace identities.
- Test anonymous access returns no personal rows.
- Test server/background credentials separately from user-scoped credentials.
- Treat any direct `service_role` use as privileged infrastructure code
  requiring code-owner review.

RLS applies to normal row retrieval and data-changing operations, and policies
can control which rows are returned or inserted/updated/deleted.[^7]

## Connection Management

Use the right connection mode for the workload:

| Workload                                         | Recommended connection                            | Rationale                                               |
| :----------------------------------------------- | :------------------------------------------------ | :------------------------------------------------------ |
| Ordinary backend HTTP queries                    | Supavisor transaction pooler                      | Reuses DB connections efficiently                       |
| Serverless/short-lived processes                 | Supavisor transaction pooler                      | Avoids connection exhaustion                            |
| Drizzle migrations                               | Direct/native connection                          | Migration tools may require session semantics           |
| Long-lived listener or session-dependent process | Session pooler/direct, only after explicit review | Transaction poolers cannot preserve session-local state |
| Local Supabase development                       | CLI-provided connection                           | Local parity and tooling support                        |
| PowerSync service source connection              | Dedicated provider-supported connection/user      | Isolate access and validate replication requirements    |

Supavisor transaction mode assigns a database connection only for one
transaction, while session mode assigns it for the lifetime of a client
connection; native/direct mode is typically appropriate for migrations. Supabase
recommends monitoring and sizing pool capacity against actual connection usage
rather than blindly raising limits.[^12][^13]

**Important constraints with transaction pooling:**

- Do not depend on session variables unless they are set safely per transaction.
- Do not assume temporary tables, prepared statements, `LISTEN/NOTIFY`, advisory
  locks, or session-local configuration survive across requests.
- For RLS policy context, use validated JWT claims / request-scoped transaction
  settings through an approved mechanism, not global connection state.
- Do not let background job concurrency exceed connection-pool capacity.

## Search

For MVP, use PostgreSQL:

- `tsvector` generated/search columns for task titles, project names, notes,
  contacts, and selected metadata.
- GIN indexes for full-text vectors.
- `pg_trgm` indexes for typo-tolerant-ish prefix/substring matching where
  appropriate.
- Search results always filtered by workspace authorization before
  ranking/presentation.
- No note body or sensitive content in analytics/logs.

PostgreSQL’s native full-text search includes document parsing, matching,
configuration, ranking, and highlighting facilities. Do not add Meilisearch
until the baseline search experience demonstrably fails product requirements for
latency, typo tolerance, ranking, or cross-entity relevance.[^14][^10][^9]

## Life Graph Query Strategy

The main risk is not “PostgreSQL cannot model a graph.” It can. The risk is
treating generic links as an excuse for unbounded runtime graph traversals on
the Today screen.

### Required approach

- Keep common direct relationships as real FKs: `task.project_id`,
  `project.area_id`, calendar source/connection IDs, etc.
- Use `entity_links` for optional many-to-many contextual relationships and
  typed cross-domain links.
- Enforce a canonical link order to avoid duplicate inverse links.
- Use a unique constraint such as
  `(workspace_id, source_type, source_id, target_type, target_id, link_type)`.
- Validate referenced entity existence and workspace match server-side;
  polymorphic links cannot use normal database FKs without additional structure.
- Build a denormalized `daily_plan_projection` from the transactional outbox.
- Query the projection for Today, not arbitrary live graph joins.
- Instrument plan-projection latency and queue lag from the start.

The project already identifies `daily_plan_events` as a materialized/flattened
projection maintained by the outbox specifically to avoid complex live joins in
the core planning surface. That must be built during the MVP foundation, not
added after performance degrades.[^11][^2]

## Transactional Integrity

All user mutations that influence the graph or plan must occur inside one
database transaction:

```text
1. Validate authenticated actor and workspace access.
2. Validate typed command and idempotency key.
3. Read/update authoritative entity rows.
4. Update derived local relational state as required.
5. Insert audit-log entry where required.
6. Insert outbox event.
7. Commit.
8. Process outbox asynchronously.
```

Never update the task and independently “try” to enqueue a plan recalculation,
search update, audit record, or notification after the fact. The outbox event
belongs in the same transaction as the state change.[^15][^2]

## Backup, Recovery, and Retention

### Required MVP controls

- Use a paid Supabase plan before handling real beta-user data.
- Enable and verify point-in-time recovery if the plan/region supports it.
- Document RPO and RTO explicitly.
- Test restoration to an isolated project at least once before private beta.
- Take/export logical database backups on a defined schedule appropriate to the
  customer-data risk.
- Maintain a separate attachment/object-storage backup/export strategy.
- Validate that account deletion and retention workflows are reflected in
  restored data handling.
- Keep migration artifacts and release tags so a restored DB can be paired with
  a compatible application release.

Supabase provides daily database backups and PITR on paid plans; database
backups do not include Storage objects. A historical Supabase PITR explanation
notes the core recovery model combines snapshots and archived WAL records; the
exact retention and availability should be confirmed against the selected plan
and region before launch.[^16][^1]

## Data Residency

For initial launch, choose a US region close to the MVP customer base and
backend host. The founder is in Texas and the initial audience is US-based
founders/operators, so a central or nearby US region is the practical default,
subject to current provider region availability and backend-host location. The
project should not claim EU data residency or HIPAA readiness in V1; those
require distinct legal, operational, and vendor assessments.[^17][^18]

Maintain portability:

- No production data dependence on undocumented Supabase internals.
- Migrations checked into source control.
- Data exports available in a documented portable format.
- Storage abstraction separate from database references.
- Platform adapters isolated from domain packages.

## PostgreSQL Version

The plan initially specifies PostgreSQL 15+. **Update the policy to “use the
newest Supabase-supported stable PostgreSQL major version at project creation,
with a minimum of PostgreSQL 15.”** Upstream PostgreSQL 18 was released on
2025-09-25 and introduces async I/O, `uuidv7()`, virtual generated columns, and
OAuth authentication support[^39]. However, as of July 2026 Supabase-managed
projects offer PostgreSQL 15 and 17 (self-hosted default is now 17), and
PostgreSQL 18 is not yet generally available on the Supabase managed
platform[^40]. Select the newest Supabase-supported stable version for the
project unless a PG18-specific feature is required.

Do not upgrade a production major version merely because a new Postgres release
exists. Upgrade after checking:

- Supabase support and upgrade path.
- Drizzle compatibility.
- PowerSync source compatibility.
- Required extension compatibility.
- Backup/restore rehearsal.
- RLS, migration, and performance regression test results.

## Final Decision

Lock the following database platform design:

```text
Database engine:              PostgreSQL
Primary provider/platform:    Supabase-managed PostgreSQL
Minimum version:              PostgreSQL 15; select the newest Supabase-supported stable major at creation (currently 17; PG18 not yet available on managed Supabase as of July 2026)
Data model:                   Normalized relational core plus constrained JSONB metadata and entity_links
Authorization:                PostgreSQL RLS, default-deny, workspace membership based
Client access:                No unrestricted direct writes; mobile mutations use validated command pipeline
Transactions:                 Authoritative mutation + audit/outbox event atomically committed
Planning performance:         Precomputed daily-plan projection, not live graph traversal
MVP search:                   PostgreSQL FTS + pg_trgm
Connections:                  Supavisor transaction pooling for normal backend requests; direct/native for migrations only
Backups:                      Paid plan; daily backups; PITR verified before real beta data; separate object-storage backup policy
Portability:                  Standard PostgreSQL SQL/migrations; Supabase-specific SDK calls isolated behind adapters
Alternatives:                 Reject MySQL, MongoDB, Firebase, SQLite-only, Neo4j, self-hosting, and generalist hosts for MVP. Neon and PlanetScale Postgres are viable pure-Postgres alternatives if Supabase is decoupled; AWS RDS/Aurora and Crunchy Bridge are viable future migration targets for compliance/scale.
```

The next category in the dependency order is **ORM \& Database Tooling**.
<span style="display:none">[^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44]</span>

<div align="center">⁂</div>

[^1]: https://supabase.com/docs/guides/database/overview

[^2]: 06-Data-Model-Life-Graph.md

[^3]: 07-Technical-Architecture-Fundamentals.md

[^4]: https://www.postgresql.org/docs/current/datatype-json.html

[^5]: https://www.postgresql.org/docs/current/functions-json.html

[^6]: https://neon.com/docs/guides/row-level-security

[^7]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

[^8]: https://supabase.com/docs/guides/database/postgres/row-level-security

[^9]: https://www.postgresql.org/docs/current/textsearch.html

[^10]: 14-Dependencies-Tooling-Third-Party-Platforms.md

[^11]: 10-Risks-Gaps-and-Unresolved-Questions.md

[^12]: https://supabase.com/docs/guides/database/connection-management

[^13]: https://supabase.github.io/supavisor/configuration/pool_modes/

[^14]: https://www.postgresql.org/docs/current/textsearch-intro.html

[^15]: 08-Key-Technical-Decisions-Rationale.md

[^16]: https://supabase.com/blog/postgres-point-in-time-recovery

[^17]: 02-Target-Audience-Validation.md

[^18]: 11-Operational-Compliance-Considerations.md

[^19]: https://supabase.com/features

[^20]: https://supabase.com/docs/guides/platform/backups

[^21]: https://supabase.com/features/row-level-security

[^22]: https://docs.postgresql.fr/9.6/ddl-rowsecurity.html

[^23]: https://wiki.postgresql.org/wiki/Row-security

[^24]: https://supabase.com/solutions/hosted-postgres

[^25]:
    https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/getting-started/features.mdx

[^26]: https://www.postgresql.jp/docs/9.6/ddl-rowsecurity.html

[^27]: https://vibe-eval.com/guides/neon/

[^28]: https://postgrespro.ru/docs/enterprise/16/ddl-rowsecurity?lang=en

[^29]: https://www.postgresql.org/docs/current/functions-textsearch.html

[^30]: https://postgrespro.com/docs/postgresql/17/textsearch

[^31]: https://docs.powersync.com/integrations/supabase/guide

[^32]:
    https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO

[^33]: https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI

[^34]: https://docs.powersync.com/configuration/source-db/connection

[^35]:
    https://supabase.com/docs/guides/troubleshooting/how-do-i-update-connection-pool-settings-in-my-dashboard-wAxTJ_

[^36]: https://docs.powersync.com/intro/setup-guide

[^37]: https://www.youtube.com/watch?v=R3DBUKa7AWY

[^38]: https://docs.powersync.com/integrations/neon

[^39]: https://www.postgresql.org/docs/18/release-18.html

[^40]: https://github.com/supabase/postgres

[^41]: https://docs.crunchybridge.com/concepts/plans-pricing

[^42]: https://planetscale.com/docs/postgres/postgres-compatibility

[^43]: https://neon.com/docs/guides/logical-replication-neon

[^44]:
    https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-aurora-postgresql-major-version-18/
