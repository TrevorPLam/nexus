# @life-os/database

The database layer for Life OS, featuring the **Drizzle ORM** schema and migration management for the PostgreSQL backend.

## 🚀 Features

- **Typed Schema**: Authoritative Drizzle schema definitions for all database tables.
- **Migrations**: Automated migration generation and tracking via `drizzle-kit`.
- **Advanced Search**: Implementation of PostgreSQL full-text search (`tsvector`).
- **Relational Integrity**: Strictly enforced foreign key constraints and relational mappings.

## 📂 Project Structure

- `src/schema/`: Drizzle table definitions.
    - `core.ts`: Users, workspaces, memberships, and system tables (Outbox, Audit Log, Idempotency).
    - `work.ts`: Projects, tasks, and work-related tables.
    - `calendar.ts`: Calendars, events, and scheduling-related tables.
- `drizzle/`: Auto-generated migration SQL files.

## 🏁 Commands

### Migration Management

```bash
# Generate a new migration from schema changes
pnpm generate

# Push schema changes directly to the database (development only)
pnpm push
```

### Database Exploration

```bash
# Launch Drizzle Studio to browse data
pnpm studio
```

## 🧪 Testing

```bash
# Run integration tests against an ephemeral database
pnpm test
```
