# AGENTS.md

Project conventions, rules, and patterns for the Life OS monorepo.

## Project Overview

Life OS is a personal productivity system with work management and calendar
integration. This is a monorepo built with pnpm workspaces and Turborepo.

### Structure

- **Packages** (shared libraries):
  - `packages/ui` - Shared UI components (Tamagui)
  - `packages/contracts` - Zod schemas and API contracts
  - `packages/mobile-data` - PowerSync database schema for mobile
  - `packages/api-client` - Typed API client
  - `packages/database` - Drizzle ORM database schema

- **Applications** (deployable services):
  - `apps/web` - Next.js web application
  - `apps/mobile` - Expo React Native mobile application
  - `apps/api` - Hono backend API
  - `apps/worker` - Background job worker

## Technology Stack

### Foundational

- **Language & Runtime**: TypeScript 5.9+ (strict mode), Node.js 24.x LTS
- **Module System**: ESM with nodenext/bundler resolution
- **Monorepo**: pnpm 11 + Turborepo 2.9.x
- **Package Manager**: pnpm 11 (pinned in package.json)
- **Validation**: Zod at every external trust boundary

### Data & Persistence

- **Database**: PostgreSQL via Supabase (minimum version 15)
- **ORM**: Drizzle ORM with TypeScript schema
- **Authentication**: Supabase Auth
- **Authorization**: PostgreSQL RLS (default-deny, workspace membership based)
- **Offline Sync**: PowerSync Cloud for mobile

### Application Layer

- **Backend**: Hono 4.12.x with @hono/zod-openapi
- **Web Framework**: Next.js 16 (App Router)
- **Mobile Framework**: Expo SDK 52 with Expo Router
- **UI System**: Tamagui (shared in packages/ui)
- **State Management**: TanStack Query for web, PowerSync SQLite for mobile
- **API Style**: Versioned JSON-over-HTTPS REST/command API

### Infrastructure

- **Jobs/Queues**: pg-boss on Supabase PostgreSQL
- **Realtime**: Supabase Broadcast from Database (trigger-based)
- **Notifications**: expo-notifications with Expo Push Service
- **File Storage**: Supabase Storage (private buckets only)
- **Search**: PostgreSQL Full Text Search plus pg_trgm

## Code Quality Standards

### Type Checking

- TypeScript strict mode enabled
- Run `tsc --noEmit` per package/application
- Type checking enforced in CI

### Linting

- **Tool**: ESLint 10 with flat config (eslint.config.mjs)
- **Config**: Root-level configuration applies to all packages
- **Plugins**:
  - `@eslint/js` - Recommended JavaScript rules
  - `eslint-plugin-import-x` - Import ordering and cycle detection
  - `eslint-config-prettier/flat` - Disables formatting rules (Prettier handles
    formatting)
- **Key Rules**:
  - `import-x/no-unresolved` - Error on unresolved imports
  - `import-x/no-cycle` - Error on circular dependencies
  - `import-x/order` - Enforce import order: builtin, external, internal,
    parent, sibling, index
- **Command**: `pnpm lint` (runs via turbo across all packages)

### Formatting

- **Tool**: Prettier 3.9.x (exact version pinned)
- **Config**: Root-level .prettierrc
- **Style**:
  - Semicolons: enabled
  - Trailing commas: es5
  - Quotes: single
  - Print width: 100
  - Tab width: 2
  - Tabs: disabled (use spaces)
  - Arrow parens: always
  - End of line: lf
- **Command**: `pnpm format` (runs via turbo across all packages)

### Git Hooks

- **Tool**: Lefthook 2.1.x
- **Hooks**: pre-commit only
- **Actions**:
  - Format: `pnpm format` (auto-stages fixed files)
  - Lint: `pnpm lint`
- **Note**: Hooks are convenience only; CI commands are authoritative

## Monorepo Conventions

### Package Management

- **Workspace Protocol**: Use `workspace:*` for all internal dependencies
- **Lockfile**: Root pnpm-lock.yaml only (no nested lockfiles)
- **Version Governance**: pnpm catalogs with catalogMode: strict
- **Build Permissions**: `allowBuilds: supabase: true` in pnpm-workspace.yaml

### Dependency Rules

- Internal dependencies must use `workspace:*` protocol
- External dependencies should be versioned consistently across packages
- Use pnpm catalog for shared dependency versions
- Never commit node_modules

### Turbo Pipeline

- **build**: Depends on `^build` (upstream packages)
- **dev**: No cache, persistent
- **lint**: Depends on `^lint`
- **typecheck**: Depends on `^typecheck`
- **test**: Depends on `^build`, outputs coverage
- **clean**: No cache

