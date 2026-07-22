<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 5 — Code Quality \& Consistency Tools

**Recommendation: use ESLint 10 with flat configuration for semantic linting, Prettier 3.9.x (pinned) for formatting, TypeScript strict compiler checks for type correctness, dependency-cruiser for architectural boundaries, Lefthook for fast local hooks, commitlint for Conventional Commits, and cspell 10.x only for human-facing text.** ESLint 10 is the current release as of July 2026 and ESLint 9 reaches end-of-life on 2026-08-06. This remains the most mature, compatible, and enforceable toolchain for a TypeScript monorepo containing Next.js, Expo/React Native, Hono, Drizzle, and shared packages.[^1][^2][^3][^34]

Do **not** replace ESLint with Biome or Oxlint as the canonical linter in the initial build. Both are promising and fast—Oxlint 1.74.0 has built-in Next.js, React, Import, and JSX-a11y rules plus an ESLint-compatible JS plugin API, while Biome 2.4.15 covers ~80–94% of common ESLint/TypeScript rules—but Life OS still needs ecosystem-complete React, React Native/Expo, Next.js, TypeScript, import-boundary, custom rules, and architectural-boundary checks more than it needs a faster single-tool check.

## Quality Layers

No single tool provides “code quality.” Each layer protects against a different failure mode:


| Layer | Primary tool | What it prevents |
| :-- | :-- | :-- |
| Type correctness | TypeScript compiler | Invalid assumptions about data shapes, nullable values, API contracts |
| Runtime input correctness | Zod schemas | Untrusted request, webhook, OAuth, environment, and offline-command payloads |
| Semantic linting | ESLint | Unsafe patterns, React hook mistakes, unintended promises, import misuse |
| Formatting | Prettier | Style churn and subjective formatting debates |
| Architectural boundaries | dependency-cruiser | Illegal app/package imports and circular dependency growth |
| Local feedback | Lefthook + staged-file commands | Avoidable bad commits reaching CI |
| Commit history | commitlint | Inconsistent/ambiguous commit messages |
| Documentation hygiene | cspell | Misspellings in docs, user-visible strings, names, and comments |
| CI enforcement | GitHub Actions | Bypass-resistant quality gates |

This division is important for Life OS: a perfectly formatted and type-correct task command can still be unsafe if it bypasses authorization, imports a server-only package into mobile, or accepts a malformed Calendar webhook. Quality tooling complements — but never replaces — runtime validation, RLS, transaction boundaries, and tests.[^4][^5]

## Linting Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **ESLint 10 flat config** | Current supported release; flat config is the only format in v10; `defineConfig`/`globalIgnores` simplify setup; full plugin ecosystem (`typescript-eslint` v8, `eslint-plugin-react` v7.37+, `eslint-plugin-react-hooks` v7, `jsx-a11y` v6.10, `import`/`import-x`, Next.js 16 flat, Expo SDK 53+ flat); supports custom rules and type-aware linting | Slower than Rust-based alternatives; v10 drops legacy `.eslintrc`; some transitive plugins (e.g. `eslint-plugin-import` 2.32) still declare peer ranges that top out at ESLint 9, producing warnings | **Select for canonical semantic linting** |
| Biome 2.4.15 | One fast Rust binary for lint+format+import sort; simple `biome.json`; ~80–94% rule coverage for standard React/TypeScript; built-in type-aware linting (Biotype) | No mature Next.js/Expo/RN-specific plugin parity; no `import/no-cycle`; custom rules via GritQL are v1 and not production-ready; no Markdown/YAML/TOML formatting | Defer as optional future formatter/lint accelerator |
| Oxlint 1.74.0 | Very fast Rust-based linting; 840+ built-in rules; built-in Next.js, React, React Hooks, Import, JSX-a11y, Unicorn, Jest/Vitest; JS plugin API alpha lets many ESLint plugins run unmodified; type-aware mode via tsgolint; community `oxlint-plugin-react-native` available | JS plugins still alpha; no custom type-aware rules; limited framework file support (Vue/Svelte/Astro); Windows OOM reports; not a drop-in replacement for custom architectural rules or dependency-cruiser | **Adopt as optional fast pre-check**; keep ESLint authoritative |
| StandardJS | Minimal configuration | Too opinionated and insufficiently configurable for cross-platform architecture | Reject |
| Rome | Historically aimed to unify tooling | Superseded by Biome; not a distinct selection | Reject |
| TSLint | Legacy TypeScript linter | Deprecated in favor of ESLint | Reject |

