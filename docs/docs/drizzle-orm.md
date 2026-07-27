# Drizzle ORM

## Overview

TypeScript-first ORM for SQL databases. Schema-first approach with full type safety, zero runtime overhead, and SQL-like query builder. Supports PostgreSQL, MySQL, SQLite, SingleStore, CockroachDB.

## Latest Stable Version

**Version**: `v1.0.0-rc.4` (June 2026)

**Compatibility**:
- Node.js: >=20 (>=22.5.0 for node:sqlite driver)
- Databases: PostgreSQL 12+, MySQL 8+, SQLite 3+
- Package Managers: npm, pnpm, yarn, bun
- Runtimes: Node.js, Bun, Deno, Cloudflare Workers, Edge, Browser

**Key Features**:
- Schema-first with TypeScript types
- SQL-like query builder
- Zero learning curve for SQL developers
- Excellent TypeScript support
- Lightweight and fast
- Migration system via Drizzle Kit
- Connection pooling support
- Full-text search support

## Core Concepts

- **Schema**: TypeScript table definitions
- **Query Builder**: Chainable SQL API
- **Migrations**: Version-controlled schema changes with rollback
- **Relations**: Type-safe relationships
- **Transactions**: ACID-compliant with isolation levels
- **Connection Pool**: Efficient management with read replicas
- **Drizzle Kit**: CLI for migrations, introspection, Studio

## Key Features

- **Type Safety**: Full TypeScript inference
- **Schema-First**: TypeScript → SQL generation
- **Query Builder**: Chainable SQL-like API
- **Migrations**: Auto-generation with rollback support
- **Performance**: Prepared statements (30-60% faster)
- **Multi-DB**: PostgreSQL, MySQL, SQLite, SingleStore, CockroachDB
- **Relations**: Type-safe relationship queries
- **Transactions**: ACID with isolation levels
- **Read Replicas**: Automatic read/write routing
- **Full-Text Search**: PostgreSQL tsvector
- **Multi-Tenancy**: RLS and schema isolation
- **Observability**: OpenTelemetry support

## Installation

```bash
# Core
npm install drizzle-orm

# Drivers
npm install postgres              # PostgreSQL
npm install mysql2                # MySQL
npm install better-sqlite3        # SQLite
npm install @neondatabase/serverless  # Neon

# CLI
npm install -D drizzle-kit
```

## Schema Definition

### PostgreSQL Schema

```typescript
import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: serial('author_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
})
```

### MySQL Schema

```typescript
import { mysqlTable, serial, varchar, timestamp, boolean } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
})
```

### SQLite Schema

```typescript
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})
```

## Database Connection

### PostgreSQL

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString)
export const db = drizzle(client)
```

### Neon Serverless

```typescript
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

const connectionString = process.env.DATABASE_URL
const sql = neon(connectionString)
export const db = drizzle(sql)
```

### Supabase

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client)
```

## Query Operations

### Insert

```typescript
import { users } from './schema'
import { db } from './db'

// Single insert
await db.insert(users).values({
  email: 'user@example.com',
  name: 'John Doe'
})

// Multiple insert
await db.insert(users).values([
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' }
])

// Returning inserted data
const newUser = await db.insert(users).values({
  email: 'user@example.com',
  name: 'John Doe'
}).returning()
```

### Select

```typescript
import { users, posts } from './schema'
import { eq, and, or, like } from 'drizzle-orm'

// Select all
const allUsers = await db.select().from(users)

// Select with where
const user = await db.select().from(users).where(eq(users.id, 1))

// Select with multiple conditions
const activeUsers = await db.select().from(users).where(
  and(
    eq(users.isActive, true),
    like(users.email, '%@example.com')
  )
)

// Select specific columns
const userEmails = await db.select({
  email: users.email,
  name: users.name
}).from(users)

// Select with relations
const usersWithPosts = await db.select().from(users).leftJoin(posts, eq(users.id, posts.authorId))
```

### Update

```typescript
import { users } from './schema'
import { eq } from 'drizzle-orm'

// Update single
await db.update(users).set({
  name: 'Jane Doe'
}).where(eq(users.id, 1))

// Update with returning
const updatedUser = await db.update(users).set({
  name: 'Jane Doe'
}).where(eq(users.id, 1))
.returning()
```

### Delete

```typescript
import { users } from './schema'
import { eq } from 'drizzle-orm'

// Delete single
await db.delete(users).where(eq(users.id, 1))

// Delete with returning
const deletedUser = await db.delete(users).where(eq(users.id, 1)).returning()
```

## Relations

### Schema with Relations

```typescript
import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: serial('author_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts)
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  })
}))
```

