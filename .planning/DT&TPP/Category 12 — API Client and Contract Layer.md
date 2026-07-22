<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 12 — API Client and Contract Layer

**Recommendation: use a typed REST/HTTP API implemented in Hono, with Zod as the
runtime contract source and an OpenAPI document generated or maintained from
those contracts. Build a small handwritten TypeScript client in
`packages/api-client` using `fetch`, Zod response parsing, and TanStack Query
adapters.** Do **not** add tRPC as the primary API layer, and do not rely on
Hono RPC as the public cross-app contract.[^1][^2][^3]

This is the best fit because PowerSync owns most mobile entity reads through
local SQLite, while Life OS still needs stable HTTP endpoints for commands,
sync-token issuance, calendar OAuth, Stripe/webhooks, account export/deletion,
background integrations, web server-side rendering, and future external/client
compatibility. A conventional typed HTTP contract is more durable than
TypeScript-only procedure coupling.

## Core Decision

```text
Transport:                  HTTPS + JSON REST-style endpoints
Backend framework:          Hono
Runtime schemas:            Zod
Contract artifact:          OpenAPI 3.x
Client implementation:      Handwritten TypeScript fetch client with Zod parsing
Client cache/query layer:   TanStack Query for non-PowerSync remote/server state
Mobile entity reads:        PowerSync SQLite reactive queries, not HTTP query caching
Mobile entity writes:       Typed command submission via PowerSync upload handler or API fallback
Web primary reads:          Server components/API client; TanStack Query where client-side fetching is justified
```

**Important distinction:** an API client is not the data layer for every screen.
On mobile, the local PowerSync database is the data layer for replicated life
entities. The API client exists for operations that are not replicated, server
actions, commands, and cross-platform service boundaries.

## Requirements

The contract layer must support:

- Hono backend on Node.
- Next.js App Router web application and Expo mobile application.
- Clerk bearer-token authentication.
- Zod validation at every external boundary.
- PowerSync token issuance and command processing.
- Google Calendar OAuth callbacks and provider webhooks.
- Stripe webhooks and billing/entitlement endpoints.
- Typed, idempotent commands.
- Versionable, inspectable, testable HTTP semantics.
- Future API consumers such as support tooling, integrations, CLI/automation, or
  a public API.
- A clear division between offline replica queries and online server commands.

The initial architecture already treats the Hono backend as the API host for
command writes, integrations, jobs, and future remote capabilities. The API
layer should reinforce that design rather than duplicate PowerSync’s
replica-query capabilities.[^4][^5]

## API Options

| Option                                | Advantages                                                                                                                                                                                    | Disadvantages                                                                                                                                                                                           | Decision                                 |
| :------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------- |
| **Typed REST/HTTP + Zod + OpenAPI**   | Portable; inspectable; works across web/mobile/jobs/webhooks; stable versioning; suitable for future non-TypeScript consumers; maps naturally to OAuth/webhooks and conventional HTTP tooling | Some DTO/schema duplication unless generated carefully; more design than direct function calls                                                                                                          | **Select**                               |
| tRPC                                  | Excellent end-to-end TypeScript inference; TanStack Query integration; quick for a TypeScript-only monorepo                                                                                   | Couples client to server TypeScript router types; less natural as a durable external contract; does not replace OpenAPI for webhooks/integrations; adds a second RPC layer alongside Hono and PowerSync | Reject as primary API                    |
| Hono RPC                              | Inferred client from Hono route types; minimal additional tooling; fits Hono internals                                                                                                        | Type inference requires client compilation against backend route types; can become brittle/slow with large routes; weaker external contract/versioning story; no runtime response validation by itself  | Use optionally for internal tooling only |
| GraphQL                               | Flexible client queries, introspection, broad ecosystem                                                                                                                                       | Adds schema/resolver/cache complexity; poor fit for command-centric mutations and PowerSync local reads; unnecessary for MVP                                                                            | Reject                                   |
| gRPC / Connect                        | Strong contracts and streaming, efficient binary transport                                                                                                                                    | Mobile/web tooling, browser compatibility, gateway/proxy and codegen complexity; excessive for MVP                                                                                                      | Reject                                   |
| Direct Supabase client access         | Fast CRUD and RLS-capable reads                                                                                                                                                               | Undermines command/invariant layer; inconsistent with PowerSync source-of-truth model; expands client attack surface                                                                                    | Reject for product writes                |
| Custom JSON-over-HTTP without schemas | Simple initial implementation                                                                                                                                                                 | Contract drift, weak validation, untyped error handling                                                                                                                                                 | Reject                                   |

