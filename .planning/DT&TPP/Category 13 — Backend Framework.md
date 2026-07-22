<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 13 — Backend Framework

**Recommendation: keep Hono (v4.12.x) [^25] as the backend framework, deployed as a long-lived Node.js 24.x LTS service rather than Edge/serverless functions. Use `@hono/node-server` v2.x, which is up to 2.3× faster on body parsing than v1 and now leads Fastify in the same benchmark while keeping the public API unchanged. Combine Hono with Standard Schema–compatible Zod validation, `hono-openapi` OpenAPI generation, `postgres.js`/Drizzle, structured middleware, and separate worker processes for jobs.** Hono provides a small Web-Standards API surface that runs cleanly on Node.js while preserving portability to other runtimes if future deployment needs change.[^1][^2][^20]

The correct decision is **Hono for HTTP/API composition, not Hono as a complete application architecture.** The project must supply its own explicit domain, application-service, persistence, integration, and worker boundaries. This avoids both a sprawling route-handler codebase and an unnecessarily heavy framework for the MVP.

## Requirements

The backend must support:

- A durable Hono API service for web, Expo mobile, PowerSync, OAuth, webhooks, and account operations.
- Clerk JWT verification and workspace authorization.
- Zod validation and the selected OpenAPI contract workflow.
- Drizzle and `postgres.js` access to Supabase PostgreSQL.
- Typed command handling with idempotency, audit records, transactional outbox, and RLS-aware access.
- Google Calendar OAuth/callbacks and incremental synchronization.
- Stripe and Clerk webhook verification.
- PowerSync JWT issuance and JWKS publishing.
- Structured logging, tracing/metrics, error handling, rate limits, and health checks.
- Background jobs separate from request handling.
- A future path to a different Node hosting model without rewriting all routes.

The Life OS architecture intentionally centralizes privileged writes and integrations in Hono, so the framework needs to stay explicit and lightweight rather than conceal these cross-cutting security concerns.[^3][^4]

## Framework Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Hono on Node.js (v4.12.x + `@hono/node-server` v2.x)** | Small, fast Web-Standards API; TypeScript; native `Request`/`Response`; `@hono/node-server` v2 is up to 2.3× faster on body parsing than v1 and now leads Fastify in the same benchmark; portable across Node/Bun/Deno/edge runtimes; strong Standard Schema/Zod/OpenAPI ecosystem (`hono-openapi`, `@hono/standard-validator`) | Minimal built-in architecture, DI, queues, or ORM conventions; team must enforce boundaries | **Select** |
| Fastify (v5.10.x) | Mature Node-first ecosystem; excellent plugin model; schema validation/serialization; high performance; Zod support available via type providers (fastify-type-provider-zod, fastify-zod-openapi) | JSON Schema/Ajv orientation still adds a second schema path beside a Zod-first contract; Node-only; no edge portability | Strong alternative, reject for MVP |
| NestJS (v11.x stable; v12 preview early Q3 2026) | Mature structure, DI, modules, guards, testing patterns; v12 adds native ESM, Vitest, Rspack, and Standard Schema support in route decorators (Zod, Valibot, ArkType), which narrows the Zod objection | Still more framework ceremony, decorators/metadata, modules/providers; Node-only; heavier than needed for a small-team MVP | Reject for MVP; re-evaluate v12 after stable release if the team grows |
| Express | Largest ecosystem and many examples | Older/less structured request model, more glue, less aligned with Web Standards and selected Hono/OpenAPI direction | Reject |
| Next.js Route Handlers only | Fewer deployments; convenient for web-adjacent endpoints | Wrong boundary for durable workers, OAuth/webhook reliability, PowerSync token service, background processing, and mobile-first API ownership | Reject |
| Koa | Minimal and middleware-oriented | Smaller modern ecosystem and fewer benefits over Hono | Reject |
| Elysia/Bun | Strong DX/performance on Bun | Ties runtime to Bun and has smaller operational ecosystem for selected Node deployment | Reject |
| Cloudflare Workers directly | Excellent edge deployment characteristics | Database connections, long-running workflows, Node-focused integrations, job processing, and PowerSync/Google flows make it a poor primary runtime | Reject for primary API |