### Query with Relations

```typescript
import { users } from './schema'
import { db } from './db'

const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: true
  }
})

// Nested relations
const userWithPostsAndComments = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: {
      with: {
        comments: true
      }
    }
  }
})
```

## Transactions

```typescript
import { db } from './db'

await db.transaction(async (tx) => {
  await tx.insert(users).values({
    email: 'user@example.com',
    name: 'John Doe'
  })
  
  await tx.insert(posts).values({
    title: 'First Post',
    content: 'Hello World',
    authorId: 1
  })
})
```

## Migrations

### Drizzle Kit Configuration

**`drizzle.config.ts`**:
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
} satisfies Config
```

### Generate Migration

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migration (via Supabase CLI)
supabase db push

# Or apply directly (for local development)
pnpm drizzle-kit migrate
```

### Introspection

```bash
# Generate schema from existing database
pnpm drizzle-kit introspect
```

## Advanced Patterns

### Custom Types

```typescript
import { pgTable, serial, text, customType } from 'drizzle-orm/pg-core'

const customTimestamp = customType<{ data: Date; notNull: true; default: true }>({
  dataType() {
    return 'timestamp'
  },
  toDriver(value) {
    return value.toISOString()
  },
  fromDriver(value) {
    return new Date(value)
  }
})

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  createdAt: customTimestamp('created_at').notNull().defaultNow()
})
```

### Enum Types

```typescript
import { pgEnum, pgTable, serial, text } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['user', 'admin', 'moderator'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: roleEnum('role').notNull().default('user')
})
```

### Indexes

```typescript
import { pgTable, serial, text, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull()
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  nameIdx: index('name_idx').on(table.name)
}))
```

### Views

```typescript
import { pgView, sql } from 'drizzle-orm/pg-core'

export const activeUsersView = pgView('active_users').as((qb) => qb
  .select()
  .from(users)
  .where(eq(users.isActive, true))
)
```

## Anti-Patterns

### 1. Using Raw SQL Unnecessarily

**BAD**:
```typescript
const result = await db.execute(sql`SELECT * FROM users WHERE email = ${email}`)
```

**GOOD**:
```typescript
const result = await db.select().from(users).where(eq(users.email, email))
```

**Why**: Query builder provides type safety and better maintainability.

### 2. Not Using Transactions

**BAD**:
```typescript
await db.insert(users).values(user)
await db.insert(posts).values(post)
```

**GOOD**:
```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(user)
  await tx.insert(posts).values(post)
})
```

**Why**: Transactions ensure data consistency.

### 3. Ignoring Type Safety

**BAD**:
```typescript
const user = await db.select().from(users).where(sql`id = ${id}`)
```

**GOOD**:
```typescript
const user = await db.select().from(users).where(eq(users.id, id))
```

**Why**: Type safety prevents runtime errors.

### 4. Not Using Relations

**BAD**:
```typescript
const user = await db.select().from(users).where(eq(users.id, 1))
const posts = await db.select().from(posts).where(eq(posts.authorId, 1))
```

**GOOD**:
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: true
  }
})
```

**Why**: Relations are more efficient and type-safe.

### 5. Not Indexing Frequently Queried Columns

**BAD**:
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique()
})
```

**GOOD**:
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique()
}, (table) => ({
  emailIdx: index('email_idx').on(table.email)
}))
```

**Why**: Indexes improve query performance.

## Performance Optimization

### 1. Use Connection Pooling

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(connectionString, {
  max: 10, // Maximum connections
  idle_timeout: 20,
  connect_timeout: 10
})
export const db = drizzle(client)
```

### 2. Select Only Needed Columns

```typescript
// BAD
const users = await db.select().from(users)

// GOOD
const userEmails = await db.select({
  email: users.email,
  name: users.name
}).from(users)
```

### 3. Use Indexes

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique()
}, (table) => ({
  emailIdx: index('email_idx').on(table.email)
}))
```

### 4. Batch Operations

```typescript
// BAD
for (const user of users) {
  await db.insert(users).values(user)
}

// GOOD
await db.insert(users).values(users)
```

### 5. Use Prepared Statements

Drizzle automatically uses prepared statements for better performance.

## Integration with Tools

### Supabase

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client)
```

### Neon

```typescript
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql)
```

### PlanetScale

```typescript
import { drizzle } from 'drizzle-orm/planetscale-serverless'
import { connect } from '@planetscale/database'

const connection = connect({
  url: process.env.DATABASE_URL
})
export const db = drizzle(connection)
```

## Common Commands

