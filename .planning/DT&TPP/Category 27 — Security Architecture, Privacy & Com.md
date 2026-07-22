<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 27 — Security Architecture, Privacy \& Compliance

**Recommendation: implement security as a product-wide architecture, not an auth-library feature: Clerk verifies identity; Hono enforces request-, function-, and object-level authorization; PostgreSQL RLS provides defense in depth; PowerSync sync rules minimize mobile data; encrypted server-side secrets protect integrations; and every system follows explicit data classification, least privilege, retention, and deletion rules.** For MVP, align controls to OWASP ASVS/API Security guidance and use the NIST Privacy Framework as the privacy-risk-management structure; defer formal SOC 2, ISO 27001, HIPAA, or PCI certification until commercial or regulatory requirements justify the program.[^1][^2][^3]

The primary risk is not a sophisticated cryptographic failure. It is accidental overexposure: an IDOR/BOLA bug, a stale local replica after account switching, a signed URL leaked into telemetry, an OAuth token handled as ordinary application data, or an operational worker granted unrestricted database power.

## Core Decision

```text
Security baseline:               OWASP ASVS principles + OWASP API Security Top 10
Privacy-risk framework:          NIST Privacy Framework
Identity/session:                Clerk
Application authorization:       Hono policy/authorization layer
Database authorization:          PostgreSQL RLS + dedicated runtime roles
Mobile replication boundary:     PowerSync sync rules, workspace/user scoped
Secrets:                         Managed runtime secret stores; encrypted integration credentials
Encryption in transit:           TLS everywhere
Encryption at rest:              Managed-provider encryption + application encryption for high-value secrets
Sensitive-data telemetry:        Allowlist-only, pre-export redaction
File access:                     Private storage and short-lived signed URLs
Threat modeling:                 Required for new sensitive integrations/data flows
Security testing:                Automated plus periodic manual review
Compliance posture:              Privacy-by-design and evidence collection now; certification deferred
```

OWASP identifies broken object-level authorization, broken authentication, broken object-property authorization, resource exhaustion, function-level authorization failures, SSRF, misconfiguration, inventory problems, and unsafe third-party API consumption among the leading API risks.  NIST describes its Privacy Framework as a voluntary tool for identifying and managing privacy risk while building products and services.[^2][^3][^1]

## Security Objectives

The architecture must protect:

- Personal task, note, project, goal, calendar, search, and attachment information.
- Authentication sessions and account identity.
- Workspace membership and shared-data boundaries.
- Google OAuth credentials and refresh tokens.
- Stripe/Clerk/PowerSync/Supabase/Expo/webhook credentials.
- Offline SQLite replicas and locally cached attachments.
- Signed storage URLs and notification payloads.
- Administrative, export, deletion, billing, and integration-repair actions.
- The confidentiality, integrity, availability, and deletion lifecycle of user data.

Security goals:

```text
Confidentiality:
  Only authorized users/systems can view sensitive data.

Integrity:
  Commands, jobs, webhooks, and provider sync cannot silently alter data incorrectly.

Availability:
  Abuse, queue storms, provider failure, and malformed inputs cannot easily exhaust core service.

Privacy:
  Collect, replicate, log, retain, and disclose the minimum personal data needed.

Accountability:
  Sensitive actions are auditable, attributable, and operationally diagnosable.
```


## Security-Architecture Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Layered authorization: Clerk + Hono + RLS + PowerSync scopes** | Defense in depth; clear ownership; protects API, database, and replica boundaries | Requires policy consistency and thorough tests | **Select** |
| Clerk-only authorization in route handlers | Fastest implementation | One missed route/query creates cross-user data exposure; no DB safety net | Reject |
| RLS-only authorization | Strong database boundary | Cannot safely express all command/business rules, integration policies, rate limits, or side effects alone | Reject |
| Service-role database access everywhere | Convenient server development | Bypasses RLS and makes application bugs high-impact | Reject |
| Client-enforced workspace filtering | Easy UI implementation | Client is not a trust boundary; trivial to bypass | Reject |
| Supabase Auth instead of Clerk | Tight Supabase JWT/RLS integration | Conflicts with selected identity architecture; migration cost without sufficient benefit | Reject |
| Full zero-knowledge/E2EE notes/tasks | Maximum provider-side content confidentiality | Limits search, sync, planning, support, integrations, recovery, and multi-device usability; substantial cryptographic/key-management complexity | Defer |
| Standard provider encryption only | Low engineering effort | Insufficient protection for OAuth tokens and high-value integration secrets | Reject |
| Application-layer encryption for all user data | Stronger confidentiality control | Significant key management/search/indexing/replication complexity | Defer except secrets |
| Formal SOC 2/ISO program immediately | Enterprise sales readiness | Documentation/audit effort before product maturity | Defer; build evidence-ready controls now |

