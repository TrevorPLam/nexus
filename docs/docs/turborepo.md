# Turborepo

High-performance build system for JS/TS monorepos. Orchestrates tasks with intelligent caching and parallel execution.

## Version & Compatibility

**Latest**: `2.10.6` (Jul 2026)

**Node.js**: Core turbo is version-agnostic. Ecosystem packages (create-turbo, turbo-ignore, eslint-config-turbo) support Active & Maintenance LTS.

**Package Managers**: pnpm 8+, npm 9+, Yarn 1.22+, Yarn 2+, Bun 1+

**Support Policy**: Major versions supported 2 years from next major release. v1.x EOL: Jun 4, 2026. v2.x active.

## Core Concepts

- **Package Graph**: Dependency graph of packages for relationship awareness
- **Task Graph**: DAG of tasks with dependency orchestration
- **Caching**: Local (`.turbo/cache`) + optional remote sharing
- **Incremental**: Content hashing rebuilds only changed packages

## Key Files

- `turbo.json` - Task definitions & global config
- `package.json` (root) - Scripts delegate to `turbo run`
- `pnpm-workspace.yaml` / `workspaces` - Workspace config
- Lockfile - Required for reproducible builds

## Workspace Structure

```
monorepo/
├── apps/           # Deployables
├── packages/       # Shared libraries
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

## Root Configuration

**package.json**:
```json
{
  "name": "monorepo",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "dev": "turbo run dev"
  },
  "devDependencies": {
    "turbo": "2.10.6"
  }
}
```

**Rules**:
- `private: true` - Prevents publishing
- `packageManager` - Enforces version consistency
- Scripts delegate to `turbo run` only
- Minimal devDependencies (turbo + repo tools)

## turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Task Options**:
- `dependsOn`: `"^task"` (deps), `"task"` (same pkg), `"pkg#task"` (specific)
- `outputs`: Cache glob patterns (use `/**` for contents)
- `inputs`: Hash inputs (defaults: all tracked files)
- `cache`: Enable/disable (default: true)
- `persistent`: Runs indefinitely (dev servers)
- `env`: Vars included in hash
- `passThroughEnv`: Vars available but not hashed

## Package Configuration

```json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./button": "./src/button.tsx"
  },
  "scripts": {
    "build": "tsc",
    "lint": "eslint src",
    "test": "vitest"
  }
}
```

**Best Practices**:
- Namespaced names (`@repo/`)
- `exports` field (not `main`)
- Version `0.0.0` for internal
- `private: true` for internal

## Dependency Management

**Install where used**:
```bash
pnpm add react --filter=@repo/ui
npm install react --workspace=@repo/ui
yarn workspace @repo/ui add react
```

**Internal deps use workspace protocol**:
```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

**Root deps only**: turbo, git hooks, repo tooling

## TypeScript

**Shared config package**:
```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022"
  }
}
```

**Extend in packages**:
```json
{
  "extends": "@repo/config/tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

No root `tsconfig.json` needed.

## Advanced Patterns

### Package-Specific Configs

**Package turbo.json** (extends root):
```json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "outputs": ["dist/**"]
    }
  }
}
```

**Extend from other packages**:
```json
{
  "extends": ["//", "web"],
  "tasks": {
    "build": {
      "env": ["NEXT_PUBLIC_DOCS_URL"]
    }
  }
}
```

### $TURBO_EXTENDS$ (Array Inheritance)

Append to inherited arrays instead of replacing:
```json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "outputs": ["$TURBO_EXTENDS$", ".next/**", "!.next/cache/**"]
    }
  }
}
```

Works with: `dependsOn`, `env`, `inputs`, `outputs`, `passThroughEnv`, `with`

### Global Configuration (futureFlags)

```json
{
  "futureFlags": {
    "globalConfiguration": true
  },
  "global": {
    "inputs": ["tsconfig.json", ".env"],
    "env": ["NODE_ENV"],
    "passThroughEnv": ["AWS_SECRET_KEY"],
    "envMode": "strict",
    "cacheDir": ".turbo/cache",
    "concurrency": "50%"
  }
}
```

**Key renames**: `globalDependencies` → `inputs`, `globalEnv` → `env`

**Behavior change**: `global.inputs` prepended to each task's `inputs` (not global hash), allowing task-level exclusion via negation globs.

### Special Input Values

- `$TURBO_DEFAULT$`: Include default inputs, then add/remove
- `$TURBO_ROOT$/path`: Reference files from repo root

```json
{
  "tasks": {
    "build": {
      "inputs": ["$TURBO_DEFAULT$", "!README.md", "$TURBO_ROOT$/tsconfig.json"]
    }
  }
}
```

### Transit Nodes

For parallel execution with dependency awareness:
```json
{
  "tasks": {
    "transit": {
      "dependsOn": ["^transit"]
    },
    "check-types": {
      "dependsOn": ["transit"]
    }
  }
}
```

### Filtering

```bash
# Specific package
turbo run build --filter=web

# Package + dependents
turbo run build --filter=...ui

# Package + dependencies
turbo run build --filter=web...

# Changed since main (includes dependents)
turbo run build --filter=[origin/main]

# Changed only (no dependents)
turbo run build --filter=[origin/main]...

# Affected (changed + dependents)
turbo run build --affected
```

### Environment Variables

**Strict mode** (default): Only vars in `env`/`globalEnv` available
**Loose mode**: All system vars available (use `--env-mode=loose`)

```json
{
  "tasks": {
    "build": {
      "env": ["DATABASE_URL", "NEXT_PUBLIC_*", "!NEXT_PUBLIC_ANALYTICS_ID"],
      "passThroughEnv": ["SENTRY_AUTH_TOKEN"]
    }
  }
}
```

**Framework inference** (automatic): Next.js (`NEXT_PUBLIC_*`), Vite (`VITE_*`), CRA (`REACT_APP_*`), etc.

Disable: `--framework-inference=false` or `"env": ["!NEXT_PUBLIC_*"]`

### Cache Management

**Local cache eviction**:
```json
{
  "cacheMaxAge": "7d",
  "cacheMaxSize": "10GB"
}
```

Duration: `30s`, `5m`, `24h`, `7d`, `2w`. Size: `500MB`, `10GB`, `1TB`

**Remote caching** (Vercel):
```bash
turbo login
turbo link
```

CI setup:
```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

**Artifact signing**:
```json
{
  "remoteCache": {
    "signature": true
  }
}
```
Set `TURBO_REMOTE_CACHE_SIGNATURE_KEY` env var.

### Docker Integration

```bash
turbo prune api --docker
```

Creates `out/json/` (package.jsons) and `out/full/` (source) for Docker layer caching.

**Dockerfile**:
```dockerfile
FROM node:18-alpine AS base
RUN corepack enable pnpm

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune api --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN
RUN pnpm turbo run build --filter=api
```

## Anti-Patterns

1. **Root scripts not using turbo**: Bypasses parallelization/caching
2. **Chaining with `&&`**: Use `dependsOn` instead
3. **Broad globalDependencies**: Affects all tasks - be specific
4. **Root tasks**: Defeats parallelization - use package tasks
5. **Missing `/**` in outputs**: `"dist"` hashes folder existence, not contents
6. **Shared code in apps**: Move to packages
7. **Root app deps**: Causes cache misses - install where used
8. **Cross-boundary imports**: Use workspace protocol
9. **Root .env**: Package-specific .env files preferred
10. **Missing `^` in dependsOn**: Dependencies won't build first
11. **Using `../` in inputs**: Use `$TURBO_ROOT$` instead
12. **Missing `persistent` on dev**: Dev servers may terminate early
13. **Using `--parallel`**: Bypasses dependency graph
14. **`tsc --noEmit` for libs**: Downstream gets stale .d.ts
15. **Circular dependencies**: Breaks incremental builds

## Performance

- **outputs**: Specify what to cache (use `/**`)
- **inputs**: Limit what gets hashed
- **env**: Include vars that affect output
- **Remote cache**: Share across team/CI
- **pnpm catalogs**: Version consistency
- **Lockfile**: Always commit
- **concurrency**: Limit parallel tasks (default: 10)

## Concurrency

```json
{
  "concurrency": "50%"  // or integer like "4"
}
```

- `1`: Serial execution
- `100%`: All CPUs
- Deprecated: `daemon` (no longer used for turbo run)

## Troubleshooting

**Debugging flags**:
```bash
turbo run build --summarize      # JSON run summary
turbo run build --dry=json       # Show what would run
turbo run build --verbosity=2   # Debug logs
turbo run build --output-logs=new-only  # Cache misses only
```

**Unexpected cache misses**:
1. Run with `--summarize`, compare with previous run
2. Check env vars with `--dry=json`
3. Look for lockfile/config changes

**Unexpected cache hits**:
1. Verify env var is in `env` array
2. Verify file is in `inputs` array
3. Check if `envMode` is loose

**With globalConfiguration enabled**:
- `global.inputs` appear in task inputs (not global hash)
- Use `$TURBO_DEFAULT$` when excluding global inputs
- Toggling flag invalidates all caches

## CI/CD

```yaml
- name: Setup
  run: pnpm install

- name: Build
  run: pnpm build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

**PR builds**:
```yaml
turbo run build lint test --filter=[origin/main]
```

## Common Commands

```bash
turbo run build                           # All packages
turbo run build --filter=web              # Specific package
turbo run build --affected                # Changed + dependents
turbo run build --filter=[origin/main]     # Changed since main
turbo run build --force                   # Bypass cache
turbo run build --dry-run                 # Dry run
turbo prune web --docker                  # Docker prep
```

## Package Managers

**pnpm** (recommended):
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**npm/Yarn**:
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

## Migration

```bash
npx @turbo/codemod migrate
```

## Resources

- [Official Docs](https://turborepo.dev/docs)
- [GitHub](https://github.com/vercel/turborepo)
- [Best Practices](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/best-practices/RULE.md)
- [Configuration Gotchas](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/configuration/gotchas.md)
