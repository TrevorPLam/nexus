## Category 2 — Monorepo \& Package Management

**Recommendation: use a pnpm 11 workspace monorepo from day one, with pnpm catalogs (`catalogMode: strict`) for shared dependency versions and the `workspace:` protocol for every internal dependency. Add Turborepo 2.9.x at repository creation but keep its initial configuration deliberately small; enable remote caching once CI cost or build latency justifies it.** This is the best balance of correctness, speed, low operational burden, and flexibility for Life OS’s web, mobile, backend, and shared-package architecture.[^1][^2][^3]

The 2026 package-manager landscape confirms the prior direction and strengthens it. **pnpm 11 is the current stable release (April 2026) and is the clear default for TypeScript monorepos.**[^4] It is mature, fast, strict, and natively supports catalogs, `workspace:*`, and supply-chain guardrails. **Turborepo 2.9.x is the current stable task runner and is now up to 96% faster at “time to first task” than earlier 2.x releases, with `turbo query` stable for graph introspection and OpenTelemetry/structured logging available experimentally.**[^5] Nx 23 is a genuine alternative for larger teams, but its extra platform surface is unnecessary for an early-stage MVP.[^6]

## Requirements

The repository must support:

- Three deployable apps: `web` (Next.js), `mobile` (Expo), and `backend` (Hono).
- Shared packages for database schema, domain types, API client, UI primitives, calendar engine, auth helpers, integrations, and configuration.
- Strict internal dependency boundaries: packages may not import application code.
- A single lockfile and deterministic local/CI installs.
- A way to test, type-check, lint, and build only what changes.
- Cross-package version consistency for React, React Native, Zod, Drizzle, and related shared dependencies.
- A minimal learning curve for an early-stage, likely small team.

The project’s intended structure already calls for a single pnpm workspace repository containing application folders plus shared packages; that is the correct base model.[^7][^8]

## Separate the Layers

“Monorepo tooling” conflates three distinct needs. They should be chosen independently.


| Layer | Purpose | Recommended tool |
| :-- | :-- | :-- |
| Package manager | Install external dependencies, lock versions, link local packages | **pnpm 11** |
| Workspace system | Declare internal projects and local dependency relationships | **pnpm Workspaces** |
| Task orchestrator | Understand task dependencies, cache outputs, run only affected work | **Turborepo 2.9.x** |
| Version governance | Keep common package versions aligned | **pnpm catalogs** (`catalogMode: strict`) |
| Architectural boundaries | Prohibit forbidden imports and circular dependencies | **dependency-cruiser**, evaluated in its own category |

pnpm uses a root `pnpm-workspace.yaml` to define workspace packages, and the repository root itself is always included. Internal packages should use `workspace:` rather than loose semver ranges, which forces local resolution while developing and avoids accidentally pulling a similarly named registry package.[^9][^10]

## Package Manager Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **pnpm 11** | Strict, isolated dependency resolution; content-addressable store; workspace protocol; catalogs (stable); efficient disk usage; native supply-chain defaults (`minimumReleaseAge`, `blockExoticSubdeps`, `strictDepBuilds`); native publish flow; `devEngines.packageManager` with ranges | Requires Node.js 22+; `.npmrc` is now auth/registry-only, so other settings move to `pnpm-workspace.yaml` or global config; symlinked `node_modules` can expose invalid package assumptions earlier; requires team familiarity with filters and workspace conventions | **Select** |
| npm 11 Workspaces | Native Node tooling; lowest conceptual overhead; broad compatibility; security improvements in npm 11 | Less strict dependency behavior (flat hoisting allows phantom imports); no `workspace:*` protocol; no catalogs; weaker monorepo ergonomics and version-governance features; slower installs | Reject |
| Yarn Berry 4.x Workspaces | Strong workspace support; constraints can enforce package rules; `workspace:` protocol | Plug’n’Play still causes friction with Expo, React Native, native modules, and toolchains expecting `node_modules`; most Yarn Berry + Expo setups still require `nodeLinker: node-modules`; adds configuration complexity | Reject |
| Bun 1.2+ Workspaces | Very fast installs; text-based `bun.lock`; integrated runtime/test tooling; now supports `workspace:*`, `catalog:`, and an isolated linker | Metro bundler cannot resolve transitive dependencies from `node_modules/.bun/`, which breaks common React Native/Expo assumptions; `trustedDependencies` must be declared for packages with postinstall scripts (e.g. `@sentry/cli`); runtime is not selected for Life OS; less proven for PowerSync + Drizzle + Expo monorepos | Reject |
| Rush 5.175+ | Strong enterprise governance and reproducibility; built on pnpm; robust at very large scale | A heavy additional layer for a small team; overlapping responsibility with pnpm + Turbo; explicit project registry and policy overhead | Reject for MVP |
| Lerna | Familiar historical monorepo utility | Modern package managers and task runners cover its core value more cleanly; publishing is irrelevant to internal packages | Reject |