## Trust Boundaries

```text
Untrusted:
  Browser, Expo client, deep links, notification payloads, user input,
  provider webhooks until signature verified, third-party API responses,
  uploaded files, realtime broadcasts, queue payloads.

Authenticated but not trusted for authorization:
  Clerk-authenticated client session, mobile PowerSync replica,
  a user-supplied workspace/entity ID, a signed URL holder.

Trusted application services:
  Hono API, worker, migration service, restricted webhook handler,
  server-side storage/signing adapter.

Trusted infrastructure with least privilege:
  PostgreSQL, Supabase Storage, PowerSync, managed secret store,
  deployment platform, Sentry/OTel/log platform under DPA/configuration.

High-risk secrets:
  OAuth refresh tokens, encryption keys, webhook secrets, service-role keys,
  Stripe secrets, deployment credentials, signing keys.
```

A valid session proves **who** made a request. It does not prove that the requester may access a specific task, workspace, attachment, integration, or administrative action.

## Identity and Authentication

### Clerk is the identity provider

Use Clerk for:

- Sign-up/sign-in.
- MFA and passkey/social/provider options as product policy permits.
- Session issuance/refresh/revocation.
- Email verification/account recovery.
- Bot/abuse controls supported by the provider.
- User/session lifecycle webhooks.
- Mobile secure session handling and web session management.

Do not duplicate passwords, session tokens, password-reset logic, or user identity credentials in PostgreSQL.

### Authentication requirements

- Verify Clerk token signature, issuer, audience, expiry, and authorized party/origin as appropriate at Hono middleware.
- Use JWKS-based verification with caching and key rotation support; never hard-code public signing keys without rotation path.
- Reject missing, expired, malformed, wrong-audience, or wrong-issuer tokens.
- Require recent authentication for high-risk actions: export, account deletion, changing primary authentication/recovery method, adding a high-risk integration, and major billing/security changes.
- Use short-lived server credentials and refresh only through supported Clerk/session flows.
- Clear local sessions, PowerSync replica, TanStack cache, Zustand persistence, attachment cache, notification registrations, and analytics identity on sign-out.
- Process Clerk lifecycle webhooks idempotently and verify provider signatures against the raw body.

Broken authentication is a leading API risk, and API clients must be consistently identified and authenticated before protected actions execute.[^2]

## Authorization

### Central policy model

Implement explicit, typed policies rather than scattered `if` statements:

```ts
can(actor, 'task.read', task)
can(actor, 'task.update', task)
can(actor, 'workspace.manage_members', workspace)
can(actor, 'calendar.connect', workspace)
can(actor, 'attachment.download', attachment)
can(actor, 'account.export', account)
```

A policy decision must consider:

```text
Actor:
  Internal app user, role, account state, session freshness.

Resource:
  Entity workspace, owner, deletion/archive state, visibility, source/integration state.

Action:
  Read, create, update, delete, connect, export, manage, retry, administer.

Context:
  Active workspace, request origin, feature entitlement, rate limit,
  recent auth requirement, command/state transition.
```

Keep policy functions in a shared server-only package. Clients may consume capability hints for UX, but clients never decide authorization.

### Required authorization layers

| Layer | Responsibility |
| :-- | :-- |
| Clerk | Authenticate identity/session |
| Hono middleware | Resolve actor, request context, rate-limit key, active workspace |
| Application policy | Decide action on object/function/business-state basis |
| PostgreSQL query/RLS | Restrict row access as defense in depth |
| PowerSync sync rules | Limit which rows replicate to which mobile identity/workspace |
| Supabase Storage/RLS + signing API | Restrict object access |
| Realtime authorization | Restrict private topic subscription |
| Worker resource checks | Revalidate state/scope before privileged asynchronous work |

### BOLA/IDOR prevention

OWASP identifies broken object-level authorization as the first API risk and advises that authorization checks be considered for every function accessing a data source through a user-supplied ID.[^2]

Every endpoint receiving an ID must:

```text
1. Authenticate caller.
2. Resolve actor and active workspace.
3. Query resource through workspace-scoped repository method or RLS.
4. Check typed action policy.
5. Apply mutation only in transaction.
6. Return a minimal authorized DTO.
```

Never do:

```ts
const task = await db.query.tasks.findFirst({
  where: eq(tasks.id, input.taskId),
});
// then assume client-selected task belongs to caller
```

Prefer:

```ts
const task = await tasksRepository.findAuthorizedById({
  actor,
  workspaceId: actor.activeWorkspaceId,
  taskId: input.taskId,
});
```

Do not expose authorization differences through distinguishable “exists but forbidden” versus “not found” responses for ordinary object reads.

### Object-property authorization

Use explicit input and output DTOs. Do not pass client bodies directly into ORM update calls.

```text
Bad:
  db.update(tasks).set(request.body)

Good:
  taskUpdateSchema.parse(request.body)
  -> map only allowed fields
  -> authorize action
  -> validate state transition
  -> persist
```

OWASP identifies broken object-property authorization as a combination of excessive data exposure and mass assignment, both of which can expose or modify unauthorized fields.[^2]

## PostgreSQL and Supabase Security

### Role separation

Use separate database roles:


| Role | Use | Prohibited |
| :-- | :-- | :-- |
| Migration owner | Schema migrations only | Runtime API/worker use |
| API runtime role | Normal application reads/writes | DDL, broad bypass privileges |
| Worker role | Defined job/outbox/integration operations | Migration ownership, unconstrained table access |
| Supabase authenticated/user context | RLS-scoped direct access only where explicitly selected | Service secrets/admin operations |
| Storage signing service path | Create bounded signed URLs | Client exposure |
| Read-only analytics/reporting role | Aggregate, approved views only | Raw user data modification |
| Break-glass admin | Time-bounded emergency operation | Daily application use |

Never use the PostgreSQL superuser, table owner, or Supabase service role as a general runtime credential.

### RLS policy requirements

- Enable RLS on every user/workspace-owned table, including derived projections and attachment metadata.
- Default deny: no policy means no client/user-context access.
- Scope every policy through active membership and workspace relationship.
- Keep policies small, composable, and covered by direct database tests.
- Be cautious with security-definer functions; fix search paths, validate inputs, set least privileges, and review every use.
- Audit views/functions that bypass normal RLS.
- Do not replicate internal tables: tokens, outbox, jobs, audit internals, admin operations, operational logs, encryption metadata.

RLS is a strong database boundary, but a privileged server database connection can bypass it depending on role configuration. Therefore service roles require strict least privilege and application-policy enforcement.

### Query practices

- Parameterize SQL and use a vetted query builder/ORM.
- Do not construct dynamic SQL from user input.
- Allowlist sort fields, filters, and selected columns.
- Enforce pagination, maximum page size, and query complexity budgets.
- Set database statement and lock timeouts appropriate to request/job categories.
- Avoid returning `SELECT *` from sensitive tables.
- Run migrations/SQL extensions through reviewed CI only.


## Mobile and Offline Security

### PowerSync boundary

The mobile replica is a controlled disclosure boundary, not a cache of everything:

- Sync rules replicate only rows necessary for the authenticated user’s selected workspace(s).
- Do not sync OAuth credentials, audit/outbox/job tables, billing data, raw provider payloads, telemetry records, storage object keys, signed URLs, or admin metadata.
- Replicate only client-safe attachment metadata; never file bytes by default.
- Scope every replicated row by workspace and, where necessary, owner/member visibility.
- Treat a PowerSync token as a short-lived credential with minimum required scope.
- Verify account/workspace switching and membership revocation immediately stops/disposes replica access and deletes local data.
- Test a stolen/old device scenario: signing out, session expiration, remote revocation, and next online sync must prevent continued protected access.


### Device storage

- Use OS secure storage only for secrets/session-related data supported by the chosen Clerk/Expo integration.
- Do not store OAuth refresh tokens, service credentials, raw signed URLs, or broad personal datasets in AsyncStorage.
- Use app-private file/cache storage for downloaded attachments.
- Clear user-scoped caches, replicas, downloads, queued optional telemetry, and UI persistence on sign-out/account switch/revocation.
- Use OS device encryption as baseline; document that device compromise/rooting can expose locally available data.
- Consider biometric/app-lock protection as a product feature later; do not claim it as a substitute for OS/device security.
- Do not log local SQLite paths, query results, notification content, or deep-link data.


