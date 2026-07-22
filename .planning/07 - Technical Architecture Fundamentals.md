# 7. Technical Architecture Fundamentals

## Guiding Principles

The technical architecture of Life OS is shaped by three overarching principles that derive directly from the product vision:

1. **Start with a single coherent system, not a distributed one.** A personal operating system must feel like one application. The backend is a modular monolith, the frontends share a design system and state layer, and all components live in a single monorepo. Premature distribution into microservices is explicitly rejected until scale and team size demand it.

2. **Offline-first, not offline-capable.** The mobile experience—where quick capture and plan checking happen most often—must function immediately and completely without a network. The architecture treats local data as primary and sync as a background process, never a loading spinner.

3. **Privacy is structural, not cosmetic.** The system is designed so that the most sensitive data can eventually reside in a vault the server cannot read. Every architectural choice—from the database schema to the sync protocol to the logging pipeline—must respect this eventual boundary, even if the vault is not fully implemented in V1.

---

## Repository Architecture: TypeScript Monorepo

The entire codebase lives in a single **pnpm Workspaces** monorepo, orchestrated by **Turborepo** for task caching and parallel execution. The structure separates applications, shared packages, and tooling:

```
life-os/
  apps/
    mobile/          # Expo / React Native (capture & execution)
    web/             # Next.js App Router (planning & administration)
    backend/         # Node.js + Hono (API, jobs, webhooks)
  packages/
    shared/          # Pure TypeScript types, constants, Zod schemas
    database/        # Drizzle ORM schemas, migrations, client factory
    calendar-engine/ # Capacity-aware planning algorithm
    ui/              # Tamagui-based cross-platform component library
    config/          # Shared TSConfig, ESLint, Prettier, Jest base configs
    auth/            # Clerk helper utilities for both apps
    api-client/      # Typed fetch wrapper (or tRPC client)
    integrations/    # External service adapters (Google Calendar, future Plaid, etc.)
    storage/         # Object storage abstraction
  tooling/
    scripts/         # Bootstrap, seed, migration helpers
    docker-compose.yml  # Local Supabase, Meilisearch, Mailpit
```

**Key decisions:**
- **pnpm** for strict dependency management and the `workspace:*` protocol for internal linking.
- **Turborepo** can be introduced incrementally; the initial MVP may use only pnpm workspaces, adding Turborepo when build orchestration becomes valuable.
- Each package and app has its own `tsconfig.json` extending a base configuration from `packages/config`.

---

## Backend: Modular Monolith with Hono

The backend is a single Node.js service deployed as a **modular monolith**. It is organized into domain modules (`tasks`, `calendar`, `projects`, `notes`, etc.) that are independently developed but deployed as a unified application. This avoids the operational complexity of microservices while enforcing clean module boundaries that can be split later if necessary.

- **Runtime:** Node.js LTS.
- **HTTP Framework:** **Hono**—lightweight, compatible with Next.js Route Handlers for Inngest, and providing fast routing with native TypeScript support.
- **API Type Safety:** The API layer exposes either a tRPC router (end-to-end type safety) or a Zod-validated REST API with a generated typed fetch client. The decision is pending final evaluation of DX and future portability, but the architecture accommodates either by isolating the API contract in `packages/api-client`. The backend routes are defined in `apps/backend/src/modules/` and aggregated in the main Hono app.

Background jobs are handled by **Inngest** with its handler hosted within the backend (not coupled to Next.js) to avoid Vercel serverless timeout constraints for long-running work like calendar polling and plan recalculation.

---

## Web Frontend: Next.js (App Router)

The web application serves as the planning and administration interface. It runs on **Next.js** with the App Router, deployed to **Vercel**. Key characteristics:

- Server Components for data fetching where possible, with client components for interactive timeline and command bar.
- **Tamagui** for cross-platform styling consistency with the mobile app, leveraging Tamagui's web-optimized compilation.
- **Inngest** functions for any job triggered by web user actions, though the execution may be delegated to the backend Inngest handler.
- **Supabase Realtime** or **Server-Sent Events (SSE)** for live updates to the dashboard (task completion from mobile, plan changes). PowerSync is not used on web in V1.

---

## Mobile Frontend: Expo (React Native)

