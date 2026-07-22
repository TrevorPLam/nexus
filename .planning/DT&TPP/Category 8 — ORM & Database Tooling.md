<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 8 — ORM \& Database Tooling

**Recommendation: select Drizzle ORM (`drizzle-orm` `^0.45.2` or latest 0.4x
line supported by `@powersync/drizzle-driver`) with `drizzle-kit` (`^0.31.10` or
compatible), keep PostgreSQL SQL migrations in the Supabase CLI migration
directory as the sole applied-migration history, and use `postgres.js` for the
Node/Hono backend connection.** Use Drizzle’s TypeScript schema as the canonical
declarative model and generate reviewed SQL migrations; apply those migrations
through the Supabase CLI in local, CI, staging, and production environments. Pin
to the 0.4x line while `@powersync/drizzle-driver` is beta; do not move to
Drizzle v1 until the PowerSync driver and `drizzle-kit` v1 compatibility is
documented and tested.[^1][^2][^3][^33]

This choice best satisfies the critical Life OS requirement that server
PostgreSQL schema, TypeScript domain types, and PowerSync’s local SQLite schema
remain closely aligned. PowerSync maintains an official Drizzle driver that
brings ORM-style schema benefits to its JavaScript client SDK.[^4]

## Decision Scope

This category determines four related but separate concerns:

| Concern                          | Decision                                                                |
| :------------------------------- | :---------------------------------------------------------------------- |
| Server-side database query layer | Drizzle ORM                                                             |
| Database schema declaration      | TypeScript Drizzle schema                                               |
| Migration generation/review      | `drizzle-kit generate`, reviewed SQL                                    |
| Migration application/history    | Supabase CLI migration workflow                                         |
| Backend PostgreSQL driver        | `postgres.js`                                                           |
| Mobile local database layer      | PowerSync + official Drizzle driver                                     |
| Database inspection              | Supabase Studio first; Drizzle Studio local-only as optional tool       |
| Raw SQL                          | Permitted and expected for advanced PostgreSQL/RLS/index/migration work |

Do not treat an ORM as the database source of authority. PostgreSQL remains
authoritative; Drizzle is the typed schema/query interface; committed SQL
migrations are the immutable record of how production database state evolves.

## Requirements

The tooling must support:

- PostgreSQL schemas, foreign keys, unique/check constraints, indexes, views,
  triggers, functions, extensions, RLS policies, roles, and grants.
- A relational Life Graph with typed entities and generic `entity_links`.
- Strict workspace-scoped RLS.
- Transactional commands, idempotency, audit logs, and outbox events.
- Queries that are readable enough to review for tenant isolation and
  performance.
- Local Supabase CLI workflow and CI migration verification.
- PowerSync’s SQLite client schema and offline data flow.
- Portable SQL that does not tie the domain to a single managed provider.
- A small-team workflow with clear code review and low runtime overhead.

## Query-Layer Options

