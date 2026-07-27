# PowerSync

## Overview

PowerSync is an offline-first database synchronization platform for mobile and web applications. It provides real-time data synchronization between local SQLite databases and remote databases, enabling applications to work offline and sync automatically when connectivity is restored.

## Latest Stable Version

**Version**: `1.35.9` (July 2026)

**Compatibility**:
- React Native: 0.70+
- iOS: 12+
- Android: API 21+
- Web: Modern browsers with IndexedDB support
- Package Managers: npm, pnpm, yarn

**Key Features**:
- Offline-first architecture
- Real-time synchronization
- Conflict resolution
- Query observers
- Schema management
- Multiple database support
- React Native integration
- Web support

## Core Concepts

- **PowerSync Database**: Local SQLite database with sync capabilities
- **Sync Rules**: Define what data to sync and how
- **Observers**: React to data changes in real-time
- **Schema**: Database schema definition
- **Connection**: Connection to remote database
- **Conflict Resolution**: Handle data conflicts
- **Offline Support**: Work without internet connectivity

## Key Features

- **Offline-First**: Applications work without internet
- **Real-Time Sync**: Automatic synchronization when online
- **Conflict Resolution**: Handle data conflicts intelligently
- **Query Observers**: React to data changes
- **Schema Management**: Define and evolve database schema
- **Multiple Databases**: Support for multiple database backends
- **React Native Integration**: Native mobile support
- **Web Support**: Browser-based applications
- **TypeScript Support**: Full TypeScript integration

## Basic Usage

```bash
# Install PowerSync React Native
npm install @powersync/react-native

# Install PowerSync Web
npm install @powersync/react-web

# Install PowerSync Core
npm install @powersync/common
```

## Installation

### React Native

```bash
npm install @powersync/react-native @op-engineering/op-sqlite
```

### Web

```bash
npm install @powersync/react-web
```

### Drizzle Integration

```bash
npm install @powersync/drizzle-driver
```

## React Native Setup

### Database Schema

```typescript
import { Schema } from '@powersync/react-native'

export const AppSchema = new Schema([
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'TEXT', primaryKey: true },
      { name: 'name', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' }
    ]
  },
  {
    name: 'posts',
    columns: [
      { name: 'id', type: 'TEXT', primaryKey: true },
      { name: 'title', type: 'TEXT' },
      { name: 'content', type: 'TEXT' },
      { name: 'author_id', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' }
    ]
  }
])
```

### PowerSync Database

```typescript
import { PowerSyncDatabase } from '@powersync/react-native'
import { AppSchema } from './schema'

const database = new PowerSyncDatabase({
  database: {
    dbFilename: 'app.db'
  },
  schema: AppSchema
})

await database.initialize()
```

### Sync Rules

```typescript
import { AbstractPowerSyncDatabase, SyncRules } from '@powersync/common'

class AppSyncRules extends SyncRules {
  async getSyncRules() {
    return [
      {
        name: 'users',
        query: 'SELECT * FROM users WHERE user_id = token_user_id()'
      },
      {
        name: 'posts',
        query: 'SELECT * FROM posts WHERE author_id = token_user_id()'
      }
    ]
  }
}
```

### Sync Configuration

```typescript
import { PowerSyncDatabase } from '@powersync/react-native'
import { AppSyncRules } from './sync-rules'

const database = new PowerSyncDatabase({
  database: {
    dbFilename: 'app.db'
  },
  schema: AppSchema,
  syncRules: new AppSyncRules()
})

await database.connect({
  powersyncUrl: process.env.POWERSYNC_URL,
  powersyncToken: async () => {
    // Return authentication token
    return await getAuthToken()
  }
})
```

## Query Observers

### Basic Observer

```typescript
import { useQuery, usePowerSync } from '@powersync/react-native'

function UserList() {
  const { database } = usePowerSync()
  const [users] = useQuery(
    database,
    'SELECT * FROM users ORDER BY created_at DESC'
  )

  return (
    <View>
      {users.map(user => (
        <Text key={user.id}>{user.name}</Text>
      ))}
    </View>
  )
}
```