ESLint’s flat configuration is the only supported model as of ESLint 10, consolidating settings into an `eslint.config.*` file and simplifying the former cascading configuration approach. Use `defineConfig` and `globalIgnores` from `eslint/config`, and install `typescript-eslint` as the single v8+ package.[^6][^1][^35]

Biome 2.4.15 can statically lint and auto-fix common modern-code errors across multiple languages, but its value is strongest when its rules fully cover a project’s requirements. Life OS should not make that bet while React Native, Expo, Next.js, and custom monorepo boundaries are foundational.[^7]

## Why ESLint Wins

ESLint is not selected because it is fastest; it is selected because it is the most complete policy engine for this stack.

It supports:

- TypeScript and JSX/TSX linting.
- React Hooks correctness.
- Next.js 16+ rules and client/server component conventions via `eslint-config-next/flat`.
- Expo SDK 53+ / React Native checks via `eslint-config-expo/flat` and compatible plugins.
- Accessibility linting for web UI.
- Import ordering, duplicate import detection, and type-only import discipline.
- Promise, error-handling, and unsafe TypeScript checks.
- Custom rules when a Life OS-specific invariant becomes important.
- Per-directory configurations for backend, web, mobile, scripts, and shared packages.

Use ESLint for **semantic errors and enforceable engineering rules**, not formatting. Prettier’s role is formatting; combining formatting rules into ESLint produces duplicated work, slower checks, and conflicting diagnostics. Prettier configuration is discovered from the formatted file’s location, which suits monorepos when the repository maintains one root policy.[^2]

## Recommended ESLint Configuration

Use one root `eslint.config.mjs`, supported by scoped config helpers in `packages/config`, with explicit file globs rather than separate hidden configurations in each workspace.

```text
life-os/
├── eslint.config.mjs
├── prettier.config.mjs
├── cspell.config.yaml
├── commitlint.config.cjs
├── lefthook.yml
└── packages/
    └── config/
        ├── eslint/
        │   ├── base.mjs
        │   ├── backend.mjs
        │   ├── mobile.mjs
        │   ├── web.mjs
        │   └── shared.mjs
        └── tsconfig/
```

Use ESLint 10's `defineConfig` and `globalIgnores` helpers (both from `eslint/config`) and the single-package `typescript-eslint` v8+ setup. Apply configuration segments in this order:

1. Global ignores.
2. JavaScript/TypeScript base recommended rules.
3. Type-aware rules only for package/app source files with valid project references.
4. Web/Next.js/React-specific rules.
5. Mobile/Expo/React Native-specific rules.
6. Backend/Node-specific rules.
7. Test and script overrides.
8. Prettier compatibility configuration last, disabling only style rules that conflict with Prettier.

### Baseline Rules

Set these as errors unless an explicitly documented exception applies:

```text
@typescript-eslint/no-explicit-any
@typescript-eslint/no-floating-promises
@typescript-eslint/no-misused-promises
@typescript-eslint/consistent-type-imports
@typescript-eslint/no-unnecessary-condition
@typescript-eslint/switch-exhaustiveness-check
@typescript-eslint/no-unsafe-assignment
@typescript-eslint/no-unsafe-argument
@typescript-eslint/no-unsafe-member-access
@typescript-eslint/no-unsafe-return
@typescript-eslint/no-unsafe-call
eqeqeq
curly
no-console
no-duplicate-imports
no-restricted-imports
import-x/no-cycle
import-x/no-duplicates
import-x/order
```

Several of these require type-aware linting. Apply them to `src/**` code, not generated files, configuration files, lightweight scripts, or test fixtures by default. Type-aware linting can be slower and more complex in a monorepo, but it is justified for the backend, planning engine, sync command processor, and domain packages where accidental unsafe values carry real correctness and privacy risk.