| Option                           | Advantages                                                                                                                                                                                                                   | Disadvantages                                                                                                                                                                                              | Decision                                                             |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **Drizzle ORM**                  | TypeScript-first schema; SQL-like queries; lightweight runtime; PostgreSQL support; migration generator; native RLS definitions (`pgTable.withRLS()`); official PowerSync Drizzle driver (`@powersync/drizzle-driver`, beta) | Newer/smaller ecosystem than Prisma; some advanced Postgres features still require raw SQL; schema/migration discipline remains necessary; PowerSync Drizzle driver is beta and constrains Drizzle version | **Select**                                                           |
| Prisma ORM                       | Mature ecosystem, good developer ergonomics; Prisma 7 (2026) is Rust-free, ~1.6 MB runtime bundle, up to 3x faster queries, edge-compatible; strong migrations story                                                         | Still requires `prisma generate`; schema DSL differs from TypeScript; no official PowerSync driver; PostgreSQL RLS/policies/extensions still require raw SQL                                               | Reject                                                               |
| Kysely                           | Excellent type-safe SQL builder; explicit SQL-like queries; very little magic; now has an official PowerSync driver (`@powersync/kysely-driver`) for mobile SQLite                                                           | No schema/migration generation from a single TypeScript model; server PostgreSQL types and mobile SQLite schema must be coordinated manually; query dialects differ between PG and SQLite                  | Strong alternative, reject as the primary tool for this architecture |
| Raw `postgres.js` / `pg` only    | Maximum PostgreSQL control, no ORM abstraction; `pg` added opt-in pipelining in 2026 and is comparable to `postgres.js` when prepared statements are used                                                                    | Recreates types/schema/query consistency manually; higher drift risk between server and mobile schema                                                                                                      | Use selectively underneath Drizzle / for advanced SQL only           |
| Knex                             | Mature query builder and migrations                                                                                                                                                                                          | Weaker TypeScript ergonomics and no PowerSync schema alignment advantage                                                                                                                                   | Reject                                                               |
| TypeORM / MikroORM               | Full-featured traditional ORM patterns                                                                                                                                                                                       | More runtime abstraction and implicit behavior than needed; weaker fit for SQL-first/RLS-oriented architecture                                                                                             | Reject                                                               |
| Supabase JS client as server ORM | Quick direct database access                                                                                                                                                                                                 | Couples server data access to Supabase APIs; weaker schema/query ownership; service-role misuse risks                                                                                                      | Reject as core data layer                                            |

Drizzle supports both `node-postgres` and `postgres.js` PostgreSQL drivers and
provides `drizzle-kit` to generate, apply, pull, and inspect migrations. As of
mid-2026, `drizzle-kit` 0.31.x is stable and a v1 rewrite (DDL snapshots, faster
introspection, migration conflict detection, `push --explain`) is in beta; Life
OS should stay on the 0.3x line until v1 is stable and the PowerSync driver
supports it. Kysely is a strong type-safe SQL builder with official PostgreSQL
and SQLite dialects and an official PowerSync driver
(`@powersync/kysely-driver`), but it does not provide the same
schema-to-migration generation path as Drizzle.[^5][^2][^6][^7][^33]

## Why Drizzle Wins

### Shared schema direction

The critical integration chain is:

```text
PostgreSQL design
  -> Drizzle TypeScript schema
  -> reviewed SQL migration
  -> Supabase local / staging / production database
  -> PowerSync-compatible client schema representation
  -> typed server queries and shared domain contracts
```

Drizzle’s TypeScript schema is close to the language used by the rest of the
monorepo, while its queries remain recognizably SQL-shaped. That makes tenant
predicates, joins, transaction composition, indexes, and query plans easier to
inspect than a deeply abstracted repository/query API.

Drizzle can generate SQL migrations from TypeScript schema declarations,
introspect existing databases, and support either codebase-first or
database-first workflows. Life OS should use a **codebase-first declarative
schema plus SQL-reviewed migration workflow**, not schema pushing directly to
shared environments.[^1]

### PowerSync alignment

The planned offline-first architecture depends on a reliable bridge from
relational schema to a local mobile SQLite representation. PowerSync’s
maintained `@powersync/drizzle-driver` is the decisive advantage: it connects
the PowerSync client SDK to Drizzle-defined local schema constructs rather than
forcing a separate hand-maintained SQLite model.[^4]

This does not mean the server PostgreSQL schema and client SQLite schema are
identical. They cannot be:

- The server has RLS, roles, functions, triggers, audit tables, outbox tables,
  integration secrets, and server-only fields.
- The client should receive only the user-authorized replication subset.
- SQLite and PostgreSQL have dialect differences.
- Mobile writes must enter the validated command pipeline, not mutate arbitrary
  replicated rows as if SQLite were the authoritative server database.

The proper approach is **shared model intent with separate server/client schema
exports**, not one schema file blindly used everywhere.

> **Version and maturity note (mid-2026):** `@powersync/drizzle-driver` is beta
> (v0.7.x) and currently ties the project to the `drizzle-orm` 0.4x line. The
> driver supports `DrizzleAppSchema` to derive a PowerSync SQLite schema from
> Drizzle table definitions and `toCompilableQuery`/`watch` for reactive client
> queries. It does not enforce server-side constraints (FKs, unique, cascade) on
> the local replica, which is correct: PostgreSQL remains the authority. Do not
> upgrade to Drizzle v1 until the PowerSync driver and `drizzle-kit` v1
> compatibility is documented and tested.

