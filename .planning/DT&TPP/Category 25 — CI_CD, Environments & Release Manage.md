<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 25 — CI/CD, Environments \& Release Management

**Recommendation: use GitHub Actions as the central CI/CD orchestrator, GitHub
Environments for deployment protection and environment-scoped secrets, Supabase
CLI with versioned SQL migrations, containerized API/worker deployment to a
long-lived runtime, Vercel for the Next.js web app, and EAS Build/Update for
Expo mobile releases.** Maintain isolated development, preview, staging, and
production environments; promote immutable artifacts rather than rebuilding
different code for each environment.[^1][^2][^3]

The release system must be designed around the product’s real risk: a mobile app
can remain installed for months, data migrations are irreversible, jobs can
execute after deploys, and external integrations require environment-specific
callbacks/credentials. “Push to main, deploy everything” is not sufficient.

## Core Decision

```text
Source control / CI:              GitHub + GitHub Actions
Branch strategy:                  Trunk-based development with short-lived feature branches
Deployment policy:                Immutable artifacts promoted across environments
Environment gates:                GitHub Environments + required review for production
Web hosting:                      Vercel, separate preview/staging/production deployments
API/worker hosting:               Render or Fly.io long-lived container services
Database/storage/realtime:        Separate Supabase projects per non-production and production environment
Migrations:                       Versioned SQL in repository, applied only by protected CI deployment job
Mobile builds:                    EAS Build
Mobile OTA JS updates:            EAS Update with explicit runtimeVersion and staged rollout
Mobile store releases:            EAS Submit / App Store Connect / Google Play tracks
Secrets:                          GitHub Environment secrets; runtime-host secrets; no secrets in artifacts
Infrastructure as code:           Start with versioned deployment config; add Terraform/Pulumi if infrastructure expands
Rollback:                         Artifact rollback for web/API/worker, EAS Update rollback for compatible mobile JS updates,
                                  forward-only database repair/expand-contract migrations
```

GitHub Actions environments support deployment protection rules, environment
secrets, and environment variables. GitHub can also restrict which branches or
tags deploy to a protected environment. Expo runtime versions ensure an OTA
update is compatible with the native code embedded in an installed build; Expo
recommends incrementing the runtime version whenever native code
changes.[^2][^4][^1]

## Goals

The delivery system must provide:

- Fast feedback for developers.
- Repeatable production deployments with no manual hidden steps.
- Protected database migrations and secrets.
- Isolated test/staging configurations for Clerk, Supabase, PowerSync, Google
  OAuth, Stripe, Expo, Sentry, storage, and push.
- Reliable worker rollout and graceful job handling.
- Safe web rollback.
- Safe mobile OTA rollout and rollback.
- Forward-compatible database migrations for old mobile clients.
- Release visibility via version, commit SHA, environment, migration version,
  and deploy audit history.
- Practical operations for a small team before adding complex infrastructure
  tooling.

## Delivery Options

| Option                                    | Advantages                                                                                           | Disadvantages                                                                                  | Decision                           |
| :---------------------------------------- | :--------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- | :--------------------------------- |
| **GitHub Actions + GitHub Environments**  | Native repository integration; flexible workflow graph; protected secrets/approvals; broad ecosystem | YAML maintenance and runner/security discipline required                                       | **Select**                         |
| GitLab CI/CD                              | Strong integrated pipeline/registry features                                                         | Requires moving source-control workflow or adding a second platform                            | Reject                             |
| CircleCI                                  | Mature parallelization/caching                                                                       | Extra vendor and cost; GitHub Actions adequate                                                 | Reject                             |
| Buildkite                                 | Highly flexible/self-hosted agents                                                                   | Operational work disproportionate for MVP                                                      | Reject                             |
| Vercel-only functions for API/jobs        | Simple Next.js coupling                                                                              | Poor fit for selected Hono service and durable long-lived worker architecture                  | Reject                             |
| Serverless API + serverless job functions | Auto-scaling, little server management                                                               | Execution time/lifecycle limits; awkward for worker leases, queue polling, scheduled workloads | Reject                             |
| Kubernetes                                | Powerful scaling/control                                                                             | Significant operational overhead                                                               | Reject                             |
| Render/Fly/Railway container services     | Straightforward long-lived Node services, deploy hooks, logs/health checks                           | Another hosted runtime/vendor; needs careful region/secret configuration                       | **Select one after staging spike** |
| AWS ECS/Fargate                           | Mature enterprise option                                                                             | Higher infrastructure/IAM complexity at MVP                                                    | Defer                              |
| Terraform/Pulumi immediately              | Reproducible infrastructure                                                                          | Setup/maintenance cost before infrastructure is complex                                        | Defer; add when justified          |
| Manual console deploys                    | Fast at first                                                                                        | No repeatability, weak auditability, high configuration-drift risk                             | Reject                             |