pnpm’s installation model specifically addresses phantom dependencies and dependency “doppelgangers,” which become more harmful as a monorepo accumulates web, mobile, and shared packages. Catalogs allow one version declaration to be reused throughout the workspace, reducing duplicate version declarations, upgrade work, runtime conflicts, and merge conflicts.[^11][^12]

### Why not Yarn Berry?

Yarn’s constraints are capable of enforcing shared workspace dependency rules and bans. However, that benefit is not decisive because pnpm catalogs plus CI version checking achieve the Life OS requirement with a simpler, more conventional `node_modules` environment. This matters because Expo native-module development, PowerSync, and cross-platform tooling already create enough integration risk without adding Plug’n’Play compatibility as another variable. In 2026, Expo documentation still recommends `nodeLinker: node-modules` for Yarn Berry in React Native monorepos, and Expo Doctor can fail in Yarn Berry setups because it expects `package-lock.json`/`npm explain` semantics.[^13][^14]

### Why not npm?

npm 11 Workspaces can work. It is the appropriate choice for a small monorepo with a handful of packages and no cross-platform native tooling. But Life OS specifically needs strict package isolation, reliable internal package linking, and centralized dependency consistency across Next.js, Expo, React Native, Drizzle, PowerSync, Tamagui, and Zod. pnpm better matches those constraints. npm’s flat `node_modules` still allows phantom dependencies, and npm has no equivalent to pnpm’s `workspace:*` protocol or `catalog:` protocol. Benchmarks in 2026 continue to show pnpm installing 2–3× faster and using dramatically less disk space in shared-dependency monorepos.[^15]

### Why not Bun?

Bun 1.2 made monorepos far more viable: a text-based `bun.lock`, `workspace:*` and `catalog:` support, and an isolated linker option. For a pure web or Node monorepo, Bun is now a legitimate option. It is not the right choice for Life OS because:

1. **Metro/Expo resolution.** Metro does not look inside `node_modules/.bun/` for transitive dependencies, so common React Native packages that implicitly rely on hoisted transitive deps (e.g. `promise`) fail to resolve. Workarounds exist, but they add ongoing friction.[^16]
2. **Trusted dependencies.** Bun does not run lifecycle scripts by default. Packages like `@sentry/cli` must be listed in `trustedDependencies` or `postinstall` steps that upload source maps will not run. This is a security win, but it is another Expo/EAS integration detail to maintain.[^17]
3. **Runtime mismatch.** Life OS uses Node.js LTS for the backend; Bun is not the runtime, so using Bun only as a package manager adds a second runtime to reason about.[^18]

## Task Orchestrator Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Turborepo 2.9.x** | Lightweight; task graph from package scripts; local/remote caching; `turbo query` stable for graph/affected introspection; up to 96% faster time-to-first-task than earlier 2.x; excellent fit for pnpm and Vercel; does not impose application structure | Less built-in architecture governance than Nx; configuration still requires accurate task inputs/outputs; no built-in distributed task execution (use CI matrix sharding) | **Select** |
| Nx 23 | Strong project graph; file-level affected analysis; task sandboxing catches undeclared reads/writes; Nx Agents for distributed CI; caching; generators; module-boundary support; Expo/Next.js plugins | More opinionated and larger operational surface; its conventions add unnecessary framework ownership for a small team; Nx Cloud/Agents are powerful but require a learning investment | Reject initially |
| pnpm recursive commands only | No extra tool; useful for simple scripts and filtering | No task graph or output cache; file-based filtering is not task-input-aware; CI runs unnecessary work | Insufficient alone |
| Moon | Rust-based, polyglot, built-in toolchain version management, task inheritance | Smaller ecosystem; still overkill for a TypeScript-only MVP; no clear advantage over Turborepo for this stack | Reject |
| Lage / Lage-like runners | Some offer caching and scheduling | Smaller ecosystem or weaker fit with the selected stack | Reject |
| Rush build orchestration | Scales well for large enterprises; governance-first | Too heavy for current size and already overlaps with pnpm + Turbo | Reject |

