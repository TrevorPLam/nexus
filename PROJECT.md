# Life OS - Technology Decisions

## Locked Technology Stack

### Foundational

**Language & Runtime**
- TypeScript strict mode + Node.js 24.x LTS
- TypeScript version: 5.9+ (evaluate 6.0 only after monorepo compatibility confirmed)
- Module system: ESM with nodenext/bundler resolution
- Runtime validation: Zod at every external trust boundary
- Enums: Avoid; use const objects and union types
- Native Node type stripping: Permitted for constrained tooling only, not application builds
- Type checking: tsc --noEmit in CI
- Rationale: Industry standard, mature ecosystem, long-term support until 2029, end-to-end model integrity
- Compatibility: All tools in stack support Node.js 24.x

**Monorepo**
- pnpm 11 workspace + Turborepo 2.9.x
- Node.js baseline: 22 LTS or newer (required by pnpm 11)
- Version governance: pnpm catalogs with catalogMode: strict
- Internal linking: workspace:* protocol for all internal dependencies
- Lockfile: Root pnpm-lock.yaml only
- Package manager pinning: Corepack/packageManager or devEngines.packageManager
- Supply-chain defaults: minimumReleaseAge: 1 day (pnpm 11 default)
- .npmrc: Auth/registry-only in pnpm 11
- Lifecycle scripts: allowBuilds for packages needing them (e.g., sharp, esbuild)
- Rationale: Strict dependency isolation, efficient disk usage, fast builds, excellent TypeScript support
- Compatibility: Works with Node.js 24.x, all packages support pnpm

**Secret Management**
- Validation: @t3-oss/env-core (or @t3-oss/env-nextjs) + Zod per deployable app
- Runtime access: Import app-specific env; never read process.env elsewhere
- Client safety: Explicit NEXT_PUBLIC_ / EXPO_PUBLIC_ schemas only
- Runtime secret storage: Platform-native stores (Vercel, EAS, Railway/Fly/Render, Supabase config)
- CI authentication: GitHub Actions OIDC wherever supported (restrict repository/branch/environment/workflow/audience/properties)
- CI secret fallback: GitHub Environment secrets, protected and least-privilege
- Database-local secrets: Supabase Vault only when PostgreSQL/Supabase code needs them
- Centralized vault: Defer; evaluate Infisical first if/when centralization needed
- Local files: Gitignored per-app .env files plus committed .env.example templates; optional encrypted .env via dotenvx
- Rationale: Type-safe environment validation, zero runtime overhead, minimal secret duplication
- Compatibility: Works across Vercel, EAS, and local development

**CI/CD**
- Primary platform: GitHub Actions for monorepo CI/CD
- Web deploy: Vercel native Git integration (preview auto; manual promote to production)
- Mobile release: EAS Workflows (or GitHub Actions relay calling EAS Build)
- Backend deploy: GitHub Actions → container host (Railway/Fly.io/Render/VPS)
- Database migrations: GitHub Actions reusable workflow
- Branch model: Protected main; short-lived PR branches
- Required PR checks: Lint, format, typecheck, unit tests, integration tests, build, dependency review, secret scanning, architecture checks
- Task execution: pnpm + Turborepo
- Dependency installation: pnpm install --frozen-lockfile
- Dependency cache: setup-node pnpm store cache, keyed by pnpm-lock.yaml
- Turbo cache: Local initially; remote cache when repeated CI work warrants it
- Deployment environments: preview, staging, production
- Production deploy: Explicit manual approval through protected GitHub Environment
- Deployment auth: OIDC first; restricted GitHub environment secrets only as fallback
- Workflow permissions: contents: read by default; per-job least privilege
- Action security: Every action pinned to full 40-character SHA; adopt workflow-level dependency locking when GitHub ships it
- Migrations: Tested on clean DB in PR; staging before app deploy; protected serialized production workflow
- Preview safety: No production data or credentials in PR environments
- Mobile releases: Dedicated EAS Workflow or manually approved EAS relay; OTA only for compatible JS/assets
- Provenance: Attest production backend/release artifacts
- Rationale: Native GitHub integration, security and release-control system, purpose-built deploy paths
- Compatibility: All services have GitHub Actions integrations

**Code Quality**
- Type checking: TypeScript strict; tsc --noEmit per package/application
- Semantic linting: ESLint 10 with root flat config (eslint.config.mjs)
- ESLint config: defineConfig and globalIgnores from eslint/config; typescript-eslint v8+
- Framework configs: eslint-config-next/flat (Next.js 16+), eslint-config-expo/flat (Expo SDK 53+)
- Formatting: Prettier 3.9.x (exact version pinned), root configuration, checked in CI
- ESLint/Prettier relation: Prettier formats; ESLint does not enforce formatting (use eslint-config-prettier/flat last)
- Import plugin: Prefer eslint-plugin-import-x for flat config/ESLint 10 compatibility
- Architecture boundaries: dependency-cruiser + targeted ESLint no-restricted-imports/import rules
- Fast pre-check (optional): Oxlint 1.74.0 with built-in Next.js/React/Import/JSX-a11y rules
- Git hooks: Lefthook 2.1.x, staged formatting/lint/spellcheck only
- Commit conventions: Conventional Commits enforced by commitlint
- Spell checking: cspell 10.x, scoped to docs/UI copy/comments and maintained dictionary
- CI policy: Every quality command is authoritative in CI; hooks are convenience only
- Rationale: Complete ecosystem and custom policy support, clear responsibility separation
- Compatibility: All IDEs support these tools

