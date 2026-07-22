## Category 3 — Secret Management \& Environment Variables

**Recommendation: use `@t3-oss/env-core` (or `@t3-oss/env-nextjs` for Next.js) plus a Standard Schema validator such as Zod in each deployable app for runtime configuration validation; use platform-native secret stores for application runtime; use GitHub Actions environment secrets only for the small number of CI-specific values that cannot use OIDC; and use OIDC wherever a deployment provider supports it.** This remains the best initial architecture because it minimizes secret duplication and operational complexity while enforcing the project’s privacy boundary from day one.[^1][^2][^3]

**Do not select Supabase Vault, Doppler, Infisical, Pulumi ESC, HashiCorp Vault/OpenBao, 1Password Secrets Automation, Bitwarden Secrets Manager, or dotenvx as the universal secret manager at MVP inception.** They are useful in narrower roles, but adding a separate centralized secrets platform before the product has multiple environments, team members, or complex rotation requirements introduces cost and another high-trust vendor without solving an immediate problem. dotenvx may optionally be used to encrypt and load local `.env` files, but it is not a runtime secret store.

## Separate the Problems

“Environment variables” and “secrets” are related but distinct:


| Concern | Definition | Required control |
| :-- | :-- | :-- |
| Public configuration | Values intentionally shipped to a client, such as public API URLs or Clerk publishable keys | Prefix enforcement, schema validation, never label as secret |
| Server configuration | Non-sensitive runtime settings, such as ports, log level, application environment, and feature defaults | Schema validation, environment-specific values |
| Secrets | Credentials or material that grants access: database URLs, OAuth client secrets, signing keys, API keys | Least privilege, restricted storage, rotation, no logs |
| CI deployment credentials | Identity used by GitHub Actions to deploy or read a secret store | Prefer ephemeral OIDC credentials over long-lived stored secrets |
| Database-resident secrets | Secrets used *inside PostgreSQL* or Supabase functions | Supabase Vault only when they must be consumed from the database layer |

A sensitive value must never become a client environment variable. A variable with `NEXT_PUBLIC_`, `EXPO_PUBLIC_`, or equivalent client prefix is deliberately compiled into the client bundle and should be treated as public, even when it looks like a “key.” T3 Env supports explicit client/server schemas and can enforce a required client-prefix convention.[^4][^5]

## Requirements for Life OS

The configuration strategy must support:

- Next.js web, Expo mobile, and the Node/Hono backend in one monorepo.
- Local development, preview, staging, production, test, and CI environments.
- Clerk, Supabase, PowerSync, Google Calendar OAuth, Stripe, Sentry, PostHog, hosting providers, and later object storage.
- Strict separation of browser/mobile-public config from server-only credentials.
- CI/CD without leaking long-lived cloud credentials.
- A policy that personal user content and secrets never appear in logs, analytics, crash reports, committed files, or preview deployments.
- Future team growth without requiring an immediate enterprise secrets-management system.

The project’s existing choice of `@t3-oss/env-core` plus a Standard Schema validator such as Zod is sound because it validates presence, format, and client/server separation at startup rather than permitting a runtime `process.env` failure in production.[^6][^7]

## Environment Validation Options

| Option | Pros | Cons | Decision |
| :-- | :-- | :-- | :-- |
| **`@t3-oss/env-core` + Zod** (or Standard Schema validator) | Typed imports; runtime/build-time validation; client-prefix enforcement; supports transforms/defaults; framework-neutral core package; now supports Standard Schema (Zod, Valibot, ArkType, Typia) and framework presets for Next.js, Vite, WXT, Nuxt[^33] | Requires maintaining schemas; Next.js still needs explicit variable exposure conventions | **Select** |
| Direct `process.env` | Zero dependency; universally understood | Untyped strings; missed/malformed config fails late; easy to expose server values accidentally | Reject |
| Zod only, hand-rolled module | Full flexibility; one fewer abstraction | Rebuilds client/server partitioning and ergonomics already provided by T3 Env | Acceptable fallback, but reject initially |
| `envalid` | Mature environment validation; clear fail-fast model | Less natural alignment with Zod schemas already used throughout Life OS | Reject |
| `convict` | Supports nested config, sources, formats, and configuration layering | Heavier and more configuration-centric than needed for a three-app TypeScript product | Reject |
| `dotenv` only | Familiar local-file loader; Node 20+ has `--env-file` built-in | Loads values but does not validate them or enforce client/server boundaries | Use only as a local loader where framework tooling does not already load `.env`; not a solution itself |
| **`dotenvx`** | Cross-platform `.env` loader; multi-environment; public-key encrypted `.env` files can be committed safely; monorepo-friendly (`-f` directory, multiple private keys)[^34] | No validation/types by itself; requires secure private-key distribution; does not integrate with Vercel/EAS/Railway runtime injection | **Optional local/CI loader**, not a runtime secret store; pair with t3-env |

