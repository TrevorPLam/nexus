# Hono

## Overview

Hono is a lightweight, ultra-fast web framework for building web applications and APIs. It's designed to work on any JavaScript runtime including Node.js, Deno, Cloudflare Workers, and more. Hono focuses on performance, simplicity, and type safety.

## Latest Stable Version

**Version**: `4.12.0` (July 2026)

**Compatibility**:
- Node.js: 18.0.0+, 20.0.0+, 22.0.0+
- Runtimes: Node.js, Deno, Cloudflare Workers, Vercel Edge, AWS Lambda, Fastly Compute@Edge
- Package Managers: npm, pnpm, yarn, bun

**Key Features**:
- Ultra-fast performance
- Type-safe routing
- Middleware support
- Built-in validation with Zod
- WebSocket support
- Server-Sent Events (SSE)
- Streaming support
- Multiple runtime support

## Core Concepts

- **Routes**: Define HTTP method and path handlers
- **Middleware**: Functions that modify request/response
- **Context**: Request/response data passed to handlers
- **Validators**: Schema validation with Zod
- **Handlers**: Functions that process requests
- **Adapters**: Runtime-specific implementations
- **Streaming**: Response streaming support

## Key Features

- **Ultra-Fast**: Optimized for performance
- **Type-Safe**: Full TypeScript support
- **Middleware**: Extensible middleware system
- **Validation**: Built-in Zod integration
- **WebSockets**: Real-time communication
- **Streaming**: Response streaming
- **Multi-Runtime**: Works on Node.js, Deno, Cloudflare Workers, etc.
- **Lightweight**: Small bundle size
- **Simple API**: Easy to learn and use

## Basic Usage

```bash
# Install Hono
npm install hono

# Install Node.js adapter
npm install @hono/node-server
```

## Installation

```bash
# Basic installation
npm install hono

# Node.js adapter
npm install @hono/node-server

# Cloudflare Workers adapter
npm install @hono/cloudflare-workers

# Deno adapter (no installation needed)
```

## Basic Application

### Hello World

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
})
```

### Routing

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('GET /'))
app.post('/', (c) => c.text('POST /'))
app.put('/', (c) => c.text('PUT /'))
app.delete('/', (c) => c.text('DELETE /'))
```

### Path Parameters

```typescript
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.text(`User ${id}`)
})

app.get('/posts/:postId/comments/:commentId', (c) => {
  const { postId, commentId } = c.req.param()
  return c.text(`Post ${postId}, Comment ${commentId}`)
})
```

### Query Parameters

```typescript
app.get('/search', (c) => {
  const query = c.req.query('q')
  const page = c.req.query('page')
  return c.json({ query, page })
})
```

## Middleware

### Built-in Middleware

```typescript
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

app.use('*', cors())
app.use('*', logger())
```

### Custom Middleware

```typescript
const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')
  if (!token) {
    return c.text('Unauthorized', 401)
  }
  await next()
}

app.use('/api/*', authMiddleware)
```

### Middleware Chain

```typescript
app.use('*', logger())
app.use('*', cors())
app.use('*', authMiddleware)
```

## Request Handling

### JSON Request

```typescript
app.post('/api/users', async (c) => {
  const body = await c.req.json()
  return c.json({ received: body })
})
```

### Form Data

```typescript
app.post('/api/form', async (c) => {
  const body = await c.req.parseBody()
  return c.json({ received: body })
})
```

### Headers

```typescript
app.get('/api/headers', (c) => {
  const userAgent = c.req.header('User-Agent')
  return c.json({ userAgent })
})
```

## Response Handling

### JSON Response

```typescript
app.get('/api/data', (c) => {
  return c.json({ message: 'Hello' })
})
```

### Text Response

```typescript
app.get('/api/text', (c) => {
  return c.text('Hello World')
})
```

### HTML Response

```typescript
app.get('/', (c) => {
  return c.html('<h1>Hello</h1>')
})
```

### Redirect

```typescript
app.get('/old-path', (c) => {
  return c.redirect('/new-path')
})
```

### Status Codes

```typescript
app.get('/api/not-found', (c) => {
  return c.text('Not Found', 404)
})

app.get('/api/error', (c) => {
  return c.text('Internal Server Error', 500)
})
```

## Validation with Zod

### Request Validation

```typescript
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
})

app.post('/api/users', zValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({ success: true, data })
})
```

### Query Validation

```typescript
app.get('/api/search', zValidator('query', z.object({
  q: z.string().min(1),
  page: z.string().optional()
})), (c) => {
  const { q, page } = c.req.valid('query')
  return c.json({ query: q, page })
})
```

## Error Handling

### Error Middleware

```typescript
app.onError((err, c) => {
  console.error(err)
  return c.text('Internal Server Error', 500)
})
```

### Not Found Handler

```typescript
app.notFound((c) => {
  return c.text('Not Found', 404)
})
```

## Advanced Patterns

### Route Groups

```typescript
const api = new Hono()

api.get('/users', (c) => c.json({ users: [] }))
api.post('/users', (c) => c.json({ created: true }))

app.route('/api', api)
```

### Nested Routes

```typescript
const userRoutes = new Hono()
userRoutes.get('/', (c) => c.json({ users: [] }))
userRoutes.get('/:id', (c) => c.json({ user: c.req.param('id') }))

app.route('/users', userRoutes)
```

### WebSocket Support

```typescript
import { upgradeWebSocket } from 'hono/deno'

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onMessage(event, ws) {
      ws.send(event.data)
    },
    onClose() {
      console.log('Connection closed')
    }
  }
}))
```

### Server-Sent Events