## OAuth and External Integrations

### Google Calendar

Treat OAuth as a high-risk security domain:

```text
Client starts connection
  -> Hono creates one-time OAuth state record:
     random, short-lived, single-use, user/workspace-bound,
     provider-bound, redirect-bound, PKCE verifier stored server-side
  -> user authorizes at provider
  -> callback validates raw state, TTL, user/workspace binding,
     redirect, error response, and code exchange
  -> server encrypts refresh token
  -> worker performs sync
```

Requirements:

- OAuth state is cryptographically random, single-use, short-lived, and bound to actor/workspace/provider/redirect URI.
- Use PKCE when supported/appropriate.
- Exact redirect-URI allowlist only; never accept client-provided arbitrary callback URLs.
- Request minimum provider scopes.
- Encrypt refresh tokens at application layer using an envelope-encryption/KMS-backed design if available; store ciphertext, key reference/version, timestamps, and rotation metadata—not plaintext.
- Access tokens are short-lived and normally held in memory only; never return them to web/mobile clients.
- Token refresh occurs only in worker/API server context.
- Disconnect/revocation deletes encrypted credentials, ends sync, removes or marks external projections by policy, and records audit action.
- Treat provider response data as untrusted: validate schemas, size limits, and fields before persistence.
- Rate limit OAuth initiation/callbacks and detect repeated state failures.
- Never include OAuth errors, auth codes, tokens, or calendar content in telemetry.

OWASP includes unsafe consumption of third-party APIs as a top risk: external API responses must be treated as untrusted input, not as trusted internal data.[^2]

### Webhooks

For every webhook:

1. Preserve raw request body.
2. Enforce HTTPS.
3. Verify provider signature using constant-time comparison where relevant.
4. Enforce timestamp/replay window where provider supports it.
5. Reject invalid events quickly.
6. Deduplicate provider event IDs.
7. Enqueue durable outbox/job work.
8. Return acknowledgement promptly.
9. Log only safe event type/ID hash/outcome.
10. Reconcile periodically because webhook delivery is not guaranteed.

Never fetch arbitrary URLs from webhook payloads. That creates SSRF risk, which OWASP lists among API security threats.[^1][^2]

## Secrets and Cryptography

### Secrets policy

- No secrets in Git, mobile/web bundles, logs, error reports, screenshots, support tickets, or database fields intended for ordinary application data.
- Use distinct values for development, preview, staging, and production.
- Store runtime secrets in hosting platform secret manager; CI deployment credentials in protected GitHub Environments or OIDC-based identities.
- Rotate on schedule and immediately after suspected exposure.
- Maintain an inventory: secret name, owner, purpose, scope, environment, rotation method/date, dependent service, and emergency revocation process.
- Secret scanning runs in CI and repository history.
- Prevent `process.env` object dumps and redaction bypasses.


### Encryption policy

| Data | Protection |
| :-- | :-- |
| Data in transit | TLS 1.2+; reject plaintext endpoints |
| Database/object storage at rest | Provider-managed encryption |
| OAuth refresh tokens | Application-layer envelope encryption plus provider at-rest encryption |
| Webhook secrets/API keys | Managed secret store; no database persistence unless encrypted and unavoidable |
| Session tokens | Clerk-managed; secure cookie/keychain handling |
| Local mobile replica | OS/device encryption baseline; app-private storage; clear on sign-out |
| Attachments | Private bucket, signed access, provider encryption; application E2EE deferred |
| Logs/telemetry | No secrets/content; provider encryption/DPA is secondary control |
| Backups | Provider encryption/access controls; backup access restricted and tested |

Do not invent custom cryptography. Use audited libraries and managed KMS/key-management capabilities. Document algorithm, key version, ciphertext format, rotation, decryption authorization, and failure/recovery behavior for every application-encrypted field.

## Data Classification and Lifecycle

### Classification

| Class | Examples | Handling |
| :-- | :-- | :-- |
| Public | Marketing content, public docs | May be cached/publicly served |
| Internal | Non-sensitive build metadata, feature definitions | Authenticated team access |
| Confidential personal | Tasks, project names, notes, calendar titles, reminder metadata | Workspace-scoped access, minimize telemetry/replication |
| Restricted secrets | OAuth tokens, API keys, webhook secrets, session credentials, signed URLs | Secret store/encryption, never client/log/analytics |
| Sensitive derived data | Search snippets, notification text, event analytics, attachment metadata | Minimal, access-controlled, short retention |
| Operational security data | Audit records, auth failures, incident records | Restricted access, defined retention |