**Development Environment & Containerization**
- Required database/service emulator: Supabase CLI local stack (v2.x stable, pinned)
- Container-runtime baseline: Docker Desktop (free below 250 employees / $10M revenue)
- Supported alternatives: OrbStack (preferred on macOS), Rancher Desktop, Podman Desktop; Colima/Finch for advanced users
- Application dev servers: Run directly on host or optional Dev Container
- Docker Compose role: Supplemental services only; no duplicate Postgres/Supabase stack
- Dev Container: Supported and checked in, but optional; pre-build image when possible
- Supabase CLI installation: Pinned project dev dependency; use pnpm add -D supabase --allow-build=supabase on pnpm 10+
- Integration DB tests: Testcontainers PostgreSQL with pinned image and .withReuse()
- RLS/Auth integration tests: Local Supabase CLI stack or dedicated isolated CI environment
- E2E test data: Deterministic synthetic seeds only
- Backend container: Build from day one; local container use optional
- Local network posture: Bind service ports to loopback; never publicly expose local stack
- Rationale: High production fidelity for database/Auth/Storage/RLS work, broad tool compatibility
- Compatibility: Works with Node.js 24.x, pnpm, all container runtimes

### Data & Persistence

**Database**
- Database engine: PostgreSQL
- Primary provider/platform: Supabase-managed PostgreSQL
- Minimum version: PostgreSQL 15; select newest Supabase-supported stable major at creation (currently 17)
- Data model: Normalized relational core plus constrained JSONB metadata and entity_links
- Authorization: PostgreSQL RLS, default-deny, workspace membership based
- Client access: No unrestricted direct writes; mobile mutations use validated command pipeline
- Transactions: Authoritative mutation + audit/outbox event atomically committed
- Planning performance: Precomputed daily-plan projection, not live graph traversal
- MVP search: PostgreSQL FTS + pg_trgm
- Connections: Supavisor transaction pooling for normal backend requests; direct/native for migrations only
- Backups: Paid plan; daily backups; PITR verified before real beta data; separate object-storage backup policy
- Portability: Standard PostgreSQL SQL/migrations; Supabase-specific SDK calls isolated behind adapters
- Rationale: Full PostgreSQL feature set, managed infrastructure, built-in auth/storage, RLS support
- Compatibility: Works with Drizzle ORM, PowerSync, pg-boss

**ORM**
- Server ORM/query layer: Drizzle ORM (^0.45.2 / latest 0.4x supported by @powersync/drizzle-driver)
- Backend PostgreSQL driver: postgres.js
- Schema style: Drizzle TypeScript schema, organized by domain
- Migration generation: drizzle-kit generate (^0.31.10 / compatible 0.3x)
- Applied migration history: supabase/migrations as the sole committed/applied history
- Migration application: Supabase CLI in local/CI/staging/production
- Schema push: Prohibited outside disposable local experiments
- RLS/policies: Drizzle declaration where expressive; reviewed raw SQL where necessary
- Database access boundary: Backend/migration tools only; never web/mobile directly
- Mobile local schema: Separate packages/mobile-data, PowerSync official Drizzle driver
- Public contracts: Zod schemas, never direct database row types
- Raw SQL: Permitted for advanced Postgres features, parameterized and tested
- Inspection: Supabase Studio primary; Drizzle Studio local-only optional
- Rationale: Type-safe, SQL-first, PowerSync driver alignment, schema-to-migration workflow
- Compatibility: Native PostgreSQL support, works with Supabase, PowerSync integration

**Authentication**
- Authentication provider: Supabase Auth
- Web SDK: @supabase/ssr for Next.js App Router integration
- Mobile SDK: @supabase/auth-helpers-react-native and supabase-js for Expo with secure token storage
- Server validation: Hono verifies Supabase JWT signature, issuer, audience, and expiry
- Supabase integration: Native RLS integration using auth.uid() and auth.jwt()
- PowerSync token path: Native Supabase Auth integration (auto-detects JWKS, uses authenticated audience)
- Product user record: PostgreSQL app_users mapped by immutable supabase_user_id
- Authorization source of truth: PostgreSQL workspace_memberships + RLS + backend policy checks
- Organizations: Modeled in application schema (Supabase Auth has no built-in orgs)
- MVP sign-in methods: Email-based method plus Google sign-in; separate Calendar OAuth consent
- MFA: Available; mandatory for staff/admin and sensitive actions as policy matures
- Passkeys: Available in beta; roadmap dependent
- Critical gate: Supabase Auth -> RLS -> PowerSync Expo proof of concept before core build
- Fallback if gate fails: Consider Clerk or Better Auth as alternatives before domain implementation proceeds
- Alternative primary: Clerk is a credible alternative if pre-built UI is priority over cost
- Long-term graduation: Consider migration to Better Auth at 50K MAU if cost becomes a concern
- Rationale: 70x cost advantage over Clerk at scale, native PostgreSQL integration, vendor consolidation
- Compatibility: Works with RLS, mobile SDKs, web SDKs, PowerSync

