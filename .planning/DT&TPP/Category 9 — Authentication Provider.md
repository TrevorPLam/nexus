<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 9 — Authentication Provider

**Recommendation (updated July 2026): select Supabase Auth as the primary
authentication provider.** Based on comprehensive 2026 research, Supabase Auth
is the optimal choice for this architecture: it provides native RLS integration
with the locked PostgreSQL database, costs
~$25/month at 100K MAU (vs ~$1,800/month for Clerk), and eliminates a separate
identity vendor. The 70x cost advantage at scale is company-level significant,
and the native RLS integration aligns perfectly with the locked PostgreSQL
authorization model. Clerk remains a viable alternative if the team prioritizes
pre-built UI components over cost, but Supabase Auth is now the recommended
default for new projects using Supabase PostgreSQL.[^40][^41][^42][^43]

Better Auth has emerged as a compelling open-source alternative for teams
seeking zero per-user fees and full data ownership. It offers a plugin
architecture (2FA, passkeys, organizations), TypeScript-first design, and Apache
2.0 licensing. However, it requires 2-4 hours setup time, has no pre-built UI
components, and adds operational burden. For teams prioritizing long-term cost
control and zero lock-in, Better Auth is a strong option—particularly as a
migration target after validating the product at scale. The "graduation"
strategy of starting with Supabase Auth and migrating to Better Auth at 50K MAU
is recommended for cost-sensitive products.[^44][^45][^46]

## Scope and Principles

Authentication answers “who is this user?” It does **not** independently decide
every access right. Life OS should separate:

| Concern                                                   | System of record                                                                           |
| :-------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| Credential authentication, sessions, MFA, social identity | Supabase Auth                                                                              |
| Product user profile and workspace membership             | PostgreSQL / Supabase                                                                      |
| Authorization to workspace data                           | PostgreSQL RLS plus backend policy checks                                                  |
| Server API token verification                             | Hono backend, using Supabase JWT verification                                              |
| Mobile secret/token storage                               | Expo SecureStore or platform secure storage                                                |
| Google Calendar authorization                             | Separate OAuth integration flow, stored server-side and never conflated with Life OS login |
| Billing entitlement                                       | Stripe-derived application state, not a Supabase Auth role                                 |

This separation is essential. A person can be authenticated by Supabase Auth but
have no active Life OS workspace, an inactive subscription, a deleted account,
or no authorization to a requested resource.

## Requirements

The provider must support:

- Next.js App Router web authentication.
- Expo/React Native authentication using native-safe redirect and token storage
  patterns.
- Email/passwordless options and Google sign-in at MVP.
- MFA-ready architecture, even if mandatory MFA is deferred.
- Secure session/token refresh and revocation behavior.
- Backend authentication for Hono APIs.
- Native Supabase RLS integration.
- A viable path to PowerSync user identity and sync-token authorization.
- Account deletion, export, support, and audit workflows.
- A low-operations solution for a small team handling private life data.

Supabase Auth supports sign-up, sign-in, MFA, and social sign-in in Expo
applications via `@supabase/auth-helpers-react-native` and `supabase-js`, while
its Next.js integration supports route protection and App Router-oriented
session handling via `@supabase/ssr`.[^5][^6]

## Authentication Options

