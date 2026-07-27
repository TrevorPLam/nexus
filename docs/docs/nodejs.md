# Node.js

## Overview

Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. It enables JavaScript to run outside the browser, making it suitable for server-side applications, CLI tools, and more.

## Version Schedule (2026)

**Active LTS:** Node.js 24.x (codename: Krypton)
- Initial Release: 2025-05-06
- Active LTS Start: 2025-10-28
- Maintenance Start: 2026-10-20
- End-of-Life: 2028-04-30

**Current:** Node.js 26.x
- Initial Release: 2026-05-05
- Active LTS Start: 2026-10-28
- Maintenance Start: 2027-10-20
- End-of-Life: 2029-04-30

**Maintenance LTS:** Node.js 22.x (codename: Jod)
- End-of-Life: 2027-04-30

**New Release Schedule (from Node 27):**
- One major release per year (April), LTS promotion in October
- Every release becomes LTS (no odd/even distinction)
- Alpha channel (Oct-Mar) for early testing
- LTS duration: 30 months

### Version Selection
- **Production:** Active LTS (24.x)
- **Development:** Current (26.x)
- **Legacy Support:** Maintenance LTS (22.x)

## Platform Support

### Tier 1 Platforms
- **Linux:** x64, ARM64 (kernel >= 4.18, glibc >= 2.28)
- **Windows:** x64 (>= Windows 10/Server 2016)
- **macOS:** ARM64 (>= 13.5), x64 (>= 13.5, Tier 2)

### Tier 2 Platforms
- **Windows:** ARM64 (>= Windows 10)
- **Linux:** PPC64LE, s390x (kernel >= 4.18, glibc >= 2.28)
- **AIX:** PPC64BE (>= 7.2 TL04)
- **SmartOS:** x64 (>= 18)

### Experimental
- **Linux:** x86, ARMv7, loong64, riscv64
- **FreeBSD:** x64 (>= 13.2)
- **OpenHarmony:** ARM64 (>= 5.0)

### Build Requirements
- **Linux:** GCC >= 13.2 or Clang >= 19.1
- **Windows:** Visual Studio 2022 or 2026 with Windows 11 SDK
- **macOS:** Xcode >= 16.4 (Apple LLVM >= 19)
- **Python:** 3.10+ for native modules
- **OpenSSL:** 3.x

## Basics and Fundamentals

### Event Loop Architecture
Node.js uses a single-threaded event loop model:
- JavaScript runs on the main thread
- I/O operations are offloaded to libuv's thread pool
- The event loop coordinates callbacks when I/O completes
- Six phases: timers, pending callbacks, idle/poll, check, close callbacks

### Module Systems

### CommonJS (CJS)
- Synchronous loading via `require()` and `module.exports`
- Extensions: `.js` (default), `.cjs` (explicit)
- Package type: `"type": "commonjs"` or absent

### ECMAScript Modules (ESM)
- Asynchronous loading via `import`/`export`
- Extensions: `.mjs` (explicit), `.js` with `"type": "module"`
- Top-level `await` supported
- Static analysis and tree-shaking enabled

### Interoperability
- **ESM → CJS:** CJS `module.exports` becomes ESM default export
- **CJS → ESM:** `require()` can load synchronous ESM (Node 20.19+/22.12+)
- **Cross-boundary cycles:** Not supported (ERR_REQUIRE_CYCLE_MODULE)
- **`module-sync` condition:** For ESM without top-level await (Node 20.19+)

### Package Configuration
```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./index.js",
      "require": "./index.cjs",
      "default": "./index.js"
    },
    "./package.json": "./package.json"
  },
  "imports": {
    "#internal/*": "./src/internal/*.js"
  },
  "engines": { "node": ">=24.0.0" }
}
```

### Conditional Exports
Conditions (most to least specific): `"import"`, `"require"`, `"module-sync"`, `"node"`, `"default"`

### Subpath Patterns
```json
{
  "exports": {
    "./features/*.js": "./src/features/*.js"
  }
}
```
Use `null` to exclude private folders from patterns.

## Proper Implementation

