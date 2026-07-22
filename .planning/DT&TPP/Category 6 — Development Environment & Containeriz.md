<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 6 — Development Environment \& Containerization

**Recommendation: make the Supabase CLI local stack the required development
database platform; standardize on a Docker-compatible container runtime; provide
a Dev Container as an optional, supported onboarding path; and use Docker
Compose only for supplementary local services that Supabase does not provide.**
This produces the closest safe approximation of production without forcing every
contributor to run the entire application inside containers.[^1][^2]

The project should **not** run its web, mobile, and backend development loops
exclusively through Docker Compose. Next.js, Expo/Metro, emulator/device
connectivity, native modules, file watching, and hot reload are more reliable
and faster when the applications run directly on the developer’s host or inside
an opt-in Dev Container, while Supabase and supporting services run in
containers.

## Core Principle

Separate the local environment into two layers:

```text
Developer workstation / Dev Container
  ├── pnpm, Node LTS, Git, Supabase CLI
  ├── Next.js dev server
  ├── Expo / Metro dev server
  ├── Hono backend dev server
  └── Vitest / Playwright / code-quality tooling

Docker-compatible container runtime
  ├── Supabase local stack
  │   ├── PostgreSQL
  │   ├── Auth emulator
  │   ├── Storage emulator
  │   ├── Studio and supporting Supabase services
  │   └── Realtime services
  ├── Mailpit
  └── Optional Meilisearch, only after it is selected
```

Supabase’s local development workflow runs a self-contained local stack,
including PostgreSQL, Auth, Storage, and related services; it requires the
Supabase CLI plus a Docker-API-compatible container runtime. That is materially
better than a plain PostgreSQL container because the MVP requires RLS behavior,
storage behavior, and eventual real-time compatibility in addition to relational
tables.[^1]

## What Must Be Reproducible

A new developer should be able to:

1. Clone the repository.
2. Install the pinned Node and pnpm versions.
3. Provide only local/test environment values.
4. Start a local Supabase stack with empty synthetic data.
5. Apply all migrations and seed a safe demo workspace.
6. Launch backend, web, and mobile development servers.
7. Run unit, integration, and end-to-end tests.
8. Reset everything to a known clean state without accessing staging or
   production.

The existing project plan correctly proposes a bootstrap script, local Supabase,
migrations, seed data, optional Docker Compose, and Dev Containers. The
distinction to retain is that **Supabase CLI is mandatory; Compose and Dev
Containers are supporting tools**.[^3]

## Container Runtime Options

| Option                             | Advantages                                                                                                                                                                                                        | Limitations                                                                                                                                                       | Decision                                                               |
| :--------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **Docker Desktop**                 | Broadest compatibility with Supabase CLI, Testcontainers, Dev Containers, VS Code tooling, and CI examples; free for individuals and small businesses (<250 employees / <$10M revenue); largest support ecosystem | Paid for larger organizations; heavier baseline RAM/CPU on macOS/Windows; slower cold start than OrbStack                                                         | **Recommended default for cross-platform teams**                       |
| **OrbStack**                       | Fastest startup (~2 s) and lowest memory footprint on Apple Silicon; near-native bind-mount performance; full Docker/Compose/Testcontainers compatibility; Rosetta x86 support                                    | macOS only; ~$8/user/mo for commercial use; closed source, single vendor                                                                                          | **Preferred macOS alternative when the license cost is acceptable**    |
| Rancher Desktop                    | Free/open-source (Apache 2.0); switchable containerd/dockerd engine; built-in k3s Kubernetes; good Windows WSL2 support                                                                                           | Heavy baseline when Kubernetes enabled (~8 GB), slow first boot; overkill without k8s; file-sharing slower than Docker Desktop/OrbStack                           | Supported alternative for Kubernetes-heavy developers                  |
| Podman Desktop                     | Free/Apache 2.0 at any scale; daemonless/rootless by default; Docker CLI shim; v1.20.x has near feature parity and includes AI Lab                                                                                | Compose/networking edge cases; Dev Containers require `podman compose` configuration; macOS file-sharing slower than OrbStack                                     | Supported alternative when open-source/rootless licensing is preferred |
| Colima                             | Free, lightweight Lima-based CLI for macOS/Linux                                                                                                                                                                  | Slower startup; CLI-only; more manual setup; higher team support burden                                                                                           | Optional advanced-user alternative                                     |
| Finch                              | Free, open-source AWS-curated bundle (Lima + containerd + nerdctl + BuildKit); cross-platform; ECR/Fargate-friendly                                                                                               | No GUI (beta desktop as of 2026); slower startup; weaker Kubernetes/Compose integration; newer ecosystem                                                          | Optional advanced-user alternative for AWS-aligned teams               |
| Apple Container Framework          | Native macOS runtime (one micro-VM per container); sub-second startup; Apple Silicon optimized                                                                                                                    | Requires macOS 26 for full support; macOS 15 has networking/compose limitations; no mature Docker-API/Compose/Dev Containers integration; Apple Silicon only[^38] | Reject for now; reassess in 2027                                       |
| Native services only               | Fastest and no containers                                                                                                                                                                                         | Cannot accurately reproduce the Supabase stack; environment drift becomes likely                                                                                  | Reject                                                                 |
| Remote shared development database | No local containers                                                                                                                                                                                               | Unsafe shared state, poor offline development, migration collisions, risk of production-like data misuse                                                          | Reject                                                                 |