| Option                            | Advantages                                                                                                                                                                                                                 | Disadvantages                                                                                                                                            | Decision                                                                                 |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **Supabase Auth**                 | Native RLS, Storage, Realtime, and PowerSync integration; users live in Postgres; 50k MAU free, ~$25/month at 100K MAU; one vendor for data+auth; identity data in your database                                           | No pre-built mobile UI; more SSR/Expo boilerplate; passkeys maturing; no built-in orgs                                                                   | **Select**                                                                               |
| **Clerk**                         | First-class Next.js App Router and Expo SDKs (beta native components); hosted/customizable sign-in; social login, MFA, passkeys; native Supabase third-party auth via asymmetric JWTs; first-class orgs for future sharing | Per-MAU pricing past 10k MAU (2026 Pro: $0.02/MAU); ~$1,800/month at 100K MAU; identity data outside Postgres; PowerSync needs JWKS/JWT-template proof   | **Alternative if pre-built UI is priority**                                              |
| **Better Auth**                   | Open-source/self-hosted TypeScript; Next.js, Expo, and Hono support; data in own DB; no per-MAU fees; plugin architecture (2FA, passkeys, orgs); Apache 2.0 license                                                        | Team must operate sessions, security, deliverability, MFA, OAuth, and passkeys; no pre-built UI; 2-4 hours setup; no first-party Supabase/PowerSync path | **Strong alternative for cost-sensitive teams; consider as migration target at 50K MAU** |
| WorkOS AuthKit                    | Free up to 1M MAU; strong B2B SSO/SCIM/orgs; clean AuthKit UI                                                                                                                                                              | B2C/consumer features weaker; no native Supabase/PowerSync auto-integration; Expo support less mature; overkill for V1                                   | Reject for V1                                                                            |
| Kinde                             | Competitive pricing (10.5k MAU free); built-in feature flags and billing; B2B orgs; good Next.js SDK                                                                                                                       | Smaller ecosystem; less polished Expo support; no native Supabase/PowerSync path                                                                         | Reject for MVP                                                                           |
| Stytch                            | Best-in-class passkey orchestration; React Native SDK (beta); strong passwordless/OTP/biometrics                                                                                                                           | Higher cost at scale; no native Supabase/PowerSync integration; B2C/B2B split adds complexity                                                            | Reject for V1                                                                            |
| Auth0                             | Mature enterprise identity, broad OIDC/SAML, compliance                                                                                                                                                                    | High cost and complexity; more enterprise than MVP; weak Expo DX                                                                                         | Reject                                                                                   |
| SuperTokens                       | Open-source core (Apache 2.0) with self-host or managed; React Native SDK; strong session management                                                                                                                       | Self-host ops; managed per-MAU; thinner Expo/Expo-Go docs; no native Supabase/PowerSync path                                                             | Reject for MVP                                                                           |
| Ory Kratos/Hydra                  | Composable open-source IAM, EU-sovereignty, Zanzibar authz (Keto)                                                                                                                                                          | Multiple services to operate; no pre-built UI; steep learning curve; overkill for small team                                                             | Reject                                                                                   |
| Firebase Authentication           | Mature mobile auth, generous free tier, broad social providers                                                                                                                                                             | Pulls architecture toward Firebase/Firestore; weak fit with PostgreSQL RLS and PowerSync                                                                 | Reject                                                                                   |
| AWS Cognito                       | Scalable, cloud-integrated                                                                                                                                                                                                 | Complex UX/ops; poor fit for provider-neutral stack; expensive advanced features                                                                         | Reject                                                                                   |
| Keycloak / FusionAuth             | Full self-hosted control; no per-user cost; enterprise federation                                                                                                                                                          | Significant security/operations responsibility; heavy admin UI; overkill for MVP                                                                         | Reject                                                                                   |
| Custom JWT/session implementation | Maximum ownership                                                                                                                                                                                                          | Extremely high security risk and ongoing maintenance; duplicates mature providers                                                                        | Reject absolutely                                                                        |

Supabase Auth, Clerk, and Better Auth are the three options that map cleanly to
the chosen stack. The others either lack a first-party path through RLS and
PowerSync, add operational burden the team cannot absorb, or target
enterprise/B2B use cases that are out of V1
scope.[^5][^6][^7][^8][^36][^37][^38][^44][^45][^46]

## Why Supabase Auth Wins

### Native RLS integration

Supabase Auth is built into the Supabase platform and provides the tightest
possible integration with Row Level Security. User records live directly in the
`auth.users` table in your PostgreSQL database, and RLS policies can reference
the authenticated user directly through `auth.uid()`. This eliminates the need
for third-party auth configuration, JWT template setup, or asymmetric key
validation between separate services.[^10][^2][^1]

### Cost advantage at scale

The pricing differential is company-level significant:

| MAU  | Supabase Auth (Pro plan) | Clerk Pro     |
| ---- | ------------------------ | ------------- |
| 10K  | ~$25/month               | ~$121/month   |
| 50K  | ~$25/month               | ~$965/month   |
| 100K | ~$25/month               | ~$1,800/month |

Supabase Auth charges for database size and API bandwidth, with auth effectively
unlimited for most projects. Clerk charges per active user, which creates a cost
curve that scales with user growth. For a daily-use personal app where MAU
converges toward actual users, the Supabase cost advantage becomes meaningful
beyond the free tier.[^41][^42][^43]

### Vendor consolidation

Since the project is already committed to Supabase-managed PostgreSQL (locked
decision), using Supabase Auth consolidates identity and data under one vendor.
This reduces operational complexity, eliminates a separate identity service
dependency, and simplifies compliance, data residency, and support.