## Environment Model

### Separate environments

| Environment | Purpose                                            | Data                          | External integrations                                                              | Deployment trigger                                 |
| :---------- | :------------------------------------------------- | :---------------------------- | :--------------------------------------------------------------------------------- | :------------------------------------------------- |
| Local       | Development and fast test loop                     | Disposable/local fixture data | Local mocks; sandbox only when needed                                              | Developer machine                                  |
| CI          | Deterministic automated validation                 | Ephemeral seeded test data    | Fakes; controlled sandbox tests                                                    | Pull request/push                                  |
| Preview     | Per-PR stakeholder/web review                      | Synthetic isolated data       | No real OAuth/push unless dedicated preview configuration                          | Pull request                                       |
| Staging     | Production-like integration and release validation | Synthetic QA data only        | Separate Google OAuth, Stripe test, Expo preview, Clerk/Supabase/PowerSync staging | Main branch/manual promotion                       |
| Production  | Real customer service                              | Production data only          | Production credentials/provider apps                                               | Protected tagged release/manual approved promotion |

Use **separate Supabase projects** for staging and production. Do not use a
shared project distinguished only by a `tenant=staging` column. PostgreSQL data,
RLS policies, Storage buckets, Realtime configuration, database roles, and
backup/restore boundaries must be isolated.

Use separate configurations for:

```text
Clerk instance/publishable key
Supabase project URL/anon key
PowerSync instance/configuration and service credentials
Google OAuth client IDs, redirect URIs, consent configuration
Stripe account/test mode versus production mode
Expo project/build channel/update channel
Sentry environment/release configuration
Storage bucket names/project
Push credentials
API and web origins/CORS allowlists
Webhook URLs and signing secrets
```

Never let preview or staging applications call production APIs with a production
user session.

## Repository and Branch Policy

### Trunk-based development

```text
main:
  Always releasable, protected branch

feature/<short-description>:
  Short-lived branch, merged through PR

release tags:
  production promotion references immutable commit/tag
```

Required branch protections for `main`:

- Pull request required.
- At least one approving review; two for migrations/security/auth changes if
  team size permits.
- Required CI checks.
- Dismiss stale approvals after new commits.
- No direct force push.
- Signed commits optional but recommended for protected deployment changes.
- CODEOWNERS approval for `supabase/migrations`, auth/security modules, CI
  workflows, deployment manifests, and provider configuration docs.

Do not maintain long-lived `develop`, `staging`, and `production` code branches.
They drift and turn merge work into an unreviewed release event. Environment
promotion is an artifact/configuration decision, not a divergent source-code
decision.

## Artifact Promotion

### Build once, promote unchanged

For each merge candidate:

```text
Commit SHA
  -> CI validates
  -> build web artifact
  -> build API container image
  -> build worker container image
  -> publish with immutable SHA/digest tags
  -> deploy same artifact to staging
  -> validate staging
  -> promote same digest to production
```

Artifact metadata:

```text
git_sha
build_timestamp
package_lock_hash
node_version
migration_head
web_release
api_release
worker_release
mobile_runtime_version
environment
```

Do not rebuild API/worker code during production promotion. A rebuild can
introduce a different dependency resolution or compiler output than staging
validated.