### Parameterized Query

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { database } = usePowerSync()
  const [user] = useQuery(
    database,
    'SELECT * FROM users WHERE id = ?',
    [userId]
  )

  if (!user) return <Text>Loading...</Text>

  return <Text>{user.name}</Text>
}
```

### Watch for Changes

```typescript
function useUserCount() {
  const { database } = usePowerSync()
  const [count, setCount] = useState(0)

  useEffect(() => {
    const observer = database.watch(
      'SELECT COUNT(*) as count FROM users',
      [],
      (result) => {
        setCount(result[0].count)
      }
    )

    return () => observer.cancel()
  }, [database])

  return count
}
```

## Data Operations

### Insert

```typescript
await database.execute(
  'INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)',
  [uuid.v4(), 'John Doe', 'john@example.com', new Date().toISOString()]
)
```

### Update

```typescript
await database.execute(
  'UPDATE users SET name = ? WHERE id = ?',
  ['Jane Doe', userId]
)
```

### Delete

```typescript
await database.execute(
  'DELETE FROM users WHERE id = ?',
  [userId]
)
```

### Batch Operations

```typescript
await database.write(async (tx) => {
  await tx.execute('INSERT INTO users ...')
  await tx.execute('INSERT INTO posts ...')
})
```

## Advanced Patterns

### Drizzle Integration

```typescript
import { PowerSyncDatabase } from '@powersync/react-native'
import { drizzlePowerSync } from '@powersync/drizzle-driver'
import { users } from './schema'

const database = new PowerSyncDatabase({
  database: { dbFilename: 'app.db' },
  schema: AppSchema
})

const db = drizzlePowerSync(database)

// Use Drizzle ORM
const allUsers = await db.select().from(users)
```

### Conflict Resolution

```typescript
class AppSyncRules extends SyncRules {
  async resolveConflict(local: any, remote: any): Promise<any> {
    // Custom conflict resolution logic
    if (local.updated_at > remote.updated_at) {
      return local
    }
    return remote
  }
}
```

### Multiple Tables Sync

```typescript
class AppSyncRules extends SyncRules {
  async getSyncRules() {
    return [
      {
        name: 'users',
        query: 'SELECT * FROM users WHERE user_id = token_user_id()'
      },
      {
        name: 'posts',
        query: 'SELECT * FROM posts WHERE author_id = token_user_id()'
      },
      {
        name: 'comments',
        query: 'SELECT * FROM comments WHERE user_id = token_user_id()'
      }
    ]
  }
}
```

### Offline Detection

```typescript
function ConnectionStatus() {
  const { database } = usePowerSync()
  const [status, setStatus] = useState('unknown')

  useEffect(() => {
    const checkStatus = async () => {
      const connected = await database.getStatus()
      setStatus(connected.connected ? 'online' : 'offline')
    }

    checkStatus()
    const interval = setInterval(checkStatus, 5000)

    return () => clearInterval(interval)
  }, [database])

  return <Text>Status: {status}</Text>
}
```

## Web Setup

### Web Database

```typescript
import { PowerSyncDatabase } from '@powersync/react-web'
import { AppSchema } from './schema'

const database = new PowerSyncDatabase({
  database: {
    dbFilename: 'app.db'
  },
  schema: AppSchema
})