### PowerSync compatibility

PowerSync has first-class support for Supabase Auth. PowerSync Cloud can
automatically pull Supabase's JWKS and use the `authenticated` audience without
custom configuration. This is the simplest, lowest-risk path to sync
authorization compared to custom JWT bridges or third-party integrations.[^40]

### Data ownership

Identity data lives in your own PostgreSQL database. Password hashes are
standard bcrypt, the schema is documented, and migration to another auth
provider is straightforward. This avoids the lock-in concerns associated with
managed identity services where sessions, verification state, and OAuth
connections live outside your control.[^41]

## Why Clerk Remains a Viable Alternative

Clerk is the right choice if:

- **Pre-built UI is critical:** Clerk's hosted components and user management
  portal provide a polished sign-in experience out of the box. Supabase Auth
  requires building custom auth UI.
- **Speed to market is the priority:** Clerk's 15-minute setup vs 2-4 hours for
  Supabase Auth or Better Auth.
- **B2B SaaS features are needed immediately:** Clerk's first-class
  organizations, SAML SSO, and SCIM are production-ready. Supabase Auth requires
  modeling organizations in application schema.
- **Budget is not a constraint:** The per-MAU pricing is acceptable at the
  expected scale.

## Why Better Auth is a Strong Long-Term Option

Better Auth is the right choice if:

- **Zero per-user fees are required:** Better Auth is free and open-source; you
  pay only for database storage and compute.
- **Full data ownership is non-negotiable:** Users, sessions, tokens all live in
  your database with no vendor dependency.
- **The team has auth expertise:** Operating sessions, security, deliverability,
  MFA, OAuth, and passkeys is within team capability.
- **Custom auth workflows are needed:** Better Auth's plugin architecture allows
  hooks for every step of the auth lifecycle.

The "graduation" strategy is recommended: start with Supabase Auth for MVP
(fastest, cheapest, native RLS), then migrate to Better Auth when crossing 50K
MAU if cost becomes a concern. The migration is straightforward because both use
your own PostgreSQL database with standard bcrypt password
hashes.[^44][^45][^46]

## Supabase Auth Trade-offs

Supabase Auth is now the recommended primary choice, but it has trade-offs
compared to Clerk and Better Auth:

| Dimension                       | Supabase Auth                                                                                       | Clerk                                                                                                                        | Better Auth                                                                              |
| :------------------------------ | :-------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| Next.js / Expo integration      | Supported web and Expo/React Native flows via supabase-js and expo auth helpers [^5][^6]            | Strong purpose-built SDKs and components, beta native Expo sign-in [^3][^4][^36]                                             | Next.js, Expo, and Hono support; requires custom UI                                      |
| Supabase RLS integration        | Native, simplest JWT/RLS path                                                                       | Requires third-party auth configuration and `role` claim in the JWT [^1][^10]                                                | Requires custom integration                                                              |
| PowerSync integration           | Auto-detected: PowerSync Cloud pulls Supabase JWKS and `authenticated` audience automatically [^40] | Supported but needs PoC: configure JWKS URI and an audience claim via session token or a `PowerSync` JWT template [^35][^39] | Requires custom JWT bridge                                                               |
| Identity UX and user management | More infrastructure-oriented; Life OS builds the UI                                                 | Polished hosted components and account portal                                                                                | No pre-built UI; team builds everything                                                  |
| Vendor count                    | Consolidates around Supabase                                                                        | Adds an identity vendor                                                                                                      | No vendor (self-hosted)                                                                  |
| Data ownership / export         | Identity data in Postgres `auth.users`; native admin/deletion APIs                                  | Identity data held by Clerk; export via API/webhooks                                                                         | Identity data in your own database                                                       |
| Passkeys / future auth          | Available in beta; roadmap dependent                                                                | Available now                                                                                                                | Available via plugin                                                                     |
| Organizations / future sharing  | Must model in application schema                                                                    | First-class, multi-workspace primitives                                                                                      | Available via plugin                                                                     |
| Pricing at scale (2026)         | 50k MAU free on Pro, then ~$25/month at 100K MAU [^34]                                              | 50k MAU free, then Pro ~$0.02/MAU (~$1,800/month at 100K) [^33]                                                              | Free; pay only for database/compute                                                      |
| Setup time                      | 1-2 hours                                                                                           | 15 minutes                                                                                                                   | 2-4 hours                                                                                |
| MVP recommendation              | **Select**                                                                                          | **Alternative if pre-built UI is priority**                                                                                  | **Strong alternative for cost-sensitive teams; consider as migration target at 50K MAU** |