## Prisma Evaluation

Prisma is the most credible alternative, particularly for teams that value
generated CRUD APIs and a large community. As of 2026, Prisma 7 is a major
reset: it is Rust-free, uses a TypeScript/WASM query compiler, ships a ~1.6 MB
runtime bundle (down from ~14 MB), and delivers up to 3x faster queries with
edge-runtime support.[^8][^9][^34]

| Strengths                                                                                         | Why it is not selected                                                                                          |
| :------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------- |
| Strong onboarding, generated client, broad ecosystem; Prisma 7 narrows the bundle/performance gap | Life OS needs SQL/RLS/outbox/query transparency more than generated CRUD                                        |
| Good schema ergonomics for conventional relations                                                 | RLS, policies, Postgres extensions, indexes, functions, and triggers still need custom SQL                      |
| Established migration workflows                                                                   | The project already needs Supabase CLI migrations and PowerSync compatibility                                   |
| Familiar to many TypeScript developers                                                            | It still requires `prisma generate`; it would create a separate schema DSL and has no official PowerSync driver |

**Verdict:** Prisma 7 is now a much stronger conventional alternative. It would
be acceptable for a server-rendered SaaS without an offline-first mobile
requirement. It is not the best choice for this specific Postgres + PowerSync +
RLS-first offline architecture.

## Kysely Evaluation

Kysely is the strongest technical runner-up. It is a type-safe,
autocompletion-friendly TypeScript SQL query builder, inspired by Knex, with
official dialects for PostgreSQL and SQLite. As of 2026, PowerSync also
maintains an official `@powersync/kysely-driver` for mobile SQLite, making
Kysely a more credible cross-stack option than before.[^6][^7][^35]

### Research Notes: Drizzle vs Kysely

Recent research comparing Drizzle and Kysely highlights key architectural
differences that inform the selection:

- **Schema Generation**: Drizzle provides a declarative schema definition that
  can generate both TypeScript types and SQL migrations from a single source of
  truth. Kysely requires manual schema synchronization and does not include
  built-in migration generation, meaning server PostgreSQL types and mobile
  SQLite schema must be coordinated manually.

- **Query Style**: Kysely offers a more explicit, SQL-like query builder with
  minimal abstraction, which is excellent for developers who want direct control
  over SQL construction. Drizzle provides a slightly higher-level API that still
  feels SQL-like but includes more convenience methods and better integration
  with its schema system.

- **PowerSync Integration**: Both tools now have official PowerSync drivers
  (`@powersync/drizzle-driver` and `@powersync/kysely-driver`). However,
  Drizzle's schema-to-migration workflow aligns better with PowerSync's
  requirement for a shared schema definition between server and client.

- **Type Safety**: Both provide excellent TypeScript type safety. Kysely is
  particularly strong for complex queries with aliases and subqueries due to its
  explicit typing. Drizzle's type system is more tightly coupled to its schema
  definitions.

- **Ecosystem and Tooling**: Drizzle includes Drizzle Studio for local database
  inspection and has a growing ecosystem around its schema system. Kysely has a
  smaller ecosystem but benefits from being more lightweight and having fewer
  dependencies.

| Strengths                                                                  | Why it is not selected                                                                                  |
| :------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| Very explicit, SQL-like, performant query composition                      | Requires more manual schema/type synchronization; no generated SQL migrations                           |
| Minimal abstraction and excellent escape-hatch story                       | Lacks Drizzle’s one-file schema-to-migration-to-type workflow                                           |
| Strong fit for complex planning projections and reporting                  | More tooling must be assembled for migrations, schema declarations, and mobile parity                   |
| Avoids ORM “magic”; strict compile-time type safety for aliases/subqueries | Life OS benefits more from Drizzle’s generated SQL migrations and schema-to-mobile alignment            |
| Official PowerSync Kysely driver exists for client-side SQLite             | The driver still requires a separate PowerSync app schema and manual mapping to server PostgreSQL types |