Fastify v5.x is a technically strong runner-up because it provides route validation and output serialization based on JSON Schema, with Zod support available via type providers. NestJS v11/v12 offers a full application architecture atop Express or Fastify, including TypeScript-oriented modular design and, in v12, native Standard Schema support in route decorators. Those improvements narrow the gap, but they do not outweigh the value of staying aligned with the already selected Hono, Standard Schema/Zod, and portable HTTP contract approach for the MVP.[^5][^6][^7][^8][^22][^23]

## Why Hono Wins

### Web-standard, portable primitives

Hono uses web-standard request/response APIs and has a first-class Node.js adapter.  The `@hono/node-server` v2.x adapter (April 2026) keeps the same public API but is up to 2.3× faster on body parsing than v1 and leads Fastify in the same benchmark, largely because it reads JSON bodies directly from the Node.js `IncomingMessage` and avoids unnecessary `Request`/`Response` construction until actually needed.  The adapter helper also supports environment access across Node, Workers, Deno, Bun, Vercel, Lambda, and other targets.[^1][^2][^20][^21]

That portability is useful without forcing edge deployment today. The actual Life OS API should run as a Node process because it needs durable database pools, integration libraries, webhook handling, scheduled jobs, controlled concurrency, and operational observability. If a future endpoint benefits from edge deployment, a narrow Hono handler can potentially move without changing its HTTP semantics.

### Zod/OpenAPI alignment

Based on research into Hono's OpenAPI ecosystem, the recommended integration is `@hono/zod-openapi`. This package provides first-class support for generating OpenAPI specifications from Zod schemas directly in Hono routes. It is actively maintained and aligns with the project's Zod-first validation strategy. The package auto-generates OpenAPI request/response schemas from route validators, supporting the decision to use Zod contracts as runtime validation and a versioned OpenAPI artifact as the inspectable HTTP contract.[^9][^10][^11][^15][^24]

Use one supported path:

```text
Primary:
  @hono/zod-openapi ^0.15.x + Zod v4
  (Zod-based; auto-generates OpenAPI request/response schemas from route validators)
```

Do not mix multiple route-definition/OpenAPI libraries in production. Choose one, pin versions, and write a single example route as the template for every endpoint.

## Deployment Model

### Select a durable Node API service

```text
apps/backend
  -> Node.js LTS
  -> Hono
  -> Docker container
  -> managed container/service platform
  -> one or more stateless API replicas

apps/worker
  -> Node.js LTS
  -> same domain/application packages
  -> separate Docker container/process
  -> consumes outbox/jobs with bounded concurrency
```

Do not deploy the core API as a set of independent serverless functions initially.


| Model | Benefits | Why not selected |
| :-- | :-- | :-- |
| **Long-lived Node container/service** | Reusable DB pools, predictable runtime, easier integration/webhook handling, straightforward health checks, controlled worker/service separation | Must configure autoscaling and deploy containers |
| Serverless functions | Simple initial deployment and automatic scaling | Cold starts, connection/pool pressure, fragmented operations, background task constraints |
| Edge functions | Low latency near users | Runtime constraints and weak fit for DB/integration/job workload |
| Monolithic Next.js server | One deployment | Blurs frontend/backend boundaries and makes independent API/worker scaling harder |
| Kubernetes | Maximum control | Excess operational complexity for MVP |

The hosting-provider decision can select the exact platform, but it must support:

- Node LTS containers or a persistent Node service.
- Secure secret injection.
- HTTPS, custom domain, and controlled CORS.
- Health/readiness probes.
- Graceful termination with configurable drain period.
- Worker as a separate process/service.
- Scheduled triggers or an external scheduler.
- Log/metric export.
- Region placement near Supabase and PowerSync.
- Private/allowlisted network paths where provider capabilities make this practical.


## Application Architecture

Hono routes are adapters. Domain behavior must live outside the HTTP framework.