await database.initialize()
```

### Web Sync

```typescript
await database.connect({
  powersyncUrl: process.env.POWERSYNC_URL,
  powersyncToken: async () => {
    return await getAuthToken()
  }
})
```

## Anti-Patterns

### 1. Not Handling Offline State

**BAD**:
```typescript
function DataList() {
  const [data, setData] = useState([])
  // No offline handling
}
```

**GOOD**:
```typescript
function DataList() {
  const { database } = usePowerSync()
  const [data] = useQuery(database, 'SELECT * FROM data')
  const [status] = useConnectionStatus()

  if (status === 'offline') {
    return <Text>Offline - showing cached data</Text>
  }

  return <DataList data={data} />
}
```

**Why**: Users expect apps to work offline.

### 2. Not Using Observers

**BAD**:
```typescript
function UserList() {
  const [users, setUsers] = useState([])
  // Manual refresh needed
}
```

**GOOD**:
```typescript
function UserList() {
  const { database } = usePowerSync()
  const [users] = useQuery(database, 'SELECT * FROM users')
  // Auto-updates
}
```

**Why**: Observers provide real-time updates automatically.

### 3. Ignoring Conflicts

**BAD**:
```typescript
// No conflict resolution
```

**GOOD**:
```typescript
class AppSyncRules extends SyncRules {
  async resolveConflict(local: any, remote: any): Promise<any> {
    // Handle conflicts
  }
}
```

**Why**: Conflicts can cause data loss if not handled.

### 4. Not Optimizing Queries

**BAD**:
```typescript
const [data] = useQuery(database, 'SELECT * FROM large_table')
```

**GOOD**:
```typescript
const [data] = useQuery(
  database,
  'SELECT id, name FROM large_table WHERE active = 1 LIMIT 100'
)
```

**Why**: Large queries slow down sync and UI.

## Performance Optimization

### 1. Use Efficient Queries

```typescript
// Select only needed columns
const [users] = useQuery(
  database,
  'SELECT id, name FROM users'
)
```

### 2. Use Indexes

```typescript
export const AppSchema = new Schema([
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'TEXT', primaryKey: true },
      { name: 'email', type: 'TEXT', indexed: true },
      { name: 'name', type: 'TEXT' }
    ]
  }
])
```

### 3. Batch Operations

```typescript
await database.write(async (tx) => {
  // Multiple operations in single transaction
})
```

### 4. Limit Sync Data

```typescript
{
  name: 'users',
  query: 'SELECT id, name, email FROM users WHERE user_id = token_user_id()'
}
```

## Configuration

### Environment Variables

```typescript
const database = new PowerSyncDatabase({
  database: { dbFilename: 'app.db' },
  schema: AppSchema
})

await database.connect({
  powersyncUrl: process.env.POWERSYNC_URL,
  powersyncToken: async () => {
    return await getAuthToken()
  }
})
```

### Custom Adapter

```typescript
import { PowerSyncDatabase } from '@powersync/react-native'

const database = new PowerSyncDatabase({
  database: {
    dbFilename: 'app.db',
    adapter: customAdapter
  },
  schema: AppSchema
})
```

## Common Commands

```bash
# Install PowerSync React Native
npm install @powersync/react-native @op-engineering/op-sqlite

# Install PowerSync Web
npm install @powersync/react-web

# Install Drizzle driver
npm install @powersync/drizzle-driver

# Install common utilities
npm install @powersync/common
```

## Troubleshooting

### Common Issues

**Sync not working**:
- Check PowerSync URL and token
- Verify sync rules are correct
- Check network connectivity

**Observers not updating**:
- Ensure query is correct
- Check database connection
- Verify data is actually changing

**Performance issues**:
- Optimize queries
- Add indexes
- Limit data synced

### Debugging

```typescript
// Enable debug logging
const database = new PowerSyncDatabase({
  database: { dbFilename: 'app.db' },
  schema: AppSchema,
  debug: true
})
```

## Best Practices

1. **Use observers** for real-time updates
2. **Handle offline state** gracefully
3. **Optimize queries** for performance
4. **Use indexes** on frequently queried columns
5. **Batch operations** in transactions
6. **Limit sync data** to what's needed
7. **Handle conflicts** appropriately
8. **Use TypeScript** for type safety
9. **Test offline scenarios** thoroughly
10. **Monitor sync performance**
11. **Use Drizzle integration** for complex queries
12. **Implement error handling** for sync failures
13. **Cache frequently accessed data**
14. **Use pagination** for large datasets
15. **Keep schema simple** and evolving

## Resources

- [Official PowerSync Documentation](https://www.powersync.com/docs)
- [PowerSync GitHub Repository](https://github.com/powersync-ja/powersync-js)
- [React Native Documentation](https://www.powersync.com/docs/react-native)
- [Web Documentation](https://www.powersync.com/docs/web)
- [Drizzle Integration](https://www.powersync.com/docs/drizzle)