For ESLint 10 flat config, prefer the maintained `eslint-plugin-import-x` fork over `eslint-plugin-import` to avoid legacy peer-dependency warnings and gain native flat-config support. Apply `eslint-config-prettier/flat` as the final config segment to disable any stylistic rules that conflict with Prettier.

### Rule Exceptions

Use explicit, narrow exceptions — never global weakening.


| Location | Reasonable exception |
| :-- | :-- |
| `apps/backend/src/observability/**` | Permit controlled logging methods; enforce centralized redaction wrapper |
| `tooling/scripts/**` | Permit `console`; retain no-secret policy |
| `**/*.test.ts` and fixtures | Permit narrower `any`/unsafe patterns only if fixtures require it |
| Database migrations | Permit SQL/driver-specific constructs; prohibit production credentials |
| Framework config files | Relax type-aware rules where config libraries use dynamic shapes |
| Generated code | Ignore entirely; never hand-lint or hand-edit |

## Formatting Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Prettier 3.9.x** | De facto JavaScript/TypeScript formatter; strong editor/IDE support; predictable; supports 20+ languages including TypeScript, JSON, YAML, Markdown, CSS; stable release line as of July 2026 | Can be slower than Rust-based alternatives; intentionally limited configuration; Prettier 3.9 changed parsers and can produce diffs on minor upgrades—pin exact version | **Select** |
| Biome 2.4.15 formatter | Very fast; integrated linter/formatter/import organizer; single `biome.json`; ~97% Prettier-compatible output | Introducing it alongside ESLint creates formatter migration and plugin-coverage considerations; no Markdown/YAML/TOML formatting | Defer |
| Oxfmt 0.59.0 | Rust-based, Prettier-compatible (100% JS/TS conformance claimed); ~30× faster than Prettier; built-in import sorting | Still beta; Prettier plugin support incomplete; not yet proven at scale | Defer until stable |
| ESLint formatting rules | Same command as lint | Slow; conflicts with Prettier; mixes subjective style with correctness | Reject |
| dprint 0.55.1 | Fast, configurable, WASM plugin system; broad language support (Markdown, TOML, Dockerfile) | Smaller ecosystem and extra configuration; not as battle-tested for JS/TS as Prettier | Reject |
| No enforced formatter | No tool setup | Diff noise, review friction, style inconsistency | Reject |

Prettier is intentionally opinionated. Its purpose is to eliminate formatting decisions rather than encode them into an expansive style guide. It supports repository configuration files, with resolution beginning from the formatted file’s path. Pin the exact version (e.g. `3.9.6`) because Prettier 3.9 changed parsers (Markdown, YAML, GraphQL, Flow) and can produce diffs on minor upgrades; Prettier 4 is not yet GA.[^8][^2][^36]

### Prettier Policy

Use one root `prettier.config.mjs` and minimize deviations from defaults:

```js
export default {
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  semi: true,
  printWidth: 100,
  endOfLine: 'lf',
};
```

Treat this as a starting point, not a stylistic debate. `printWidth` is not a hard maximum; it is Prettier’s preferred wrapping target. Do not introduce import-ordering or Tailwind sorting plugins unless the UI architecture actually adopts their ecosystem.

Commands:

```bash
pnpm format          # Prettier writes changes locally
pnpm format:check    # Prettier --check in CI
pnpm lint            # ESLint semantic rules
pnpm typecheck       # tsc --noEmit
```


## Architecture Boundary Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **dependency-cruiser** | Enforces import direction and detects cycles; works independently of build framework; suited to custom pnpm package graph | Requires careful rule configuration; does not replace code review or package `exports` boundaries | **Select** |
| ESLint import rules only | Already part of lint configuration; catches basic cycles and restricted paths | Harder to model full multi-package architecture and transitive rules cleanly | Use as complement |
| Nx module-boundary rules | Strong boundary primitives | Would effectively pull Nx into the toolchain only for one feature | Reject |
| TypeScript project references alone | Can model build boundaries | Do not prevent all runtime/deep imports or enforce domain architecture | Insufficient |
| Manual review only | No configuration effort | Fails as codebase/team grows; violations discovered late | Reject |

The original technical plan specifically requires that packages cannot import from apps, apps cannot import directly from each other, and server/database code cannot enter frontend packages.  dependency-cruiser should enforce those rules in both local checks and CI.[^9]