```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit migrate

# Introspect database
pnpm drizzle-kit introspect

# Push schema changes (development only)
pnpm drizzle-kit push

# Open Drizzle Studio
pnpm drizzle-kit studio
```

## Troubleshooting

### Common Issues

**Migration conflicts**:
- Resolve conflicts manually in migration files
- Use `drizzle-kit push` for development only

**Type errors**:
- Ensure schema is properly typed
- Check Drizzle version compatibility

**Connection issues**:
- Verify DATABASE_URL is correct
- Check database accessibility
- Ensure connection pool is configured

**Slow queries**:
- Add indexes to frequently queried columns
- Use `explain()` to analyze query performance
- Select only needed columns

### Debugging

```typescript
// Enable query logging
const db = drizzle(client, { logger: true })

// Explain query
const query = db.select().from(users).where(eq(users.id, 1))
console.log(query.toSQL())
```

## Best Practices

1. Schema-first in TypeScript
2. Leverage type safety
3. Use transactions for consistency
4. Index foreign keys and frequent queries
5. Select only needed columns
6. Use relations for complex queries
7. Version control migrations
8. Use connection pooling
9. Batch operations
10. Use prepared statements for hot paths
11. Test migrations in staging
12. Document schema
13. Use enums for integrity
14. Validate with Zod
15. Monitor query performance

## Advanced Query Patterns

### Aggregations

```typescript
import { count, sum, avg, min, max } from 'drizzle-orm';

const stats = await db.select({
  totalUsers: count(),
  avgAge: avg(users.age),
  maxSalary: max(salaries.amount)
}).from(users);

// Group by
const byDepartment = await db.select({
  department: users.department,
  count: count()
}).from(users)
.groupBy(users.department);

// Having clause
const deptStats = await db.select({
  department: users.department,
  avgSalary: avg(users.salary)
}).from(users)
.groupBy(users.department)
.having(sql`avg(${users.salary}) > 50000`);
```

### Window Functions

```typescript
import { sql } from 'drizzle-orm';

const ranked = await db.select({
  name: users.name,
  salary: users.salary,
  rank: sql<number>`RANK() OVER (ORDER BY ${users.salary} DESC)`.as('rank')
}).from(users);
```

### Common Table Expressions (CTEs)

```typescript
const activeUsers = db.select().from(users).where(eq(users.isActive, true)).as('active_users');

const results = await db.select().from(activeUsers).leftJoin(posts, eq(activeUsers.id, posts.authorId));
```

### Subqueries

```typescript
const recentPosts = db.select().from(posts)
  .where(sql`${posts.createdAt} > NOW() - INTERVAL '7 days'`)
  .as('recent_posts');

const results = await db.select().from(users)
  .innerJoin(recentPosts, eq(users.id, recentPosts.authorId));
```

## Testing

### Unit Testing with Mocks

```typescript
import { createDrizzleMockClient } from 'drizzle-orm-test';

const mockDb = createDrizzleMockClient();

// Test without database
await mockDb.insert(users).values({ name: 'Test' });
```

### Integration Testing with Real Database

```typescript
import { getConnections, PgTestClient } from 'drizzle-orm-test';

let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await getConnections());
});

afterAll(async () => { await teardown(); });

beforeEach(async () => { await db.beforeEach(); });
afterEach(async () => { await db.afterEach(); });

it('queries users correctly', async () => {
  const drizzleDb = drizzle(db.client);
  await drizzleDb.insert(users).values({ name: 'Test' });
  const result = await drizzleDb.select().from(users);
  expect(result).toHaveLength(1);
});
```

### Database Seeding

```typescript
import { seed, reset } from 'drizzle-seed';

// Seed with fake data
await seed(db, schema, { count: 100, seed: 12345 });

// Reset database
await reset(db, schema);

// Refine seeding
await seed(db, schema).refine((funcs) => ({
  users: {
    count: 20,
    columns: {
      name: funcs.valuesFromArray({ values: ['Alice', 'Bob', 'Charlie'] })
    },
    with: { posts: 5 }
  }
}));
```

## Performance

### Prepared Statements (30-60% faster)
```typescript
const getUser = db.select().from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user');

await getUser.execute({ id: 1 });
await getUser.execute({ id: 2 });
```

### Read Replicas
```typescript
const db = withReplicas(primaryDb, [read1, read2]);
await db.select().from(users); // Reads from replica
await db.insert(users).values({}); // Writes to primary
await db.$primary.select().from(users); // Force primary
```

### Monitoring
```typescript
const db = drizzle(client, { logger: true });
// or custom: { logger: { logQuery: (q, p) => console.log(q, p) } }
```

## Error Handling