tRPC provides compile-time end-to-end type inference without code generation and
can run standalone or through adapters, including Next.js/TanStack Query
integrations. It is technically capable, but the product has a deliberately
independent Hono backend and a long-lived mobile/offline boundary; its principal
advantage diminishes when most mobile reads do not traverse HTTP.[^6][^2]

## Why Typed HTTP Wins

### The real boundaries are not all TypeScript

Even in a TypeScript monorepo, Life OS must cross boundaries that type inference
cannot secure:

- Clerk-issued JWTs.
- PowerSync custom-token issuance.
- Google OAuth callbacks, Calendar events, and webhook signatures.
- Stripe webhooks.
- Expo mobile builds with offline queues.
- Future workers, support tools, data exports, and potential public
  integrations.
- HTTP observability, gateways, rate limits, and incident debugging.

Zod remains the runtime truth at these boundaries. OpenAPI gives the HTTP
surface a language-neutral, inspectable artifact. The type-safe TypeScript
client is then derived from or checked against the same Zod contracts.

### It keeps PowerSync in its proper role

The mobile app should not call `GET /tasks` to render Today if PowerSync already
maintains the authorized local replica. Use local SQL/reactive queries for that
fast, offline-safe UI. The API is reserved for operations such as:

```text
POST /v1/sync/powersync-token
POST /v1/commands
POST /v1/integrations/google/connect
POST /v1/integrations/google/disconnect
POST /v1/account/export
POST /v1/account/deletion
GET  /v1/me
GET  /v1/workspaces
GET  /v1/billing/entitlement
GET  /v1/health
POST /v1/webhooks/stripe
GET  /v1/oauth/google/callback
```

This makes the data flow understandable:

```text
Replicated entity read:
  Mobile UI -> local PowerSync SQLite -> reactive result

User mutation:
  Mobile UI -> local command queue / upload handler -> Hono command pipeline
  -> PostgreSQL transaction -> outbox -> PowerSync replication -> SQLite convergence

Non-replicated server capability:
  Web or mobile -> typed API client -> Hono endpoint -> service/integration
```

## Contract Design

### Zod is the canonical application contract

Create a dedicated contract package:

```text
packages/contracts/
├── src/
│   ├── common/
│   │   ├── ids.ts
│   │   ├── pagination.ts
│   │   ├── timestamps.ts
│   │   ├── errors.ts
│   │   └── envelope.ts
│   ├── commands/
│   │   ├── create-task.ts
│   │   ├── complete-task.ts
│   │   ├── defer-task.ts
│   │   ├── update-note.ts
│   │   └── index.ts
│   ├── sync/
│   │   └── powersync-token.ts
│   ├── integrations/
│   │   └── google-calendar.ts
│   ├── account/
│   │   └── export-and-deletion.ts
│   ├── billing/
│   │   └── entitlement.ts
│   ├── api/
│   │   └── routes.ts
│   └── index.ts
└── package.json
```

This can replace the vague portion of `packages/shared` that would otherwise
accumulate unrelated schemas. Keep domain-only types/constants in
`packages/shared`; keep HTTP payloads, error envelopes, and endpoint DTOs in
`packages/contracts`.

A Zod schema should define:

```text
Request parameters
Request body
Response DTO
Error response DTO
Discriminated command payload
Pagination/cursor format
Version where applicable
```

Never use database row inference as an API contract. Persistence structures
include server-only fields and change for storage reasons that should not break
clients.

### Example command contract

```ts
export const completeTaskCommandSchema = z.object({
  commandId: z.uuid(),
  workspaceId: z.uuid(),
  taskId: z.uuid(),
  completedAt: z.string().datetime(),
  baseRevision: z.number().int().nonnegative().optional(),
});

export const commandAcceptedSchema = z.object({
  commandId: z.uuid(),
  status: z.literal('accepted'),
  acceptedAt: z.string().datetime(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_FOUND',
      'VALIDATION_ERROR',
      'CONFLICT',
      'RATE_LIMITED',
      'UNAVAILABLE',
      'INTERNAL',
    ]),
    message: z.string(),
    requestId: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
```

