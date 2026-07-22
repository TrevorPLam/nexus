<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 14 — Web Application Framework

**Recommendation: select Next.js with the App Router for the web application,
deployed as a separate web service from the Hono API and worker.** Use React
Server Components for initial page composition and safe server-side
session-aware reads, Client Components only for interaction-heavy UI, and the
shared typed API client for calls to Hono.[^1][^2]

The web app must be treated as a **frontend/BFF-style presentation layer**, not
a second backend. Hono remains the authoritative API for mobile, commands,
integrations, PowerSync-token issuance, webhooks, and privileged business
operations. Next.js Server Actions and Route Handlers are allowed only for
narrow web-presentation concerns, never as an alternate domain/API
implementation.

## Requirements

The web framework must support:

- A polished, responsive desktop web experience for Today, planning, calendar,
  task/project management, notes, settings, billing, and account flows.
- Marketing and SEO-capable public pages.
- Clerk’s Next.js App Router integration.
- Secure server-side rendering of authenticated page shells and initial data.
- Shared TypeScript UI/components/contracts with Expo where practical.
- Clear separation from the Hono command/API service.
- A deployment model independent of mobile release cadence.
- Good accessibility, metadata, image/font optimization, and error/loading
  boundaries.
- A future path to realtime updates without making realtime a prerequisite for
  normal operation.

Next.js 16 App Router supports Server and Client Components,
streaming/data-fetching patterns, routing/layouts, mutations through Server
Functions/Actions, Cache Components for explicit cache control, Instant
Navigations with partial prefetching, Turbopack as stable default, error
handling, metadata, and route handlers.[^2][^1]

## Framework Options

| Option                               | Advantages                                                                                                                                                                                                                                                                | Disadvantages                                                                                                                                                                                        | Decision                                              |
| :----------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| **Next.js 16 App Router**            | Mature React full-stack framework; Turbopack stable default; Cache Components for explicit cache control; Instant Navigations with partial prefetching; strongest Clerk integration; largest ecosystem; excellent SEO/marketing capabilities; Vercel-optimized deployment | Steeper learning curve (RSC model, server/client boundaries); caching complexity requires discipline; can tempt duplication of Hono backend behavior; vendor lock-in pressure for optimal experience | **Select**                                            |
| React Router v7 Framework Mode       | Web-standards-first (Request/Response, FormData); excellent form handling with progressive enhancement; deployment flexibility (Cloudflare, Bun, Deno, etc.); strong type safety; RSC now available as opt-in; smaller bundles                                            | Smaller ecosystem and fewer SaaS-specific integrations; less mature Clerk documentation; smaller hiring pool; more infrastructure decisions required                                                 | Strong alternative, reject initially                  |
| TanStack Start                       | End-to-end type safety; excellent edge deployment; built on TanStack Router/Query; modern architecture; RC stage with stable API                                                                                                                                          | Immature ecosystem compared to Next.js; fewer SaaS boilerplates and integrations; newer framework with less production battle-testing                                                                | Monitor for future consideration                      |
| SvelteKit 2                          | Smallest bundle sizes (30-50% smaller than React); excellent performance; simpler mental model; gentle learning curve; strong edge deployment                                                                                                                             | Much smaller ecosystem (13x fewer downloads than Next.js); fewer SaaS-specific libraries and boilerplates; smaller hiring pool; less Clerk documentation                                             | Reject for this stack                                 |
| Astro + React islands                | Zero-JS by default; excellent for marketing/content sites; Islands Architecture for selective interactivity; fastest static content delivery                                                                                                                              | Not suitable for highly interactive authenticated SaaS dashboards; requires separate architecture for app vs marketing; less mature for complex application patterns                                 | Use only if separate marketing site becomes necessary |
| Expo Router web / universal Expo app | Maximum component-code sharing with mobile                                                                                                                                                                                                                                | Weaker fit for SEO/marketing, server rendering, web-specific UX, and mature SaaS web patterns; increases universal-code constraints                                                                  | Reject for web primary                                |
| Vite SPA + React Router              | Simple, fast local DX, minimal framework coupling                                                                                                                                                                                                                         | No built-in SSR/SEO/server composition; more setup for auth, metadata, loading, caching, and delivery                                                                                                | Reject                                                |

**Key 2026 Updates:**

- **Next.js 16** (Oct 2025) stabilized Turbopack as default, introduced Cache
  Components for explicit cache control, and Instant Navigations for SPA-like
  feel with SSR benefits. Security patches in July 2026 addressed critical CVEs
  in Server Components and middleware.