## GitHub Actions Pipeline

### Pull request workflow

```text
1. Checkout with pinned action versions.
2. Set Node/package-manager version from repository-controlled tool config.
3. Restore dependency/build caches with lockfile-based keys.
4. Install frozen dependencies.
5. Run format check, lint, typecheck.
6. Run unit/component/route/contract tests.
7. Start ephemeral PostgreSQL/Supabase-compatible integration environment.
8. Apply all migrations from empty schema.
9. Run RLS, database, outbox, worker, and search/storage tests.
10. Build web, API, worker, and mobile.
11. Run secret, dependency, license, and static security scans.
12. Run Playwright Chromium smoke suite.
13. Publish test reports/artifacts with short retention.
14. Create web preview deployment if PR policy permits.
```

Do not make EAS production builds or deploy database migrations from arbitrary
pull requests.

### Main/staging workflow

```text
1. Repeat required validation.
2. Build and publish immutable API/worker container artifacts.
3. Deploy web/API/worker artifacts to staging.
4. Apply reviewed staging migration through protected migration job.
5. Run database compatibility checks and staging smoke tests.
6. Run Playwright full browser suite.
7. Run Maestro iOS/Android smoke suite against staging config.
8. Run selected Google OAuth, Stripe test-webhook, PowerSync, storage, Expo push sandbox tests.
9. Verify health endpoints, dashboards, Sentry source maps, and worker heartbeat.
10. Create a deploy record with commit, artifact digests, migration version, and release IDs.
```

### Production promotion workflow

```text
1. Select/tag already-staging-validated commit/artifact digests.
2. Require GitHub production-environment approval.
3. Verify deployment preconditions:
   - required CI/staging checks green
   - migration plan approved
   - backup/restore status healthy
   - no blocking operational alerts
4. Apply production expand-compatible database migration if required.
5. Deploy worker version in a controlled drain/rollout.
6. Deploy API with health checks and rolling/canary strategy.
7. Deploy web artifact.
8. Run protected synthetic production smoke checks.
9. Monitor error rate, latency, queue age, job failures, and integration health.
10. Mark release/deployment and publish rollback reference.
```

GitHub Environments can hold deployment protection rules and scoped secrets. Use
production environment approval and branch/tag restrictions; GitHub supports
rules limiting which branches/tags can deploy.[^4][^1]

## Secrets and Credentials

### Secret hierarchy

| Secret type                                      | Store                                                             | Access                              |
| :----------------------------------------------- | :---------------------------------------------------------------- | :---------------------------------- |
| CI deployment tokens                             | GitHub Environment secrets or OIDC-issued short-lived credentials | Protected deployment workflows only |
| Runtime API/worker secrets                       | Hosting platform environment secret store                         | Respective service only             |
| Web public configuration                         | Build-time/public environment variables                           | Browser-safe values only            |
| Mobile public configuration                      | Expo app config/build environment                                 | Browser/app-safe values only        |
| Database migration credential                    | Protected CI environment secret / short-lived dedicated role      | Migration job only                  |
| Supabase service role                            | API/worker runtime only                                           | Never client/CI logs                |
| Clerk secret key                                 | API/web server runtime only                                       | Never mobile/browser                |
| OAuth client secret/refresh-token encryption key | API/worker runtime only                                           | Never web/mobile                    |
| Stripe secret/webhook signing secret             | API/worker runtime only                                           | Never client                        |
| Sentry auth token for source-map upload          | CI only                                                           | Never deployed app                  |
| Expo access token                                | EAS CI job only                                                   | Never client                        |

Rules:

- Prefer OIDC/workload identity to long-lived cloud credentials where
  host/provider supports it.
- Use separate secret values for every environment.
- Rotate secrets through a documented process and test rotation in staging.
- Never echo secrets, environment dumps, request headers, or `.env` files in CI
  logs.
- Pin third-party GitHub Actions by full commit SHA, not mutable tags, for
  sensitive workflows.
