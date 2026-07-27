# dependency-cruiser Architecture Enforcement Guide

## Overview

This guide documents the implementation of dependency-cruiser for architectural
boundary enforcement in the Life OS monorepo. dependency-cruiser complements
ESLint import rules by providing deeper architectural analysis, visualization
capabilities, and more granular control over dependency patterns.

## Research Summary (July 2026)

### dependency-cruiser Fundamentals

**Architecture Analysis Capabilities:**

- Static analysis of import/require dependencies in JavaScript/TypeScript
  projects
- Rule-based validation with customizable severity levels (error, warn, info,
  ignore)
- Multiple output formats: text (eslint-like), HTML, DOT (GraphViz), Mermaid,
  Markdown, JSON
- Cycle detection, orphan detection, and dependency type validation
- Support for ES6, CommonJS, AMD, and TypeScript module systems

**Complement to ESLint Import Rules:**

- ESLint `import-x/no-cycle` handles circular dependencies at file level
- ESLint `import-x/no-restricted-paths` handles basic zone restrictions
- dependency-cruiser adds:
  - Architectural layer enforcement with complex patterns
  - Dependency type validation (dev vs prod dependencies)
  - Orphan detection (unused modules)
  - Visualization and reporting for documentation
  - Performance optimizations for large monorepos
  - Custom rules for domain-specific constraints

**Visualization and Reporting Features:**

- DOT output for GraphViz rendering (detailed dependency graphs)
- Archi reporter for high-level architectural views
- Mermaid output for GitHub Actions summaries and PR comments
- HTML reporter with interactive exploration
- Markdown reporter for CI/CD integration
- Metrics visualization (instability, dependency count, etc.)

### Monorepo Configuration

**combinedDependencies:**

- Set to `true` for pnpm workspaces with root-level dependencies
- Merges package.json dependencies from root down to source file
- Gives precedence to closest package.json (package-level > root-level)
- Essential for monorepos using `workspace:*` protocol

**TypeScript Configuration:**

- Uses root `tsconfig.json` with project references
- Resolves TypeScript path aliases (e.g., `@/*` mappings)
- Supports `tsPreCompilationDeps: true` for direct AST analysis (faster)
- Currently supports single tsconfig; multiple tsconfigs require workarounds

**Architectural Zones:**

- **Packages Layer** (shared libraries):
  - `packages/contracts` - Foundation layer (no dependencies on other packages)
  - `packages/database` - Drizzle schema (depends on contracts only)
  - `packages/api-client` - Typed API client (depends on contracts only)
  - `packages/mobile-data` - PowerSync schema (depends on contracts only)
  - `packages/ui` - Shared UI components (React, Tamagui only)

- **Applications Layer** (deployable services):
  - `apps/api` - Hono backend (depends on contracts, database)
  - `apps/worker` - Background worker (depends on contracts, database)
  - `apps/web` - Next.js web app (depends on ui, contracts, api-client)
  - `apps/mobile` - Expo mobile app (depends on ui, contracts, mobile-data,
    api-client)

**Layer Boundary Enforcement:**

- Client packages (web, mobile) cannot import from server packages (api, worker,
  database)
- Server packages cannot import from client packages
- API client is pure client library (no server imports)
- Database access restricted to backend/migration tools only

### Advanced Coding Patterns

**Custom Rules for Domain-Specific Constraints:**

```javascript
// Example: Enforce that controllers must inherit from base controller
{
  name: "must-inherit-from-base-controller",
  severity: "error",
  module: {
    path: "-controller\\.ts$",
    pathNot: "base-controller\\.ts$",
  },
  to: {
    path: "base-controller\\.ts$",
  },
}
```

**Integration with CI:**

- Run as part of `pnpm lint` or separate `pnpm depcruise` command
- Exit with non-zero code on error severity violations
- Use markdown reporter for GitHub Actions summaries
- Use Mermaid reporter for PR comments showing affected modules
- Cache results with Turbo for incremental builds

**Generating Dependency Graphs:**

```bash
# Detailed dependency graph
pnpm depcruise:graph

# High-level architecture graph
pnpm depcruise:archi

# Focus on specific package
depcruise packages/ui --output-type dot | dot -T svg > ui-deps.svg
```

**Excluding Test Files and Dev Dependencies:**

- Use `exclude` option to skip test directories and files
- Use `dependencyTypes` rules to prevent production code from depending on
  devDependencies
- Test files excluded from orphan detection
- Mock files excluded from dependency graphs

### Anti-Patterns

**Overly Restrictive Rules:**

- Don't start with hundreds of rules - begin with circular dependency detection
- Gradually add architectural rules as the codebase matures
- Use `severity: "warn"` initially, then upgrade to `error` after team alignment
- Consider incremental adoption (opt-in per module) for large codebases

**Improper Dependency Type Resolution:**

- Always configure `combinedDependencies: true` for pnpm workspaces
- Configure `tsConfig` to resolve TypeScript path aliases
- Set `moduleSystems` to only what you actually use (es6, cjs)
- Configure `enhancedResolveOptions.extensions` to limit file types scanned

**Ignoring Circular Dependencies:**