- **React Router v7** (Dec 2024) merged Remix into React Router, with Framework
  Mode providing full-stack capabilities. RSC support added in 2026 as opt-in
  feature.
- **TanStack Start** entered RC stage in 2026, offering type-safe full-stack
  React with edge deployment focus, but ecosystem remains immature.
- **SvelteKit 2** matured with Svelte 5 Runes, delivering excellent performance
  but ecosystem gap with React remains significant.

Next.js remains the safest choice for Life OS due to: (1) strongest Clerk
integration with native RSC components and CLI tooling, (2) largest ecosystem of
SaaS boilerplates and integrations, (3) excellent support for both marketing
pages and authenticated application surfaces, (4) mature documentation and
hiring pool. React Router v7 is a credible alternative for teams prioritizing
web standards and deployment flexibility over ecosystem
breadth.[^3][^4][^7][^8][^9]

## Why Next.js Wins

### Best web-specific capability set

Life OS needs more than an authenticated SPA:

- Public marketing and policy pages with metadata, search indexing, and fast
  delivery.
- An authenticated app with persistent layouts, route-level loading/error
  states, and responsive dashboards.
- Potential shareable future views, account pages, billing return/cancel pages,
  and OAuth connection handoff pages.
- Server-aware initial rendering that does not expose server credentials or
  force every page into client-side loading spinners.

Next.js 16 App Router supports this mixture without requiring separate frontend
frameworks. It supports navigation optimization, partial prefetching with
Instant Navigations, Server/Client Components, streaming, explicit Cache
Components, error handling, metadata, and image/font features. The July 2026
security patches address critical CVEs in Server Components and middleware,
making it production-ready for security-sensitive applications like Life
OS.[^1][^7]

### It does not replace Hono

Next.js can define Route Handlers using standard `Request`/`Response` APIs. Do
not interpret that as a reason to move the product API into Next.js. Life OS
already needs a durable, independently deployed Hono service for Expo,
PowerSync, webhooks, OAuth, workers, and command processing.[^5]

Use Next.js for:

```text
Web routing and layouts
Server-rendered page composition
Clerk web session integration
Web UI and form interaction
Metadata, public pages, image/font delivery
Calling the Hono API through the shared API client
```

Use Hono for:

```text
All canonical /v1 API routes
All cross-platform commands
PowerSync token/JWKS endpoints
Google OAuth callbacks and token exchange
Stripe/Clerk/provider webhooks
Business authorization and transactional writes
Worker/job triggers and integration services
```

## Deployment Architecture

```text
Browser
  -> web.lifeos.example
  -> Next.js App Router web service
  -> api.lifeos.example
  -> Hono Node API service
  -> Supabase / PowerSync / external providers

Expo mobile
  -> api.lifeos.example
  -> Hono Node API service
  -> PowerSync service
```

Keep separate deployment artifacts:

```text
apps/web        Next.js application
apps/backend    Hono Node API service
apps/worker     background Node worker
```

This separation prevents web deployment changes from affecting mobile API
behavior and permits the API/worker to scale independently from server-rendered
web traffic.

## Rendering Strategy

### Server Components by default

Use React Server Components for authenticated route layouts and initial page
composition where the data is safe to render into the HTML/RSC payload.

Good Server Component responsibilities:

- Read Clerk session/user context with official server APIs.
- Redirect unauthenticated visitors to sign-in.
- Fetch safe initial account/workspace summary through a server-safe API client.
- Render page shell, navigation, and initial non-sensitive data.
- Generate metadata for public pages.
- Decide route-level access/feature presentation after server verification.

Client Components are required when a component needs browser state, event
handlers, effects, local interaction, or client-only libraries. Next.js
documents Server and Client Components as central App Router concepts.[^1]

### Client Components only where necessary

Use them for:

```text
Drag/drop planning interactions
Task composer and inline editing
Calendar grid interactions
Command palette
Optimistic UI
Popover/dialog/menu controls
TanStack Query state where appropriate
Browser notifications, clipboard, file input
Realtime subscriptions
```

Do not put `"use client"` at the route/page root by default. It expands the
JavaScript bundle and removes the benefits of server composition for everything
imported below it.

### Rendering matrix