```text
apps/backend/src/
├── server/
│   ├── main.ts                    # Node startup, graceful shutdown
│   ├── app.ts                     # Hono composition only
│   ├── config.ts                  # validated environment configuration
│   ├── middleware/
│   ├── routes/
│   └── openapi.ts
├── application/
│   ├── commands/
│   ├── queries/
│   ├── services/
│   └── ports/
├── domain/
│   ├── tasks/
│   ├── planning/
│   ├── calendar/
│   ├── identity/
│   └── shared/
├── infrastructure/
│   ├── database/
│   ├── clerk/
│   ├── powersync/
│   ├── google/
│   ├── stripe/
│   ├── storage/
│   └── observability/
└── jobs/
    ├── worker.ts
    ├── outbox-consumer.ts
    ├── calendar-sync.ts
    └── notification-delivery.ts
```

A cleaner monorepo variant moves `domain`, `application`, and infrastructure adapters to packages:

```text
packages/
├── domain/
├── application/
├── database/
├── contracts/
├── api-client/
├── integrations/
└── observability/
```

The key rule is unchanged: **neither domain logic nor persistence queries may depend on Hono context objects.**

## Middleware Order

Middleware order is a security and operational concern. Compose it deliberately:

```text
1. Request ID / trace context
2. Trusted proxy / request metadata normalization
3. Security headers and CORS
4. Body-size limits and content-type handling
5. Structured request logging with sensitive-field redaction
6. Rate limiting / abuse controls
7. Route matching
8. Authentication where route requires it
9. Workspace context resolution where route requires it
10. Zod input validation
11. Command/query handler
12. Standard response/error mapping
13. Metrics/tracing completion
```


### Required middleware categories

| Middleware | Purpose |
| :-- | :-- |
| Request context | Request ID, trace ID, route name, start time, actor type |
| Error handler | Maps typed domain/infrastructure errors to standard API errors; never returns stack traces |
| Authentication | Verifies Clerk JWT issuer, audience, expiry, signature, and token type |
| Authorization context | Resolves `app_user`, active membership, and workspace after authentication |
| Validation | Zod parses params/query/headers/body; no `as SomeType` at boundary |
| Idempotency | Enforces `Idempotency-Key` or command ID for mutation routes |
| Rate limits | Protects sensitive/auth-adjacent routes, sync-token endpoint, commands, export/deletion, webhooks |
| CORS | Allows only known web origins, methods, and headers; never wildcard plus credentials |
| Security headers | CSP and browser protections appropriate to API responses |
| Raw-body capture | Only on webhook routes that require signature verification |
| Logging | Redacted structured logs, no personal content or secrets |
| Observability | Route latency, status, error class, DB/query telemetry, queue depth |
| Health | Separate liveness/readiness endpoints with non-sensitive output |

Hono has third-party middleware options for validators, OpenAPI, OpenTelemetry, Prometheus metrics, logging, rate limiting, idempotency, and RFC 9457 problem details.  Prefer well-maintained, small dependencies; do not indiscriminately add every available middleware.[^10]

## Routing Structure

```text
/v1/me
/v1/workspaces
/v1/commands
/v1/sync/powersync-token
/v1/integrations/google/*
/v1/account/*
/v1/billing/*
/v1/webhooks/clerk
/v1/webhooks/stripe
/.well-known/jwks.json
/health/live
/health/ready
/openapi.json
/docs                        # non-production by default
```


### Route categories

| Route type | Authentication | Special rules |
| :-- | :-- | :-- |
| Product API | Clerk bearer JWT | Zod validation, workspace context, rate limits, typed error envelope |
| Commands | Clerk bearer JWT | Idempotency required; transaction + audit + outbox |
| PowerSync token | Clerk bearer JWT | Short-lived asymmetric JWT; membership/entitlement check; strict rate limit |
| OAuth initiate/callback | Authenticated initiation; signed state on callback | PKCE, state validation, minimal scopes, no token logging |
| Provider webhooks | Provider signature only | Raw-body verification before parsing; idempotency; separate rate/size controls |
| Clerk webhooks | Clerk signature only | Reconciliation only; no trust substitution for live API auth |
| Stripe webhooks | Stripe signature only | Raw-body verification; event-ID idempotency; entitlement updates through outbox |
| JWKS | Public | Public keys only, cache headers, no auth |
| Health/readiness | Infrastructure restriction if possible | Never disclose user/system secrets |
| OpenAPI/docs | Public or authenticated depending launch stage | Do not expose internal/admin endpoints |

