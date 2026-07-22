# 9. Repository Structure & Tooling

## 9.1 Monorepo Framework

The entire Life OS codebase resides in a single **pnpm Workspaces** monorepo.
This structure allows all applications (web, mobile, backend) and shared
packages to live side by side, sharing code, types, and configurations without
the overhead of published npm packages.

**pnpm** was chosen for its strict dependency resolution, the `workspace:*`
protocol for internal linking, and fast, disk-efficient installs. It enforces
that packages can only import from their declared dependencies, preventing
accidental cross-contamination.

**Turborepo** is available for task orchestration—caching build outputs,
parallelizing linting and testing, and managing the dependency graph. It will be
introduced when the number of packages and build times warrant it; the MVP can
run directly on pnpm workspaces with simple root scripts.

Key root configuration files:

- `pnpm-workspace.yaml` — defines the workspace packages (`apps/*`,
  `packages/*`)
- `turbo.json` — pipeline definitions for build, lint, test, and deploy
- `package.json` — root scripts: `dev`, `build`, `lint`, `test`, `clean`

---

## 9.2 Directory Layout

```
life-os/
├── apps/
│   ├── mobile/                # Expo / React Native (capture & execution)
│   ├── web/                   # Next.js App Router (planning & administration)
│   └── backend/               # Node.js + Hono (API, jobs, webhooks)
├── packages/
│   ├── shared/                # Pure TypeScript types, constants, Zod schemas
│   ├── database/              # Drizzle ORM schemas, migrations, client factory
│   ├── calendar-engine/       # Capacity-aware planning algorithm
│   ├── ui/                    # Tamagui-based cross-platform component library
│   ├── config/                # Shared TSConfig, ESLint, Prettier, Jest base configs
│   ├── auth/                  # Clerk helper utilities for both apps
│   ├── api-client/            # Typed fetch wrapper (or tRPC client)
│   ├── integrations/          # External service adapters (Google Calendar, future Plaid, etc.)
│   └── storage/               # Object storage abstraction
├── tooling/
│   ├── scripts/               # Bootstrap, seed, migration helpers
│   └── docker-compose.yml     # Local Supabase, Meilisearch, Mailpit
├── .github/
│   └── workflows/             # CI/CD definitions
├── .gitignore
├── .dockerignore
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

### 9.2.1 Applications (`apps/`)

- **`apps/mobile`** – The Expo application, optimized for capture and execution.
  Uses Expo Router for navigation, Tamagui for UI, PowerSync for offline‑first
  data, and Expo EAS for builds and distribution.
- **`apps/web`** – The Next.js application, optimized for planning and
  administration. Uses the App Router, Tamagui for consistency with mobile, and
  Supabase Realtime or SSE for live updates.
- **`apps/backend`** – The modular monolith backend. Uses Hono as the HTTP
  framework, hosts Inngest job handlers, and houses domain modules for tasks,
  calendar, projects, notes, and future domains.

### 9.2.2 Shared Packages (`packages/`)

- **`packages/shared`** – Pure TypeScript: types, constants, enums, and Zod
  validation schemas shared across all apps. Contains no React or Node‑specific
  dependencies.
- **`packages/database`** – Drizzle ORM schema definitions, migration files
  (`drizzle/migrations/`), and a reusable database client factory. Organized
  into `open-zone/` and `vault-zone/` subdirectories. Also defines the outbox
  and audit log tables.
- **`packages/calendar-engine`** – The capacity‑aware planning algorithm as a
  pure function. Consumes tasks, events, and user preferences; produces plan
  outputs. Heavily unit‑tested with edge‑case scenarios.
- **`packages/ui`** – The shared cross‑platform component library built with
  Tamagui. Contains primitives (`Box`, `Text`, `Button`, `Input`) and design
  tokens (colors, spacing, typography). Complex components (Timeline,
  CommandBar) are built natively per platform but share logic via hooks from
  this package.
- **`packages/config`** – Shared tool configurations: `tsconfig.base.json`,
  `eslint.config.mjs`, `prettier.config.mjs`, `jest.config.base.ts`. Each app
  and package extends these.
- **`packages/auth`** – Abstraction over the auth provider (Clerk). Exports
  helper functions for server‑side session verification, client‑side user hooks,
  and middleware.
- **`packages/api-client`** – The typed API contract between backend and
  frontends. If using tRPC, this contains the router type and client setup. If
  using REST, it exports a typed fetch client generated from an OpenAPI spec.
- **`packages/integrations`** – Adapters for external services. Each integration
  (e.g., `google-calendar/`) contains OAuth flows, sync logic, webhook handlers,
  and data mapping. Isolated to allow independent testing and replacement.
- **`packages/storage`** – Abstraction over object storage (Supabase Storage,
  Cloudflare R2) for file uploads and attachments.

---

## 9.3 Development Environment

### Local Setup

A single bootstrap script (`tooling/scripts/bootstrap.sh`) sets up the entire
development environment:

1. Installs dependencies (`pnpm install`)
2. Copies `.env.example` files to `.env` (with guidance to fill in API keys)
3. Starts Supabase local stack (`supabase start` — provides PostgreSQL, Auth,
   Storage)
4. Runs database migrations (`pnpm --filter database migrate:dev`)
5. Seeds development data (`pnpm --filter database seed`)
6. Starts all apps in dev mode (`pnpm dev`)

### Containerized Option

A `docker-compose.yml` in `tooling/` provides an alternative for teams that
prefer containerization:

- PostgreSQL (with Supabase extensions)
- Meilisearch (for future search development)
- Mailpit (for email testing)
- The Supabase CLI is still used for Auth and Storage emulation

### Dev Containers

A `.devcontainer.json` configuration is provided for VS Code users, ensuring
identical tooling, Node version, and extensions across all contributors. This
eliminates “works on my machine” issues.

### Environment Variables

Every app (`mobile`, `web`, `backend`) has a Zod‑validated environment schema
using `@t3-oss/env-core`. Shared variables (e.g., Supabase URL) are defined once
in `packages/config/env` and imported by each app. This ensures that missing or
malformed variables are caught at startup, not at runtime.

---

## 9.4 CI/CD Pipeline

All automation runs on **GitHub Actions**.

| Workflow            | Trigger                        | Actions                                                                             |
| ------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `ci.yml`            | Every PR and push to `main`    | Lint, type-check, unit tests, integration tests, build                              |
| `deploy-web.yml`    | Push to `main`                 | Deploy to Vercel (production); preview deployments per branch                       |
| `deploy-mobile.yml` | Push to `main`, manual trigger | Build development and production Expo apps via EAS, submit to TestFlight/Play Store |

### Web Deployment

The Next.js application is deployed to **Vercel**, with automatic preview
environments for every pull request. Production deployments are gated on passing
CI.

### Mobile Distribution

Mobile builds and submissions are handled by **Expo EAS**. The CI pipeline
triggers EAS builds for internal testing (ad hoc) and production store
submission. Over‑the‑air updates (EAS Update) are used for non‑native JavaScript
changes.

### Backend Deployment

The Hono backend is containerized and deployed to a **Node.js‑compatible
platform** (initially Railway, Fly.io, or Render). It can also be hosted as a
long‑running server on a VPS. The deployment process builds a Docker image, runs
migrations, and rolls out the new instance with health‑check verification.

---

## 9.5 Testing Strategy & Tooling

A comprehensive testing pyramid is enforced from day one.

| Layer                 | Tool                                                    | Scope                                                                                                                 |
| --------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Unit**              | Vitest                                                  | All shared packages: `calendar-engine`, `shared`, `database` helpers, `auth` utilities                                |
| **Integration**       | Vitest + Supertest                                      | Backend API routes with a real test database (RSL enabled, migrations applied). OAuth flows tested with mock servers. |
| **E2E (Web)**         | Playwright                                              | Critical user journeys: onboarding, calendar connection, daily plan creation, weekly review                           |
| **E2E (Mobile)**      | Detox or Maestro                                        | Core mobile flows: quick capture, task completion, offline sync, plan adjustment                                      |
| **Visual Regression** | Chromatic (web components), device screenshots (mobile) | The `packages/ui` component library; platform‑specific snapshot tests for the Timeline and CommandBar                 |

All tests run in CI. Unit and integration tests are required to pass before
merging. E2E tests run on a nightly schedule and on release candidates. Visual
regression tests are diffed against approved baselines.

---

## 9.6 Observability

### Error Monitoring

**Sentry** is integrated into all three apps (web, mobile, backend). Source maps
are uploaded for production builds to enable readable stack traces. Alerts are
configured for critical error rate thresholds.

### Product Analytics

**PostHog** tracks product usage with strict privacy controls:

- Auto‑capture is **disabled** entirely.
- Only explicitly defined events are tracked (`plan_created`, `task_completed`,
  `weekly_review_started`, etc.).
- Event payloads are validated with Zod schemas before being sent; no free‑form
  user content is included.
- Users must opt in to analytics; it is off by default for EU users.

### Backend Logging

Structured JSON logs are generated by **Pino** and shipped to a log aggregator
(Axiom, Logtail, or self‑hosted Grafana Loki). A custom serializer redacts all
fields tagged as sensitive (titles, descriptions, note bodies) before they leave
the server.

### Health & Uptime

A `/health` endpoint in the backend reports database connectivity and sync
status. This endpoint is monitored by UptimeRobot or Sentry Cron Monitoring,
alerting the team to downtime or degraded service.

---

## 9.7 Code Quality & Consistency

- **TypeScript:** Strict mode, with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` where feasible.
- **ESLint:** Flat config extending `eslint-config-next`, `eslint-config-expo`,
  and `@typescript-eslint`. Custom rules enforce module boundaries (no importing
  backend code from mobile).