| Page/surface                   | Primary rendering                        | Data source                                              | Notes                                            |
| :----------------------------- | :--------------------------------------- | :------------------------------------------------------- | :----------------------------------------------- |
| Public landing, privacy, terms | Static/ISR                               | Content/config                                           | SEO and fast delivery                            |
| Sign in/sign up                | Clerk components/routes                  | Clerk                                                    | No custom credential flow                        |
| Authenticated app shell        | Server Component                         | Clerk session + safe profile API                         | Avoids flash of unauthenticated UI               |
| Today                          | Server shell + Client interactive panel  | Hono initial DTO, then TanStack Query/realtime as needed | Do not import mobile PowerSync data layer        |
| Tasks/projects                 | Server initial data + Client controls    | Hono API                                                 | Paginated/filterable; mutations through commands |
| Calendar                       | Server shell + client calendar component | Hono API / future realtime                               | Calendar interaction is browser-heavy            |
| Notes                          | Server initial document + Client editor  | Hono API                                                 | Editor loaded dynamically if large               |
| Settings/integrations          | Server Component plus client forms       | Hono API                                                 | Sensitive actions require reauth policy          |
| Billing                        | Server Component                         | Hono entitlement endpoint                                | Stripe data stays server-side                    |
| Account deletion/export        | Server shell + Client confirmation form  | Hono command endpoints                                   | Requires recent-auth confirmation                |

The web app need not use PowerSync initially. The offline-first requirement
applies primarily to Expo mobile. Adding PowerSync to web later is possible only
if it materially improves web UX; it should not be assumed simply to achieve
architectural symmetry.

## Data Access Rules

### Use the API client, not direct database access

```text
apps/web
  -> packages/api-client
  -> Hono /v1 API
  -> application/domain/data layer
```

Web code must not import:

```text
@life-os/database/client
Drizzle queries
postgres.js
Supabase service keys
PowerSync private credentials
Google OAuth tokens
Stripe secret keys
```

A Server Component may make a server-to-server call to Hono using the
authenticated user’s Clerk token or an explicit internal delegation mechanism.
It must still traverse the same contract and authorization boundary as mobile
where it invokes product actions.

### Avoid self-fetching when it adds no value

For purely server-rendered web pages, calling the public Hono API through the
network can add latency. The preferred long-term model is:

```text
Hono route -> shared application service <- Next.js server component/action
```

Both adapters authenticate/construct a trusted actor context, then call the same
application service. This is acceptable only if it does **not** bypass policy:
the shared application service must require the verified actor/workspace context
and enforce the same authorization/transaction behavior.

The MVP may begin with the simpler shared API client to reduce boundary
inconsistency. Introduce direct shared application-service invocation only after
clear testing and package boundaries exist; do not let it become direct database
access from Next.js.

## Server Actions Policy

Next.js supports Server Functions and Server Actions for mutations. They are
useful, but only with a narrow policy.[^1]

### Allowed uses

- Web-only form ergonomics for non-critical settings/UI preferences.
- Progressive-enhancement forms that delegate to the same shared application
  command service.
- Internal, same-origin web interactions where no mobile/public API
  compatibility is needed.
- Small presentation-layer mutations such as dismissing a web onboarding prompt.

### Prohibited uses

- Canonical task/planning/calendar mutations.
- PowerSync token issuance.
- Google OAuth exchange or callback handling.
- Stripe or Clerk webhooks.
- Account deletion/export orchestration.
- Billing entitlement changes.
- Any operation that must be callable from Expo or a queue/worker.
- Any action that would duplicate Hono command implementation.

For cross-platform business actions, the web must call the Hono command API.
This gives mobile and web the same idempotency, audit, outbox, validation,
authorization, and error semantics.

## Next.js Route Handlers Policy

Route Handlers are custom HTTP handlers defined inside the App Router. Their use
is also intentionally narrow.[^5]

### Permitted

- Next.js-specific image/proxy helpers where Hono is not appropriate.
- Web-only telemetry ingestion only if it has no product-domain effect.
- Temporary migration/compatibility redirects.
- Browser-facing BFF helpers that cannot safely or efficiently live in Hono,
  after architecture review.

### Prohibited

- `/v1` product API routes.
- Provider webhooks.
- OAuth callbacks.
- Database/domain queries.
- Business commands.
- PowerSync token issuance or JWKS.
- Anything requiring worker/outbox behavior.

There must be no route ambiguity where some clients call
`web.lifeos.example/api/tasks` and others call `api.lifeos.example/v1/commands`.
One canonical service owns each product capability.

## Authentication

Use Clerk’s official Next.js App Router integration for:

