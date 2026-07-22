# 12. Development Practices

The quality and coherence of Life OS depend not only on architectural decisions
but on the daily habits of the team that builds it. This section defines the
development practices—the rules, workflows, and tools—that ensure the codebase
remains healthy, the team productive, and the product trustworthy as it grows
from MVP to full personal operating system.

---

## 12.1 Code Organization & Monorepo Governance

### Workspace Structure

All code lives in the pnpm monorepo described in Section 9. The separation
between `apps/` and `packages/` is strictly enforced:

- **`apps/`** contain runnable applications (mobile, web, backend). They are
  deployment targets and may depend on any package.
- **`packages/`** contain reusable libraries. They cannot depend on any `apps/`
  package, nor can they have circular dependencies among themselves.
  Dependencies are declared explicitly in each `package.json`.

### Dependency Consistency

Shared dependencies (React, React Native, Drizzle, Zod, etc.) are kept at a
single version across all workspaces. The **syncpack** tool is configured to
enforce this:

- `syncpack list-mismatches` runs in CI and fails if any workspace uses a
  different version of a shared dependency.
- `syncpack fix-mismatches` can be run locally to automatically align versions.

### Module Boundaries

The **dependency-cruiser** tool is configured with rules that forbid:

- Packages importing from `apps/`.
- Direct imports between `apps/` (they must communicate through the API or
  shared packages).
- Backend code (database, integrations) being imported into frontend packages.
  These rules are verified in CI; violations block merging.

### Internal Package Versioning

While the packages are not published to npm, **Changesets** are configured for
future use if the design system or API client are eventually shared externally.
For now, packages reference each other via `workspace:*` and do not carry
independent version numbers beyond `0.0.0`.

---

## 12.2 Environment & Configuration Management

### Environment Variables

Every application (`mobile`, `web`, `backend`) has a typed environment schema
defined using `@t3-oss/env-core` and Zod. The schema is in a file named `env.ts`
within each app. It defines all required and optional variables, their types,
and validation rules (e.g., valid URLs, non‑empty strings). At startup, the
schema is parsed, and the application refuses to boot if required variables are
missing or invalid. This prevents runtime failures due to misconfiguration.

Shared environment variable names (e.g., `SUPABASE_URL`,
`CLERK_PUBLISHABLE_KEY`) are defined in `packages/config/env` to avoid
duplication.

### Secrets

Secrets (API keys, OAuth client secrets, database URLs) are **never** committed
to the repository. They are injected at build and runtime via:

- CI/CD secrets (GitHub Actions) for automated deployments.
- Local `.env` files (git‑ignored) for development.
- A secrets manager (Supabase Vault or Doppler) for production runtime.

An `.env.example` file with placeholder values is provided for each app,
documenting what is needed without exposing secrets.

### Shared Tooling Configurations

A single source of truth exists for each code‑quality tool, living in
`packages/config`:

- **TypeScript:** `tsconfig.base.json` with strict mode, path aliases, and
  composite builds. Each package extends it.
- **ESLint:** Flat config extending Next.js, Expo, and TypeScript recommended
  rules. Custom rules enforce module boundary constraints.
- **Prettier:** A single `prettier.config.mjs` with consistent formatting rules.
- **Jest/Vitest:** A base test configuration that can be extended per package.
  All tooling runs automatically on staged files via **lefthook** (or husky)
  pre‑commit hooks, ensuring that code entering the repository is consistently
  formatted and linted.

---

## 12.3 Development Workflow

### Branching Strategy

The team follows a **trunk‑based development** model:

- `main` is the protected, always‑deployable branch.
- All changes are made on short‑lived feature branches prefixed with `feature/`,
  `fix/`, or `chore/`.
- Pull requests are required for merging into `main`. Each PR triggers a full CI
  run (lint, type‑check, unit tests, integration tests).
- Code review by at least one other developer is mandatory before merging.

### Commit Conventions

Commit messages follow the **Conventional Commits** format (`feat:`, `fix:`,
`chore:`, `docs:`, `test:`). This produces a clear, machine‑readable history and
will be used to automate changelog generation if needed.

### Local Development

A single command, `pnpm dev`, starts all necessary services:

- The web and mobile development servers.
- The backend (Hono) in watch mode.
- Local Supabase (via `supabase start`).
- Local Meilisearch (if configured, via Docker Compose).

Developers do not need to manually coordinate multiple terminals or processes.

### Database Migrations

Migrations are generated with `drizzle-kit generate` and committed to the
repository. They are applied automatically when the backend starts or can be run
manually via `pnpm --filter database migrate:dev`. A migration history table
tracks which migrations have been applied, ensuring consistency. Destructive
changes (dropping tables or columns) are reviewed with extra scrutiny and must
include a rollback plan in the PR description.

### Seeding

A seed script (`tooling/scripts/seed.ts`) populates the database with realistic
demo data. It creates a “founder persona” with projects, tasks, calendar events,
contacts, and sample notes. Seeds are used for:

- Local development (avoiding the blank canvas).
- Demo environments for user testing.
- E2E test setup (ensuring tests run against predictable data). The seed script
  is idempotent and can be run repeatedly.

---

## 12.4 Testing Culture & Quality Gates

### The Testing Pyramid