Supabase officially supports Docker Desktop, Rancher Desktop, Podman, and
OrbStack as Docker-API-compatible runtimes for local development. Docker Desktop
remains the safest cross-platform default; OrbStack is the best macOS experience
when the team is willing to pay, and Podman Desktop is the strongest zero-cost
enterprise alternative.[^1][^34]

Podman can expose a Docker-compatible socket and run Docker tools and Compose
applications, but its compatibility layer may require configuration and is not
equally supported on every platform. When using Podman with Dev Containers, set
`dev.containers.dockerPath` to `podman` and ensure `podman compose` is available
on PATH.[^4]

## Local Database Options

| Option                               | Advantages                                                                                                                                                                                                      | Disadvantages                                                                                                           | Decision                                                                                    |
| :----------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **Supabase CLI local stack**         | Mirrors production Supabase services; local PostgreSQL, Auth, Storage, Studio, migrations, generated types, Edge Functions; validates RLS/JWT work; actively maintained (v2.x stable, v2.109.1 as of July 2026) | Requires a Docker-API-compatible container runtime and local resources; CLI major-version upgrades require coordination | **Select**                                                                                  |
| Docker Compose with plain PostgreSQL | Simple and controllable; lightweight if only SQL is needed                                                                                                                                                      | Misses Supabase Auth, Storage, Realtime behavior, and local Supabase workflow                                           | Reject as primary environment                                                               |
| Hosted Supabase development project  | Easy initial setup; no local container requirement                                                                                                                                                              | Network dependency, shared-state conflicts, potential quota/cost, risk of unsafe test data                              | Use only as shared staging, never as local default                                          |
| Neon / local Postgres                | Good PostgreSQL options                                                                                                                                                                                         | Does not validate Supabase-specific configuration, RLS claims/JWT flow, Storage, or local CLI workflow                  | Reject                                                                                      |
| SQLite only                          | Fast and useful for unit testing planning algorithms                                                                                                                                                            | Cannot validate PostgreSQL RLS, migrations, constraints, or production SQL semantics                                    | Use only where PowerSync/local-client behavior requires it; not server integration baseline |
| Supabase branch databases            | Useful preview/isolation capability                                                                                                                                                                             | Remote and potentially cost/complexity-heavy; not a substitute for local development                                    | Consider later for PR integration isolation                                                 |

The Supabase CLI (v2.x) can run the whole local stack, manage migrations,
generate database types, serve Edge Functions locally, and support CI workflows.
As of July 2026, `v2.109.1` is the latest stable release; the `v2.110.0-beta`
series should not be pinned for day-to-day development.[^5][^1]

## Recommended Local Workflow

### Required prerequisites

```text
Git
Node.js LTS, pinned in repository
Corepack-enabled pnpm, pinned in package.json
Docker Desktop or verified Docker-compatible runtime
Supabase CLI, installed as a dev dependency
Xcode / Android Studio only for developers working on native mobile builds
```

Install the Supabase CLI as a **repository dev dependency**, not only globally.
This pins the version expected by migrations and the local stack:

```bash
pnpm add -D supabase --allow-build=supabase
pnpm supabase --version
```

