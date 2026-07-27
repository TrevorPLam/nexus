# TanStack Query

## Overview

TanStack Query (formerly React Query) is a powerful data synchronization library
for React applications. It handles fetching, caching, synchronizing, and
updating server state, eliminating the need to manage complex state for
asynchronous operations.

## Latest Stable Version

**Version**: `5.0.0` (July 2026)

**Compatibility**:

- React: 16.8+, 17.x, 18.x
- Browsers: Modern browsers (Chrome, Firefox, Safari, Edge)
- Package Managers: npm, pnpm, yarn, bun

**Key Features**:

- Automatic caching and refetching
- Parallel and dependent queries
- Mutations and optimistic updates
- Pagination and infinite queries
- DevTools for debugging
- Framework-agnostic (React, Vue, Svelte, Solid)
- TypeScript support
- Suspense integration

## Core Concepts

- **Queries**: Fetching and caching data
- **Mutations**: Modifying data on the server
- **Query Keys**: Unique identifiers for queries
- **Query Cache**: In-memory cache for query results
- **Stale Time**: Duration before data is considered stale
- **Cache Time**: Duration before data is garbage collected
- **Query Invalidation**: Manually refresh data
- **Optimistic Updates**: Update UI before server response

## Key Features

- **Automatic Caching**: Built-in intelligent caching
- **Background Refetching**: Keep data fresh automatically
- **Parallel Queries**: Fetch multiple queries simultaneously
- **Dependent Queries**: Execute queries based on previous results
- **Mutations**: Handle server-side updates
- **Optimistic Updates**: Update UI immediately
- **Pagination**: Built-in pagination support
- **Infinite Queries**: Load more data on scroll
- **DevTools**: Debug and inspect queries
- **TypeScript**: Full type safety
- **Suspense**: React Suspense integration

## Basic Usage

```bash
# Install TanStack Query
npm install @tanstack/react-query

# Install DevTools
npm install @tanstack/react-query-devtools
```

## Installation

```bash
# Basic installation
npm install @tanstack/react-query

# With DevTools
npm install @tanstack/react-query-devtools

# TypeScript types included by default
```

## Setup

### QueryClient Provider

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
    }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}
```

## Queries

### Basic Query

```typescript
import { useQuery } from '@tanstack/react-query'

function fetchUser(id: string) {
  return fetch(`/api/users/${id}`).then(res => res.json())
}

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading user</div>

  return <div>{data.name}</div>
}
```

### Parallel Queries

```typescript
function UserDashboard({ userId }: { userId: string }) {
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  })

  const postsQuery = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchUserPosts(userId)
  })

  if (userQuery.isLoading || postsQuery.isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>{userQuery.data.name}</h1>
      <Posts posts={postsQuery.data} />
    </div>
  )
}
```

### Dependent Queries

```typescript
function UserPosts({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  })

  const { data: posts } = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchUserPosts(userId),
    enabled: !!user // Only run if user exists
  })

  if (!user || !posts) return <div>Loading...</div>

  return <Posts posts={posts} />
}
```

## Mutations

### Basic Mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreateUserForm() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (userData: any) => {
      return fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      }).then(res => res.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    mutation.mutate(Object.fromEntries(formData))
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

### Optimistic Updates

```typescript
function UpdateUserForm({ user }: { user: any }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (userData: any) => {
      return fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      }).then((res) => res.json());
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['user', user.id] });
      const previousUser = queryClient.getQueryData(['user', user.id]);
      queryClient.setQueryData(['user', user.id], newData);
      return { previousUser };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(['user', user.id], context?.previousUser);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
    },
  });
}
```

## Advanced Patterns

### Infinite Queries

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

function InfinitePosts() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 0 }) => fetchPosts(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 10) return undefined
      return allPages.length
    }
  })

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.map(post => <Post key={post.id} post={post} />)}
        </div>
      ))}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading more...' : 'Load more'}
      </button>
    </div>
  )
}
```

### Query Filters

```typescript
function useFilteredPosts(filter: string) {
  return useQuery({
    queryKey: ['posts', { filter }],
    queryFn: () => fetchPosts(filter),
  });
}
```

### Query Retries