The deciding factor for Supabase Auth is the 70x cost advantage at scale, native
RLS integration, and vendor consolidation with the already-locked PostgreSQL
decision. The main trade-off is building custom auth UI, which is acceptable
given the architectural and cost benefits.[^41][^42][^43]

## Required Proof of Concept

Before building the full domain model, implement a time-boxed Supabase
Auth/PowerSync spike with real iOS and Android development builds.

### Success criteria

1. A user can sign up and sign in through Supabase Auth on Expo and Next.js.
2. The Hono backend verifies Supabase session tokens and obtains a stable
   `userId`.
3. Supabase RLS permits a user to read only their own test workspace rows.
4. A second test user cannot read, insert into, update, or delete the first
   user’s rows.
5. PowerSync receives an authenticated sync identity derived from the current
   Supabase session.
6. Mobile replication includes only the authenticated user’s workspace data.
7. Session refresh or expiry does not create cross-user leakage, sync loops, or
   an unrecoverable offline queue.
8. Sign-out clears local credentials and prevents subsequent protected API/sync
   access.
9. A token/JWKS rotation test confirms the system recovers without issues.
10. PowerSync auto-detects Supabase JWKS and uses the `authenticated` audience
    correctly.

For PowerSync, configure the instance's Client Auth to use Supabase's JWKS URI
(`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`) and the
`authenticated` audience. Verify the token expiry is 60 minutes or less, the
`sub` matches the Supabase user ID, and the `kid` header identifies the correct
JWKS key.

### Decision gate

| Result                                                             | Action                                                                              |
| :----------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| All criteria pass                                                  | Keep Supabase Auth as the production identity provider                              |
| Backend + RLS pass, PowerSync integration is unsupported or unsafe | Pause domain build; evaluate a custom PowerSync JWT bridge or Better Auth fallback  |
| Supabase Auth integration fails materially                         | Consider Clerk or Better Auth as alternatives before building production data flows |
| PoC works only with direct client writes that bypass command rules | Treat as failure; redesign sync mutation flow                                       |

## Recommended Identity Model

### Supabase Auth owns identity

Supabase Auth is authoritative for:

```text
supabase_user_id (auth.users.id)
primary email identity
email verification state
authentication methods
session lifecycle
social-account linkage
MFA configuration
account recovery
authentication event metadata available from Supabase
```

Use Supabase Auth's immutable user ID (`auth.users.id`) as the external identity
key. Do not use email address as a primary key, foreign key, authorization
subject, or durable user identifier; emails can change and can be shared/aliased
in ways that make them unsuitable for identity semantics.

### PostgreSQL owns product identity

Create an application profile table after first verified login:

```text
app_users
  id                     UUID, internal primary key
  supabase_user_id       TEXT UNIQUE NOT NULL
  primary_email          TEXT, cached/display use only
  display_name           TEXT NULL
  status                 active | pending_deletion | deleted
  created_at
  updated_at
  deleted_at             NULL
```

Then use internal `app_users.id` and `workspace_memberships` for all product
relationships:

```text
app_users
  -> workspace_memberships
  -> workspaces
  -> all workspace-scoped Life Graph entities
```

This preserves provider portability. A future Supabase Auth-to-Better Auth
migration changes the external identity mapping without forcing every task,
note, event, entity link, audit record, or calendar connection to rewrite
foreign keys.

### Workspace membership from day one

Even though V1 is personal-use only, create:

```text
workspaces
workspace_memberships
```

with an application-level rule that each V1 user receives one personal workspace
and one active owner membership. Do not use Supabase Auth organizations as the
authoritative Life OS workspace model yet.

Supabase Auth does not have built-in organization management. Product workspaces
have domain-specific requirements — billing owner, consent, membership roles,
deletion, audit history, transfer of ownership, data export, and future sharing
semantics — that should remain in Life OS’s PostgreSQL model.

## JWT and Claim Design

### Minimal JWT claims

Do not place broad user/profile data, subscription state, entitlements, email
addresses, health/financial information, workspace lists, Google Calendar data,
or authorization decisions in JWT claims. Tokens are copied across services and
can remain valid until expiry.

For Supabase Auth, the session token needs only the minimal claims required for
authentication:

