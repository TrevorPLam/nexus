# esbuild

## Overview

esbuild is an extremely fast JavaScript and TypeScript bundler and minifier
written in Go. It routinely bundles medium-sized apps in hundreds of
milliseconds — often 10–100× faster than JavaScript-based alternatives like
Webpack or Rollup. It powers dependency pre-bundling inside Vite, transpilation
in many meta-frameworks, and standalone build scripts for libraries and
serverless functions.

## Latest Stable Version

**Version**: `0.28.1` (June 2026)

**Compatibility**:

- Node.js: 12.x+ (recommended 18.x+)
- Platforms: Windows, macOS, Linux, FreeBSD
- Browsers: All modern browsers (via target configuration)
- Package Managers: npm, pnpm, yarn, bun
- Runtimes: Node.js, Deno, Bun, Browser

**Security Notes**:

- Update to 0.28.1+ for critical Deno RCE fix (GHSA-gv7w-rqvm-qjhr)
- Update to 0.25.0+ for CORS dev server fix (GHSA-67mh-4wv8-2f99)
- Update to 0.28.1+ for Windows path traversal fix (GHSA-g7r4-m6w7-qqqr)

## Basics & Fundamentals

### Core Concepts

1. **Go Implementation**: Written in Go for native performance, compiles to
   machine code
2. **Parallel Processing**: Runs transformations in parallel across CPU cores
3. **Memory Efficient**: Uses memory-efficient data structures, no intermediate
   AST copies
4. **No Type Checking**: Intentionally skips type checking for speed (use tsc
   separately)
5. **Three APIs**: `build()`, `context()`, and `transform()` for different use
   cases

### Key Features

- **Ultra-Fast**: 10-100x faster than JavaScript-based bundlers
- **TypeScript Support**: Native TypeScript transpilation without configuration
- **JSX Support**: Built-in JSX transformation for React and other frameworks
- **Tree Shaking**: Basic tree shaking for dead code elimination
- **Code Splitting**: ESM code splitting with shared chunks
- **Minification**: Syntax, whitespace, and identifier minification
- **Source Maps**: Inline and external source map generation
- **Plugin System**: Rollup-inspired plugin API for extensibility

### API Overview

**`build()`**: One-shot graph build for files

- Resolves imports
- Applies tree shaking
- Writes outputs to disk
- Best for CI/CD and production builds

**`context()`**: Persistent build context for watch mode

- Reuses parsed ASTs and module metadata
- Enables incremental rebuilds
- Supports watch and serve modes
- Best for development

**`transform()`**: Stateless single-string converter

- No filesystem access
- No import resolution
- Pure lexer-plus-codegen pass
- Best for preprocessing layers

### Basic Commands

```bash
# Bundle a single file
npx esbuild src/index.ts --bundle --outfile=dist/bundle.js

# With source maps and minification
npx esbuild src/index.ts --bundle --minify --sourcemap --target=chrome90 --outfile=dist/bundle.js

# Watch mode
npx esbuild src/index.ts --bundle --outfile=dist/bundle.js --watch

# Multiple entry points
npx esbuild src/main.ts src/worker.ts --bundle --outdir=dist/

# Platform targets
npx esbuild src/server.ts --bundle --platform=node --outfile=dist/server.js

# Format options: iife, cjs, esm
npx esbuild src/lib.ts --bundle --format=esm --outfile=dist/lib.mjs
```

## Proper Implementation

### 1. Installation

```bash
# Install as dev dependency
npm install -D esbuild

# Or use the native executable
curl -fsSL https://esbuild.github.io/dl/v0.28.1 | sh
```

**Pin the exact version for reproducibility**:

```json
{
  "devDependencies": {
    "esbuild": "0.28.1"
  }
}
```

### 2. Basic Build Script

**`build.mjs`**:

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['chrome90', 'firefox90', 'safari15'],
  outfile: 'dist/bundle.js',
});

console.log('Build complete');
```

Run with:

```bash
node build.mjs
```

### 3. Multiple Entry Points with Code Splitting

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: {
    main: 'src/main.ts',
    worker: 'src/worker.ts',
  },
  bundle: true,
  splitting: true, // Enable code splitting (ESM only)
  format: 'esm',
  outdir: 'dist',
  chunkNames: 'chunks/[name]-[hash]',
});
```

**Requirements for code splitting**:

- `format: 'esm'` (required)
- `outdir` (not `outfile`)
- `splitting: true`