- Middleware/proxy-based route protection for UX (replaced by `proxy.ts` in
  Next.js 16).
- Server Component session access via `auth()` and `currentUser()`.
- Client Components’ auth state and user controls via hooks.
- Sign-in, sign-up, account profile/security management.
- CLI tooling (`clerk init`, `clerk env pull`, `clerk doctor`) for faster setup.

Clerk provides first-class Next.js App Router support with native React Server
Components integration. The April 2026 CLI release automates SDK installation,
middleware configuration, and environment setup, reducing auth integration time
from hours to minutes. Critical CVE-2025-29927 (middleware bypass) was patched
in Next.js 15.2.3+ and 14.2.25+, and Clerk's integration follows security best
practices with defense-in-depth patterns.[^6][^10]

### Authentication rules

- Next.js middleware/proxy may redirect unauthenticated browser navigation but
  is not the final authorization boundary.
- The Hono API verifies the bearer/session token and resolves workspace
  membership independently.
- Server Components must not treat a client-controlled workspace identifier as
  authorization.
- Use the backend’s `GET /v1/me`/workspace data to establish product state after
  Clerk identity is known.
- Use recent-auth/MFA checks for sensitive settings, integration connection,
  export, and deletion flows.
- Do not store Clerk session tokens in `localStorage`.
- Keep Clerk publishable keys in public config; all Clerk secret/server
  configuration remains server-only.
- Use `auth()` for lightweight checks (userId, sessionId) and `currentUser()`
  only when full profile data is needed—`auth()` is faster as it reads from
  session token without network calls.

## Caching and Freshness

The planning/calendar product has correctness-sensitive data. Do not apply
framework caching casually.

### Default policy

| Data                                                  | Next.js cache policy                     | Reason                                                        |
| :---------------------------------------------------- | :--------------------------------------- | :------------------------------------------------------------ |
| Authenticated Today, tasks, projects, calendar, notes | Dynamic / no shared cache                | User- and workspace-specific; stale data can mislead planning |
| Current entitlement/account state                     | Dynamic / short request-local cache only | Security/billing-sensitive                                    |
| Public marketing/policy content                       | Static or ISR                            | Safe, stable, performant                                      |
| Public assets/images/fonts                            | CDN cache with versioning                | Appropriate immutable assets                                  |
| User-specific API responses                           | `private`, no shared CDN cache           | Prevent cross-user leakage                                    |
| Aggregated anonymous marketing metrics                | Carefully cached if no personal data     | Non-user-specific                                             |

Next.js 16 introduces Cache Components with explicit `use cache` directives,
replacing the opaque implicit caching of earlier versions. This gives developers
fine-grained control over what gets cached and when. Use time-based and
on-demand revalidation only after a data classification decision. Start with
dynamic authenticated application data, measure, then add explicit, tested
caching for safe surfaces using the new Cache Components API.[^1][^7]

### Cache safety rules

- Never put authenticated `fetch` responses into a shared cache without explicit
  user/workspace cache key guarantees.
- Never cache bearer-token responses at a CDN.
- After a command, revalidate/invalidate only the affected route/query keys
  using `revalidateTag()` and `revalidatePath()`; do not use blanket refresh as
  a substitute for data ownership.
- Keep sensitive user data out of route segment static generation.
- Test two users/two workspaces for cache isolation.
- Use Cache Components (`use cache`) for explicit opt-in to caching behavior
  rather than relying on framework defaults.

## Web State Management

### Recommended scope

| State category                   | Tool/pattern                                      | Why                                        |
| :------------------------------- | :------------------------------------------------ | :----------------------------------------- |
| Server initial page data         | Server Components / server-safe API client        | Reduces client waterfall                   |
| Remote interactive data          | TanStack Query                                    | Invalidation, loading/error/retry behavior |
| Cross-route UI state             | URL search parameters where shareable             | Back/forward/deep-link correctness         |
| Local component state            | React state/reducer                               | Smallest adequate tool                     |
| Complex client UI/workflow state | Zustand, only if justified                        | Lightweight explicit store                 |
| Forms                            | React Hook Form + Zod                             | Controlled validation/error UX             |
| Domain entity source of truth    | Hono API; later selected realtime mechanism       | Do not create a hidden global entity store |
| Mobile offline state             | PowerSync SQLite, not applicable to web initially | Avoid forced symmetry                      |

Do not introduce Redux at MVP. The web app’s state complexity should be managed
by clear server/client boundaries, URL state, TanStack Query, and local state
before adding a global client store.

