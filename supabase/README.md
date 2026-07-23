# Supabase Configuration

This directory contains the infrastructure-as-code configuration for the Life OS
backend services, including database migrations, security policies, and local
development settings.

## 📂 Project Structure

- `migrations/`: SQL migration files that define the database schema and
  Row-Level Security (RLS) policies.
- `config.toml`: Local development configuration for the Supabase CLI (API
  ports, Auth settings, Storage buckets).
- `seed.sql`: Initial data for local development environments.

## 🚀 Key Infrastructure Components

### Database Schema

The database is structured into several modules (Work, Calendar, Core) with
strict relational integrity and performance optimizations (indexes, full-text
search).

### Security (RLS)

Security is enforced at the database level using PostgreSQL **Row-Level
Security**. Policies are defined in the migrations to ensure:

- Users can only access data within their authorized workspaces.
- Workspace membership dictates permissions (Owner, Admin, Member).
- Service roles have restricted access based on necessity.

### Authentication

Auth is managed by **Supabase Auth**, supporting JWT-based verification in the
Hono API and secure session management in the Web and Mobile applications.

## 🛠️ Local Development

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

### Commands

```bash
# Start local Supabase services
supabase start

# Apply migrations to the local database
supabase db reset

# Create a new migration after schema changes
supabase db diff -f migration_name

# Push migrations to a remote project
supabase db push
```

## 🧪 Testing

RLS policies can be tested using the SQL scripts provided in
`migrations/test_rls_policies.sql`.