**Authorization**
- Identity issuer: Supabase Auth
- Product authorization truth: PostgreSQL app_users + workspaces + workspace_memberships
- Database enforcement: PostgreSQL RLS on every user/workspace-scoped table
- RLS default: Deny unless an explicit policy permits access
- RLS owner behavior: FORCE ROW LEVEL SECURITY for user-data tables where appropriate
- Membership source: Database membership lookup, not JWT workspace claims
- JWT use: Minimal identity/session claims; role=authenticated for Supabase; no workspace/billing/entitlement claims
- Business authorization: Hono typed command handlers, separate from row filtering
- User writes: Validated command pipeline; no broad direct CRUD access
- Privileged processes: Dedicated least-privilege worker/service roles with auditable access
- PowerSync: Native Supabase Auth integration; Sync Streams filter per resolved membership; isolation PoC required
- Storage: Workspace-scoped paths and matching access policy
- Policy implementation: Drizzle pgTable.withRLS()/pgPolicy with drizzle-orm/supabase roles; reviewed SQL for all edge cases
- Testing: Two-user/two-workspace RLS matrix required for every protected data domain
- Support access: No broad impersonation in V1
- Rationale: Database-level security, defense in depth, no bypass possible, scalable
- Compatibility: Native to Supabase PostgreSQL, works with Supabase Auth

**Offline Sync**
- Sync engine: PowerSync Cloud
- Mobile SDK: PowerSync React Native / Expo SDK
- Local database adapter: OP-SQLite (native); Expo Go experiments only with @powersync/adapter-sql-js
- Local database: SQLite managed through PowerSync
- Server source of truth: Supabase-managed PostgreSQL
- Schema integration: Separate client-safe PowerSync/Drizzle schema in packages/mobile-data
- Authentication to Life OS: Supabase Auth session token
- Authentication to PowerSync: Native Supabase Auth integration (auto-detects JWKS, uses authenticated audience)
- Replication: Per-user/per-workspace minimal selective Sync Streams
- Writes: Typed idempotent commands through backend; no generic direct row CRUD
- Conflict model: Server-defined by entity/action; LWW only for low-risk field updates
- Failure UX: Reconciliation plus user-visible Sync Issues state
- Sign-out: Disconnect and securely delete prior user/workspace replica and queued data
- Critical gate: Complete Expo Supabase Auth -> PowerSync -> Supabase proof of concept before core implementation
- Fallback: Custom PowerSync JWT issued by Hono if native Supabase Auth integration fails
- Rationale: SQLite-based replication, conflict resolution, works offline, official Expo/React Native support
- Compatibility: Expo SDK, Supabase PostgreSQL, React Native

### Application Layer

**API Client**
- Primary API style: Versioned JSON-over-HTTPS REST/command API
- Backend transport: Hono routes with @hono/zod-openapi for OpenAPI generation
- Runtime contract source: Zod schemas in packages/contracts
- API description: OpenAPI 3.x, generated from @hono/zod-openapi, versioned and CI-validated
- TypeScript client: Handwritten packages/api-client wrapper over native fetch
- Response validation: Zod parse for critical responses and all development/test builds
- Client cache: TanStack Query for non-replicated remote/server state only
- Mobile entity reads: PowerSync reactive SQLite; no parallel HTTP task/event cache
- Mobile mutation delivery: PowerSync command upload path, with typed HTTP command fallback
- Mutation safety: Command IDs/idempotency keys, standard typed error envelope
- tRPC: Rejected as primary API layer
- Hono RPC: Optional internal convenience only; never the canonical app contract
- Direct Supabase CRUD: Rejected for product writes
- Future client generation: Evaluate openapi-fetch for types-only or Stainless for full SDK when API surface grows
- Rationale: Durable, inspectable, versionable cross-platform contract, works across web/mobile/jobs/webhooks
- Compatibility: Works with Hono, Next.js, Expo, TanStack Query