The mobile app is built with **Expo SDK 54+** and uses **Expo Router** for file-based navigation. It is the primary surface for capture, execution, and quick plan checks. Key architectural choices:

- **Tamagui** for the UI layer, providing near-StyleSheet runtime performance via its optimizing compiler.
- **PowerSync** with the Drizzle driver for offline-first data. The entire Open Zone of the Life Graph is synced to a local SQLite database. User interactions write to this local database; PowerSync handles bidirectional sync with the server.
- The **Infinite Timeline** and command bar are the two core UI surfaces, implemented with gesture-driven interactions (`react-native-gesture-handler`, `reanimated`).
- Development builds (not Expo Go) are required due to native modules (PowerSync, possible encryption libraries).

---

## Data Layer: PostgreSQL with Drizzle ORM

All persistent state lives in a single **PostgreSQL** database (version 15+), managed initially by **Supabase**. The ORM is **Drizzle** (stable release line, currently `^0.44.7`), chosen for its type safety, migration tooling, and direct compatibility with PowerSync's Drizzle driver.

- **Schema:** Defined in `packages/database/src/schema/`, organized into Open Zone and future Vault Zone directories. Migrations are generated with `drizzle-kit` and applied as part of CI/CD.
- **Row Level Security (RLS):** Policies are authored in SQL migration files to enforce workspace-scoped data access. These policies rely on the authenticated user's JWT claims (workspace ID, user ID), which are injected by Supabase from the Clerk session token.
- **Connection pooling:** Provided by Supabase's PgBouncer for production; local development uses the Supabase CLI.
- **Migrations and seeds:** A seed script populates development and demo environments with realistic scenario data.

---

## Authentication & Authorization: Clerk + Supabase RLS

The authentication provider is **Clerk**, selected for its developer experience, Expo SDK maturity, and built-in organization/workspace primitives. The architecture, however, is not locked to Clerk; an abstraction layer in `packages/auth` allows future migration to Supabase Auth if needed.

**How it works with Supabase:**
- The user authenticates via Clerk on web or mobile.
- The Clerk session token (JWT) is exchanged for or configured as the Supabase JWT. Clerk's official integration guide confirms that Clerk JWTs can be accepted by Supabase's RLS engine.
- Supabase validates the token, extracts the user ID and workspace claims, and enforces RLS policies.
- PowerSync uses the same JWT to authenticate its sync connection, ensuring the mobile client only receives rows the user is authorized to see. **This is a critical integration point that must be verified with a proof-of-concept before development proceeds**—if a direct Clerk JWT cannot be used by PowerSync, a token exchange endpoint will be introduced.

**Workspace scope:** In V1, each user has a single personal workspace. The `workspace_id` is embedded in the JWT claims. All API routes and RLS policies filter by this workspace. When future multi-workspace and collaboration features are added, Clerk's organization model can be mapped to shared workspaces.

---

## Offline-First Sync: PowerSync

**PowerSync** is the offline-first sync engine for the mobile application. It replicates the Open Zone of the PostgreSQL database to a local SQLite database on the device, applying RLS policies to ensure each user only receives their own data.

- **Integration:** The `@powersync/drizzle-driver` package allows the client-side schema to be derived from the same Drizzle table definitions used on the server, providing type safety across the stack.
- **Sync model:** PowerSync streams changes via a server-side WebSocket connection and applies them to the local SQLite database. Writes from the client are uploaded as an operation log and applied server-side, where business logic, validation, and cascading updates execute.
- **Vault Zone separation:** Tables containing sensitive data are marked `localOnly: true` in PowerSync, meaning their content never leaves the device. A companion sync table holds the same rows but with fields encrypted client-side. PowerSync syncs the encrypted rows as opaque blobs; the server cannot read them.
- **Conflict resolution:** The system uses a command-based model. Mutations from the mobile client are expressed as intent-preserving commands (`CompleteTaskCommand`, `RescheduleTaskCommand`, etc.) and applied optimistically. The server replays these commands within database transactions, using last-write-wins semantics with server-side validation for conflicts.

The web application does **not** use PowerSync in V1. It interacts with the server API directly and receives real-time updates through Supabase Realtime or SSE.

---

## Real-Time Updates