The client sends intent, not a generic partial task row. The server owns state
transitions, audit/outbox creation, recurrence behavior, and conflict handling.

## Hono Implementation

### Use Hono routes as adapters

Hono route handlers should be thin adapters:

```text
Hono route
  -> authenticate Clerk JWT
  -> resolve app user / workspace scope
  -> parse Zod request schema
  -> call domain command/service
  -> map typed result to response DTO
  -> Zod-validate output in development/test or on security-sensitive boundaries
  -> return standard error envelope
```

Do not place SQL queries, RLS bypassing, PowerSync rule logic, Stripe business
decisions, or Google OAuth token handling inline in route files.

Recommended structure:

```text
apps/backend/src/
├── api/
│   ├── app.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── request-context.ts
│   │   ├── rate-limit.ts
│   │   └── error-handler.ts
│   ├── routes/
│   │   ├── commands.ts
│   │   ├── sync.ts
│   │   ├── me.ts
│   │   ├── workspaces.ts
│   │   ├── integrations.ts
│   │   ├── account.ts
│   │   ├── billing.ts
│   │   ├── webhooks.ts
│   │   └── health.ts
│   └── openapi.ts
├── domain/
├── application/
├── infrastructure/
└── jobs/
```

### Consider @hono/zod-openapi for OpenAPI generation

**Updated 2026:** The `@hono/zod-openapi` package (v1.4.0+) provides a mature,
integrated solution for combining Hono routes, Zod validation, and OpenAPI 3.x
generation. It extends Hono with an `OpenAPIHono` class that:

- Accepts Zod schemas with OpenAPI metadata via `.openapi()` method
- Automatically generates OpenAPI 3.0 or 3.1 documentation via `app.doc()` or
  `app.doc31()`
- Integrates validation using `@hono/zod-validator` middleware
- Supports route definitions via `createRoute()` with full type safety
- Maintains an OpenAPIRegistry for component schema management

**Example usage:**

```ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const app = new OpenAPIHono();

const UserSchema = z
  .object({
    id: z.string().openapi({ example: '123' }),
    name: z.string().openapi({ example: 'John Doe' }),
  })
  .openapi('User');

const route = createRoute({
  method: 'get',
  path: '/users/{id}',
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: UserSchema },
      },
      description: 'Retrieve the user',
    },
  },
});

app.openapi(route, (c) => {
  const { id } = c.req.valid('param');
  return c.json({ id, name: 'John Doe' }, 200);
});

app.doc('/doc', {
  openapi: '3.0.0',
  info: { version: '1.0.0', title: 'Life OS API' },
});
```

This approach is recommended as the primary method for OpenAPI generation
because it:

- Keeps Zod as the single source of truth for both validation and documentation
- Eliminates schema drift between runtime validators and API documentation
- Provides type-safe route definitions with automatic OpenAPI output
- Integrates seamlessly with the chosen Hono backend framework
- Supports both OpenAPI 3.0 and 3.1 specifications

The generated OpenAPI document can be validated in CI and used for SDK
generation when needed.

Hono supports an RPC mechanism that infers client types from route types. That
is useful internally, but do not let it become the sole contract representation
for a backend that must evolve independently of its Expo client and support
external webhooks/providers.[^1]

## OpenAPI Strategy

### Select contract-first-enough, not specification bureaucracy

**Updated 2026:** Use `@hono/zod-openapi` as the primary mechanism for OpenAPI
generation. This keeps Zod as the single source of truth for both runtime
validation and API documentation, eliminating schema drift.

```text
OpenAPI is versioned in source control.
Every public/app-client endpoint has request/response/error documentation.
Webhooks have a separate inbound contract section.
The API document is generated from @hono/zod-openapi in CI and fails on uncommitted drift.
OpenAPI is an artifact, not a second hand-authored type system.
```

Use OpenAPI primarily for:

- Human API documentation and review (via Swagger UI or Redoc).
- Contract diff checks in PRs.
- Future generated SDKs if a non-TypeScript consumer appears.
- Test fixture generation and endpoint discovery.
- Compatibility analysis before breaking changes.

### Alternative OpenAPI generation tools

If `@hono/zod-openapi` does not meet specific needs, consider these
alternatives:

- **zod-openapi (v6.0.0+)**: Uses Zod's native `.meta()` method for OpenAPI
  metadata, supports OpenAPI 3.0/3.1/3.2, and provides `createDocument()` and
  `createSchema()` functions.