**Verdict:** keep Kysely as the primary fallback if the PowerSync Drizzle
integration fails its required proof of concept or if Drizzle cannot express a
critical workload cleanly. Do not add it alongside Drizzle initially; two query
builders mean two conventions, duplicated types, and unclear ownership.

## Database Driver Decision

### Select `postgres.js` for backend runtime queries

Use `postgres.js` beneath Drizzle for the Hono backend.

| Driver                      | Advantages                                                                                                                                                                            | Disadvantages                                                                                               | Decision            |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------- | :------------------ |
| **`postgres.js`**           | Lightweight, modern, tagged-template SQL escape hatch, strong Drizzle support, pipeline mode, good fit for long-lived Node service                                                    | Requires deliberate pool/settings configuration; some ecosystem integrations historically target `pg` first | **Select**          |
| `pg` / node-postgres        | Most widely used Node PostgreSQL driver; deep ecosystem compatibility; opt-in pipelining merged in 2026 and performance with named prepared statements is comparable to `postgres.js` | Older callback/event-oriented surface and more configuration overhead                                       | Acceptable fallback |
| Supabase JS client          | Convenient for Supabase API behavior                                                                                                                                                  | Wrong abstraction for backend’s primary transactional query layer                                           | Reject              |
| HTTP-based database drivers | Serverless friendly in some providers                                                                                                                                                 | Unnecessary for a durable Hono service and may limit transaction/query semantics                            | Reject              |

Drizzle explicitly supports both `node-postgres` and `postgres.js`. The backend
is planned as a long-lived Node/Hono service, so `postgres.js` can use pooled
direct PostgreSQL connections through the selected Supabase pooler. The exact
connection URL and pool mode must follow the prior database decision:
transaction pooling for ordinary HTTP workloads; direct/native connection for
migrations.[^5]

### Connection policy

```text
HTTP application queries:    Drizzle + postgres.js over Supavisor transaction pooler
Background job queries:      Separate, bounded postgres.js pool; same pooler unless session behavior is required
Migration runner:            Separate postgres.js instance, max: 1, direct/native connection
Local development:           Supabase local connection
PowerSync source connection: Dedicated least-privileged DB role/connection, separately configured
```

Drizzle’s migration guidance for `postgres.js` specifies a migration connection
with `max: 1`; use a distinct migration client rather than reusing the
application pool.[^10]

When using `postgres.js` with Supabase’s Supavisor transaction pooler (port
6543), set `prepare: false` because transaction-pooling mode does not support
prepared statements. The same constraint applies to any driver using a
transaction-mode pooler. Use a session-mode or direct/native connection for the
migration runner and for long-lived backend processes when IPv6 or the IPv4
add-on is available.

Do not instantiate a new client per HTTP request. Create one application
database client per backend process and shut it down gracefully during
termination.

## Schema Structure

Place server database ownership in one package, but do not export unrestricted
access to clients:

```text
packages/database/
├── src/
│   ├── schema/
│   │   ├── core.ts                 # workspaces, users, memberships
│   │   ├── life-graph.ts           # areas, goals, projects, tasks
│   │   ├── calendar.ts             # connections, sources, events
│   │   ├── knowledge.ts            # notes, contacts, attachments
│   │   ├── planning.ts             # plan events/projections
│   │   ├── operations.ts           # outbox, idempotency, audit logs
│   │   ├── rls.ts                  # policy and role declarations
│   │   └── index.ts
│   ├── migrations/                 # generated/reviewed SQL; explained below
│   ├── queries/                    # backend-only approved query helpers
│   ├── seed/
│   ├── generated/
│   │   └── database.types.ts       # generated, never hand-edited
│   ├── client.ts                   # backend-only Drizzle + postgres.js factory
│   └── index.ts                    # schema/type exports only; no live client
├── drizzle.config.ts
└── package.json
```

Use subpath exports to make the boundary technically enforceable:

```json
{
  "exports": {
    "./schema": "./dist/schema/index.js",
    "./types": "./dist/generated/database.types.js",
    "./client": {
      "node": "./dist/client.js",
      "default": null
    }
  }
}
```