- Circular dependencies indicate architectural problems
- Use dependency inversion to break cycles
- Extract shared logic into separate modules
- Don't disable cycle detection - fix the underlying issue

**Relying Solely on dependency-cruiser:**

- Keep ESLint import rules for basic import hygiene
- Use dependency-cruiser for architectural boundaries
- ESLint handles import order, unresolved imports, basic cycles
- dependency-cruiser handles layer violations, dependency types, visualization

### Tool Comparison (2026)

**dependency-cruiser vs Madge:**

- **dependency-cruiser**: Architecture linter with rule-based validation (6,988
  stars, 2.8M weekly downloads)
- **Madge**: Primary focus on visualization (10,139 stars, 3.0M weekly
  downloads)
- **Key difference**: dependency-cruiser validates against your rules; Madge
  primarily visualizes
- **Recommendation**: Use dependency-cruiser for enforcement, Madge for quick
  visualization if needed

**Emerging Tools (2026):**

- **ts-archunit**: Architecture guardrails for AI coding agents, body analysis,
  type checking (new, 5 stars)
- **Knip**: Dead code detection (unused files, exports, dependencies) - 11,752
  stars, very active
- **pruneguard**: Rust-powered architecture governance, 10-50x faster than JS
  alternatives (new, 1 star)
- **Recommendation**: Consider Knip for dead code detection alongside
  dependency-cruiser

## Configuration for Life OS

### File Structure

```
.dependency-cruiser.js  # Main configuration file
package.json            # Added depcruise scripts and dependency
turbo.json              # Added .dependency-cruiser.js to lint inputs
```

### Key Configuration Decisions

**Monorepo Settings:**

- `combinedDependencies: true` - Essential for pnpm workspaces
- `tsConfig.fileName: './tsconfig.json'` - Uses project references
- `moduleSystems: ['es6', 'cjs']` - Limited to what we actually use
- `tsPreCompilationDeps: true` - Direct TypeScript AST analysis for performance

**Performance Optimizations:**

- `enhancedResolveOptions.extensions` - Limited to .ts, .tsx, .js, .jsx, .json
- `exclude.path` - Excludes node_modules, dist, build, coverage, .turbo
- `doNotFollow.path` - Don't follow node_modules dependencies
- `cacheDuration: 4000ms` - Default works well for most repos

**Architectural Rules:**

- **Foundation Layer**: `packages/contracts` has no dependencies on other
  packages
- **Database Layer**: `packages/database` depends only on contracts
- **Client Libraries**: `packages/api-client`, `packages/mobile-data` depend
  only on contracts
- **UI Layer**: `packages/ui` depends only on React, Tamagui, and npm packages
- **Server Apps**: `apps/api`, `apps/worker` depend on contracts and database
- **Client Apps**: `apps/web`, `apps/mobile` depend on ui, contracts, and
  respective client libraries
- **Client-Server Separation**: Clients cannot import from server code or
  database

### Rule Categories

**Core Rules (Basic Hygiene):**

- `no-circular` - Detect circular dependencies
- `no-orphans` - Detect unused modules
- `not-to-unresolvable` - Detect imports that cannot be resolved
- `no-non-package-json` - Detect dependencies not in package.json
- `no-duplicate-dep-types` - Detect dependencies with multiple types

**Test Isolation Rules:**

- `not-to-test` - Production code cannot depend on test code
- `not-to-dev-dep` - Production code cannot depend on devDependencies

**Architectural Layering Rules:**

- `packages-contracts-no-deps` - Foundation layer isolation
- `packages-database-only-contracts` - Database layer isolation
- `packages-api-client-only-contracts` - API client isolation
- `packages-mobile-data-only-contracts` - Mobile data isolation
- `packages-ui-allowed-deps` - UI layer constraints

**Client-Server Separation Rules:**

- `web-no-server-imports` - Web client cannot import server code
- `mobile-no-server-imports` - Mobile client cannot import server code
- `api-client-no-server` - API client cannot import server code

**App-Specific Rules:**

- `api-allowed-deps` - API server dependency constraints
- `worker-allowed-deps` - Worker dependency constraints
- `web-allowed-deps` - Web app dependency constraints
- `mobile-allowed-deps` - Mobile app dependency constraints

**Deprecated Module Rules:**

- `no-deprecated-core` - Detect deprecated Node.js core modules

## Usage

### Local Development

```bash
# Validate architecture rules
pnpm depcruise

# Generate detailed dependency graph
pnpm depcruise:graph

# Generate high-level architecture graph
pnpm depcruise:archi

# Validate specific package
depcruise packages/web/src --config .dependency-cruiser.js

# Generate graph for specific package
depcruise packages/ui --output-type dot | dot -T svg > ui-deps.svg
```

### CI/CD Integration

**Add to GitHub Actions:**

```yaml
- name: Validate architecture
  run: pnpm depcruise

- name: Generate architecture graph
  run: pnpm depcruise:archi
  if: github.event_name == 'pull_request'

- name: Upload architecture graph
  uses: actions/upload-artifact@v4
  with:
    name: architecture-graph
    path: architecture-graph.svg
  if: github.event_name == 'pull_request'
```