- **Mobile:** PowerSync provides its own continuous sync stream. No additional real-time infrastructure (Supabase Realtime, WebSockets) is required on mobile. The local SQLite database is the source of truth, and UI updates are driven by reactive queries against it.
- **Web:** The web dashboard subscribes to database changes via **Supabase Realtime** (which uses WebSockets) or a simple **SSE** endpoint. The decision depends on granularity: Supabase Realtime provides row-level subscription; SSE is simpler for coarse-grained “plan updated” events. Either approach is compatible with the architecture.

---

## Background Processing & Transactional Outbox

All side effects that must happen reliably after a state change—plan recalculation, search index updates, notification dispatch, calendar webhook processing—are driven by a **transactional outbox pattern** combined with **Inngest**.

- **Outbox table:** The `outbox_events` table resides in the same database as the application data. Any database transaction that needs to trigger side effects inserts an event row atomically. This guarantees that the event is never lost, even if the external job dispatch fails.
- **Inngest:** A background process (an Inngest function) polls the outbox table (or is triggered by a database webhook) and dispatches events to the appropriate handlers. Inngest provides retries, step-level error handling, and scheduling. Its code-hosting model means the handler runs inside the backend (Hono), not in a separate managed worker, giving full control over execution environment and cold starts.
- **Calendar sync jobs** (polling, webhook processing) and **plan projection recalculations** are implemented as Inngest functions. All are idempotent, using the `idempotency_keys` table to prevent duplicate processing.

---

## Universal Search

The command bar requires fast, typo-tolerant, cross-entity search. The architecture supports a dual strategy:

- **MVP:** PostgreSQL full-text search with the `pg_trgm` extension for fuzzy matching. This is sufficient for a single-user or small-user-base scenario and avoids operational overhead.
- **Long-term:** **Meilisearch** (MIT-licensed) provides instant, typo-tolerant, ranked search across all entity types. The Meilisearch index is populated by outbox events: whenever an entity is created, updated, or deleted, a job re-indexes the relevant document.

An abstraction layer in `apps/backend/src/search/` isolates the search implementation from the rest of the system. The command bar client calls a generic search endpoint; the backend routes to the active engine. This allows starting with PostgreSQL and upgrading to Meilisearch without frontend changes.

---

## External Integrations: Google Calendar (V1)

Google Calendar is the sole external integration in the MVP. It is read-only and treated as an authoritative source of external events. The integration architecture:

- **OAuth 2.0 with PKCE:** Authorization is performed with the minimum necessary scope (read-only calendar access). Refresh tokens are encrypted at rest on the server using server-managed keys.
- **Incremental sync:** The backend uses Google's `syncToken` mechanism to fetch only changes since the last successful sync. Each user's sync token is stored in `calendar_connections`.
- **Push notifications:** A webhook endpoint receives push notifications from Google when calendar data changes. However, Google's push notifications are not 100% reliable, so a **periodic polling fallback** (hourly, via an Inngest cron job) uses the same incremental sync mechanism.
- **Sync reliability:** A unique database constraint on `eventId` prevents duplicate events during sync races. Webhook subscriptions expire after 7 days; a scheduled job renews them.
- **Status visibility:** The UI displays a "last synced" timestamp and clear error states when credentials expire or permissions are revoked.

The integration logic lives in `packages/integrations/google-calendar` and is consumed by the backend. All sync operations are idempotent and use the transactional outbox pattern to trigger downstream plan updates.

---

## Privacy & Security Architecture

The architecture treats privacy as a structural property, not a set of add-on policies.

- **Encryption:** All data is encrypted in transit (TLS) and at rest (PostgreSQL encryption, object storage encryption). OAuth refresh tokens are encrypted with server-managed keys and stored in dedicated columns.
- **Row Level Security:** Every database query is scoped by RLS policies that enforce workspace and user isolation at the database level. Automated tests verify that RLS policies cannot be bypassed.
- **Least privilege:** Integration scopes are minimal (read-only calendar). Future integrations follow the same principle.
- **Dual-Zone data model:** As described in the Data Model section, the schema is partitioned into an Open Zone (server-processable) and a future Vault Zone (client-side encrypted). This separation is reflected in table placement, API route prefixes, and sync configuration from the start, even if the Vault is not yet populated.
- **Data scrubbing:** A middleware layer in the backend strips sensitive field values (titles, descriptions, note content) from all log output, error reports, and analytics payloads. PostHog's auto-capture is disabled; only explicitly defined events with sanitized payloads are tracked.
- **User data rights:** Account export and deletion are implemented as first-class features. Deletion uses a soft-delete and recovery period, followed by hard deletion and removal from backups.
- **Audit logs:** The `audit_logs` table records all sensitive operations (data access, deletions, permission changes, exports). It is append-only and immutable by application code.

