# Supabase

## Overview

Supabase is an open-source Firebase alternative that provides a complete
backend-as-a-service platform. It includes a PostgreSQL database,
authentication, real-time subscriptions, storage, and edge functions, all with a
unified API and excellent TypeScript support.

## Latest Stable Version

**Version**: `2.0.0` (July 2026)

**Compatibility**:

- PostgreSQL: 15.0+
- Node.js: 18.0.0+, 20.0.0+
- Browsers: Modern browsers (Chrome, Firefox, Safari, Edge)
- Package Managers: npm, pnpm, yarn, bun
- Frameworks: React, Next.js, Vue, Svelte, Angular

**Key Features**:

- PostgreSQL database
- Authentication and authorization
- Real-time subscriptions
- File storage
- Edge functions
- Row-level security (RLS)
- TypeScript support
- RESTful API

## Core Concepts

- **Database**: PostgreSQL database with automatic API generation
- **Authentication**: User authentication and authorization
- **Real-time**: Real-time data subscriptions
- **Storage**: File storage and management
- **Edge Functions**: Serverless functions at the edge
- **RLS**: Row-level security policies
- **Client SDKs**: Type-safe client libraries
- **Management API**: Programmatic project management

## Key Features

- **PostgreSQL**: Full PostgreSQL database with extensions
- **Auto-generated API**: RESTful API from database schema
- **Authentication**: Built-in auth providers (email, OAuth, phone)
- **Real-time**: WebSocket-based real-time subscriptions
- **Storage**: S3-compatible file storage
- **Edge Functions**: Deno-based serverless functions
- **RLS**: Fine-grained access control
- **TypeScript**: Full TypeScript support with auto-generated types
- **Open Source**: Self-hosted option available

## Basic Usage

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Initialize client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

## Installation

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Install for React
npm install @supabase/supabase-js @supabase/auth-helpers-react

# Install for Next.js
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

## Database Operations

### Select

```typescript
const { data, error } = await supabase.from('users').select('*');

if (error) console.error(error);
else console.log(data);
```

### Insert

```typescript
const { data, error } = await supabase
  .from('users')
  .insert([{ name: 'John', email: 'john@example.com' }])
  .select();
```

### Update

```typescript
const { data, error } = await supabase
  .from('users')
  .update({ name: 'Jane' })
  .eq('id', 1);
```

### Delete

```typescript
const { data, error } = await supabase.from('users').delete().eq('id', 1);
```

## Authentication

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

### OAuth

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
});
```

## Real-time Subscriptions

### Subscribe to Changes

```typescript
const subscription = supabase
  .channel('custom-channel')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'users',
    },
    (payload) => {
      console.log('Change received!', payload);
    },
  )
  .subscribe();
```

### Unsubscribe

```typescript
supabase.removeChannel(subscription);
```

## Storage

### Upload File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('public/avatar1.png', file);
```

### Download File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .download('public/avatar1.png');
```

### Get Public URL

```typescript
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('public/avatar1.png');

console.log(data.publicUrl);
```

### Delete File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .remove(['public/avatar1.png']);
```

## Row-Level Security (RLS)

### Enable RLS

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### Create Policy

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own data"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
USING (auth.uid() = id);
```

### Disable RLS

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

## Advanced Patterns

### Complex Queries

```typescript
const { data, error } = await supabase.from('posts').select(`
    *,
    author:author_id (
      name,
      email
    ),
    comments (
      content,
      author:author_id (
        name
      )
    )
  `);
```

### Filtering

```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'active')
  .gte('age', 18)
  .order('created_at', { ascending: false })
  .limit(10);
```

### Full-Text Search

```typescript
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .textSearch('content', 'search term');
```

### Transactions

```typescript
const { data, error } = await supabase.rpc('create_user_with_profile', {
  user_name: 'John',
  user_email: 'john@example.com',
});
```

## TypeScript Integration

### Generate Types

```bash
supabase gen types typescript --project-id your-project-id > src/types/supabase.ts
```

### Use Generated Types

```typescript
import { Database } from './types/supabase';

