# Life OS

Personal productivity system with work management and calendar integration.

## Project Structure

This is a monorepo built with pnpm workspaces and Turborepo.

### Packages

- `packages/ui` - Shared UI components (Tamagui)
- `packages/contracts` - Zod schemas and API contracts
- `packages/mobile-data` - PowerSync database schema for mobile
- `packages/api-client` - Typed API client
- `packages/database` - Drizzle ORM database schema

### Applications

- `apps/web` - Next.js web application
- `apps/mobile` - Expo React Native mobile application
- `apps/api` - Hono backend API
- `apps/worker` - Background job worker

## Technology Stack

- **Runtime**: Node.js 24.x LTS, TypeScript 5.9+
- **Monorepo**: pnpm 11 + Turborepo 2.9.x
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Backend**: Hono 4.12.x
- **Web**: Next.js 16 (App Router)
- **Mobile**: Expo SDK 52 with Expo Router
- **UI**: Tamagui
- **Authentication**: Supabase Auth
- **Offline Sync**: PowerSync
- **State**: TanStack Query, PowerSync SQLite
- **Validation**: Zod

## Modules

### Work Module

- Projects: Organize work into projects
- Tasks: Track tasks with status, priority, due dates
- Task Dependencies: Define relationships between tasks
- Integration: Tasks can be linked to calendar events

### Calendar Module

- Calendars: Multiple calendars per workspace
- Events: Create and manage events
- Recurring Events: Support for recurring event patterns
- Attendees: Track event attendees and RSVPs
- Integration: Events can be linked to tasks

## Setup

### Prerequisites

- Node.js 24.x LTS
- pnpm 11
- Supabase account (free tier available at supabase.com)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
```

### Database Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Get your project credentials** from the Supabase dashboard:
   - Project URL
   - Anon key
   - Service role key
   - Database password
   - JWT secret (from Project Settings > API)
3. **Configure environment variables** in `apps/api/.env`:
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env with your Supabase credentials
   ```
4. **Run database migrations** using Drizzle:
   ```bash
   pnpm --filter @life-os/database generate
   pnpm --filter @life-os/database migrate
   ```

### Development

```bash
# Start all services
pnpm dev

# Start specific service
pnpm --filter @life-os/web dev
pnpm --filter @life-os/mobile dev
pnpm --filter @life-os/api dev
```

## Quality Commands

### Root-Level Commands

Run these from the repository root to check all packages:

```bash
# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Format all packages
pnpm format

# Build all packages
pnpm build

# Test all packages
pnpm test

# Clean all build artifacts
pnpm clean
```

### Package-Level Commands

For targeted validation of specific packages:

```bash
# Type check specific package
pnpm --filter @life-os/contracts typecheck
pnpm --filter @life-os/database typecheck
pnpm --filter @life-os/api-client typecheck
pnpm --filter @life-os/api typecheck
pnpm --filter @life-os/web typecheck
pnpm --filter @life-os/mobile typecheck
pnpm --filter @life-os/worker typecheck
pnpm --filter @life-os/ui typecheck
pnpm --filter @life-os/mobile-data typecheck

# Lint specific package
pnpm --filter @life-os/contracts lint
pnpm --filter @life-os/database lint
# ... (same pattern for other packages)

# Build specific package
pnpm --filter @life-os/api build
pnpm --filter @life-os/web build
pnpm --filter @life-os/worker build
```

### Database Commands

```bash
# Generate migration from schema changes
pnpm --filter @life-os/database generate

# Apply migrations (via Supabase CLI)
supabase db push

# Open Drizzle Studio
pnpm --filter @life-os/database studio
```

## Current Status

### Completed

- ✅ Monorepo structure with pnpm + Turborepo
- ✅ TypeScript configuration
- ✅ ESLint, Prettier, Lefthook setup
- ✅ All dependencies installed
- ✅ Database schema for work and calendar modules
- ✅ Hono API with work, calendar, and integration endpoints
- ✅ Next.js web app with work and calendar pages
- ✅ Expo mobile app with work and calendar screens
- ✅ Shared UI package with Tamagui components (Button, Card, Input, Badge)
- ✅ Work-calendar integration (tasks with due dates linked to calendar events)
- ✅ Supabase Auth integration (JWT verification, middleware)
- ✅ PowerSync schema configuration for mobile offline sync
- ✅ Database connection setup in API

### Pending

- ⏳ Supabase cloud project setup
- ⏳ Environment variables configuration
- ⏳ Database migrations and seeding
- ⏳ API client implementation
- ⏳ UI component integration in web/mobile apps
- ⏳ Authentication flow implementation
- ⏳ PowerSync sync stream configuration

## Next Steps

1. **Create Supabase project** at [supabase.com](https://supabase.com)
2. **Configure environment variables** in `apps/api/.env` with your Supabase
   credentials
3. **Run database migrations** to create tables
4. **Test API endpoints** with authentication
5. **Integrate UI components** in web and mobile apps
6. **Implement authentication flow** in web/mobile apps
7. **Configure PowerSync sync streams** for mobile offline sync
