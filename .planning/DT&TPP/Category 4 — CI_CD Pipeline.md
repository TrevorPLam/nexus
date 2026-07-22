## Category 4 — CI/CD Pipeline

**Recommendation: use GitHub Actions as the primary CI/CD policy gate and
monorepo orchestrator, with Vercel's native Git integration handling Next.js web
deploys and EAS Workflows handling the Expo mobile build/submission/test
pipeline, all tied together through protected GitHub Environments,
least-privilege permissions, OIDC-based authentication, SHA-pinned actions, and
Turbo-aware checks.** This is the best fit because GitHub remains the source of
truth for code review and merge gates, Vercel's zero-config integration is
faster and cheaper than shelling out to `vercel deploy` inside Actions, and EAS
Workflows is purpose-built for React Native release
automation.[^1][^2][^36][^37]

The pipeline should be designed as a **security and release-control system**,
not merely a way to run tests. Life OS will handle calendars, OAuth tokens,
tasks, notes, and eventually financial/health data, so every merged change and
deployment needs provenance, isolation, approval rules, and reproducibility.

## What CI/CD Must Do

The pipeline must:

- Verify every pull request before merge.
- Prevent invalid, untyped, untested, insecure, or unbuildable changes from
  reaching `main`.
- Validate the monorepo efficiently, running only affected work where safely
  possible.
- Provision preview deployments without exposing production credentials or user
  data.
- Deploy the web, backend, database migrations, and mobile builds through
  controlled release paths.
- Separate staging from production, with approval and branch restrictions.
- Maintain a usable audit trail for source revision, workflow, deployment,
  migration, and mobile store build.
- Avoid long-lived cloud credentials in CI.
- Support the MVP’s small team without prematurely adopting enterprise release
  tooling.

GitHub Actions supports environments such as staging and production, including
branch restrictions, approval gates, deployment protection rules, and
environment-scoped secrets. A job can access an environment’s secrets only after
the configured protection rules pass.[^3][^4]

## CI/CD Platform Options

| Option                                   | Advantages                                                                                                                                                                                                                                                                                                                                                                                  | Disadvantages                                                                                                                                                                                                     | Decision                            |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------- |
| **GitHub Actions**                       | Native GitHub integration; 20,000+ marketplace actions; reusable/composite workflows; environment protection rules; OIDC workload identity; dependency review; artifact attestations; 2,000 free minutes/month; Linux pricing dropped to ~$0.006/min in Jan 2026; 2026 roadmap adds workflow-level dependency locking, scoped secrets, and ruleset-based execution policies.[^36][^38][^40] | YAML can become verbose for complex monorepos; hosted runners can queue during peak hours; 10 GB/repo cache limit with 7-day expiry; no native Docker layer caching; security requires deliberate hardening.[^40] | **Primary monorepo CI/CD**          |
| **Vercel native Git integration**        | Zero-config preview deployments for every PR; production deploys from `main`; faster than running `vercel deploy` inside Actions; native preview URLs; instant rollback/promote.[^41]                                                                                                                                                                                                       | Does not run backend tests, migrations, or mobile builds; automatic production deploy on `main` must be gated by disabling auto-assignment or using an explicit `vercel promote` step.                            | **Use for web deploys**             |
| **EAS Workflows**                        | Purpose-built Expo/React Native CI/CD; build, submit, update, Maestro tests, fingerprint/repack, and `require-approval` gates; triggers from GitHub events via the Expo GitHub App; cheaper/faster than GitHub macOS runners for native builds.[^37]                                                                                                                                        | Does not cover the full monorepo or cross-repo TypeScript quality gates; adds an `eas/workflows/*.yml` surface.                                                                                                   | **Use for mobile release pipeline** |
| GitLab CI/CD                             | Mature pipelines and integrated DevOps platform; strong monorepo DAG/child pipelines; self-managed option.                                                                                                                                                                                                                                                                                  | Requires moving or mirroring source hosting; lower free minutes (400/mo); paid tiers climb quickly; no meaningful advantage for a GitHub-native project.[^42]                                                     | Reject                              |
| CircleCI                                 | Fast runner startup; strong test splitting/parallelism; Docker layer caching; M1 macOS runners competitive for iOS; generous free credits.                                                                                                                                                                                                                                                  | Another vendor; separate permissions/secrets surface; credit-based pricing can surprise at scale; 2023 security incident legacy.[^40]                                                                             | Reject for MVP                      |
| Buildkite                                | Hybrid SaaS control plane + self-hosted agents; unlimited parallelism on own infra; dynamic pipelines; predictable per-user pricing.                                                                                                                                                                                                                                                        | Requires operating agents and worker infrastructure; more suited to large/complex monorepos.[^43]                                                                                                                 | Reject for MVP                      |
| Azure DevOps Pipelines                   | Enterprise governance; Key Vault-backed secrets; multi-stage deployment strategies; flat-rate per parallel job.                                                                                                                                                                                                                                                                             | Heavy; weaker ecosystem for Vercel/Expo/Supabase; primarily fits Microsoft/Azure-centric enterprises.[^44]                                                                                                        | Reject                              |
| GitHub Actions + self-hosted runners     | Cheaper at scale than hosted larger runners; full control of hardware; good if queues/costs become a bottleneck.                                                                                                                                                                                                                                                                            | Runner hardening, patching, secrets, and network security burden; not worth it for a small MVP team.[^43]                                                                                                         | Defer                               |
| Woodpecker / Drone / Jenkins self-hosted | Full control, predictable cost, privacy-focused.                                                                                                                                                                                                                                                                                                                                            | Significant operations burden; smaller ecosystem; not appropriate for an early-stage SaaS.                                                                                                                        | Reject for MVP                      |