### 4. Production Build for Node.js CLI

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/cli.js',
  external: [
    // Don't bundle these — they'll be installed as dependencies
    'fsevents',
  ],
  banner: {
    js: '#!/usr/bin/env node', // Shebang for CLI
  },
  minify: true,
  sourcemap: true,
});
```

### 5. Library Build (ESM + CJS)

```javascript
import * as esbuild from 'esbuild';

// Build ESM
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.mjs',
  external: ['react', 'react-dom'], // Don't bundle peer dependencies
});

// Build CJS
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'cjs',
  outfile: 'dist/index.js',
  external: ['react', 'react-dom'],
});
```

### 6. Watch Mode with Context

```javascript
import * as esbuild from 'esbuild';

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  outdir: 'dist',
});

await ctx.watch(); // Watch for file changes

// Cleanup on exit
process.on('SIGINT', async () => {
  await ctx.dispose();
  process.exit();
});
```

### 7. Built-in Dev Server

```javascript
import * as esbuild from 'esbuild';

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
});

const { host, port } = await ctx.serve({
  servedir: 'dist',
  port: 3000,
});

console.log(`Serving at http://${host}:${port}`);
```

### 8. Custom Plugins

```javascript
import * as esbuild from 'esbuild';

const cssModulesPlugin = {
  name: 'css-modules',
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
      const css = await fs.promises.readFile(args.path, 'utf8');
      // Transform CSS modules → JS object
      const { transformed, classNames } = transformCSSModules(css);
      return {
        contents: `
          const style = document.createElement('style')
          style.textContent = ${JSON.stringify(transformed)}
          document.head.appendChild(style)
          export default ${JSON.stringify(classNames)}
        `,
        loader: 'js',
      };
    });
  },
};

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  plugins: [cssModulesPlugin],
  outfile: 'dist/bundle.js',
});
```

### 9. Environment Variables

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.API_URL': '"https://api.example.com"',
  },
  outfile: 'dist/bundle.js',
});
```

**Important**: Values must be JSON-serializable strings. Use `JSON.stringify()`
for complex values.

### 10. Path Aliases

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  resolve: {
    alias: {
      '@': './src',
      '@components': './src/components',
      '@utils': './src/utils',
    },
  },
  outfile: 'dist/bundle.js',
});
```

### 11. External Dependencies

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  external: [
    'fs',
    'path',
    'express',
    '*node_modules/*', // Externalize all node_modules
  ],
  outfile: 'dist/bundle.js',
});
```

### 12. Metafile for Bundle Analysis

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  metafile: true,
  outfile: 'dist/bundle.js',
});

// Analyze with esbuild-visualizer or similar tools
```

## Advanced Coding Patterns

### 1. Incremental Builds with Context

```javascript
import * as esbuild from 'esbuild';

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
});

// Manual rebuild
await ctx.rebuild();

// Reuse context for multiple builds
for (const file of ['src/index.ts', 'src/worker.ts']) {
  await ctx.rebuild({ entryPoints: [file] });
}

await ctx.dispose();
```

### 2. Live Reload with Watch + Serve

```javascript
import * as esbuild from 'esbuild';

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  outdir: 'dist',
});

// Enable watch
await ctx.watch();

// Enable serve
const { host, port } = await ctx.serve({
  servedir: 'dist',
});

// Add client-side live reload
// (requires custom implementation)
```

### 3. Transform API for Single Files

```javascript
import * as esbuild from 'esbuild';

const result = await esbuild.transform('const x: number = 1', {
  loader: 'ts',
});

console.log(result.code); // "const x = 1;"
```

**Use cases**:

- Build plugins
- Test runner hooks
- CMS pipelines
- Preprocessing layers

### 4. Custom Loaders

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  loader: {
    '.custom': 'js',
    '.data': 'json',
  },
  outfile: 'dist/bundle.js',
});
```

**Available loaders**: `js`, `jsx`, `ts`, `tsx`, `css`, `json`, `text`,
`base64`, `file`, `dataurl`

### 5. JSX Configuration

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  jsx: 'automatic', // or 'transform'
  jsxImportSource: 'react',
  outfile: 'dist/bundle.js',
});
```

### 6. Target Configuration

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  target: ['es2020', 'chrome100', 'firefox100', 'safari15', 'node20'],
  outfile: 'dist/bundle.js',
});
```

