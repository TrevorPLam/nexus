# Knip Implementation Guide for Life OS Monorepo

## Executive Summary

This guide provides a comprehensive implementation strategy for Knip in the Life
OS TypeScript monorepo. Knip is the recommended unused code detection tool for
2026, offering superior TypeScript support, monorepo awareness, and
comprehensive codebase hygiene compared to alternatives like depcheck.

## Research Findings

### Knip Fundamentals & Architecture

**Knip Architecture:**

- Knip builds a complete dependency graph of the entire project by analyzing
  imports, exports, and module resolution
- Unlike depcheck (which only scans `package.json`), Knip traverses the actual
  module graph to detect unused files, exports, and dependencies
- Uses native oxc-parser for fast TypeScript/JavaScript parsing
- Implements workspace-aware analysis for monorepos

**Key Differences from Other Tools:**

- **depcheck**: Focused dependency scanner, no unused file/export detection,
  limited monorepo support
- **ts-prune**: Removes unused exports only, requires single tsconfig, no
  dependency analysis
- **unimported**: Fast but production-mode only, less configuration flexibility
- **Knip**: Comprehensive analysis (files, exports, dependencies, types), 50+
  framework plugins, monorepo-first design

### Monorepo Support

**Workspace Detection:** Knip automatically reads workspaces from:

1. `package.json` workspaces array (npm, Bun, Yarn, Lerna)
2. `pnpm-workspace.yaml` packages array (pnpm) ← **Our setup**
3. Legacy `package.json` workspaces.packages
4. Knip configuration workspaces object

**Workspace Configuration:**

- Each workspace can have custom `entry`, `project`, and plugin configurations
- Root workspace is named `"."` in configuration
- Workspace dependencies are traced across package boundaries using
  `workspace:*` protocol
- Use `--workspace` flag to analyze specific workspaces (includes ancestors and
  dependencies)

### Entry Points & Project Files

**Default Entry Files:**

- `{index,cli,main}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}`
- `src/{index,cli,main}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}`

**Framework-Specific Entry Points:**

- **Next.js**: App Router pages/layouts, Pages directory routes, middleware,
  instrumentation
- **Expo**: `app/**/*.{js,jsx,ts,tsx}`, `src/app/**/*.{js,jsx,ts,tsx}`
- **Hono**: Server entry points, route handlers
- **Vitest**: Test files, configuration files

**Project Patterns:**

- Define analysis scope with `project` patterns
- Use negated patterns to exclude generated files: `!src/generated/**`
- Don't use `ignore` for file exclusion (it only suppresses reporting, not
  analysis)

### TypeScript Path Aliases

**Resolution Strategy:**

- Knip automatically includes `compilerOptions.paths` from tsconfig.json
- For monorepos: **Use workspace dependencies over path aliases** for
  cross-workspace imports
- Path aliases work within a workspace, but `workspace:*` dependencies are
  preferred for inter-workspace references
- Use `--tsConfig` flag to point to alternative tsconfig location
- Use `paths` in Knip config for custom aliases not in tsconfig

**Project References:**