The Supabase documentation supports project-local CLI installation through
npm-compatible package managers, enabling invocation through the package runner.
For pnpm 10 and later, the `--allow-build=supabase` flag is required (or run
`pnpm approve-builds` after install) because postinstall scripts are blocked by
default; on older pnpm versions the flag can be omitted. A global installation
may be allowed for convenience, but repository scripts must use the pinned local
CLI.[^1][^39]

### Commands

Provide one obvious workflow:

```bash
pnpm bootstrap
pnpm dev
pnpm dev:web
pnpm dev:backend
pnpm dev:mobile
pnpm db:start
pnpm db:stop
pnpm db:reset
pnpm db:status
pnpm db:types
pnpm db:seed
pnpm test
pnpm test:integration
```

Suggested responsibilities:

| Command                 | Required behavior                                                                                                                                                     |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm bootstrap`        | Verify Node/pnpm/container runtime, install dependencies, copy non-secret templates, initialize/start Supabase if needed, apply migrations, seed local synthetic data |
| `pnpm dev`              | Ensure local dependencies are ready, then run web, backend, and Expo dev processes through Turbo                                                                      |
| `pnpm db:start`         | Run `pnpm supabase start`                                                                                                                                             |
| `pnpm db:reset`         | Destroy local database state, apply all migrations, rerun seed; never target remote environments                                                                      |
| `pnpm db:types`         | Generate database types from the local schema into a controlled generated file/package                                                                                |
| `pnpm db:seed`          | Seed only deterministic synthetic fixture data                                                                                                                        |
| `pnpm test:integration` | Start/use an isolated test database and run schema/RLS/API integration tests                                                                                          |

The bootstrap script must be **idempotent**: rerunning it should safely converge
on the intended state, not recreate destructive or duplicate resources.

## Local Network and Data Safety

Supabase explicitly cautions against exposing a local development stack
publicly. On untrusted networks, it recommends binding the Docker bridge to
`127.0.0.1` through a dedicated Docker network.[^1]

Lock these rules:

- Bind local databases, Supabase Studio, Mailpit, Meilisearch, and internal
  service ports to loopback only.
- Never use public tunnels to expose local Supabase Studio, PostgreSQL, Auth,
  Mailpit, or PowerSync endpoints.
- Do not use real user data, production exports, actual OAuth refresh tokens,
  customer emails, financial records, or health data locally.
- Seed only synthetic data with obvious non-real names and data markers.
- Use local/test OAuth clients and test accounts; never enable production Google
  Calendar permissions in local environments.
- Use Stripe test mode only; never use production Stripe keys locally.
- Use separate local/staging/production identifiers so a frontend cannot
  silently point to the wrong backend.
- Add a startup guard in backend and tooling that refuses to run destructive
  commands against a production host.

A minimal environment safety check should reject commands where:

```text
NODE_ENV=production
SUPABASE_URL points to a production domain
DATABASE_URL host is not localhost for local reset/seed commands
STRIPE_SECRET_KEY is a live key in local development
```

## Docker Compose: Narrow Role

### Do use Compose for supplemental services

Use `tooling/docker-compose.yml` only for services that are **not** part of the
Supabase local stack:

```text
tooling/
  docker-compose.yml
  docker-compose.override.example.yml