## Architecture Patterns

### Layering

- **packages/contracts** - Shared Zod schemas (no dependencies on other
  packages)
- **packages/database** - Drizzle schema (depends on contracts only)
- **packages/api-client** - Typed API client (depends on contracts)
- **packages/mobile-data** - PowerSync schema (depends on contracts)
- **packages/ui** - Shared UI components (depends on React, Tamagui)
- **apps/api** - Hono backend (depends on contracts, database)
- **apps/web** - Next.js web app (depends on ui, contracts, api-client)
- **apps/mobile** - Expo mobile app (depends on ui, contracts, mobile-data,
  api-client)
- **apps/worker** - Background worker (depends on contracts, database)

### Import Rules

- No circular dependencies (enforced by ESLint)
- Import order: builtin, external, internal, parent, sibling, index
- Alphabetical imports within groups
- Newlines between import groups

### Database Access

- Backend/migration tools only (never web/mobile directly)
- Use Drizzle ORM for all database operations
- Schema changes must go through Drizzle migrations
- Applied migration history: supabase/migrations only
- Schema push prohibited outside disposable local experiments

### API Design

- Versioned JSON-over-HTTPS REST/command API
- Zod schemas in packages/contracts are the source of truth
- OpenAPI generated from @hono/zod-openapi
- Response validation for critical responses
- Command IDs/idempotency keys for mutations

### Authentication & Authorization

- **Authentication**: Supabase Auth (JWT verification in Hono)
- **Authorization**: PostgreSQL RLS + Hono typed command handlers
- **Default**: Deny unless explicit policy permits access
- **Workspace Scope**: All user/workspace-scoped tables use RLS
- **No Direct CRUD**: Validated command pipeline only

## Development Workflow

### Running the Project

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev

# Start specific service
pnpm --filter @life-os/web dev
pnpm --filter @life-os/mobile dev
pnpm --filter @life-os/api dev
```

### Common Commands

```bash
# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Format all packages
pnpm format

# Type check all packages
pnpm typecheck

# Test all packages
pnpm test

# Clean all build artifacts
pnpm clean
```

### Database Migrations

```bash
# Generate migration from schema changes
pnpm --filter @life-os/database generate

# Apply migrations (via Supabase CLI)
supabase db push
```

## Testing Standards

- **Test Runner**: Vitest
- **Unit Tests**: Vitest + Testing Library
- **Integration Tests**: Real ephemeral PostgreSQL
- **Web E2E**: Playwright
- **Mobile E2E**: Maestro on EAS builds
- **Coverage**: Required for critical paths

## Security Guidelines

- No secrets in client code or environment variables
- Use @t3-oss/env-core for environment validation
- Server-side only: Database credentials, service keys
- Client-safe: NEXT_PUBLIC_ / EXPO_PUBLIC_ prefixes only
- RLS policies on all user/workspace-scoped tables
- Workspace membership verification for all data access
- No direct Supabase CRUD for product writes

## File Naming Conventions

- TypeScript files: `.ts` or `.tsx` (for React)
- Component files: PascalCase (e.g., `Button.tsx`)
- Utility files: camelCase (e.g., `formatDate.ts`)
- Test files: `.test.ts` or `.spec.ts`
- Index files: `index.ts` for barrel exports

## Commit Conventions

- Use Conventional Commits format
- Enforced by commitlint (if configured)
- Examples:
  - `feat: add task dependencies`
  - `fix: resolve calendar sync issue`
  - `docs: update API documentation`

## Environment Variables

- Use `.env.example` as template
- Never commit `.env` files
- Use @t3-oss/env-core for validation
- Client-safe variables: NEXT_PUBLIC_ / EXPO_PUBLIC_
- Server-only variables: no prefix (server-side only)

## Performance Guidelines

- Use React Server Components in Next.js by default
- Client Components only where browser interaction requires them
- PowerSync for mobile offline data (no parallel HTTP cache)
- TanStack Query for non-replicated remote/server state
- Optimize bundle size (code splitting, lazy loading)

## Accessibility

- Keyboard navigation support required
- Screen reader support required
- Dynamic type support required
- Reduced motion support required
- Use semantic HTML elements
- Test with VoiceOver (iOS) and TalkBack (Android)

## Deployment

- **Web**: Vercel (preview auto, manual promote to production)
- **Mobile**: EAS Build and store phased rollout
- **API/Worker**: Container host (Railway/Fly.io/Render)
- **Database**: Supabase (separate staging and production projects)
- **CI/CD**: GitHub Actions with protected environments

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
