# @life-os/api

The backend API for Life OS, built with **Hono** and **Drizzle ORM**. It
provides a high-performance, type-safe REST/command interface for the entire
Life OS ecosystem.

## 🚀 Features

- **RESTful API**: Structured endpoints for work management, calendar
  integration, and system health.
- **Type Safety**: End-to-End type safety using **Zod** and shared contracts
  from `@life-os/contracts`.
- **OpenAPI Documentation**: Automatically generated API documentation via
  `@hono/zod-openapi`.
- **Authentication**: JWT-based authentication using **Supabase Auth**.
- **Authorization**: Workspace-scoped data access enforced via PostgreSQL
  **Row-Level Security (RLS)**.
- **Idempotency**: Middleware support for idempotency keys to ensure safe
  retries of mutations.
- **Audit Logging**: Automatic tracking of changes to core entities.
- **Transactional Outbox**: Reliable event propagation using the Outbox pattern.

## 🛠️ Technology Stack

- **Framework**: [Hono 4.12](https://hono.dev/)
- **Runtime**: Node.js 24 (LTS)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: PostgreSQL (Supabase)
- **Validation**: [Zod](https://zod.dev/)
- **Server**: `@hono/node-server`

## 📂 Project Structure

- `src/index.ts`: API entry point and router configuration.
- `src/server.ts`: Node.js server setup.
- `src/routes/`: Route handlers organized by domain (work, calendar,
  integration).
- `src/lib/`: Shared utilities, middleware, and database configuration.

## 🏁 Getting Started

### Prerequisites

- Node.js 24+
- pnpm 11+
- Running PostgreSQL instance (Supabase recommended)

### Development

```bash
pnpm dev
```

The API will be available at `http://localhost:3000`.

### Building

```bash
pnpm build
```

## 🧪 Testing

```bash
pnpm test
```
