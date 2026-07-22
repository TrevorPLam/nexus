## Category 1 — Language \& Runtime

**Recommendation: retain strict TypeScript as the sole product language and use Node.js 24.x LTS for backend execution.** As of July 2026, Node.js 24.x is the Active LTS release, 22.x is in Maintenance LTS, and 26.x is Current until it enters Active LTS in October 2026. TypeScript + Node.js remains the best fit for Life OS because its planned web, mobile, backend, shared domain packages, Drizzle schemas, PowerSync client, and Tamagui design system all operate in the TypeScript/JavaScript ecosystem. Expo SDK 54 and React Native 0.81 default to TypeScript in current tooling.[^1][^13][^12]

This is a **locked foundational decision**, not an open decision. The research should refine its operating rules rather than reopen the language choice.

## Decision Criteria

For Life OS, the language must support:

- One practical language across Next.js web, Expo/React Native mobile, backend, database schema, planning engine, API contracts, and shared UI.
- Strict correctness for the Life Graph, planning algorithm, authorization boundaries, offline commands, and calendar synchronization.
- Mature integrations with the chosen stack: Expo, React Native, Next.js, Hono, Drizzle, Zod, PowerSync, Clerk, Supabase, and Tamagui.
- Fast iteration for a small founding team, without creating service-to-service language boundaries.
- A credible long-term ecosystem for a privacy-sensitive, mobile-first consumer subscription product.


## Viable Options

| Option | Strengths | Weaknesses | Fit for Life OS |
| :-- | :-- | :-- | :-- |
| **TypeScript + Node.js LTS** | One language throughout the selected stack; mature React/Expo/Next.js ecosystem; shared types and validation; PowerSync Drizzle driver aligns with TypeScript; Node 24.x is Active LTS and native type stripping is stable as of Node 24.12+/25.2+[^7][^12] | Compile-time types do not guarantee runtime validation; structural typing can be misused; Node needs deliberate CPU-job boundaries; production builds still require `tsc`/bundler because Node stripping does not type-check or support JSX/enum/namespace[^7][^19] | **Best overall** |
| JavaScript + Node.js | Maximum package compatibility; no compile step for simple scripts; runs with native type stripping | Removes the central safety mechanism for graph entities, API contracts, RLS-adjacent code, and cross-app models | Reject |
| TypeScript + Bun | Single binary runtime, package manager, bundler, and test runner; executes full TypeScript (enums, decorators, namespaces) natively; very fast install and cold start; Anthropic backing in 2026[^14] | ~90–96% Node.js API compatibility; native addons and some npm packages fail; no `pnpm` workspace/`workspace:*` alignment; Next.js/Expo/EAS not validated on Bun; newer runtime | Reject for core stack; optional isolated tooling only |
| TypeScript + Deno | Secure-by-default runtime with built-in TypeScript, linter, formatter, and test runner; Node compatibility advanced to Node 26 target in Deno 2.9; `npm:` specifiers and `package.json` supported[^15] | ~89% npm package pass rate; Next.js/Expo not fully supported; permission model adds friction; `tsconfig`/`workspace:*` not fully aligned; small ecosystem vs Node | Reject for core stack; optional isolated tooling only |
| Kotlin / Kotlin Multiplatform | Excellent type system and native mobile capabilities; K2 compiler stable; Compose Multiplatform for iOS stable; Swift Export improves iOS interop; strong Android ecosystem[^20] | Would require a separate web stack, separate UI approach, and JavaScript/TypeScript bridges for Expo/Next.js/Tamagui/Drizzle/PowerSync; iOS builds require macOS; smaller web ecosystem | Reject for this architecture |
| Dart + Flutter | Coherent single-language mobile UI; Flutter 3.44 (May 2026) makes Impeller default on Android, SwiftPM default on iOS, and supports multi-window desktop previews; strong rendering and AI/GenUI direction[^16][^3] | Does not fit React Native, Expo, Next.js, Tamagui, Drizzle, or the selected web/backend ecosystem; would split the project stack | Reject |
| C\# + .NET MAUI | Strong static typing; .NET 11 (GA Nov 2026) moves MAUI mobile to CoreCLR only, unifying runtime with ASP.NET Core; targets Android/iOS/macOS/Windows[^17][^2] | Does not serve the selected React/Expo/Next.js ecosystem; CoreCLR transition still preview until Nov 2026; cross-platform UI targets differ from web-first planning architecture | Reject |
| Rust for backend/core engine | Memory safety and high performance; Axum/Actix-web ecosystem mature in 2026; useful for future computational hotspots[^22] | Adds a second language and FFI/serialization boundary; compile times and async learning curve; unnecessary for the MVP planning engine and modular monolith | Defer; optional future optimization only |
| Go for backend | Simple deployment, excellent concurrency, and strong gRPC/Connect-RPC ecosystem in 2026[^21] | Breaks type/model sharing with web and mobile; requires duplicate schemas/contracts | Reject |
| Python for backend/AI | Broad AI/ML ecosystem and quick prototyping; FastAPI is the default for new Python APIs in 2026[^23] | Splits models, validation, and runtime; not justified while AI is explicitly outside V1 | Reject for core stack; optional isolated future worker only |