- Restrict workflow write permissions to the minimum required.
- Do not expose secrets to pull-request workflows from forks.
- Run secret scanning on repository history and build artifacts.

## Database Migration Strategy

### Versioned migrations only

Store SQL migrations in repository:

```text
supabase/
├── migrations/
│   ├── 20260721120000_initial_schema.sql
│   ├── 20260722100000_add_reminder_revision.sql
│   └── ...
├── seed/
└── tests/
```

Use Supabase CLI to manage/apply migrations and generate types. Supabase
documents that its CLI supports database migrations, TypeScript type generation,
and CI/CD workflows that test migrations locally then deploy schema changes with
`supabase db push`.[^3]

### Expand-contract pattern

Because old mobile versions and in-flight workers may continue operating during
rollout:

```text
Release A — Expand:
  Add nullable column/new table/index/function/policy.
  Deploy code that writes old + new representations if needed.

Release B — Backfill:
  Worker/backfill migration populates new structure.
  Validate reads and metrics.

Release C — Switch:
  Deploy readers using new structure.
  Keep compatibility fallback for supported clients.

Release D — Contract:
  Remove old column/table/behavior only after client support window
  and verification that no active workers/clients depend on it.
```

Never combine destructive schema changes with code rollout in one unproven
production step.

### Migration safety rules

- Every migration has a peer review and test from clean schema and prior schema.
- Prefer `CREATE INDEX CONCURRENTLY`/equivalent nonblocking approaches where
  production size requires it; account for PostgreSQL transaction restrictions.
- Lock-heavy DDL requires an explicit maintenance/risk plan.
- Data backfills run as resumable, rate-limited worker jobs—not an unbounded
  migration transaction.
- RLS policy changes require explicit cross-workspace regression tests.
- Migration job uses a dedicated migration role, not normal runtime worker/API
  role.
- Database rollback usually means a **forward corrective migration**, not
  restoring a prior schema blindly.
- Verify backup/PITR settings and recovery runbook before first production
  migration.

## API and Worker Deployment

### Runtime selection

Select **one long-lived container host after a staging spike**:

| Option          | Strengths                                                                            | Risks                                                                 | Decision                |
| :-------------- | :----------------------------------------------------------------------------------- | :-------------------------------------------------------------------- | :---------------------- |
| Render          | Simple managed web/background worker services, deploy hooks, straightforward team UX | Platform coupling; review region/scale/cost behavior                  | Preferred MVP candidate |
| Fly.io          | Flexible regions, containers, good for long-lived processes                          | More networking/operations decisions                                  | Strong alternate        |
| Railway         | Fast developer experience                                                            | Validate production networking, reliability, and operational controls | Evaluate                |
| AWS ECS/Fargate | Mature scaling/security/networking                                                   | Higher IAM/infrastructure complexity                                  | Defer                   |
| Kubernetes      | Maximum control                                                                      | Operational overkill                                                  | Reject                  |

The staging spike must prove:

- Hono API health/readiness/liveness endpoints.
- Worker can receive graceful shutdown and finish/release jobs safely.
- Horizontal scaling does not exceed PostgreSQL connection budget.
- Secrets are injected without logs/exposure.
- Static outbound IP or provider settings can support Google/other allowlists if
  needed.
- Region latency is acceptable relative to Supabase/PowerSync/Storage.
- Deploy rollback uses immutable image digest.
- Metrics/log drains and Sentry release correlation work.
- Scheduled worker behavior remains reliable after deploy/restart.

### Deployment order

For a backward-compatible change:

```text
1. Expand database.
2. Deploy worker capable of old/new schema.
3. Deploy API capable of old/new schema.
4. Deploy web.
5. Publish compatible mobile OTA update if applicable.
6. Backfill/reconcile.
7. Contract only after compatibility window.
```

For a behavior change requiring a feature flag, deploy disabled, validate
internally/staging, then progressively enable by allowlisted test user/workspace
before wider rollout.

## Web Release Management

### Vercel

Use Vercel for the Next.js application:

```text
PR:
  Preview deployment, environment-scoped preview configuration

main:
  Staging deployment or promotion target

production:
  Protected production deployment from approved artifact/commit
```

