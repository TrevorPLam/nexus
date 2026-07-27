# TypeScript

## Overview
TypeScript is a strongly typed programming language that builds on JavaScript, providing static type checking, enhanced IDE support, and improved code maintainability while remaining fully compatible with JavaScript.

## Latest Versions (2026)

**Current:** TypeScript 7.0.x (GA July 8, 2026)
- **7.0**: Native Go port, 8-12x faster, no stable API (deferred to 7.1)
- **6.0**: Bridge release (March 2026), last JavaScript-based version
- **5.9**: Stable release (August 2025)

### Version Highlights

**7.0**: Native Go compiler, hardened defaults (`strict: true`, `module: esnext`, `types: []`), removed options (`target: es5`, `moduleResolution: node/node10`, `baseUrl`)

**5.9**: Minimal `tsc --init`, `import defer`, `--module node20`, DOM API summaries, expandable hovers, cached type instantiations

**5.8**: Return expression branch checks, `require()` of ESM (nodenext), `--module node18`, `--erasableSyntaxOnly`, computed property names preservation

**6.0**: `--stableTypeOrdering` (25% slower, aids 7.0 migration), es2025 target/lib (RegExp.escape, Promise.try), Temporal API types, DOM lib consolidation, breaking defaults (`strict: true`, `target: es2025`, `types: []`)

## Compatibility

### Node.js Integration
- `--module nodenext`: Latest Node.js (22+), floating target
- `--module node20`: Stable Node.js 20 (implies `--target es2023`)
- `--module node18`: Stable Node.js 18
- `--module node16`: Older Node.js 16
- Node.js 22.6+: Native TS via `--experimental-strip-types`
- Node.js 23.6+: Type stripping default
- `--erasableSyntaxOnly`: Ensure Node.js type stripping compatibility

### Target Environments
- ES2025: Latest features (default in TS 6.0/7.0)
- ES2022: Modern JS (Life OS default)
- ES2020/ES2015: Older environments
- ES5/ES3: Legacy (removed in TS 7.0)

### Build Tools
- esbuild: Fastest transpilation (Go, 10-100x faster than tsc)
- swc: Rust-based, fast transpilation
- Vite: Native TS with esbuild
- Webpack: ts-loader or esbuild-loader
- Babel: @babel/preset-typescript
- tsx: esbuild runner (20ms cold start)
- ts-node: tsc-based runner (500ms+ cold start)
- Bun: Native TS runtime (18ms cold start)

## Basics

### Type System
Structural (duck typing): types compared by shape, enabling flexible reuse with type safety.

### Type Inference
```typescript
let count = 42;              // number
const names = ['Alice', 'Bob']; // string[]
const add = (x: number) => x + 1; // (x: number) => number
```

### Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

### Strict Mode
Enables: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `noImplicitAny`, `noImplicitThis`, `strictPropertyInitialization`.

## Implementation

### Setup
```bash
tsc --init
npm install -D typescript @types/node @types/react
```

### Recommended tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

### Type Guards & Assertions
```typescript
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string';
}

function assertIsUser(value: unknown): asserts value is User {
  if (typeof value !== 'object' || value === null || !('name' in value)) throw new Error('Not User');
}
```

### Runtime Validation (Zod)
```typescript
import { z } from 'zod';
const UserSchema = z.object({ id: z.number(), name: z.string().min(1), email: z.string().email(), role: z.enum(['admin', 'user', 'guest']) });
type User = z.infer<typeof UserSchema>;
function validateUser(data: unknown): User { return UserSchema.parse(data); }
```

## Advanced Patterns

### Discriminated Unions
```typescript
type State<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error };
function handleState<T>(state: State<T>) {
  switch (state.status) {
    case 'loading': return <Spinner />;
    case 'success': return <DataDisplay data={state.data} />;
    case 'error': return <ErrorMessage error={state.error} />;
  }
}
```

### Branded Types
```typescript
type UserId = string & { readonly __brand: unique symbol };
function createUserId(id: string): UserId { return id as UserId; }
function getUser(id: UserId) { /* ... */ }
getUser(createUserId('123')); // OK
getUser(createOrderId('456')); // Error
```