Turborepo can store task results in a remote cache and reuse them across local machines and CI, which can materially reduce repeated type-check, lint, test, and build work. Nx 23 offers project graphs, task graphs, task sandboxing, caching, distributed task execution via Nx Agents, and affected-only builds, but those capabilities are overpowered for the project’s initial scope and come with a more opinionated platform layer.[^19][^20][^21]

## Best Architecture

### Select pnpm 11 + Turborepo 2.9.x

Use:

- **pnpm 11** as the only package manager (requires Node.js 22+).[^4]
- **pnpm Workspaces** for `apps/*`, `packages/*`, and `tooling/*`.
- **pnpm catalogs** for versions shared by multiple packages, with `catalogMode: strict`.
- **Turborepo 2.9.x** for all repository-level task orchestration.
- **GitHub Actions cache plus Turbo remote cache** when CI becomes meaningful.
- **`workspace:*`** for all internal package dependencies.
- **Root lockfile only:** `pnpm-lock.yaml`.
- **Pinned package-manager version** through Corepack and `packageManager` in root `package.json`, or `devEngines.packageManager` if using pnpm 11’s range-based pinning.

This gives Life OS a conventional, low-friction development workflow while ensuring that a backend change to a shared Zod schema can properly trigger downstream API client, web, and mobile checks.

## Repository Layout

Keep the intended domain-oriented layout, but treat each directory as an explicit package with an ownership boundary:

```text
life-os/
├── apps/
│   ├── backend/            # Hono, jobs, API endpoints
│   ├── mobile/             # Expo / React Native
│   └── web/                # Next.js
├── packages/
│   ├── api-client/         # API transport contract/client
│   ├── auth/               # Auth provider adapters and helpers
│   ├── calendar-engine/    # Pure planning/capacity functions
│   ├── config/             # ESLint, TS, Prettier, env conventions
│   ├── database/           # Drizzle schema, migrations, database access
│   ├── integrations/       # Google Calendar adapter and future adapters
│   ├── shared/             # Zod schemas, domain types, constants
│   ├── storage/            # Object-storage abstraction
│   └── ui/                 # Tamagui components and tokens
├── tooling/
│   ├── scripts/
│   └── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json              # or turbo.jsonc (JSONC is supported in Turborepo 2.5+)
└── tsconfig.json
```

One correction: **do not make `packages/database` freely importable by every package.** It should be consumed directly only by the backend, database tooling/migrations, and perhaps narrowly scoped test packages. Mobile should use a shared schema representation compatible with PowerSync’s Drizzle driver, but it must not receive a server database client, production credentials, migration runner, or arbitrary SQL access. The dependency-boundary policy will formalize this later.[^22][^8]

## Version Governance

### Replace syncpack with pnpm catalogs as primary

The original plan names `syncpack` or `manypkg` to enforce shared dependency versions. **Use pnpm catalogs as the source of truth instead**, then optionally retain `syncpack` (v15+) only if a later audit finds a rule catalogs cannot express. syncpack 15 now understands pnpm catalogs natively and can auto-migrate scattered dependencies into catalogs, lint them, and bump them.[^23]

Catalogs centralize a version range in `pnpm-workspace.yaml`, then packages use `catalog:` references. pnpm supports default and named catalogs, and the `strict` mode can prevent adding a dependency outside the configured catalog range. As of pnpm 11, `catalogMode: strict`/`prefer` auto-catalogs dependencies on `pnpm add`/`pnpm update`, and cleanup of unused catalog entries is supported.[^24]

Example:

```yaml
packages:
  - apps/*
  - packages/*
  - tooling/*

catalog:
  typescript: ~5.9.0
  zod: ^4.0.0
  vitest: ^3.0.0
  eslint: ^9.0.0
  prettier: ^3.0.0

catalogs:
  react-web:
    react: ^19.0.0
    react-dom: ^19.0.0
  react-native:
    react: ^19.0.0
    react-native: <Expo-SDK-compatible-version>
```

Important: **do not force one React Native version to be compatible with arbitrary versions of React or Expo.** Expo dictates the React Native compatibility matrix. Use a named catalog for Expo-coupled packages, update it only through Expo’s official upgrade tooling, and let `apps/mobile` own those versions.

### Internal Dependencies

Every internal package reference must look like this:

```json
{
  "dependencies": {
    "@life-os/shared": "workspace:*",
    "@life-os/calendar-engine": "workspace:*"
  }
}
```

The `workspace:` protocol guarantees that local code is used in development. On publishing, pnpm replaces the protocol with a normal version range, though Life OS’s internal packages should remain private for the MVP.[^9][^10]

## Turborepo Configuration