type User = Database['public']['Tables']['users']['Row'];

const { data } = await supabase.from('users').select('*').returns<User[]>();
```

## Anti-Patterns

### 1. Not Using RLS

**BAD**:

```sql
-- No RLS policies
```

**GOOD**:

```sql
-- Enable RLS and create policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
```

**Why**: RLS is essential for data security in multi-tenant applications.

### 2. Exposing Service Keys

**BAD**:

```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
```

**GOOD**:

```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**Why**: Service keys should only be used server-side, never in client code.

### 3. Not Handling Errors

**BAD**:

```typescript
const { data } = await supabase.from('users').select('*');
console.log(data);
```

**GOOD**:

```typescript
const { data, error } = await supabase.from('users').select('*');
if (error) {
  console.error('Error:', error);
} else {
  console.log(data);
}
```

**Why**: Proper error handling prevents crashes and improves debugging.

### 4. Not Using Transactions

**BAD**:

```typescript
await supabase.from('users').insert({ name: 'John' });
await supabase.from('posts').insert({ title: 'First Post' });
```

**GOOD**:

```typescript
await supabase.rpc('create_user_with_post', {
  user_name: 'John',
  post_title: 'First Post',
});
```

**Why**: Transactions ensure data consistency across multiple operations.

## Performance Optimization

### 1. Use Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_author_id ON posts(author_id);
```

### 2. Use Selective Queries

```typescript
// BAD
const { data } = await supabase.from('users').select('*');

// GOOD
const { data } = await supabase.from('users').select('id, name, email');
```

### 3. Use Pagination

```typescript
const { data } = await supabase.from('users').select('*').range(0, 9);
```

### 4. Use Database Functions

```typescript
const { data } = await supabase.rpc('complex_query', { param: value });
```

## Integration with Frameworks

### Next.js

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function Page() {
  const supabase = createServerComponentClient({ cookies })
  const { data } = await supabase.from('users').select('*')

  return <div>{JSON.stringify(data)}</div>
}
```

### React

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-react'

function UserProfile() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  return <div>{user?.email}</div>
}
```

## Common Commands

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Install auth helpers
npm install @supabase/auth-helpers-react
npm install @supabase/auth-helpers-nextjs

# Generate types
supabase gen types typescript --project-id your-project-id > src/types/supabase.ts
```

## Troubleshooting

### Common Issues

**Connection errors**:

- Verify SUPABASE_URL and SUPABASE_ANON_KEY
- Check network connectivity
- Ensure project is active

**Authentication errors**:

- Verify auth configuration
- Check RLS policies
- Ensure user is authenticated

**Real-time issues**:

- Check WebSocket connection
- Verify channel names
- Ensure RLS allows real-time access

### Debugging

```typescript
// Enable debug mode
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    debug: true,
  },
});
```

## Best Practices

1. **Always use RLS** for data security
2. **Never expose service keys** in client code
3. **Handle errors gracefully** in all operations
4. **Use transactions** for multi-step operations
5. **Generate TypeScript types** for type safety
6. **Use indexes** for frequently queried columns
7. **Implement proper pagination** for large datasets
8. **Use database functions** for complex logic
9. **Monitor performance** with Supabase dashboard
10. **Use environment variables** for configuration
11. **Implement proper caching** strategies
12. **Test RLS policies** thoroughly
13. **Use selective queries** to reduce data transfer
14. **Implement proper error handling** for auth
15. **Keep database schema** well-documented

## Resources

- [Official Supabase Documentation](https://supabase.com/docs)
- [Supabase GitHub Repository](https://github.com/supabase/supabase)
- [Supabase Client Documentation](https://supabase.com/docs/reference/javascript)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Documentation](https://supabase.com/docs/guides/realtime)