- Knip follows workspace structure, not TypeScript project structure
- Use `--use-tsconfig-files` to delegate project file discovery to tsconfig
  (files won't be reported as unused)
- Not recommended for monorepos with complex workspace layouts

### Anti-Patterns & Common Mistakes

**❌ Anti-Patterns:**

1. **Over-aggressive `ignore` usage**
   - `ignore` only suppresses reporting, doesn't exclude from analysis
   - Creates blind spots and false negatives
   - Fix: Use proper `entry`/`project` patterns instead

2. **Excluding tests with patterns**
   - Trying to exclude tests via `project` negations or `ignore`
   - Plugins add test files as entries anyway
   - Fix: Use production mode (`--production`)

3. **Running `knip --fix` prematurely**
   - Auto-fixing before configuration is settled can delete used code
   - Fix: Verify issues manually first, ensure configuration is solid

4. **Using path aliases for cross-workspace imports**
   - Knip doesn't trace path aliases across workspaces well
   - Fix: Use `workspace:*` dependencies in package.json

5. **Running from workspace directories**
   - Not officially supported, can cause regressions
   - Fix: Always run from monorepo root with `--workspace` flag if needed

6. **Ignoring configuration hints**
   - Hints indicate missing entry points or unresolved dependencies
   - Fix: Address hints first before looking at other issues

**✅ Best Practices:**

1. **Start with defaults**, only add targeted `entry` overrides when needed
2. **Use production mode** to focus on production code
3. **Configure per-workspace** for different entry patterns
4. **Address configuration hints** before other issues
5. **Use `--debug` and `--performance`** when troubleshooting
6. **Run from monorepo root** with workspace filters for large repos

### Performance Characteristics

**Where Time Goes (large repos):**

1. Parse + traverse + module-graph build (dominant phase)
2. Unused-detection analysis (can be super-linear on barrel files)
3. gitignore tree walk
4. Per-workspace plugin pass

**Performance Tips:**

- Warm runs are ~2× faster due to caching (module resolution, glob results)
- Use `--workspace` to analyze only changed packages
- Use production mode to reduce analysis scope
- Enable/disable plugins selectively
- Use `--isolate-workspaces` for independent analysis
- Avoid `ignoreExportsUsedInFile` if not needed (slows analysis)

**Known Limits:**

- 121K LOC repo: Should complete in <10 minutes (1-1.5 hrs indicates config
  issue)
- 3.5M LOC repo with 750 packages: ~35 minutes (reference benchmark)
- This monorepo (~100-200 files per app): Should complete in <2 minutes

### CI/CD Integration

**GitHub Actions Example:**

```yaml
- name: Run Knip
  run: pnpm knip --cache --reporter github
```

**Best Practices:**

- Use `--cache` for faster consecutive runs
- Use `--reporter github` for GitHub Actions annotations
- Consider running twice: default mode + production mode
- Use `--treat-config-hints-as-errors` to enforce configuration hygiene
- Use `--no-exit-code` for reporting without failing CI (during rollout)

## Repository-Specific Assessment

### Current Monorepo Structure

**Applications (deployable services):**

- `apps/web` - Next.js 16 (App Router)
- `apps/mobile` - Expo SDK 52 with Expo Router
- `apps/api` - Hono 4.12.x backend
- `apps/worker` - Background job worker

**Packages (shared libraries):**

- `packages/ui` - Tamagui components
- `packages/contracts` - Zod schemas (no dependencies on other packages)
- `packages/database` - Drizzle ORM schema
- `packages/api-client` - Typed API client
- `packages/mobile-data` - PowerSync schema
- `packages/tsconfig` - Shared TypeScript config
- `packages/vitest-config` - Shared Vitest config

### Dependency Layering

**Import hierarchy (per AGENTS.md):**

```
contracts (no dependencies)
  ↓
database, mobile-data, api-client (depend on contracts)
  ↓
ui (depends on React, Tamagui)
  ↓
api (depends on contracts, database)
web, mobile (depend on ui, contracts, api-client/mobile-data)
worker (depends on contracts, database)
```

### Entry Points Analysis

**apps/web:**

- Next.js App Router:
  `src/app/**/{layout,page,route,template,loading,error,not-found}.{js,jsx,ts,tsx}`
- Context providers: `src/contexts/**/*.{js,jsx,ts,tsx}`
- Custom hooks: `src/hooks/**/*.{js,jsx,ts,tsx}`
- Utility libraries: `src/lib/**/*.{js,jsx,ts,tsx}`
- Test setup: `src/test/setup.ts` (ignore)

**apps/mobile:**

- Expo Router: `app/**/*.{js,jsx,ts,tsx}`
- Source files: `src/**/*.{js,jsx,ts,tsx}`

**apps/api:**

- Server entry: `src/server.ts`
- Index exports: `src/index.ts`
- Library modules: `src/lib/**/*.ts`

**apps/worker:**

- Worker entry: `src/index.ts`

**packages:**

- All packages use `src/index.ts` as main entry point
- `packages/database` includes `drizzle/**/*.ts` for schema files

### TypeScript Configuration

**Project References:**

- Root `tsconfig.json` references all packages and apps
- Each workspace has its own `tsconfig.json` extending shared config
- Module resolution: `Bundler` (ESNext with bundler resolution)
- Strict mode enabled across all workspaces

### Test Coverage Impact

**Test Files:**

- Web: 45 test files (`.test.tsx`, `.test.ts`)
- Mobile: 13 test files
- API: 60+ test files
- Worker: 2 test files
- Packages: Test files in each package

**Strategy:**

- Default mode: Include all test files for comprehensive analysis
- Production mode: Exclude test files to focus on production code
- Test utilities (e.g., `src/test/setup.ts`) should be ignored

## Configuration Implementation

### knip.json Configuration

The provided `knip.json` configuration includes:

**Global Settings:**

- `exclude`: ["classMembers", "enumMembers"] - Reduce noise from unused
  class/enum members
- `ignoreExportsUsedInFile`: true - Ignore exports only used within their
  defining file
- `ignoreWorkspaces`: [] - Analyze all workspaces

**Global Ignores:**

- Type definitions: `@types/*`
- Tooling: `typescript`, `eslint`, `prettier`, `lefthook`, `turbo`, `supabase`,
  `tsx`
- Testing: `@vitest/*`, `vitest`, `@testing-library/*`, `jsdom`,
  `react-test-renderer`

**Workspace-Specific Configuration:**

**Root workspace (`.`):**

- Entry: `scripts/**/*.ts`
- Project: `scripts/**/*.ts`
- Additional ignores for dev tooling

**apps/web:**

- Entry: App Router files, contexts, hooks, lib
- Project: All source files, excluding test files
- Ignore: Test setup file

**apps/mobile:**

- Entry: Expo Router app files, src files
- Project: All source files, excluding test files

**apps/api:**

- Entry: Server, index, lib modules
- Project: All source files, excluding test files

**apps/worker:**

- Entry: Index file
- Project: All source files, excluding test files

**packages:**

- All packages: Entry via `src/index.ts`, project patterns excluding tests
- Special handling for `packages/database` (includes drizzle schema)
- Special ignores for `packages/contracts` (rrule) and `packages/database`
  (drizzle-kit)

**Plugins:**

- `next` - Next.js framework support
- `expo` - Expo framework support
- `hono` - Hono framework support
- `vitest` - Vitest test framework support
- `typescript` - TypeScript configuration parsing

## Rollout Strategy

### Phase 1: Installation & Initial Validation (Week 1)

**Steps:**

1. Install Knip as dev dependency:

   ```bash
   pnpm add -D -w knip
   ```

2. Add scripts to root package.json:

   ```json
   {
     "scripts": {
       "knip": "knip",
       "knip:production": "knip --production",
       "knip:fix": "knip --fix",
       "knip:strict": "knip --treat-config-hints-as-errors"
     }
   }
   ```

3. Run initial analysis (no-exit-code for validation):

   ```bash
   pnpm knip --no-exit-code
   ```

4. Review output and address configuration hints first

5. Iteratively refine configuration based on findings

### Phase 2: Local Development Integration (Week 2)

**Steps:**

1. Add to pre-commit hooks (lefthook.yml):

   ```yaml
   pre-commit:
     parallel: false
     commands:
       knip:
         run: pnpm knip --no-exit-code --reporter compact
   ```

2. Team education:
   - Document Knip usage in developer onboarding
   - Explain configuration and common issues
   - Provide troubleshooting guide

3. Address false positives:
   - Add legitimate entry points to configuration
   - Use `ignore` sparingly for specific exceptions
   - Document reasons for each ignore

### Phase 3: CI/CD Integration (Week 3)

**Steps:**

1. Add to CI workflow (github/workflows/ci.yml):

   ```yaml
   - name: Run Knip
     run: pnpm knip --cache --reporter github
   ```

2. Initially run with `--no-exit-code` to gather data without blocking

3. Monitor results for 1-2 weeks

4. Remove `--no-exit-code` to enforce in CI

5. Add to validate pipeline:
   ```json
   {
     "scripts": {
       "validate": "turbo run validate && pnpm knip"
     }
   }
   ```

### Phase 4: Production Mode Enforcement (Week 4)

**Steps:**

1. Add production mode check to CI:

   ```yaml
   - name: Run Knip (Production)
     run: pnpm knip:production --cache --reporter github
   ```

2. Address production-specific unused code

3. Consider separate workflow for dependency-only checks:
   ```bash
   pnpm knip --dependencies --cache
   ```

### Phase 5: Optimization & Maintenance (Ongoing)

**Steps:**

1. Monitor performance with `--performance` flag
2. Adjust workspace filters for large PRs
3. Keep configuration updated as codebase evolves
4. Regularly review and clean ignore lists
5. Stay updated with Knip releases

## CI/CD Integration Details

### GitHub Actions Workflow

```yaml
name: Knip Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  knip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Knip (Default)
        run: pnpm knip --cache --reporter github

      - name: Run Knip (Production)
        run: pnpm knip:production --cache --reporter github
```

### Performance Optimization for CI

**For large monorepos:**

```yaml
- name: Run Knip (Changed Packages Only)
  run: |
    CHANGED_PACKAGES=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -E "^(apps|packages)/" | cut -d'/' -f1-2 | sort -u | tr '\n' ',')
    if [ -n "$CHANGED_PACKAGES" ]; then
      pnpm knip --workspace $CHANGED_PACKAGES --cache --reporter github
    else
      echo "No packages changed, skipping Knip"
    fi
```

**Cache configuration:**

```yaml
- name: Cache Knip
  uses: actions/cache@v4
  with:
    path: node_modules/.cache/knip
    key: ${{ runner.os }}-knip-${{ hashFiles('**/knip.json') }}
    restore-keys: |
      ${{ runner.os }}-knip-
```

## Troubleshooting Guide

### Common Issues & Solutions

**Issue: Too many false positives for unused files**

- Cause: Missing entry points or incorrect project patterns
- Solution: Add missing entry files to `entry` patterns, refine `project`
  patterns
- Debug: Run `knip --debug` to see resolved entry files

**Issue: Unresolved imports for path aliases**

- Cause: Knip not picking up tsconfig paths
- Solution: Use `--tsConfig` flag or add `paths` to Knip config
- For cross-workspace: Use `workspace:*` dependencies instead

**Issue: Configuration hints not resolving**

- Cause: Entry files or plugins not configured correctly
- Solution: Address hints first, they indicate configuration gaps
- Don't ignore hints - they lead to false positives

**Issue: Slow performance**

- Cause: Too many files in analysis, expensive plugins
- Solution: Use production mode, disable unused plugins, use workspace filters
- Debug: Run `knip --performance` to identify bottlenecks

**Issue: Test files reported as unused**

- Cause: Not using production mode
- Solution: Use `--production` flag or don't exclude tests (they may be unused)
- For test utilities: Add `!` suffix to production patterns

**Issue: Workspace dependencies reported as unused**

- Cause: Running from workspace directory (not supported)
- Solution: Always run from monorepo root with `--workspace` flag

## Maintenance Guidelines

### Regular Tasks

**Weekly:**

- Review Knip output in CI for new issues
- Address configuration hints promptly
- Clean up ignore lists (remove unused entries)

**Monthly:**

- Update Knip to latest version
- Review and optimize configuration
- Check performance metrics

**Quarterly:**

- Audit ignore lists for stale entries
- Review entry point patterns for accuracy
- Evaluate plugin usage and disable unused ones

### Configuration Drift Prevention

**Use `--treat-config-hints-as-errors` in CI** to prevent configuration decay

**Keep ignore lists documented** with comments explaining each entry

**Regularly run `knip --strict`** to catch configuration issues early

**Version control knip.json** and review changes in PRs

## Success Metrics

**Adoption Metrics:**

- Number of unused files removed
- Number of unused dependencies removed
- Reduction in bundle size (for web/mobile)
- CI runtime impact (target: <2 minutes)

**Quality Metrics:**

- Reduction in technical debt
- Fewer dependency-related bugs
- Improved codebase hygiene
- Team satisfaction with tooling

**Performance Metrics:**

- Cold run time: <2 minutes
- Warm run time (with cache): <30 seconds
- CI pipeline impact: <10% increase

## Conclusion

Knip is the optimal choice for the Life OS monorepo due to its:

- First-class TypeScript and monorepo support
- Comprehensive analysis (files, exports, dependencies)
- Framework-specific plugins for Next.js, Expo, Hono
- Active maintenance and community adoption (8.6M weekly downloads)
- Superior health score (92/100) compared to alternatives

The provided configuration and rollout strategy ensure gradual, safe adoption
with minimal disruption to development workflow. The phased approach allows the
team to validate configuration, address false positives, and integrate Knip into
both local development and CI/CD pipelines systematically.

## References

- [Knip Documentation](https://knip.dev)
- [Knip vs depcheck Comparison](https://www.pkgpulse.com/guides/knip-vs-depcheck-2026)
- [Monorepos & Workspaces](https://knip.dev/features/monorepos-and-workspaces)
- [Entry Files](https://knip.dev/explanations/entry-files)
- [Configuration Guide](https://knip.dev/reference/configuration)
- [Using Knip in CI](https://knip.dev/guides/using-knip-in-ci)
- [Performance Guide](https://knip.dev/guides/performance)
- [Handling Issues](https://knip.dev/guides/handling-issues)