```typescript
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { DatabaseError } from 'pg';

try {
  await db.insert(users).values({ email: 'test@example.com' });
} catch (error) {
  if (error instanceof DrizzleQueryError && error.cause instanceof DatabaseError) {
    const { code, constraint, column } = error.cause;
    if (code === '23505') console.error('Duplicate:', constraint);
    if (code === '23503') console.error('FK violation:', constraint);
    if (code === '23502') console.error('Not null:', column);
  }
}
```

## Schema Patterns

### JSON with Type Safety
```typescript
interface Metadata { theme: 'light' | 'dark'; notifications: { email: boolean } }
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({ theme: 'light', notifications: { email: true } })
});
await db.select().from(users).where(sql`${users.metadata} @> '${JSON.stringify({ theme: 'dark' })}'::jsonb`);
```

### Soft Delete
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  deletedAt: timestamp('deleted_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date())
});
await db.select().from(users).where(isNull(users.deletedAt));
await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
```

### Multi-Tenancy (RLS)
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull()
});
await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
// Migration: CREATE POLICY tenant_isolation ON users FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::varchar);
```

## Pagination

### Cursor-Based (consistent, efficient)
```typescript
const getPage = (cursor?: number, pageSize = 10) => 
  db.select().from(users)
    .where(cursor ? gt(users.id, cursor) : undefined)
    .limit(pageSize)
    .orderBy(asc(users.id));

// Multi-column for non-unique ordering
const getPage = (cursor?: { id: number; createdAt: Date }, pageSize = 10) =>
  db.select().from(users)
    .where(cursor ? or(
      gt(users.createdAt, cursor.createdAt),
      and(eq(users.createdAt, cursor.createdAt), gt(users.id, cursor.id))
    ) : undefined)
    .limit(pageSize)
    .orderBy(asc(users.createdAt), asc(users.id));
```

### Offset-Based (simple, degrades at high offsets)
```typescript
const getPage = (page = 1, pageSize = 10) =>
  db.select().from(users)
    .orderBy(asc(users.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

// Deferred join for performance
const sq = db.select({ id: users.id }).from(users).orderBy(users.id).limit(pageSize).offset((page - 1) * pageSize).as('sq');
return db.select().from(users).innerJoin(sq, eq(users.id, sq.id)).orderBy(users.id);
```

## Full-Text Search (PostgreSQL)

```typescript
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  search: tsvector('search').notNull().generatedAlwaysAs(
    (): SQL => sql`setweight(to_tsvector('english', ${posts.title}), 'A') || setweight(to_tsvector('english', ${posts.body}), 'B')`
  )
}, (table) => [index('search_idx').using('gin', table.search)]);

await db.select().from(posts)
  .where(sql`${posts.search} @@ to_tsquery('english', ${searchTerm})`)
  .orderBy(sql`ts_rank(${posts.search}, to_tsquery('english', ${searchTerm}))`);
```

## Migration Rollback

```typescript
import { rollback } from 'drizzle-orm/postgres-js/migrator';
await rollback(db, { migrationsFolder: './drizzle' });
await rollback(db, { migrationsFolder: './drizzle' }, 2); // specific steps
```

## Drizzle Studio

```bash
pnpm drizzle-kit studio                    # Visual browser
pnpm drizzle-kit studio --port 3000       # Custom port
pnpm drizzle-kit studio --verbose         # SQL logging
```

**Features**: Schema-aware browsing, inline editing, SQL editor, multi-DB support, real-time sync, embeddable component.

## Schema Organization

```typescript
// Single file: schema.ts
export const users = pgTable('users', { ... });
export const posts = pgTable('posts', { ... });

// Multiple files: schema/users.ts, schema/posts.ts, schema/index.ts
export * from './users';
export * from './posts';

// Reusable patterns: schema/common.ts
export const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date())
};
export const users = pgTable('users', { id: serial('id').primaryKey(), ...timestamps });
```

## Resources

- [Official Drizzle Documentation](https://orm.drizzle.team)
- [Drizzle GitHub Repository](https://github.com/drizzle-team/drizzle-orm)
- [Drizzle Kit Documentation](https://orm.drizzle.team/docs/kit-overview)
- [PostgreSQL Adapter](https://orm.drizzle.team/docs/postgresql)
- [MySQL Adapter](https://orm.drizzle.team/docs/mysql)
- [SQLite Adapter](https://orm.drizzle.team/docs/sqlite)
- [Drizzle Studio](https://orm.drizzle.team/docs/drizzle-kit-studio)
- [Best Practices Guide](https://orm.drizzle.team/docs/guides/best-practices)
- [Performance Guide](https://orm.drizzle.team/docs/advanced/performance)
