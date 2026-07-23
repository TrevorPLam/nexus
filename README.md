# Life OS

Life OS is a comprehensive personal productivity system designed to integrate work management and calendar functionality into a unified experience. Built as a high-performance monorepo, it leverages modern TypeScript tooling and a robust offline-first synchronization strategy.

## 🏗️ Architecture Overview

Life OS is architected as a monorepo using **pnpm workspaces** and **Turborepo** for efficient build orchestration and dependency management.

### 📱 Applications (`apps/`)

- **`api`**: A high-performance REST/command API built with **Hono 4.12**. It uses **Drizzle ORM** for PostgreSQL access and provides OpenAPI documentation via `@hono/zod-openapi`.
- **`web`**: A modern web application built with **Next.js 16 (App Router)** and **React 18**. It utilizes **Tailwind CSS 4** for styling and **TanStack Query 5** for state management.
- **`mobile`**: A cross-platform mobile application built with **Expo 52** and **React Native 0.76**. It features **Expo Router** for navigation and **PowerSync** for offline-first data synchronization.
- **`worker`**: A background job worker (currently in development) for handling asynchronous tasks like notifications and synchronization.

### 📦 Shared Packages (`packages/`)

- **`contracts`**: The source of truth for the domain model. Contains **Zod schemas** for all API requests and responses, shared between backend and client applications.
- **`database`**: The authoritative **Drizzle ORM** schema and migration history for the PostgreSQL database.
- **`api-client`**: A fully typed, Zod-validated TypeScript client for interacting with the Life OS API.
- **`mobile-data`**: **PowerSync** schema definitions that bridge the PostgreSQL backend with the mobile SQLite database for offline sync.
- **`ui`**: A shared UI component library based on **Tamagui**, ensuring design consistency across web and mobile platforms.
- **`tsconfig`**: Shared TypeScript configuration across the monorepo.

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js 24 (LTS) |
| **Package Manager** | pnpm 11 |
| **Monorepo** | Turborepo 2.9 |
| **Language** | TypeScript 5.9 (Strict Mode) |
| **Backend** | Hono 4.12 |
| **Frontend** | Next.js 16 (App Router), React 18 |
| **Mobile** | Expo 52, React Native 0.76 |
| **Database** | PostgreSQL (Supabase), Drizzle ORM |
| **Sync** | PowerSync Cloud |
| **Validation** | Zod |
| **Styling** | Tailwind CSS 4, Tamagui |
| **Testing** | Vitest 2.0 |
| **Linting** | ESLint 10 |
| **Formatting** | Prettier 3.9 |

## 🚀 Core Features

### 💼 Work Management
- **Projects**: Organized workspaces with customizable colors, icons, and statuses.
- **Tasks**: Rich task model supporting subtasks, priorities, energy levels, and milestone tracking.
- **Dependencies**: Support for complex task relationships (Finish-to-Start, Start-to-Start, etc.).
- **Time Tracking**: Integrated time entries with support for billable rates and descriptions.
- **Collaboration**: Task-based comments, assignees, and attachments via Supabase Storage.
- **Full-Text Search**: Optimized PostgreSQL full-text search with `tsvector`.

### 📅 Calendar Integration
- **Multi-Provider**: Support for local, Google, and Outlook calendars.
- **Events**: Full event lifecycle management with attendee tracking and status (Accepted, Declined, etc.).
- **Task Linking**: Seamless bidirectional linking between tasks and calendar events.
- **Scheduling Links**: Public booking pages with customizable availability windows, duration, and buffers.
- **Availability Engine**: Real-time availability calculation and booking logic.

## 🔐 Security & Infrastructure

- **Authentication**: Managed via **Supabase Auth**.
- **Authorization**: Row-Level Security (RLS) on PostgreSQL ensures strict workspace-level isolation.
- **Idempotency**: Built-in idempotency key support for all mutation endpoints to prevent duplicate operations.
- **Audit Logging**: Comprehensive audit trails for all entity changes (tasks, projects, etc.).
- **Outbox Pattern**: Transactional event outbox for reliable background processing.

## 🛠️ Getting Started

### Prerequisites
- Node.js 24+
- pnpm 11+
- Supabase CLI

### Installation
```bash
pnpm install
```

### Development
```bash
# Start all services
pnpm dev

# Start specific application
pnpm --filter @life-os/web dev
pnpm --filter @life-os/mobile dev
pnpm --filter @life-os/api dev
```

### Database Management
```bash
# Generate migrations
pnpm --filter @life-os/database generate

# Push changes to local/remote DB
pnpm --filter @life-os/database push
```

## 🧪 Testing
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm turbo run test -- --coverage
```
