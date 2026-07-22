# Dependencies, Tooling & Third-Party Platforms Audit

This document extracts every external dependency, tool, library, service, and platform referenced in the complete Life OS project brief. Each entry is organized by utilization category and includes a clear description of its role in the system, the rationale for its selection, alternatives that were evaluated and rejected, and any open risks or unresolved questions. This context is sufficient for an independent audit or for other sessions to research all available options against the product’s requirements.

---

## 1. Programming Language & Runtime

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **TypeScript** (strict) | Entire codebase: web, mobile, backend, shared packages | End-to-end type safety across the Life Graph, API boundaries, and UI components. Ecosystem (Next.js, Expo, Drizzle) is TypeScript-first. | JavaScript (lack of type safety would cause integration bugs). | None – foundational decision. |


---

## 2. Monorepo & Package Management

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **pnpm Workspaces** | Monorepo package linking and dependency management | Strict dependency resolution, `workspace:*` protocol prevents phantom dependencies, fast installs. | Yarn Workspaces (less strict), npm workspaces (slower). | None – industry standard for TypeScript monorepos. |
| **Turborepo** | Task orchestration, caching, parallel builds (incremental adoption) | Speeds up lint, test, build via caching; can be added when package count grows. | Nx (heavier, more opinionated). | Deferred; not required for MVP. May be introduced later. |
| **syncpack** (or manypkg) | Enforce consistent versions of shared dependencies across workspaces | Prevents version drift (e.g., different React versions in web and mobile). | manypkg (similar). | Low priority; added during Phase 1 foundation. |
| **Changesets** | Versioning and changelog management for internal packages | Prepares for potential external publishing of design system / API client. | None – standard tool. | Not needed until packages are published externally. |
| **dependency-cruiser** | Validate module boundaries and forbid circular dependencies | Ensures packages don’t import from `apps/` or across forbidden boundaries, preserving architecture. | None – unique role. | Added as a CI lint step; may require configuration tuning. |

---

## 3. Web Application Framework

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Next.js** (App Router) | Web application (planning & administration) | Server Components for fast data loading, seamless Vercel deployment, Inngest integration, large ecosystem. | Remix, SvelteKit (less ecosystem alignment with Expo/React). | None – locked by original brief. |

---

## 4. Mobile Application Framework

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Expo** (SDK 54+) with Expo Router | Mobile application (capture & execution) | Managed native build tooling, file‑based routing similar to Next.js, strong ecosystem. Development builds required for native modules (PowerSync). | Bare React Native (more setup overhead). | Expo Go cannot be used due to native modules; development builds must be set up. |
| **Expo EAS** | Mobile build & distribution | Build service, TestFlight/Play Store submissions, over‑the‑air updates. | Manual Xcode/Android Studio builds (time‑consuming). | None. |
| **react-native-gesture-handler** | Gesture recognition for Infinite Timeline and command bar | Industry standard for React Native gesture handling; supports swipe, pinch, long‑press. | None – essential for gesture‑driven interactions. | Must be compatible with Tamagui and Reanimated. |
| **react-native-reanimated** | High‑performance animations on mobile | Required for smooth timeline animations and micro‑interactions; runs on UI thread. | None – de facto standard for performant RN animations. | Potential jank when combined with PowerSync and Tamagui; profile early. |
| **Expo SecureStore** | Secure on‑device storage for Vault encryption keys | Built into Expo; stores keys in iOS Keychain / Android Keystore. | None – platform‑provided. | Not yet used; will be critical for Vault Zone. |

---

## 5. Backend Framework

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Node.js** (LTS) | Backend runtime | Unifies language across stack; large ecosystem; supports all chosen libraries. | Deno, Bun (less mature ecosystems). | None. |
| **Hono** | HTTP framework for API and Inngest handler | Lightweight, fully typed, runs standalone or as a Next.js Route Handler—flexibility for Inngest. | Express (less typed, heavier), Fastify (good alternative but Hono simpler). | None – a well‑suited choice for a modular monolith. |

---

