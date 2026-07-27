# Supabase CLI

## Overview

Supabase CLI is a command-line interface for managing Supabase projects locally
and in the cloud. It enables local development with a full Supabase stack,
database migrations, type generation, and deployment management.

## Latest Stable Version

**Version**: `2.0.0` (July 2026)

**Compatibility**:

- Node.js: 18.0.0+, 20.0.0+
- Docker: Required for local development
- Operating Systems: macOS, Linux, Windows
- Package Managers: npm, pnpm, yarn, brew

**Key Features**:

- Local development stack
- Database migrations
- Type generation
- Remote project management
- Edge functions deployment
- Database management
- Branch management

## Core Concepts

- **Local Development**: Run Supabase locally with Docker
- **Migrations**: Database schema version control
- **Type Generation**: Auto-generate TypeScript types
- **Remote Management**: Manage cloud projects
- **Edge Functions**: Deploy serverless functions
- **Branching**: Manage database branches
- **Seed Data**: Populate database with test data
- **Diff**: Compare local and remote schemas

## Key Features

- **Local Stack**: Full Supabase stack locally
- **Migrations**: Version-controlled database changes
- **Type Generation**: Auto-generated TypeScript types
- **Remote Management**: Manage cloud projects from CLI
- **Edge Functions**: Deploy and manage functions
- **Branching**: Create and manage database branches
- **Seed Data**: Populate databases with test data
- **Diff Tools**: Compare schemas and data

## Basic Usage

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local project
supabase init

# Start local development
supabase start

# Stop local development
supabase stop
```

## Installation

### npm

```bash
npm install -g supabase
```

### Homebrew (macOS)

```bash
brew install supabase/tap/supabase
```

### Direct Download

Download from [Supabase CLI releases](https://github.com/supabase/cli/releases)

## Local Development

### Initialize Project

```bash
supabase init
```

This creates:

- `supabase/` directory
- `supabase/config.toml`
- `supabase/migrations/` directory

### Start Local Stack

```bash
supabase start
```

This starts:

- PostgreSQL database
- Auth server
- Storage server
- Real-time server
- Studio (dashboard)

### Stop Local Stack

```bash
supabase stop
```

### Reset Local Database

```bash
supabase db reset
```

## Database Migrations

### Create Migration

```bash
supabase migration new create_users_table
```

This creates a new migration file in `supabase/migrations/`.

### Apply Migrations

```bash
supabase db push
```

### List Migrations

```bash
supabase migration list
```

### Diff Schemas

```bash
supabase db diff --schema public
```

### Generate Migration from Diff

```bash
supabase db diff --use-migra --schema public > supabase/migrations/new_migration.sql
```

## Type Generation

### Generate TypeScript Types

```bash
supabase gen types typescript --local > src/types/supabase.ts
```

### Generate from Remote Project

```bash
supabase gen types typescript --project-id your-project-id > src/types/supabase.ts
```

### Generate with Schema

```bash
supabase gen types typescript --schema public > src/types/supabase.ts
```

## Remote Management

### Link to Remote Project

```bash
supabase link --project-ref your-project-ref
```

### List Projects

```bash
supabase projects list
```

### Create New Project

```bash
supabase projects create --name my-project --db-password password
```

### Delete Project

```bash
supabase projects delete --project-ref your-project-ref
```

## Edge Functions

### Create Function

```bash
supabase functions new my-function
```

### Deploy Function

```bash
supabase functions deploy my-function
```

### List Functions

```bash
supabase functions list
```

### Invoke Function

```bash
supabase functions invoke my-function --data '{"key":"value"}'
```

### Serve Functions Locally

```bash
supabase functions serve
```

## Database Management

### Execute SQL

```bash
supabase db execute --file script.sql
```

### Execute Query

```bash
supabase db execute --query "SELECT * FROM users"
```

### Dump Database

```bash
supabase db dump -f backup.sql
```

### Restore Database

```bash
supabase db restore -f backup.sql
```

## Branching

### Create Branch

```bash
supabase branches create feature-branch
```

### List Branches

```bash
supabase branches list
```

### Switch Branch

```bash
supabase branches switch feature-branch
```

### Delete Branch

```bash
supabase branches delete feature-branch
```

## Seed Data

### Create Seed File

```bash
supabase seed create seed_data.sql
```

### Run Seed

```bash
supabase db seed
```

## Configuration

### config.toml

```toml
[project]
ref = "your-project-ref"
api_url = "https://your-project.supabase.co"
db_url = "postgresql://postgres:password@localhost:54322/postgres"