- **@asteasolutions/zod-to-openapi**: Mature library with registry-based
  approach, added OpenAPI 3.2 support in 2026, supports lazy schemas and
  recursive types.
- **TypeMorph**: Online converter for Zod to OpenAPI, useful for quick schema
  inspection and prototyping.

### Client generation options

**Updated 2026:** When the API surface grows large enough to warrant code
generation, consider these modern options:

- **openapi-fetch (v0.17.0+)**: Lightweight (6kb min), type-safe fetch client
  that uses OpenAPI types. Fastest performance (300k ops/s), works with React,
  Vue, Svelte, or vanilla JS. Best for teams wanting types-only generation with
  manual HTTP control.
- **Stainless**: Production-ready SDK generation with auto-pagination, retries,
  streaming, and rich error handling. Built by the Stripe team, generates
  idiomatic SDKs that feel hand-crafted. Best for public APIs or when you need a
  full-featured SDK.
- **Orval**: Generates typed API functions and TanStack Query hooks directly
  from OpenAPI specs. Good for teams wanting React Query integration out of the
  box.
- **OpenAPI Generator**: Traditional open-source generator supporting dozens of
  languages. Functional but lacks modern features like auto-pagination and
  structured error handling.

**Recommendation:** Start with handwritten `packages/api-client` for MVP. When
the API surface grows, evaluate `openapi-fetch` for types-only generation or
Stainless for full SDK generation based on whether you need a public API.

### Do not generate a client on day one

A handwritten `packages/api-client` is preferable initially because the HTTP
surface is small and nuanced:

- Clerk token injection differs between web and mobile.
- PowerSync command submission/retry has special semantics.
- Error mapping must preserve typed retry/auth/conflict behavior.
- Server components require careful request/cookie/session handling.
- Mobile network state and offline fallbacks differ from browser behavior.

Generate a client later if there are many stable resource endpoints, a
partner/public API, or another language consumer. The contract remains ready for
it.

## Client Architecture

### `packages/api-client`

```text
packages/api-client/
├── src/
│   ├── client.ts
│   ├── http.ts
│   ├── errors.ts
│   ├── auth.ts
│   ├── commands.ts
│   ├── sync.ts
│   ├── integrations.ts
│   ├── account.ts
│   ├── billing.ts
│   ├── me.ts
│   ├── query-keys.ts
│   └── index.ts
└── package.json
```

The core client receives adapters, not global platform assumptions:

```ts
type ApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  getRequestId?: () => string;
  fetch?: typeof globalThis.fetch;
};
```

This lets:

- Next.js server code provide a server-safe Clerk token acquisition mechanism.
- Browser code use Clerk client session APIs.
- Expo use secure session retrieval.
- Tests inject deterministic fetch/token implementations.
- Non-user service calls use a separate server-only client, not the user client.

### HTTP client rules

- Use native `fetch`; do not add Axios for the MVP.
- Set explicit timeouts through `AbortController`.
- Attach `Authorization: Bearer` only to the selected Life OS API origin.
- Attach an idempotency key to every retriable mutation.
- Parse JSON only after content-type/status validation.
- Parse successful responses with Zod for critical endpoints and all
  development/test builds.
- Convert non-2xx responses to typed `ApiError` values.
- Never retry non-idempotent operations automatically.
- Never send access tokens to analytics, Sentry, redirect URLs, or untrusted
  third-party origins.
- Never include raw response bodies containing user data in generic logs.

## Error Contract

Use RFC 9457-style problem semantics conceptually, with a stable
product-specific envelope:

| HTTP status | Error code examples                | Client behavior                                                |
| :---------- | :--------------------------------- | :------------------------------------------------------------- |
| 400         | `VALIDATION_ERROR`                 | Show field/action feedback; do not retry                       |
| 401         | `UNAUTHENTICATED`, `TOKEN_EXPIRED` | Refresh session once; sign out if refresh fails                |
| 403         | `FORBIDDEN`, `MEMBERSHIP_REVOKED`  | Stop action/sync; refresh workspace state                      |
| 404         | `NOT_FOUND`                        | Reconcile local stale state; do not assume authorization issue |
| 409         | `CONFLICT`, `STALE_REVISION`       | Fetch/reconcile authoritative result; present resolution UX    |
| 422         | `DOMAIN_RULE_VIOLATION`            | Show actionable business-rule explanation                      |
| 429         | `RATE_LIMITED`                     | Respect `Retry-After`; backoff                                 |
| 503         | `UNAVAILABLE`, `SYNC_MAINTENANCE`  | Preserve queued intent; retry with backoff                     |
| 500         | `INTERNAL`                         | Retry only if idempotent; show safe generic feedback           |