```typescript
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

### Query Invalidation

```typescript
function InvalidateButton() {
  const queryClient = useQueryClient()

  const handleClick = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  return <button onClick={handleClick}>Refresh Users</button>
}
```

## Pagination

### Pagination Query

```typescript
function PaginatedPosts({ page }: { page: number }) {
  const { data } = useQuery({
    queryKey: ['posts', page],
    queryFn: () => fetchPosts(page)
  })

  return <Posts posts={data} />
}
```

### Prefetching

```typescript
function PostList() {
  const queryClient = useQueryClient()

  const prefetchNextPage = () => {
    queryClient.prefetchQuery({
      queryKey: ['posts', 2],
      queryFn: () => fetchPosts(2)
    })
  }

  return (
    <div>
      <Posts posts={posts} />
      <button onClick={prefetchNextPage}>Prefetch Next Page</button>
    </div>
  )
}
```

## Anti-Patterns

### 1. Not Using Query Keys Properly

**BAD**:

```typescript
useQuery({
  queryKey: ['user'], // Missing user ID
  queryFn: () => fetchUser(userId),
});
```

**GOOD**:

```typescript
useQuery({
  queryKey: ['user', userId], // Includes user ID
  queryFn: () => fetchUser(userId),
});
```

**Why**: Query keys must include all parameters that affect the query result.

### 2. Not Handling Loading/Error States

**BAD**:

```typescript
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId)
})
return <div>{data.name}</div> // Crashes if data is undefined
```

**GOOD**:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId)
})

if (isLoading) return <div>Loading...</div>
if (error) return <div>Error</div>
return <div>{data.name}</div>
```

**Why**: Proper state handling prevents crashes and improves UX.

### 3. Not Invalidating After Mutations

**BAD**:

```typescript
const mutation = useMutation({
  mutationFn: createUser,
  // No invalidation
});
```

**GOOD**:

```typescript
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

**Why**: Invalidation ensures UI reflects server state.

### 4. Over-fetching Data

**BAD**:

```typescript
useQuery({
  queryKey: ['users'],
  queryFn: () => fetchAllUsers(), // Fetches all users
});
```

**GOOD**:

```typescript
useQuery({
  queryKey: ['users', { page: 1, limit: 10 }],
  queryFn: () => fetchUsers({ page: 1, limit: 10 }),
});
```

**Why**: Pagination reduces bandwidth and improves performance.

## Performance Optimization

### 1. Configure Stale Time

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
```

### 2. Use Selectors

```typescript
const { data: userName } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  select: (data) => data.name, // Only subscribe to name changes
});
```

### 3. Enable Suspense

```typescript
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  suspense: true,
});
```

### 4. Use Query Client Defaults

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});
```

## DevTools

### Setup

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Features

- Inspect query cache
- Manually trigger queries
- Simulate network conditions
- View query performance metrics

## Common Commands

```bash
# Install TanStack Query
npm install @tanstack/react-query

# Install DevTools
npm install @tanstack/react-query-devtools

# Install for other frameworks
npm install @tanstack/vue-query
npm install @tanstack/svelte-query
npm install @tanstack/solid-query
```

## Troubleshooting

### Common Issues

**Queries not refetching**:

- Check stale time configuration
- Verify query keys are correct
- Ensure invalidation is called after mutations

**Memory leaks**:

- Clean up queries in useEffect
- Use proper cache time
- Cancel queries on unmount

**Type errors**:

- Ensure TypeScript types are correct
- Check query key types
- Verify generic types

### Debugging

```typescript
// Enable debug mode
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      logLevel: 'debug',
    },
  },
});
```

## Best Practices

1. **Use descriptive query keys** - Include all parameters
2. **Handle loading/error states** properly
3. **Invalidate after mutations** to keep data fresh
4. **Use pagination** for large datasets
5. **Configure stale time** appropriately
6. **Use selectors** to reduce re-renders
7. **Enable DevTools** for debugging
8. **Use TypeScript** for type safety
9. **Optimize cache settings** for your use case
10. **Prefetch data** when possible
11. **Use optimistic updates** for better UX
12. **Handle errors gracefully**
13. **Keep queries focused** on single concerns
14. **Use infinite queries** for scrollable lists
15. **Monitor query performance**

## Resources

- [Official TanStack Query Documentation](https://tanstack.com/query/latest)
- [TanStack Query GitHub Repository](https://github.com/TanStack/query)
- [React Query DevTools](https://tanstack.com/query/latest/docs/devtools)
- [Migration Guide](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)