### Conditional Types
```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

### Mapped Types
```typescript
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
```

### Template Literal Types
```typescript
type APIRoute = `${'GET' | 'POST' | 'PUT'} ${'/users' | '/posts'}`;
```

### Generic Constraints
```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
```

### Utility Types
`Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, T>`

### Result Pattern
```typescript
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
function ok<T>(data: T): Result<T, never> { return { success: true, data }; }
function fail<E>(error: E): Result<never, E> { return { success: false, error }; }
```

### Exhaustive Checks
```typescript
function assertNever(x: never): never { throw new Error('Unexpected: ' + x); }
function handlePayment(status: 'pending' | 'completed' | 'failed') {
  switch (status) {
    case 'pending': return 'pending';
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    default: return assertNever(status);
  }
}
```

### Type-Safe Event Emitter
```typescript
class TypedEmitter<T extends Record<string, any>> {
  on<K extends keyof T>(event: K, handler: (e: T[K]) => void): void {}
  emit<K extends keyof T>(event: K, data: T[K]): void {}
}

## Anti-Patterns

1. **Overusing `any`**: Use `unknown` with type guards instead
2. **`@ts-ignore`**: Fix types or add proper guards
3. **Unsafe assertions**: Use runtime validation (Zod)
4. **Double assertion**: `as unknown as T` → use type guards
5. **Optional properties everywhere**: Use discriminated unions
6. **`Function` type**: Use specific function signatures
7. **Over-engineered generics**: Use `unknown` when type isn't constrained
8. **Non-null assertion `!`**: Add proper null checks
9. **Boundary assertions**: Validate external data at boundaries
10. **Excess property confusion**: Object literals checked, variables not

## Performance

### Compiler Config
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "moduleDetection": "force"
  }
}
```

### Optimization Strategies
- **skipLibCheck**: 20-50% build time improvement
- **incremental**: Cache compilation state
- **Project references**: Split large codebases (5-20 projects optimal)
- **Composite**: Enable for referenced projects
- **esbuild/swc**: 10-100x faster transpilation
- **isolatedModules**: Better tooling support
- **noEmit**: Skip JS emit when bundler handles it
- **Explicit return types**: Reduce inference work

### Runtime
- Types erased at compile time (zero runtime cost)
- Avoid enums (use `as const` objects)
- Avoid namespaces (use ES modules)

### Profiling
```bash
tsc --extendedDiagnostics
tsc --generateTrace ./trace
hyperfine 'tsc --noEmit' 'tsc --build'
```

## Security

### Runtime Validation (Zod)
```typescript
const ApiSchema = z.object({ userId: z.string().uuid(), action: z.enum(['create', 'update', 'delete']) });
async function handleRequest(request: Request) {
  const data = ApiSchema.parse(await request.json()); // Throws if invalid
}
```

### Environment Variables
```typescript
const EnvSchema = z.object({ DATABASE_URL: z.string().url(), API_KEY: z.string().min(32), NODE_ENV: z.enum(['development', 'production', 'test']) });
function validateEnv() { return EnvSchema.parse(process.env); }
```

### Type-Safe Config
```typescript
const config = { apiUrl: 'https://api.example.com', timeout: 5000, retries: 3 } as const satisfies { apiUrl: string; timeout: number; retries: number };
```

## Monorepo Best Practices

### Project References
```json
// Root tsconfig.json
{ "files": [], "references": [{ "path": "./packages/ui" }, { "path": "./packages/utils" }, { "path": "./apps/web" }] }
```

### Shared Config
```json
// tsconfig.base.json
{ "compilerOptions": { "strict": true, "moduleResolution": "bundler", "target": "ES2022", "skipLibCheck": true } }