Every error response includes a `requestId`, but never echoes tokens, SQL, stack
traces, provider payloads, internal IDs beyond those already safe for the
requester, or private records from another workspace.

## Endpoint Conventions

### Versioning

Prefix all client-facing HTTP routes:

```text
/v1/...
```

Do not version every domain type separately at MVP. Make non-breaking additive
changes within `/v1`; introduce `/v2` only for a genuine incompatible change
that cannot be migrated through optional fields, new routes, or capability
negotiation.

### Naming

Use resource-oriented names for read/configuration surfaces and command-oriented
routes for state transitions:

```text
GET  /v1/me
GET  /v1/workspaces
GET  /v1/workspaces/:workspaceId/entitlement

POST /v1/commands
POST /v1/sync/powersync-token

POST /v1/integrations/google/connect
DELETE /v1/integrations/google/calendar-connections/:id

POST /v1/account/export
POST /v1/account/deletion

POST /v1/webhooks/clerk
POST /v1/webhooks/stripe
```

Avoid endpoints like `POST /tasks/:id/update` when the actual behavior is a
domain command. For business-critical state transitions, an explicit command
discriminated union has better validation, auditing, idempotency, offline
queuing, and evolution properties.

### Pagination

Use opaque cursor pagination for server-backed lists:

```text
GET /v1/audit-events?cursor=<opaque>&limit=50
```

Rules:

- Default and maximum limits.
- Cursor encodes sort fields plus a stable tie-breaker ID.
- Explicit sort semantics in response metadata.
- Never use unbounded offset pagination for audit, search, events, or
  sync-related data.
- Results remain workspace-filtered on the server even if the client passes a
  workspace ID.

### Idempotency

Require an `Idempotency-Key` header or `commandId` for all user-visible
mutations, including:

- Task commands.
- OAuth connection initiation where retried.
- Account export/deletion.
- Attachment upload completion.
- Billing checkout/session creation.
- Calendar write commands.

The server stores the key plus authenticated actor/workspace, request hash where
appropriate, response status, and result reference. The same key with a
different payload must be rejected, not treated as a new command.

## tRPC Assessment

**Updated 2026:** tRPC v11 was released in 2025 with significant improvements
including React Server Components support, content types beyond JSON (FormData,
binary), streaming responses via SSE, and improved TanStack Query v5
integration. The `@hono/trpc-server` middleware (v0.4.2+) enables tRPC to run on
Hono, though some TypeScript configuration issues have been reported with recent
versions.

tRPC's main strength is end-to-end static types with minimal boilerplate. It
supports an App Router approach using server components, the fetch adapter, and
TanStack React Query.[^2][^6]

However, it is not the right primary choice here.

| Factor                  | tRPC impact for Life OS                                                                                                                                                                 |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile reads            | Low benefit because PowerSync SQLite handles replicated entity reads                                                                                                                    |
| Hono backend            | Possible via `@hono/trpc-server` but introduces a separate procedure/router mental model inside the selected HTTP framework; some TypeScript configuration issues reported in 2025-2026 |
| Runtime validation      | Still needs Zod; tRPC type inference alone does not validate external data                                                                                                              |
| External integrations   | Google/Stripe webhooks and OAuth remain HTTP contracts regardless                                                                                                                       |
| Independent deployment  | Client needs compatible server router types; mobile release lag makes API evolution harder                                                                                              |
| OpenAPI/public docs     | Needs additional tooling, while HTTP/OpenAPI is required anyway                                                                                                                         |
| Offline commands        | Better represented as durable intent contracts than in-process procedure calls                                                                                                          |
| Future non-TS consumers | Requires a separate translation/export story                                                                                                                                            |

**Verdict:** reject tRPC as the core API. It can be reconsidered only for a
purely internal developer/admin surface where there is no mobile/offline or
external contract requirement.

## Hono RPC Assessment