Add Turbo at the start, but avoid speculative tasks. Begin with only the tasks the repository actually runs. In Turborepo 2.5+, you may use `turbo.jsonc` if you want comments in the configuration file.

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "lint": {
      "dependsOn": ["^lint"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**",
        "build/**"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

This is illustrative. The exact output paths must be verified against the eventual Next.js, Expo, and Hono build layouts; incorrect outputs produce unsafe cache hits. Do not cache tasks that depend on secrets, local emulators, mutable databases, network calls, or live OAuth integrations.

Turborepo 2.9 introduces useful operational features:

- **`turbo query` is stable.** Use `turbo query affected` to list packages/tasks affected by current changes, or `turbo query ls` to inspect the package graph.[^5]
- **Future Flags.** Opt into upcoming 3.0 behaviors (e.g. `affectedUsingTaskInputs`, `filterUsingTasks`) early to reduce migration pain.[^25]
- **OpenTelemetry and structured logging** are experimental; enable only if you already have an OTLP backend or need machine-readable build logs.[^25]

## Required Policies

### Package boundaries

- `apps/*` may depend on `packages/*`.
- `packages/*` must never depend on `apps/*`.
- `packages/shared` must remain platform-agnostic: no React, React Native, Node, database driver, or framework imports.
- `packages/calendar-engine` must be a deterministic, pure TypeScript library with no database, HTTP, or clock dependency injected implicitly.
- `packages/ui` may depend on Tamagui and shared tokens/types, but never database or backend packages.
- `packages/database` must not be imported into web UI or generic mobile app code.
- `packages/integrations` must use provider-specific subpath imports so Google Calendar never becomes an implicit dependency of unrelated code.
- Every package gets a small public API through `src/index.ts`; prohibit deep cross-package imports.


### Install integrity

- Commit the root `pnpm-lock.yaml`.
- Set the root project to `"private": true` to prevent accidental publishing. pnpm workspace guidance explicitly recommends this root configuration.[^9]
- In CI, use `pnpm install --frozen-lockfile`.
- Pin Node and pnpm versions in repository configuration and local dev container.
- Require Corepack to activate the pinned pnpm release, using either the `packageManager` field in `package.json` or pnpm 11’s `devEngines.packageManager` with a semver range.
- Use **pnpm 11’s `allowBuilds`** (not the removed `onlyBuiltDependencies`/`neverBuiltDependencies` fields) to explicitly permit lifecycle scripts for packages that need them (e.g. `sharp`, `esbuild`, native modules).[^4]
- In pnpm 11, **`.npmrc` is auth/registry-only**; move other pnpm settings into `pnpm-workspace.yaml` or the global `~/.config/pnpm/config.yaml` so they are honored correctly.[^4]
- Be aware that pnpm 11 defaults `minimumReleaseAge` to **1 day**. Newly published packages will not resolve until they are at least 24 hours old. This is a supply-chain protection default; set `minimumReleaseAge: 0` if you need an immediate critical patch, otherwise leave it enabled.[^4]
- Use `minimumReleaseAge` or an equivalent pnpm supply-chain delay policy only after researching compatibility implications; it may reduce exposure to malicious fresh releases but can slow critical patches.


### Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build

pnpm --filter @life-os/backend test
pnpm --filter @life-os/mobile dev
pnpm --filter @life-os/web build
pnpm turbo run typecheck

# Inspect the monorepo graph (Turborepo 2.9+)
turbo query ls
turbo query affected --json
```

Use `pnpm --filter` for focused local work; use `turbo run` for dependency-aware repository-wide work. pnpm filters understand workspace relationships, but pnpm alone does not supply task-input-aware caching.[^9]

## Trade-Off Summary

| Choice | What You Gain | What You Give Up |
| :-- | :-- | :-- |
| pnpm 11 over npm | Strictness, efficient installs, workspace protocol, catalogs, supply-chain defaults | Node.js 22+ requirement and occasional package compatibility troubleshooting |
| pnpm 11 over Yarn Berry | Conventional `node_modules`, lower Expo/native-module risk | Yarn’s built-in constraint engine and PnP strictness |
| pnpm 11 over Bun | Proven Expo/RN/Metro compatibility and PowerSync/Drizzle ecosystem maturity | Bun’s raw install speed and integrated runtime |
| Turbo over pnpm-only | Cached, dependency-aware tasks and scalable CI | One more configuration file and careful cache discipline |
| Turbo over Nx | Low ceremony and framework neutrality | Nx generators, task sandboxing, richer graph tooling, and built-in boundary enforcement |
| Catalogs over syncpack | One source of truth for versions, native pnpm workflow | Fewer specialized package-version lint rules |
| Monorepo over polyrepo | Shared contracts/UI/schema evolve atomically | CI boundaries and dependency discipline must be maintained |

## Final Decision

Lock the following:

```text
Repository model:       Single private monorepo
Node.js baseline:       22 LTS or newer (required by pnpm 11)
Package manager:        pnpm 11.x, pinned through Corepack/packageManager or devEngines.packageManager
Workspace mechanism:    pnpm Workspaces
Internal linking:       workspace:*
Version governance:     pnpm catalogs, catalogMode: strict
Task orchestration:     Turborepo 2.9.x from initial repository setup
Caching:                Local Turbo cache initially; remote cache when CI starts
Publishing:             No package publishing in MVP; Changesets deferred
Monorepo alternatives:  Reject Nx, Rush, Lerna, Yarn Berry, npm workspaces, Bun
```

The next category in the dependency order is **Secret Management \& Environment Variables**.
<span style="display:none">[^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45]</span>

<div align="center">⁂</div>

[^1]: https://pnpm.io/11.x/catalogs

[^2]: https://pnpm.io/11.x/workspaces

[^3]: https://turborepo.dev/docs/core-concepts/remote-caching

[^4]: https://pnpm.io/blog/releases/11.0

[^5]: https://turborepo.dev/blog/2-9

[^6]: https://nx.dev/blog/nx-23-release

[^7]: 07-Technical-Architecture-Fundamentals.md

[^8]: 09-Repository-Structure-Tooling.md

[^9]: https://pnpm.io/11.x/pnpm-workspace_yaml

[^10]: https://pnpm.io/11.x/workspaces#workspace-protocol-workspace

[^11]: https://pnpm.io/11.x/settings#catalogmode

[^12]: https://socket.dev/blog/pnpm-9-5-introduces-catalogs-shareable-dependency-version-specifiers

[^13]: https://docs.expo.dev/guides/monorepos

[^14]: https://github.com/expo/expo/issues/38336

[^15]: https://juanchi.dev/en/blog/pnpm-vs-npm-vs-yarn-2026-monorepo-real-benchmark

[^16]: https://github.com/oven-sh/bun/issues/25870

[^17]: https://docs.expo.dev/guides/using-bun/

[^18]: 07-Technical-Architecture-Fundamentals.md

[^19]: https://turborepo.dev/blog/2-9

[^20]: https://nx.dev/blog/nx-23-release

[^21]: https://nx.dev/docs/guides/adopting-nx/nx-vs-turborepo

[^22]: 12-Development-Practices.md

[^23]: https://syncpack.dev/version-groups/catalog/

[^24]: https://github.com/pnpm/rfcs/blob/main/text/0001-catalogs.md

[^25]: https://turborepo.dev/blog/2-9

[^26]: https://turborepo.dev/docs/crafting-your-repository/caching

[^27]: https://pnpm.io/11.x/settings

[^28]: https://turborepo.dev/docs/crafting-your-repository/constructing-ci

[^29]: https://dev.to/nx/nx-144-inputs-optional-npm-scope-project-graph-cache-directory-and-more-4fe7

[^30]: https://socket.dev/blog/pnpm-9-5-introduces-catalogs-shareable-dependency-version-specifiers

[^31]: https://github.com/pnpm/rfcs/blob/main/text/0001-catalogs.md

[^32]: https://turborepo.ai/docs/reference/run

[^33]: https://nx.dev/docs/technologies/angular/introduction

[^34]: https://classic.yarnpkg.com/lang/en/docs/workspaces/

[^35]: https://www.docs4dev.com/docs/yarn/3.1.1/features/constraints.html

[^36]: https://yarn.dev.org.tw/features/constraints

[^37]: https://alternativeto.net/software/rush-monorepo/

[^38]: https://www.fullstack.com/labs/resources/blog/monorepo-maintenance-and-development-with-rush

[^39]: https://github.com/korfuri/awesome-monorepo

[^40]: https://zenn.dev/okmttdhr/articles/96506133e4efa0

[^41]: https://www.reddit.com/r/node/comments/r5e9o0/nx_vs_lerna_vs_rush_can_anyone_comment_on_their/

[^42]: https://v3.yarnpkg.cn/features/workspaces

[^43]: https://github.com/lerna/website/blob/master/index.html

[^44]: https://dev.to/hidaytrahman/outstanding-monorepo-tools-49ae

[^45]: https://medium.com/swlh/creating-and-using-yarn-constraints-2464ba46482a

