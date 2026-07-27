# Syncpack Implementation Guide for Life OS Monorepo

## Executive Summary

This guide provides a comprehensive implementation of Syncpack for dependency
version consistency in the Life OS pnpm monorepo. Syncpack v15.3.2 (July 2026)
offers full support for pnpm catalogs, workspace protocols, and advanced version
management patterns.

## Current Repository State

### pnpm-workspace.yaml Configuration

- **catalogMode**: `strict` - Only allows dependency versions from the catalog
- **Catalog**: 27 shared dependencies defined in default catalog
- **Workspace Protocol**: `linkWorkspacePackages: false` enforces workspace:
  protocol usage
- **Supply Chain Security**: `minimumReleaseAge: 1440` (1 day)

### Dependency Analysis

- **12 packages**: 4 apps (api, mobile, web, worker) + 6 packages (api-client,
  contracts, database, mobile-data, tsconfig, ui, vitest-config)
- **Internal dependencies**: All use `workspace:*` protocol correctly
- **External dependencies**: Mix of catalog: protocol and direct version
  specifiers
- **Platform-specific**: React Native, Expo, PowerSync have legitimate version
  differences

## Syncpack Fundamentals & Architecture

### What is Syncpack?

Syncpack is a dependency version consistency tool for JavaScript monorepos that:

- Finds and fixes version mismatches across package.json files
- Enforces single version policies with customizable partitions
- Updates outdated versions from npm registry
- Supports pnpm catalogs and workspace protocols
- Provides supply chain security via minimumReleaseAge
- Used by AWS, Microsoft, Vercel, Cloudflare, DataDog, and others

### Architecture

- **Core**: Rust-based (65.8%) for performance, TypeScript (16.3%) for
  configuration
- **Package Manager Detection**: Auto-detects pnpm, npm, yarn, bun from
  workspace config
- **Version Groups**: Isolated sections with independent version policies
- **Semver Groups**: Per-dependency semver range enforcement
- **Update Groups**: Per-dependency registry update control
- **Catalog Support**: First-class citizen for pnpm/bun catalogs (v15.0.0+)

### How Syncpack Enforces Consistency

1. **Discovery**: Reads workspace config (pnpm-workspace.yaml, package.json
   workspaces, lerna.json)
2. **Group Assignment**: Walks through versionGroups array, first match wins
3. **Policy Application**: Applies group-specific rules (highest, pinned,
   catalog, etc.)
4. **Validation**: Checks against semver groups and dependency types
5. **Fixing**: Updates package.json files to match configured policies

## Syncpack vs Manual Version Management

### Manual Management Challenges

- **Drift**: Versions diverge over time across packages
- **Inconsistency**: Different semver ranges for same dependency
- **Human Error**: Manual updates miss some packages
- **No Enforcement**: CI doesn't catch version mismatches
- **Catalog Breakage**: Direct versions bypass catalog in strict mode

### Syncpack Advantages

- **Automated Detection**: Finds all mismatches instantly
- **Policy Enforcement**: Configurable rules prevent drift
- **CI Integration**: Blocks merges on violations
- **Catalog Awareness**: Respects catalogMode strict
- **Workspace Protocol**: Enforces workspace:* for local packages
- **Supply Chain Security**: minimumReleaseAge integration

## Syncpack pnpm Workspace Protocol Support

### workspace:* Protocol Enforcement

Syncpack natively supports the `$LOCAL` dependency pattern to enforce
workspace:* protocol:

```json
{
  "versionGroups": [
    {
      "label": "Use workspace:* protocol for local packages",
      "dependencies": ["$LOCAL"],
      "dependencyTypes": ["dev", "prod"],
      "pinVersion": "workspace:*"
    }
  ]
}
```

### catalog: Protocol Support (v15.0.0+)

Syncpack 15.0.0 added full catalog support:

- **Catalog Version Group**: Enforces catalog protocol usage
- **Auto-migration**: Moves dependencies to catalog automatically
- **Catalog Updates**: `syncpack update --dependency-types pnpmCatalog`
- **Named Catalogs**: Support for multiple catalogs via `pnpmCatalog:{name}`

### Dependency Types

Syncpack auto-detects catalog dependency types:

- `pnpmCatalog`: Default catalog entries
- `pnpmCatalog:{name}`: Named catalog entries
- `prod`, `dev`, `peer`, `optional`: Standard npm types
- Custom types via `customTypes` configuration

