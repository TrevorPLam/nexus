# tsx (TypeScript Execute)

## Overview

Fast TypeScript execution engine for Node.js. Uses esbuild for transpilation,
enabling direct TypeScript execution without compilation. Zero-config, supports
CJS/ESM, path aliases, watch mode, and JSX.

## Version & Compatibility

**Version**: `4.23.1` (July 2026)

**Node.js**: 18.0.0+ (supports 18, 20, 22, 24, 25.9.0, 26.1.0+)

**TypeScript**: All versions (respects tsconfig.json)

**Package Managers**: npm, pnpm, yarn, bun

## Core Concepts

- **Type Stripping**: Removes type annotations at runtime (no type checking)
- **esbuild Integration**: Go-compiled transpiler for ~100ms cold start
- **Module Support**: CJS/ESM seamless interop
- **Caching**: Disk cache (7-day retention, lazy indexing)
- **Watch Mode**: Built-in file watching with auto-reload

## Key Features

- Zero-config with sensible defaults
- ~100ms cold start (vs ts-node ~2000ms default, ~200ms with SWC)
- Native ESM support (no flags needed)
- Path aliases via tsconfig.json
- Built-in watch mode
- Source maps for debugging
- JSX transformation
- TypeScript REPL
- Node.js test runner integration

## Basic Usage

```bash
# Run TypeScript file
tsx script.ts

# Watch mode
tsx watch script.ts

# Load env vars
tsx --env-file=.env script.ts

# Custom tsconfig
tsx --tsconfig tsconfig.build.ts script.ts

# Node flags
tsx --inspect script.ts

# Execute string
tsx -e "console.log('Hello')"

# REPL
tsx
```

## Installation

```bash
# Dev dependency (recommended)
npm install -D tsx
pnpm add -D tsx

# Global
npm install -g tsx
```

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "script": "tsx scripts/migrate.ts"
  }
}
```

## TypeScript Configuration

tsx respects `tsconfig.json`. Recommended:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src/**/*", "*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## Path Aliases

tsx resolves tsconfig.json paths:

```typescript
// Instead of:
import { formatter } from '../../utils/formatter';

// Use:
import { formatter } from '@utils/formatter';
```

**Note**: Compile-time only. Production requires bundler or tsc path rewriting.

## Watch Mode

```bash
tsx watch src/index.ts
```

Auto-reloads on changes. Faster than nodemon, zero config.

## Environment Variables

```bash
tsx --env-file=.env script.ts
```

## Type Checking Strategy

**tsx does NOT type-check** - only strips types.

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

Run type checking in pre-commit hooks, CI, and before deployment.

## Advanced Patterns

### CLI Tools

```typescript
// scripts/migrate.ts
#!/usr/bin/env tsx
import { migrate } from "../src/db/migrate";
await migrate();
console.log("Migration complete");
```

```bash
chmod +x scripts/migrate.ts
./scripts/migrate.ts
```

### Test Runners

```json
{
  "scripts": {
    "test": "vitest"
  },
  "devDependencies": {
    "vitest": "*",
    "tsx": "*"
  }
}
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
```

### Monorepo

```bash
pnpm --filter @my-app dev
npm run dev --workspace=@my-app
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["node", "dist/index.js"]
```

```yaml
services:
  app:
    command: pnpm dev
```

### Source Maps

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSources": true
  }
}
```

Stack traces point to TypeScript source, not compiled JS.

## Anti-Patterns

### Production Without Compilation

**BAD**: `"start": "tsx src/index.ts"`

**GOOD**: `"start": "node dist/index.js"`, `"build": "tsc"`

**Why**: Runtime transpilation adds cold-start overhead.

### Skipping Type Checking in CI

**BAD**: CI only runs tests

**GOOD**: CI runs `typecheck` then tests

**Why**: tsx doesn't type-check. Errors accumulate undetected.

### Path Aliases Without Runtime Resolution