### 7. Minification Options

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true, // All minification
  // Or individual options:
  // minifyWhitespace: true,
  // minifyIdentifiers: true,
  // minifySyntax: true,
  outfile: 'dist/bundle.js',
});
```

### 8. Source Map Configuration

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: 'inline', // or 'external', 'linked', 'both'
  sourcesContent: true,
  outfile: 'dist/bundle.js',
});
```

### 9. Banner and Footer

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  banner: {
    js: '// Built with esbuild',
  },
  footer: {
    js: '// End of bundle',
  },
  outfile: 'dist/bundle.js',
});
```

### 10. Legal Comments

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  legalComments: 'none', // or 'inline', 'eof', 'linked', 'external'
  outfile: 'dist/bundle.js',
});
```

## Anti-Patterns & Common Mistakes

### 1. Assuming esbuild Type-Checks

**BAD**:

```javascript
// esbuild strips types but doesn't check them
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
});
```

**GOOD**:

```javascript
// Run type checking separately
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
});

// In CI
await exec('tsc --noEmit');
```

**Why**: esbuild intentionally skips type checking for speed. Invalid types can
ship to production.

### 2. Bundling Native Node Addons for Browser

**BAD**:

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'browser',
  outfile: 'dist/bundle.js',
});
// If code imports .node files or fs, it will fail at runtime
```

**GOOD**:

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'browser',
  external: ['fs', 'path', '*.node'],
  outfile: 'dist/bundle.js',
});
```

**Why**: `.node` files and `fs` imports fail at runtime in browser. Externalize
or stub them.

### 3. Over-Bundling Server Code

**BAD**:

```javascript
await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/server.js',
});
// Duplicates node_modules into Lambda artifacts
```

**GOOD**:

```javascript
await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  packages: 'external', // Leave all node_modules external
  outfile: 'dist/server.js',
});
```

**Why**: Duplicating `node_modules` bloats cold starts in serverless
environments.

### 4. Dynamic Import Expressions

**BAD**:

```javascript
// Non-literal import may not split
const module = await import(path);
```

**GOOD**:

```javascript
// Use static strings for code splitting
const module = await import('./module');
```

**Why**: Non-literal `import(path)` may not work with `splitting: true`.

### 5. Missing `define` for `process.env`

**BAD**:

```javascript
// Browser bundles reference undefined process
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'browser',
  outfile: 'dist/bundle.js',
});
```

**GOOD**:

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'browser',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  outfile: 'dist/bundle.js',
});
```

**Why**: Browser bundles reference undefined `process` unless replaced at build
time.

### 6. Ignoring `sideEffects`

**BAD**:

```javascript
// Tree shaking silently keeps large polyfill entry points
```

**GOOD**:

```json
// package.json
{
  "sideEffects": false
}
```

**Why**: Tree shaking works on ESM static imports. Side-effect imports can
prevent dead-code elimination.

### 7. Using Wrong API for Use Case

**BAD**:

```javascript
// Using transform() when you need import resolution
const result = await esbuild.transform(code, { loader: 'ts' });
```

**GOOD**:

```javascript
// Use build() for import resolution
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: false, // Don't bundle, just resolve
  outfile: 'dist/bundle.js',
});
```

**Why**: `transform()` never reads `tsconfig.json`, never resolves imports, and
emits no `.d.ts` files.

### 8. Mixing CJS and ESM Incorrectly

**BAD**:

```javascript
// When using --platform=node with mixed CJS/ESM packages
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm', // May fail with ESM entry points
  outfile: 'dist/bundle.js',
});
```

**GOOD**:

```javascript
// Use CJS format for Node.js bundles
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs', // Works in all cases except top-level await
  outfile: 'dist/bundle.js',
});
```

**Why**: esbuild has limited transformation capabilities between ESM and CJS.
Node.js itself has additional limitations.

### 9. Not Pinning esbuild Version

**BAD**:

```json
{
  "devDependencies": {
    "esbuild": "^0.28.1"
  }
}
```

**GOOD**:

```json
{
  "devDependencies": {
    "esbuild": "0.28.1"
  }
}
```

**Why**: esbuild deliberately contains backwards-incompatible changes. Pin exact
version for reproducibility.

### 10. Using esbuild Dev Server in Production

**BAD**:

```javascript
// Using esbuild's built-in serve in production
const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
});
await ctx.serve({ servedir: 'dist' });
```

**GOOD**:

```javascript
// Use proper production server (nginx, Apache, etc.)
// esbuild serve is for development only
```

**Why**: esbuild's development server is not written with production in mind.

### 11. Forgetting to Dispose Context

**BAD**:

```javascript
const ctx = await esbuild.context({/* ... */});
await ctx.watch();
// Never disposes - leaks resources
```

**GOOD**:

```javascript
const ctx = await esbuild.context({/* ... */});
await ctx.watch();