## Proper Implementation for Monorepos

### Configuration for workspace:* Protocol

The Life OS configuration enforces workspace:* for all internal packages:

```json
{
  "versionGroups": [
    {
      "label": "Enforce workspace:* protocol for local packages",
      "dependencies": ["$LOCAL"],
      "dependencyTypes": ["dev", "prod"],
      "pinVersion": "workspace:*"
    }
  ]
}
```

### Version Consistency Rules

Given the strict catalogMode, the configuration:

- **Production deps**: Must use catalog: protocol (error if not)
- **Development deps**: Should use catalog: protocol (warn if not)
- **Peer deps**: Exempt from catalog enforcement (broad ranges needed)
- **Platform-specific**: Exempt (legitimate version differences)

### devDependencies vs dependencies Separation

Syncpack handles this via dependencyTypes filtering:

- **prod**: Production dependencies (dependencies)
- **dev**: Development dependencies (devDependencies)
- **peer**: Peer dependencies (peerDependencies)
- **optional**: Optional dependencies (optionalDependencies)

### Integration with pnpm Catalog and strict catalogMode

The configuration respects strict catalogMode:

- **Catalog Policy**: Enforces catalog: protocol for production deps
- **Severity Levels**: Error for production, warn for development
- **Exemptions**: Platform-specific, testing, and build tooling exempt
- **Auto-migration**: Can auto-move deps to catalog (not enabled by default)

## Advanced Coding Patterns

### Custom Version Grouping Strategies

The Life OS configuration uses multiple version groups:

1. **Local packages**: workspace:* enforcement
2. **Production catalog**: Mandatory catalog protocol
3. **Development catalog**: Optional catalog protocol
4. **Peer dependencies**: Exempt from catalog
5. **Platform-specific**: Exempt (React Native, Expo, PowerSync)
6. **UI framework**: Exempt (Tamagui)
7. **Testing libraries**: Exempt
8. **Supabase clients**: Exempt
9. **Build tooling**: Exempt
10. **Type definitions**: Exempt

### Handling peerDependencies and optionalDependencies

**Peer Dependencies**:

- Exempt from catalog enforcement (broad ranges needed for compatibility)
- Use caret ranges in semver groups
- Never auto-update via updateGroups

**Optional Dependencies**:

- Custom type defined in configuration
- Can be grouped separately from prod/dev deps
- Support for different semver ranges

### Integration with CI for Automated Version Checks

**GitHub Actions Workflow**:

```yaml
name: Syncpack Check

on:
  pull_request:
    branches: [main]

jobs:
  syncpack:
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
      - run: pnpm install --frozen-lockfile
      - run: pnpm syncpack lint
```

**Pre-commit Hook** (lefthook.yml):

```yaml
pre-commit:
  parallel: false
  commands:
    syncpack:
      run: pnpm syncpack fix && git add package.json pnpm-workspace.yaml
```

### Combining Syncpack with Renovate for Coordinated Updates

**Renovate Configuration** (renovate.json5):

```json5
{
  extends: ['config:base'],
  packageRules: [
    {
      matchDepTypes: ['dependencies'],
      matchUpdateTypes: ['patch'],
      automerge: true,
    },
    {
      matchDepTypes: ['devDependencies'],
      matchUpdateTypes: ['minor', 'patch'],
      automerge: true,
    },
    {
      matchFileNames: ['pnpm-workspace.yaml'],
      automerge: false,
    },
  ],
  postUpdateOptions: ['syncpack'],
}
```

**Coordinated Workflow**:

1. Renovate opens PR with dependency updates
2. Syncpack lint runs in CI to check consistency
3. If violations found, Syncpack fix auto-corrects
4. Developer reviews and merges
5. Syncpack update can bump catalog entries separately

## Anti-Patterns

### Over-Constraining Versions When Legitimate Differences Exist

**Anti-Pattern**: Forcing all packages to use exact same version

```json
// BAD - Forces all React Native packages to same version
{
  "versionGroups": [
    {
      "dependencies": ["react-native"],
      "policy": "highest"
    }
  ]
}
```

**Correct Approach**: Exempt platform-specific dependencies

```json
// GOOD - Allows legitimate version differences
{
  "versionGroups": [
    {
      "dependencies": ["react-native"],
      "isIgnored": true
    }
  ]
}
```