- **Prettier:** Single configuration for all files, integrated with ESLint to
  avoid conflicts.
- **Spell check:** `cspell` for code and documentation.
- **Git hooks:** `lefthook` (or `husky`) runs linting, type checking, and commit
  message validation pre‑commit.

---

## 9.8 Database Tooling

### Migrations

`drizzle-kit` generates and applies SQL migration files stored in
`packages/database/migrations/`. Migrations are run automatically as part of the
backend deployment process and can be run manually in development via
`pnpm --filter database migrate:dev`.

### Seeding

A seed script (`tooling/scripts/seed.ts`) populates the database with realistic
demo data: a founder persona with projects, tasks, calendar events, and
contacts. This is used for:

- Local development and testing
- Demo environments for user testing and investor presentations
- E2E test data reset

### RLS Testing

Integration tests explicitly verify that Row Level Security policies are
enforced. A test suite creates records through one user’s session and asserts
they are invisible to another user’s session, covering every policy.

---

## 9.9 Billing

**Stripe** handles all payments. The integration uses:

- **Stripe Checkout** for subscription sign‑ups.
- **Stripe Customer Portal** for users to manage their billing details and
  cancel subscriptions.
- **Stripe Webhooks** to provision and revoke access based on payment status.

Billing logic is isolated in the backend’s `billing` module, and pricing tiers
are system‑wide—not per module—to preserve the unified “one tool” experience.