Flutter is a valid option for teams choosing a Dart-first product stack, while .NET MAUI can target Android, iOS, macOS, and Windows; neither offers a reason to abandon the React/TypeScript ecosystem already required by Life OS’s chosen UI and sync architecture.[^2][^3]

## Why TypeScript Wins

### End-to-end model integrity

Life OS has unusually high cross-layer model complexity: a task can have dates, recurrence, duration, commitments, links, commands, offline mutations, audit events, and planning projections. The same concepts must remain consistent among mobile SQLite, PostgreSQL, API payloads, shared planning logic, and UI state.

Strict TypeScript allows a single domain vocabulary to be shared through `packages/shared`, while Drizzle can infer database-facing types from schemas. That substantially reduces schema drift, duplicate DTO definitions, and integration mistakes compared with a multi-language architecture. The project documents already rely on this advantage, particularly because PowerSync’s Drizzle driver can align the mobile local schema with server definitions.[^4][^5]

### Small-team speed

A TypeScript-only team can move a domain feature from database schema through API, planning engine, mobile, and web without switching languages or staffing separate platform-specialist teams. This directly supports the stated constraint that Life OS must advance from a narrow planning MVP without premature architectural overhead.[^6][^4]

### Ecosystem alignment

The proposed stack is TypeScript-native or TypeScript-first at every important boundary:

- **Web:** Next.js / React.
- **Mobile:** Expo / React Native, whose current project templates use TypeScript by default.[^1]
- **Backend:** Node.js / Hono.
- **Validation:** Zod.
- **Database:** Drizzle and `drizzle-kit`.
- **Sync:** PowerSync’s Drizzle driver.
- **UI:** Tamagui.
- **Testing:** Vitest, Playwright, and most Expo testing workflows.

Changing the language would therefore create friction with several committed choices at once, not simply replace one tool.

## TypeScript Trade-Offs

TypeScript is not a runtime security mechanism. Types disappear when code executes, so external input remains untrusted — including requests, Clerk JWT claims, Google Calendar payloads, PowerSync commands, webhook events, environment variables, database JSON, and eventually AI outputs.

**Required mitigation:** retain a clear division of responsibility:


| Concern | Required mechanism |
| :-- | :-- |
| Internal domain code | Strict TypeScript types |
| External payloads | Zod parsing at every trust boundary |
| Database integrity | PostgreSQL constraints, foreign keys, transactions, and RLS |
| Authorization | Supabase RLS plus server-side policy checks |
| API input | Zod-validated request schemas |
| Environment configuration | `@t3-oss/env-core` + Zod |
| Offline mutations | Typed command objects plus server-side validation and idempotency |
| Background jobs | Typed event schemas, outbox persistence, and idempotent handlers |

This is especially important because Node’s native TypeScript execution strips erasable syntax but **does not type-check code at runtime**. It also cannot run TypeScript constructs requiring transformation, including enums, parameter properties, runtime namespaces, or JSX.[^7]

## Runtime Decision

### Node.js LTS: retain

Use **Node.js 24.x LTS** for the Hono modular-monolith backend, jobs, migrations, scripts, and shared tooling. As of July 2026, Node.js 24.x is the Active LTS release (codename Krypton), Node.js 22.x is in Maintenance LTS, and Node.js 26.x is Current until it enters Active LTS on 2026-10-28. Node is the only runtime choice that preserves direct compatibility with every selected backend dependency while avoiding a second language or compatibility layer. The project’s backend is intentionally a single Node service so shared validation and planning logic can be reused across the stack.[^4][^12]