```

Initial required service:

| Service               | Purpose                                                                     | Required now?                                  |
| :-------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------- |
| Mailpit               | Inspect emails in local development/test without delivery to real addresses | Yes, once transactional mail is introduced     |
| Meilisearch           | Local search development                                                    | No — add only after PostgreSQL FTS is replaced |
| MinIO                 | S3-compatible object-storage testing if Cloudflare R2 is selected           | No — add only once R2 is selected              |
| Redis                 | Only if a future tool requires it                                           | No                                             |
| Backend app container | Production-like container smoke testing                                     | Optional later                                 |
| Web app container     | Production-like image testing                                               | Optional later                                 |

Do **not** duplicate PostgreSQL, Supabase Auth, Supabase Storage, or Supabase
Realtime in Compose. Supabase CLI owns those services; running replacements
creates confusing port collisions, divergent versions, and testing ambiguity.

Docker Compose’s development specification supports file watching with actions
such as `sync`, `rebuild`, `sync+restart`, `restart`, and `sync+exec` (the
latter two available from Docker Compose v2.32.0+), but that capability does not
justify containerizing the normal Next.js/Expo/Hono inner loop. Reconsider it
later only for a production-image smoke-test profile.[^6][^37]

## Dev Container Options

| Option                                                 | Advantages                                                                                                                                                                              | Disadvantages                                                                                                                                                         | Decision                                                              |
| :----------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Optional VS Code Dev Container / GitHub Codespaces** | Reproducible Node/pnpm/CLI/tool versions; easier onboarding; checked-in editor extensions/settings; same config powers cloud GitHub Codespaces; pre-built images reduce first-open time | Docker-in-Docker/socket configuration and mobile device tooling add complexity; non-VS Code users may not use it; macOS bind mounts can lag without volume strategies | **Select as supported, optional**                                     |
| Required Dev Container                                 | Maximum tool parity                                                                                                                                                                     | Poor fit for Expo simulators/emulators, device debugging, performance-sensitive file watching, and diverse workflows                                                  | Reject                                                                |
| Nix / devbox / devenv                                  | Excellent declarative reproducibility                                                                                                                                                   | Team learning curve and an additional ecosystem; weak benefit at current team size                                                                                    | Defer                                                                 |
| Volta / mise / asdf only                               | Pins language/tool versions well                                                                                                                                                        | Does not provide consistent OS packages, container runtime integration, or editor setup                                                                               | Use a lightweight version manager optionally, not as full environment |
| Manual README setup                                    | No implementation time                                                                                                                                                                  | Gradual environment drift and slow onboarding                                                                                                                         | Reject                                                                |

A Dev Container is defined by a checked-in `devcontainer.json`, allowing
contributors to get the same tools, extensions, and settings regardless of host
configuration. It should include Node LTS, Corepack, pnpm, Git, Supabase CLI,
Docker CLI client, and the recommended editor extensions — but **not** run the
Docker daemon inside the container. In 2026, the recommended practice is to
pre-build the dev container image (using the Dev Container CLI or a GitHub
Action) and reference it by tag, which dramatically reduces first-open time. Use
named volumes for `node_modules` on macOS and keep source inside the Linux
filesystem for Windows/WSL developers.[^7][^35]

### Dev Container policy

- Mount/use the host Docker socket only where this is acceptable under the
  team’s local security model.
- Document that Docker socket access effectively grants broad host-container
  control; do not present it as an innocuous permission.
- Keep the app source and dependency caches inside Linux filesystem paths for
  Windows/WSL developers; avoid working from `C:\` mounts because file watching
  and container I/O degrade. Microsoft specifically recommends cloning in the
  WSL filesystem for this setup.[^7]
- Support host-run Expo tooling for iOS simulator / Android emulator
  communication when Dev Container networking becomes awkward.
- Do not make mobile development contingent on Dev Container adoption.

## Testing Environment Strategy

### Unit tests

Run directly in the host/Dev Container process with Vitest. They should not
require Docker, network access, real OAuth, or a database.

Examples: planning engine, entity-link traversal utilities, date/capacity
calculations, Zod schemas, command reducers, data transformations.

### Integration tests

Use **Testcontainers for Node.js** for backend/database integration tests once
database access begins. This creates isolated, disposable PostgreSQL containers
per test suite or worker and prevents polluted developer databases or test-order
coupling. As of 2026, Testcontainers for Node.js is at v12.x;
`PostgreSqlContainer` supports `.withReuse()` for fast warm starts,
`.snapshot()` / `.restoreSnapshot()` for deterministic fixtures, and custom
database/username/password. Pin an image tag such as `postgres:16-alpine` to
avoid drift.[^8][^9][^36]

However, plain PostgreSQL Testcontainers alone does not fully reproduce Supabase
RLS/JWT configuration. Therefore use two integration levels:

| Test level                           | Infrastructure                                      | Validates                                                                  |
| :----------------------------------- | :-------------------------------------------------- | :------------------------------------------------------------------------- |
| Repository / transaction integration | PostgreSQL Testcontainer                            | SQL, constraints, Drizzle queries, migrations, transaction behavior        |
| Supabase authorization integration   | Local Supabase CLI stack or CI Supabase environment | RLS policies, JWT claims, Auth integration, Storage policy behavior        |
| PowerSync sync spike / E2E           | Dedicated Supabase + PowerSync test environment     | Clerk-token handoff, replication, offline command flows, conflict behavior |

Docker’s current Node guide confirms Testcontainers can create real PostgreSQL
containers for Node integration tests instead of relying on mocks.[^10][^11]

Do not run all database tests against a developer’s ordinary local Supabase
database. It produces non-determinism, accidental fixture coupling, slow resets,
and risks interference with interactive development.

### End-to-end tests

- **Web:** Playwright against a locally launched or staging environment using
  dedicated test identities and seeded state.
- **Mobile:** the selected Detox/Maestro tool against Expo development builds
  and a dedicated test backend/Supabase project.
- **OAuth:** mock at most flows that do not need provider behavior; validate
  Google OAuth and calendar sync using controlled test accounts in an isolated
  environment.
- **Do not** automate against personal calendars or a production account.

## Development Data

Provide one versioned seed package such as `packages/database/src/seed/`, with:

- One demo workspace.
- Multiple synthetic areas, projects, goals, tasks, recurring occurrences,
  calendar events, notes, contacts, entity links, reminders, and notifications.
- Planning edge cases: completely booked day, unscheduled task pool, deadlines,
  recurrence, deferral, split tasks, conflict scenarios, empty calendar,
  imported calendar duplicates.
- Explicit fixture labels, such as `demo+lifeos@example.test`.
- No personally identifying data and no content copied from user interviews.

Make fixture creation deterministic through a seed value or stable IDs. It must
be possible for a Playwright or mobile E2E test to request a known fixture state
without relying on a human-created workspace.

## Production-Like Containers

Containerize the **backend** from the beginning because the final backend host
is intentionally not yet selected. This supports portability between Railway,
Fly.io, Render, and a VPS.[^12][^13]

Use a multi-stage, non-root production Dockerfile:

```text
Builder stage:
  install frozen dependencies
  build only backend and its required workspace dependencies