### Required Boundary Rules

```text
1. apps/* may import packages/* through package public exports only.
2. packages/* must never import apps/*.
3. packages/shared may import no framework, Node, ORM, or database modules.
4. packages/calendar-engine may import packages/shared only.
5. packages/ui may import packages/shared and approved UI dependencies only.
6. apps/web and apps/mobile must not import packages/database.
7. apps/web and apps/mobile must not import backend-only integrations.
8. apps/* must not import directly from another app.
9. No circular dependency may cross package boundaries.
10. Deep imports outside documented package exports are forbidden.
```

For the mobile app’s PowerSync integration, introduce a dedicated `packages/mobile-data` or constrained client-schema export rather than making the full `packages/database` package broadly available. This preserves shared schema value without leaking server data access, migrations, or PostgreSQL-specific behavior into clients.[^5][^4]

## Git Hooks Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Lefthook 2.1.x** | Fast Go binary; cross-platform; supports staged-file commands (`{staged_files}`), parallel hooks, glob filters, auto re-staging, and flexible skip/configuration behavior | One more tool to install; local hooks can still be bypassed | **Select** |
| Husky 9 + lint-staged | Familiar JavaScript workflow; many examples; lint-staged widely used for staged-file filtering | More Node-script glue; generally slower/more fragile in complex monorepos; v8→v9 migration was breaking | Reject |
| simple-git-hooks | Minimal setup; reads from `package.json` | No staging filtering, no parallel execution, no CLI; requires re-running installer after config changes | Reject |
| No hooks | Zero local overhead | More avoidable CI failures; slower feedback loop | Reject |

Lefthook supports configurable Git hooks and can run command groups in parallel, making it appropriate for fast staged-file checks.  Hooks are developer feedback only; CI must enforce all critical quality gates because hooks can be skipped.[^3]

### Hook Policy

```yaml
pre-commit:
  parallel: true
  commands:
    prettier:
      glob: '*.{js,cjs,mjs,ts,tsx,json,yml,yaml,md}'
      run: pnpm exec prettier --write {staged_files}
      stage_fixed: true
    eslint:
      glob: '*.{js,cjs,mjs,ts,tsx}'
      run: pnpm exec eslint --fix {staged_files}
      stage_fixed: true
    cspell:
      glob: '*.{ts,tsx,md}'
      run: pnpm exec cspell --no-progress {staged_files}

commit-msg:
  commands:
    commitlint:
      run: pnpm exec commitlint --edit {1}
```

Do **not** run full type checks, full tests, E2E, migrations, or entire Turbo builds in a pre-commit hook. They create friction and will be bypassed. Run those in CI and optionally pre-push only when a developer deliberately opts in.

## Commit Message Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Conventional Commits + commitlint** | Clear history; supports changelog/release automation later; common team vocabulary | Some developer friction; can lead to meaningless scopes if over-prescribed | **Select** |
| Lightweight alternatives (whittle, gitfluff, msg-time) | Fast static-binary Conventional Commit linters; lower dependency footprint; whittle auto-normalizes subjects | Smaller ecosystems; less release-automation integration; limited custom scopes | Defer; commitlint remains the safe default |
| Free-form commits | Fastest to write | Inconsistent history and weaker release automation | Reject |
| Gitmoji / custom format | Expressive for teams that prefer it | Less standard and less automation-compatible | Reject |
| Squash-only PR titles | Reduces local commit burden | Does not standardize branch history or guarantee good release metadata | Insufficient alone |

Use:

```text
feat:
fix:
docs:
refactor:
test:
chore:
build:
ci:
perf:
security:
```

Example:

```text
feat(calendar): add incremental sync token persistence
fix(sync): preserve offline task completion idempotency
security(auth): restrict workspace claim validation
```

Scopes are optional. Do not force a scope where it adds no clarity. Breaking changes require the normal Conventional Commit `!` marker or footer.