GitHub Actions provides the capabilities the project needs for the monorepo
without introducing another operational vendor; Vercel and EAS Workflows provide
the best purpose-built deploy/release paths for their respective platforms. The
original plan already selects GitHub Actions for linting, type checking, tests,
builds, migrations, and deployments.[^5][^1]

## Recommended Pipeline Model

```text
Pull Request
  -> Fast quality checks
  -> Security/dependency checks
  -> Affected unit/integration checks
  -> Required build checks
  -> Web preview deployment
  -> Review / merge gate

Merge to main
  -> Full verification
  -> Staging database migration
  -> Backend deploy to staging
  -> Web deploy to staging or controlled production path
  -> Smoke tests
  -> Create immutable release metadata

Manual / tagged production release
  -> Production approval gate
  -> Backup / migration safety check
  -> Production migration
  -> Backend rollout
  -> Web rollout
  -> Post-deployment smoke tests
  -> Sentry release + deployment record

Mobile release
  -> Explicit release workflow
  -> Build via EAS
  -> Internal distribution first
  -> Manual store submission / production promotion
```

Do **not** automatically deploy every merge to production in the initial
product. Automatic web previews are valuable; automatic production release is
not worth the risk while the planning engine, sync layer, OAuth integration, and
database migrations are rapidly evolving.

## Required Workflows

### `ci.yml` — Required Pull Request Verification

**Trigger:** `pull_request` targeting `main`, plus `push` to `main`.

**Purpose:** Verify source quality. It must never receive production secrets or
deploy privileges.

Required jobs:

| Job                  | Purpose                                                           | Blocking                |
| :------------------- | :---------------------------------------------------------------- | :---------------------- |
| `validate-workflows` | Lint GitHub workflow YAML and enforce pinned actions              | Yes                     |
| `install`            | Deterministic `pnpm install --frozen-lockfile`                    | Yes                     |
| `lint`               | ESLint, formatting verification, spelling if adopted              | Yes                     |
| `typecheck`          | Strict TypeScript check across affected workspaces                | Yes                     |
| `unit-test`          | Vitest for pure packages and backend logic                        | Yes                     |
| `integration-test`   | Backend/API/database integration tests with isolated test DB      | Yes once backend exists |
| `build`              | Web, backend, and package builds; mobile static/bundle validation | Yes                     |
| `dependency-review`  | Vulnerability and license review for changed dependencies         | Yes                     |
| `secret-scan`        | Secret scanning / leak detection                                  | Yes                     |
| `architecture-check` | Dependency boundaries and circular-dependency checks              | Yes once configured     |

GitHub’s dependency review can inspect pull-request dependency changes and flag
vulnerabilities or invalid licenses before they enter the project.[^6][^7]