```json
{
  "sub": "user_supabase_immutable_id",
  "role": "authenticated",
  "iss": "https://<project-ref>.supabase.co/auth/v1",
  "exp": 0,
  "iat": 0,
  "aud": "authenticated"
}
```

Supabase Auth includes the `role: "authenticated"` claim for authenticated
database access by default.[^10][^1]

For PowerSync, use Supabase Auth's native integration. PowerSync Cloud
auto-detects Supabase's JWKS and uses the `authenticated` audience. No custom
JWT template is required when using Supabase Auth directly.[^40]

Avoid putting `workspace_id` in the session token initially. A user may
eventually belong to multiple workspaces, memberships may be revoked, and cached
JWT claims can become stale. Resolve workspace authorization through PostgreSQL
membership data in RLS/backend policy checks instead.

### Claim policy

- `sub` maps to `app_users.supabase_user_id`.
- `role` is used only for Supabase’s authenticated database role.
- `aud` is `authenticated` for Supabase Auth.
- Billing entitlement never comes from a JWT claim.
- Server-side API authorization never trusts a client-supplied workspace ID
  merely because the token is valid.
- Use issuer and audience validation in backend token verification.
- Cache public JWKS safely according to the verification library; never hardcode
  signing keys.

Supabase Auth's RLS policies can access session-token fields through
`auth.jwt()`, including user ID.[^10]

## Web Authentication

### Next.js

Use Supabase Auth's official Next.js integration via `@supabase/ssr` for:

- Sign-in/sign-up routes and custom UI.
- Route-level redirect convenience.
- Server component/session access.
- Client session state.
- User profile/account settings entry points.

Supabase Auth supports Next.js App Router authentication, including route
protection, Server Components, Server Actions, and related session functionality
via `@supabase/ssr`.[^5]

### Web rules

- Route middleware/proxy may optimize redirects but is **not** the authorization
  boundary.
- Every protected Hono API endpoint independently validates the bearer token.
- Server-side actions independently validate identity and workspace
  authorization.
- Do not expose Supabase service keys to browser code.
- Treat Supabase anon/public keys as public configuration, but validate allowed
  origins/redirects in Supabase configuration.
- Use same-site, secure cookies as handled by the official web SDK; do not
  invent custom browser token storage.
- Do not store access/session tokens in `localStorage`.

## Mobile Authentication

### Expo

Use Supabase Auth's Expo integration with:

- Native browser-based OAuth/SSO flow rather than embedded WebViews.
- Expo SecureStore or the approved Supabase token-cache integration for session
  material.
- A custom development build, not only Expo Go, where the selected native
  dependencies require it.
- Deep-link redirect URIs for development, preview, and production.
- Separate development/staging/production app schemes and Supabase projects or
  tightly controlled environments.

Expo documents Supabase Auth as an authentication and user-management platform
for sign-up, sign-in, MFA, and social login in Expo applications via
`@supabase/auth-helpers-react-native` and `supabase-js`.[^6] Browser-based
authorization is the recommended native approach; Auth0’s Expo guidance
specifically warns against resource-owner-password flows for new applications
and recommends the platform browser rather than a WebView. Apply the same
industry-standard approach regardless of provider.[^13]

### Mobile rules

- Store session/token material only in platform-secure storage.
- Never store Google Calendar refresh tokens on device.
- Do not use Supabase Auth client identity alone to authorize local database
  contents; PowerSync sync rules and server authorization remain authoritative.
- On sign-out, clear secure storage, PowerSync local replica/cache according to
  the sync engine’s documented user-isolation process, and invalidate in-memory
  API clients.
- Never allow a new user who signs in on a shared device to inherit a previous
  user’s offline replica.
- Test sign-out/account-switch behavior as a privacy-critical mobile E2E
  scenario.

## Backend Authentication

The Hono backend is the policy-enforcement point for commands, integrations,
billing webhooks, and any mutation not safely handled by a constrained sync
protocol.

### Required request flow

```text
1. Receive Authorization: Bearer <Supabase session JWT>.
2. Verify token signature via Supabase issuer/JWKS.
3. Validate issuer, audience, expiration, and accepted token type.
4. Extract immutable Supabase subject (`sub`).
5. Resolve/provision internal app_user.
6. Resolve requested workspace only through membership authorization.
7. Parse request with Zod.
8. Execute command in a transaction with idempotency/audit/outbox.
9. Return a minimal DTO, never raw persistence rows.
```