### Not Considering peerDependency Version Ranges

**Anti-Pattern**: Treating peer deps same as prod deps

```json
// BAD - Peer deps need broad ranges
{
  "versionGroups": [
    {
      "dependencyTypes": ["prod", "peer"],
      "policy": "catalog"
    }
  ]
}
```

**Correct Approach**: Separate peer deps with different rules

```json
// GOOD - Peer deps exempt from catalog, use broad ranges
{
  "versionGroups": [
    {
      "dependencyTypes": ["prod"],
      "policy": "catalog"
    },
    {
      "dependencyTypes": ["peer"],
      "isIgnored": true
    }
  ]
}
```

### Breaking Workspace Protocol with Absolute Versions

**Anti-Pattern**: Using absolute versions for local packages

```json
// BAD - Breaks workspace protocol
{
  "dependencies": {
    "@life-os/contracts": "0.0.1"
  }
}
```

**Correct Approach**: Enforce workspace:* protocol

```json
// GOOD - Uses workspace protocol
{
  "versionGroups": [
    {
      "dependencies": ["$LOCAL"],
      "pinVersion": "workspace:*"
    }
  ]
}
```

### Running Syncpack Without Understanding catalogMode Impact

**Anti-Pattern**: Enforcing catalog policy without understanding strict mode

```json
// BAD - Will fail in strict catalogMode
{
  "versionGroups": [
    {
      "dependencyTypes": ["prod"],
      "policy": "catalog"
    }
  ]
}
```

**Correct Approach**: Configure severity levels and exemptions

```json
// GOOD - Warns for dev deps, errors for prod deps, with exemptions
{
  "versionGroups": [
    {
      "dependencyTypes": ["prod"],
      "policy": "catalog",
      "severity": {
        "NotUsingCatalog": "error",
        "MissingFromCatalog": "warn"
      }
    },
    {
      "dependencies": ["platform-specific-dep"],
      "isIgnored": true
    }
  ]
}
```

## Repository-Specific Assessment

### Current pnpm-workspace.yaml Catalog Configuration

**Strengths**:

- Well-organized catalog with 27 shared dependencies
- Strict catalogMode prevents uncontrolled version drift
- minimumReleaseAge for supply chain security
- linkWorkspacePackages: false enforces workspace protocol

**Areas for Improvement**:

- Some packages use direct versions instead of catalog:
  - `@supabase/supabase-js`: ^2.45.0 (apps/api, apps/mobile)
  - `@supabase/ssr`: ^0.5.0 (apps/web)
  - `@tanstack/react-query`: ^5.0.0 (apps/mobile, apps/web, packages/api-client)
  - `typescript`: ^5.9.0 (multiple packages)
  - `@types/node`: ^22.0.0, ^24 (inconsistent)

### Dependency Version Analysis

**Consistent Dependencies** (using catalog:):