T3 Env’s core package supports any Standard Schema validator (Zod, Valibot, ArkType, Typia), supports transforms and defaults, and provides a client prefix configuration for values intentionally allowed in client code. It should remain the **single approved way** application code accesses environment variables.[^5][^1] `dotenvx` may be used as an optional loader to decrypt and inject committed encrypted `.env` files into `process.env` before T3 Env validation runs, but it does not replace validation or runtime secret storage.

## Secret Store Options

| Option | Strengths | Limitations | Best Use | Decision |
| :-- | :-- | :-- | :-- | :-- |
| **Platform-native secrets** | Lowest complexity; integrated with deployment; access controls tied to hosting environment; now includes Vercel custom envs/branch vars/sensitive flag, EAS plaintext/sensitive/secret visibility and `eas env:pull`, Railway sealed/shared/reference vars, Fly secret files, Render env groups/secret files[^39][^40][^41][^42][^43] | Values may be duplicated across Vercel, EAS, backend host, Supabase, etc.; no unified rotation | MVP application runtime secrets | **Select** |
| **GitHub Actions secrets/environments** | Native to CI; encrypted; repository/org/environment scope; required reviewers, branch/tag restrictions, wait timers, and custom protection rules available for environment secrets | Long-lived secrets still exist; not a runtime source of truth; log masking is not guaranteed after transformations | CI-only fallbacks and tightly scoped deployment configuration | **Select, limited** |
| **OIDC federation** | Short-lived credentials; no stored cloud access key in GitHub; identity tied to a workflow; supports trust policies on repository, branch, environment, workflow file, and audience; repository custom properties can now be included in OIDC claims[^2] | Provider setup varies; does not replace app runtime config; trust-policy misconfiguration can create broad access | Deployments and cloud access from CI | **Select wherever supported** |
| `dotenvx` | Public-key encrypted `.env` files can be committed; cross-platform loader; multi-environment; monorepo directory support; no third-party secret store needed for local/CI[^34] | No validation/types; private keys must be distributed securely; not a runtime source of truth for deployed apps; does not inject into Vercel/EAS/Railway | Encrypted local/CI `.env` files and commit-safe production envs | **Optional for local dev**; not a universal runtime store |
| Doppler | Polished developer UX; environment hierarchy; broad CI/CD and Vercel/Netlify/Railway integrations; free tier for small teams; secret branching | Cloud-only (no self-host); per-seat pricing; proprietary; dynamic secrets limited to Enterprise; still requires bootstrap identity[^35] | Consider when multi-platform secret duplication becomes costly and SaaS is acceptable | Defer |
| Infisical | MIT-licensed core; cloud or self-hosted; OIDC-based GitHub Actions and machine identities; dynamic secrets; built-in secret leak prevention; secret referencing/versioning | Operational burden if self-hosting; cloud-hosted mode still adds a sensitive vendor; enterprise UI polish behind paid tiers[^35] | Future centralized vault if control/self-hosting or open-source is a priority | Defer |
| HashiCorp Vault | Powerful dynamic secrets, policy system, mature enterprise posture; HCP managed option | BSL 1.1 licence (not OSI open source) since 2023; expensive in people/time; operations-heavy; disproportionate for MVP[^36] | Enterprise / regulated scale | Reject for foreseeable MVP |
| OpenBao | MPL-2.0 fork of Vault; API-compatible; namespaces and horizontal read scalability without Enterprise licence; Linux Foundation governance; no per-token licensing | Younger ecosystem; no first-party managed SaaS; missing some Vault Enterprise features (DR/performance replication, Sentinel)[^36] | Open-source alternative to Vault for self-hosted enterprise use | Reject for MVP; prefer if Vault ever needed |
| AWS/GCP/Azure Secret Manager | Strong IAM integration and rotation options; native to each cloud | Imposes cloud-specific architecture; less compelling with Supabase/Vercel/Expo split hosting | Use only if backend standardizes on that cloud | Defer |
| Pulumi ESC | Centralized YAML environments; composes configs; dynamic OIDC cloud credentials; integrates AWS/GCP/Azure/Vault/1Password; SDKs and `pulumi env run`[^38] | Requires Pulumi Cloud; adds another platform; overkill for a single-product MVP | Centralized config/secrets orchestration across many stacks | Defer |
| Supabase Vault | Encrypted secrets accessible from Postgres; useful for database functions and SQL-side integrations; supports name-based lookup and per-project root keys | Not an application-wide secret manager; database statement logging must be carefully controlled; putting broad application secrets there increases blast radius | Secrets that must be accessed by PostgreSQL/Supabase functions only | Select narrowly |
| 1Password Secrets Automation | Strong human-oriented credential management; service accounts; `op run` CLI; SSH agent and git-signing; Terraform provider | More setup and product surface; not designed for application runtime; cost scales with seats; closed-source[^44] | Possible internal operations / developer machine secret choice | Defer |
| Bitwarden Secrets Manager | Open-source; self-host or cloud; machine accounts; `bws` CLI; separate from password manager; lower cost than 1Password[^44] | Smaller ecosystem than 1Password; self-hosting complexity; separate purchase for Secrets Manager | Open-source alternative to 1Password for internal/CI secrets | Defer |