process.on('SIGINT', async () => {
  await ctx.dispose();
  process.exit();
});
```

**Why**: Contexts hold resources. Not disposing leaks memory and file handles.

### 12. Using `transform()` for Multi-File Output

**BAD**:

```javascript
// transform() can't do multi-file output
const result = await esbuild.transform(code, { loader: 'ts' });
```

**GOOD**:

```javascript
// Use build() for multi-file output
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: false,
  outdir: 'dist',
});
```

**Why**: `transform()` is a pure codegen pass. Use `build()` for filesystem
operations.

### 13. Expecting PostCSS/Sass in Core

**BAD**:

```javascript
// esbuild doesn't include PostCSS or Sass
await esbuild.build({
  entryPoints: ['src/index.scss'],
  bundle: true,
  outfile: 'dist/bundle.js',
});
```

**GOOD**:

```javascript
// Use plugins or pre-process CSS before esbuild
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  plugins: [sassPlugin()],
  outfile: 'dist/bundle.js',
});
```

**Why**: esbuild doesn't include PostCSS or Sass processing. Use plugins or
pre-process.

### 14. Not Using `context()` for Watch Mode

**BAD**:

```javascript
// Calling build() in a loop is inefficient
while (true) {
  await esbuild.build({/* ... */});
  await sleep(1000);
}
```

**GOOD**:

```javascript
// Use context() for efficient watch mode
const ctx = await esbuild.context({/* ... */});
await ctx.watch();
```

**Why**: `context()` reuses parsed ASTs and module metadata, cutting watch-mode
latency.

### 15. Inlining Secrets into Client Bundles

**BAD**:

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  define: {
    'process.env.API_KEY': '"secret_key"', // Exposed in client code
  },
  outfile: 'dist/bundle.js',
});
```

**GOOD**:

```javascript
// Never inline secrets into client bundles
// Use server-side environment variables or API calls
```

**Why**: Define values are statically replaced and visible in client bundles.

## Performance Optimization

### 1. Use Context for Watch Mode

```javascript
const ctx = await esbuild.context({/* ... */});
await ctx.watch();
```

Incremental rebuilds reuse parsed ASTs and module metadata.

### 2. Enable Code Splitting

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: 'dist',
});
```

### 3. Externalize Large Dependencies

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  external: ['react', 'react-dom', 'lodash'],
  outfile: 'dist/bundle.js',
});
```

### 4. Use Appropriate Target

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  target: ['es2020'], // Don't target older browsers unnecessarily
  outfile: 'dist/bundle.js',
});
```

### 5. Enable Parallel Processing

esbuild automatically uses parallel processing. Ensure you're using the native
binary (not WASM) for best performance.

### 6. Avoid Re-processing Static Assets

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  loader: {
    '.png': 'file', // Don't process, just copy
    '.svg': 'file',
  },
  outfile: 'dist/bundle.js',
});
```

### 7. Use Metafile for Analysis

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  metafile: true,
  outfile: 'dist/bundle.js',
});
```

Analyze with tools like `esbuild-visualizer` to identify large dependencies.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx tsc --noEmit # Type checking
```

### Cache Configuration

```yaml
- name: Cache esbuild
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-esbuild-${{ hashFiles('**/package-lock.json') }}
```

## Common Commands

```bash
# Basic bundle
esbuild src/index.ts --bundle --outfile=dist/bundle.js

# With minification and source maps
esbuild src/index.ts --bundle --minify --sourcemap --outfile=dist/bundle.js

# Watch mode
esbuild src/index.ts --bundle --watch --outfile=dist/bundle.js

# Serve mode
esbuild src/index.ts --bundle --serve --outdir=dist

# Multiple entry points
esbuild src/main.ts src/worker.ts --bundle --outdir=dist

# Platform target
esbuild src/index.ts --bundle --platform=node --outfile=dist/bundle.js

# Format
esbuild src/index.ts --bundle --format=esm --outfile=dist/bundle.js

# Target
esbuild src/index.ts --bundle --target=chrome90 --outfile=dist/bundle.js

# External
esbuild src/index.ts --bundle --external=react --outfile=dist/bundle.js

# Define
esbuild src/index.ts --bundle --define:process.env.NODE_ENV='"production"' --outfile=dist/bundle.js

# Metafile
esbuild src/index.ts --bundle --metafile=meta.json --outfile=dist/bundle.js
```