- react, react-dom
- hono, drizzle-orm
- eslint, prettier
- vite, vitest
- zod, rrule
- @dnd-kit/*, lucide-react
- tailwindcss, postcss, autoprefixer

**Inconsistent Dependencies** (direct versions):

- TypeScript: ^5.9.0 in multiple packages (should be catalog:)
- @types/node: ^22.0.0 and ^24 (should be catalog: and consistent)
- @tanstack/react-query: ^5.0.0 (should be catalog:)
- @supabase/*: Various versions (legitimate exemption)
- Platform-specific: React Native, Expo (legitimate exemption)

### Strict catalogMode Implications

**Impact**:

- pnpm add will fail if dependency not in catalog
- Manual catalog updates required for new dependencies
- Syncpack catalog policy aligns with pnpm strict mode
- Need clear process for catalog updates

**Recommendation**:

- Keep strict catalogMode for production stability
- Use Syncpack to enforce catalog protocol
- Establish catalog update process via Syncpack
- Exempt platform-specific and testing dependencies

### Renovate Integration Impact

**Current State**: renovate.json5 exists

**Integration Strategy**:

- Renovate handles upstream updates
- Syncpack ensures consistency across packages
- Syncpack update can bump catalog entries
- Post-update Syncpack fix auto-corrects drift
- CI blocks merges on Syncpack violations

### Version Exceptions Needed

**Legitimate Exemptions**:

1. **Platform-specific**: React Native, Expo, PowerSync
2. **UI Framework**: Tamagui (version tied to React Native)
3. **Testing Libraries**: @testing-library/* (may need different versions)
4. **Supabase Clients**: @supabase/supabase-js, @supabase/ssr
   (platform-specific)
5. **Build Tooling**: drizzle-kit, tsx, jsdom (dev-only)
6. **Type Definitions**: @types/* (auto-generated, version-specific)

**Current Configuration**: All exemptions defined in .syncpackrc.json

## Additional Research

### Syncpack vs manypkg vs Other Tools (2026)

#### Syncpack (v15.3.2)

**Strengths**:

- Full pnpm catalog support (v15.0.0+)
- Rust-based for performance
- Advanced version groups and policies
- Supply chain security (minimumReleaseAge)
- CI-ready with lint/fix commands
- Used by major companies (AWS, Microsoft, Vercel)

**Weaknesses**:

- More complex configuration
- Steeper learning curve
- Schema validation requires installation

#### manypkg (v0.25.1)

**Strengths**:

- Simpler configuration
- Focus on workspace shape linting
- Built-in upgrade command
- TypeScript-based

**Weaknesses**:

- No catalog support
- Less granular control
- Fewer advanced features
- Lower adoption (1K stars vs 2K)

#### Other Tools

- **npm-check-updates**: Focuses on latest versions, not consistency
- **npm-check**: Interactive audit, not CI-ready
- **lerna**: Older, less active development

**Recommendation**: Syncpack is the best choice for Life OS due to catalog
support and advanced features.

### Best Practices for Syncpack in pnpm Monorepos with catalogMode

1. **Start Simple**: Begin with prod dependencies, expand gradually
2. **Use Version Groups**: Create partitions for different policies
3. **Respect catalogMode**: Align Syncpack with pnpm strict mode
4. **Exempt Appropriately**: Don't over-constrain legitimate differences
5. **CI Integration**: Block merges on violations
6. **Pre-commit Hooks**: Auto-fix before commits
7. **Renovate Coordination**: Use Renovate for updates, Syncpack for consistency
8. **Supply Chain Security**: Leverage minimumReleaseAge
9. **Workspace Protocol**: Enforce workspace:* for local packages
10. **Documentation**: Document exceptions and policies

### Integration Strategies with Automated Dependency Updaters

#### Renovate + Syncpack

**Workflow**:

1. Renovate detects upstream updates
2. Opens PR with version changes
3. Syncpack lint runs in CI
4. If violations, Syncpack fix auto-corrects
5. Developer reviews and merges
6. Syncpack update bumps catalog separately

**Configuration**:

- Renovate: Handle upstream updates
- Syncpack: Ensure consistency
- Post-update option: Run Syncpack fix

#### Dependabot + Syncpack

**Limitation**: Dependabot has limited post-update options **Workaround**: Use
GitHub Actions to run Syncpack after Dependabot PRs

#### Manual Updates + Syncpack

**Workflow**:

1. Developer runs `syncpack update --interactive`
2. Selects updates to apply
3. Syncpack updates package.json files
4. Syncpack fix ensures consistency
5. Developer commits and pushes

### Syncpack Performance Characteristics

**Performance**:

- Rust-based core for speed
- Registry response caching (30 minutes default)
- Efficient file discovery via workspace config
- Suitable for large monorepos (100+ packages)

**Optimizations**:

- Use `--source` to limit scope
- Leverage caching for repeated runs
- Run in CI with cached dependencies
- Use `--dry-run` for preview

**Large Workspace Considerations**:

- Life OS (12 packages): Well within performance limits
- No special optimizations needed
- Can run on every PR without significant slowdown

## Comprehensive Syncpack Configuration

### .syncpackrc.json

The provided configuration includes:

**Version Groups**:

1. Workspace:* enforcement for local packages
2. Catalog policy for production dependencies (error)
3. Catalog policy for development dependencies (warn)
4. Peer dependencies exemption
5. Platform-specific exemptions
6. UI framework exemptions
7. Testing library exemptions
8. Supabase client exemptions
9. Build tooling exemptions
10. Type definition exemptions

**Semver Groups**:

1. Catalog entries: exact versions
2. Production dependencies: caret ranges
3. Development dependencies: caret ranges
4. Peer dependencies: caret ranges

**Update Groups**:

1. Production dependencies: patch only
2. Development dependencies: minor updates
3. Catalog entries: patch only
4. Peer dependencies: never auto-update
5. Platform-specific: minor updates
6. Tamagui: minor updates

**Custom Types**:

- optional: optionalDependencies support

**Settings**:

- dependencyTypes: prod, dev, peer, optional, pnpmCatalog
- minimumReleaseAge: 1440 (1 day, matches pnpm config)

### Installation

Add to root package.json devDependencies:

```json
{
  "devDependencies": {
    "syncpack": "^15.3.2"
  }
}
```

Install:

```bash
pnpm add -D syncpack
```

### npm Scripts

Add to root package.json scripts:

```json
{
  "scripts": {
    "syncpack": "syncpack",
    "syncpack:lint": "syncpack lint",
    "syncpack:fix": "syncpack fix",
    "syncpack:format": "syncpack format",
    "syncpack:update": "syncpack update",
    "syncpack:update:catalog": "syncpack update --dependency-types pnpmCatalog",
    "syncpack:check": "syncpack lint && syncpack format --check"
  }
}
```

### CI/CD Integration

**GitHub Actions** (.github/workflows/syncpack.yml):

```yaml
name: Syncpack

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  syncpack:
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
      - run: pnpm install --frozen-lockfile
      - run: pnpm syncpack:lint
      - run: pnpm syncpack:format --check
```

**Lefthook Integration** (lefthook.yml):

```yaml
pre-commit:
  parallel: false
  commands:
    syncpack:
      run: pnpm syncpack:fix && pnpm syncpack:format
      stage_fixed: true
```

### Usage Examples

**Check for inconsistencies**:

```bash
pnpm syncpack:lint
```

**Fix inconsistencies**:

```bash
pnpm syncpack:fix
```

**Update catalog entries**:

```bash
pnpm syncpack:update:catalog
```

**Interactive update**:

```bash
pnpm syncpack update --interactive
```

**Check specific dependencies**:

```bash
pnpm syncpack lint --dependencies react
```

**Dry run preview**:

```bash
pnpm syncpack fix --dry-run
```

## Migration Strategy

### Phase 1: Installation and Basic Setup

1. Install Syncpack: `pnpm add -D syncpack`
2. Add .syncpackrc.json configuration
3. Add npm scripts
4. Run initial lint: `pnpm syncpack:lint`

### Phase 2: Address Current Issues

1. Fix TypeScript version inconsistency
2. Move @types/* to catalog or exempt properly
3. Review and adjust exemptions as needed
4. Run fix: `pnpm syncpack:fix`

### Phase 3: CI Integration

1. Add GitHub Actions workflow
2. Configure Lefthook pre-commit hook
3. Test on PRs
4. Enable blocking on violations

### Phase 4: Catalog Migration

1. Evaluate which deps should be in catalog
2. Use Syncpack catalog policy to enforce
3. Auto-migrate where appropriate
4. Update pnpm-workspace.yaml

### Phase 5: Renovate Integration

1. Configure Renovate post-update options
2. Test coordinated workflow
3. Document update process
4. Monitor and adjust

## Maintenance

### Regular Tasks

- **Weekly**: Run `pnpm syncpack:update:catalog` to check for catalog updates
- **Monthly**: Review and update exemptions
- **Quarterly**: Review update group targets
- **As Needed**: Adjust version groups for new dependencies

### Monitoring

- Watch CI for Syncpack violations
- Review catalog update PRs
- Monitor dependency security advisories
- Track Syncpack releases for new features

### Troubleshooting

**Schema Warning**: Ignore until Syncpack is installed **Catalog Violations**:
Add to catalog or exempt appropriately **Peer Dep Mismatches**: Ensure peer deps
are exempt or use sameRange policy **Performance Issues**: Use --source to limit
scope or check caching

## Conclusion

Syncpack v15.3.2 provides comprehensive dependency version consistency for the
Life OS monorepo. The configuration respects pnpm's strict catalogMode while
allowing legitimate version differences for platform-specific dependencies.
Integration with CI/CD and Renovate creates a robust dependency management
workflow that prevents version drift while enabling automated updates.

The key to success is:

1. Start with prod dependencies
2. Expand gradually to dev dependencies
3. Respect legitimate version differences
4. Integrate with CI for enforcement
5. Coordinate with Renovate for updates
6. Monitor and adjust over time