### `preview-web.yml` — Pull Request Web Preview

**Trigger:** Vercel's native Git integration creates a preview deployment for
every PR that touches `apps/web/**` or web dependencies. GitHub Actions quality
jobs must pass before merge.

**Purpose:** Provide an isolated Vercel preview for UI review without exposing
production data.

Rules:

- Let Vercel build previews on its own infrastructure; do not run
  `vercel deploy` inside Actions for normal PRs — it adds queue time, burns
  Actions minutes, and fragments preview URLs.[^41]
- If non-standard cases arise (multi-tenant/org deploy, branch-less deploy), use
  `vercel build` + `vercel deploy --prebuilt` with a scoped `VERCEL_TOKEN`.
- Previews receive only public configuration and non-sensitive test credentials.
- They must never connect to production Supabase data, production Clerk tenant,
  production Stripe, or production Google OAuth credentials.
- Database-backed preview functionality should use a disposable or shared
  non-production environment with synthetic data only.
- Treat Vercel preview deployments as required status checks (`Vercel Preview` /
  `Vercel – life-os-web`) in GitHub branch protection.

Vercel can run its own preview deployment workflow, but GitHub Actions remains
the policy gate. A failing GitHub Actions status check blocks merge, which
blocks Vercel from seeing a new commit on `main`.

### `deploy-staging.yml` — Merge-to-Main Staging Release

**Trigger:** push to `main` after CI succeeds.

**Purpose:** deploy the verified main branch into staging, where integration and
smoke tests run against real staging services.

Order:

1. Build immutable backend image/artifact.
2. Apply additive, backward-compatible database migrations.
3. Deploy backend.
4. Deploy web.
5. Run smoke tests against staging.
6. Report deployment and release status to GitHub/Sentry.

Use a concurrency group such as `deploy-staging` so only one staging deployment
runs at a time. GitHub Actions can serialize work with `concurrency`; it can
also cancel outdated runs when configured.[^8][^9]

### `release-production.yml` — Explicit Production Release

**Trigger:** manual `workflow_dispatch` with a selected Git commit/tag, or a
signed release tag after the team establishes release discipline.

**Purpose:** promote a specific tested staging commit to production for the
backend and, if applicable, the web.

Required protections:

- `production` GitHub Environment.
- Required approval from a designated release owner.
- Only `main` or signed release tags allowed.
- No automatic approval.
- Separate production environment secrets, if any remain after OIDC adoption.
- Serialized deployment concurrency: one production release at a time.
- Deployment and migration runbook link in workflow output.
- Web: If using Vercel, either disable production-domain auto-assignment so
  `main` builds are staged, then run `vercel promote <deployment-url>` in the
  workflow, or use Vercel's dashboard **Promote to Production** after required
  GitHub checks pass.[^45]
- Backend/container host: build an immutable image, apply the production
  migration with an explicit migration classification, then roll out with health
  checks.

The production flow must not silently migrate a destructive schema change.
Require a migration classification input or generated migration manifest that
identifies whether a migration is additive, backfill-required, destructive, or
irreversible.

### `mobile-release.yml` / `.eas/workflows/deploy.yml` — Explicit Expo Release

**Trigger:** manual `workflow_dispatch` in GitHub Actions, or a GitHub event
(e.g., `push` to `main` or a release tag) passed to EAS Workflows via the Expo
GitHub App.

**Purpose:** build and distribute the Expo app through EAS, without coupling
every web/backend release to App Store or Play Store processes.

Options:

1. **GitHub Actions relay** (MVP start): a workflow installs `eas-cli`,
   authenticates with `EXPO_TOKEN`, and runs `eas build`, `eas update`, or
   `eas submit`. This keeps the mobile path inside the repo but does not perform
   native builds on GitHub's runners.[^46]
2. **EAS Workflows** (preferred once configured): define
   `.eas/workflows/build.yml` and `.eas/workflows/deploy.yml` to orchestrate
   `build`, `submit`, `update`, `maestro`, `fingerprint`, `repack`, and
   `require-approval` jobs. Triggers can be tied to GitHub `push`,
   `pull_request`, or tag events through the Expo GitHub App.[^37]

Rules:

- PRs run lint/type checks and a mobile bundle/static validation in GitHub
  Actions; they do not run full store builds.