**Backend**
- HTTP framework: Hono v4.12.x
- Node adapter: @hono/node-server v2.x
- Production runtime: Node.js 24.x LTS
- Deployment model: Long-lived stateless Node container/service
- Route style: Versioned JSON HTTP API plus command endpoints
- Validation: Zod v4 at all external boundaries via Standard Schema (@hono/standard-validator)
- OpenAPI: Generated from Hono routes with @hono/zod-openapi
- Business logic: Framework-independent domain/application packages
- Persistence: Drizzle + postgres.js; explicit transaction boundaries
- Authentication: Supabase Auth JWT middleware, then workspace membership authorization
- Writes: Typed idempotent commands; audit + outbox in same transaction
- Jobs: Separate Node worker service, never request-lifecycle background work
- Webhooks: Dedicated raw-body, signature-verified, idempotent routes
- Observability: Structured redacted logs, tracing/metrics, liveness/readiness endpoints
- Serverless/edge: Not the primary API runtime; reconsider only for narrow stateless endpoints
- Alternatives: Fastify v5.x is a credible Node-only fallback; NestJS v12 (Q3 2026) narrows the Zod gap but remains heavier; Express/Next route handlers/Elysia/Cloudflare primary rejected for MVP
- Rationale: Fast, lightweight, excellent TypeScript support, Web-standard portability, small API surface
- Compatibility: Node.js 24.x LTS, works with Drizzle, postgres.js, Zod, OpenAPI tools

**Web Framework**
- Web framework: Next.js 16, App Router
- Rendering default: React Server Components
- Interactive UI: Client Components only where browser interaction requires them
- Authentication: Official Supabase Auth Next.js App Router integration
- Product API: Hono /v1 API remains canonical for cross-platform commands and services
- Next.js Server Actions: Limited to web-only presentation mutations; not canonical domain commands
- Next.js Route Handlers: Narrow web-specific utilities only; no product /v1 API, webhooks, OAuth, or DB access
- Data access: Shared typed API client; optional shared application-service invocation only after policy-safe boundary exists
- Authenticated caching: Dynamic/no shared cache by default; explicit Cache Components for opt-in caching
- Remote client state: TanStack Query where needed
- Mobile sync: PowerSync only; do not force it into web for MVP
- Deployment: Separate Next.js web service from Hono API and Node worker
- Alternatives: React Router v7 Framework Mode credible but not selected; TanStack Start monitor for future; SvelteKit/Astro rejected for this stack
- Rationale: React framework with server components, excellent DX, Vercel-native, mature ecosystem, strongest Clerk integration
- Compatibility: Works with Tamagui, TanStack Query, Supabase

**Mobile Framework**
- Mobile framework: React Native with Expo managed workflow
- Navigation: Expo Router only
- Development workflow: EAS Development Builds, not Expo Go for core work
- Primary destinations: Today, Plan/Tasks, Calendar, Notes, More
- Detail navigation: Nested stacks
- Create/focused interactions: Modal routes
- Deep linking: Expo Router; verified Universal Links/App Links in production, custom scheme for development/provider compatibility
- Web strategy: Separate Next.js web application
- Authentication: Supabase Auth Expo integration with secure token storage
- Offline entity data: PowerSync local SQLite
- Non-replicated remote state: Typed API client; narrowly scoped TanStack Query if needed
- Environment isolation: Separate dev, preview/staging, and production app/API/auth/sync config
- Native permissions: Just-in-time, feature-triggered requests
- Alternatives: Flutter 4.x rejected due to Dart talent pool and ecosystem; KMP rejected due to macOS CI requirement; Tauri 2 Mobile rejected due to WebView limitations; bare React Native rejected due to higher maintenance burden
- Rationale: Fast iteration, no native code needed, file-based routing, largest talent pool, excellent PowerSync integration
- Compatibility: Works with PowerSync, expo-notifications, Tamagui

**UI System**
- Design-system foundation: Tamagui
- Shared package: packages/ui
- Shared assets: Tokens, themes, fonts, icons, primitives, semantic patterns
- Theme support: System, light, and dark from initial implementation
- Web styling: Tamagui plus web-only CSS/DOM tooling for advanced interfaces
- Mobile styling: Tamagui plus native React Native/Expo implementations where required
- Component-sharing policy: Share foundations and simple primitives; do not force complex composites universal
- Forms: React Hook Form + Zod + accessible field primitives
- Icons: One wrapped cross-platform icon system
- NativeWind: Rejected as primary styling system (v5 does NOT support Next.js)
- Material/component suites: Rejected as visual authority; use focused primitives only when justified
- Accessibility: Keyboard/screen-reader/dynamic-type/reduced-motion support is required, not deferred
- Quality control: Component playground plus targeted visual regression testing
- Rationale: Cross-platform (web + mobile), performant, typed styles, unified tokens/themes
- Compatibility: Works with Next.js, Expo, React Native