**BAD**: `import { utils } from "@utils/helpers"` (runtime can't resolve)

**GOOD**: Use relative imports or bundler with path mapping

**Why**: Path aliases are compile-time only.

### Assuming tsx Type-Checks

**BAD**: `tsx script.ts` (runs with type errors)

**GOOD**: `tsc --noEmit` then `tsx script.ts`

**Why**: tsx strips types without checking, exits 0 on errors.

### Using ts-node Instead of tsx

**BAD**: `"devDependencies": { "ts-node": "*" }`

**GOOD**: `"devDependencies": { "tsx": "*" }`

**Why**: tsx is 5-10x faster, native ESM, zero config.

### Forgetting Source Maps

**BAD**: `"sourceMap": false`

**GOOD**: `"sourceMap": true, "inlineSources": true`

**Why**: Stack traces point to compiled JS without source maps.

### const enum Across Files

**BAD**: `export const enum Status { Active = 1 }` (undefined at runtime)

**GOOD**: Use regular enum or `as const` object

**Why**: esbuild processes files independently, can't inline cross-file.

### emitDecoratorMetadata

**BAD**: Relying on emitDecoratorMetadata

**GOOD**: Use ts-node or avoid decorator metadata

**Why**: esbuild doesn't support (requires TypeScript type system).

### eval() with TypeScript

**BAD**: `eval("some TypeScript code")`

**GOOD**: Avoid eval with TypeScript

**Why**: esbuild doesn't preserve eval() compatibility.

### Mixing ESM/CJS Without Care

**BAD**: `import { something } from "esm-module"` in CJS context

**GOOD**: `const { something } = await import("esm-module")`

**Why**: Explicit dynamic imports clearer for mixed contexts.

### Not Separating Dev/Production

**BAD**: `"start": "tsx src/index.ts"`

**GOOD**: `"dev": "tsx watch"`, `"start": "node dist"`, `"build": "tsc"`

**Why**: Different strategies for performance/reliability.

### Wrong Node.js Version

**BAD**: `"engines": { "node": ">=16.0.0" }`

**GOOD**: `"engines": { "node": ">=18.0.0" }`

**Why**: tsx requires Node.js 18.0.0+.

## Comparisons

### tsx vs ts-node

| Feature               | tsx          | ts-node                         |
| --------------------- | ------------ | ------------------------------- |
| Startup               | ~100ms       | ~2000ms (default), ~200ms (SWC) |
| ESM                   | Native       | Requires --esm flag             |
| Config                | Minimal      | Complex                         |
| Transpiler            | esbuild (Go) | TypeScript/SWC                  |
| Type checking         | No           | Optional                        |
| Decorator metadata    | No           | Yes                             |
| Path aliases          | Yes          | Yes                             |
| const enum cross-file | No           | Yes                             |

### tsx vs Node.js Native TypeScript

| Feature          | tsx             | Node.js Native                  |
| ---------------- | --------------- | ------------------------------- |
| Type annotations | Full            | Full (erasable only)            |
| Enums            | Full            | Requires transform (Node 22/24) |
| Namespaces       | Full            | Requires transform (Node 22/24) |
| Decorators       | esbuild support | Not supported                   |
| Watch mode       | Built-in        | --watch (Node 22.6+)            |
| REPL             | TypeScript REPL | No TS REPL                      |
| Path mapping     | Yes             | No                              |
| JSX              | Built-in        | No (.tsx unsupported)           |
| tsconfig.json    | Respected       | Ignored                         |

**Node.js Native**: Type stripping stable (Node 24.12+).
`--experimental-transform-types` removed in Node 26.0. Only erasable syntax
supported natively.

### tsx vs Bun

| Feature        | tsx          | Bun           |
| -------------- | ------------ | ------------- |
| Node.js compat | Full         | Most packages |
| Native addons  | Full         | May not work  |
| Cold start     | ~42ms        | ~18ms         |
| Throughput     | 1420 ops/sec | 840 ops/sec   |
| Memory         | 122 MB       | 240 MB        |
| Ecosystem      | Node.js      | Bun-specific  |

### tsx vs @swc-node/register

| Feature            | tsx      | @swc-node/register              |
| ------------------ | -------- | ------------------------------- |
| Transpiler         | esbuild  | SWC (Rust)                      |
| Cold start         | ~100ms   | ~80ms                           |
| Parallel transform | No       | Yes (faster for large projects) |
| Watch mode         | Built-in | Via nodemon                     |
| TypeScript REPL    | Yes      | No                              |

**swc-node**: Faster for large projects due to parallel transformation. Less
feature-complete than tsx.

## Performance Optimization

### Watch Mode

```bash
tsx watch src/index.ts
```

Faster than manual restart or nodemon.

### Simplify tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "strict": true
  }
}
```

### Avoid Unnecessary Transformations

- Skip source maps if not debugging
- Avoid decorators if not needed
- Use regular enums instead of const enum

### Consistent Module System

Choose ESM or CJS and stick with it. Mixing adds complexity.

### Caching

tsx uses disk cache (7-day retention, lazy indexing). Cache indexed lazily since
v4.21.1 to avoid startup slowdown from unrelated entries.

## CI/CD

### GitHub Actions

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

### Pre-commit Hook

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run typecheck"
    }
  }
```