---

## 9.10 Feature Flags

A lightweight feature flag system (initially environment variables, later a
service like **Flagsmith** if needed) controls the rollout of new modules. The
UI queries feature flags on load and only shows domains that are enabled for the
current user. This enables:

- Gradual rollout of new modules (Finance, Health) to beta testers.
- A/B testing of UI changes.
- Instant kill‑switches for problematic features without a full deployment.

---

## 9.11 Dependency & Version Management

- **syncpack** (or `manypkg`) ensures that all packages use the same versions of
  shared dependencies (React, React Native, Drizzle, etc.), preventing version
  drift.
- **Renovate** (or Dependabot) automatically opens PRs for dependency updates,
  with CI verifying compatibility.
- **Changesets** are configured for versioning internal packages, should any
  ever be published externally (e.g., the design system or API client).

---

## 9.12 Security Tooling

- **Secret scanning:** `gitguardian` pre‑commit hook, plus GitHub’s native
  secret scanning.
- **Dependency audit:** `pnpm audit` run in CI; critical vulnerabilities block
  deployment.
- **License compliance:** `license-checker` ensures no copyleft licenses are
  accidentally introduced.
- **Environment encryption:** `.env` files are never committed. Secrets are
  injected via CI/CD environment variables.

---

This repository structure and tooling suite provides the foundation for rapid,
high‑quality development from the first line of code through the full personal
operating system vision. Every tool has been selected to support a team that
values speed, type safety, reliability, and above all, the trust of the people
whose lives will be managed by the software.