Node supports native execution of TypeScript files by *stripping* erasable type syntax. Type stripping is enabled by default on Node 22.18.0+ and 23.6.0+, declared stable in Node 24.12.0+/25.2.0+, and is the only native TypeScript mode in Node 26 (the `--experimental-transform-types` flag was removed). Node does **not** type-check, does not read `tsconfig.json`, and does not support JSX, `enum`, `namespace`, decorators, parameter properties, or import aliases.[^7][^19]

### Do not use native type stripping as production build strategy

Native type stripping is useful for small developer scripts, but it should **not** replace the existing build and verification pipeline for Life OS.

Reasons:

- It does not type-check, so CI must still run `tsc --noEmit`.
- It does not support JSX, which matters for React-based applications.
- It excludes constructs that need transformations (`enum`, `namespace`, parameter properties, decorators, import aliases).
- Next.js, Expo, and bundling/deployment tools already own their production compilation pipelines.
- Node 26 only supports erasable syntax; any code relying on transformed features must pre-compile.

**Practical policy:**

- Use Next.js tooling for web compilation.
- Use Expo/Metro and EAS tooling for mobile compilation.
- Use a conventional backend build output for the Hono service, such as `tsc` output or a bundler appropriate to the eventual deployment platform.
- Permit native Node TypeScript execution only for carefully constrained tooling scripts, with `erasableSyntaxOnly` enabled if adopting it. TypeScript 5.8 introduced that compiler option specifically to flag syntax that Node’s type-stripping path cannot execute.[^8]


## Required TypeScript Standard

Adopt the following as the category decision:

```json
{
  "language": "TypeScript",
  "typescriptMode": "strict",
  "typescriptVersion": "5.9+ (evaluate 6.0 only after monorepo/package-management compatibility is confirmed)",
  "runtime": "Node.js 24.x LTS (Active LTS as of 2026-07-21; Node 26.x enters LTS 2026-10-28)",
  "moduleSystem": "ESM",
  "moduleResolution": "nodenext or bundler; avoid deprecated moduleResolution node/node10",
  "runtimeValidation": "Zod at every external trust boundary",
  "enums": "Avoid; use const objects and union types",
  "sharedContracts": "packages/shared",
  "databaseContracts": "Drizzle-inferred types, never hand-copied",
  "typeChecking": "tsc --noEmit in CI",
  "nativeNodeTypeStripping": "Permitted for constrained tooling only, not application builds"
}
```

TypeScript 5.9 supports `import defer`, a stable `--module node20` mode, and the `erasableSyntaxOnly` option. TypeScript 6.0 shipped in 2026 as a transition release toward the native-port TypeScript 7.0; it changes defaults (`strict` true, `module` esnext, `target` es2025, `types` []) and deprecates `target: es5`, `--moduleResolution node`/`node10`, `amd`/`umd`/`systemjs` `module` values, `--downlevelIteration`, `--outFile`, and `module Foo { ... }` namespace syntax. For Life OS, TypeScript 5.9+ is the safe choice; adopt 6.0 only after the monorepo/package-management category pins exact versions and confirms all selected tools support it.[^9][^10][^18]

## Strictness Configuration