Rules:

- Disable public indexing of preview environments.
- Restrict preview authentication/access where internal data could be visible.
- Use separate environment variables per preview/staging/production.
- Do not use production database/service secrets in preview.
- Ensure Next.js caching behavior follows the selected personal-data policy.
- Link deployment URL, commit SHA, Sentry release, and GitHub deployment record.
- Roll back web to previous known-good deployment quickly; database/API
  compatibility must be preserved.

Vercel is selected for web because it is optimized for Next.js deployment
workflows; this does not make it the runtime for durable Hono workers.

## Mobile Release Management

### EAS Build

Use EAS Build for reproducible iOS/Android native binaries:

```text
development:
  Internal dev client, debug tooling, staging/local endpoint configuration

preview:
  Internal QA/beta build, staging configuration, test OAuth/push settings

production:
  Store-submitted build, production configuration and credentials
```

Each build must record:

```text
app version
iOS build number / Android version code
EAS build ID
Git SHA
Expo runtimeVersion
environment
API base URL
Sentry release
PowerSync configuration identifier
```

### EAS Update

Use EAS Update only for JavaScript/assets compatible with the installed native
runtime:

- Set `runtimeVersion` explicitly.
- Increment it whenever a native module, native configuration, Expo SDK,
  permissions manifest, PowerSync native layer, notification configuration, or
  other native dependency changes.
- Publish OTA updates first to an internal/staging channel using a build with
  the same runtime version.
- Use percentage rollout for production OTA updates.
- Monitor Sentry crash/error rate and critical user flow health.
- Halt rollout or roll back if regression thresholds are crossed.

Expo states that runtime versions guarantee compatibility between an installed
build’s native code and an update; an update must not call native code absent
from the build. Expo supports rolling a channel back either to a previously
published update or to the update embedded in the build.[^5][^2]

### Channels

```text
development:
  Developer/dev-client updates only

preview:
  Internal QA and beta builds

production:
  Store-production builds; staged EAS Update rollout only
```

Do not publish a production EAS Update to every branch. Map update channels to
intended build profiles and runtime versions deliberately.

### App Store / Play Store

- iOS: TestFlight -> phased App Store release where appropriate.
- Android: Internal -> closed beta -> production staged rollout.
- Native release required for runtime-version change, permission changes, native
  dependency updates, app metadata, and store-policy changes.
- Keep a supported-mobile-version window; backend migrations/API changes must
  remain compatible through it.
- Maintain a minimum supported app version and forced-upgrade policy only for
  security/data-integrity emergencies.

## Feature Flags

Use a small, server-controlled feature-flag capability before introducing a
dedicated flag vendor.

Initial implementation:

```text
feature_flags
feature_flag_assignments
workspace/user allowlist evaluation in Hono
safe boolean/variant value returned in bootstrap/config response
```

Use flags for:

- Calendar integration beta.
- Search index rollout.
- Notification delivery policy.
- Attachment type support.
- New planner algorithms.
- Data migrations requiring staged read/write behavior.
- Internal support diagnostics.

Do not use flags for:

- Authorization decisions.
- Secrets.
- RLS bypass.
- Billing enforcement as the sole control.
- Client-side-only security gates.

Reassess LaunchDarkly, Statsig, or PostHog flags only when experimentation,
targeting, analytics, or non-engineering flag management becomes a demonstrated
need.

## Rollback Strategy

### Web

```text
Rollback:
  Redeploy/promote last known-good Vercel artifact/deployment.

Prerequisite:
  API/database remains backward compatible through rollback window.
```

### API

```text
Rollback:
  Deploy previous immutable container digest.

Prerequisite:
  Previous version can read current expanded schema and tolerate new data.
```

### Worker

```text
Rollback:
  Drain/stop new worker; deploy previous compatible image.
  Pending pg-boss jobs remain durable.

Prerequisite:
  Old handler understands jobs it may claim, or job contracts are versioned.
```

### Database