## Spell-Checking Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **cspell 10.x** | Developer-friendly; configurable dictionaries and VS Code extension; catches public-facing mistakes in source, docs, and Markdown; active 10.x release line for Node 22.18+ | Can generate noise from product names, identifiers, and domain terms; slower/heavier than Rust alternatives | **Select, scoped** |
| typos | Fast Rust-based spell checker; low false positives; respects `.gitignore`; great for CI | Smaller dictionary/customization surface; less IDE integration than cspell; not as flexible for product-specific vocabulary | Reject for now; optional for CI speed |
| codespell | Lightweight and simple; good for common misspellings | Less suited to custom technical/product vocabulary; Python-based | Reject |
| No automated spell check | No false positives | Typos reach UI, documentation, and schema names | Reject |

Use cspell only on documentation, Markdown, UI copy sources, comments, and selected TypeScript. Maintain a repository dictionary for approved terms such as `PowerSync`, `Tamagui`, `Supabase`, `Inngest`, `Drizzle`, `LifeGraph`, and product-specific entity names. Never add a broad “ignore all camelCase identifiers” rule; instead, restrict cspell’s glob scope when false positives become unproductive.

## Security-Specific Quality Rules

Life OS needs rules beyond normal application style:

- Ban `console.*` outside controlled tooling and centralized logging adapters.
- Ban direct `process.env` access outside app-specific `env.ts`.
- Ban direct imports of the raw database client outside approved repositories/modules.
- Ban client imports of server-only dependencies.
- Restrict `fetch` wrappers: API requests must go through the typed client or approved integration adapter.
- Prohibit raw analytics/event emission except through a sanitized analytics wrapper.
- Prohibit raw Sentry capture except through an error-reporting wrapper that scrubs data.
- Prohibit `dangerouslySetInnerHTML` except in a reviewed, sanitized rich-text rendering boundary.
- Require `await`/handling for promises in backend command processing, outbox dispatch, and calendar synchronization.
- Require exhaustive `switch` handling on command/event/entity union types.
- Require named constants for public event names and metrics, rather than scattered string literals.

Enforce some through ESLint’s `no-restricted-imports`, some through dependency-cruiser, and the rest through reviews and tests. Do not attempt to encode every design principle in a lint rule on day one.

## Suggested Root Scripts

```json
{
  "scripts": {
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint -- --fix",
    "lint:fast": "oxlint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "turbo run typecheck",
    "architecture:check": "dependency-cruiser src apps packages",
    "spellcheck": "cspell lint .",
    "quality": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm architecture:check && pnpm spellcheck",
    "prepare": "lefthook install"
  }
}
```

The exact dependency-cruiser command must be adjusted after the repository has real entrypoints. Avoid a broad `src` assumption at the root because the monorepo has multiple app/package roots.

## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| ESLint 10 over Biome/Oxlint | Current supported release; complete ecosystem and custom policy support | Slower checks and more configuration |
| Oxlint as a fast pre-check | Near-instant feedback on common issues in local hooks and CI | Second tool to maintain; does not replace ESLint |
| Prettier 3.9.x separate from ESLint | Clear responsibility, fewer conflicts, universal editor support | Two commands/tools; must pin exact version |
| Type-aware linting | Catches unsafe TypeScript patterns the compiler may not surface ergonomically | Higher lint time and monorepo tsconfig complexity |
| dependency-cruiser | Prevents architectural erosion | Requires maintained import-rule configuration |
| Lefthook | Fast staged feedback with parallel execution | Hooks can be bypassed; CI remains necessary |
| commitlint | Predictable history and future automated releases | Minor writing friction |
| cspell 10.x | Better documentation and UI quality | Dictionary maintenance/noise |
| Strict baseline | Stronger correctness/privacy posture | More initial rule exceptions and developer education |

## Final Decision

Lock the following quality toolchain:

```text
Type checking:             TypeScript strict; `tsc --noEmit` per package/application
Node.js runtime:           >=20.19.0 (required by ESLint 10)
Semantic linting:          ESLint 10 with root flat config (eslint.config.mjs / .ts)
ESLint config helpers:     `defineConfig` and `globalIgnores` from `eslint/config`; `typescript-eslint` v8+
ESLint scope:              TypeScript-aware rules for product code; scoped overrides for tests/scripts/config
Framework configs:         `eslint-config-next/flat` (Next.js 16+), `eslint-config-expo/flat` (Expo SDK 53+)
Formatting:                Prettier 3.9.x (exact version pinned), root configuration, checked in CI
ESLint/Prettier relation:  Prettier formats; ESLint does not enforce formatting (use `eslint-config-prettier/flat` last)
Import plugin preference:  Prefer `eslint-plugin-import-x` for flat config / ESLint 10 compatibility
Architecture boundaries:   dependency-cruiser + targeted ESLint `no-restricted-imports` / import rules
Fast pre-check (optional): Oxlint 1.74.0 with built-in Next.js/React/Import/JSX-a11y rules and JS plugins alpha
Git hooks:                 Lefthook 2.1.x, staged formatting/lint/spellcheck only
Commit conventions:        Conventional Commits enforced by commitlint
Spell checking:            cspell 10.x, scoped to docs/UI copy/comments and maintained dictionary
CI policy:                 Every quality command is authoritative in CI; hooks are convenience only
Future tools:              Reassess Biome 2.x or Oxfmt once their Next.js/Expo/plugin coverage is complete
```

The next category in the dependency order is **Development Environment \& Containerization**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33]</span>

<div align="center">⁂</div>

[^1]: https://eslint.org/docs/latest/use/configure/configuration-files

[^2]: https://prettier.io/docs/configuration

[^3]: https://lefthook.dev/configuration/Hook.html

[^4]: 07-Technical-Architecture-Fundamentals.md

[^5]: 06-Data-Model-Life-Graph.md

[^6]: https://eslint.org/blog/2022/08/new-config-system-part-2/

[^7]: https://biomejs.dev/linter/

[^8]: https://prettier.io/docs/options

[^9]: 12-Development-Practices.md

[^10]: https://eslint.org/docs/latest/use/configure/migration-guide

[^11]: https://github.com/angular-eslint/angular-eslint/blob/main/docs/CONFIGURING_FLAT_CONFIG.md

[^12]: https://raulmelo.me/en/blog/migration-eslint-to-flat-config

[^13]: https://allalmohamedlamine.medium.com/eslint-flat-config-and-new-system-an-ultimate-deep-dive-2023-46aa151cbf2b

[^14]: https://eslint.org/blog/2023/10/flat-config-rollout-plans/

[^15]: https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/

[^16]: https://dev.to/aolyang/eslint-9-flat-config-tutorial-2bm5

[^17]: https://techfordev.netlify.app/articles/3587216

[^18]: https://eslint.org/docs/latest/extend/plugin-migration-flat-config

[^19]: https://dev.to/psychosynthesis/new-eslint-flat-config-file-format-example-217c

[^20]: https://medium.com/@sofiyanaidu/eslint-v9-flatconfig-8a4faa1059e6

[^21]: https://gist.github.com/kesor/616a529f783571d01a94f0f03edc747d

[^22]: https://www.youtube.com/watch?v=DqfQ4DPnRqI

[^23]: https://www.kimsereylam.com/typescript/2019/11/29/setup-prettier-for-typescript.html

[^24]: https://khalilstemmler.com/blogs/tooling/prettier/

[^25]: https://github.com/prettier/prettier/commit/b55e777924538b69c564abea51a42e33597910b9

[^26]: https://www.youtube.com/watch?v=11jpa8e5jEQ

[^27]: https://www.cosmiclearn.com/typescript/prettier.php

[^28]: https://dev.to/viniciuskneves/prettier-eslint-and-typescript-491j

[^29]: https://rich-newman.github.io/typescript-analyzer-eslint-prettier/formatting.html

[^30]: https://oneuptime.com/blog/post/2026-02-03-eslint-prettier-typescript/view

[^31]: https://stackoverflow.com/questions/61731587/vscode-prettier-doesnt-format-tsx-file

[^32]: https://cloud.tencent.com/developer/article/2418985

[^33]: https://medium.com/@robinviktorsson/setting-up-eslint-and-prettier-for-a-typescript-project-aa2434417b8f

[^34]: https://eslint.org/version-support/ (ESLint 10 current; ESLint 9 EOL 2026-08-06)

[^35]: https://typescript-eslint.io/getting-started/ (`typescript-eslint` v8+ flat config quick-start)

[^36]: https://prettier.io/blog/2026/06/27/3.9.0 and https://github.com/prettier/prettier/releases (Prettier 3.9 release notes and exact-version pinning guidance)