**Updated 2026:** Hono RPC has matured significantly in 2026 with improved type
inference, better IDE performance through route splitting strategies, and
comprehensive documentation. The `hc()` client provides full end-to-end type
safety without code generation, supporting status code types, form data, and
utility types like `InferRequestType` and `InferResponseType`. However, type
inference can slow down IDEs with large route counts due to massive type
instantiations.

Hono RPC provides typed client inference directly from Hono endpoints. It is
lighter than tRPC and could be attractive for an all-TypeScript monorepo.[^1]

**Use it only if all of these are true:**

- The route is internal/non-public.
- Client and server are released together.
- The route has no need for an independently published OpenAPI contract.
- It is not a PowerSync command, OAuth callback, webhook, or product API
  boundary.
- It does not force the Expo app to import the backend application package.
- The route count is small enough to avoid IDE performance degradation.

Even then, prefer the shared Zod contract/client wrapper for consistency. Hono
RPC must not become a backdoor that bypasses the error envelope, auth adapter,
Zod output parsing, API versioning, or package boundaries.

## TanStack Query Role

Use TanStack Query selectively, not as the universal data layer.

| Surface                                 | Data mechanism                                                             | Why                                                           |
| :-------------------------------------- | :------------------------------------------------------------------------- | :------------------------------------------------------------ |
| Mobile Today/tasks/calendar             | PowerSync reactive SQLite queries                                          | Offline-first, source-local, automatically synchronized       |
| Mobile command status/sync token        | API client + local command/sync state                                      | Server capability, not replicated entity read                 |
| Mobile billing/profile/connection state | API client + TanStack Query                                                | Not necessarily replicated; standard cache/invalidation works |
| Web server-rendered pages               | Server-side API client / direct application service call where appropriate | Good initial render, avoids unnecessary client waterfall      |
| Web interactive remote state            | API client + TanStack Query                                                | Caching, invalidation, retries, loading/error states          |
| Web live entity updates                 | Supabase Realtime/SSE or periodic invalidation, decided later              | Separate real-time category                                   |
| Backend                                 | Drizzle/domain services                                                    | No TanStack Query                                             |

TanStack Query should never own an alternate cache of replicated mobile
task/event records. That creates two inconsistent mobile truth layers.

## Security Controls

- Validate authentication in Hono independently for every protected endpoint.
- Resolve workspace membership server-side; never trust a client `workspaceId`.
- Use Zod parse, not TypeScript cast, for all request bodies/params/query
  strings.
- Apply per-user and per-IP rate limits to sensitive endpoints: token issuance,
  login-adjacent actions, calendar connect, export, deletion, and command
  bursts.
- Require idempotency for mutations.
- Verify inbound webhook signatures against raw request body before JSON parsing
  where provider requires it.
- Use CSRF protection for browser cookie-authenticated mutation flows;
  bearer-token native clients have a different threat model.
- Restrict CORS to known web origins; never use permissive credentials CORS.
- Attach strict body-size limits, especially for webhooks and upload initiation.
- Redact authorization headers and sensitive body fields from logs and error
  reports.
- Make health endpoints disclose only safe liveness/readiness metadata.
- Use a separate internal/admin route namespace and network/auth policy if such
  endpoints are later needed.

## Testing

### Contract tests

Every route must have tests that verify:

- Valid input produces a Zod-valid response.
- Invalid body/query/path values return the standard validation error.
- Unauthenticated and cross-workspace requests fail safely.
- Error code/status mapping is stable.
- Required idempotency behavior works across retries.
- OpenAPI output contains the route’s intended schemas and security requirement.
- No response includes prohibited persistence/internal fields.

### Client tests

Test:

- Token acquisition failure and refresh behavior.
- Network timeout/abort behavior.
- Error parsing of non-JSON, malformed, and valid problem responses.
- Idempotency-key reuse/retry behavior.
- No authorization leakage to another origin.
- Command fallback behavior when offline.
- Response schema mismatch handling as a safe failure, with telemetry that
  excludes user content.

## Trade-Offs