- Merges to `main` can trigger an internal EAS development/preview build only
  when a native-affecting change is detected or manually requested.
- Production builds require a protected approval gate (GitHub Environment for
  the relay, or the `require-approval` job in EAS Workflows).
- EAS Update is allowed only for JavaScript/assets compatible with the installed
  native runtime.
- A PowerSync native-module upgrade, Expo SDK upgrade, encryption-library
  change, or native configuration change requires a new binary — never an
  OTA-only update.

## Workflow Architecture

Use small GitHub workflow files that call **versioned reusable workflows**
stored in `.github/workflows/`. EAS Workflows live under `.eas/workflows/` and
are triggered by GitHub events through the Expo GitHub App.

```text
.github/
  workflows/
    ci.yml
    preview-web.yml          # gates Vercel preview; optional manual promote
    deploy-staging.yml
    release-production.yml
    mobile-release.yml       # optional relay to EAS Workflows / EAS Build
    dependency-review.yml
    reusable/
      setup-node-pnpm.yml
      quality.yml
      test.yml
      build.yml
      migration.yml
      deploy-backend.yml
      smoke-test.yml
.eas/
  workflows/
    build.yml                # dev/preview builds, optionally triggered by GitHub
    deploy.yml               # production build/submit/update with require-approval
```

Reusable workflows reduce copy/paste of Node setup, pnpm caching, Turbo
commands, security permissions, and deployment rules. Keep them in the same
repository at first; do not create an organization-wide workflow repository
until there is a real second repository with the same requirements.

## Node, pnpm, and Turbo Caching

Use the lockfile as the dependency-cache key, and use Turborepo’s task cache
separately.

```yaml
- uses: actions/checkout@<full-commit-sha> # version comment required

- uses: pnpm/action-setup@<full-commit-sha>
  with:
    run_install: false

- uses: actions/setup-node@<full-commit-sha>
  with:
    node-version-file: '.nvmrc'
    cache: 'pnpm'
    cache-dependency-path: 'pnpm-lock.yaml'

- run: pnpm install --frozen-lockfile
- run: pnpm turbo run lint typecheck test build
```

`actions/setup-node` supports pnpm dependency caching and uses the dependency
lockfile to calculate the cache key; its cache stores global package data rather
than `node_modules`. Do not cache `node_modules`: pnpm’s symlink structure,
native modules, platform differences, and lockfile changes make it
error-prone.[^10][^11]

Use Turbo’s local cache first and add a remote cache after the repository has
enough repeated CI work to justify it. Ensure cache keys include:

- `pnpm-lock.yaml`
- relevant source/config files
- Node version
- package-manager version
- Turbo version
- environment variables that alter outputs, explicitly declared as Turbo task
  inputs

Never put secrets into Turbo cache inputs or outputs. Never cache artifacts
containing `.env` files, source maps with embedded secrets, database dumps,
OAuth tokens, signing files, EAS credentials, or test fixtures derived from real
customer data.

## Security Baseline

### Permissions

Set repository-wide GitHub Actions defaults to read-only:

```yaml
permissions:
  contents: read
```

Each job must add only the permissions it needs, for example:

- `pull-requests: write` only for a PR-commenting preview job.
- `id-token: write` only for a job using OIDC.
- `packages: write` only for a job publishing a container image.
- `attestations: write` only for a release job producing attestations.

Never use `permissions: write-all`. Pull-request CI should not have permission
to deploy, alter releases, write packages, or access production secrets.

### Action pinning

Pin **every action**, including GitHub-maintained actions, to a full
40-character commit SHA, with the human-readable release in a comment:

```yaml
- uses: actions/checkout@<40-character-SHA> # v4.x.x
```

GitHub states that a full-length commit SHA is the only immutable way to
reference an action, preventing a tag or branch from being moved to compromised
code. GitHub also supports organization/repository policy enforcement for
SHA-pinned actions.[^12][^13]

Use Renovate or Dependabot to open controlled pull requests that update the SHA
and its version comment. The update itself is then inspected through the normal
CI process.