Then enforce with dependency-cruiser and ESLint:

- `apps/backend` may import `@life-os/database/client`.
- Migration/seed scripts may import database server modules.
- `apps/web`, `apps/mobile`, `packages/ui`, `packages/shared`, and
  `packages/calendar-engine` may **not** import `@life-os/database/client`.
- Mobile local schema belongs in a separate `packages/mobile-data` package,
  described below.

## Server and Mobile Schema Split

### Server schema: `packages/database`

Contains the full PostgreSQL model:

- Tables, views, enums/domains, indexes, FKs, constraints.
- RLS policies, roles, privileges/grants.
- Triggers/functions where essential.
- Server-only operational tables: audit logs, outbox, idempotency,
  OAuth/integration metadata.
- Database query helpers and transaction boundaries.

Drizzle can define RLS policies and PostgreSQL roles declaratively, including
support for Supabase predefined roles; a table with no policy under RLS defaults
to deny.[^11]

### Mobile schema: `packages/mobile-data`

Contains only PowerSync-replicated SQLite data and client-safe indexes:

```text
packages/mobile-data/
├── src/
│   ├── schema/
│   │   ├── replicated.ts           # task/project/event/note etc. replicas
│   │   ├── local-only.ts           # local UI/preferences/cache tables
│   │   └── index.ts
│   ├── commands/                   # typed offline command queue payloads
│   ├── queries/                    # client-safe reactive query helpers
│   └── index.ts
└── package.json
```

This package can use PowerSync’s Drizzle driver, but it must not contain:

- Database credentials.
- PostgreSQL server client code.
- RLS policies/role administration.
- Server-only integration tokens.
- Raw Google provider payloads beyond explicitly allowed replicated fields.
- Audit/outbox implementation details.
- Administrative or cross-workspace tables.

The PowerSync integration proof of concept must validate exact schema-definition
reuse, supported Drizzle features, type exports, SQL dialect differences,
migrations, and generated query behavior before treating any shared schema
adapter as production-ready.[^12][^13]

## Migration Source of Truth

The earlier development-environment decision correctly warned against
maintaining two independently authored migration histories. The database tooling
choice resolves this:

> **Use Drizzle schema declarations to generate SQL; commit the generated SQL to
> `supabase/migrations/`; use Supabase CLI to apply and track those SQL files.**

```text
Drizzle schema change
  -> pnpm db:generate
  -> Drizzle generates SQL into temporary/staged output
  -> engineer reviews/edits SQL where necessary
  -> migration committed under supabase/migrations/<timestamp>_<name>.sql
  -> Supabase CLI applies same SQL locally/CI/staging/production
```

The exact script can move/rename the Drizzle output so it conforms to Supabase’s
timestamp migration convention. The implementation must ensure the SQL is
generated once and only once.

### Why Supabase CLI applies migrations

- It is already required for local Supabase lifecycle management.
- It maintains a standard, provider-aligned database migration workflow.
- It can reset local state, apply migrations, link remote projects, and deploy
  migration history.[^3][^14]
- It avoids having Drizzle migration history and Supabase migration history
  disagree.
- It makes RLS, SQL functions, extensions, Storage policy changes, and non-ORM
  SQL first-class migration content.
- The CLI now supports a declarative schema workflow (`supabase/schemas/` +
  `supabase db diff` via the `pg-delta` diff engine, currently alpha). That
  workflow is a valid alternative for SQL-first teams, but for Life OS the
  Drizzle TypeScript schema is the preferred canonical source because it also
  drives types and the PowerSync client schema.

### Why Drizzle still generates migrations

- It derives ordinary DDL changes from the TypeScript schema.
- It exposes schema diffs early in code review.
- It creates a typed database model for the application.
- It reduces handwritten schema boilerplate without hiding resulting SQL.

Drizzle Kit supports `generate` for SQL migration files and `migrate` for
applying them. In Life OS, `migrate` should be used only in isolated local
experiments or test containers if needed; **the normal applied-migration command
is Supabase CLI**, which owns the committed history.[^2]

