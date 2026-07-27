# Vite

## Overview

Vite (French for "fast", pronounced /vit/) is a next-generation frontend build
tool created by Evan You. It consists of a development server that serves source
code over native ES modules with blazing-fast Hot Module Replacement (HMR), and
a build command that bundles code with Rolldown for production.

## Latest Stable Version

**Version**: `8.1.5` (as of July 2026)

**Compatibility**:

- Node.js: 20.19+, 22.12+ (Node 18 support dropped in Vite 7.0)
- Browsers: Baseline Widely Available (browsers released at least 2.5 years ago)
  - Chrome >= 111, Edge >= 111, Firefox >= 114, Safari >= 16.4
  - Minimum: Chrome >= 64, Firefox >= 67, Safari >= 11.1, Edge >= 79
- Package Managers: npm, pnpm, yarn, bun

## Architecture

### Vite 8 Changes

**Rolldown**: Single Rust-based bundler replacing esbuild (dev) + Rollup (prod).
10-30x faster builds.

**Oxc**: Rust toolchain for JS transforms/minification, replacing esbuild.

**Lightning CSS**: Default CSS minifier (Rust-based).

**ESM-Only**: Vite 7+ requires ESM config; CommonJS deprecated.

### Core Concepts

1. **Native ES Modules**: Dev server serves unbundled ESM with instant HMR
2. **Rolldown Pre-bundling**: Dependencies pre-bundled via Rolldown (was
   esbuild)
3. **On-Demand Transformation**: Oxc transforms source on browser request
4. **HMR**: Updates modules without full reload; preserves state
5. **Bundled Dev Mode (Experimental)**: Pre-bundles entire app for dev (15x
   faster startup on 10k components)

### Key Features

- **Instant Server Start**: No bundling during development
- **Lightning-Fast HMR**: Preserves application state on updates
- **Rich Features**: TypeScript, JSX, CSS, PostCSS, etc. out of the box
- **Optimized Builds**: Tree-shaking, code splitting, minification
- **Plugin Ecosystem**: Extensible via Rollup-compatible plugins
- **Framework Agnostic**: Works with React, Vue, Svelte, Solid, etc.

### Project Structure

```
my-vite-app/
├── index.html          # Entry point (front and center)
├── package.json
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── src/
│   ├── main.tsx        # Application entry
│   ├── App.tsx         # Root component
│   └── ...
└── public/             # Static assets
```

### Basic Commands

```bash
# Create new project
npm create vite@latest my-app

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Quick Start

```bash
# Create new project
npm create vite@latest my-app -- --template react-ts

# Or add to existing project
npm install -D vite

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

**Basic `vite.config.ts`**:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

**Vite 8 Configuration (Rolldown)**:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    minify: 'oxc', // Oxc is default (fast), terser optional
    rolldownOptions: {
      // Renamed from rollupOptions in Vite 8
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  css: {
    modules: { localsConvention: 'camelCase' },
    preprocessorOptions: {
      scss: { additionalData: `@use "@/styles/variables" as *;` },
    },
  },

  envPrefix: 'VITE_',
  preview: { port: 4173 },
});
```

**TypeScript Configuration**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

**Conditional Configuration**:

```typescript
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';

  return {
    plugins: [react()],
    build: {
      sourcemap: isDev ? 'inline' : isProd ? false : true,
      minify: isProd ? 'oxc' : false,
    },
    server: {
      proxy: isDev ? { '/api': 'http://localhost:8080' } : undefined,
    },
  };
});
```

**Environment Variables**:

```typescript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
```

**`.env` files**:

```bash
# .env (all modes)
VITE_API_URL=https://api.example.com

# .env.local (gitignored, all modes)
VITE_API_KEY=secret_key

# .env.production (production only)
VITE_API_URL=https://api.production.com
```

**Security**: Only `VITE_*` variables exposed to client. Never put secrets in
`VITE_*`.

**Path Aliases**:

```typescript
// vite.config.ts
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**Vite 8**: Use `resolve.tsconfigPaths: true` to auto-read tsconfig paths (small
perf cost).

**Static Assets**:

```
public/
  favicon.ico
  logo.png
```

Accessed as: `<img src="/logo.png" />`

**Imported assets**: Auto-hashed, optimized. Small files (<4KB) inlined as
base64.

**CSS Preprocessors**:

```bash
npm install -D sass  # SCSS/SASS
npm install -D less  # Less
npm install -D stylus  # Stylus
```

```typescript
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: { additionalData: `@use "@/styles/variables" as *;` },
    },
  },
});
```

**Tailwind CSS v4**: Use `@tailwindcss/vite` plugin (no PostCSS needed).

## Advanced Patterns

**Code Splitting**:

```typescript
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

**Manual chunk splitting (Vite 8)**:

```typescript
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});
```

**Custom Plugin**:

```typescript
import type { Plugin } from 'vite';

export function myCustomPlugin(): Plugin {
  return {
    name: 'my-custom-plugin',
    transform(code, id) {
      if (id.endsWith('.my-ext')) {
        return { code: `// transformed\n${code}`, map: null };
      }
    },
  };
}
```

**SSR Configuration**:

```typescript
export default defineConfig({
  build: {
    ssr: true,
  },
});
```

**For custom SSR**: Use middleware mode with Express/Fastify. See
[SSR Guide](https://vite.dev/guide/ssr).

**Library Mode**:

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      name: 'MyLib',
      fileName: (format) => `my-lib.${format}.js`,
    },
    rolldownOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM' },
      },
    },
  },
});
```

