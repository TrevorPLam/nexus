# 8. Key Technical Decisions & Rationale

Every foundational technology choice in Life OS has been made by evaluating
alternatives against the product’s unique demands: an invisible super‑app
experience, offline‑first mobile execution, a unified Life Graph, strict privacy
guarantees, and a small team that must move fast. This section captures the
major decisions, the context in which they were made, the alternatives that were
considered, and the rationale that led to the final selection.

---

## 8.1 Language & Monorepo

### TypeScript (Strict)

**Decision:** The entire codebase—web, mobile, backend, and all shared
packages—is written in **TypeScript** with strict mode enabled.

**Rationale:**

- The product vision demands end‑to‑end type safety across the Life Graph, API
  boundaries, and UI components. A single typed language eliminates an entire
  class of integration bugs.
- The ecosystem (Next.js, Expo, Drizzle, tRPC or typed fetch, Zod) is
  overwhelmingly TypeScript‑first, making any alternative impractical.

### pnpm Workspaces + Turborepo

**Decision:** The repository is structured as a **pnpm Workspaces** monorepo,
with **Turborepo** available for task orchestration when needed.

**Rationale:**

- `pnpm` provides strict dependency isolation and the `workspace:*` protocol,
  preventing phantom dependencies and version drift.
- A monorepo allows shared types, the design system, the calendar engine, and
  the database schema to be consumed directly by all apps without publishing
  packages externally.
- **Turborepo** can be introduced incrementally; its caching and parallel
  execution will become valuable as the codebase grows, but it does not gate the
  MVP.

**Alternatives considered:** Nx (heavier, opinionated), Yarn Workspaces (less
strict than pnpm), polyrepo (coordination overhead). pnpm was chosen for its
speed, correctness, and widespread adoption in the TypeScript ecosystem.

---

## 8.2 Application Frameworks

### Web: Next.js (App Router)

**Decision:** The web application uses **Next.js** with the App Router, deployed
to Vercel.

**Rationale:**

- Server Components and streaming enable a fast, calm planning interface that
  can load calendar and task data without client‑side waterfalls.
- Next.js is the natural host for Inngest functions, and Vercel provides a
  seamless deployment pipeline.
- The brief originally specified Next.js, and no alternative offered a
  compelling reason to change.

### Mobile: Expo (React Native) with Expo Router

**Decision:** The mobile app is built with **Expo SDK 54+** and uses Expo Router
for file‑based navigation.

**Rationale:**

- Expo eliminates the complexity of bare React Native builds while providing
  access to all necessary native modules (secure storage, background sync,
  haptics).
- Expo Router brings the familiar Next.js‑style file‑based routing to mobile,
  reducing cognitive overhead for the team.
- **Development builds** (not Expo Go) are mandatory because offline‑first sync
  (PowerSync) and potential encryption libraries require native code.

### Backend: Node.js + Hono

**Decision:** The backend is a **Node.js LTS** service using the **Hono** web
framework, structured as a modular monolith.

**Rationale:**

- Hono is lightweight, fully typed, and can run both as a standalone server and
  as a Next.js Route Handler—flexibility that is essential for hosting Inngest
  functions.
- A modular monolith (domain folders inside a single deployable) avoids the
  operational burden of microservices while enforcing clean boundaries through
  code organization. If a domain later requires independent scaling, it can be
  extracted.
- Node.js unifies the language across the entire stack, allowing shared
  validation, utilities, and even the calendar engine to run on both server and
  mobile.

---

## 8.3 Data & Storage

### PostgreSQL (Supabase Managed)

**Decision:** All persistent data resides in a single **PostgreSQL 15+**
database, managed by **Supabase**.

**Rationale:**

- The Life Graph demands relational integrity, complex joins, and JSON
  flexibility—capabilities native to PostgreSQL and awkward in document
  databases.
- Supabase provides the database, authentication, real‑time subscriptions,
  object storage, and Row Level Security in a single platform, dramatically
  reducing infrastructure assembly.
- Supabase’s local CLI allows developers to run a full replica on their
  machines, ensuring parity between development and production.

### Drizzle ORM

**Decision:** Database access, schema definitions, and migrations use **Drizzle
ORM** (stable line).

**Rationale:**

- Drizzle provides full TypeScript type inference from SQL schemas, a direct
  match for the end‑to‑end type safety requirement.
- The `@powersync/drizzle-driver` package allows the same Drizzle schema to
  define both the server‑side PostgreSQL tables and the client‑side PowerSync
  SQLite tables—a unique integration that eliminates schema duplication.