**Add to Turbo validate task:**

```json
{
  "validate": {
    "dependsOn": ["lint", "typecheck", "test", "depcruise"]
  },
  "depcruise": {
    "dependsOn": ["^depcruise"],
    "inputs": ["$TURBO_DEFAULT$", ".dependency-cruiser.js"]
  }
}
```

**PR Comments with Mermaid:**

````yaml
- name: Dependency graph in PR
  if: github.event_name == 'pull_request'
  run: |
    echo '## Dependency Graph' >> $GITHUB_STEP_SUMMARY
    echo '```mermaid' >> $GITHUB_STEP_SUMMARY
    depcruise apps packages --output-type mermaid --affected ${{github.event.pull_request.base.sha}} >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
````

### Integration with Existing ESLint Rules

**Complementary Relationship:**

- ESLint `import-x/no-cycle` → dependency-cruiser `no-circular` (redundant but
  OK)
- ESLint `import-x/no-restricted-paths` → dependency-cruiser architectural rules
  (more expressive)
- ESLint `import-x/order` → Not covered by dependency-cruiser (keep ESLint)
- ESLint `import-x/no-unresolved` → dependency-cruiser `not-to-unresolvable`
  (redundant but OK)

**Recommendation:**

- Keep ESLint for import order, basic cycle detection, and unresolved imports
- Use dependency-cruiser for architectural boundaries and dependency type
  validation
- Both tools can coexist without conflict
- Consider removing redundant ESLint rules if dependency-cruiser provides better
  coverage

## Performance Considerations

### Large Monorepo Optimization

**For repos with 5,000+ files:**

- Limit `moduleSystems` to what you actually use
- Set `tsPreCompilationDeps: true` for direct TypeScript AST analysis
- Limit `enhancedResolveOptions.extensions` to file types you actually use
- Use `skipAnalysisNotInRules: true` if you don't use cycle/dependent/orphan
  rules
- Consider lowering `cacheDuration` if experiencing memory issues

**Benchmark Performance:**

- dependency-cruiser v16.9.0+ includes performance optimizations
- Orphan analysis: 1.25x faster on large codebases
- Module metrics: 146x faster with centralized data structures
- Cycle detection: ~6% of total runtime on 17k files/65k dependencies

### Incremental Analysis

**Turbo Integration:**

- Add `.dependency-cruiser.js` to lint inputs for cache invalidation
- Run dependency-cruiser as separate task or part of lint
- Use Turbo's dependency tracking for incremental builds

**Focus on Changed Files:**

```bash
# Only analyze changed files (Git-based)
depcruise --git-only

# Only analyze files changed since base branch
depcruise --affected main
```

## Troubleshooting

### Common Issues

**"not-to-unresolvable" errors for TypeScript path aliases:**

- Ensure `tsConfig` is configured in options
- Verify path aliases are defined in root tsconfig.json
- For monorepos with multiple tsconfigs, consider using webpackConfig as
  workaround

**Performance issues on large repos:**

- Enable `tsPreCompilationDeps: true`
- Limit `moduleSystems` to ['es6', 'cjs']
- Limit `enhancedResolveOptions.extensions`
- Use `skipAnalysisNotInRules: true` if not using cycle/dependent/orphan rules
- Consider using `depcruise-fmt` for multiple reports from single cruise

**False positives for workspace protocol:**

- Ensure `combinedDependencies: true` is set
- Verify workspace dependencies are in package.json
- Check that pnpm catalog mode is configured correctly

**Circular dependency warnings in node_modules:**

- Add `pathNot: "^node_modules"` to rule to ignore third-party cycles
- Create separate rule for node_modules with `severity: "warn"`
- Focus on fixing cycles in your own code

## Future Enhancements

### Potential Improvements

**Incremental Adoption:**

- Start with `severity: "warn"` for new rules
- Gradually upgrade to `severity: "error"` after team alignment
- Consider opt-in per module using separate rule files

**Advanced Visualizations:**

- Use archi reporter for high-level architecture documentation
- Generate dependency graphs for each package separately
- Create interactive HTML reports for codebase exploration

**Integration with Other Tools:**

- Consider adding Knip for dead code detection
- Evaluate ts-archunit for body analysis and type-level rules
- Explore pruneguard for Rust-powered performance (if needed)

**CI/CD Enhancements:**

- Add dependency-cruiser to PR checks
- Generate architecture graphs for documentation
- Use Mermaid reporter for PR comments showing affected modules
- Integrate with danger.js for automated PR feedback

## References

- [dependency-cruiser GitHub](https://github.com/sverweij/dependency-cruiser)
- [dependency-cruiser Documentation](https://github.com/sverweij/dependency-cruiser/blob/main/doc)
- [How We Enforce Architecture Boundaries at Scale](https://technology.lastminute.com/how-we-enforce-architecture-boundaries-at-scale-on-our-app/)
- [Knip - Dead Code Detection](https://knip.dev/)
- [ts-archunit - Architecture Guardrails](https://github.com/nielspeter/ts-archunit)
- [ESLint Plugin Import X](https://github.com/un-ts/eslint-plugin-import-x)
