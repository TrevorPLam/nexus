# Renovate Dependency Management Research (July 2026)

## Executive Summary

This document provides comprehensive research on Renovate for pnpm monorepos,
tailored to the Life OS monorepo configuration. Based on current best practices
and 2026 developments, Renovate is recommended over Dependabot for this
repository due to its superior monorepo support, pnpm catalog integration, and
advanced configuration capabilities.

## Table of Contents

1. [Basics & Fundamentals](#basics--fundamentals)
2. [Proper Implementation for Monorepos](#proper-implementation-for-monorepos)
3. [Advanced Coding Patterns](#advanced-coding-patterns)
4. [Anti-Patterns](#anti-patterns)
5. [Repository-Specific Assessment](#repository-specific-assessment)
6. [Additional Research](#additional-research)
7. [Configuration Reference](#configuration-reference)

---

## Basics & Fundamentals

### Renovate Bot Architecture

Renovate is a highly configurable automated dependency update tool that:

- **Runs as**: GitHub App, self-hosted bot, or GitHub Action
- **Supports**: 60+ package managers and datasources
- **Platforms**: GitHub, GitLab, Bitbucket, Azure DevOps, Gitea
- **Configuration**: JSON5/JSONC files with composable presets
- **Architecture**: Scan-and-policy engine with workspace-aware dependency
  detection

**Key Components:**

1. **Managers**: Language-specific extractors (npm, dockerfile, github-actions,
   etc.)
2. **Datasources**: Version registries (npm, Docker Hub, GitHub, etc.)
3. **Presets**: Shareable configuration templates
4. **Package Rules**: Granular policy application by match criteria
5. **Dependency Dashboard**: Central issue for triaging updates

### Renovate vs Dependabot for Monorepos (2026)

| Feature                  | Renovate                                                              | Dependabot                                                          |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Monorepo Support**     | Native workspace detection (npm/pnpm/yarn, Lerna, Nx)                 | Per-directory configuration; `directories` array reduces repetition |
| **Grouping**             | `packageRules` with regex, paths, dep types, update types             | Simple `groups` key with pattern matching only                      |
| **Scheduling**           | Cron-like or human-readable strings, timezone-aware, multiple windows | `interval` (daily/weekly/monthly) + optional day/time               |
| **Ecosystem Coverage**   | 60+ package managers/datasources                                      | ~15-20 major ecosystems                                             |
| **Platforms**            | GitHub, GitLab, Bitbucket, Azure DevOps, Gitea                        | GitHub only                                                         |
| **Automerge**            | First-class Renovate policy with platform integration                 | Requires GitHub Actions + branch protection                         |
| **Security Updates**     | `vulnerabilityAlerts` with override capabilities                      | Native GitHub Advisory Database integration                         |
| **Dependency Dashboard** | Yes (central triage view)                                             | No                                                                  |
| **Config File**          | `renovate.json5`, shareable presets via `extends`                     | `.github/dependabot.yml`, single file                               |

**Key Differences for Monorepos:**

- **Renovate**: Automatically detects workspace structure, excludes internal
  packages, updates catalog entries once instead of per-package
- **Dependabot**: Requires explicit entry per ecosystem/directory; does not
  understand workspace protocol links

**Recommendation**: For the Life OS monorepo with pnpm workspaces, strict
catalog mode, and complex grouping needs, **Renovate is the superior choice**.

### Deployment Options

#### GitHub App (Recommended for Most Teams)

- **Pros**: Zero infrastructure, automatic updates, Mend Cloud managed
- **Cons**: Less control over runtime, network restrictions
- **Best for**: Teams wanting low operational burden

#### Self-Hosted

- **Pros**: Full control over runtime, network, registries; private
  infrastructure support
- **Cons**: Operational overhead, maintenance responsibility
- **Best for**: Organizations with strict security/compliance requirements

#### GitHub Action

- **Pros**: Free, runs in your infrastructure, familiar workflow
- **Cons**: Manual triggering, no continuous monitoring
- **Best for**: Small teams or supplemental usage

**Recommendation**: Start with GitHub App, migrate to self-hosted if compliance
requirements demand it.

---

## Proper Implementation for Monorepos

### Configuring Renovate for pnpm Workspace Protocol

Renovate has native support for pnpm workspaces with no additional configuration
required:

```json5
{
  // Renovate automatically detects:
  // - pnpm-workspace.yaml files
  // - Workspace structure via package filters
  // - Internal packages (excludes from updates)
  // - workspace: protocol usage
}
```

**Key Behaviors:**

1. **Workspace Detection**: Renovate parses `pnpm-workspace.yaml` and identifies
   workspace packages
2. **Internal Package Exclusion**: Packages matching workspace patterns are
   never updated
3. **Lockfile Coordination**: Single `pnpm-lock.yaml` update per workspace
4. **Catalog Support**: Updates catalog entries in `pnpm-workspace.yaml` (added
   in v39.138.0)

### Grouping Related Packages for Coordinated Updates

**Monorepo Grouping Strategy:**

```json5
{
  packageRules: [
    {
      // Group all packages from known monorepos
      extends: ['group:monorepos'],
      // This groups @angular/*, @nestjs/*, etc. together
    },
    {
      // Group related ecosystem packages
      matchPackageNames: ['/^@dnd-kit//'],
      groupName: 'dnd-kit monorepo',
    },
  ],
}
```

**For Life OS specifically:**

- **React ecosystem**: Group `react`, `react-dom`, `@dnd-kit/*` together
- **TypeScript ecosystem**: Group `typescript`, `@types/*`, `eslint`,
  `@eslint/*` together
- **Testing**: Group `vitest`, `@vitest/*`, `@testing-library/*` together
- **Build tools**: Group `turbo`, `vite`, `@vitejs/*`, `tsx` together

### Setting Appropriate Minimum Release Ages

**Security-First Approach:**

```json5
{
  // Global minimum age (respects pnpm's 1440 minute setting)
  minimumReleaseAge: '1 day',

  packageRules: [
    {
      // Dev dependencies: longer window (14 days)
      matchDepTypes: ['devDependencies'],
      minimumReleaseAge: '14 days',
    },
    {
      // Patch updates: shorter window (7 days)
      matchUpdateTypes: ['patch'],
      minimumReleaseAge: '7 days',
    },
    {
      // Security updates: bypass age requirement
      vulnerabilityAlerts: {
        minimumReleaseAge: '0 days',
      },
    },
  ],
}
```

**Rationale:**

- **1 day global**: Respects pnpm's existing `minimumReleaseAge: 1440` setting
- **14 days for dev deps**: Catches malicious packages before automerge
- **7 days for patches**: Balance between security and currency
- **0 days for security**: Known CVE > unknown aging risk

### Handling Major Version Updates and Breaking Changes

**Dashboard Approval Pattern:**

```json5
{
  packageRules: [
    {
      description: 'Require dashboard approval for major updates',
      matchUpdateTypes: ['major'],
      dependencyDashboardApproval: true,
      automerge: false,
      reviewers: ['team:platform'],
      labels: ['dependencies', 'major-version', 'review-required'],
    },
  ],
}
```

**Benefits:**

- Major updates require explicit approval from Dependency Dashboard
- Prevents automatic PR creation for breaking changes
- Allows planning for code changes required by major bumps
- Reduces PR fatigue from unwanted major updates

**Alternative for Specific Packages:**

```json5
{
  packageRules: [
    {
      // Ignore TypeScript major updates (handle manually)
      matchPackageNames: ['typescript'],
      matchUpdateTypes: ['major'],
      enabled: false,
    },
  ],
}
```

---

## Advanced Coding Patterns

### Custom Automerge Rules for Different Dependency Types

**Tiered Automerge Strategy:**

```json5
{
  packageRules: [
    // Tier 1: Lowest risk - automerge immediately
    {
      description: 'Automerge linting/formatting tools',
      matchPackageNames: ['prettier', 'lefthook'],
      matchUpdateTypes: ['patch', 'minor'],
      automerge: true,
      automergeType: 'branch',
      platformAutomerge: false,
      minimumReleaseAge: '7 days',
    },

    // Tier 2: Low risk - automerge with longer age
    {
      description: 'Automerge dev dependencies (non-major)',
      matchDepTypes: ['devDependencies'],
      matchUpdateTypes: ['patch', 'minor'],
      automerge: true,
      minimumReleaseAge: '14 days',
    },

    // Tier 3: Medium risk - no automerge, require review
    {
      description: 'Framework updates require review',
      matchPackageNames: ['react', 'react-dom'],
      automerge: false,
      reviewers: ['team:platform'],
    },

    // Tier 4: High risk - never automerge
    {
      description: 'Major updates never automerge',
      matchUpdateTypes: ['major'],
      automerge: false,
      dependencyDashboardApproval: true,
    },
  ],
}
```

**Automerge Strategy Options:**

- `branch`: Create branch, no PR, push directly if tests pass
- `pr`: Create PR, use platform automerge if tests pass
- `auto`: Let Renovate decide (default)

**Platform Automerge Consideration:**

```json5
{
  // When platformAutomerge: true, automergeSchedule is ignored
  // Set to false if schedule compliance is critical
  platformAutomerge: false,
}
```

### Schedule Configuration for Update Timing

**Off-Hours Scheduling:**

```json5
{
  timezone: 'America/Chicago',
  schedule: ['after 9pm and before 6am every weekday', 'every weekend'],
}
```

**Per-Group Scheduling:**

```json5
{
  packageRules: [
    {
      // Lockfile maintenance: weekly early morning
      lockFileMaintenance: {
        schedule: ['before 5am on monday'],
      },
    },
    {
      // ESLint updates: monthly
      matchPackageNames: ['/eslint/'],
      schedule: ['* * 1 * *'], // First day of month
    },
    {
      // Security updates: bypass schedule
      vulnerabilityAlerts: {
        schedule: ['at any time'],
      },
    },
  ],
}
```

**Schedule Syntax:**

- Human-readable: `"after 9pm and before 6am every weekday"`
- Cron: `"* * 1 * *"` (first day of month)
- Timezone-aware: Respects configured `timezone`

### Labeling and PR Organization Strategies

**Category-Based Labels:**

```json5
{
  labels: ['dependencies', 'automated'],

  packageRules: [
    {
      matchDepTypes: ['devDependencies'],
      labels: ['dependencies', 'dev'],
    },
    {
      matchUpdateTypes: ['major'],
      labels: ['dependencies', 'major-version'],
    },
    {
      vulnerabilityAlerts: {
        labels: ['security', 'vulnerability'],
      },
    },
  ],
}
```

**Dependency Dashboard Categories:**

```json5
{
  packageRules: [
    {
      matchCategories: ["cd", "ci"],
      dependencyDashboardCategory: ":hammer_and_wrench: CI/CD",
    },
    {
      matchDepTypes: ["devDependencies"],
      dependencyDashboardCategory": ":wrench: Development Dependencies",
    },
  ],
}
```

**Branch Prefixing for Monorepo Teams:**

```json5
{
  packageRules: [
    {
      description: 'Split updates by app directory',
      matchFileNames: ['apps/**'],
      additionalBranchPrefix: '{{packageFileDir}}-',
      commitMessageSuffix: ' ({{packageFileDir}})',
    },
  ],
}
```

### Integration with pnpm Catalog and Strict CatalogMode

**Catalog-Specific Rules:**

```json5
{
  packageRules: [
    {
      // Group catalog updates together
      matchDepTypes: ['pnpm.catalog'],
      groupName: 'pnpm catalog dependencies',
      groupSlug: 'pnpm-catalog',
      // Catalog updates affect entire monorepo
      automerge: false,
      reviewers: ['team:platform'],
    },
  ],
}
```

**Renovate's Catalog Support (v39.138.0+):**

- Automatically extracts dependencies from `pnpm-workspace.yaml` catalogs
- Updates catalog entries once instead of per-package
- Supports both default catalog and named catalogs
- Preserves YAML formatting
- Updates `pnpm-lock.yaml` after catalog changes

**DepType for Catalogs:**

- Default catalog: `pnpm.catalog`
- Named catalogs: `pnpm.catalog.<name>` (e.g., `pnpm.catalog.react17`)

**Matching Named Catalogs:**

```json5
{
  packageRules: [
    {
      // Match specific named catalog
      matchDepTypes: ['pnpm.catalog.react17'],
      groupName: 'React 17 catalog',
    },
    {
      // Match all catalogs
      matchDepTypes: ['/^pnpm\\.catalog/'],
      groupName: 'All catalog updates',
    },
  ],
}
```

---

## Anti-Patterns

### Overly Aggressive Automerge Configurations

**Anti-Pattern:**

```json5
{
  // BAD: Automerge everything including majors
  extends: [':automergeAll'],
}
```

**Why It's Bad:**

- Major version bumps often require code changes
- No human review for breaking changes
- Can introduce silent failures
- Bypasses team planning for migrations

**Correct Pattern:**

```json5
{
  packageRules: [
    {
      // Automerge only low-risk updates
      matchUpdateTypes: ['patch'],
      matchCurrentVersion: '!/^0/', // Exclude pre-1.0.0
      automerge: true,
    },
    {
      // Require approval for majors
      matchUpdateTypes: ['major'],
      dependencyDashboardApproval: true,
      automerge: false,
    },
  ],
}
```

### Ignoring Security Update Urgency

**Anti-Pattern:**

```json5
{
  // BAD: Security updates follow normal schedule
  vulnerabilityAlerts: {
    enabled: true,
    // No schedule override
  },
}
```

**Why It's Bad:**

- CVE patches sit in queue while vulnerable
- Known-bad-version-now > unknown-but-aging-version-later
- Defeats purpose of security automation

**Correct Pattern:**

```json5
{
  vulnerabilityAlerts: {
    enabled: true,
    schedule: ['at any time'], // Bypass normal schedule
    automerge: true,
    minimumReleaseAge: '0 days', // Bypass age requirement
    labels: ['security', 'vulnerability'],
  },
}
```

### Poor Grouping Strategies Leading to PR Fatigue

**Anti-Pattern:**

```json5
{
  // BAD: No grouping, one PR per dependency
  extends: ['config:base'],
  // No packageRules for grouping
}
```

**Why It's Bad:**

- Dozens of PRs for same ecosystem (e.g., 20 React-related PRs)
- Reviewer fatigue
- Inefficient review process
- Lockfile churn

**Correct Pattern:**

```json5
{
  extends: ['group:monorepos', 'group:recommended'],
  packageRules: [
    {
      matchPackageNames: ['/^@types//'],
      groupName: 'definitelyTyped',
    },
    {
      matchPackageNames: ['/eslint/'],
      groupName: 'eslint',
    },
  ],
}
```

### Not Testing Updates Before Merging

**Anti-Pattern:**

```json5
{
  // BAD: Automerge without tests
  automerge: true,
  ignoreTests: true, // Disables test requirements
}
```

**Why It's Bad:**

- Broken code merged automatically
- Silent failures in production
- Defeats purpose of CI/CD

**Correct Pattern:**

```json5
{
  automerge: true,
  // Never set ignoreTests: true
  // Require status checks via branch protection
  automergeStrategy: 'squash',
}
```

**Branch Protection Requirements:**

```yaml
# In GitHub repository settings
required_status_checks:
  strict: true
  contexts:
    - 'ci'
    - 'lint'
    - 'typecheck'
required_pull_request_reviews:
  required_approving_review_count: 1
  require_code_owner_reviews: true
```

### Using Floating Ranges Instead of Pinning

**Anti-Pattern:**

```json5
{
  // BAD: Use widen strategy (keeps caret ranges)
  rangeStrategy: 'widen',
}
```

**Why It's Bad:**

- Floating ranges enabled supply chain attacks (event-stream, ua-parser-js)
- Lockfile-only updates don't fix manifest vulnerabilities
- Fresh installs can resolve to vulnerable versions
- Libraries propagate vulnerable ranges to consumers

**Correct Pattern:**

```json5
{
  rangeStrategy: 'pin', // Pin exact versions
  // For security fixes, use bump in vulnerabilityAlerts
  vulnerabilityAlerts: {
    rangeStrategy: 'bump',
  },
}
```

### Ignoring the Dependency Dashboard

**Anti-Pattern:**

```json5
{
  // BAD: Dependency dashboard disabled
  dependencyDashboard: false,
}
```

**Why It's Bad:**

- No visibility into rate-limited updates
- Can't approve major updates
- No centralized triage view
- Team complains "Renovate is slow" when limits are hit

**Correct Pattern:**

```json5
{
  dependencyDashboard: true,
  dependencyDashboardOSVVulnerabilitySummary: 'unresolved',
}
```

---

## Repository-Specific Assessment

### Current pnpm-workspace.yaml Analysis

**Configuration:**

```yaml
catalogMode: strict
minimumReleaseAge: 1440 # 24 hours
catalogs:
  default:
    # 27 shared dependencies
    # - React ecosystem: react, react-dom, @dnd-kit/*
    # - TypeScript: typescript, @types/*
    # - Build tools: vite, turbo, tsx
    # - Testing: vitest, @vitest/*
    # - Database: drizzle-orm
    # - API: hono, zod
    # - CSS: tailwindcss, postcss, autoprefixer
```

**Key Observations:**

1. **Strict catalog mode**: All dependencies must use catalog versions
2. **24-hour minimum age**: Conservative security posture
3. **27 catalog entries**: Moderate dependency surface
4. **No named catalogs**: Single default catalog simplifies management
5. **Workspace protocol enforced**: `linkWorkspacePackages: false`

### Current Dependabot Configuration

**Existing Setup:**

```yaml
version: 2
updates:
  - package-ecosystem: 'pnpm'
    directory: '/'
    schedule: weekly (Monday 9am CST)
    open-pull-requests-limit: 5
    groups:
      - typescript-eslint
      - testing
      - build-tools
```

**Limitations:**

- No catalog support (updates individual package.json files)
- No workspace protocol awareness
- Limited grouping (3 groups vs Renovate's 15+)
- No automerge capability
- No dependency dashboard
- No security override for schedule

### Team Capacity Assessment

**Assumptions:**

- Small to medium team (based on monorepo structure)
- Platform team responsible for dependency updates
- CI/CD pipeline with comprehensive tests
- Security-conscious organization (strict catalog mode, minimumReleaseAge)

**Recommended Configuration:**

- **PR Concurrent Limit**: 8 (matches typical review velocity)
- **PR Hourly Limit**: 2 (prevents flood)
- **Automerge**: Tiered approach (linting → dev deps → patches)
- **Major Updates**: Dashboard approval only
- **Security Updates**: Immediate automerge

### Strict CatalogMode Impact on Renovate

**Benefits:**

1. **Single Update Point**: Renovate updates catalog entry once
2. **Consistent Versions**: All packages use same catalog version
3. **Reduced PR Volume**: One PR per catalog dependency
4. **Lockfile Coordination**: Single `pnpm-lock.yaml` update

**Configuration Considerations:**

```json5
{
  packageRules: [
    {
      // Catalog updates affect entire monorepo
      matchDepTypes: ['pnpm.catalog'],
      groupName: 'pnpm catalog dependencies',
      automerge: false, // Require review
      reviewers: ['team:platform'],
    },
  ],
}
```

### Dependency Version Analysis

**Current Catalog Versions (July 2026):**

- **React**: ^18.3.0 (stable, recent)
- **TypeScript**: ^5.9.0 (current LTS)
- **Vite**: ^8.1.5 (current)
- **TailwindCSS**: ^4.3.3 (current major)
- **Drizzle ORM**: ^0.45.0 (current)
- **Hono**: ^4.12.0 (current)
- **Zod**: ^4.0.0 (current major)

**Update Patterns:**

- Most dependencies are on current major versions
- Caret ranges allow minor/patch updates
- No outdated critical dependencies detected
- Good maintenance discipline

**Renovate Strategy:**

- **Patch updates**: Automerge with 7-day age
- **Minor updates**: Review required for framework deps
- **Major updates**: Dashboard approval only
- **Security updates**: Immediate automerge

---

## Additional Research

### Renovate vs Dependabot Comparison for 2026

**Decision Matrix:**

| Situation                     | Recommended Tool         | Why                                          |
| ----------------------------- | ------------------------ | -------------------------------------------- |
| Small GitHub project          | Dependabot               | Easy setup, built into GitHub                |
| Large monorepo                | **Renovate**             | Better grouping, package rules, dashboard    |
| GitLab or Bitbucket           | **Renovate**             | Dependabot is GitHub-focused                 |
| Strict private infrastructure | **Renovate** self-hosted | More control over runtime                    |
| Simple security PRs           | Dependabot               | GitHub-native alerts and security updates    |
| Advanced automerge strategy   | **Renovate**             | Built-in automerge and package-rule controls |

**For Life OS:**

- **Monorepo**: ✓ (5 apps, 5 packages)
- **pnpm workspaces**: ✓
- **Strict catalog mode**: ✓
- **Complex grouping needs**: ✓
- **Security-conscious**: ✓
- **GitHub platform**: ✓

**Conclusion**: **Renovate is the clear choice** for Life OS.

### Best Practices for Renovate in Large TypeScript Monorepos

**1. Use config:best-practices Preset**

```json5
{
  extends: [
    'config:recommended',
    'docker:pinDigests',
    'helpers:pinGitHubActionDigests',
    ':configMigration',
    ':pinDevDependencies',
    'abandonments:recommended',
    'security:minimumReleaseAgeNpm',
    ':maintainLockFilesWeekly',
  ],
}
```

**2. Enable Dependency Dashboard**

```json5
{
  dependencyDashboard: true,
  dependencyDashboardOSVVulnerabilitySummary: 'unresolved',
}
```

**3. Pin Versions for Security**

```json5
{
  rangeStrategy: 'pin',
}
```

**4. Use Tiered Automerge**

```json5
{
  packageRules: [
    {
      matchDepTypes: ['devDependencies'],
      matchUpdateTypes: ['patch', 'minor'],
      automerge: true,
      minimumReleaseAge: '14 days',
    },
  ],
}
```

**5. Group Related Updates**

```json5
{
  extends: ['group:monorepos', 'group:recommended'],
  packageRules: [
    {
      matchPackageNames: ['/^@types//'],
      groupName: 'definitelyTyped',
    },
  ],
}
```

**6. Schedule During Off-Hours**

```json5
{
  timezone: 'America/Chicago',
  schedule: ['after 9pm and before 6am every weekday', 'every weekend'],
}
```

**7. Rate Limit PR Creation**

```json5
{
  prConcurrentLimit: 8,
  prHourlyLimit: 2,
}
```

**8. Security Override**

```json5
{
  vulnerabilityAlerts: {
    enabled: true,
    schedule: ['at any time'],
    automerge: true,
    minimumReleaseAge: '0 days',
  },
}
```

### Security Vulnerability Automation with Renovate

**GitHub Vulnerability Alerts Integration:**

```json5
{
  vulnerabilityAlerts: {
    enabled: true,
    labels: ['security', 'vulnerability'],
    commitMessageSuffix: '[SECURITY]',
    schedule: ['at any time'], // Bypass normal schedule
    groupName: null, // Break out of grouping
  },
}
```

**OSV Vulnerability Alerts:**

```json5
{
  osvVulnerabilityAlerts: true,
  dependencyDashboardOSVVulnerabilitySummary: 'unresolved',
}
```

**Security-Only Mode:**

```json5
{
  extends: ['config:recommended'],
  packageRules: [
    {
      enabled: false,
      matchPackagePatterns: ['*'],
    },
  ],
  vulnerabilityAlerts: {
    enabled: true,
  },
  osvVulnerabilityAlerts: true,
}
```

**CVE-Only Auto-Merge:**

```json5
{
  packageRules: [
    {
      matchUpdateTypes: ['patch', 'minor'],
      matchCurrentVersion: '!/^0/',
      vulnerabilityAlerts: {
        automerge: true,
        labels: ['security', 'vulnerability'],
        minimumReleaseAge: '0 days',
        schedule: ['at any time'],
      },
    },
  ],
}
```

### Renovate Configuration Examples from Similar Projects

**Example 1: Large TypeScript Monorepo**

```json5
{
  extends: ['config:best-practices'],
  timezone: 'America/New_York',
  schedule: ['every weekend'],
  prConcurrentLimit: 10,
  packageRules: [
    {
      matchDepTypes: ['devDependencies'],
      matchUpdateTypes: ['patch', 'minor'],
      groupName: 'dev dependencies (non-major)',
      automerge: true,
    },
    {
      matchPackageNames: ['react', 'react-dom'],
      groupName: 'react monorepo',
    },
  ],
}
```

**Example 2: pnpm Monorepo with Catalogs**

```json5
{
  extends: ['config:recommended'],
  packageRules: [
    {
      matchDepTypes: ['pnpm.catalog'],
      groupName: 'catalog dependencies',
      automerge: false,
    },
    {
      matchFileNames: ['apps/**'],
      additionalBranchPrefix: '{{packageFileDir}}-',
    },
  ],
}
```

**Example 3: Security-First Configuration**

```json5
{
  extends: ['config:recommended'],
  rangeStrategy: 'pin',
  minimumReleaseAge: '7 days',
  vulnerabilityAlerts: {
    enabled: true,
    automerge: true,
    schedule: ['at any time'],
  },
  packageRules: [
    {
      matchUpdateTypes: ['major'],
      dependencyDashboardApproval: true,
    },
  ],
}
```

---

## Configuration Reference

### Provided Configuration Summary

The `renovate.json5` file provided implements:

**Base Configuration:**

- Extends `config:recommended` with security best practices
- Semantic commits matching project conventions
- Dependency dashboard for centralized triage
- Version pinning for security
- Respects pnpm's 24-hour minimumReleaseAge

**Package Rules:**

- 15+ grouping rules for different ecosystems
- Tiered automerge strategy (linting → dev deps → patches)
- Catalog-specific handling
- Security override for vulnerability alerts
- Major version dashboard approval
- TypeScript ecosystem grouping
- React ecosystem grouping
- Build tools grouping
- Database/ORM grouping

**Scheduling:**

- Off-hours updates (9pm-6am weekdays, weekends)
- Weekly lockfile maintenance (Monday 5am)
- Security updates bypass schedule

**Rate Limiting:**

- 8 concurrent PRs
- 2 PRs per hour

**Security:**

- GitHub vulnerability alerts enabled
- OSV vulnerability alerts enabled
- Security updates automerge immediately
- Minimum release age bypassed for security

### Migration from Dependabot

**Steps:**

1. **Install Renovate GitHub App**
   - Visit https://github.com/apps/renovate
   - Grant repository access
   - Configure permissions (read/write for pull requests)

2. **Remove Dependabot**
   - Delete `.github/dependabot.yml`
   - Disable Dependabot in repository settings

3. **Commit Renovate Config**
   - Add `renovate.json5` to repository root
   - Commit and push

4. **Review Onboarding PR**
   - Renovate will create an onboarding PR
   - Review and merge

5. **Monitor Dependency Dashboard**
   - Watch for dependency dashboard issue
   - Approve major updates as needed

**Rollback Plan:**

If issues arise:

1. Close all open Renovate PRs
2. Delete `renovate.json5`
3. Restore `.github/dependabot.yml`
4. Re-enable Dependabot

### Next Steps

1. **Review Configuration**: Adjust team names, labels, and schedules
2. **Test in Staging**: Run Renovate on a test branch first
3. **Enable Gradually**: Start with limited automerge, expand over time
4. **Monitor Dashboard**: Check dependency dashboard regularly
5. **Iterate**: Adjust rules based on team feedback

---

## Conclusion

Renovate is the recommended dependency management solution for the Life OS
monorepo. Its native pnpm workspace support, catalog integration, and advanced
configuration capabilities provide significant advantages over Dependabot for
this use case.

The provided configuration implements security best practices, reduces PR
fatigue through intelligent grouping, and enables safe automerge for low-risk
updates while requiring human review for major changes.

Key benefits:

- **Reduced PR volume**: Grouping and catalog support
- **Security-first**: Version pinning, minimum release age, security overrides
- **Team efficiency**: Tiered automerge, dependency dashboard
- **Monorepo-aware**: Workspace detection, catalog coordination
- **Configurable**: Granular package rules for different ecosystems

The configuration is production-ready and can be further customized based on
team preferences and operational requirements.