## Developer API

### node --import

```bash
node --import tsx ./file.ts
```

Use `node` directly with tsx enhancement.

### ESM Register API

```js
import { register } from 'tsx/esm/api';
const unregister = register();
await import('./file.ts');
unregister();
```

Scoped registration:

```js
const api = register({ namespace: Date.now().toString() });
const loaded = await api.import('./file.ts', import.meta.url);
api.unregister();
```

### CJS Register API

```js
const tsx = require('tsx/cjs/api');
const unregister = tsx.register();
const loaded = require('./file.ts');
unregister();
```

### Entry Point Import

```js
import 'tsx';
await import('./file.ts');
```

Note: Only works on dynamic imports after registration.

### tsImport API

Load TypeScript files without global enhancement:

```js
import { tsImport } from 'tsx/esm/api';
const loaded = await tsImport('./file.ts', import.meta.url);
```

Custom tsconfig:

```js
tsImport('./file.ts', {
  parentURL: import.meta.url,
  tsconfig: './custom-tsconfig.json',
});
```

Track loaded files:

```js
tsImport('./file.ts', {
  parentURL: import.meta.url,
  onImport: (file) => console.log(file),
});
```

## Node.js Enhancements

### TypeScript REPL

```bash
tsx
```

Interactive TypeScript REPL.

### Test Runner

```bash
tsx --test
```

Enhances Node.js built-in test runner (Node 21+). Recognizes:

- `**/*.test.?[cm][jt]s`
- `**/*-test.?[cm][jt]s`
- `**/*_test.?[cm][jt]s`
- `**/test-*.?[cm][jt]s`
- `**/test.?[cm][jt]s`
- `**/test/**/*.?[cm][jt]s`

## File Extensions

- `.ts` - Module type from package.json
- `.mts` - Always ESM (like `.mjs`)
- `.cts` - Always CJS (like `.cjs`)
- `.tsx` - JSX supported by tsx, **unsupported by Node.js native**

Node.js native TypeScript ignores `.tsx` files. Use tsx for JSX.

## Migration from ts-node

```bash
npm uninstall ts-node
npm install -D tsx
```

Update scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

Remove ts-node config from tsconfig.json. Test all scripts.

## Limitations

### esbuild Limitations

- No `emitDecoratorMetadata` support (requires TypeScript type system)
- Limited `eval()` compatibility
- `const enum` across files not supported
- Some advanced tsconfig options not fully supported

### TypeScript Limitations

- No runtime type checking
- Type errors don't prevent execution
- Experimental features may not work

### Decorators

esbuild supports both:

- **Standard decorators** (TypeScript 5.0+, TC39 Stage 3) - default
- **Experimental decorators** (legacy) - set `experimentalDecorators: true` in
  tsconfig.json

Standard decorators incompatible with `emitDecoratorMetadata`.

## Best Practices

1. Use tsx for development, tsc for production
2. Always run type checking in CI
3. Enable source maps for debugging
4. Use path aliases with runtime resolution
5. Keep tsconfig.json simple
6. Separate execution from type checking
7. Use watch mode for development
8. Specify Node.js version in package.json
9. Avoid const enum across files
10. Test scripts before committing
11. Use `node --import tsx` for tools requiring `node` command
12. Use tsImport API for config file loading without global enhancement

## Resources

- [Official Documentation](https://tsx.hirok.io)
- [GitHub Repository](https://github.com/privatenumber/tsx)
- [esbuild Documentation](https://esbuild.github.io)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Node.js TypeScript API](https://nodejs.org/api/typescript.html)
