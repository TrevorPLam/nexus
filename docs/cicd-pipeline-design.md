# CI/CD Pipeline Design for Life OS Monorepo

**Date:** July 2026  
**Monorepo Stack:** pnpm 11 + Turborepo 2.9.x + TypeScript 5.9+

## Executive Summary

This document outlines a production-grade CI/CD pipeline for the Life OS monorepo, implementing 2026 best practices for pnpm monorepos with Turborepo. The pipeline emphasizes:

- **Speed:** Sub-2-minute CI times through intelligent caching and affected package detection
- **Security:** Defense-in-depth with Dependabot, CodeQL, and supply chain hardening
- **Reliability:** Parallel execution, proper timeouts, and staged deployments
- **Maintainability:** Reusable workflows, composite actions, and clear separation of concerns

## Current State Assessment

### Existing Workflow
The repository currently has a single `validate-deps.yml` workflow that:
- Runs on push to main and pull requests
- Sets up pnpm 11 and Node.js 24
- Installs dependencies with frozen lockfile
- Runs a custom dependency validation script

### Gaps Identified
1. **No caching strategy** - Dependencies reinstalled on every run
2. **No Turborepo integration** - Missing remote caching and affected detection
3. **No security scanning** - No Dependabot, CodeQL, or dependency review
4. **No deployment automation** - Manual deployment process
5. **No parallel execution** - Sequential job execution
6. **No environment separation** - Single environment for all runs
7. **No timeout configurations** - Risk of hanging jobs
8. **No concurrency controls** - Redundant runs on rapid pushes

## Architecture Overview

### Workflow Structure

```
.github/
  workflows/
    ci.yml                    # Main CI pipeline (lint, typecheck, test, build)
    security.yml              # Security scanning (CodeQL, dependency review)
    deploy-web.yml            # Vercel deployment for web app
    deploy-mobile.yml         # EAS build for mobile app
    deploy-api.yml            # Container deployment for API
    deploy-worker.yml         # Container deployment for worker
    warm-cache.yml            # Cache warming on push to main
  actions/
    setup-project/            # Reusable composite action for project setup
      action.yml
  dependabot.yml              # Dependency update automation
```

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Pull Request / Push                      │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CI Pipeline (ci.yml)                                        │
│  ├─ Lint (parallel)                                         │
│  ├─ Typecheck (parallel)                                    │
│  ├─ Test (parallel, with Supabase service)                  │
│  ├─ Build (affected packages only)                          │
│  └─ Validate dependencies                                    │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Security Pipeline (security.yml)                           │
│  ├─ CodeQL analysis                                         │
│  ├─ Dependency review                                       │
│  └─ Secret scanning (GitHub native)                         │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
                    ┌──────┴──────┐
                    │ Merge to main│
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Deploy Web  │ │ Deploy API  │ │ Deploy Mobile│
    │ (Vercel)    │ │ (Container) │ │ (EAS Build)  │
    └─────────────┘ └─────────────┘ └─────────────┘
```

## Caching Strategy

### Three-Layer Caching Approach

#### Layer 1: pnpm Store Cache
Caches the global pnpm content-addressable store for fast dependency restoration.

```yaml
- name: Get pnpm store path
  id: pnpm-cache
  shell: bash
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

- name: Restore pnpm store cache
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      pnpm-store-${{ runner.os }}-
```

**Key considerations:**
- Fixed store path via `pnpm store path` ensures cache consistency
- `**/pnpm-lock.yaml` pattern catches all workspace lockfiles
- Broad restore key allows partial cache hits on lockfile changes

#### Layer 2: Turborepo Remote Cache
Shares build artifacts across CI runs and team members via Vercel Remote Cache.

```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

**Setup requirements:**
1. Create Vercel access token from dashboard
2. Add `TURBO_TOKEN` as GitHub secret
3. Add `TURBO_TEAM` as GitHub variable (not secret, for log visibility)
4. Enable remote cache in `turbo.json` (already configured)

**Benefits:**
- 80%+ cache hit rate on unchanged packages
- Cache hits take 3-5 seconds vs full rebuild
- Shared across CI, local dev, and team members

#### Layer 3: Custom Heavy Dependency Caching
Cache expensive dependencies like Playwright browsers or native modules.

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

### Cache Warming Strategy

To ensure PRs can read from base branch cache, add a warm-cache job:

```yaml
warm-cache:
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: 'pnpm'
    - name: Warm pnpm store
      run: pnpm fetch
```

**Critical:** Both warm-cache and PR jobs must use identical cache keys.

## Affected Package Detection

### Turborepo Built-in Detection

Use Turborepo's `--filter` flag to only run tasks for changed packages:

```yaml
- name: Build affected packages
  run: pnpm turbo build --filter=[HEAD^1]
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

**Filter options:**
- `--filter=[HEAD^1]` - Packages changed vs last commit
- `--filter=...[origin/main]` - Packages changed vs main branch
- `--filter=@life-os/web` - Specific package

**Requirements:**
- `fetch-depth: 2` in checkout step for `--filter=[HEAD^1]`
- `fetch-depth: 0` for `--filter=...[origin/main]`

### Path Filtering for Workflow Triggers

Skip CI entirely for non-code changes:

```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/ISSUE_TEMPLATE/**'
```

## Security Strategy

### Defense-in-Depth Approach

#### 1. Dependabot for Dependency Security

**Security Alerts (automatic):**
- Enabled by default for all public repos
- Detects CVEs via GitHub Advisory Database
- Auto-opens PRs for critical/high severity vulnerabilities

**Version Updates (configurable):**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "pnpm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    groups:
      react-ecosystem:
        patterns: ["react", "react-*", "@types/react*"]
    labels:
      - "dependencies"
      - "automated"
```

#### 2. CodeQL for Static Analysis

Enable default setup via GitHub UI:
1. Navigate to repo Settings → Code Security
2. Click "Set up" next to "CodeQL analysis"
3. Select "Default" configuration
4. Choose languages (TypeScript, JavaScript)

**Advanced setup option:**
```yaml
- uses: github/codeql-action/init@v4
  with:
    languages: javascript, typescript
- uses: github/codeql-action/analyze@v4
```

#### 3. Dependency Review Action

Block vulnerable dependencies in PRs:

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v4
  with:
    fail-on-severity: high
    deny-licenses: GPL-3.0
```

#### 4. Supply Chain Hardening

**Pin actions to commit SHAs:**
```yaml
- uses: actions/checkout@v4 # ✅ Good - pinned to tag
- uses: actions/checkout@a81bbbf # ✅ Better - pinned to SHA
- uses: actions/checkout@latest # ❌ Bad - mutable reference
```

**Least-privilege permissions:**
```yaml
permissions:
  contents: read
  pull-requests: write
  id-token: write # For OIDC
```

**OIDC for cloud authentication:**
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/github-actions
    aws-region: us-east-1
```

#### 5. Secret Management

**Separation of concerns:**
- **Secrets:** API keys, tokens, passwords (GitHub Secrets)
- **Config:** URLs, region names, feature flags (GitHub Variables)

**Environment-specific secrets:**
```yaml
jobs:
  deploy:
    environment: production
    env:
      API_KEY: ${{ secrets.API_KEY }}
      APP_URL: ${{ vars.APP_URL }}
```

## Deployment Strategy

### Web (Vercel)

**Approach:** Vercel native git integration for deployments, GitHub Actions for gating checks.

**Rationale:** Vercel's native integration is faster and provides preview URLs automatically. GitHub Actions handles validation before merge.

**Configuration:**
1. Connect repo to Vercel
2. Set root directory to `apps/web`
3. Configure environment variables per environment
4. Enable branch protection requiring CI checks

**GitHub Actions role:** Run lint, typecheck, tests before merge. Vercel handles actual deploy.

### Mobile (Expo EAS)

**Approach:** GitHub Actions triggers EAS builds on merge to main.

**Workflow:**
```yaml
- name: Build iOS
  run: eas build --platform ios --profile production --non-interactive --no-wait
- name: Build Android
  run: eas build --platform android --profile production --non-interactive --no-wait
```

**Profiles:**
- `preview` - Development builds for testing
- `production` - Store submission builds

**Code signing:** Use EAS managed credentials (`credentialsSource: "remote"`)

### API/Worker (Container Hosts)

**Approach:** Build and push Docker images, deploy via platform CLI.

**Options:**
- **Railway:** Automatic detection from Dockerfile
- **Fly.io:** `flyctl deploy` via GitHub Action
- **Render:** GitHub integration or CLI deploy

**Example (Fly.io):**
```yaml
- uses: superfly/flyctl-actions/setup-flyctl@master
- run: flyctl deploy --remote-only
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Docker optimization:** Use `turbo prune` to create minimal workspace for builds.

## Anti-Patterns to Avoid

### 1. Over-Caching or Ineffective Cache Strategies

**❌ Bad:**
```yaml
# Cache key too specific - never hits
key: cache-${{ github.run_id }}
```

**❌ Bad:**
```yaml
# Cache key too broad - restores stale artifacts
key: node-modules
```

**✅ Good:**
```yaml
# Key based on lockfile hash
key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
restore-keys: |
  pnpm-store-${{ runner.os }}-
```

### 2. Running Unnecessary Jobs on Every Commit

**❌ Bad:**
```yaml
on:
  push:
    branches: [main]
# Runs on every push, including doc changes
```

**✅ Good:**
```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

### 3. Missing Environment Variable Security

**❌ Bad:**
```yaml
# Production secrets in PR runs
env:
  DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

**✅ Good:**
```yaml
# Use environments for protection
jobs:
  deploy:
    environment: production
    env:
      DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

### 4. Inadequate Timeout and Retry Configurations

**❌ Bad:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    # No timeout - can run forever
```

**✅ Good:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
```

### 5. Sequential Job Execution

**❌ Bad:**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [...]
  typecheck:
    needs: lint # Unnecessary dependency
    runs-on: ubuntu-latest
    steps: [...]
```

**✅ Good:**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [...]
  typecheck:
    runs-on: ubuntu-latest # Runs in parallel
    steps: [...]
```

### 6. Using Mutable Action References

**❌ Bad:**
```yaml
- uses: some-action@main
- uses: some-action@v2
```

**✅ Good:**
```yaml
- uses: some-action@abc123def456 # SHA
- uses: some-action@v2 # Tag with comment # v2.1.0
```

### 7. Excessive Permissions

**❌ Bad:**
```yaml
permissions: write-all
```

**✅ Good:**
```yaml
permissions:
  contents: read
  pull-requests: write
```

### 8. No Concurrency Control

**❌ Bad:**
```yaml
# Multiple runs accumulate on rapid pushes
```

**✅ Good:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Performance Targets

### CI Pipeline Goals

| Metric | Target | Current |
|--------|--------|---------|
| Cold cache install time | < 2 min | ~3-4 min |
| Warm cache install time | < 30 sec | ~90 sec |
| Full CI run (cache hit) | < 2 min | N/A |
| Full CI run (cache miss) | < 5 min | N/A |
| Affected-only CI | < 1 min | N/A |

### Optimization Techniques

1. **Parallel execution** - Lint, typecheck, test run simultaneously
2. **Affected detection** - Only build changed packages
3. **Remote caching** - Share artifacts across runs
4. **Path filtering** - Skip CI for doc changes
5. **Concurrency control** - Cancel redundant runs

## Monitoring and Observability

### Key Metrics to Track

- CI duration trends
- Cache hit rates
- Failure rates by job type
- Deployment frequency
- Lead time for changes

### Logging Best Practices

- Structured JSON logs for parsing
- Upload test results as artifacts
- Capture build timing per package
- Log cache hit/miss status

### Failure Handling

- Upload relevant artifacts on failure
- Provide actionable error messages
- Retry flaky network operations
- Alert on repeated failures

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create reusable setup-project composite action
- [ ] Implement pnpm store caching
- [ ] Add Turborepo remote cache configuration
- [ ] Set up cache warming job

### Phase 2: CI Pipeline (Week 2)
- [ ] Create ci.yml with parallel jobs
- [ ] Implement affected package detection
- [ ] Add Supabase service for integration tests
- [ ] Configure timeout and concurrency

### Phase 3: Security (Week 3)
- [ ] Enable CodeQL default setup
- [ ] Add dependency review action
- [ ] Configure Dependabot version updates
- [ ] Pin all actions to SHAs
- [ ] Implement least-privilege permissions

### Phase 4: Deployment (Week 4)
- [ ] Set up Vercel integration for web
- [ ] Configure EAS builds for mobile
- [ ] Implement container deployment for API/worker
- [ ] Add environment protection rules

### Phase 5: Optimization (Week 5)
- [ ] Measure and optimize cache hit rates
- [ ] Implement path filtering
- [ ] Add performance monitoring
- [ ] Document runbooks for common failures

## Appendix: Required Secrets and Variables

### GitHub Secrets
- `TURBO_TOKEN` - Vercel access token for remote cache
- `EXPO_TOKEN` - Expo access token for EAS builds
- `VERCEL_TOKEN` - Vercel access token (if using CLI deploy)
- `FLY_API_TOKEN` - Fly.io API token (if using Fly.io)
- `RAILWAY_TOKEN` - Railway API token (if using Railway)

### GitHub Variables
- `TURBO_TEAM` - Vercel team slug
- `NODE_VERSION` - Node.js version (24)
- `PNPM_VERSION` - pnpm version (11)

### Environment-Specific Secrets
- Production database URLs
- API keys for external services
- Code signing certificates (if not using EAS managed)

## References

- [Turborepo CI Documentation](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [pnpm CI Guide](https://pnpm.io/continuous-integration)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides)
- [Expo EAS CI/CD](https://docs.expo.dev/build/introduction)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