Runtime stage:
  minimal Node LTS image
  non-root user
  production dependencies / compiled output only
  no .env files
  read-only filesystem where host permits
  health endpoint
```

Do not require local developers to run that image for normal edits. Instead,
include an optional `pnpm docker:backend:smoke` command that builds it and runs
a basic health check before a release.

## Recommended Files

```text
life-os/
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
├── apps/
│   └── backend/
│       └── Dockerfile
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql                  # or a controlled seed script
├── tooling/
│   ├── docker-compose.yml        # Mailpit now; optional future services
│   ├── scripts/
│   │   ├── bootstrap.mjs
│   │   ├── doctor.mjs
│   │   ├── db-reset.mjs
│   │   └── seed.mjs
│   └── README.md
├── .env.example
├── apps/backend/.env.example
├── apps/web/.env.example
└── apps/mobile/.env.example
```

Use `supabase/migrations/` as the authoritative schema-migration location if
relying on Supabase CLI migrations. Drizzle can still define schemas and
generate/coordinate SQL, but **do not maintain two independently authored
migration histories**. Pick one migration source of truth during the
database/ORM research phase.

## Trade-Offs

| Choice                                 | Gain                                                               | Cost                                                           |
| :------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------- |
| Supabase CLI local stack               | High production fidelity for database/Auth/Storage/RLS work        | Container runtime and local resource use                       |
| Docker Desktop baseline                | Broadest tool compatibility and lowest onboarding friction         | Resource footprint and potential commercial licensing at scale |
| OrbStack (macOS)                       | Fastest Apple Silicon container experience                         | macOS-only and paid for commercial use                         |
| Podman Desktop baseline                | Zero licensing cost, daemonless/rootless security                  | Edge-case incompatibilities with Docker-centric tools          |
| Host-run app dev servers               | Fast HMR, reliable Expo device/emulator integration                | Requires host Node toolchain unless using Dev Container        |
| Optional Dev Container                 | Reproducible onboarding without blocking advanced/mobile workflows | Additional configuration and Docker socket considerations      |
| Compose only for supplemental services | Clear ownership and avoids duplicate local infrastructure          | A few separate commands/concepts                               |
| Testcontainers for DB tests            | Isolated, realistic SQL tests                                      | Docker requirement and startup time                            |
| Separate Supabase RLS tests            | Validates actual authorization design                              | More test-environment setup                                    |
| Synthetic seeded data                  | Privacy and deterministic tests                                    | Fixture design/maintenance work                                |

## Final Decision

Lock this development-environment model:

```text
Required database/service emulator:  Supabase CLI local stack (v2.x stable, pinned)
Container-runtime baseline:          Docker Desktop (free below 250 employees / $10M revenue)
Supported alternatives:              OrbStack (preferred on macOS), Rancher Desktop, Podman Desktop; Colima/Finch for advanced users; validate non-Docker runtimes before adding to onboarding docs
Application dev servers:             Run directly on host or optional Dev Container
Docker Compose role:                 Supplemental services only; no duplicate Postgres/Supabase stack
Dev Container:                       Supported and checked in, but optional; pre-build image when possible
Supabase CLI installation:           Pinned project dev dependency; use `pnpm add -D supabase --allow-build=supabase` on pnpm 10+
Integration DB tests:                Testcontainers PostgreSQL with pinned image and `.withReuse()`
RLS/Auth integration tests:          Local Supabase CLI stack or dedicated isolated CI environment
E2E test data:                       Deterministic synthetic seeds only
Backend container:                   Build from day one; local container use optional
Local network posture:               Bind service ports to loopback; never publicly expose local stack
```

The next category in the dependency order is **Database Management System**.
<span style="display:none">[^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33]</span>

<div align="center">⁂</div>

[^1]: https://supabase.com/docs/guides/local-development

[^2]: https://supabase.com/docs/guides/local-development/cli/getting-started

[^3]: 09-Repository-Structure-Tooling.md

[^4]:
    https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility

[^5]: https://github.com/supabase/cli

[^6]: https://docs.docker.com/reference/compose-file/develop/

[^7]:
    https://learn.microsoft.com/is-is/windows/dev-environment/docker/dev-containers

[^8]:
    https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/

[^9]: https://node.testcontainers.org/

[^10]: https://docs.docker.com/guides/testcontainers-nodejs-getting-started/

[^11]:
    https://docs.docker.com/guides/testcontainers-nodejs-getting-started/run-tests/

[^12]: 07-Technical-Architecture-Fundamentals.md

[^13]: 14-Dependencies-Tooling-Third-Party-Platforms.md

[^14]: https://supabase.com/docs/reference/cli/introduction

[^15]: https://zenn.dev/slowhand/articles/209699774226af?locale=en

[^16]: https://code.visualstudio.com/docs/devcontainers/tutorial

[^17]: https://supabase.com/blog/supabase-cli

[^18]: https://hub.docker.com/r/microsoft/vscode-devcontainers

[^19]:
    https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/cli.mdx

[^20]: https://supabase.com/blog/supabase-local-dev

[^21]:
    https://www.reddit.com/r/Supabase/comments/1m87gqb/how_to_configure_supabases_local_development/

[^22]: https://code.visualstudio.com/docs/devcontainers/faq

[^23]: https://code.visualstudio.com/docs/devcontainers/containers

[^24]: https://node.testcontainers.org/modules/postgresql/

[^25]:
    https://docs.docker.com/guides/testcontainers-nodejs-getting-started/write-tests/

[^26]: https://testcontainers.com/modules/postgresql/

[^27]:
    https://oneuptime.com/blog/post/2026-01-06-nodejs-integration-tests-testcontainers/view

[^28]: https://github.com/Yengas/nodejs-postgresql-testcontainers

[^29]: https://testcontainers.com/guides/

[^30]:
    https://github.com/testcontainers/testcontainers-node/blob/main/packages/modules/postgresql/src/postgresql-container.ts

[^31]: https://qaskills.sh/blog/testcontainers-postgresql-node-complete-guide

[^32]:
    https://www.atomicjar.com/2023/07/testing-nodejs-typescript-app-using-testcontainers/

[^33]: https://github.com/podman-desktop/podman-desktop/discussions/10769

[^34]:
    https://www.youngju.dev/blog/culture/2026-05-15-docker-desktop-alternatives-2026-podman-orbstack-colima-finch-rancher-deep-dive.en

[^35]: https://blog.codercops.com/blog/dev-containers-github-codespaces-2026

[^36]: https://node.testcontainers.org/modules/postgresql/

[^37]: https://docs.docker.com/reference/compose-file/develop/

[^38]: https://github.com/apple/container

[^39]:
    https://supabase.com/docs/guides/local-development?package-manager=pnpm&queryGroups=package-manager