**State Management**
- Mobile replicated entities: PowerSync SQLite, queried through packages/mobile-data hooks
- Mobile offline mutations: Durable typed command queue/upload flow; not React Query mutations
- Mobile non-replicated HTTP: TanStack Query, scoped to profile/integration/entitlement/service state
- Web remote data: Server Components for initial data; TanStack Query for interactive HTTP state
- Web/mobile transient UI: React local state/reducer first
- Cross-screen UI state: Feature-scoped Zustand stores only when justified
- Forms: React Hook Form + Zod
- Auth/session: Supabase Auth SDK and secure token cache
- Navigation: Next.js URL/router and Expo Router
- Global entity store: Prohibited
- Redux/RTK Query: Rejected
- TanStack Query as entity sync: Rejected
- Zustand as entity cache: Rejected
- Persistence: Only low-risk UI preferences; never tokens or replicated personal data
- Alternatives: Supastash considered as alternative if Supabase-first approach preferred; TanStack DB v0.6 deferred (BETA); Synchro deferred (PostgreSQL 18 requirement); Recoil rejected (deprecated)
- Rationale: Offline-first data sync, server state management, caching, one clear owner per state category
- Compatibility: Works with Supabase, React, React Native

### Infrastructure & Operations

**Jobs/Queues**
- Durable queue: pg-boss on Supabase PostgreSQL
- Atomic event handoff: Transactional outbox_events table
- Worker runtime: Separate long-lived Node.js worker service
- Scheduling: pg-boss delayed jobs / cron schedules
- API runtime role: Commits domain change + audit + outbox atomically; never performs durable side effects inline
- Idempotency: Required at command, outbox, job, and provider-operation levels
- External workflows: Defer Inngest/Trigger.dev until a defined need proves pg-boss insufficient
- Redis: Not introduced for MVP
- Alternatives: Hatchet (Postgres-based) strong alternative for complex workflows; Graphile Worker strong alternative for high-throughput; Inngest/Trigger.dev deferred for complex workflows; BullMQ + Redis rejected (adds Redis infra); Temporal rejected (expensive/complex for MVP)
- Rationale: Single database, transactional integrity, no additional infrastructure, atomic relation to domain DB transaction
- Compatibility: Native to Supabase PostgreSQL, works with Drizzle

**Realtime**
- Mobile replicated entities: PowerSync replication and reactive SQLite queries only
- Web realtime mechanism: Supabase Broadcast from Database (trigger-based) with private authorized channels
- Event purpose: Best-effort, sanitized invalidation and status hints only
- Canonical data after event: Hono API refetch / TanStack Query invalidation (prefix/predicate-based)
- Raw Postgres Changes: Rejected for core client entity data (single-threaded bottleneck at scale)
- Broadcast emission: Worker emits after committed outbox-driven processing (default); DB triggers with realtime.broadcast_changes() for selective high-volume use
- Authorization: Realtime RLS policy based on active workspace membership; Supabase Auth native integration; Supabase/PowerSync compatibility is a required spike
- Topics: At most active workspace, active user, and temporary active-connection topics
- Client send/presence: Denied/deferred for MVP
- Mobile Supabase Realtime: Not used for replicated domain tables
- Fallback if auth spike fails: Hono-authenticated SSE for web hints (HTTP/2 compatible), or polling/refetch on focus/mutation
- Correctness model: Events may be missed/duplicated/out of order; reconciliation remains mandatory
- Push/reminders: Separate notifications/scheduling system, never Realtime Broadcast
- Alternatives: Supabase Postgres Changes directly to clients rejected (raw table/row coupling, bottleneck); Hono SSE preferred fallback if Supabase Realtime auth fails; Hono/custom WebSockets rejected for MVP (operational complexity); Firebase/Firestore realtime rejected (conflicts with PostgreSQL); Ably/Pusher/Socket.io deferred (extra vendor/cost)
- Rationale: Offline-first mobile sync, lightweight web notifications, uses existing selected platforms
- Compatibility: Works with Supabase, PowerSync, React