| Choice                           | Gain                                                          | Cost                                              |
| :------------------------------- | :------------------------------------------------------------ | :------------------------------------------------ |
| Typed REST over tRPC             | Durable, inspectable, versionable cross-platform contract     | More endpoint/DTO design                          |
| Zod as runtime source            | Real external-input validation                                | Requires maintaining schemas deliberately         |
| @hono/zod-openapi for OpenAPI    | Single source of truth, automatic generation, no schema drift | Requires adopting OpenAPIHono pattern             |
| OpenAPI artifact                 | Compatibility review and future SDK/public API path           | Generator/tooling integration effort              |
| Handwritten client initially     | Correct auth/error/offline behavior with small surface        | Some manual wrapper code                          |
| Native fetch over Axios          | Smaller dependency surface and web-standard behavior          | Must implement timeout/error wrapper              |
| Command endpoints                | Preserves intent, auditing, invariants, and idempotency       | Less generic than CRUD                            |
| PowerSync reads + API commands   | Clear offline source of truth                                 | Two mechanisms to understand, correctly separated |
| TanStack Query only where needed | Avoids duplicate local entity cache                           | Requires explicit data-ownership rules            |
| Future openapi-fetch generation  | Types-only generation with minimal runtime (6kb)              | Requires OpenAPI spec maintenance                 |
| Future Stainless SDK generation  | Production-ready with auto-pagination, retries, streaming     | Commercial service, overkill for internal APIs    |

## Final Decision

Lock the following API-client architecture:

```text
Primary API style:            Versioned JSON-over-HTTPS REST/command API
Backend transport:            Hono routes with @hono/zod-openapi for OpenAPI generation
Runtime contract source:      Zod schemas in packages/contracts
API description:              OpenAPI 3.x, generated from @hono/zod-openapi, versioned and CI-validated
TypeScript client:            Handwritten packages/api-client wrapper over native fetch
Response validation:          Zod parse for critical responses and all development/test builds
Client cache:                 TanStack Query for non-replicated remote/server state only
Mobile entity reads:          PowerSync reactive SQLite; no parallel HTTP task/event cache
Mobile mutation delivery:     PowerSync command upload path, with typed HTTP command fallback
Mutation safety:              Command IDs/idempotency keys, standard typed error envelope
tRPC:                         Rejected as primary API layer
Hono RPC:                     Optional internal convenience only; never the canonical app contract
Direct Supabase CRUD:         Rejected for product writes
Future client generation:    Evaluate openapi-fetch for types-only or Stainless for full SDK when API surface grows
```

The next category in the dependency order is **Backend Framework**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^7][^8][^9][^18][^19][^20][^21][^22][^23][^24][^25][^26]</span>

<div align="center">⁂</div>

[^1]: https://hono.dev/docs/guides/rpc

[^2]: https://trpc.io/docs/

[^3]: https://openapi-generator.tech/docs/generators/typescript/

[^4]: 07-Technical-Architecture-Fundamentals.md

[^5]: 08-Key-Technical-Decisions-Rationale.md

[^6]: https://trpc.io/docs/client/nextjs

[^7]: https://trpc.io/docs/v10/client/nextjs/setup

[^8]: https://trpc.io/docs/example-apps

[^9]: https://learn.microsoft.com/en-us/openapi/kiota/quickstarts/typescript

[^10]: https://docs.expo.dev/guides/using-nextjs/

[^11]: https://sap.github.io/cloud-sdk/docs/js/features/openapi/generate-client

[^12]:
    https://dev.to/moznion/openapi-fetch-gen-generate-typescript-api-client-from-openapi-typescript-interface-definitions-kjd

[^13]: https://trpc.node.org.cn/docs/client/nextjs/setup

[^14]: https://github.com/ferdikoomen/openapi-typescript-codegen

[^15]:
    https://www.stainless.com/blog/how-to-generate-a-typescript-sdk-from-your-openapi-spec/

[^16]: https://discord-questions.trpc.io/m/1398222042406584360

[^17]: https://blog.yusu.ke/hono-rpc/

[^18]: https://github.com/honojs/middleware/tree/main/packages/zod-openapi

[^19]: https://www.npmjs.com/package/@hono/zod-openapi

[^20]: https://www.npmjs.com/package/zod-openapi

[^21]: https://github.com/asteasolutions/zod-to-openapi/releases

[^22]: https://typemorph.dev/converters/zod-to-openapi/

[^23]: https://www.npmjs.com/package/openapi-fetch

[^24]: https://www.stainless.com/products/sdks

[^25]: https://blog.openreplay.com/type-safe-openapi-typescript-client/

[^26]: https://loicb.tech/blog/2026/shared-web-mobile-codebase