## Limitations

### By Design

- **No type checking**: Intentionally skips type checking for speed
- **Basic tree shaking**: Faster but less aggressive than Rollup
- **Smaller plugin ecosystem**: Compared to Webpack
- **No HMR**: Not a full application framework
- **No file-based routing**: Not a meta-framework

### Technical Limitations

- **Limited CJS/ESM interop**: Some scenarios not supported by Node.js
- **No top-level await in CJS**: Not supported
- **Limited PostCSS/Sass support**: Requires plugins
- **No module federation**: Use build-time integrations

### Platform Limitations

- **Anti-virus false positives**: Native executables may be flagged
- **Outdated Go compiler**: Intentionally compilable with Go 1.13
- **Not a sandbox**: Assumes trusted inputs

## Best Practices

1. **Pin exact version** of esbuild for reproducibility
2. **Run `tsc --noEmit`** separately for type checking
3. **Use `context()`** for watch mode, not `build()` in a loop
4. **Externalize peer dependencies** for library builds
5. **Use `packages: 'external'`** for Node.js server bundles
6. **Enable `metafile`** periodically for bundle analysis
7. **Define environment variables** explicitly for browser builds
8. **Use appropriate format** (CJS for Node, ESM for browser)
9. **Dispose contexts** properly to avoid resource leaks
10. **Never inline secrets** into client bundles
11. **Use `splitting: true`** with `format: 'esm'` for code splitting
12. **Choose target** from real browser analytics, not defaults
13. **Use plugins cautiously** - only well-maintained, essential ones
14. **Prefer built-in loaders** over custom plugins when possible
15. **Use esbuild via Vite** for full-featured web app development

## Comparison with Alternatives

### esbuild vs Webpack

| Feature          | esbuild        | Webpack    |
| ---------------- | -------------- | ---------- |
| Speed            | 10-100x faster | Slower     |
| Language         | Go             | JavaScript |
| Type checking    | No             | Optional   |
| Plugin ecosystem | Smaller        | Larger     |
| HMR              | No             | Yes        |
| Configuration    | Simple         | Complex    |
| Tree shaking     | Basic          | Advanced   |

### esbuild vs Rollup

| Feature          | esbuild | Rollup   |
| ---------------- | ------- | -------- |
| Speed            | Faster  | Slower   |
| Tree shaking     | Basic   | Advanced |
| Plugin ecosystem | Smaller | Larger   |
| Code splitting   | Yes     | Yes      |
| Format support   | All     | All      |

### esbuild vs Bun

| Feature          | esbuild          | Bun                 |
| ---------------- | ---------------- | ------------------- |
| Standalone tool  | Yes              | Part of Bun runtime |
| Language         | Go               | Zig                 |
| Plugin ecosystem | Smaller          | Growing             |
| Integration      | Works everywhere | Bun-only            |

## Security

### Known Vulnerabilities & Fixes

| Advisory            | Severity            | Fixed In | Issue                            |
| ------------------- | ------------------- | -------- | -------------------------------- |
| GHSA-gv7w-rqvm-qjhr | High (CVSS 8.1)     | 0.28.1   | Deno RCE via NPM_CONFIG_REGISTRY |
| GHSA-67mh-4wv8-2f99 | Moderate (CVSS 5.3) | 0.25.0   | CORS bypass in dev server        |
| GHSA-g7r4-m6w7-qqqr | Low (CVSS 2.5)      | 0.28.1   | Windows path traversal           |

### Security Best Practices

- **Pin exact version** in package.json (esbuild has breaking changes)
- **Never inline secrets** via `define` in client bundles
- **Use serve only in development** (not production)
- **Disable CORS** in production builds
- **Audit dependencies** regularly for CVEs
- **Use npm audit** or `pnpm audit` for vulnerability scanning

## Troubleshooting

### Common Errors

**"Could not resolve" module errors**:

- Verify package installed in node_modules
- Check import path spelling/casing
- Configure aliases correctly in resolve.alias
- Use external: for peer dependencies