As of 2026, GitHub is introducing workflow-level dependency locking
(`dependencies:` in workflow YAML), scoped secrets bound to explicit execution
contexts (workflow paths, branches, environments, reusable workflows), and
ruleset-based execution protections. These will directly address mutable action
references, implicit secret inheritance, and over-permissioned workflows. Adopt
them as they become available; keep pinning every action to a full SHA until
then.[^36]

### Pull-request safety

- Use `pull_request`, not `pull_request_target`, for code contributed through
  pull requests.
- Do not check out and execute PR-controlled code in a workflow that has
  production secrets or elevated repository permissions.
- Do not expose deployment tokens to forked PRs.
- Do not run unreviewed scripts from issue bodies, PR titles, branch names,
  artifacts, or external webhooks.
- Treat workflow changes as security-sensitive: require code-owner approval for
  `.github/workflows/**`.

### OIDC

Use OIDC to authenticate GitHub Actions to deployment providers and cloud
services instead of static API keys whenever the provider permits it. GitHub’s
OIDC flow issues workflow-scoped identity tokens so a cloud provider can grant
temporary credentials rather than relying on a stored secret.[^14]

Constrain every OIDC trust policy to:

- This GitHub organization and repository.
- Exact workflow file path where supported.
- Specific branch or immutable release tag.
- Exact GitHub environment, especially `production`.
- Short credential lifetime.
- Required deployment audience.

In 2026, GitHub Actions enhanced OIDC tokens with immutable repository/owner
identifiers in the default `sub` claim and added support for repository custom
properties as claims. Use these features to make trust policies even more
precise and resilient to repository renames or transfers.[^38][^39]

### Artifacts and provenance

For production backend container images and distributed release artifacts,
generate provenance attestations. GitHub Actions attestations record the
repository, workflow, commit SHA, triggering event, and related OIDC identity;
they establish provenance but do not by themselves establish that an artifact is
secure.[^15][^16]

**MVP requirement:** attest backend container images and any downloadable
release artifact. **Not required:** artifacts produced only for transient PR
tests.

## Database Migration Pipeline

Database migrations are the highest-risk CI/CD activity because Life OS’s graph,
RLS policies, sync model, and calendar data all depend on schema consistency.

### Required migration policy

1. Migrations are generated, reviewed, and committed with the feature code.
2. A PR integration-test job applies all migrations to a clean, ephemeral test
   database.
3. It verifies RLS policies, schema constraints, and the migration rollback plan
   where feasible.
4. Staging migrations run before staging application deployment.
5. Production migrations run in a protected, serial workflow.
6. Application code must remain compatible with both pre- and post-migration
   schemas during a rolling release.
7. Destructive operations require an explicit expansion–migration–contraction
   sequence.

### Migration categories

| Migration type | Example                                                        | Production treatment                                              |
| :------------- | :------------------------------------------------------------- | :---------------------------------------------------------------- |
| Additive       | New nullable column, new table, index added concurrently       | Automated after approval                                          |
| Expand         | New field plus dual-read/dual-write support                    | Deploy schema first, then app                                     |
| Backfill       | Populate a new projection or denormalized column               | Separate idempotent job, progress monitoring                      |
| Contract       | Remove obsolete column/index after old app versions are gone   | Separate later release                                            |
| Destructive    | Drop data, alter type incompatibly, replace RLS policy broadly | Manual runbook, backup, explicit approval, maintenance assessment |

Do not place ordinary application deployment and irreversible data migration in
the same unreviewed automated step.

## CI Test Tiers

| Tier               | Trigger                                  |                Time target | Contents                                                                                   |
| :----------------- | :--------------------------------------- | -------------------------: | :----------------------------------------------------------------------------------------- |
| Fast PR gate       | Every PR update                          | Under 10 minutes initially | Install, lint, format, type check, affected unit tests, dependency review                  |
| Full PR gate       | PRs affecting backend/database/auth/sync | Under 20 minutes initially | Clean database migrations, backend integration, RLS tests, relevant build                  |
| Nightly            | Scheduled                                |           No strict target | Full test matrix, web E2E, mobile E2E, dependency audit, visual regression                 |
| Staging smoke      | Every staging release                    |            Under 5 minutes | Authenticated/non-authenticated health, API health, migration verification, basic web flow |
| Release validation | Production candidate                     |           Under 20 minutes | Release artifact validation, critical E2E subset, deployment readiness checklist           |