### Migration commands

```bash
pnpm db:generate --name add-task-recurrence
pnpm db:lint-migrations
pnpm db:reset
pnpm db:status
pnpm db:push:staging
pnpm db:push:production
pnpm db:types
```

Required semantics:

| Command              | Action                                                                                 |
| :------------------- | :------------------------------------------------------------------------------------- |
| `db:generate`        | Generate Drizzle SQL diff and place a timestamped migration in `supabase/migrations`   |
| `db:lint-migrations` | Reject unsafe patterns and verify migration naming/order                               |
| `db:reset`           | Local only: reset Supabase, apply all migrations, seed synthetic data                  |
| `db:status`          | Report local/linked migration state without applying changes                           |
| `db:push:staging`    | CI-only, protected staging environment: Supabase CLI applies committed migrations      |
| `db:push:production` | CI-only, protected production release workflow: apply approved migration set           |
| `db:types`           | Generate database types from local database schema and fail if uncommitted diff exists |

## Migration Rules

### Prohibit `drizzle-kit push` outside disposable local experiments

Drizzle describes `push` as convenient for quickly testing local schema changes,
while `generate` and `migrate` provide committed migration files. For Life
OS:[^15]

```text
Permitted:     Scratch/local prototype database only
Forbidden:     Shared development, test, staging, production, or any database holding durable data
```

Every durable schema/RLS/function/extension/index change must be reviewed SQL
committed to `supabase/migrations`.

### Require reviewed SQL

Generated migrations are a starting point, not approval.

Review for:

- Correct table/column names and type changes.
- Intended defaults and nullability.
- `NOT NULL` changes that need staged backfill.
- Foreign key delete/update behavior.
- Concurrent index creation where needed.
- Locking/long-running operation risk.
- RLS enabled and policies defined for new workspace data.
- Correct function security: avoid unsafe `SECURITY DEFINER`; lock `search_path`
  when it is necessary.
- No broad grants to `anon`, `authenticated`, or `public`.
- No accidental data deletion or destructive rewrite.
- Reversibility/restore plan for production changes.
- Required PowerSync publication/replication configuration, after the sync
  category is validated.

### Migrations versus data backfills

Do not hide long-running data changes in schema migration SQL.

| Change                                            | Correct treatment                                                           |
| :------------------------------------------------ | :-------------------------------------------------------------------------- |
| Add nullable column/index                         | Reviewed schema migration                                                   |
| Populate a new derived field for millions of rows | Idempotent background backfill job, monitored separately                    |
| Change a column type                              | Expand/dual-write/backfill/contract sequence                                |
| Introduce a new RLS policy                        | SQL migration plus two-workspace authorization tests                        |
| Rebuild search vector projection                  | Background rebuild or controlled maintenance command                        |
| Migrate PowerSync-replicated data                 | Separate compatibility rollout validated against old mobile client versions |

This matches the CI/CD requirement that production changes follow
expansion–migration–contraction, particularly for offline devices that may run
older client builds for weeks.

## Raw SQL Policy

Drizzle is the normal query interface, but raw SQL is mandatory for some
PostgreSQL-specific features.

Use explicit, parameterized SQL for:

- RLS policies and privileges where Drizzle declarations cannot precisely
  express the requirement.
- Complex `WITH RECURSIVE` graph traversals.
- Materialized-view or projection refreshes where applicable.
- Full-text search ranking and trigram similarity.
- Advanced partial/expression/concurrent indexes.
- Advisory locks, if eventually justified.
- Bulk updates/inserts.
- Query-plan-sensitive planning projections.
- Postgres functions/triggers/extensions.
- `EXPLAIN (ANALYZE, BUFFERS)` diagnostics.

Rules:

- Raw SQL must be tagged/parameterized through the driver; never
  string-concatenate user input.
- Place complex queries in named modules with a query ID/comment and performance
  test where important.
- Keep raw SQL in the data layer; never in route handlers or UI packages.
- Add an integration test for every authorization-sensitive raw query.
- Explain why Drizzle query builder was not used in a concise code comment or
  ADR.

## Query and Transaction Design