## 6. Database Management System

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **PostgreSQL 15+** (managed by Supabase) | Primary database for all Open Zone data, future Vault metadata | Relational integrity required for the Life Graph; Supabase adds RLS, Realtime, Auth, and Storage on top. | MySQL (less powerful RLS), MongoDB (no relational integrity). | None – relational model essential. |

---

## 7. ORM & Database Tooling

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Drizzle ORM** (stable) | Schema definition, migrations, type‑safe queries | TypeScript‑first, integrates with PowerSync via `@powersync/drizzle-driver`—a unique advantage that eliminates schema duplication. | Prisma (different sync story, heavier), Kysely (no built‑in migrations). | Must use version `^0.44.7` (peer dependency for PowerSync driver). |
| **drizzle-kit** | Migration generation and application | Works alongside Drizzle ORM for a complete migration workflow. | None – part of Drizzle ecosystem. | None. |
| **Supabase CLI** | Local development database, Auth, and Storage emulation | Provides a full local Supabase stack matching production, avoiding drift. | Dockerized Postgres alone (would miss RLS and Auth). | None. |

---

## 8. Authentication Provider

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Clerk** | User authentication (web & mobile) | Polished pre‑built UI, strong Expo SDK, built‑in organization/workspace primitives that align with future multi‑workspace needs. | **Supabase Auth** (simpler integration with RLS but lacks Clerk’s organization model and UX components). | **Critical risk: PowerSync JWT compatibility.** It must be verified that PowerSync accepts Clerk‑issued JWTs. If not, a token‑exchange endpoint will be needed. (See Risk #1.) |
| **Supabase Row Level Security** (via Clerk JWT) | Database‑level authorization | RLS policies enforce workspace and user data isolation. Supabase officially documents Clerk JWT compatibility with RLS. | None – RLS is essential for privacy. | The Clerk‑to‑Supabase JWT handshake must be tested together with PowerSync. |

---

## 9. Authorization & Row-Level Security

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Supabase RLS** | Enforces data isolation at the database level | Built into Supabase; policies are written in SQL and tested automatically. | Application‑level authorization only (less secure). | None – used in tandem with Clerk. |

---

## 10. Offline-First Sync Engine

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **PowerSync** (with `@powersync/drizzle-driver`) | Bidirectional sync of Open Zone data between PostgreSQL and mobile SQLite | Only viable offline‑first sync engine after ElectricSQL’s rewrite removed offline sync. Drizzle driver allows shared schema definitions. `localOnly` flag enables dual‑zone privacy. | **ElectricSQL** (rewrite removed automatic offline sync – archived). **WatermelonDB** (complex setup, requires custom sync endpoints). **RxDB** (bundle size concerns). **Custom sync** (validated but higher effort). | **Critical risk: PowerSync + Clerk JWT integration must be proven.** (See Risk #1.) Also ensure `localOnly` works as expected for Vault Zone. |
| **SQLite** (via PowerSync on mobile) | Local mobile database | Automatically managed by PowerSync; Drizzle driver provides typed access. | None – inherent to PowerSync. | None. |

---

## 11. Real-Time Data Updates

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **PowerSync sync stream** (mobile) | Real‑time updates on mobile | Already built into PowerSync; no additional tooling needed. | Supabase Realtime (would conflict with PowerSync). | Must not add Supabase Realtime to mobile app. |
| **Supabase Realtime** or **SSE** (web) | Real‑time updates for the web dashboard | Supabase Realtime provides WebSocket‑based row‑level subscriptions. SSE is simpler for coarse “plan updated” events. Decision pending. | WebSockets via `ws` (more manual). | Web real‑time mechanism not yet decided; will be resolved during web dashboard development. |

---

## 12. Search Engine

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Meilisearch** (long‑term) | Universal, typo‑tolerant, cross‑entity search for the command bar | MIT license (avoiding GPL‑3 obligations of Typesense), disk‑based storage, built‑in language detection, fast. | **Typesense** (GPL‑3 license, RAM‑limited). **PostgreSQL FTS** (MVP fallback, lacks typo tolerance and ranking). | Operational overhead of self‑hosting Meilisearch; may use Meilisearch Cloud. Deferred to after MVP; PostgreSQL FTS with `pg_trgm` used initially. |
| **PostgreSQL full‑text search** (`pg_trgm`, `tsvector`) | MVP search for the command bar | Already available in PostgreSQL; sufficient for small user base. Abstraction layer allows swap to Meilisearch. | None for MVP. | Will be replaced when search quality becomes a differentiator. |

---

## 13. Background Job Processing

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Inngest** (hosted in backend) | Reliable event‑driven background jobs (calendar sync, plan recalculations, search indexing, notifications) | Runs code where you host it (Hono backend), avoiding cold starts and managed‑worker costs. Step‑level retries, generous free tier (50K runs/month). Event‑driven model complements transactional outbox. | **Trigger.dev** (managed workers, better for very long AI tasks). **BullMQ** (self‑hosted Redis, more control). | **Risk #2: Hosting location.** All Inngest handlers should be consolidated in the backend (Hono), not in Next.js, to avoid Vercel timeout constraints. |
| **Transactional Outbox** (`outbox_events` table) | Guarantees side‑effects (jobs, search updates) are never lost on database writes | Industry‑standard pattern; events are written in the same transaction as the data change, then polled by Inngest. | None – complements Inngest. | Must be implemented from day one to avoid consistency issues. |

---

## 14. UI Framework & Design System

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Tamagui** | Cross‑platform UI components and design system | Compiles to near‑`StyleSheet` performance on mobile; superior web parity compared to NativeWind. Supports shared primitives and design tokens. | **NativeWind** (Tailwind for RN, better for teams with Tailwind experience, but less web parity). | **Risk #7:** Potential performance overhead with Reanimated + PowerSync; profile early. |
| **Tamagui compiler** | Optimizes static styles at build time | Brings production performance to `StyleSheet` levels. | None – part of Tamagui. | Compiler is off in dev mode; must test release builds. |

---

## 15. Calendar Integration

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Google Calendar API** (via `googleapis` Node.js client) | Read‑only sync of user’s calendar events | Battle‑tested incremental sync pattern (sync tokens), push notifications with polling fallback, well‑documented. | iCloud/Outlook (explicit V1 non‑goals). | **Reliability:** Push notifications are best‑effort; polling fallback required hourly. **Subscription renewal:** webhooks expire every 7 days. **Race conditions:** handled with unique DB constraint on `eventId`. |
| **OAuth 2.0 with PKCE** | Secure authorization for Google Calendar | Required by Google; ensures only minimal scopes are granted. | None – standard. | Must pass Google OAuth app review for production. |

---

## 16. Payment Processing

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Stripe** (Checkout, Customer Portal, Webhooks) | Subscription billing and management | Market leader, easy integration, hosted checkout and customer portal reduce PCI burden. | Paddle, LemonSqueezy (more MoR features but less flexible). | None – standard choice. |

---

## 17. Hosting & Deployment – Web

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Vercel** | Hosting for Next.js web app | Optimized for Next.js, preview deployments, seamless CI integration. | Netlify, AWS Amplify. | None. |

---

## 18. Hosting & Deployment – Mobile

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Expo EAS** | Build and submission service for iOS/Android | Handles native builds, code signing, TestFlight/Play Store distribution, and OTA updates. | Manual CI with Fastlane (more maintenance). | None. |

---

## 19. Hosting & Deployment – Backend

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Railway / Fly.io / Render** (or VPS) | Hosting for the Hono backend | Node‑friendly PaaS with container support; avoids managing raw servers. Exact choice still flexible. | AWS ECS, Google Cloud Run. | Final hosting provider not yet locked; architecture is containerized for portability. |

---

## 20. Object Storage

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Supabase Storage** (default) or **Cloudflare R2** | Object storage for user file attachments (images, documents, receipts) | Supabase Storage comes integrated with existing Supabase backend; Cloudflare R2 offers zero‑egress fees and S3‑compatible API, potentially lower long‑term cost. | AWS S3, Google Cloud Storage (higher egress costs). | Final decision pending; R2 integration requires an S3‑compatible client and separate billing. Must ensure secure access with Clerk‑authenticated pre‑signed URLs. |

---

## 21. Error Monitoring

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Sentry** | Error tracking across web, mobile, backend | Full‑stack support, source map uploads, rich context. Industry standard. | LogRocket, Bugsnag. | Data scrubbing middleware must be implemented to prevent personal content in error reports. |

---

## 22. Product Analytics

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **PostHog** (self‑hosted or cloud, with strict privacy) | Track key product metrics (plan created, task completed, etc.) | Open‑source, can be self‑hosted; allows complete control over data. Auto‑capture disabled; only explicit sanitized events sent. | Mixpanel, Amplitude (less privacy control). | Must implement Zod‑validated event schemas and scrubbing middleware. Consent required for EU users. |

---

## 23. Backend Logging

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Pino** | Structured JSON logging for backend | Lightweight, fast, supports custom serializers for redacting sensitive fields. | Winston (heavier). | Custom serializer must be built to strip task titles, note bodies, etc. |
| **Log aggregator** (Axiom, Logtail, or Grafana Loki) | Centralized log storage and querying | Choice depends on deployment; not yet finalized. | None specified. | Will be selected during backend deployment setup. |

---

## 24. Health & Uptime Monitoring

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **UptimeRobot** or **Sentry Cron Monitoring** | Monitor backend health endpoint and alert on downtime | Simple, low‑cost; Sentry Cron Monitoring already integrates with existing Sentry setup. | New Relic, Datadog (heavier). | Exact tool to be chosen before production launch. |

---

## 25. Testing Frameworks & Tools

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Vitest** | Unit and integration tests for backend and shared packages | Fast, modern, compatible with Vite ecosystem, Jest‑compatible API. | Jest (slower, more config). | None. |
| **Playwright** | End‑to‑end tests for web | Reliable, cross‑browser, strong tooling. | Cypress (historically less performant). | None. |
| **Detox** or **Maestro** | End‑to‑end tests for mobile | Detox is well‑established for React Native; Maestro is simpler but newer. Final choice pending. | Appium (less RN‑friendly). | Mobile E2E framework to be decided during Phase 2. |
| **Chromatic** (or Percy) | Visual regression testing for UI components | Captures screenshots of Storybook stories; prevents unintended visual changes. | Percy (similar). | Requires Storybook setup for `packages/ui`. |
| **Supertest** | HTTP integration testing for backend routes | Lightweight, works with Vitest; used to test API endpoints and RLS policies. | None – standard companion to Vitest. | Must be added to the dev dependencies in `apps/backend`. |

---

## 26. Code Quality & Consistency Tools

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **ESLint** (flat config) | Code linting | Standard; configs for Next.js, Expo, TypeScript. | None. | Custom rules for module boundaries will be added. |
| **Prettier** | Code formatting | Consistent formatting, integrated with ESLint. | None. | None. |
| **cspell** | Spell checking for code and docs | Catches typos in identifiers and documentation. | None. | None. |
| **lefthook** (or husky) | Git hooks for pre‑commit linting and formatting | Fast, cross‑platform; runs linters on staged files only. | husky (similar). | None. |
| **commitlint** | Enforce Conventional Commits | Produces a clean, machine‑readable commit history. | None – standard. | None. |

---

## 27. CI/CD Pipeline

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **GitHub Actions** | CI/CD orchestration: lint, type-check, test, build, deploy | Already integrated with GitHub repository; large ecosystem of actions; free for public repos. | GitLab CI, CircleCI. | None – default choice for the project. |
| **Renovate** (or Dependabot) | Automated dependency updates | Keeps dependencies current; PRs tested by CI. | Dependabot (native GitHub). | None. |

---

## 28. Secret Management & Environment Variables

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **@t3-oss/env-core** + **Zod** | Typed, validated environment variables per app | Prevents missing or malformed variables at startup. | `envalid` (less Zod integration). | Schemas need to be created for each app. |
| **Supabase Vault** (or Doppler) | Storage of production secrets (API keys, OAuth secrets) | Encrypted, access‑controlled, integrates with Supabase. | Doppler, Infisical. | Final secrets manager TBD. |
| **gitguardian** (pre‑commit) + **GitHub secret scanning** | Prevent accidental secret commits | Industry‑standard tools. | None. | None. |

---

## 29. Feature Flags

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Environment variables** (MVP) | Simple on/off toggles for unreleased modules | Zero infrastructure cost. | Flagsmith, LaunchDarkly. | Will migrate to **Flagsmith** (open‑source) when user‑scoped flags are needed. |

---

## 30. Development Environment & Containerization

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Docker Compose** | Optional local stack (PostgreSQL, Meilisearch, Mailpit) | Provides consistent environment for developers who prefer containers. | None. | Not mandatory; Supabase CLI is the primary local dev tool. |
| **Dev Containers** (VS Code) | Ensure identical development environment for all contributors | Pre‑configures Node version, extensions, and tools. | None. | Will be added early in Phase 1. |
| **Mailpit** | Local email testing (transactional emails) | Lightweight, Docker‑friendly. | Mailhog (similar). | Only used for development/test. |

---

## 31. Other Development Tools

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **license-checker** | Ensure no copyleft licenses accidentally introduced | Prevents licensing issues, especially for a potential commercial product. | None. | Important given the use of MIT, GPL‑3 alternatives evaluated. |

---

## 32. API Client (Pending Decision)

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **tRPC** (default candidate) or **openapi-fetch** (if REST chosen) | Typed API client for frontend‑backend communication | tRPC provides end‑to‑end type safety; openapi-fetch generates a typed fetch client from OpenAPI spec, consumable by non‑TS clients. | GraphQL (overkill). | Open decision: tRPC vs. Zod‑validated REST with openapi-fetch. The architecture isolates the contract in `packages/api-client` so the choice can be made later without structural impact. |

---

## 33. Security & Encryption (Future Vault Zone)

| Dependency | Purpose | Why Chosen | Alternatives Considered | Risks / Open Questions |
|------------|---------|------------|------------------------|------------------------|
| **Argon2** (or other KDF library) | Derive Vault encryption keys from user password | Industry standard for password hashing and key derivation; will be used to generate client‑side encryption keys for the Vault Zone. | bcrypt, scrypt. | Not needed until Vault Zone is implemented (Phase 4+). Key management design is deferred. |

---

## 34. Future Integrations (Not in MVP)

These platforms are part of the long‑term module map and will be integrated in later phases. They are listed here to provide full visibility for architectural planning.

| Platform | Purpose | Phase |
|----------|---------|-------|
| **Plaid** (or similar) | Banking and credit card aggregation (Finance module) | Phase 5 |
| **HealthKit** (iOS) / **Google Fit** (Android) | Health metric sync for Health & Wellness module | Phase 5 |
| **Apple Health Connect** (Expo) | Health data integration in React Native | Phase 5 |
| **Kindle** (API) | Reading highlights import | Phase 5 (Knowledge) |
| **Open Banking / PSD2 providers** | European financial data aggregation | Phase 5 |
| **OAuth providers** (Outlook, iCloud) | Additional calendar integrations (explicit V1 non‑goal) | Post‑MVP |
| **Stripe Connect** or similar | If marketplace/billing for shared workspaces is needed | Future |
| **AI providers** (OpenAI, Anthropic, etc.) | Optional AI features (natural‑language capture, suggestions) | Phase 6 (strictly opt‑in, privacy‑preserved) |

---

This comprehensive audit now provides a complete picture of the chosen tooling stack and the reasoning behind each decision. Every missing dependency, tool, and platform identified across the full project brief has been injected. All entries contain enough context for an independent evaluation of alternatives, while highlighting the specific risks and open questions that must be closed before proceeding to the next phase.