- Drizzle’s migration tools are simple, file‑based, and integrate cleanly into
  CI/CD.

**Alternatives considered:** Prisma (heavier, different sync story), Kysely (no
built‑in migration workflow). Drizzle was the only ORM that simultaneously
satisfied type safety, migration management, and PowerSync compatibility.

---

## 8.4 Offline-First Sync: PowerSync

**Decision:** The mobile application uses **PowerSync** with the Drizzle driver
to synchronize the Open Zone of the Life Graph between the server’s PostgreSQL
database and a local SQLite database on the device.

**Rationale:**

- PowerSync is the **only viable offline‑first sync engine** for the stack.
  ElectricSQL’s 2025 rewrite removed automatic offline sync, WatermelonDB
  requires a custom sync backend and complex setup, and RxDB’s bundle size is
  difficult to justify.
- PowerSync’s `localOnly: true` flag provides a built‑in mechanism for the
  dual‑zone privacy model: sensitive tables are kept local while encrypted
  copies are synced.
- The Drizzle driver ensures that the same team, writing the same schema
  definitions, can target both the server and the mobile local database with
  full type safety.

**Critical verification:** The assumption that PowerSync can authenticate with a
Clerk‑issued JWT must be proven. If direct integration fails, a token‑exchange
endpoint will be added. This is the highest‑priority spike before mobile
development begins.

---

## 8.5 Authentication & Authorization

### Clerk (Primary) with Supabase RLS

**Decision:** User authentication is handled by **Clerk**, with Supabase Row
Level Security enforcing data access policies.

**Rationale:**

- Clerk provides polished, customizable UI components, first‑class Expo SDK
  support, and built‑in organization/workspace primitives that align with the
  product’s future multi‑workspace needs.
- Supabase’s documentation **confirms** that Clerk session tokens can be
  accepted by Supabase RLS, meaning the team can enjoy Clerk’s DX without
  sacrificing database‑level authorization.
- The `packages/auth` package abstracts the provider, allowing a future
  migration to Supabase Auth if cost or self‑hosting requirements change.

**Alternative considered:** Supabase Auth directly—simpler integration with RLS
but lacks Clerk’s organization model and pre‑built UI. The final architecture
supports either.

---

## 8.6 Background Processing

### Inngest + Transactional Outbox

**Decision:** Background jobs and event‑driven side effects are handled by
**Inngest**, with a **transactional outbox** table guaranteeing reliable event
delivery.

**Rationale:**

- Inngest was confirmed as the “2026 default” for TypeScript/Next.js backends.
  It supports event‑driven and scheduled jobs, step‑level retries, and a
  generous free tier.
- Crucially, Inngest runs code where you host it (in our Hono backend), not in
  managed workers. This avoids cold‑start latency and keeps all business logic
  under one deployment.
- The **outbox pattern** (writing events in the same database transaction as the
  state change) eliminates the dual‑write problem. A polling Inngest function
  reads the outbox and dispatches to the appropriate handlers. This pattern is
  battle‑tested and aligns with the audit log and search indexing requirements.

**Alternative considered:** Trigger.dev—strong for long‑running AI tasks but
introduces managed workers. Inngest’s hosting model and simplicity made it the
first choice.

---

## 8.7 Universal Search

### Long‑Term: Meilisearch; MVP Fallback: PostgreSQL FTS

**Decision:** The universal search backend will be **Meilisearch**, with
PostgreSQL full‑text search serving as an MVP fallback. An abstraction layer in
the backend isolates the search implementation.

**Rationale:**

- Meilisearch provides instant, typo‑tolerant, cross‑entity search with
  customizable ranking—exactly what the command bar requires.
- Its **MIT license** was decisive over Typesense’s GPL‑3, which would impose
  copyleft obligations if the engine is embedded or distributed.
- PostgreSQL FTS with `pg_trgm` is sufficient for the small user base of the
  MVP. Deferring Meilisearch reduces operational overhead until search quality
  becomes a competitive differentiator.

---

## 8.8 Cross‑Platform UI: Tamagui

**Decision:** The shared UI layer and design system are built with **Tamagui**.

**Rationale:**

- Tamagui’s optimizing compiler outputs near‑`StyleSheet` performance on React
  Native while providing true web rendering parity—a critical requirement for
  the Infinite Timeline, which must feel identical on both platforms.