### Lifecycle controls

For each data category, document:

```text
Purpose
Legal/product basis
System of record
Processors/subprocessors
Replicated/cached locations
Encryption/access control
Retention
Deletion mechanism
Export mechanism
Incident/logging behavior
Owner
```

This data inventory is a practical NIST Privacy Framework artifact. NIST positions the Privacy Framework as a way to identify and manage privacy risk while supporting innovation.[^4][^3]

### Retention defaults

- Keep domain data until user deletes it or account/workspace deletion policy applies.
- Soft-delete user content for a short recovery window only if product policy declares it.
- Delete OAuth credentials immediately on disconnect/account deletion.
- Delete attachment bytes after approved deletion grace period via idempotent worker.
- Retain raw optional analytics briefly and aggregate thereafter.
- Retain logs/traces/errors only as long as operationally necessary.
- Avoid indefinite backups; document backup retention and restoration implications.
- Prevent expired pending uploads, OAuth states, exports, signed URLs, and notification tokens from accumulating.


## Privacy Controls

### User-facing controls

MVP should provide:

- Privacy notice identifying categories of data, purpose, service providers, and retention.
- Export mechanism for user/account data.
- Account deletion process with clear effect and timing.
- Calendar disconnect and credential deletion.
- Notification content/detail and delivery preferences.
- Optional product analytics preference.
- Ability to clear local downloaded attachments/cache.
- Support path for privacy questions/requests.

Do not claim full deletion is instantaneous if backups, legal holds, provider retention, or asynchronous worker processing make it eventual. State the documented deletion window and exclusions transparently.

### Privacy by default

- Private storage buckets.
- Private Realtime channels.
- No public profile/search/discovery.
- No sharing/collaboration by default.
- No session replay/autocapture.
- No raw query logging.
- Generic notification content by default.
- Minimum PowerSync replication.
- Feature telemetry allowlist.
- External provider scopes minimized.
- Test/preview data synthetic only.


## Network and HTTP Security

### Web/API controls

- HTTPS only; enable HSTS for production domains after validating subdomain policy.
- Strict CORS allowlist for known web origins; never `*` with credentials.
- Use secure, `HttpOnly`, `SameSite` cookies where applicable; follow Clerk integration guidance.
- Add Content Security Policy designed around actual Next.js/Clerk requirements; start report-only, then enforce.
- Add `frame-ancestors`/clickjacking protection, `X-Content-Type-Options: nosniff`, and referrer policy.
- Validate host headers and reverse-proxy headers only from trusted proxy configuration.
- Limit request body size, multipart size, header size, JSON depth, and request duration.
- Rate-limit by safe key: authenticated user, workspace, IP/reputation where appropriate, endpoint class.
- Disable framework debug endpoints and stack traces in production responses.
- Use generic externally safe error messages with internal normalized codes.


### CSRF

If authenticated browser APIs rely on cookies, enforce origin checks and CSRF protections for mutations. If bearer tokens are used in authorization headers, prevent token exposure via XSS and do not assume CSRF is the primary threat. Document the chosen auth transport per web route rather than applying generic advice inconsistently.

## Abuse Resistance

| Risk | Required controls |
| :-- | :-- |
| Credential stuffing/bot sign-up | Clerk controls, provider configuration, rate limits, abuse monitoring |
| ID enumeration | UUID/opaque IDs plus authorization on every object access |
| Bulk data export/scraping | Pagination/query caps, quotas, rate limits, recent auth for exports, anomaly alerts |
| Search abuse | Query length/rate limits, workspace scope, result cap, no raw-query logging |
| Attachment abuse | Type/size quotas, rate limits, quarantine/scanning, no public write buckets |
| Webhook replay | Signature/timestamp verification, event-ID dedupe |
| Queue amplification | Job dedupe/coalescing, concurrency limits, worker quotas |
| Notification spam | User preferences, frequency caps, idempotency, channel limits |
| OAuth abuse | One-time state/PKCE, callback rate limit, exact redirect allowlist |
| SSRF | Strict egress allowlist or validated provider endpoints; deny arbitrary user/webhook URLs |
| Cost exhaustion | Request budgets, job throttles, storage quotas, provider usage alerts |