**Multi-Page Application**:

```typescript
export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
    },
  },
});
```

**Dependency Optimization**:

```typescript
export default defineConfig({
  optimizeDeps: {
    include: ['some-large-package'],
    exclude: ['some-esm-package'],
    rolldownOptions: {
      // Vite 8: was esbuildOptions
      // Rolldown-specific options
    },
  },
});
```

**API Proxy**:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
```

**Preview Server**:

```typescript
export default defineConfig({
  preview: {
    port: 4173,
    host: true,
  },
});
```

## Anti-Patterns

**Barrel files**: Direct imports faster than re-exports. Import from source, not
index files.

**Implicit extensions**: Use `.tsx` extensions. Avoid Vite checking 6 extensions
per import.

**SVG transformation**: Use icon libraries (lucide-react) instead of
transforming 50+ SVGs.

**Browser cache disabled**: Keep cache enabled. Vite's 304 responses make HMR
fast.

**Custom Babel**: Default plugin uses Oxc (fast). Custom Babel slows transforms.

**No manual chunking**: Split vendor code. Single chunk blocks caching and page
load.

**All routes upfront**: Lazy load routes. Improves LCP significantly.

**Heavy plugin hooks**: Keep `buildStart`/`config` hooks fast. They block dev
server startup.

**Firefox dev**: Use Chrome/Safari. Firefox has ES module bugs.

**Browser extensions**: Use incognito. Extensions intercept requests, adding
latency.

**No source maps**: Enable `sourcemap: true` or `'hidden'`. Debugging prod
requires it.

**Wrong Node version**: Use 20.19+ or 22.12+. Vite 7+ dropped Node 18.

**CommonJS config**: Use ESM. Vite 7+ is ESM-only; CommonJS deprecated.

**Memory issues**: Manual chunking reduces peak memory by freeing modules early.

## Performance

**Dev Server**:

```typescript
export default defineConfig({
  server: {
    warmup: { clientFiles: ['./src/components/*.tsx'] },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'], // Narrow list
  },
});
```

**Build Performance**:

```typescript
export default defineConfig({
  build: {
    minify: 'oxc', // Default, fast. terser optional for smaller output
    cssMinify: 'lightningcss', // Default
    reportCompressedSize: false, // Faster for large projects
    assetsInlineLimit: 4096, // 4KB threshold
  },
});
```

**Bundled Dev Mode (Experimental)**:

```typescript
export default defineConfig({
  experimental: {
    bundledDev: true, // 15x faster startup on 10k components
  },
});
```

**Chunk Import Map (Experimental)**:

```typescript
export default defineConfig({
  build: {
    chunkImportMap: true, // Better cache efficiency
  },
});
```

## Migration

**Vite 7 → Vite 8**:

1. Node.js: Upgrade to 20.19+ or 22.12+
2. Config: `rollupOptions` → `rolldownOptions`
3. Minify: `esbuild` → `oxc` (default)
4. Deps: `optimizeDeps.esbuildOptions` → `rolldownOptions`
5. Optional: Install `esbuild` if plugins use `transformWithEsbuild`

**Gradual Migration**:

```bash
# Step 1: Try Rolldown on Vite 7
npm remove vite
npm install rolldown-vite
npm run build  # Fix issues

# Step 2: Upgrade to Vite 8
npm remove rolldown-vite
npm install vite@8
```

## CLI Commands

```bash
vite dev              # Start dev server
vite build            # Production build
vite preview          # Preview build
vite build --force     # Force rebuild
vite build --watch     # Watch mode
vite --debug           # Debug mode
```

## Monorepo

**Turborepo**:

```json
{
  "tasks": {
    "build": { "outputs": ["dist/**"] },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    }
  }
}
```

**Nx**: Use `@nx/vite` plugin for task inference and caching.

**Internal packages**: Use `workspace:*` protocol. Configure `resolve.alias` for
path resolution.

## Security

**CSP Headers**:

```typescript
// Dev needs looser policy for HMR
Content-Security-Policy: script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss:

// Prod should be strict
Content-Security-Policy: script-src 'self'; style-src 'self'
```

**Environment Variables**:

- `VITE_*` exposed to client (never put secrets here)
- Server-only vars: no prefix, use `loadEnv()` in config
- `.env.local` gitignored for secrets

**Static Assets**: Use `public/` for assets that shouldn't be hashed.

## Best Practices

- Explicit file extensions in imports
- Direct imports, no barrel files
- Manual chunking for vendor code
- Lazy load routes
- Browser cache enabled in dev
- Chrome/Safari for development
- Pre-bundle heavy deps
- Source maps enabled
- ESM configuration
- Node 20.19+ or 22.12+
- Incognito mode for testing
- Keep Vite updated
- Framework-specific plugins

## Resources

- [Official Docs](https://vite.dev)
- [GitHub](https://github.com/vitejs/vite)
- [Plugins](https://vite.dev/plugins)
- [Rolldown](https://rolldown.rs)
- [Oxc](https://oxc.rs)
- [Lightning CSS](https://lightningcss.dev)
- [Module Federation](https://github.com/module-federation/vite)