// Package tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "composite": true, "declaration": true, "declarationMap": true, "outDir": "./dist", "rootDir": "./src" }, "include": ["src/**/*"] }
```

### Build Mode
```bash
tsc --build           # Build in dependency order
tsc --build --clean   # Clean outputs
tsc --build --watch   # Watch mode
tsc --build --force   # Force rebuild
```

### Type-Only Imports
```typescript
import type { User } from './types';
import { getUser, type User } from './api';
```

### Best Practices
- 5-20 projects optimal
- Split at API boundaries
- Match TypeScript projects to npm packages
- Use `include` over `exclude`
- Isolate output directories

## Troubleshooting

### Common Commands
```bash
tsc --version                    # Check version
tsc --noEmit                    # Type check only
tsc --noEmit src/file.ts        # Check specific file
tsc --extendedDiagnostics       # Performance info
tsc --incremental               # Faster rebuilds
tsc --build                    # Project references
tsc --generateTrace ./trace     # Generate trace
```

### Module Resolution
```json
{ "compilerOptions": { "moduleResolution": "bundler", "verbatimModuleSyntax": true, "allowImportingTsExtensions": true } }
```
**Migration**: `node10` → `nodenext` (Node.js) or `bundler` (frameworks). Add `rootDir: "./src"` if tsconfig outside source.

### Type Definitions
```bash
npm install -D @types/package-name @types/node
// declarations.d.ts: declare module 'some-untyped-package';
```

### TypeScript 7.0 Migration
```json
{ "devDependencies": { "typescript": "npm:@typescript/typescript6@^6.0.2", "@typescript/native": "npm:typescript@^7.0.2" } }
```
**Breaking changes**: `strict: true` default, `types: []` default (add `"types": ["node"]`), `target: es5` removed, `moduleResolution: node/node10` removed, `baseUrl` deprecated.

### Decorators
- TC39 decorators (TS 5.0+): No metadata emit
- Experimental decorators: Require `experimentalDecorators: true`, `emitDecoratorMetadata` works
- `reflect-metadata`: Not supported with TC39 decorators
- Keep experimental for DI frameworks needing metadata

## JavaScript Migration

### Gradual Migration
```json
{ "compilerOptions": { "allowJs": true, "checkJs": false, "outDir": "./dist" } }
```

### JSDoc
```javascript
/** @param {string} name @returns {string} */
function greet(name) { return `Hello, ${name}`; }
```

### Declaration Files
```typescript
declare interface Window { myCustomProperty: string; }
```

### TypeScript Execution
| Tool | Cold Start | Type Check | Use Case |
|------|-----------|-----------|----------|
| tsx | ~20ms | No | Dev scripts |
| Bun | ~18ms | No | Serverless |
| ts-node | ~500ms | Yes | Legacy |
| Node native | ~100ms | No | Zero deps |
| tsc | N/A | Yes | Production |

```bash
npm install -D tsx && npx tsx script.ts
node --experimental-strip-types script.ts  # Node 22.6+
bun run script.ts
```

## Type Coverage

### Tools
```bash
npm install -D type-coverage && npx type-coverage --detail
npm install -D typegap && npx typegap --detail --min-coverage 90
npm install -D typecover && npx typecover src/ --threshold 90
npm install -D ts-analyzer && npx ts-analyzer analyze ./src --format html
```

### CI Integration
```yaml
- name: Type coverage check
  run: npx type-coverage --atLeast 90
- name: Type safety check
  run: npx typegap --min-coverage 85
```

## TypeScript 7.0 Migration Guide

### Prerequisites
1. **Upgrade to 6.0 first**: Address deprecations before 7.0
2. **Check compiler API usage**: Tools importing `typescript` need 6.0 side-by-side
3. **Test decorator frameworks**: NestJS, TypeORM need integration testing

### Steps
```bash
grep -r "moduleResolution.*node" tsconfig*.json
grep -r "target.*es5" tsconfig*.json
grep -r "from ['\\\"]typescript['\\\"]" node_modules
npm install -D typescript@npm:@typescript/typescript6@^6.0.2 @typescript/native@npm:typescript@^7.0.2
# Update tsconfig: strict: true, module: esnext, target: es2025, types: ["node"], rootDir: "./src"
npx tsc --noEmit && npm run build && npm test
```

### Who Can Migrate Now
- **Can migrate**: Projects using `tsc` CLI, language server only
- **Wait for 7.1**: Vue, Angular templates, Svelte, Astro, typescript-eslint

## Resources

- [Official TypeScript Documentation](https://www.typescriptlang.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [TypeScript Evolution](https://devblogs.microsoft.com/typescript/)
- [TypeScript 7.0 Announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript 6.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [Project References](https://www.typescriptlang.org/docs/handbook/project-references)
- [Performance Wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