GitHub lets secrets be scoped at repository, organization, and environment levels; environment secrets can require approval before a job can access them. GitHub encrypts uploaded secrets with Libsodium sealed boxes, but masking in logs is not a complete defense — transformed values can evade redaction.[^3] Environment protection rules now also support branch and tag restrictions, wait timers, and custom deployment protection rules via GitHub Apps.[^37]

GitHub Actions OIDC allows a workflow to exchange a short-lived identity token directly with a compatible cloud provider rather than storing cloud credentials in GitHub. Trust policies should restrict repository, branch/tag, environment, workflow file, and audience; since 2024, organization and enterprise admins can include repository custom properties as OIDC claims for attribute-based access control. This should be the default for deployment access.[^2]

## Best Architecture

### Application runtime: platform-native secrets

Use the target platform’s secret/configuration service for the process actually running the code:


| Runtime | Configuration source | Examples / 2026 notes |
| :-- | :-- | :-- |
| Next.js web on Vercel | Vercel Environment Variables, scoped to Development/Preview/Production and **custom environments**; `--sensitive` hides values in dashboard; branch-specific preview variables available; `vercel env pull` for local verification[^39] | `NEXT_PUBLIC_API_URL`, Clerk publishable key, server-only webhook validation secret if used in web; production secrets must not be shared with Preview |
| Expo mobile builds | EAS Environment Variables with `development`/`preview`/`production` scopes; visibility `plaintext`/`sensitive`/`secret`; account-wide and project-wide variables; `eas env:pull` syncs to local `.env.local`; custom environments on Enterprise plans[^40] | `EXPO_PUBLIC_API_URL`, Clerk publishable key, Sentry DSN; secrets must not use `EXPO_PUBLIC_` prefix |
| Hono backend | Selected backend host’s environment/secret service: Railway shared/reference/**sealed** variables; Fly encrypted vault + secret files; Render environment groups + secret files; generic PaaS env injection[^41][^42][^43] | PostgreSQL connection string, Clerk verification/JWKS config, Google OAuth secret, Stripe secret, PowerSync configuration |
| Supabase / PostgreSQL | Supabase configuration and **Supabase Vault only for database-side secrets**; secrets are encrypted per project and can be referenced by name in FDW options | Database-function credentials, if truly required; disable statement logging when inserting secrets |
| GitHub Actions | GitHub environment secrets only for CI-specific fallbacks; OIDC federation to Vercel/EAS/backend host/cloud where supported | Token to invoke a provider lacking OIDC, release credentials only if unavoidable |

This directly aligns credentials with their runtime and avoids retrieving a deployment-time secret bundle into every environment.

### CI: OIDC first

Use GitHub Actions OIDC for:

- Backend platform deployments, when Railway/Fly.io/Render or the chosen provider supports it.
- Cloud object-storage deployment/configuration if a cloud provider is used.
- Infisical, Doppler, Pulumi ESC, 1Password, or any future dedicated vault, if adopted.
- Vercel and EAS deployments where OIDC-based authentication is supported.

The GitHub workflow receives a short-lived token rather than a static API key. Configure trust policies to restrict **repository, branch/tag, GitHub environment, workflow file, audience, and custom repository properties**. Never grant a generic repository-wide production deploy identity. GitHub documents that OIDC can eliminate the need to store long-lived cloud credentials in GitHub.[^8][^2]

### GitHub secret usage: narrowly scoped fallback

Where OIDC is unavailable, use GitHub **environment** secrets — not generic repository secrets — for staging and production. Require manual approval for production and restrict which branches/tags can target it.

GitHub environments should be:

```text
development       Local only; no GitHub environment
preview           Ephemeral, no production integrations
staging           Shared test services; isolated credentials
production        Protected deployment with required reviewer
```

Do **not** give pull-request preview deployments production Supabase, Clerk, Google OAuth, Stripe, PowerSync, PostHog, or Sentry credentials. Preview should use test projects or omit sensitive integrations.

## Why Not a Central Vault Now?

### Doppler

Doppler remains the strongest polished “centralized SaaS secrets manager” option for small teams. In 2026 it offers deep GitHub Actions, Vercel, Netlify, Railway, and CircleCI integrations, secret branching, and a generous free tier for tiny teams, but it is still cloud-only and proprietary.[^9][^10][^35]

**Pros**

- Excellent local developer onboarding through a CLI (`doppler run -- node server.js`).
- One location for values shared across Vercel, EAS, backend hosting, and CI.
- Environment hierarchy, audit history, rotation workflow, and access controls.
- Broad native integrations reduce manual duplication as environments multiply.
- Generous free tier for very small teams; per-seat pricing beyond it.

**Cons**

- Cloud-only with no self-host option; all secrets live in Doppler’s SaaS.
- Another privileged third party with access to the operational keys for a privacy-first product.
- Cost and workflow dependency before the organization needs it.
- Dynamic secrets are limited to the Enterprise tier.
- CI still needs a secure bootstrap identity to authenticate to Doppler.
- It cannot eliminate the fact that values must ultimately be injected into Vercel, EAS, and backend runtime environments.

**Verdict:** defer. Reassess when the team grows beyond two or three technical contributors, when several deployment environments are active, or when duplicated secrets create a real rotation/audit problem.

### Infisical

Infisical has matured into the leading open-source alternative. Its MIT-licensed core can be self-hosted or used via Infisical Cloud, and it now offers machine identities, dynamic secrets, built-in secret leak prevention, and OIDC-based GitHub Actions support.[^11][^12][^35]

**Pros**

- MIT-licensed core: read, modify, and run on infrastructure you control.
- Cloud-hosted or self-hosted options; self-host is free (you pay with operational effort, not per-seat).
- OIDC integration avoids a static Infisical token in CI.
- Built-in secret leak prevention, dynamic secrets, secret referencing/versioning, and point-in-time recovery.
- Well aligned with the project’s longer-term privacy posture.
- Centralized audit/access controls.

**Cons**

- A self-hosted instance itself becomes sensitive infrastructure requiring backups, upgrades, monitoring, access control, and incident response.
- Cloud-hosted mode still adds a sensitive vendor.
- Enterprise UI polish and some features are behind paid tiers.
- Excessive operational complexity before the MVP has product-market validation.

**Verdict:** defer. It is the preferred future centralized-vault candidate if the product later needs centralization *and* makes self-hosting/control or open-source licensing a strategic priority.

### Supabase Vault

Supabase Vault is a Postgres extension/UI for storing encrypted secrets.  It is useful for secrets consumed by database-native code but should not become the central source for application secrets.[^13]

**Pros**

- Integrated with the database environment.
- Appropriate for a SQL function or Supabase-native process that genuinely needs a credential.
- Avoids transmitting that value through unrelated application processes.

**Cons**

- It does not distribute configuration to Next.js, Expo, backend host, or CI.
- The Vault project warns that inserting secrets while statement logging is enabled can expose plaintext in logs; statement logging must be controlled before using it.[^14]
- Concentrating all application credentials inside the primary user-data database creates an unnecessary risk coupling.

**Verdict:** retain as a **database-local tool only**, with a narrow policy and explicit database logging safeguards.

### dotenvx

`dotenvx` is the 2026 evolution of `dotenv`: a CLI that loads, combines, and encrypts `.env` files. It lets a team commit encrypted `.env.production` files to Git and decrypt them at runtime with a private key.[^34]

**Pros**

- Encrypted `.env` files can be committed safely, reducing “works on my machine” drift.
- Cross-platform, monorepo-friendly (`-f` directory, multiple private keys), and supports multiple environments.
- From the creator of `dotenv`; widely used and actively maintained.

**Cons**

- Provides loading/encryption, not validation or type safety — it must be paired with T3 Env.
- Private keys become a high-value secret that must be distributed and rotated outside the repo.
- Does not inject secrets into Vercel, EAS, Railway, Fly, or Render runtime; at best it can populate `process.env` in local/CI runs.
- Adds operational overhead for a single-developer/small-team MVP.

**Verdict:** optional for local development and CI if you want commit-safe encrypted `.env` files; not a universal runtime secret store and not a replacement for platform-native secrets or T3 Env.

### Pulumi ESC

Pulumi ESC (Environments, Secrets, and Configuration) is a centralized YAML-based service for composing secrets and configuration. It can issue short-lived OIDC credentials and pull secrets from AWS/GCP/Azure/Vault/1Password.[^38]

**Pros**

- Composable environments reduce duplication across apps and environments.
- Can issue short-lived OIDC credentials for cloud providers and pull secrets from existing vaults.
- Versioned, auditable, and accessible via CLI, SDKs, and REST API.

**Cons**

- Adds Pulumi Cloud as a dependency and another high-trust third party.
- Overkill for a single-product MVP with a few deployables; YAML configuration and learning-curve overhead.
- Not a native runtime source for Vercel/EAS/Expo/mobile; requires SDK or CLI injection.

**Verdict:** defer. Consider only if the project already uses Pulumi Cloud or grows to many environments/stacks.

### OpenBao

OpenBao is the Linux Foundation MPL-2.0 fork of HashiCorp Vault, created after Vault moved to BSL 1.1. It is API-compatible with Vault and now includes namespaces and horizontal read scalability without an Enterprise licence.[^36]

**Pros**

- Genuine OSI-approved open-source licence and vendor-neutral governance.
- Dynamic secrets, PKI, database engines, Kubernetes auth, and lease management.
- No per-token licensing; self-hostable.

**Cons**

- Requires significant operational expertise (HA, unseal/auth backends, monitoring).
- Younger ecosystem than Vault; no first-party managed SaaS.
- Overkill for an MVP that does not need dynamic credentials or multi-tenant policy engines.

**Verdict:** reject for the MVP. If a Vault-style dynamic-secrets architecture ever becomes necessary, prefer OpenBao over Vault on licence grounds.

### 1Password and Bitwarden Secrets Managers

Both are human-oriented password-manager ecosystems with machine-secret add-ons (1Password Secrets Automation / service accounts; Bitwarden Secrets Manager / machine accounts). They excel at developer-machine and CI secret injection.[^44]

**Pros**

- 1Password has a polished CLI (`op run`), SSH agent, service accounts, and broad integrations.
- Bitwarden is open-source, self-hostable (or via Vaultwarden), and lower-cost.
- Strong for human + machine access to shared credentials, TLS keys, and developer onboarding.

**Cons**

- Not designed as application runtime secret stores for Vercel/EAS/serverless.
- Cost scales with seats/machines; 1Password is closed-source, Bitwarden Secrets Manager is a separate paid product.
- Do not solve cross-platform runtime injection or rotation for Next.js/Expo/backend deployments.

**Verdict:** defer for application runtime; use only for internal team/operations secrets or developer-machine secret distribution.

## Configuration Package Design

Create `packages/config` for **shared schemas, conventions, and helpers**, but do not create one universal environment module imported by every runtime. Next.js, Expo, and Node have different bundling and client-exposure semantics.

```text
packages/config/
  src/
    env/
      common.ts           # Shared schema primitives and helpers only
      names.ts            # Canonical variable names; no values
      validation.ts       # Shared URL/key/boolean validation rules
apps/
  backend/src/env.ts      # @t3-oss/env-core
  web/src/env.ts          # @t3-oss/env-nextjs or core configured for Next
  mobile/src/env.ts       # @t3-oss/env-core, Expo public-prefix policy
```

Each app should export exactly one `env` object. All code imports from that object; no application code reads `process.env` directly.

### Required variable naming

| Scope | Prefix / form | Example |
| :-- | :-- | :-- |
| Backend-only secret or config | No public prefix | `DATABASE_URL`, `GOOGLE_CLIENT_SECRET` |
| Next.js browser-exposed config | `NEXT_PUBLIC_` | `NEXT_PUBLIC_API_URL` |
| Expo browser-exposed config | `EXPO_PUBLIC_` | `EXPO_PUBLIC_API_URL` |
| CI-only secret | Never copied into app `.env` by default | `DEPLOYMENT_TOKEN` |
| Shared semantic variable | Same meaning, runtime-specific prefix only where public | Backend: `API_BASE_URL`; web: `NEXT_PUBLIC_API_BASE_URL`; mobile: `EXPO_PUBLIC_API_BASE_URL` |

There is no safe “secret” that can be embedded in an Expo or browser bundle. Clerk publishable keys and Sentry DSNs are acceptable client configuration only because their security model treats them as public identifiers; all privileged keys must remain server-only.

## Validation Standard

Each application must fail at startup for missing, malformed, or environment-inappropriate configuration.

```ts
// apps/backend/src/env.ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "staging", "production"]),
    DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
});
```

T3 Env supports typed validation and allows server values to be separated from explicitly prefixed public values.  Validation should run before the application starts accepting traffic, before jobs begin processing, and before migrations execute.[^4][^5]

## Local Development Rules

- Commit `.env.example` for each app, containing variable names, comments, and harmless placeholders only.
- Never commit `.env`, `.env.local`, `*.pem`, service-account JSON, provisioning profiles, or OAuth secrets.
- Use each developer’s local `.env` files or the local platform CLI’s environment mechanism.
- Provide test-only local credentials and mocked integrations whenever possible.
- Use a distinct Supabase project/database and distinct Clerk, Google OAuth, Stripe, Sentry, and PostHog projects for development/staging vs. production.
- Disable production side effects by default outside production: payments, customer emails, push notifications, and external calendar writes.
- For Google Calendar development, use development OAuth credentials and test accounts; never share a production refresh token.


## Secret Handling Rules

- Never log raw request headers, authorization tokens, cookies, OAuth code exchanges, external webhook payloads, database URLs, or environment objects.
- Never interpolate secrets into errors.
- Never pass the whole `process.env` to a package, worker, error reporter, test snapshot, client bundle, or subprocess.
- Use separate OAuth client registrations for development, staging, and production.
- Rotate any secret immediately after it is exposed to a commit, terminal recording, support ticket, CI output, analytics event, or error-monitoring payload.
- Use least-privilege keys: read-only calendar OAuth scope, restricted Stripe webhook keys, narrowly scoped storage credentials, and environment-specific database credentials.
- Test production secret access and rotation as an operational runbook before public launch.


## Decision Matrix

| Capability | Platform native | GitHub secrets | dotenvx | Doppler | Infisical | Pulumi ESC | OpenBao | Supabase Vault | 1Password / Bitwarden |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| App runtime injection | Excellent | Poor | Poor | Good | Good | Good | Good | Database-only | Poor |
| Local development | Moderate | Poor | Excellent | Excellent | Good | Good | Moderate | Poor | Good |
| CI integration | Moderate | Good | Good | Excellent | Excellent | Excellent | Moderate | Poor | Good |
| OIDC support | Provider-dependent | Issuer, not vault | No | Depends on setup | Strong | Strong | Strong | Not applicable | Service-account |
| Self-host option | No | No | Yes | No | Yes | No | Yes | In Supabase environment | Bitwarden only |
| MVP operational cost | Low | Low | Low | Medium | Medium–high | Medium | High | Low | Medium |
| Fit as universal source | Moderate | No | Moderate (local/CI) | Good later | Good later | Good | Good | No | No |
| MVP decision | **Use** | **Use narrowly** | Optional | Defer | Defer | Defer | Reject | **Use narrowly** | Defer |

## Final Decision

Lock this configuration and secret-management policy:

```text
Validation:             @t3-oss/env-core (or @t3-oss/env-nextjs) + Standard Schema validator (Zod), per deployable app
Runtime access:         Import app-specific `env`; never read process.env elsewhere
Client safety:          Explicit NEXT_PUBLIC_ / EXPO_PUBLIC_ schemas only
Runtime secret storage: Native secret/environment facility of each hosting platform (Vercel, EAS, Railway/Fly/Render, Supabase config)
CI authentication:      GitHub Actions OIDC wherever provider support exists (restrict repository/branch/environment/workflow/audience/properties)
CI secret fallback:     GitHub Environment secrets, protected and least-privilege
Database-local secrets: Supabase Vault only when PostgreSQL/Supabase code needs them
Centralized vault:      Defer; evaluate Infisical first if/when centralization is needed; Doppler as a SaaS alternative; Pulumi ESC only if already on Pulumi Cloud; 1Password/Bitwarden for developer/operations secrets only
Open-source Vault alt:  Defer/OpenBao if Vault-style dynamic secrets ever become necessary
Local files:            Gitignored per-app .env files plus committed .env.example templates; optional encrypted `.env*.encrypted` via dotenvx with private keys in a password manager
```

The next category in the dependency order is **CI/CD Pipeline**.
<span style="display:none">[^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32]</span>

<div align="center">⁂</div>

[^1]: https://env.t3.gg/docs/introduction

[^2]: https://docs.github.com/en/actions/concepts/security/openid-connect

[^3]: https://docs.github.com/en/actions/concepts/security/secrets

[^4]: https://github.com/t3-oss/t3-env

[^5]: https://env.t3.gg/docs/standard-schema

[^6]: 14-Dependencies-Tooling-Third-Party-Platforms.md

[^7]: 12-Development-Practices.md

[^8]: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-cloud-providers

[^9]: https://docs.doppler.com/docs/github-actions

[^10]: https://www.doppler.com/blog/doppler-secrets-setup-guide

[^11]: https://github.com/Infisical/secrets-action

[^12]: https://infisical.com/docs/integrations/cicd/githubactions

[^13]: https://supabase.com/docs/guides/database/vault

[^14]: https://github.com/supabase/vault

[^15]: https://env.t3.gg/docs/customization

[^16]: https://github.com/t3-oss/t3-env/blob/main/packages/core/package.json

[^17]: https://create.t3.gg/en/usage/env-variables

[^18]: https://www.doppler.com/blog/managing-secrets-ci-cd-environments-github-actions-advanced-techniques

[^19]: https://create.t3.gg/uk/usage/env-variables

[^20]: https://spin.atomicobject.com/type-safe-variables-t3-env/

[^21]: https://env.t3.gg/docs/recipes

[^22]: https://www.doppler.com/blog/real-time-rbac-for-secrets

[^23]: https://qiita.com/re_2osushi8888/items/436f94f80ba67ff3d0b0

[^24]: https://fossies.org/linux/supabase/apps/www/_blog/2022-08-19-supabase-vault.mdx

[^25]: https://docs.github.com/de/actions/concepts/security/openid-connect

[^26]: https://github.com/github/roadmap/issues/249

[^27]: https://docs.github.com/actions/security-guides/using-secrets-in-github-actions

[^28]: https://www.packtpub.com/en-PT/product/building-production-grade-web-applications-with-supabase-9781837630684/chapter/chapter-12-avoiding-unwanted-data-manipulation-and-undisclosed-exposures-16/section/benefiting-from-supabase-vault-ch16lvl1sec12

[^29]: https://developer.hashicorp.com/well-architected-framework/secure-systems/secure-applications/ci-cd-secrets/github-actions

[^30]: https://supabase.com/docs/guides/database/extensions/pgsodium

[^31]: https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect

[^32]: https://docs.github.com/en/code-security/how-tos/secure-your-secrets

[^33]: https://env.t3.gg/docs/customization

[^34]: https://dotenvx.com/docs/monorepos/turborepo

[^35]: https://wetheflywheel.com/en/comparisons/infisical-vs-doppler/

[^36]: https://wetheflywheel.com/en/comparisons/openbao-vs-hashicorp-vault/

[^37]: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

[^38]: https://www.pulumi.com/docs/esc/

[^39]: https://vercel.com/docs/environment-variables

[^40]: https://docs.expo.dev/eas/environment-variables/

[^41]: https://docs.railway.com/variables and https://docs.railway.com/guides/managing-secrets-on-railway

[^42]: https://fly.io/docs/apps/secrets/

[^43]: https://render.com/docs/configure-environment-variables.md

[^44]: https://pickuma.com/for-dev/1password-vs-bitwarden-2026-developers/