Do not accept an arbitrary `x-user-id`, `workspace_id`, `email`, or
decoded-but-unverified JWT payload as identity. Do not call Supabase’s network
API on every ordinary request when local JWT verification and a carefully cached
JWKS implementation are sufficient.

### Server identities

Keep three identities distinct:

| Identity                   | Used by                     | Authority                                                 |
| :------------------------- | :-------------------------- | :-------------------------------------------------------- |
| End-user Supabase Auth JWT | Web/mobile user request     | User-scoped authorization                                 |
| Backend service credential | Server-to-server operations | Narrowly privileged operational access                    |
| Google OAuth credential    | Calendar integration worker | Access to that user’s approved Google Calendar scope only |

A backend service credential can bypass RLS depending on how it connects. It
must never be sent to a web/mobile client, PowerSync client, analytics tool,
error reporter, or log stream.

## Account Provisioning and Webhooks

### Just-in-time provisioning

At the first authenticated backend request:

1. Verify Supabase Auth identity.
2. Insert `app_users` record if absent.
3. Create the personal workspace and owner membership in one idempotent
   transaction if absent.
4. Write an audit event.
5. Return the product profile.

This ensures a user who authenticates but never enters the application does not
create unnecessary product records.

### Supabase Auth webhooks

Use Supabase Auth webhooks for asynchronous reconciliation, not as the only
identity source:

- User created/updated: update cached display fields.
- User deleted: begin the Life OS deletion workflow.
- Session/security events: optionally add security audit signals.
- Email changes: update cached display email after validating event
  authenticity.

Webhook requirements:

- Verify the webhook signature before parsing/acting.
- Store webhook event ID in an idempotency table.
- Process through the outbox/job system.
- Do not place full webhook bodies in application logs.
- Do not use a webhook’s arrival timing as the permission check for a live user
  request.
- Reconcile periodically or on login because webhooks can be delayed/retried.

## Login Methods

### MVP methods

| Method                       | MVP decision                                                                                     | Rationale                                                                                      |
| :--------------------------- | :----------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| Email/password               | Include                                                                                          | Familiar fallback and broad accessibility                                                      |
| Passwordless email code/link | Include if Clerk UX supports the selected flow cleanly                                           | Reduces password burden; verify deliverability and account-recovery UX                         |
| Google sign-in               | Include                                                                                          | Natural fit for calendar-connected users, but must remain distinct from calendar OAuth consent |
| Apple sign-in                | Include before public iOS launch if required by App Store policy or if social sign-in is offered | Required ecosystem/compliance review before submission                                         |
| Passkeys                     | Offer when Clerk’s selected plan/platform implementation is validated                            | Strong phishing-resistant future path; do not make it sole MVP method                          |
| MFA                          | Make available; require for staff/admin access first                                             | Important protection, but mandatory consumer MFA can add onboarding friction                   |
| Magic link only              | Do not use as sole method                                                                        | Email delivery/device switching can be fragile                                                 |
| Phone/SMS                    | Defer                                                                                            | Cost, fraud, privacy, and support burden not justified                                         |
| Enterprise SSO/SAML          | Defer                                                                                            | Out of MVP scope                                                                               |

**Google sign-in is not Google Calendar authorization.** A user may sign into
Life OS with Google and still need to separately consent to a minimal Calendar
OAuth scope. Conversely, a user can sign in by email/password and later connect
Google Calendar.

## MFA and Sensitive Actions

MFA should be enabled in the identity architecture at launch even if not
required for every consumer account.

Require recent authentication or MFA for:

- Changing primary email or primary identity method.
- Adding/removing MFA factors.
- Generating or viewing account-data export.
- Initiating account deletion.
- Changing any future shared-workspace ownership.
- Connecting/reconnecting Google Calendar.
- Viewing/revealing any recovery material if introduced.
- Staff/admin access to support tools.

Supabase RLS can evaluate certain Clerk session-token claims, including
factor-verification information, but Life OS should not rely on client tokens
alone for sensitive-action policy without server-side verification and an
explicit freshness/re-authentication design.[^1]

## Privacy and Data Controls

- Configure Clerk data retention, user deletion, data export, and regional
  settings based on the actual plan and legal requirements before launch.
- Keep only the minimum cached identity data in PostgreSQL: stable Clerk ID,
  display name, current primary email if needed, status, and audit references.
- Never copy password hashes, recovery codes, MFA secrets, or raw Clerk session
  tokens into Life OS PostgreSQL.
- Do not send email, Clerk user IDs, session IDs, or token claims to analytics
  unless strictly necessary and documented.