## Routing and Information Architecture

Suggested App Router structure:

```text
apps/web/src/app/
├── (marketing)/
│   ├── page.tsx
│   ├── pricing/page.tsx
│   ├── privacy/page.tsx
│   └── terms/page.tsx
├── (auth)/
│   └── sign-in/[[...sign-in]]/page.tsx
├── (app)/
│   ├── layout.tsx
│   ├── today/page.tsx
│   ├── tasks/page.tsx
│   ├── projects/page.tsx
│   ├── calendar/page.tsx
│   ├── notes/page.tsx
│   ├── search/page.tsx
│   ├── settings/
│   │   ├── profile/page.tsx
│   │   ├── integrations/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── billing/page.tsx
│   │   └── privacy/page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── layout.tsx
├── global-error.tsx
├── not-found.tsx
└── robots.ts
```

Use route groups to separate public/marketing, Clerk authentication, and
authenticated application layouts without changing URLs. Keep layout-level
navigation server-rendered where feasible and load large
editors/calendar/drag-and-drop modules dynamically.

## Styling and Component Sharing

The selected UI/styling category will finalize libraries. For framework
boundaries now:

- `packages/ui` may contain design tokens, icons, primitive logic, validation
  helpers, and web-compatible components.
- Do not force every web component to be React Native compatible; calendar
  grids, tables, rich text editors, keyboard shortcuts, and drag/drop have
  fundamentally different web requirements.
- Share **design system contracts and headless behavior**, not necessarily
  rendered component implementation.
- Keep `apps/web` responsible for DOM-specific accessibility, CSS, responsive
  layouts, and web interaction patterns.
- Use `next/font` or equivalent framework-managed font delivery; avoid ad hoc
  external font loaders for core typography.
- Keep rich text/editor dependencies client-only and lazy-loaded.

## SEO and Public Pages

Use Next.js for public site benefits, but do not over-index authenticated
workspace content:

- Public marketing, pricing, privacy, terms, security, support, and changelog
  pages: indexable where intended.
- Authenticated app routes: `noindex`, authentication-required, and never
  exposed through sitemap.
- Do not place task, event, note, user, workspace, calendar, or account data
  into metadata/OG images.
- Use `robots.ts` and sitemap generation only for public content.
- Ensure preview deployments are blocked from indexing.
- Generate metadata from static/configured public content rather than live
  personal data.

## Accessibility and Performance

### Baseline requirements

- Use semantic HTML, keyboard navigation, visible focus states, landmarks, and
  properly associated labels/error messages.
- Respect `prefers-reduced-motion`, color contrast, text scaling, and
  high-contrast modes.
- Use route-level `loading.tsx`, `error.tsx`, and `not-found.tsx` boundaries.
- Keep initial client JavaScript low by using Server Components and dynamic
  imports.
- Test performance on an ordinary laptop and constrained mobile web connection,
  even though native mobile is the offline-first primary experience.
- Avoid optimistic UI that claims an action is final before the Hono command API
  accepts it; label pending/error states clearly.
- Use browser/client telemetry without recording task titles, note content,
  calendar descriptions, tokens, or user-entered search text by default.

## Testing

| Test level        | Web framework focus                                                                                       |
| :---------------- | :-------------------------------------------------------------------------------------------------------- |
| Component/unit    | Client controls, state reducers, Zod form behavior, accessibility assertions                              |
| Server component  | Auth redirects, safe initial data mapping, cache headers/classification                                   |
| Integration       | Clerk test identity, Hono API client, command/error state, workspace isolation                            |
| E2E               | Playwright: sign-in, Today, task command, calendar connection, export/delete confirmation, sign-out       |
| Visual regression | High-value responsive pages and design-system components                                                  |
| Accessibility     | Automated scans plus keyboard/screen-reader review for critical flows                                     |
| Security          | Authenticated cache isolation, XSS/content rendering, CORS/redirect configuration, secret exposure checks |

## Trade-Offs