Use a base `tsconfig.base.json` shared by every workspace. The exact project-specific values will be finalized when the monorepo is researched, but these compiler settings should be non-negotiable:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUncheckedSideEffectImports": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false
  }
}
```

`noUncheckedIndexedAccess` is especially important for graph lookups, map access, external calendar fields, and planning-engine collections because it forces code to account for missing values. `exactOptionalPropertyTypes` prevents ambiguity between an absent field and one explicitly set to `undefined`, which matters for partial updates and offline command payloads. `noUncheckedSideEffectImports` (TypeScript 5.9+) catches typos in side-effect-only imports. If a package needs to run via Node’s native type-stripping path, also set `erasableSyntaxOnly: true` and `rewriteRelativeImportExtensions: true` and keep `target`/`module` as `esnext`/`nodenext`; otherwise use the build pipeline.

## Conventions to Lock Now

- Use `type` for data shapes and `interface` only when deliberate extension or declaration merging is needed.
- Use discriminated unions for entity states and command types, for example `TaskStatus`, `PlanProfile`, and `LifeCommand`.
- Use `as const` objects plus union types instead of TypeScript `enum`.
- Never use `any`; allow `unknown` only at external boundaries and narrow it through Zod or explicit guards.
- Keep types that cross packages serializable and runtime-validated.
- Separate API transport types from database selection types and UI-only view models.
- Treat inferred Drizzle types as persistence-layer types, not automatically as public API contracts.
- Never treat client-side TypeScript as authorization; authorization remains database and server enforced.


## Final Decision

**Select: TypeScript in strict mode across the entire application, with Node.js 24.x LTS as the backend/runtime foundation.** As of July 2026, Node 24.x is the Active LTS release and Node 26.x becomes Active LTS in October 2026; adopt Node 26 only after the ecosystem (Hono, Drizzle, PowerSync, Inngest, etc.) has validated against it. Keep TypeScript at 5.9+; evaluate 6.0 only after the monorepo/package-management category pins exact versions and confirms all selected tools support it.[^11][^9][^12]

**Reject for core development:** JavaScript-only, TypeScript + Bun, TypeScript + Deno, Kotlin Multiplatform, Flutter/Dart, .NET MAUI/C\#, Go, Python, and Rust. They each either reduce cross-layer type sharing, require abandoning multiple aligned choices, or introduce runtime-compatibility risk for the selected stack.
<div align="center">⁂</div>

[^1]: https://reactnative.dev/docs/typescript

[^2]: https://learn.microsoft.com/en-us/dotnet/maui/supported-platforms?view=net-maui-10.0

[^3]: https://docs.flutter.dev/learn

[^4]: 07-Technical-Architecture-Fundamentals.md

[^5]: 08-Key-Technical-Decisions-Rationale.md

[^6]: 01-Product-Vision-Core-Philosophy.md

[^7]: https://nodejs.org/api/typescript.html

[^8]: https://limulus.net/tils/nodejs/type-stripping/

[^9]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html

[^10]: https://www.infoq.com/news/2025/08/typescript-5-9-released/

[^11]: 14-Dependencies-Tooling-Third-Party-Platforms.md

[^12]: https://github.com/nodejs/release/ (Node.js release schedule, July 2026)

[^13]: https://expo.dev/changelog/sdk-54 (Expo SDK 54 — React Native 0.81, TypeScript ~5.9.2, September 2025)

[^14]: https://bun.com/docs/runtime/nodejs-compat (Bun Node.js compatibility, 2026)

[^15]: https://docs.deno.com/runtime/fundamentals/node.md (Deno Node.js compatibility, Deno 2.9, July 2026)

[^16]: https://blog.flutter.dev/whats-new-in-flutter-3-44-b0cc1ad3c527 (Flutter 3.44, May 2026)

[^17]: https://devblogs.microsoft.com/dotnet/coreclr-progress-and-mono-timeline-dotnet-maui/ (.NET MAUI CoreCLR transition, .NET 11 Preview 6, July 2026)

[^18]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html (TypeScript 6.0 release notes, 2026)

[^19]: https://codewithnodejs.com/running-typescript-natively-in-node-js-22-24-and-26/ (Node.js native TypeScript execution across Node 22/24/26, 2026)

[^20]: https://www.aetherius-solutions.com/blog-posts/kotlin-multiplatform-production-2026 (Kotlin Multiplatform in production, 2026)

[^21]: https://www.youngju.dev/blog/culture/2026-05-16-go-ecosystem-tokio-echo-gin-fiber-chi-sqlc-pgx-ent-cobra-bubbletea-buf-2026-deep-dive.en (Go ecosystem 2026)

[^22]: https://www.youngju.dev/blog/culture/2026-05-16-rust-web-backend-frameworks-2026-axum-actix-web-rocket-poem-loco-pavex-salvo-warp-hyper-deep-dive.en (Rust web backend frameworks, 2026)

[^23]: https://mecanik.dev/en/posts/python-web-framework-comparison-2026-django-vs-flask-vs-fastapi/ (Python web framework comparison, 2026)