**TypeScript errors not caught**:

- esbuild strips types but doesn't check them
- Run `tsc --noEmit` separately in CI
- Use `concurrently` to run tsc alongside esbuild watch

**CSS not processing**:

- esbuild extracts CSS to separate files by default
- Link CSS files in HTML manually
- Use plugins for PostCSS/Sass/Tailwind

**Tree shaking not working**:

- Requires ESM format (not CJS)
- Set `sideEffects: false` in package.json
- Check package exports field for ESM support

**Watch mode slow**:

- Plugins rebuild every time (by design for correctness)
- Implement plugin-level caching for expensive operations
- Use context() instead of build() in loops

**Platform/target errors**:

- Set platform: 'node' for server code
- Set platform: 'browser' for client code
- Configure target for your actual browser support

### Debugging Techniques

```bash
# Enable verbose logging
esbuild src/index.ts --bundle --verbose

# Generate metafile for analysis
esbuild src/index.ts --bundle --metafile=meta.json

# Use official analyzer
# Upload meta.json to https://esbuild.github.io/analyze/
```

## Migration Guides

### From Webpack

**Key differences**:

- esbuild has simpler configuration (no complex loaders)
- No HMR (use Vite for full HMR support)
- CSS extracted to separate files
- Different plugin API

**Migration steps**:

1. Install esbuild: `npm install -D esbuild`
2. Replace webpack.config.js with esbuild build script
3. Convert loaders to esbuild loaders or plugins
4. Set up separate tsc --noEmit for type checking
5. Configure CSS processing via plugins
6. Test bundle output thoroughly

**Hybrid approach** (gradual migration):

```javascript
// Use esbuild-loader within webpack
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: { loader: 'tsx', target: 'es2015' },
      },
    ],
  },
};
```

### From Rollup

**Key differences**:

- esbuild faster but less aggressive tree shaking
- Different plugin ecosystem
- Built-in TypeScript support

**Migration steps**:

1. Replace rollup.config.js with esbuild build script
2. Convert rollup plugins to esbuild equivalents
3. Use rollup-plugin-esbuild for gradual transition
4. Adjust code splitting configuration

## Serverless Deployment

### AWS Lambda

**Using serverless-esbuild plugin**:

```yaml
# serverless.yml
plugins:
  - serverless-esbuild

provider:
  name: aws
  runtime: nodejs20.x

functions:
  myFunction:
    handler: src/handler.main
    esbuild:
      external:
        - aws-sdk
      packages: external
```

**Native Serverless Framework v4**:

```yaml
# serverless.yml (v4+)
build:
  esbuild:
    external:
      - aws-sdk
    target: node20
    format: cjs
```

### Best Practices for Serverless

- Use `packages: 'external'` to avoid bundling node_modules
- Set `platform: 'node'` and `target: 'nodeXX'`
- Externalize AWS SDK (`external: ['aws-sdk']`)
- Minify for cold start optimization
- Use metafile to analyze bundle size
- Consider Lambda layers for large dependencies

## CSS Integration

### Tailwind CSS

**Using esbuild-plugin-tailwindcss**:

```javascript
import esbuild from 'esbuild';
import tailwindPlugin from 'esbuild-plugin-tailwindcss';

await esbuild.build({
  entryPoints: ['src/index.js'],
  plugins: [tailwindPlugin()],
  outdir: 'dist',
  bundle: true,
});
```

**With CSS Modules**:

```javascript
tailwindPlugin({
  cssModules: {
    enabled: true,
    filter: /\.module\.css$/,
    options: {
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
});
```

### PostCSS

**Using esbuild-plugin-postcss**:

```javascript
import { postCSSPlugin } from '@udibo/esbuild-plugin-postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

await esbuild.build({
  plugins: [
    postCSSPlugin({
      plugins: [tailwindcss(), autoprefixer()],
    }),
  ],
  entryPoints: ['src/index.css'],
  outdir: 'dist',
});
```

### Sass/SCSS

**Using esbuild-sass-plugin**:

```javascript
import { sassPlugin } from 'esbuild-sass-plugin';

await esbuild.build({
  plugins: [sassPlugin()],
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
});
```

## Bundle Analysis

### Metafile Generation

```javascript
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  metafile: true,
  outfile: 'dist/bundle.js',
});

// Write metafile for analysis
fs.writeFileSync('meta.json', JSON.stringify(result.metafile));
```

### Analysis Tools