---

## Cross-Platform UI: Tamagui

The shared UI layer is built with **Tamagui**, a cross-platform framework that compiles optimized styles for both React Native and web. Tamagui was chosen over NativeWind for its superior web parity and its optimizing compiler, which reduces the runtime cost of dynamic styles to near-StyleSheet levels in production.

- **Shared primitives:** A set of core components (`Box`, `Text`, `Button`, `Input`) are built with Tamagui in `packages/ui` and consumed by both the web and mobile apps.
- **Complex components:** The Infinite Timeline, command bar, and domain-specific workspaces are built natively per platform but share logic via hooks and state machines from `packages/shared`.
- **Design tokens:** Colors, spacing, typography scales, and radii are defined as a Tamagui theme and enforced across all components.
- **Testing:** Visual regression tests (e.g., Chromatic for web, device screenshots for mobile) ensure consistency across platforms.

---

## Observability, Testing & Deployment

### Observability
- **Error monitoring:** Sentry is integrated across web, mobile, and backend. Source maps are uploaded for all production builds.
- **Product analytics:** PostHog tracks only pre-defined, sanitized events (`plan_created`, `task_completed`, etc.). No auto-capture or session replay is enabled. All event payloads are validated with Zod schemas before being sent.
- **Backend logs:** Structured JSON logs via `pino` are shipped to a log aggregator (Axiom, Logtail, or self-hosted Grafana Loki). Sensitive fields are redacted by a custom serializer.
- **Health monitoring:** A dedicated health endpoint is polled by UptimeRobot or Sentry Cron monitoring.

### Testing Strategy
- **Unit tests:** Vitest for shared packages (`calendar-engine`, `shared`, `database` helpers).
- **Integration tests:** Vitest + Supertest for the backend, with a dedicated test database that has RLS policies enabled and migrations applied.
- **End-to-end tests:** Playwright for critical web flows (onboarding, daily plan creation, weekly review). Detox or Maestro for mobile capture and plan interaction.
- **Visual regression:** Chromatic for the UI component library; device screenshot comparison for mobile.
- **CI enforcement:** All tests run on pull requests via GitHub Actions. Type checking, linting, and formatting are enforced in the same pipeline.

### Deployment
- **Web:** Vercel, with preview deployments for each branch.
- **Mobile:** Expo EAS for development builds, TestFlight/Play Store beta distribution, and production submission.
- **Backend:** Initially deployed to a single VPS or platform-as-a-service (Railway, Fly.io, Render) as a Node.js process. Containerized for portability.
- **CI/CD:** GitHub Actions orchestrates builds, migrations, and deployments.

---

## Open Decisions & Future Flex Points

A small number of architectural decisions remain open pending further prototyping or product growth:

| Decision | Options | When to resolve |
|----------|---------|-----------------|
| API protocol | tRPC vs. Zod-validated REST with typed fetch | Before significant backend route implementation |
| Web real-time mechanism | Supabase Realtime vs. SSE | During web dashboard development |
| PowerSync + Clerk JWT integration | Direct vs. token exchange endpoint | Immediate proof-of-concept |
| Meilisearch deployment | Self-hosted vs. cloud | When PostgreSQL FTS is no longer sufficient |
| Vault key management | Password-derived keys, master password, recovery phrase | Before implementing any Vault Zone storage |

These decisions are intentionally deferred to avoid premature optimization, but the architecture is designed so that each can be resolved without structural refactoring.

---

This technical foundation provides the scaffolding for the MVP daily-planning loop and is engineered to grow seamlessly into the full personal operating system vision. Every technology choice has been validated against current ecosystem realities (as of mid-2026) and stress-tested against the product’s unique requirements for offline resilience, cross-platform consistency, and uncompromising privacy.