## Request Context

Create a typed request context populated only by verified information:

```ts
type RequestContext = {
  requestId: string;
  traceId?: string;
  actor:
    | { kind: 'anonymous' }
    | {
        kind: 'user';
        clerkUserId: string;
        appUserId: string;
        sessionId?: string;
      }
    | { kind: 'integration'; provider: 'google'; connectionId: string }
    | { kind: 'webhook'; provider: 'stripe' | 'clerk' }
    | { kind: 'system'; jobId: string };
  workspace?: {
    id: string;
    role: 'owner' | 'member';
  };
};
```

Never derive request context from unverified headers or body fields. Routes may request an active workspace, but the backend must resolve it through the authenticated user’s active membership and then ensure any resource belongs to that workspace.

## Error Handling

Use typed errors from the application layer:

```text
ValidationError
UnauthenticatedError
ForbiddenError
NotFoundError
ConflictError
DomainRuleViolationError
RateLimitedError
ExternalProviderUnavailableError
DependencyUnavailableError
InternalError
```

The Hono error middleware maps them to the stable API error envelope defined in the prior category. Route handlers should not contain repetitive `try/catch` blocks or leak raw database/provider errors.

### Error rules

- Do not expose SQL text, database constraint details, stack traces, OAuth errors with secrets, provider access tokens, or raw webhook payloads.
- Preserve a request/correlation ID in every error response.
- Log a redacted causal chain internally.
- Mark errors retryable/non-retryable in the application layer where needed for PowerSync command handling.
- Treat database serialization/unique constraint failures as a domain conflict only after mapping them carefully; do not expose raw constraint names.
- Return `503` for dependency failures when retry may succeed, not `500`.


## Authentication and Webhooks

### Clerk

The Clerk middleware validates identity and attaches a minimal actor context. It must not grant workspace access solely because a JWT is valid. The application/database layer resolves active membership and enforces RLS. The prior Clerk/Supabase integration decision requires asymmetric JWT validation and minimal claims.[^12][^13]

### PowerSync

`POST /v1/sync/powersync-token` is a sensitive authenticated route. It verifies Clerk identity, account status, membership, workspace selection, and entitlement, then signs a short-lived PowerSync JWT using the backend private key. It is not a generic token passthrough.

### Google OAuth

Keep OAuth initiation and callback routes isolated from generic authenticated JSON APIs:

- Use Authorization Code + PKCE.
- Generate a cryptographically random state value.
- Bind state to authenticated user, workspace, integration intent, redirect URI, and expiration in server-side storage.
- Verify state once, then delete/mark consumed.
- Exchange authorization code only server-side.
- Encrypt refresh tokens before persistent storage.
- Never return provider refresh tokens to web/mobile clients.
- Set a narrow Google scope set and explicit consent language.


### Stripe and Clerk webhooks

Webhook routes require raw request bodies because verification signatures are calculated over the original payload. Verify signatures before parsing or making any database decision. Store the provider event ID in an idempotency table and enqueue real work through the transactional outbox.

## Database and Transaction Boundaries

The framework must not control domain transactions implicitly. Command handlers explicitly receive a transaction-capable unit of work:

```text
Hono route
  -> parse authenticated command
  -> application command handler
  -> database transaction
      -> authorization-sensitive reads
      -> idempotency record
      -> authoritative mutations
      -> audit event
      -> outbox event
  -> response DTO
```

Do not hold a database transaction open while:

- Calling Google, Stripe, Clerk, PowerSync, email, storage, or push services.
- Waiting on external APIs.
- Sending a response stream.
- Performing a large export.
- Recomputing an unbounded schedule.

External side effects occur after commit via outbox-driven worker jobs.

## Background Worker

Hono is the API framework; it is not the job system. Run a separate Node worker that imports the same domain/application packages.

Initial worker responsibilities:


| Worker | Trigger | Role |
| :-- | :-- | :-- |
| Outbox dispatcher | Continuous/polling | Dispatch committed side effects safely |
| Calendar sync | Outbox plus scheduled reconciliation | Incremental Google sync, token refresh, provider conflict handling |
| Planning projection | Outbox | Update daily plan projections after authoritative changes |
| Notification delivery | Scheduled/outbox | Schedule and deliver reminders |
| Account export | User command | Create secure export asynchronously |
| Account deletion | User-confirmed lifecycle | Coordinate delayed deletion/retention workflow |
| Search indexing | Outbox, only if separate search introduced | Keep search derived data current |
| Cleanup/reconciliation | Scheduled | Expire OAuth states, exports, stale idempotency/commands, detect sync drift |

Use bounded concurrency and explicit retry policies per job type. Do not run these inside request handlers via `waitUntil`-style background tasks; a container can shut down or scale at any point.

The exact queue/runtime technology belongs to the background-jobs category. The backend framework decision only locks the architectural separation.

## Node Runtime Rules

Use the current Node LTS major approved by repository tooling, not Bun as the production baseline.


| Runtime | Decision | Rationale |
| :-- | :-- | :-- |
| **Node.js LTS** | Select | Broad compatibility with Clerk, Google, Stripe, PowerSync tooling, Drizzle/postgres.js, observability, containers, and managed hosts; `@hono/node-server` v2 requires Node 20+, which is satisfied by Node 24.x LTS [^20] |
| Bun | Local developer option only if scripts work | Good performance/DX, but not enough reason to make a critical integrations service depend on a newer runtime |
| Deno | Reject | Less aligned with selected Node ecosystem and packages |
| Edge runtime | Use only for later narrow, stateless endpoints | Core API needs Node/database/integration capabilities |

Hono supports Node.js, Bun, Deno, Workers, Vercel, Lambda, and other runtimes.  Select Node because the backend’s operational needs, not because Hono requires it.[^2]

## Operational Requirements

### Startup and shutdown

At startup:

1. Parse and validate environment configuration.
2. Initialize logging/telemetry.
3. Initialize database client/pool.
4. Verify essential configuration structure, not every external dependency synchronously.
5. Start HTTP server.
6. Expose readiness only when the database and critical internal dependencies are usable.

At shutdown:

1. Stop accepting new requests.
2. Mark readiness false.
3. Allow a bounded drain for in-flight requests.
4. Stop pulling new worker work.
5. Finish/return leased jobs safely.
6. Close database pool.
7. Flush telemetry/logs.
8. Exit non-zero only for startup/fatal conditions.

### Health endpoints

```text
GET /health/live
  -> Process is running; no dependency checks

GET /health/ready
  -> Can serve traffic: validated config + DB connectivity/pool availability
```

Do not include provider API calls, database credentials, migration versions, raw errors, account counts, or user data in a public health response.

### Configuration

Use a single Zod-validated environment configuration module. Separate:

```text
Public build-time values:
  NEXT_PUBLIC_API_URL
  EXPO_PUBLIC_API_URL
  Clerk publishable keys

Server runtime secrets:
  Clerk secret/JWKS configuration
  Supabase/Postgres connection strings
  PowerSync signing private key
  Google OAuth client secret
  Stripe secret and webhook secret
  storage credentials
  observability DSN
```

Fail fast if a required server secret is absent, malformed, production-looking in development, or points at the wrong environment.

## Testing Strategy

| Test level | Framework focus |
| :-- | :-- |
| Unit | Domain/application services with fake ports; no Hono or database |
| Route/contract | Hono `app.request()` style tests, Zod response/error contracts, auth middleware boundaries |
| Database integration | Drizzle/PostgreSQL/Supabase RLS and transaction behavior |
| Webhook integration | Exact raw-body signature verification and event idempotency |
| OAuth integration | Controlled callback/state/PKCE tests plus provider sandbox/manual checks |
| API E2E | Deployed staging endpoint with real Clerk test identities |
| Load/soak | Command burst, sync-token, calendar webhook, and projection-job load before beta |
| Security | Auth bypass, cross-workspace, CORS, rate-limit, body-size, redaction, and secret-scanning tests |

Hono’s use of web-standard request/response objects makes route-level tests straightforward without starting a real listening server for every test.[^1]

## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| Hono over NestJS | Low ceremony, portable Web APIs, simple fit with chosen stack; NestJS v12's Standard Schema support narrows the validation gap but not the framework-weight gap | Architecture/DI/testing conventions must be actively maintained [^23] |
| Hono over Fastify | Web-standard portability and Zod/Hono/OpenAPI alignment; `@hono/node-server` v2 closes the body-parsing performance gap with Fastify | Gives up some Fastify Node-specific plugin maturity and built-in JSON Schema serialization [^20][^22] |
| Node containers over serverless | Stable pools, predictable integrations/jobs, simple operations | Container build/deploy/scale responsibility |
| Separate API and worker | Reliable side effects and fault isolation | Additional deployment/service |
| Explicit domain layers | Testability and framework independence | Initial project structure and discipline |
| Zod/OpenAPI integration | Real runtime validation plus inspectable contract | Must select/pin one integration path and prevent drift |
| Thin routes | Clear security/transaction boundaries | More application-service code than ad hoc handlers |

## Final Decision

Lock the following backend framework architecture:

```text
HTTP framework:                Hono v4.12.x
Node adapter:                  @hono/node-server v2.x
Production runtime:            Node.js 24.x LTS
Deployment model:              Long-lived stateless Node container/service
Route style:                   Versioned JSON HTTP API plus command endpoints
Validation:                    Zod v4 at all external boundaries via Standard Schema (@hono/standard-validator)
OpenAPI:                       Generated from Hono routes with hono-openapi ^1.3.x
Business logic:                Framework-independent domain/application packages
Persistence:                   Drizzle + postgres.js; explicit transaction boundaries
Authentication:                Clerk JWT middleware, then workspace membership authorization
Writes:                        Typed idempotent commands; audit + outbox in same transaction
Jobs:                          Separate Node worker service, never request-lifecycle background work
Webhooks:                      Dedicated raw-body, signature-verified, idempotent routes
Observability:                 Structured redacted logs, tracing/metrics, liveness/readiness endpoints
Serverless/edge:               Not the primary API runtime; reconsider only for narrow stateless endpoints
Alternatives:                  Fastify v5.x is a credible Node-only fallback; NestJS v12 (Q3 2026) narrows the Zod gap but remains heavier; Express/Next route handlers/Elysia/Cloudflare primary rejected for MVP
```

The next category in dependency order is **Web Application Framework**.
<span style="display:none">[^14][^15][^16][^17][^18][^19]</span>

<div align="center">⁂</div>

[^1]: https://hono.dev/docs/getting-started/nodejs

[^2]: https://hono.dev/docs/helpers/adapter

[^3]: 07-Technical-Architecture-Fundamentals.md

[^4]: 08-Key-Technical-Decisions-Rationale.md

[^5]: https://docs.nestjs.com/first-steps

[^6]: https://docs.nestjs.com/

[^7]: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/

[^8]: https://fastify.io/

[^9]: https://fastify.dev/docs/latest/Reference/TypeScript/

[^10]: https://hono.dev/docs/middleware/third-party

[^11]: https://github.com/rhinobase/hono-openapi

[^12]: https://supabase.com/docs/guides/auth/third-party/clerk

[^13]: https://clerk.com/docs/guides/development/integrations/databases/supabase

[^14]: https://www.npmjs.com/package/@node-openapi/hono

[^15]: https://hono.dev/examples/hono-openapi

[^16]: https://hono.dev/examples/hono-docs

[^17]: https://www.jsdocs.io/package/fastify

[^18]: https://tessl.io/registry/mcollina/fastify-best-practices/files/rules/schemas.md

[^19]: https://github.com/w3cj/hono-open-api-starter

[^20]: https://github.com/honojs/node-server/releases/tag/v2.0.0

[^21]: https://zenn.dev/yusukebe/articles/9dce6cf7dc6e41?locale=en

[^22]: https://github.com/fastify/fastify/releases/tag/v5.10.0

[^23]: https://github.com/nestjs/nest/pull/16391

[^24]: https://hono.dev/docs/guides/validation

[^25]: https://github.com/honojs/hono/releases/tag/v4.12.30