OWASP identifies unrestricted resource consumption and unrestricted access to sensitive business flows as API risks, so rate/volume controls must protect both standard endpoints and high-value workflow endpoints.[^1][^2]

## Secure Development Lifecycle

### Required design artifacts

For each significant feature/integration:

- Data-flow diagram and trust boundaries.
- Threat model proportional to risk.
- Data classification and retention entry.
- Authorization matrix.
- API input/output contract.
- Abuse/rate-limit plan.
- Logging/telemetry allowlist review.
- Failure/rollback and incident considerations.
- Security and privacy test cases.

High-risk changes require security review before implementation:

```text
New OAuth/integration provider
New data category or attachment type
New external processor
Payments/billing change
Account recovery/auth/MFA change
New sharing/collaboration model
New export/import capability
New admin or support access
New mobile replica data type
New client-side cryptography/security claim
```


### Dependency and supply-chain policy

- Lock dependencies and require review of meaningful upgrades.
- Run vulnerability, license, secret, and static analysis scans in CI.
- Pin CI actions by immutable commit SHA.
- Produce software bill of materials/provenance when release process supports it.
- Avoid abandoned/unmaintained packages for authentication, crypto, parsing, uploads, and native modules.
- Monitor critical provider security advisories.
- Maintain emergency patch/forced-mobile-upgrade/kill-switch plan.


## Incident Response

### Severity model

| Severity | Example | Response |
| :-- | :-- | :-- |
| SEV-1 | Confirmed cross-user data exposure, credential leak, active account takeover, destructive integrity incident | Immediate incident lead, contain/revoke, preserve evidence, legal/privacy review, user notification as required |
| SEV-2 | Significant provider outage, repeated job duplication, widespread sync failure, vulnerable dependency with credible exposure | Urgent remediation and stakeholder communication |
| SEV-3 | Isolated bug without confirmed data exposure | Normal prioritized fix, regression test |
| SEV-4 | Minor UX/security hardening issue | Backlog with owner/date |

### Minimum incident runbook

```text
Detect and declare
Stop/contain: disable flag, revoke credential, block route, pause worker, rotate secret
Preserve safe logs/evidence
Assess affected data/users/time window
Eradicate and recover
Validate restoration and monitoring
Notify affected parties/regulators if required
Post-incident review: root cause, prevention, test/alert/runbook improvements
```

Do not rely on a single engineer’s private knowledge of credentials or deployment controls.

## Compliance Roadmap

### MVP posture

Do now:

- Privacy notice, terms, DPA/vendor review, and subprocessors list.
- Data map/classification/retention schedule.
- Access controls, encryption, secret inventory, backups, deletion/export processes.
- Audit trails for sensitive actions.
- Security incident response plan.
- Vendor access controls and least privilege.
- OWASP-aligned testing and dependency management.
- Evidence repository: policies, reviews, test results, access reviews, incident drills.

Defer unless a concrete customer/legal requirement exists:


| Program | Reason to defer |
| :-- | :-- |
| SOC 2 Type I/II | Requires ongoing control operation/evidence and audit expense |
| ISO 27001 | Broad ISMS scope and certification overhead |
| HIPAA | Do not position Life OS for PHI or sign BAAs without dedicated program |
| PCI DSS | Avoid storing/card-processing directly; use Stripe-hosted flows |
| GDPR/UK GDPR formal counsel program | Obtain legal advice when targeting relevant users/markets; engineering can prepare controls but must not self-certify |
| CPRA/state-specific legal program | Requires jurisdiction-specific legal review |
| Penetration test certification | Schedule before enterprise launch, material scale, or high-risk feature rollout |

This is not legal advice. Legal counsel must define applicable obligations based on jurisdictions, users, data, business model, and contractual commitments.

## Security Testing

### Automated tests

```text
Authentication token validation
RLS policy matrix
Cross-workspace IDOR/BOLA attempts
Object-property/mass-assignment attempts
Function/role authorization
CORS/CSRF/origin behavior
Rate limits and quotas
OAuth state/PKCE/redirect/replay handling
Webhook signature/replay/idempotency
Storage signed URL scope/expiry
Realtime topic authorization
PowerSync scope and account-switch clearing
Mobile cache/deep-link/notification safety
Secret/PII telemetry redaction
Dependency/secret/SAST/IaC scans
```


### Manual and external testing

Before public launch and before enterprise/high-risk expansion:

- Architecture and threat-model review.
- Manual authenticated/authorization testing.
- OAuth/webhook/storage/realtime/mobile-offline review.
- Third-party penetration test scoped to real attack surfaces.
- Remediation tracking and retest for high/critical findings.
- Incident tabletop and backup/restore drill.


## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| Layered auth + RLS + sync scopes | Strong protection against one missed check | Policy design/test complexity |
| Server-enforced authorization | Trustworthy decisions and auditability | Clients need capability/error UX |
| Least-privilege roles | Limits blast radius | More credential/role management |
| Application encryption for OAuth tokens | Stronger integration-secret protection | KMS/key rotation/decryption paths |
| Minimal mobile replication | Smaller exposure on lost/old device | Some offline feature constraints |
| Privacy-first telemetry | Lower data-exposure and compliance risk | Less behavioral debugging/product detail |
| No E2EE initially | Enables search/planning/integrations and recovery | Provider can access data under controlled operations |
| Evidence-ready controls, formal compliance deferred | Practical MVP delivery | May delay enterprise contracts later |
| Short-lived signed URLs | Limits durable object access | Requires fresh authorization/signing |

## Final Decision

Lock the following security, privacy, and compliance architecture:

```text
Security baseline:             OWASP ASVS/API Security principles; NIST Privacy Framework for risk management
Authentication:                Clerk session/token verification in Hono; recent auth for high-risk actions
Authorization:                 Typed server-side policies for every action/object, backed by PostgreSQL RLS
BOLA/IDOR defense:             Mandatory workspace-scoped resource lookup and action check on every user-supplied ID
Database roles:                Separate migration, API, worker, analytics, and break-glass roles; no general service-role use
Mobile security:               Minimum PowerSync scope; no credentials/internal tables/binary attachments replicated;
                               clear replicas/caches/tokens on sign-out, switch, or revocation
OAuth:                         One-time state, PKCE, exact redirects, minimal scopes; encrypted refresh tokens server-side only
Webhooks:                      Raw-body signature verification, replay/deduplication, durable async processing
Storage:                       Private buckets, server-authorized short-lived signed URLs, scanning/quarantine lifecycle
Secrets:                       Managed environment secret stores, inventory/rotation, never in client/logs/source
Privacy defaults:              No public data, generic notifications, no replay/autocapture/raw-query logging,
                               minimized replication and telemetry, explicit retention/deletion
Transport/network:             TLS, strict CORS/origin/CSRF strategy, CSP/security headers, request bounds/rate limits
Abuse controls:                Endpoint/workflow quotas, queue coalescing, storage/search limits, SSRF controls
Observability:                 Allowlisted/redacted telemetry; audit logs separate from analytics
Compliance:                    Evidence-ready controls now; SOC 2/ISO/HIPAA/PCI certification deferred pending requirement
Security lifecycle:            Threat model/data flow/authorization/retention review for sensitive changes;
                               automated and manual security tests plus pre-launch penetration test
```

The next category in dependency order is **Data Model, Database Schema \& Migrations**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://owasp.org/API-Security/editions/2023/en/0x00-toc/

[^2]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/

[^3]: https://www.nist.gov/privacy-framework

[^4]: https://www.nist.gov/privacy-framework/privacy-framework

[^5]: https://www.nist.gov/privacy-framework/frequently-asked-questions

[^6]: https://www.akamai.com/site/en/documents/brief/2023/owasp-api-top-10.pdf

[^7]: https://www.opentext.com/media/white-paper/developer-guide-to-the-2023-owasp-top-10-for-api-security-wp-en.pdf

[^8]: https://apisecurity.io/owasp-api-security-top-10/

[^9]: https://www.apisec.ai/blog/2023-owasp-api-top-ten

[^10]: https://medium.com/@mukundsv333/owasp-api-security-top-10-2023-explained-with-examples-and-mitigations-f7759801b532

[^11]: https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.01162020.pdf

[^12]: https://assets-global.website-files.com/5fec9210c1841a6c20c6ce81/64da3a877d4d2853b4f080f9_EBOOK_OWASP%20Top%2010%20API%202023.pdf

[^13]: https://www.sitewall.net/owasp-api-security-top-10-2023/

[^14]: https://owasp.org/www-project-developer-guide/assets/exports/OWASP_Developer_Guide.pdf

[^15]: https://www.youtube.com/watch?v=nIWBp_nvzq4