### Project Setup
```bash
# Use .nvmrc for version consistency
echo "24" > .nvmrc

# Or enforce via package.json
cat package.json
{
  "engines": {
    "node": ">=24.0.0"
  }
}
```

### ESM-First Project Structure
```
project/
├── package.json          # "type": "module"
├── src/
│   ├── index.js          # ESM entry point
│   └── utils/
│       └── helper.js     # ESM (implicit)
└── legacy/
    └── old-code.cjs      # Explicit CommonJS
```

### Async Patterns

#### Modern async/await (Recommended)
```javascript
// Sequential (when operations depend on each other)
const user = await getUser(id);
const orders = await getOrders(user.id);

// Parallel (when operations are independent)
const [user, orders, prefs] = await Promise.all([
  getUser(id),
  getOrders(id),
  getPreferences(id)
]);

// Error handling
try {
  const result = await operation();
} catch (error) {
  // Handle error
}
```

#### Promise.allSettled for Independent Failures
```javascript
const results = await Promise.allSettled([
  fetchUserData(id),
  fetchAnalytics(id),
  fetchRecommendations(id)
]);

const successful = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);
```

### Error Handling
```javascript
// Custom error class
class AppError extends Error {
  constructor(message, code, isCatastrophic = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.isCatastrophic = isCatastrophic;
  }
}

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Crash and let orchestrator restart
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // Crash and let orchestrator restart
  process.exit(1);
});
```

## Core APIs

### File System (fs)
- **Async (preferred):** `fs/promises` API
- **Sync:** Use only in scripts, not request handlers
- **Streams:** `createReadStream()`, `createWriteStream()` for large files
- **FileHandle:** Explicit close required to prevent leaks

### HTTP/HTTPS
- **undici:** Modern HTTP client (Node 18+)
- **Keep-alive:** Enabled by default (Node 19+)
- **Compression:** Use `zlib.createGzip()` for response compression

### Crypto
- **Random:** `crypto.randomBytes()`, `crypto.randomUUID()`
- **Hashing:** `crypto.createHash()`, `crypto.timingSafeEqual()`
- **Encryption:** `crypto.scrypt()` for password hashing

### Streams
- **Types:** Readable, Writable, Duplex, Transform
- **Async iteration:** `for await (const chunk of readable)`
- **Pipeline:** `stream.pipeline()` for error handling

### Worker Threads
- **Use case:** CPU-bound work (image processing, encryption)
- **Communication:** `postMessage()`, `SharedArrayBuffer` for shared memory
- **Pools:** Use `piscina` for managed worker pools

### Child Process
- **spawn():** Streaming output, long-running processes
- **exec():** Shell commands, small output (1MB max)
- **execFile():** Direct binary execution, no shell
- **fork():** Node.js processes with IPC

## Advanced Patterns

### Async Wrapper
```javascript
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

### Factory Pattern
```javascript
const createDatabase = (config) =>
  config.type === 'postgres' ? new PostgresDatabase(config) :
  config.type === 'mongodb' ? new MongoDatabase(config) :
  new Error(`Unsupported: ${config.type}`);