```typescript
app.get('/sse', async (c) => {
  return c.streamText(async (stream) => {
    for (let i = 0; i < 5; i++) {
      await stream.write(`data: Message ${i}\n\n`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  })
})
```

### Streaming Response

```typescript
app.get('/stream', async (c) => {
  return c.stream(async (stream) => {
    await stream.write('Hello ')
    await stream.write('World ')
    await stream.write('!')
  })
})
```

## OpenAPI Integration

### Zod OpenAPI

```typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'

const app = new OpenAPIHono()

const UserSchema = z.object({
  id: z.number(),
  name: z.string()
})

app.openapi(
  {
    method: 'get',
    path: '/users',
    responses: {
      200: {
        description: 'Get users',
        content: {
          'application/json': {
            schema: z.array(UserSchema)
          }
        }
      }
    }
  },
  (c) => {
    return c.json([{ id: 1, name: 'John' }])
  }
)

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'My API'
  }
})
```

### Swagger UI

```typescript
import { swaggerUI } from '@hono/swagger-ui'

app.get('/swagger', swaggerUI({ url: '/doc' }))
```

## Anti-Patterns

### 1. Not Using TypeScript

**BAD**:
```typescript
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})
```

**GOOD**:
```typescript
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id: Number(id) })
})
```

**Why**: TypeScript provides type safety and better developer experience.

### 2. Not Validating Input

**BAD**:
```typescript
app.post('/users', async (c) => {
  const body = await c.req.json()
  // No validation
  return c.json({ created: true })
})
```

**GOOD**:
```typescript
app.post('/users', zValidator('json', userSchema), async (c) => {
  const body = c.req.valid('json')
  return c.json({ created: true })
})
```

**Why**: Validation prevents invalid data and security issues.

### 3. Not Handling Errors

**BAD**:
```typescript
app.get('/api/data', async (c) => {
  const data = await fetchData()
  return c.json(data)
})
```

**GOOD**:
```typescript
app.get('/api/data', async (c) => {
  try {
    const data = await fetchData()
    return c.json(data)
  } catch (error) {
    return c.text('Internal Server Error', 500)
  }
})
```

**Why**: Error handling prevents crashes and provides better UX.

### 4. Not Using Middleware

**BAD**:
```typescript
app.get('/api/data', (c) => {
  const token = c.req.header('Authorization')
  if (!token) {
    return c.text('Unauthorized', 401)
  }
  // Handler logic
})
```

**GOOD**:
```typescript
app.use('/api/*', authMiddleware)
app.get('/api/data', (c) => {
  // Handler logic
})
```

**Why**: Middleware promotes code reuse and separation of concerns.

## Performance Optimization

### 1. Use Streaming

```typescript
app.get('/stream', async (c) => {
  return c.stream(async (stream) => {
    // Stream data
  })
})
```

### 2. Cache Responses

```typescript
app.get('/api/data', async (c) => {
  c.header('Cache-Control', 'public, max-age=3600')
  return c.json(data)
})
```

### 3. Use Compression

```typescript
import { compress } from 'hono/compress'

app.use('*', compress())
```

### 4. Optimize Middleware Order

Place frequently used middleware first.

## Configuration

### Environment Variables

```typescript
const app = new Hono()

app.get('/api/config', (c) => {
  return c.json({
    apiUrl: process.env.API_URL,
    port: process.env.PORT
  })
})
```

### Custom Config

```typescript
const app = new Hono({
  strict: false,
  getPath: (c) => c.req.path
})
```

## Runtime-Specific Setup

### Node.js

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

serve({
  fetch: app.fetch,
  port: 3000
})
```

### Cloudflare Workers

```typescript
import { Hono } from 'hono'

const app = new Hono()

export default app
```

### Deno

```typescript
import { Hono } from 'https://deno.land/x/hono/mod.ts'

const app = new Hono()

Deno.serve(app.fetch)
```

## Common Commands

```bash
# Install Hono
npm install hono

# Install Node.js adapter
npm install @hono/node-server

# Install Zod validator
npm install @hono/zod-validator

# Install OpenAPI
npm install @hono/zod-openapi

# Install Swagger UI
npm install @hono/swagger-ui
```

## Troubleshooting

### Common Issues

**Type errors**:
- Ensure TypeScript is configured correctly
- Check for proper type imports
- Verify runtime adapter compatibility

**Middleware not working**:
- Check middleware order
- Ensure proper path matching
- Verify next() is called

**Validation errors**:
- Check Zod schema definitions
- Ensure proper validator usage
- Verify request format

### Debugging

```typescript
app.use('*', logger())
app.use('*', (c, next) => {
  console.log('Request:', c.req.url)
  return next()
})
```

## Best Practices

1. **Use TypeScript** for type safety
2. **Validate input** with Zod
3. **Use middleware** for cross-cutting concerns
4. **Handle errors** gracefully
5. **Use streaming** for large responses
6. **Organize routes** logically
7. **Use OpenAPI** for API documentation
8. **Cache responses** when appropriate
9. **Use compression** for large payloads
10. **Test thoroughly** across runtimes
11. **Use environment variables** for configuration
12. **Implement rate limiting** for public APIs
13. **Use CORS** properly
14. **Log requests** for debugging
15. **Monitor performance** metrics

## Resources

- [Official Hono Documentation](https://hono.dev)
- [Hono GitHub Repository](https://github.com/honojs/hono)
- [Hono Examples](https://github.com/honojs/hono/tree/main/examples)
- [Zod Validator Documentation](https://hono.dev/docs/middleware/validator/zod)
- [OpenAPI Documentation](https://hono.dev/docs/middleware/openapi)