- Use synthetic test identities for local, CI, staging, and E2E.
- Disable test accounts from using production Google Calendar/Stripe
  configuration.
- Build account deletion as a coordinated process across Clerk,
  PostgreSQL/Supabase, PowerSync local state, Storage, Google OAuth credentials,
  Stripe records where legally allowed, and analytics/error-monitoring
  identifiers.

## Pricing and Vendor Risk

Supabase Auth is included in Supabase Pro plans. As of 2026, the relevant price
points are:

| Provider       | Free tier           | Paid overage / notes                                                                                      |
| :------------- | :------------------ | :-------------------------------------------------------------------------------------------------------- |
| Supabase Auth  | 50,000 MAU          | Pro includes 100,000 MAU, then ~$25/month at 100K MAU; auth effectively unlimited for most projects [^34] |
| Clerk          | 50,000 MAU          | Pro starts at $25/mo; overages ~$0.02/MAU; ~$1,800/month at 100K MAU [^33]                                |
| Better Auth    | Free                | No per-user fees; pay only for database/compute [^44][^45][^46]                                           |
| WorkOS AuthKit | Up to 1,000,000 MAU | SSO connections and enterprise add-ons billed separately; generous for B2B but overkill for V1 [^37]      |
| Kinde          | 10,500 MAU          | Lower per-MAU rates; bundled feature flags/billing not needed for MVP [^36]                               |
| Stytch         | 10,000 MAU          | Passkey-first; higher per-MAU cost at scale [^38]                                                         |

Budgeting must model:

```text
Supabase Pro plan (includes auth + database)
+ PowerSync usage
```

At 100k active users, Supabase Auth is ~70x cheaper than Clerk
($25/month vs $1,800/month). For a daily-use personal app, this cost difference
is company-level significant.

Do not optimize this away prematurely by building custom authentication.
Instead:

- Export and retain the `supabase_user_id -> app_user_id` mapping.
- Keep product authorization in PostgreSQL.
- Avoid provider-specific IDs throughout domain tables.
- Document an eventual migration plan to Better Auth or another OIDC provider.
- Reassess auth economics at the private-beta and paid-launch milestones.

## Trade-Offs

| Choice                             | What it gains                                                                                | What it costs                                                                                                    |
| :--------------------------------- | :------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| Supabase Auth over Clerk           | Fewer vendors, 70x lower cost at scale, native RLS/PowerSync path, identity data in Postgres | More auth UI work, less polished off-the-shelf UX, no first-class orgs                                           |
| Clerk over Supabase Auth           | Better hosted user/authentication experience and cross-platform SDK ergonomics               | Extra vendor, 70x higher cost at scale, critical third-party auth/sync validation                                |
| Better Auth over both              | Zero per-user fees, full data ownership, Apache 2.0 license                                  | Team must operate sessions, security, deliverability, MFA, OAuth, and passkeys; no pre-built UI; 2-4 hours setup |
| Supabase Auth native integration   | Simplest JWT/RLS path, no asymmetric key validation required                                 | Requires building custom auth UI                                                                                 |
| Custom PowerSync JWT bridge        | Clean separation of sync token from session token, explicit `aud` claim                      | Extra token fetch in `fetchCredentials()`, template configuration                                                |
| Product workspace tables over orgs | Domain-specific authorization, billing, audit, sharing, deletion, and portability            | More initial schema/policy design                                                                                |
| Minimal claims                     | Less stale/sensitive data in tokens                                                          | RLS and backend perform membership lookups                                                                       |
| JIT profile provisioning           | Idempotent, backend-authoritative product account creation                                   | Slight extra first-request work                                                                                  |
| Separate Calendar OAuth            | Correct consent and least privilege                                                          | Two distinct account/consent experiences to explain clearly                                                      |
| Better Auth graduation strategy    | Zero auth costs at scale, full control                                                       | Migration effort at 50K MAU threshold                                                                            |

## Final Decision

Lock this identity architecture for V1:

```text
Authentication provider:          Supabase Auth
Web SDK:                          @supabase/ssr for Next.js App Router integration
Mobile SDK:                       @supabase/auth-helpers-react-native and supabase-js for Expo with secure token storage
Server validation:                Hono verifies Supabase JWT signature, issuer, audience, and expiry
Supabase integration:             Native RLS integration using auth.uid() and auth.jwt()
PowerSync token path:             Native Supabase Auth integration (auto-detects JWKS, uses authenticated audience)
Product user record:              PostgreSQL app_users mapped by immutable supabase_user_id
Authorization source of truth:    PostgreSQL workspace_memberships + RLS + backend policy checks
Organizations:                    Modeled in application schema (Supabase Auth has no built-in orgs)
MVP sign-in methods:              Email-based method plus Google sign-in; separate Calendar OAuth consent
MFA:                              Available; mandatory for staff/admin and sensitive actions as policy matures
Passkeys:                         Available in beta; roadmap dependent
Critical gate:                    Supabase Auth -> RLS -> PowerSync Expo proof of concept before core build
Fallback if gate fails:           Consider Clerk or Better Auth as alternatives before domain implementation proceeds
Alternative primary:              Clerk is a credible alternative if pre-built UI is priority over cost
Long-term graduation:             Consider migration to Better Auth at 50K MAU if cost becomes a concern
```

The next category in dependency order is **Authorization \& Row-Level
Security**.
<span style="display:none">[^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32]</span>

<div align="center">⁂</div>

[^1]: https://supabase.com/docs/guides/auth/overview

[^2]: https://supabase.com/docs/guides/auth/server-side/quickstart

[^3]: https://clerk.com/nextjs-authentication

[^4]: https://docs.expo.dev/guides/using-clerk/

[^5]: https://supabase.com/docs/guides/auth/quickstarts/react-native

[^6]:
    https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth

[^7]: https://better-auth.com/docs/integrations/expo

[^8]: https://better-auth.com/docs/integrations/next

[^9]: https://clerk.com/docs

[^10]: https://clerk.com/docs/guides/development/integrations/databases/supabase

[^11]: 10-Risks-Gaps-and-Unresolved-Questions.md

[^12]: 07-Technical-Architecture-Fundamentals.md

[^13]:
    https://support.auth0.com/center/s/article/Implementing-Native-Login-with-React-Native-and-Expo

[^14]: https://www.answeroverflow.com/m/1398157697819345107

[^15]: https://clerk.com/blog/how-clerk-integrates-with-supabase-auth

[^16]: https://clerk.com/docs/guides/sessions/jwt-templates

[^17]: https://supabase.com/docs/guides/auth/oauth-server/token-security

[^18]: https://deepwiki.com/clerk/clerk-docs/7.2-database-integrations

[^19]: https://clerk.com/docs/nextjs/reference/hooks/use-auth

[^20]: https://clerk.com/changelog/2025-03-31-supabase-integration

[^21]: https://supertokens.com/blog/how-to-integrate-clerk-with-supabase

[^22]: https://clerk.hexdocs.pm/JWTTemplate.html

[^23]:
    https://developer.auth0.com/resources/guides/mobile/react-native/expo-authentication

[^24]: https://auth0.com/docs/quickstart/native/react-native-expo

[^25]: https://www.npmjs.com/package/@better-auth/expo

[^26]: https://developer.auth0.com/resources/guides/mobile/react-native

[^27]: https://docs.expo.dev/develop/authentication/

[^28]:
    https://community.auth0.com/t/implementing-auth0-in-react-native-expo-app/17406

[^29]: https://forums.basehub.com/better-auth/better-auth/6

[^30]:
    https://blog.logrocket.com/react-native-authentication-with-better-auth-and-expo/

[^31]: https://auth0.com/docs/quickstart/native/react-native-expo/00-login

[^32]:
    https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native

[^33]: https://clerk.com/pricing

[^34]: https://supabase.com/pricing

[^35]: https://docs.powersync.com/configuration/auth/overview

[^36]: https://trybuildpilot.com/458-kinde-auth-review-2026

[^37]: https://workos.com/pricing

[^38]: https://stytch.com/pricing

[^39]: https://github.com/powersync-ja/powersync-js/issues/613

[^40]: https://docs.powersync.com/configuration/auth/supabase-auth

[^41]: https://docs.powersync.com/configuration/auth/custom

[^42]:
    https://www.alexcloudstar.com/blog/better-auth-vs-clerk-vs-supabase-auth-2026/

[^43]: https://www.iloveblogs.blog/post/nextjs-authentication-comparison-2026

[^44]:
    https://rohitraj.tech/en/notes/clerk-vs-supabase-auth-vs-better-auth-india-2026

[^45]: https://starterpick.com/guides/better-auth-vs-clerk-vs-nextauth-2026

[^46]: https://better-auth.com/docs