```

### Repository Pattern
```javascript
class UserRepository {
  constructor(db) { this.db = db; }
  async findById(id) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

### Dependency Injection
```javascript
class UserService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }
}
```

### Middleware Pipeline
```javascript
const compose = (...middlewares) => (context) =>
  middlewares.reduce((p, m) => p.then(() => m(context)), Promise.resolve());
```

### Event Emitter
```javascript
class OrderService extends EventEmitter {
  async createOrder(orderData) {
    const order = await this.saveOrder(orderData);
    this.emit('order.created', { order });
    return order;
  }
}
```

## Anti-Patterns

### 1. Blocking the Event Loop
```javascript
// BAD - Synchronous I/O in request handler
app.get('/data', (req, res) => {
  const data = fs.readFileSync('/large/file.json'); // Blocks event loop
  res.json(data);
});

// GOOD - Async I/O
app.get('/data', async (req, res) => {
  const data = await fs.readFile('/large/file.json');
  res.json(data);
});
```

### 2. Sequential Awaits for Independent Operations
```javascript
// BAD - Sequential (300ms total)
const user = await getUser(id);        // 100ms
const orders = await getOrders(id);    // 100ms
const prefs = await getPreferences(id); // 100ms

// GOOD - Parallel (100ms total)
const [user, orders, prefs] = await Promise.all([
  getUser(id),
  getOrders(id),
  getPreferences(id)
]);
```

### 3. Fire-and-Forget Async
```javascript
// BAD - No error handling
app.post('/sync', (req, res) => {
  syncUsersFromRemoteSystem(); // No await, no error handling
  res.json({ started: true });
});

// GOOD - Proper error handling
app.post('/sync', async (req, res) => {
  try {
    await syncUsersFromRemoteSystem();
    res.json({ started: true });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});
```

### 4. Unbounded Database Queries
```javascript
// BAD - No pagination
const orders = await prisma.order.findMany();

// GOOD - With pagination
const page = Number(req.query.page ?? 1);
const pageSize = 50;
const orders = await prisma.order.findMany({
  take: pageSize,
  skip: (page - 1) * pageSize,
  orderBy: { createdAt: 'desc' }
});
```

### 5. N+1 Query Pattern
```javascript
// BAD - N+1 queries
const orders = await Order.findAll();
for (const order of orders) {
  order.customer = await Customer.findById(order.customerId);
}

// GOOD - Eager loading
const orders = await Order.findAll({
  include: [{ model: Customer }]
});
```

### 6. Buffering Large Files
```javascript
// BAD - Loads entire file into memory
app.get('/download/:id', async (req, res) => {
  const data = await fs.readFile(`/files/${req.params.id}`);
  res.send(data);
});

// GOOD - Streams directly
app.get('/download/:id', (req, res) => {
  const stream = fs.createReadStream(`/files/${req.params.id}`);
  stream.pipe(res);
});
```

### 7. Missing File Extensions in ESM
```javascript
// BAD - Missing extension (ESM requires extensions)
import { utils } from './utils';

// GOOD - With extension
import { utils } from './utils.js';
```

### 8. Logging Sensitive Data
```javascript
// BAD - Logs entire headers (includes auth tokens)
console.log(req.headers);

// GOOD - Log only what you need
console.log({
  method: req.method,
  url: req.url,
  userAgent: req.headers['user-agent']
});
```

### 9. Insecure JWT Verification
```javascript
// BAD - Doesn't pin algorithm
const decoded = jwt.verify(token, secret);

// GOOD - Explicitly pins algorithm
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
```

### 10. Unbounded Input Validation
```javascript
// BAD - No max length (DoS vector)
const passwordSchema = z.string().min(8);

// GOOD - Caps input (bcrypt truncates at 72 bytes)
const passwordSchema = z.string().min(8).max(100);
```

## Performance

### Event Loop
- **Target:** < 10ms lag p99
- **Avoid:** Sync I/O, crypto, compression in hot paths
- **Monitor:** `process.uptime()`, custom lag measurement

### Database
- **Pools:** 20-40 connections typical
- **Pagination:** Required for large datasets
- **N+1:** Eliminate with joins or DataLoader
- **Indexes:** Frequently queried fields

### HTTP
- **Keep-alive:** Default (Node 19+)
- **Client:** undici recommended
- **Timeouts:** Set appropriately
- **Rate limiting:** Implement per endpoint

### Memory
- **Monitor:** Heap usage, GC activity
- **Streams:** Large payloads
- **Caches:** Bounded with TTL
- **Flag:** `--max-old-space-size` (~75% container memory)

### Caching
- **Threshold:** Hit rate > 25-30%
- **Distributed:** Redis
- **Invalidation:** Implement strategy
- **Warming:** Hot data pre-load

### Worker Pools
- **Library:** piscina
- **Use cases:** Image processing, PDF generation, password hashing
- **Avoid:** Spawning per request

## Security

### Input Validation
- **Tool:** Zod or similar
- **Max lengths:** Enforce on all input
- **Output:** Sanitize and escape
- **Database:** Parameterized queries only

### Environment
- **Validation:** At startup via `@t3-oss/env-core`
- **Secrets:** Never commit `.env`
- **Template:** `.env.example`

### Rate Limiting
- **Store:** Redis for distributed
- **Endpoints:** Tighter limits on sensitive routes
- **Proxy:** Configure `trust proxy` behind LBs
- **Backoff:** Exponential for retries

### Headers (helmet)
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
```

### CORS
```javascript
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || [];
    callback(!origin || allowed.includes(origin) ? null : new Error('Not allowed'));
  },
  credentials: true
}));
```

### CSRF
- **Tokens:** Use `csurf` middleware
- **Cookies:** `SameSite=Lax`, `Secure`, `HttpOnly`
- **Origin:** Validate on sensitive routes

### Supply Chain
- **npmrc:** `engine-strict=true`
- **Age:** `minimumReleaseAge=1440`
- **Audit:** Regular `npm audit`

### Passwords
- **Hashing:** bcrypt/argon2
- **Cost:** Factor appropriate to hardware
- **Compare:** `crypto.timingSafeEqual()` for tokens

## Monitoring

### Metrics
- Event loop lag (p99)
- CPU utilization
- Memory (RSS, heap)
- Request latency (p50, p95, p99)
- Error rates
- Database query performance

### Diagnostics
- **Memory leaks:** Heap snapshots
- **Hot paths:** CPU profiles
- **Memory pressure:** GC traces
- **Request flows:** Distributed tracing

### Logging (pino)
```javascript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', '*.password', '*.token']
});
```
- **Transport:** Worker thread for external processing
- **Context:** AsyncLocalStorage for request-scoped data
- **Redaction:** Required for PII

### Graceful Shutdown
```javascript
const shutdown = async () => {
  server.close();
  await db.disconnect();
  await queue.drain();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## TypeScript

### Setup
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true
  }
}
```

### Runtime
- **Full support:** `tsx` (esbuild-powered)
- **Native:** Node.js type stripping (Node 22.7+)
- **Build:** `tsc` for production

### Module Resolution
- **NodeNext:** For Node.js runtime
- **Bundler:** For framework/bundler apps
- **Extensions:** Required in ESM imports

## Package Management

### pnpm (Recommended)
- **Workspaces:** `pnpm-workspace.yaml`
- **Protocol:** `workspace:*` for internal deps
- **Store:** Content-addressable, disk-efficient
- **Monorepos:** Best for large repos

### npm
- **Workspaces:** `workspaces` field in package.json
- **Compatibility:** Highest
- **Learning curve:** Lowest

### Yarn
- **Berry:** PnP mode, strict resolution
- **Classic:** Hoisting like npm
- **Use case:** Existing Yarn teams

## Testing

### Unit/Integration: Vitest
- **Speed:** 5-10x faster than Jest
- **ESM:** Native support
- **Config:** Shared with Vite

### E2E: Playwright
- **Browsers:** Chromium, Firefox, WebKit
- **Parallelism:** Built-in
- **Debugging:** Trace viewer

### Jest
- **Use case:** Existing codebases
- **Ecosystem:** Largest

## Debugging

### Inspector
```bash
node --inspect app.js          # Enable inspector
node --inspect-brk app.js      # Break on start
node --inspect-wait app.js     # Wait for debugger
```

### Chrome DevTools
- Navigate to `chrome://inspect`
- Configure host/port
- Click "inspect" on target

### Probe Mode
```bash
node inspect --probe file:line --expr expression script.js
```

## Deployment

### Dockerfile (Multi-stage)
```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Best Practices
- **Non-root:** Run as node user
- **Caching:** Copy package.json first
- **Health check:** Implement endpoint
- **Signals:** Handle SIGTERM gracefully

## Clustering

### Built-in Cluster
```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  for (let i = 0; i < os.availableParallelism(); i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => cluster.fork());
} else {
  require('./app');
}
```

### PM2
```bash
pm2 start app.js -i max  # Cluster mode
pm2 reload all           # Zero-downtime restart
```

### Considerations
- **Self-host:** Use cluster module
- **Containers:** Platform handles scaling
- **State:** Avoid in-memory state
- **Jobs:** Single worker only

## Resources

- [Official Node.js Documentation](https://nodejs.org/docs/latest/api/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Node.js Release Schedule](https://github.com/nodejs/Release)
- [Package Configuration Guide](https://nodejs.github.io/package-examples/)