Do not let Drizzle turn into generic repository boilerplate. Organize operations
around the domain:

```text
packages/database/src/queries/
├── tasks/
│   ├── create-task-command.ts
│   ├── complete-task-command.ts
│   ├── defer-task-command.ts
│   └── list-today-tasks.ts
├── planning/
│   └── load-daily-plan-projection.ts
├── calendar/
│   └── upsert-provider-event.ts
└── operations/
    ├── claim-outbox-events.ts
    └── enforce-idempotency.ts
```

Every command handler that changes graph state must run within a database
transaction and atomically:

1. Verify authorization and input.
2. Check/create idempotency record.
3. Modify authoritative state.
4. Insert audit/outbox records.
5. Commit.

The ORM does not enforce this architecture automatically; transaction boundaries
are an application-level discipline supported by Drizzle and PostgreSQL.

## Database Type Generation

Generate types for two different uses:

| Type source                      | Purpose                                                                | Policy                                                                             |
| :------------------------------- | :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| Drizzle inferred types           | Server query inputs/rows and internal persistence representation       | Use inside database/backend layers                                                 |
| Zod schemas in `packages/shared` | API/offline-command contract and runtime validation                    | Use at all external boundaries                                                     |
| Supabase-generated types         | Validation/inspection interoperability; direct Supabase SDK needs only | Generate and commit or verify in CI, but do not make the entire app depend on them |
| PowerSync/Drizzle types          | Mobile replica and reactive client queries                             | Keep in `packages/mobile-data`                                                     |

The Supabase CLI can generate TypeScript types directly from the database
schema. Use that output to catch drift and support any strictly scoped Supabase
client calls, but do not duplicate every Drizzle type into a third manual type
system.[^14]

**Never expose inferred database row types directly as public API payloads.**
Database rows include internal fields, soft-delete/audit metadata, integration
state, and evolving storage details. Map to Zod-validated API DTOs or command
results.

## Inspection and Administration

| Tool                      | Use                                                                       | Policy                                                    |
| :------------------------ | :------------------------------------------------------------------------ | :-------------------------------------------------------- |
| Supabase Studio           | Local and non-production browsing, SQL inspection, auth/storage diagnosis | Primary admin UI; production write access restricted      |
| Drizzle Studio            | Quick local schema/data inspection                                        | Optional, local only; never exposed over a network        |
| `psql`                    | Incident diagnosis, migration verification, query-plan work               | Controlled; production access audited and least privilege |
| Drizzle Kit introspection | Drift investigation / onboarding an existing schema                       | Never overwrites code automatically without review        |
| Supabase CLI              | Local lifecycle, migration application, type generation                   | Required operational tool                                 |

Drizzle Kit can generate SQL migrations, apply generated migrations, pull a
schema from a database, and provide Studio. Supabase CLI manages local
development, migrations, types, backups, and related project
operations.[^2][^14]

## Trade-Offs

| Choice                                   | Gain                                                                                 | Cost                                                                                                     |
| :--------------------------------------- | :----------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| Drizzle over Prisma                      | TypeScript schema is source of truth, PowerSync driver alignment, no `generate` step | Smaller ecosystem and more explicit advanced SQL; Prisma 7 has narrowed the bundle/performance gap       |
| Drizzle over Kysely                      | Schema + migration generation and Drizzle-to-PowerSync schema reuse                  | Less purely SQL-native query API; Kysely now has a PowerSync driver but still lacks migration generation |
| `postgres.js` over `pg`                  | Modern lightweight driver and good Drizzle path                                      | Smaller legacy integration ecosystem                                                                     |
| Drizzle schema plus Supabase-applied SQL | Typed declarations with one applied migration history                                | Requires a small generation/placement workflow                                                           |
| Generated SQL review                     | Visibility into operational database changes                                         | More deliberate than schema push                                                                         |
| Separate mobile-data schema              | Prevents server credential/structure leakage                                         | Requires explicit replication-model mapping                                                              |
| Raw SQL escape hatch                     | Full PostgreSQL capability                                                           | Requires security/performance review discipline                                                          |
| Drizzle-declared RLS                     | Versioned and reviewable policies                                                    | Must still be tested against Clerk/Supabase/PowerSync JWT reality                                        |