**Notifications**
- Mobile SDK: expo-notifications
- MVP transport: Expo Push Service over APNs and FCM
- Scheduling authority: PostgreSQL reminder records + pg-boss delayed jobs
- Local reminders: Scheduled on current eligible device for a bounded near-term horizon
- Remote reminders: Server-scheduled for long-horizon, cross-device, changed, and account/integration events
- Deduplication: Reminder ID + revision + installation/channel idempotency model
- Device tokens: Authenticated installation registry, environment-scoped, invalidated by receipts/sign-out/deletion
- Deep links: Opaque IDs through Expo Router; session/membership always revalidated
- Content default: Generic, privacy-preserving; detailed titles only by explicit user preference
- Permissions: Requested just in time after reminder-related user intent
- Quiet hours/frequency: Timezone-aware, user configurable, conservative caps and bundling
- Android: Stable channels for reminders, planning, account, and low-priority sync
- iOS: No critical/time-sensitive alerts in MVP
- Web push: Deferred
- Realtime Broadcast: Never used as notification delivery
- Direct APNs/FCM: Deferred until scale/control/compliance requires it
- Alternatives: Local notifications only rejected (cannot handle server-side changes); Remote push only rejected (device offline issues); Direct APNs + FCM deferred (higher operational complexity); Firebase Cloud Messaging only rejected (doesn't solve iOS without APNs); react-native-notify-kit considered only if advanced Android features required; OneSignal/customer-engagement platforms deferred (extra vendor/data sharing); Email/SMS rejected (noisy/intrusive); Browser push deferred
- Rationale: Native mobile notifications, Expo-managed service, hybrid local+remote for offline resilience and server authority
- Compatibility: Works with Expo, React Native

**File Storage**
- Object storage: Supabase Storage for MVP
- Bucket access: Private only; public attachment buckets prohibited
- Authorization: Hono verifies user, workspace, entity, quota, and policy before signing
- Upload path: Initiate -> short-lived signed direct upload to quarantine -> complete -> verify/scan -> approve
- Download path: Fresh short-lived signed URL issued only after current authorization
- Metadata: PostgreSQL attachments/links tables; safe metadata replicated through PowerSync
- Binaries: Never PowerSync-replicated; downloaded/cached on demand
- Security: Server-generated opaque keys, allowlisted type/size limits, quarantine, scan/verify, no service keys in clients
- Deletion: Soft metadata delete then idempotent worker object deletion and retention cleanup
- Mobile offline: Metadata available; binary cache bounded and cleared on sign-out/account switch; offline binary upload deferred
- Web preview: Download-first for unknown types; sandbox/strict policy for any approved inline previews
- MVP file scope: Small images first; documents only after scanning/preview policy is ready
- Future migration: Object-store port permits R2 or S3 if cost/compliance/scale requires it
- Alternatives: Cloudflare R2 deferred (zero egress fees, S3-compatible); Tigris deferred (globally distributed); Amazon S3 deferred (mature ecosystem, higher egress costs); Backblaze B2 deferred (cheapest storage); Wasabi deferred (flat-rate pricing); MinIO rejected (self-hosted operational overhead); UploadThing rejected (additional vendor); Cloudinary deferred (media-first); Store binary in PostgreSQL rejected (database bloat); Store in PowerSync SQLite rejected (massive device storage/sync cost); Client-only local files rejected (no cross-device availability)
- Rationale: Integrated with auth/RLS, S3-compatible, managed service, fewer systems at MVP
- Compatibility: Works with Supabase Auth, RLS policies

**Search**
- MVP engine: PostgreSQL Full Text Search plus pg_trgm
- Canonical index: search_documents PostgreSQL projection table
- Indexing path: Transactional outbox -> pg-boss worker -> idempotent projection upsert/delete
- Search API: Hono GET /v1/search with validated query, filters, cursor, and workspace scope
- Authorization: Hono membership enforcement plus database/RLS defense in depth
- Ranking: Title/exact/FTS relevance with active-status and recency boosts
- Snippets: Server-generated, escaped, bounded, and privacy-filtered
- Indexed content: Approved task/project/goal/area/note text; limited calendar titles initially
- Excluded content: Tokens, provider payloads, audit/billing/security data, attachment contents, sensitive calendar fields by default
- Mobile: PowerSync-backed scoped local search; global search only online in MVP
- Web: Debounced/cancelled Hono search through TanStack Query; accessible command palette and search page
- Meilisearch: Deferred until measured quality/latency/scale need justifies a second index
- pg_textsearch: Evaluate if standard FTS ranking proves inadequate (Postgres-native BM25)
- pgvector: Prefer over external vector databases when semantic search is needed
- Vector/semantic search: Defer until lexical search is proven and privacy review complete
- Analytics: Aggregated/redacted; raw search query logging disabled by default
- Alternatives: Meilisearch deferred (fast instant search, typo tolerance); Typesense deferred (GPL v3 license); Algolia rejected (cost, vendor lock-in); Elasticsearch/OpenSearch rejected (operational burden); pg_textsearch evaluate later; Supabase pg_search evaluate later; Plain ILIKE rejected (poor relevance); Client-side fuzzy index deferred (requires full content replication); pgvector deferred (embedding complexity); Edge/Serverless search rejected (not relevant); Embeddings/vector search deferred (privacy concerns)
- Rationale: Built-in to PostgreSQL, sufficient for MVP, no additional infrastructure, single database advantage, privacy by design
- Compatibility: Native to Supabase PostgreSQL

**Observability**
- Error tracking: Sentry Cloud (primary recommendation)
- Alternative for cost control: GlitchTip (self-hosted or hosted) or Better Stack all-in-one
- Web/mobile SDKs: Sentry Next.js and @sentry/react-native
- Backend/worker errors: Sentry Node SDK with normalized, redacted error capture
- Traces and metrics: OpenTelemetry over OTLP, primarily for Node API and worker
- Telemetry backend: Grafana Cloud or another OTLP-compatible managed service; keep exporter configuration vendor-neutral
- Application logs: Pino-style structured JSON to stdout
- Log destination: Hosting provider initially; Better Stack/Loki optional later
- Correlation: request_id, W3C trace_id, correlation_id, command_id, outbox_event_id, job_id, release
- Privacy: Allowlist fields, pre-export redaction, no bodies/tokens/content/query text, session replay disabled by default
- Privacy enhancement option: LuminaLog or Nonym for PII redaction at ingestion edge if regulated
- Metrics: Bounded-cardinality labels only
- Alerts: Actionable API, worker/outbox, queue, provider, and release-regression conditions
- Retention: Short, explicit, environment-specific policies with deletion handling
- Testing: Automated secret/PII redaction tests plus failure, backlog, and release observability tests
- Alternatives: Sentry only rejected as final architecture (weaker metrics/logs portability); GlitchTip considered for cost control/self-hosting; Better Stack strong alternative for cost-conscious teams; Datadog deferred for enterprise scale; Grafana Cloud + OTel + Loki rejected as sole solution for MVP; SigNoz considered for OTel-first teams; Privacy-first platforms considered for regulated industries; Self-hosted Grafana/Loki/Tempo/Prometheus rejected for MVP; Console logs only rejected; Firebase Crashlytics only rejected; OpenTelemetry only rejected as sole solution
- Rationale: Error tracking, distributed tracing, industry standard, privacy-safe diagnosis, vendor portability
- Compatibility: Works with Node.js, Next.js, Expo

**Testing**
- Primary test runner: Vitest
- Unit/component/API route tests: Vitest + Testing Library + Hono app.request()
- Database/RLS/outbox/jobs: Real ephemeral PostgreSQL integration environment
- Web E2E: Playwright
- Mobile E2E: Maestro on EAS development/preview builds
- Mobile escalation: Detox for critical offline/notification/account-switch scenarios requiring gray-box synchronization
- Contract safety: Zod DTO/error validation, OpenAPI compatibility checks, supported-client fixtures
- Visual QA: Targeted Storybook/component screenshots
- Accessibility: axe-style automation plus manual keyboard, VoiceOver, and TalkBack checks
- Performance: k6/Artillery against isolated staging
- Security: Secret/dependency/SAST scans plus IDOR/RLS/OAuth/webhook/redaction suites
- CI: Fast deterministic gates on PR; broad integration/device/provider suites nightly and before release
- Top regression priorities: Cross-workspace isolation, offline durability, idempotency, account switching, calendar/OAuth/webhooks, job recovery, notification safety, and telemetry redaction
- Alternatives: Jest rejected (slower, legacy); Cypress rejected (higher flake rate, no Safari); Appium rejected (WebDriver overhead); Detox contingency only for critical scenarios; SQLite integration tests rejected (cannot validate RLS/PostgreSQL features); Mock-based database tests rejected (cannot validate RLS/transactions/outbox)
- Rationale: Fast unit tests, browser E2E, mobile flow testing, real PostgreSQL for integration, risk-based test pyramid
- Compatibility: Works with TypeScript, Next.js, Expo

### Release & Governance

**Environments**
- CI/CD orchestrator: GitHub Actions
- Protection/secrets: GitHub Environments with protected production approval and scoped secrets
- Branching: Trunk-based; protected main; short-lived PR branches; release tags
- Artifact model: Build once, tag by Git SHA/digest, validate in staging, promote unchanged to production
- Web: Vercel preview/staging/production deployments
- API and worker: Separate long-lived Node container services, starting with a Render vs Fly.io staging spike
- Database: Separate Supabase staging and production projects
- Migrations: Reviewed versioned SQL through Supabase CLI; expand-contract; CI applies only in protected deployment jobs
- Mobile binaries: EAS Build and store phased rollout
- Mobile OTA: EAS Update, explicit runtimeVersion, preview validation, percentage rollout, rollback plan
- Rollbacks: Prior immutable web/container artifact; EAS Update rollback; forward database repair migration
- Feature flags: Small server-controlled internal system initially
- Observability gate: Sentry release/source maps, health checks, canary tests, dashboards and queue checks
- Security: Least-privilege CI permissions, SHA-pinned actions, no secrets to untrusted PRs, separate environment credentials
- Documentation: Versioned deployment/migration/rollback/worker/mobile runbooks
- Alternatives: GitLab CI/CD rejected (requires moving source-control); CircleCI rejected (extra vendor/cost); Buildkite rejected (operational work); Vercel-only functions rejected (poor fit for Hono/worker); Serverless API/jobs rejected (execution time limits); Kubernetes rejected (operational overhead); AWS ECS/Fargate deferred (higher complexity); Terraform/Pulumi deferred (setup cost before infrastructure is complex); Manual console deploys rejected (no repeatability)
- Rationale: GitOps workflow, reproducible builds, environment-specific secrets, protected deployments
- Compatibility: Works with GitHub Actions, Vercel, EAS

**Analytics**
- Marketing-site analytics: Plausible on public, unauthenticated web pages only
- Authenticated product analytics: Minimal first-party PostgreSQL product_events ledger
- Core outcome events: Server/outbox/worker generated whenever authoritative state exists
- Client-only events: Small allowlisted schema through Hono ingestion endpoint, bounded/offline-tolerant queue
- Identity: Environment-scoped HMAC pseudonymous actor/workspace/installation references
- Content policy: No task/note/calendar/attachment/search text, no raw IDs/emails/tokens/URLs/request bodies
- Governance: Shared versioned Zod event schema registry; unknown properties rejected
- Consent: Optional product analytics preference, enforceable client and server side; essential operational telemetry governed separately
- Reporting: Reviewed PostgreSQL aggregate views/dashboards, raw events tightly restricted
- Retention: 30-day raw optional product events; 13-month aggregates; explicit deletion handling
- Feature flags: Existing server-controlled flags, one authority only
- Experiments: Deferred until hypothesis, sample, consent, tracking plan, and privacy review are ready
- Session replay/autocapture: Prohibited in MVP
- PostHog/Amplitude: Deferred until validated product-analytics maturity justifies vendor/data-processing trade-off
- Data warehouse: Deferred
- Alternatives: PostHog Cloud deferred (adds third-party behavioral data processor, replay/autocapture risks, feature flags duplicate selected system); PostHog self-hosted deferred (operational complexity); Amplitude deferred (new vendor/cost and sensitive behavioral-data flow); Mixpanel rejected initially (similar vendor/privacy/identity costs); Segment/RudderStack CDP rejected (encourages data proliferation); Plausible for all analytics rejected (does not provide authenticated user-level product funnels/retention); Custom event tables only rejected (can become ad hoc, slow, and hard to monitor); Session replay/heatmaps prohibited (high privacy burden); Autocapture prohibited (unpredictable collection, weak taxonomy); Data warehouse first deferred (cost and data-engineering burden)
- Rationale: Privacy-first, server-governed, minimal third-party tracking, self-owned data, GDPR-compliant
- Compatibility: Works with Supabase PostgreSQL

**Security**
- Security baseline: OWASP ASVS/API Security principles; NIST Privacy Framework for risk management
- Authentication: Clerk session/token verification in Hono; recent auth for high-risk actions
- Authorization: Typed server-side policies for every action/object, backed by PostgreSQL RLS
- BOLA/IDOR defense: Mandatory workspace-scoped resource lookup and action check on every user-supplied ID
- Database roles: Separate migration, API, worker, analytics, and break-glass roles; no general service-role use
- Mobile security: Minimum PowerSync scope; no credentials/internal tables/binary attachments replicated; clear replicas/caches/tokens on sign-out, switch, or revocation
- OAuth: One-time state, PKCE, exact redirects, minimal scopes; encrypted refresh tokens server-side only
- Webhooks: Raw-body signature verification, replay/deduplication, durable async processing
- Storage: Private buckets, server-authorized short-lived signed URLs, scanning/quarantine lifecycle
- Secrets: Managed environment secret stores, inventory/rotation, never in client/logs/source
- Privacy defaults: No public data, generic notifications, no replay/autocapture/raw-query logging, minimized replication and telemetry, explicit retention/deletion
- Transport/network: TLS, strict CORS/origin/CSRF strategy, CSP/security headers, request bounds/rate limits
- Abuse controls: Endpoint/workflow quotas, queue coalescing, storage/search limits, SSRF controls
- Observability: Allowlisted/redacted telemetry; audit logs separate from analytics
- Compliance: Evidence-ready controls now; SOC 2/ISO/HIPAA/PCI certification deferred pending requirement
- Security lifecycle: Threat model/data flow/authorization/retention review for sensitive changes; automated and manual security tests plus pre-launch penetration test
- Alternatives: Clerk-only authorization rejected (one missed route creates cross-user data exposure); RLS-only authorization rejected (cannot safely express all command/business rules); Service-role database access everywhere rejected (bypasses RLS); Client-enforced workspace filtering rejected (client is not a trust boundary); Supabase Auth instead of Clerk rejected (conflicts with selected identity architecture); Full zero-knowledge/E2EE notes/tasks deferred (limits search, sync, planning, support, integrations, recovery, and multi-device usability); Standard provider encryption only rejected (insufficient protection for OAuth tokens); Application-layer encryption for all user data deferred (significant key management/search/indexing/replication complexity); Formal SOC 2/ISO program immediately deferred (documentation/audit effort before product maturity)
- Rationale: Industry-standard security controls, privacy-by-design, layered authorization, defense in depth
- Compatibility: Applies to all layers of stack

## Version Lock Summary

- Node.js: 24.x LTS
- pnpm: 11
- Turborepo: 2.9.x
- ESLint: 10
- Prettier: 3.9.x
- Hono: 4.12.x
- Drizzle ORM: latest (track releases)
- PowerSync: latest (track releases)
- Expo SDK: latest stable (track releases)
- Next.js: latest stable (track releases)
- Tamagui: latest stable (track releases)
- TanStack Query: latest stable (track releases)