The original test plan correctly calls for Vitest, Supertest, Playwright, mobile
E2E through Detox or Maestro, and visual regression. CI should stage these tools
by maturity rather than delaying all quality gates until the full stack
exists.[^1][^5]

## Deployment Choices in CI

| Target          | Executor                                                                              | Recommended release mode                                                                                              |
| :-------------- | :------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| Web             | Vercel native Git integration, gated by GitHub Actions                                | PR previews auto; `main` builds staged; manual `vercel promote` to production initially                               |
| Backend         | GitHub Actions + selected container host (Railway / Fly.io / Render / VPS)            | Build immutable OCI image; deploy staging automatically; production with approval                                     |
| Database        | GitHub Actions reusable migration workflow                                            | Isolated test DB on PR; staging on merge; protected serialized production migration                                   |
| Mobile          | EAS Workflows triggered by GitHub events, or a GitHub Actions relay calling EAS Build | PR validation in GitHub Actions; internal/preview builds on `main`; protected production builds and store submissions |
| Shared packages | pnpm + Turbo task graph                                                               | Built/tested as dependencies; no npm publication during MVP                                                           |

The exact backend host remains unresolved, so do not hardcode provider-specific
CI actions yet. Build a generic OCI container, run health checks, and place
provider deployment logic behind `reusable/deploy-backend.yml`. This preserves
the architecture’s stated portability between Railway, Fly.io, Render, or a
VPS.[^17][^5]

## Trade-Offs

| Choice                                        | Gain                                                                             | Cost                                                                                  |
| :-------------------------------------------- | :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| GitHub Actions as primary monorepo CI         | Native integration, 20,000+ actions, 2026 security roadmap, generous free tier   | YAML/security discipline; queue/cache limits at scale                                 |
| Vercel native integration for web deploys     | Faster, cheaper deploys; native preview URLs; instant rollback                   | Requires disabling auto-assign or a manual `vercel promote` step for gated production |
| EAS Workflows for mobile release              | Expo-native build/submit/test/repack/approval; cheaper than GitHub macOS runners | Another YAML surface; not a replacement for cross-repo gates                          |
| Protected manual production release           | Safer early production changes and migrations                                    | Slightly slower release cadence                                                       |
| OIDC vs. static deploy tokens                 | Short-lived credentials and lower secret risk; immutable subject claims in 2026  | Provider-specific trust configuration                                                 |
| Reusable workflows                            | Consistency and reduced duplication                                              | Initial abstraction work                                                              |
| Turbo caching                                 | Faster CI and affected task execution                                            | Must accurately configure task inputs/outputs                                         |
| Full-SHA action pinning                       | Immutable workflow dependencies                                                  | Updates require Renovate/Dependabot and review                                        |
| GitHub Actions + self-hosted runners (future) | Cheaper at scale; custom hardware                                                | Runner hardening and ops burden; defer until bill is painful                          |

## Final Decision

Lock the following CI/CD baseline:

```text
CI/CD platform (monorepo):   GitHub Actions
Web deploy executor:         Vercel native Git integration (preview) + manual promotion (production)
Mobile release executor:     EAS Workflows (or GitHub Actions relay calling EAS Build)
Backend deploy executor:     GitHub Actions → container host (Railway / Fly.io / Render / VPS)
Database migration executor: GitHub Actions reusable workflow
Branch model:                Protected main; short-lived PR branches
Required PR checks:          Lint, format, typecheck, unit tests, relevant integration tests,
                             build, dependency review, secret scanning, architecture checks
Task execution:              pnpm + Turborepo
Dependency installation:     pnpm install --frozen-lockfile
Dependency cache:            setup-node pnpm store cache, keyed by pnpm-lock.yaml
Turbo cache:                 Local initially; remote cache when repeated CI work warrants it
Deployment environments:     preview, staging, production
Production deploy:           Explicit manual approval through protected GitHub Environment
                             (and Vercel/EAS require-approval jobs where applicable)
Deployment auth:             OIDC first; restricted GitHub environment secrets only as fallback
Workflow permissions:        contents: read by default; per-job least privilege
Action security:             Every action pinned to full 40-character SHA;
                             adopt workflow-level dependency locking when GitHub ships it
Migrations:                  Tested on clean DB in PR; staging before app deploy; protected serialized production workflow
Preview safety:              No production data or credentials in PR environments
Mobile releases:             Dedicated EAS Workflow or manually approved EAS relay; OTA only for compatible JS/assets
Provenance:                  Attest production backend/release artifacts
```