[studio]
enabled = true
port = 54323

[ingest]
enabled = false

[storage]
enabled = true
file_size_limit = "50MiB"
image_transform_enabled = true

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://your-app.vercel.app"]

[functions]
enabled = true
verify_jwt = true
```

## Advanced Patterns

### Custom Migration Scripts

```sql
-- supabase/migrations/20240101000000_create_users.sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (auth.uid() = id);
```

### Environment-Specific Config

```bash
# Development
supabase start

# Production
supabase db push --remote-url $DATABASE_URL
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Setup Supabase CLI
  run: npm install -g supabase

- name: Deploy migrations
  run: supabase db push --linked
```

## Anti-Patterns

### 1. Not Using Migrations

**BAD**:

```bash
# Direct SQL changes without migrations
```

**GOOD**:

```bash
supabase migration new create_table
# Edit migration file
supabase db push
```

**Why**: Migrations provide version control and reproducibility.

### 2. Not Generating Types

**BAD**:

```bash
# Manual type definitions
```

**GOOD**:

```bash
supabase gen types typescript --local > src/types/supabase.ts
```

**Why**: Auto-generated types stay in sync with database schema.

### 3. Not Using Local Development

**BAD**:

```bash
# Developing directly on remote
```

**GOOD**:

```bash
supabase start
# Develop locally
supabase db push
```

**Why**: Local development is faster and safer.

### 4. Not Backing Up Database

**BAD**:

```bash
# No backups
```

**GOOD**:

```bash
supabase db dump -f backup.sql
```

**Why**: Backups prevent data loss.

## Performance Optimization

### 1. Use Local Development

Local development is faster than remote for testing.

### 2. Optimize Migrations

Keep migrations small and focused.

### 3. Use Seed Data Efficiently

Use seed data only for development, not production.

### 4. Monitor Resource Usage

Check Docker resource usage during local development.

## Common Commands

```bash
# Initialize project
supabase init

# Start local stack
supabase start

# Stop local stack
supabase stop

# Create migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/types/supabase.ts

# Link to remote
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy function-name

# List branches
supabase branches list
```

## Troubleshooting

### Common Issues

**Docker not running**:

- Ensure Docker is installed and running
- Check Docker daemon status

**Port conflicts**:

- Change ports in config.toml
- Stop conflicting services

**Migration failures**:

- Check migration SQL syntax
- Verify database connection
- Review error messages

**Type generation errors**:

- Ensure database is accessible
- Check for circular dependencies
- Verify schema permissions

### Debugging

```bash
# Enable debug mode
supabase start --debug

# Check logs
supabase logs
```

## Best Practices

1. **Use migrations** for all schema changes
2. **Generate types** automatically
3. **Develop locally** before deploying
4. **Use branches** for feature development
5. **Backup database** regularly
6. **Review migrations** before applying
7. **Use seed data** for development
8. **Monitor resources** during local development
9. **Keep migrations** small and focused
10. **Test migrations** on local first
11. **Use environment variables** for configuration
12. **Document complex migrations**
13. **Review diff** before pushing
14. **Use functions** for serverless logic
15. **Keep CLI updated** to latest version

## Resources

- [Official Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase CLI GitHub Repository](https://github.com/supabase/cli)
- [Local Development Guide](https://supabase.com/docs/guides/local-development)
- [Migrations Guide](https://supabase.com/docs/guides/database/migrations)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