```text
Rollback:
  Prefer forward corrective migration or feature-flag disable.
  Restore/PITR only for catastrophic data integrity incident under incident runbook.
```

Do not assume down migrations are safe. Data may have been written in the new
format, and mobile/API/worker versions may be mixed.

### Mobile OTA

```text
Rollback:
  Halt staged rollout.
  Republish known-good compatible EAS Update,
  or direct clients to embedded build update when necessary.
```

EAS Update provides both rollback to a previously published update and rollback
to the build’s embedded update.[^5]

### Mobile native release

Cannot be instantly rolled back on every user device. Mitigate by:

- Phased store rollout.
- Remote kill switches/feature flags for risky server-dependent features.
- Compatibility windows.
- Fast compatible OTA update where native runtime permits.
- Clear support/forced-upgrade procedure only when necessary.

## Release Gates

### Required production gate

Before production promotion:

- All required PR/main CI checks green.
- Staging deployment validated.
- Database migration reviewed/tested/rehearsed.
- API/worker artifact digest known and immutable.
- Sentry release/source map verified.
- No active critical incident or blocking dashboard alert.
- Security/dependency scan policy satisfied.
- Production environment approval recorded.
- Rollback target identified.
- For mobile OTA: matching runtime version confirmed and staged-preview update
  tested.
- For new integrations: sandbox/provider callback/webhook verification
  successful.

### Canary and health checks

Use synthetic canary account/workspace checks after deploy:

```text
Unauthenticated health endpoint works.
Authenticated bootstrap works.
Create/complete fixture task command works.
Outbox event/job executes.
Today projection updates.
Search returns scoped fixture result.
Storage signed URL authorization works without object data leakage.
Calendar/webhook sandbox path works where relevant.
No spike in Sentry errors/latency/queue age.
```

Synthetic production checks must use a dedicated canary workspace and must not
send real reminders, create public files, or contact real external recipients.

## CI Workflow Security

GitHub Actions workflows are production code.

- Pin action versions by immutable SHA.
- Use minimal `permissions:` per workflow/job.
- Separate untrusted PR jobs from deployment jobs.
- Never run deployment secrets in `pull_request` workflows from forks.
- Avoid `pull_request_target` unless reviewed for checkout/code-execution risk.
- Lock dependency installation with `pnpm --frozen-lockfile`.
- Generate and retain SBOM/provenance where practical.
- Require human approval for production environment.
- Restrict who can modify workflow files and environment configuration.
- Rotate deploy tokens/secrets; audit usage.
- Verify CI artifacts before promotion and set short retention for test
  artifacts that may contain synthetic screenshots/logs.

## Release Documentation

Maintain repository runbooks:

```text
docs/runbooks/
  production-deploy.md
  rollback.md
  database-migration.md
  worker-drain-and-recovery.md
  mobile-ota-release.md
  mobile-native-release.md
  incident-response.md
  secret-rotation.md
  staging-provider-validation.md
```

Every release record includes:

```text
Release ID
Git SHA
Web deployment ID
API/worker image digests
Migration head
EAS build/update IDs and runtime version
Environment
Approver
Start/end timestamp
Feature flags changed
Known risks
Rollback target
Validation result
```

## Testing the Pipeline

| Scenario                           | Required outcome                                              |
| :--------------------------------- | :------------------------------------------------------------ |
| PR from trusted branch             | Runs quality checks, no production secrets exposed            |
| PR from fork                       | Runs safe reduced checks; no write/deploy credentials         |
| Failed migration in staging        | Deployment stops before app promotion; diagnostic output safe |
| Worker deploy during active job    | Graceful drain/retry; no lost job                             |
| API health check failure           | Automatic rollback or halted rollout                          |
| Web rollback                       | Previous deployment serves without breaking current API       |
| Mobile OTA with native mismatch    | Blocked by runtime-version policy                             |
| Bad OTA rollout                    | Halt/rollback works; error regression visible                 |
| Secrets rotation                   | New secret accepted; old secret retired without outage        |
| Production approval absent         | Deployment cannot proceed                                     |
| Cross-environment credential error | Fails closed; staging cannot reach production data            |
| Database restore drill             | Runbook, RPO/RTO, and access controls are validated           |
| Old mobile client after migration  | Core API/command flows remain compatible                      |