The next category in the dependency order is **Code Quality \& Consistency
Tools**.
<span style="display:none">[^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45][^46]</span>

<div align="center">⁂</div>

[^1]: 09-Repository-Structure-Tooling.md

[^2]: 12-Development-Practices.md

[^3]:
    https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments

[^4]:
    https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments

[^5]: 14-Dependencies-Tooling-Third-Party-Platforms.md

[^6]:
    https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/configuring-the-dependency-review-action

[^7]: https://github.com/actions/dependency-review-action

[^8]:
    https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs

[^9]:
    https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency

[^10]: https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md

[^11]: https://github.com/marketplace/actions/setup-node-js-environment

[^12]: https://docs.github.com/en/actions/reference/security/secure-use

[^13]:
    https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/

[^14]: https://docs.github.com/en/actions/concepts/security/openid-connect

[^15]:
    https://docs.github.com/en/actions/concepts/security/artifact-attestations

[^16]:
    https://docs.github.com/en/actions/how-tos/security-for-github-actions/using-artifact-attestations

[^17]: 07-Technical-Architecture-Fundamentals.md

[^18]:
    https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions

[^19]:
    https://docs.github.com/fr/enterprise-server@3.21/actions/reference/workflows-and-actions/workflow-syntax

[^20]: https://docs.github.com/actions/guides/building-and-testing-nodejs

[^21]: https://github.com/marketplace/actions/all-in-one-setup-node-pnpm-cache

[^22]:
    https://docs.github.com/zh/actions/reference/workflows-and-actions/workflow-syntax

[^23]: https://sabigara.com/posts/pnpm-cache-on-github-actions

[^24]:
    https://github.blog/changelog/2021-09-07-github-actions-setup-node-supports-dependency-caching-for-projects-with-monorepo-and-pnpm-package-manager/

[^25]: https://github.com/marketplace/actions/pnpm-setup

[^26]: https://github.com/actions/setup-node

[^27]:
    https://github.com/marketplace/actions/enforce-full-sha-commit-pinning-in-github-actions

[^28]:
    https://groups.google.com/a/kubernetes.io/g/dev/c/gvwLzCBx-hA/m/phP47p52AgAJ

[^29]:
    https://docs.github.com/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review

[^30]:
    https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds

[^31]: https://github.com/marketplace/actions/dependency-review

[^32]:
    https://github.com/actions/dependency-review-action/blob/main/docs/examples.md

[^33]: https://starsling.dev/best-practices/github-actions/pin-action-shas.md

[^34]: https://www.stingrai.io/blog/github-actions-security-checklist

[^35]:
    https://learn.microsoft.com/pl-pl/training/modules/configure-dependabot-security-updates-on-github-repo/6-dependency-review

[^36]:
    https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/

[^37]:
    https://expo.dev/blog/how-to-integrate-eas-workflows-with-github-actions and
    https://docs.expo.dev/eas/workflows/get-started

[^38]:
    https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/

[^39]:
    https://github.blog/changelog/2026-03-12-actions-oidc-tokens-now-support-repository-custom-properties/

[^40]:
    https://toolchew.com/en/github-actions-vs-circleci/ and
    https://devops-daily.com/comparisons/circleci-vs-github-actions

[^41]:
    https://www.ideastack.co/blog/uk-indie-hacker-github-actions-vercel-pipeline-2026
    and https://vercel.com/docs/deployments/promoting-a-deployment

[^42]: https://briandetering.net/2026/03/19/best-cicd-platforms-2026/

[^43]: https://gitshowcase.com/best/cicd/

[^44]:
    https://lee-it.co.uk/devops/2026/04/26/github-actions-vs-azure-devops-pipelines.html

[^45]: https://vercel.com/docs/deployments/promote-preview-to-production.md

[^46]:
    https://docs.expo.dev/build/building-on-ci and
    https://github.com/expo/expo-github-action