The team invests in a layered testing strategy, as detailed in Section 9.5:

- **Unit tests** (Vitest) are written for all shared logic—the calendar engine,
  validation schemas, utility functions. They run in milliseconds and are
  executed on every push.
- **Integration tests** (Vitest + Supertest) verify API endpoints, database
  interactions, and RLS policies against a real test database. They are run in
  CI on every PR.
- **End‑to‑end tests** (Playwright for web, Detox/Maestro for mobile) cover the
  most critical user journeys: sign‑up, calendar connection, plan creation, and
  review. They run nightly and on release candidates.
- **Visual regression tests** (Chromatic) guard the design system against
  accidental UI breakage.

### Test Ownership

Every feature branch is expected to include appropriate tests. The PR template
includes a checklist reminding authors to consider what tests are needed. Code
review explicitly considers test coverage and quality.

### CI Enforcement

The CI pipeline (`ci.yml`) runs the following steps in order, failing fast on
any error:

1. Lint (ESLint + Prettier check)
2. Type‑check (TypeScript across all packages)
3. Unit tests
4. Integration tests (requires a test database) If any step fails, the PR cannot
   be merged.

### Test Data Hygiene

Tests never depend on shared mutable state. Each test suite provisions its own
test data (or uses seeded data in a known state) and cleans up after itself.
Real user data is never used in testing.

---

## 12.5 Feature Flags & Progressive Rollout

Life OS will add modules (Finance, Health, etc.) over time. To ship continuously
without overwhelming users or destabilizing the core experience, a **feature
flag system** is employed from the start.

- **Simple flags** are implemented as environment variables or a configuration
  object in the backend, exposed via an API endpoint. The UI queries these flags
  on load and conditionally renders features.
- **User‑scoped flags** allow specific users (beta testers, internal team) to
  see features before general availability. This is achieved with a minimal
  database table (`feature_flags`) that maps user IDs to enabled features.
- All new, non‑trivial modules are introduced behind a flag. The flag is toggled
  on for the development team, then for a beta group, and finally for all users
  once validated.
- Flags are short‑lived. Once a feature is fully launched and stable, the flag
  and its associated conditional code are removed in a cleanup PR, preventing
  flag‑rot and code complexity accumulation.

---

## 12.6 Contributor Onboarding

A new developer should be able to go from cloning the repository to a running
local environment in under 15 minutes. The following mechanisms ensure this:

### Bootstrap Script

A single shell script (`tooling/scripts/bootstrap.sh`) performs all setup:

1. Installs Node.js dependencies (`pnpm install`).
2. Checks for required tools (pnpm, Supabase CLI, Docker if using containers)
   and provides installation instructions if missing.
3. Copies `.env.example` files to `.env` and prompts the developer to fill in
   required secrets (with links to the team’s shared credentials vault).
4. Starts the local Supabase stack.
5. Runs database migrations and seeds.
6. Prints a success message with `pnpm dev` instructions.

### Docker Compose (Optional)

For developers who prefer containerized environments,
`tooling/docker-compose.yml` provides a full local stack: PostgreSQL with
Supabase extensions, Meilisearch, and Mailpit. The Compose file is maintained
alongside the application and tested in CI.

### Dev Containers

A `.devcontainer.json` configuration is included for VS Code users, defining the
correct Node version, extensions (ESLint, Prettier, Tailwind, etc.), and
post‑create commands. This guarantees that all developers have an identical
environment regardless of their host OS.

### Team Documentation

An internal `CONTRIBUTING.md` file at the repository root explains the monorepo
structure, development workflow, testing expectations, and how to find help. A
`docs/` directory holds more detailed guides (e.g., “How to add a new
integration,” “Calendar engine internals”).

---

## 12.7 Documentation Standards

Code tells what; documentation tells why. The team maintains the following
documentation artifacts:

- **README.md** – High‑level project overview, getting‑started link, links to
  deeper docs.
- **docs/architecture/** – Architectural Decision Records (ADRs) for significant
  choices (e.g., “ADR-001: Why PowerSync over ElectricSQL”). Each ADR is a short
  document describing the context, decision, and consequences.
- **docs/api/** – API documentation, either auto‑generated from an OpenAPI spec
  or written manually if using tRPC.
- **Code comments** – Used sparingly to explain non‑obvious logic. Public
  functions in shared packages are documented with JSDoc for editor
  IntelliSense.
- **PR descriptions** – Required to include context, what changed, how to test,
  and any deployment or migration considerations.

Documentation is treated as a living artifact, updated in the same PR as code
changes. A “docs” review is part of the PR template.

---

## 12.8 Continuous Improvement

The development practices themselves are subject to iteration. Every two weeks,
in a short retrospective, the team evaluates:

- What slowed us down? (flaky tests, unclear PR feedback, CI delays)
- What risks went uncaught? (bugs that reached users, security issues)
- What can be automated that is currently manual?

Improvements are prioritized and added to the backlog. The goal is a development
environment that becomes faster, more reliable, and more pleasant over time,
matching the calm, efficient experience the product itself promises to its
users.

---

These practices form the social and technical contract of the Life OS
development team. They are not rigid commandments but a living framework,
designed to support rapid, high‑quality iteration while never losing sight of
the product’s ultimate purpose: to be a tool people trust with their entire
lives.