## Final Decision

Lock the following:

```text
Server ORM/query layer:        Drizzle ORM (^0.45.2 / latest 0.4x supported by @powersync/drizzle-driver)
Backend PostgreSQL driver:     postgres.js
Schema style:                  Drizzle TypeScript schema, organized by domain
Migration generation:          drizzle-kit generate (^0.31.10 / compatible 0.3x)
Applied migration history:     supabase/migrations as the sole committed/applied history
Migration application:         Supabase CLI in local/CI/staging/production
Schema push:                   Prohibited outside disposable local experiments
RLS/policies:                  Drizzle declaration where expressive; reviewed raw SQL where necessary
Database access boundary:      Backend/migration tools only; never web/mobile directly
Mobile local schema:           Separate packages/mobile-data, PowerSync official Drizzle driver
Public contracts:              Zod schemas, never direct database row types
Raw SQL:                       Permitted for advanced Postgres features, parameterized and tested
Inspection:                    Supabase Studio primary; Drizzle Studio local-only optional
Alternatives:                  Reject Prisma as primary; keep Kysely as fallback if PowerSync Drizzle PoC fails
```

The next category in the dependency order is **Authentication Provider**.
<span style="display:none">[^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32]</span>

<div align="center">⁂</div>

[^1]: https://orm.drizzle.team/docs/migrations

[^2]: https://orm.drizzle.team/docs/kit-overview

[^3]: https://supabase.com/docs/guides/deployment/database-migrations

[^4]:
    https://github.com/powersync-ja/powersync-js/blob/main/packages/drizzle-driver/README.md

[^5]: https://orm.drizzle.team/docs/get-started-postgresql

[^6]: https://kysely.dev/

[^7]: https://kysely.dev/docs/intro

[^8]: https://www.prisma.io/docs/prisma-orm/quickstart/postgresql

[^9]:
    https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production

[^10]:
    https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/postgres-js/README.md

[^11]: https://orm.drizzle.team/docs/rls

[^12]: 10-Risks-Gaps-and-Unresolved-Questions.md

[^13]: 07-Technical-Architecture-Fundamentals.md

[^14]: https://github.com/supabase/cli

[^15]: https://orm.drizzle.team/docs/get-started/postgresql-new

[^16]: https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0162

[^17]:
    https://dev.to/sameer_saleem/the-ultimate-guide-to-drizzle-orm-postgresql-2025-edition-22b

[^18]:
    https://v1.prisma.io/docs/1.34/datamodel-and-migrations/migrations-POSTGRES-asd4/

[^19]:
    https://www.prisma.io/docs/prisma-postgres/import-from-existing-database-postgresql

[^20]: https://classic.yarnpkg.com/en/package/@powersync/drizzle-driver

[^21]:
    https://docs.prisma.io/docs/v6/orm/prisma-migrate/workflows/data-migration

[^22]: https://github.com/drizzle-team/drizzle-orm/discussions/2624

[^23]: https://supabase.com/docs/reference/cli/introduction

[^24]: https://supabase.com/docs/guides/local-development/cli-workflows

[^25]: https://neon.com/docs/guides/rls-drizzle

[^26]: https://kysely.dev/docs/migrations

[^27]: https://docs.native.express/database/schema-migration

[^28]: https://supabase-supabase.mintlify.app/cli/migrations

[^29]: https://supabase.com/docs/guides/platform/migrating-within-supabase

[^30]: https://gist.github.com/ikupenov/26f3775821c05f17b6f8b7a037fb2c7a

[^31]: https://github.com/rphlmr/drizzle-supabase-rls

[^32]:
    https://dev.to/stacknotice/kysely-type-safe-sql-query-builder-for-nodejs-2026-2kmj

[^33]: https://www.npmjs.com/package/@powersync/drizzle-driver

[^34]: https://www.prisma.io/blog/announcing-prisma-orm-7-0-0

[^35]: https://docs.powersync.com/client-sdks/orms/js/kysely