- Its philosophy (similar to Radix UI/shadcn) and strong TypeScript support
  align with the team’s desire for a composable, typed component library.
- Performance benchmarks from 2026 confirm Tamagui reaches production‑level
  speeds, dispelling earlier concerns about runtime overhead.

**Alternative considered:** NativeWind—excellent for teams with deep Tailwind
expertise, but Tamagui’s web parity and compiler optimizations were judged more
valuable for the cross‑platform timeline UI.

---

## 8.9 Calendar Integration: Google Calendar

**Decision:** Google Calendar integration uses the official **`googleapis`**
Node.js library, OAuth 2.0 with PKCE, incremental sync tokens, push webhooks,
and a periodic polling fallback.

**Rationale:**

- The incremental sync pattern is a battle‑tested, documented approach used by
  Google, Microsoft, and Stripe. It minimizes API calls and sync latency.
- Push notifications provide near‑real‑time updates, but Google’s own
  documentation acknowledges they are not 100% reliable. The polling fallback
  (hourly) closes this gap.
- A unique database constraint on `eventId` prevents duplicate events during
  sync races, and webhook subscriptions are renewed before their 7‑day expiry.
- The entire integration is isolated in `packages/integrations/google-calendar`,
  making it testable and replaceable.

---

## 8.10 Privacy Vault: Dual‑Zone Architecture

**Decision:** The Life Graph is split into an **Open Zone** (server‑processable,
fully synced) and a **Vault Zone** (client‑side encrypted, server‑opaque). The
Vault is implemented later, but the schema, API, and sync configuration are
designed to accommodate it from day one.

**Rationale:**

- Storing health and financial data on a server the user cannot trust implicitly
  would violate the product’s core privacy promise.
- The dual‑zone model—using PowerSync’s `localOnly` tables for plaintext and
  companion sync tables for ciphertext—is **production‑validated** (Finsight,
  2026). It allows the server to sync encrypted blobs without ever possessing
  the decryption key.
- The encryption keys are stored in the device’s secure enclave (Expo
  SecureStore). Cross‑device key recovery (via password‑derived keys or a master
  password) will be designed before the Vault is implemented.

---

## 8.11 API Protocol (Open Decision)

**Decision:** The choice between **tRPC** (end‑to‑end type safety) and a
**Zod‑validated REST API** with a generated typed client is **deferred** pending
a final trade‑off analysis.

**Context:**

- tRPC provides seamless type inference from backend to frontend, eliminating
  manual contract maintenance. It works well with Next.js and Expo.
- However, the mobile app’s primary data operations flow through PowerSync, not
  direct API calls, reducing tRPC’s surface‑area advantage. A REST API with an
  OpenAPI spec and typed fetch client (`openapi-fetch`) offers equivalent type
  safety while remaining consumable by future non‑JavaScript clients.
- The architecture isolates the API contract in `packages/api-client` regardless
  of the chosen protocol, so the decision can be made after prototyping both
  approaches.

---

## 8.12 Summary of Decision Confidence

| Decision                                             | Confidence    | Notes                                                          |
| ---------------------------------------------------- | ------------- | -------------------------------------------------------------- |
| TypeScript, pnpm, Next.js, Expo, PostgreSQL, Drizzle | **Very High** | Aligned with brief and ecosystem; no credible alternatives     |
| PowerSync for offline sync                           | **Very High** | Only viable option after ElectricSQL rewrite                   |
| Clerk + Supabase RLS                                 | **High**      | Requires PowerSync JWT verification spike                      |
| Inngest + Transactional Outbox                       | **Very High** | Validated as 2026 default; outbox pattern is industry standard |
| Meilisearch (PG FTS fallback)                        | **Very High** | MIT license decisive; abstraction layer de‑risks MVP           |
| Tamagui for UI                                       | **High**      | Web parity and performance benchmarks validated                |
| Google Calendar sync strategy                        | **Very High** | Battle‑tested pattern; documented fallback plan                |
| Dual‑Zone Privacy Vault                              | **Very High** | Production‑validated; full implementation deferred             |
| API protocol (tRPC vs REST)                          | **Open**      | Prototype both; decision before heavy API development          |

Each of these decisions has been stress‑tested against the product’s unique
combination of constraints: a super‑app that must feel like one tool,
offline‑first mobile execution, a unified graph data model, and privacy as a
structural property. No choice was made in isolation; the stack is a coherent,
mutually reinforcing whole that can evolve as the product grows from
daily‑planning MVP to full personal operating system.