## Trade-Offs

| Choice                            | Gain                                           | Cost                                        |
| :-------------------------------- | :--------------------------------------------- | :------------------------------------------ |
| GitHub Actions                    | Integrated, flexible, familiar CI/CD           | Workflow security/YAML maintenance          |
| Separate environments/projects    | Strong isolation and safer testing             | More credentials/configuration/cost         |
| Immutable artifact promotion      | Staging truly represents production code       | Registry/tag/version discipline             |
| Long-lived API/worker containers  | Appropriate for Hono and durable queue workers | Host/runtime operations required            |
| Vercel for web only               | Excellent Next.js deployment experience        | Multi-host architecture                     |
| EAS Build/Update                  | Managed Expo release workflow and OTA control  | Runtime-version/channel discipline required |
| Expand-contract migrations        | Safe mixed client/service rollout              | Longer migration lifecycle                  |
| GitHub Environment approvals      | Deployment audit and guardrails                | Slight release friction                     |
| Feature flags                     | Safer gradual rollout                          | Flag debt/governance if unmanaged           |
| No Kubernetes/Terraform initially | Fast MVP operations                            | May need later infrastructure formalization |

## Final Decision

Lock the following CI/CD and release-management architecture:

```text
CI/CD orchestrator:             GitHub Actions
Protection/secrets:             GitHub Environments with protected production approval and scoped secrets
Branching:                      Trunk-based; protected main; short-lived PR branches; release tags
Artifact model:                 Build once, tag by Git SHA/digest, validate in staging, promote unchanged to production
Web:                            Vercel preview/staging/production deployments
API and worker:                 Separate long-lived Node container services, starting with a Render vs Fly.io staging spike
Database:                       Separate Supabase staging and production projects
Migrations:                     Reviewed versioned SQL through Supabase CLI; expand-contract; CI applies only in protected deployment jobs
Mobile binaries:                EAS Build and store phased rollout
Mobile OTA:                     EAS Update, explicit runtimeVersion, preview validation, percentage rollout, rollback plan
Rollbacks:                      Prior immutable web/container artifact; EAS Update rollback; forward database repair migration
Feature flags:                  Small server-controlled internal system initially
Observability gate:             Sentry release/source maps, health checks, canary tests, dashboards and queue checks
Security:                       Least-privilege CI permissions, SHA-pinned actions, no secrets to untrusted PRs, separate environment credentials
Documentation:                  Versioned deployment/migration/rollback/worker/mobile runbooks
```

The next category in dependency order is **Analytics, Product Instrumentation \&
Experimentation**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]:
    https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

[^2]: https://docs.expo.dev/eas-update/runtime-versions/

[^3]: https://supabase.com/blog/supabase-cli-v1-and-admin-api-beta

[^4]:
    https://github.blog/changelog/2021-02-17-github-actions-limit-which-branches-can-deploy-to-an-environment/

[^5]: https://docs.expo.dev/eas-update/rollbacks/

[^6]:
    https://docs.github.com/en/enterprise-server@3.21/actions/how-tos/deploy/configure-and-manage-deployments/create-custom-protection-rules

[^7]: https://docs.expo.dev/eas-update/deployment/

[^8]: https://docs.expo.dev/llms-eas.txt

[^9]: https://github.com/marketplace/actions/supabase-cli-action

[^10]: https://www.youtube.com/watch?v=iCkdtXSeq7A

[^11]: https://docs.honeycomb.io/integrations/github-deployment-protection-rules

[^12]: https://github.com/orgs/community/discussions/65651

[^13]:
    https://github.blog/news-insights/product-news/announcing-github-actions-deployment-protection-rules-now-in-public-beta/

[^14]: https://github.com/github/roadmap/issues/825

[^15]: https://github.com/orgs/supabase/discussions/5049