| Choice                                | Gain                                                         | Cost                                                                |
| :------------------------------------ | :----------------------------------------------------------- | :------------------------------------------------------------------ |
| Next.js App Router                    | SSR/RSC, public-site capability, mature ecosystem, Clerk fit | Requires disciplined caching and server/client component boundaries |
| Separate web + Hono services          | Clear API ownership and independent deploy/scale             | More deployments and internal communication                         |
| Server Components by default          | Smaller client bundle and better initial rendering           | Need deliberate client boundaries for interactive features          |
| Hono command API for canonical writes | One cross-platform transaction/audit/outbox path             | Web forms make an HTTP request instead of direct action logic       |
| Dynamic authenticated pages           | Stronger privacy/correctness                                 | Fewer caching optimizations upfront                                 |
| Web without PowerSync initially       | Avoids duplicated sync layer and complexity                  | Web needs normal API/realtime strategy rather than local replica    |
| Shared primitives, not universal UI   | Better platform UX and maintainability                       | Some duplicated rendering code                                      |

## Final Decision

Lock the following web application architecture:

```text
Web framework:                 Next.js 16, App Router
Rendering default:             React Server Components
Interactive UI:                Client Components only where browser interaction requires them
Authentication:                Official Clerk Next.js App Router integration with CLI tooling
Product API:                   Hono /v1 API remains canonical for cross-platform commands and services
Next.js Server Actions:        Limited to web-only presentation mutations; not canonical domain commands
Next.js Route Handlers:        Narrow web-specific utilities only; no product /v1 API, webhooks, OAuth, or DB access
Data access:                   Shared typed API client; optional shared application-service invocation only after policy-safe boundary exists
Authenticated caching:         Dynamic/no shared cache by default; explicit Cache Components for opt-in caching
Remote client state:           TanStack Query where needed
Mobile sync:                   PowerSync only; do not force it into web for MVP
Deployment:                    Separate Next.js web service from Hono API and Node worker
Alternatives:                  React Router v7 Framework Mode credible but not selected; TanStack Start monitor for future; SvelteKit/Astro rejected for this stack
```

**Rationale for Next.js 16 selection:**

- **Security**: July 2026 security patches address critical CVEs in Server
  Components and middleware (CVE-2025-29927)
- **Performance**: Turbopack stable default provides 2-5x faster builds; Instant
  Navigations deliver SPA-like feel with SSR benefits
- **Caching**: Cache Components with explicit `use cache` directives replace
  opaque implicit caching, giving developers fine-grained control
- **Ecosystem**: Largest SaaS boilerplate ecosystem (100+ starters), strongest
  Clerk integration with native RSC components and CLI automation
- **Hiring**: React/Next.js talent pool is 13x larger than alternatives,
  critical for long-term team scaling
- **Marketing + App**: Single framework handles both public marketing pages and
  authenticated application surfaces without architectural compromises

The next category in dependency order is **Mobile Application Framework \&
Navigation**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://nextjs.org/docs/app/getting-started

[^2]: https://nextjs.org/docs/app

[^3]: https://reactrouter.com/start/modes

[^4]: https://reactrouter.com/

[^5]: https://nextjs.org/docs/app/getting-started/route-handlers

[^6]: https://clerk.com/nextjs-authentication

[^7]:
    https://nextjs-ko.org/docs/app/building-your-application/routing/route-handlers

[^8]: https://nextjs.org/docs/app/glossary

[^9]: https://zenn.dev/secula/articles/641ebe844b2ab9

[^10]: https://x.com/nextjs/status/1626341664402051072

[^11]:
    https://medium.com/@livenapps/next-js-15-app-router-a-complete-senior-level-guide-0554a2b820f7

[^12]:
    https://dev.to/arenasbob2024cell/nextjs-app-router-complete-guide-2026-server-components-layouts-and-data-fetching-4a8h

[^13]: https://makerkit.dev/blog/tutorials/nextjs-api-best-practices

[^14]:
    https://silvestri.co/blog/api-route-handlers-server-components-actions-differences

[^15]: https://react-router-docs-ja.techtalk.jp/start/modes

[^16]: https://blog.logrocket.com/using-next-js-route-handlers/

[^7]:
    https://dev.to/lettstartdesign-official/nextjs-16-every-change-that-actually-matters-for-developers-14n1

[^8]: https://gigsdock.com/next-js-16-vs-react-router-7-technical-deep-dive/

[^9]: https://cadence.withremote.ai/blog/nextjs-vs-remix

[^10]:
    https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router

[^11]: https://starterpick.com/guides/nextjs-vs-sveltekit-vs-nuxt-saas-2026

[^12]: https://tanstack.com/start/latest

[^13]:
    https://uguraslim.com/blog/react-server-components-vs-astro-islands-when-to-use-each-pa/

[^14]: https://codebrewtools.com/blogs/sveltekit-vs-next-js

[^15]: https://clerk.com/articles/authentication-for-remix-applications