**Official esbuild analyzer**:

- Upload meta.json to https://esbuild.github.io/analyze/
- Visualizes sunburst and flame charts
- Shows module sizes and dependencies

**esbuild-visualizer**:

```bash
npx esbuild-visualizer --metadata ./meta.json --filename stats.html
```

**esbuild-analyzer**:

```javascript
import { getEsbuildAnalyzerHtml } from 'esbuild-analyzer';
const html = getEsbuildAnalyzerHtml(result.metafile);
fs.writeFileSync('bundle-analysis.html', html);
```

**GitHub Actions integration**:

```yaml
- name: Analyze bundle size
  uses: exoego/esbuild-bundle-analyzer@v1
  with:
    metafiles: 'dist/meta.json'
```

## Monorepo Integration

### Turborepo

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

```javascript
// apps/web/esbuild.config.js
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  external: ['@acme/ui'], // Workspace reference
  outfile: 'dist/bundle.js',
});
```

### pnpm Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json
{
  "dependencies": {
    "@acme/ui": "workspace:*"
  }
}
```

### Nx

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

## Cross-Runtime Support

### Deno

**Using @luca/esbuild-deno-loader**:

```typescript
import * as esbuild from 'npm:esbuild';
import { denoPlugins } from 'jsr:@luca/esbuild-deno-loader';

await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ['https://deno.land/std/http/server.ts'],
  outfile: './dist/server.js',
  bundle: true,
});
```

**Using @oazmi/esbuild-plugin-deno** (cross-runtime):

```javascript
import { denoPlugins } from '@oazmi/esbuild-plugin-deno';

await esbuild.build({
  plugins: denoPlugins({
    initialPluginData: {
      runtimePackage: './deno.json',
    },
  }),
  entryPoints: ['src/index.ts'],
  bundle: true,
});
```

### Bun

**Native Bun bundler (esbuild-compatible)**:

```javascript
await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'browser',
  format: 'esm',
});
```

**Using esbuild plugins with Bun**:

```javascript
import tailwindPlugin from 'esbuild-plugin-tailwindcss';

await Bun.build({
  entrypoints: ['src/index.ts'],
  plugins: [tailwindPlugin()],
  outdir: 'dist',
});
```

## Advanced Caching

### Context API for Incremental Builds

```javascript
const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
});

// Reuse parsed ASTs and module metadata
await ctx.rebuild();
await ctx.rebuild(); // Faster - unchanged files cached

await ctx.dispose(); // Cleanup
```

### Watch Mode

```javascript
const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
});

await ctx.watch(); // Auto-rebuild on file changes

process.on('SIGINT', async () => {
  await ctx.dispose();
  process.exit();
});
```

### Plugin Caching

```javascript
const cache = new Map();

const cachedPlugin = {
  name: 'cached',
  setup(build) {
    build.onLoad({ filter: /\.data$/ }, async (args) => {
      const cacheKey = args.path;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      const result = await expensiveOperation(args.path);
      cache.set(cacheKey, result);
      return result;
    });
  },
};
```

## Performance Benchmarks

### Build Time Comparisons (2026)

| Bundler | Small Project | Medium Project | Large Project |
| ------- | ------------- | -------------- | ------------- |
| esbuild | ~30ms         | ~200ms         | ~500ms        |
| Rspack  | ~90ms         | ~600ms         | ~1850ms       |
| Vite    | ~450ms        | ~1800ms        | ~1330ms       |
| webpack | ~1100ms       | ~5500ms        | ~13130ms      |
| Rollup  | ~750ms        | ~2400ms        | ~8200ms       |

### Bundle Size Comparisons

| Bundler | Gzipped Size | Tree Shaking |
| ------- | ------------ | ------------ |
| Rollup  | Best         | Advanced     |
| Vite    | Excellent    | Advanced     |
| esbuild | Good         | Basic        |
| webpack | Good         | Advanced     |
| Rspack  | Larger       | Basic        |

## Resources

- [Official Documentation](https://esbuild.github.io)
- [GitHub Repository](https://github.com/evanw/esbuild)
- [API Documentation](https://esbuild.github.io/api)
- [FAQ](https://esbuild.github.io/faq)
- [Changelog](https://github.com/evanw/esbuild/blob/main/CHANGELOG.md)
- [Bundle Analyzer](https://esbuild.github.io/analyze)
- [Security Advisories](https://github.com/evanw/esbuild/security/advisories)
